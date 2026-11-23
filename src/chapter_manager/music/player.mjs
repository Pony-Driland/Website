import TinyMediaPlayer from 'tiny-essentials/libs/media/TinyMediaPlayer';
import {
  YoutubeMediaAdapter,
  loadYoutubeApi,
} from 'tiny-essentials/libs/media/TinyMediaPlayer/Youtube';
import { HtmlAudioAdapter } from 'tiny-essentials/libs/media/TinyMediaPlayer/HtmlAudio';
import TinyPromiseQueue from 'tiny-essentials/libs/utils/TinyPromiseQueue';

import storyCfg from '../../chapters/config.mjs';
import audioUnlock from '../audioUnlock.mjs';
import { AUDIO_FILE_TYPE, loadAudioFile } from './audioFile.mjs';

/**
 * Soundtrack engine of the reader.
 *
 * A thin, story-aware facade over `TinyMediaPlayer`: it owns the single player
 * instance, keeps the YouTube and HTML5 audio adapters registered and exposes
 * the small API the reader needs. Every story track is played as a single-item
 * playlist, so the player never has to know the story format.
 *
 * @module chapter_manager/music/player
 */

/**
 * A single soundtrack entry of the story.
 *
 * @typedef {Object} MusicTrack
 * @property {string} type - Track provider (`youtube` or `audio-file`).
 * @property {string} id - YouTube video id or audio file path.
 * @property {string} [title] - Optional track title.
 * @property {string} [artist] - Optional track artist.
 */

/** Local storage key used to remember the volume between visits. */
const VOLUME_STORAGE_KEY = 'storyMusicVolume';

/**
 * Time after which a slow playback is reported in the console.
 *
 * `YoutubeMediaAdapter.play()` only resolves after the iframe fires `onReady`,
 * which can take a while on a cold cache. The task is never abandoned (that
 * would let the queue re-enter the adapter mid-initialization), it is only
 * logged so a stuck iframe is easy to spot.
 */
const PLAYBACK_TIMEOUT = 20000;

const player = new TinyMediaPlayer({
  persistVolume: true,
  volumeStorageKey: VOLUME_STORAGE_KEY,
  smoothPlayPauseVolume: true,
  smoothStopVolume: true,
});

player.fadeVolumeSpeed = 400;

/**
 * Serializes every call that touches the player.
 *
 * The reader asks for a track on every scroll event, so overlapping calls are
 * the norm, not the exception.
 */
const queue = new TinyPromiseQueue();

/** @type {YoutubeMediaAdapter|null} */
let youtube = null;

/** @type {HtmlAudioAdapter|null} */
let audioPlayer = null;

/** @type {string|null} */
let currentId = null;

/**
 * Provider of the track that is loaded in the player.
 *
 * `null` when nothing was played yet.
 *
 * @type {'youtube' | 'audio-file' | null}
 */
let currentType = null;

/**
 * How many times in a row a track may fail before the player gives up on it.
 *
 * The reader asks for a track on every scroll event, so a broken file would be
 * retried forever: each scroll would fail, the queue would keep the player busy
 * and the visitor would never hear anything again. Two failures are enough to
 * tell a transient error from a broken file.
 */
const MAX_TRACK_FAILURES = 2;

/**
 * Consecutive failures of each track, keyed by `<type>:<id>`.
 *
 * @type {Map<string, number>}
 */
const trackFailures = new Map();

/**
 * Registers a failure and tells whether the player should stop trying.
 *
 * @param {string} id - Story id of the track.
 * @returns {boolean} `true` when the track reached the failure limit.
 */
const reachedFailureLimit = (id) => {
  const failures = (trackFailures.get(id) ?? 0) + 1;
  trackFailures.set(id, failures);
  return failures >= MAX_TRACK_FAILURES;
};

/**
 * Runs a playback task to completion, warning when it takes too long.
 *
 * The queue must never move on before the task settles. `YoutubeMediaAdapter`
 * stores its `YT.Player` instance *before* the iframe fires `onReady`, so a
 * second task that starts while the first one is still booting calls
 * `loadVideoById()` on the not-yet-functional stub and throws
 * `TypeError: this.#player?.loadVideoById is not a function`.
 *
 * The previous implementation raced the task against a deadline and rejected on
 * timeout, which released the queue while the playback kept running. That was
 * the production crash: the iframe boots slower there, the deadline fired
 * first and the next scroll event re-entered the half-initialized adapter.
 *
 * The deadline is now only a diagnostic and never abandons the task, so the
 * queue stays serialized no matter how slow the iframe is.
 *
 * @param {() => Promise<void>} task - Playback to run.
 * @param {number} [timeout] - Time after which a warning is logged, in milliseconds.
 * @returns {Promise<void>}
 */
const runPlayback = async (task, timeout = PLAYBACK_TIMEOUT) => {
  const timer = setTimeout(() => {
    console.warn(`[music] Playback is taking longer than ${timeout}ms, still waiting...`);
  }, timeout);

  try {
    await task();
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Queues a playback task, so the adapter is never re-entered while it is still
 * initializing.
 *
 * @param {() => Promise<void>} task - Playback to run.
 * @returns {Promise<void>}
 */
const enqueue = (task) => queue.enqueue(() => runPlayback(task));

if (window.localStorage.getItem(VOLUME_STORAGE_KEY) === null) {
  const volume = Number(storyCfg.defaultYoutubeVolume);
  player.volume = Number.isFinite(volume) ? Math.min(100, Math.max(0, volume)) / 100 : 1;
} else {
  // `persistVolume` restores the internal value, but the adapters are created
  // afterwards, so the volume has to be pushed to them again.
  player.volume = player.volume;
}

/**
 * Resolves once the YouTube IFrame API is usable.
 *
 * The adapter only exposes the API through a module-private singleton, and the
 * previous `window.onYouTubeIframeAPIReady` hook was unreliable: the global is
 * a single slot that any other script can overwrite, and it never fires when
 * the API was already cached by the browser. Awaiting the library's own loader
 * removes the race entirely.
 *
 * @returns {Promise<void>}
 */
const waitForYoutubeApi = () => {
  if (typeof window !== 'undefined' && window.YT && window.YT.Player) return Promise.resolve();
  return loadYoutubeApi();
};

/**
 * Creates the player adapter on demand: it binds itself to a single iframe, so
 * the container can only be created once the first video id is known.
 *
 * The YouTube adapter is only created for a YouTube track. A story that only
 * uses files shipped with the website must not download the IFrame API.
 *
 * @param {boolean} withYoutube - Whether the YouTube adapter is required.
 * @returns {Promise<void>}
 */
const ensurePlayer = async (withYoutube) => {
  if (withYoutube && !youtube) {
    YoutubeMediaAdapter.defaultContainer = YoutubeMediaAdapter.createContainer({
      hidden: true,
    });

    YoutubeMediaAdapter.playerOptions = {
      height: 'auto',
      width: 'auto',
      playerVars: { controls: 0 },
    };

    youtube = new YoutubeMediaAdapter();
    player.registerAdapter(youtube);
    await waitForYoutubeApi();
  }

  if (!audioPlayer) {
    audioPlayer = new HtmlAudioAdapter();
    player.registerAdapter(audioPlayer);
  }
};

/**
 * Resolves the media the player has to load for a story track.
 *
 * Only the providers of the story are accepted. Anything else is refused
 * instead of being forwarded to the player, so a typo in a chapter file can
 * never turn into a request to an arbitrary host.
 *
 * A song folder may declare more than one file (a `file` array in the
 * `data.json`), so the caller receives every candidate in the order it should
 * be tried.
 *
 * @param {MusicTrack} track - Track to resolve.
 * @returns {Promise<{ urls: string[], mediaType: 'audio' | 'video' }|null>} The media to load.
 */
const resolveTrackMedia = async (track) => {
  if (track.type === 'youtube') {
    return { urls: [`https://www.youtube.com/watch?v=${track.id}`], mediaType: 'video' };
  }

  if (track.type === AUDIO_FILE_TYPE) {
    // The file name is not part of the story: it lives in the `data.json` of
    // the song folder, together with the rest of its metadata.
    const { urls } = await loadAudioFile(track.id);
    return { urls, mediaType: 'audio' };
  }

  console.warn(`[music] Unsupported track type: ${track.type}`);
  return null;
};

/**
 * Points the player at a single URL and starts it.
 *
 * @param {string} id - Story id of the track.
 * @param {string} url - URL to play.
 * @param {'audio' | 'video'} mediaType - Kind of media behind the URL.
 * @returns {Promise<void>}
 */
const playUrl = async (id, url, mediaType) => {
  currentId = id;
  currentType = mediaType === 'video' ? 'youtube' : 'audio-file';
  player.playlist = [
    {
      id,
      title: '',
      artist: '',
      duration: 0,
      // `HtmlAudioAdapter.canHandle()` accepts every `http(s)` URL whose
      // `mediaType` is `audio` (or undefined). A YouTube track must never be
      // flagged as audio, otherwise it is routed to a plain `<audio>` element
      // that can never play it.
      mediaType,
      url,
    },
  ];

  await player.play();
};

/**
 * Plays a story track.
 *
 * The playback is held until the browser allows audio to start, because the
 * soundtrack is chosen by the scroll position and not by the visitor.
 *
 * @param {MusicTrack} track - Track to play.
 * @returns {void}
 */
const playTrack = (track) => {
  if (!track || typeof track.id !== 'string' || track.id.length === 0) return;

  audioUnlock.whenReady(() => {
    const id = `${track.type}:${track.id}`;

    enqueue(async () => {
      const media = await resolveTrackMedia(track);
      if (!media || media.urls.length === 0) return;

      await ensurePlayer(track.type === 'youtube');
      if (currentId === id) {
        await player.play();
        return;
      }

      // The `playlist` setter restarts the playback on its own (and does not
      // await it) when the player was playing, which would run `play()` twice
      // at the same time. Stopping first keeps a single, awaited transition.
      await player.stop();

      // A folder may list more than one file, and the metadata can go stale
      // (a renamed file, for example), so every candidate is tried in order
      // instead of failing the whole scene on the first 404.
      let lastError = null;
      for (const url of media.urls) {
        try {
          await playUrl(id, url, media.mediaType);
          // The track played, so the next failure starts counting again.
          trackFailures.delete(id);
          return;
        } catch (err) {
          lastError = err;
          console.warn(`[music] Could not play ${url}, trying the next one.`, err);
        }
      }

      currentId = null;
      throw lastError ?? new Error(`No playable file for ${id}.`);
    }).catch(async (err) => {
      console.error(err);

      // The reader retries on every scroll, so a broken track would be retried
      // forever. After a couple of failures the player stops instead of
      // spinning on a file that is clearly not going to play.
      if (!reachedFailureLimit(id)) return;

      console.error(`[music] Giving up on ${id} after ${MAX_TRACK_FAILURES} failures.`);
      await player.stop().catch(() => {});
    });
  }, 'music');
};

const musicPlayer = {
  /**
   * The underlying player, for the events and the volume.
   */
  player,
  playTrack,

  /** @param {number} value - Volume between 0 and 100. */
  setVolume: (value) => {
    const volume = Number(value);
    if (Number.isFinite(volume)) player.volume = Math.min(100, Math.max(0, volume)) / 100;
  },

  pause: () => enqueue(() => player.pause()).catch((err) => console.error(err)),

  resume: () => enqueue(() => player.play()).catch((err) => console.error(err)),

  stop: () => enqueue(() => player.stop()).catch((err) => console.error(err)),

  /** Stops the playback and forgets the track, so the next chapter starts clean. */
  reset: async () => {
    currentId = null;
    await enqueue(() => player.stop()).catch((err) => console.error(err));
  },

  /** @returns {string|null} Public URL of the current track. */
  getSourceUrl: () => (currentId ? (player.playlist[0]?.url ?? null) : null),

  /**
   * Tells whether the current track is a file of this website.
   *
   * Those tracks have no external page to link to, so the toolbar must not try
   * to open one.
   *
   * @returns {boolean} `true` when the current track ships with the website.
   */
  isLocalSource: () => currentType === 'audio-file',
};

export default musicPlayer;
