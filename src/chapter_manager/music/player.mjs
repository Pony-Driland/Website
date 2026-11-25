import TinyMediaPlayer from 'tiny-essentials/libs/media/TinyMediaPlayer';
import {
  YoutubeMediaAdapter,
  loadYoutubeApi,
} from 'tiny-essentials/libs/media/TinyMediaPlayer/Youtube';
import { HtmlAudioAdapter } from 'tiny-essentials/libs/media/TinyMediaPlayer/HtmlAudio';
import TinyPromiseQueue from 'tiny-essentials/libs/utils/TinyPromiseQueue';

import { console } from '../../dev.mjs';
import { audioUnlock } from '../../important.mjs';
import storyCfg from '../../chapters/config.mjs';
import { AUDIO_FILE_TYPE, loadTrackMetadata } from './audioFile.mjs';

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
 * @property {string} id - YouTube video id or audio file folder.
 * @property {number} [file] - Which entry of the `file` array of the folder to play.
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
 * Bumped by every transport command that must preempt a pending load.
 *
 * `playTrackAsync()` can take a long time (the YouTube iframe has to boot) and
 * the queue is serialized, so a pause issued while the next track is loading
 * would wait for the whole load to finish. That is exactly the delay between
 * the click of the DJ and the silence of the room.
 *
 * @type {number}
 */
let transportToken = 0;

/**
 * Metadata of the track that is loaded in the player.
 *
 * `null` when nothing was played yet.
 *
 * @type {import('./audioFile.mjs').TrackMetadata|null}
 */
let currentMetadata = null;

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
 * The metadata of both providers is cached by the same module, so a local song
 * and a YouTube video are described by the same object.
 *
 * @param {MusicTrack} track - Track to resolve.
 * @returns {Promise<{ media: import('./audioFile.mjs').TrackMetadata, mediaType: 'audio' | 'video' }|null>} The media to load.
 */
const resolveTrackMedia = async (track) => {
  if (track.type !== 'youtube' && track.type !== AUDIO_FILE_TYPE) {
    console.warn(`[music] Unsupported track type: ${track.type}`);
    return null;
  }

  const media = await loadTrackMetadata(track);
  return { media, mediaType: track.type === 'youtube' ? 'video' : 'audio' };
};

/**
 * Points the player at a single URL and starts it.
 *
 * @param {string} id - Story id of the track.
 * @param {string} url - URL to play.
 * @param {'audio' | 'video'} mediaType - Kind of media behind the URL.
 * @param {import('./audioFile.mjs').TrackMetadata} metadata - Track metadata.
 * @param {number} [position] - Position to start from, in seconds.
 * @returns {Promise<void>}
 */
const playUrl = async (id, url, mediaType, metadata, position = 0) => {
  currentId = id;
  currentType = mediaType === 'video' ? 'youtube' : 'audio-file';
  currentMetadata = metadata;
  player.playlist = [
    {
      id,
      title: metadata.title ?? '',
      artist: metadata.artist ?? '',
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

  // The seek has to happen after `play()`, because the adapter only points the
  // media element at the new URL (and resets `currentTime`) inside it.
  if (position > 0) await player.seek(Math.floor(position * 1000));
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
      const resolved = await resolveTrackMedia(track);
      if (!resolved || resolved.media.urls.length === 0) return;

      const { media, mediaType } = resolved;

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
          await playUrl(id, url, mediaType, media);
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

  /**
   * Plays a track and resolves once it is loaded.
   *
   * The room player needs to know when the media is ready, so it can seek to
   * the position the rest of the room is listening to. `playTrack()` is fire
   * and forget by design (the reader calls it on every scroll), so the promise
   * lives here instead of changing its signature.
   *
   * @param {MusicTrack} track - Track to play.
   * @param {Object} [options] - Playback options.
   * @param {number} [options.position] - Position to start from, in seconds.
   * @returns {Promise<void>}
   */
  playTrackAsync: (track, { position = 0 } = {}) =>
    new Promise((resolve, reject) => {
      if (!track || typeof track.id !== 'string' || track.id.length === 0) {
        reject(new TypeError('A track is required.'));
        return;
      }

      audioUnlock.whenReady(() => {
        const id = `${track.type}:${track.id}`;
        const startAt = Number.isFinite(position) && position > 0 ? position : 0;

        const token = ++transportToken;

        enqueue(async () => {
          // Another command won the race while this one was queued.
          if (token !== transportToken) return;

          const resolved = await resolveTrackMedia(track);
          if (!resolved || resolved.media.urls.length === 0)
            throw new Error(`No playable media for ${id}.`);

          const { media, mediaType } = resolved;

          await ensurePlayer(track.type === 'youtube');

          // The very same track is already loaded: seeking is enough. Loading
          // it again would restart the media from the beginning, which is what
          // made the room player jump back to 0:00 on every update.
          if (currentId === id) {
            await player.play();
            if (startAt > 0) await player.seek(Math.floor(startAt * 1000));
            return;
          }

          await player.stop();

          let lastError = null;
          for (const url of media.urls) {
            try {
              await playUrl(id, url, mediaType, media, startAt);
              trackFailures.delete(id);

              // The DJ paused (or skipped) while the media was loading.
              if (token !== transportToken) {
                await player.pause();
                return;
              }

              return;
            } catch (err) {
              lastError = err;
              console.warn(`[music] Could not play ${url}, trying the next one.`, err);
            }
          }

          currentId = null;
          throw lastError ?? new Error(`No playable file for ${id}.`);
        })
          .then(() => resolve())
          .catch(reject);
      }, 'music');
    }),

  /**
   * Jumps to a position of the current track.
   *
   * @param {number} seconds - Position, in seconds.
   * @returns {Promise<void>}
   */
  seek: (seconds) => {
    const position = Number(seconds);
    if (!Number.isFinite(position) || position < 0) return Promise.resolve();

    return enqueue(() => player.seek(Math.floor(position * 1000))).catch((err) =>
      console.error(err),
    );
  },

  /**
   * Current position of the audio engine.
   *
   * @returns {number} Position, in seconds, or `0` when nothing is loaded.
   */
  getCurrentTime: () => {
    try {
      const time = player.getCurrentTime();
      return Number.isFinite(time) && time > 0 ? time / 1000 : 0;
    } catch {
      return 0;
    }
  },

  /**
   * Duration of the track that is loaded, in seconds.
   *
   * @returns {number} Duration in seconds, or `0` while it is unknown.
   */
  getDuration: () => {
    try {
      const duration = player.getTotalDuration();
      return Number.isFinite(duration) && duration > 0 ? duration / 1000 : 0;
    } catch {
      return 0;
    }
  },

  /**
   * Tells whether a track is loaded in the audio engine.
   *
   * @returns {boolean}
   */
  isLoaded: () => currentId !== null,

  /** @param {number} value - Volume between 0 and 100. */
  setVolume: (value) => {
    const volume = Number(value);
    if (Number.isFinite(volume)) player.volume = Math.min(100, Math.max(0, volume)) / 100;
  },

  /**
   * Volume of the audio engine, between 0 and 100.
   *
   * @returns {number}
   */
  getVolume: () => {
    const volume = Number(player.volume);
    return Number.isFinite(volume) ? Math.round(volume * 100) : 0;
  },

  /**
   * Listens to the volume of the audio engine.
   *
   * The engine is shared with the reader, so the room player has to follow a
   * change it did not make itself (the toolbar of the reader, for example).
   *
   * @param {(volume: number) => void} callback - Receives the volume from 0 to 100.
   * @returns {() => void} Unsubscribe function.
   */
  onVolumeChange: (callback) => {
    const handler = () => callback(musicPlayer.getVolume());
    player.on('volumeChange', handler);
    return () => player.off('volumeChange', handler);
  },

  /**
   * Pauses the audio immediately.
   *
   * The queue is bypassed on purpose: `TinyMediaPlayer` accepts a pause at any
   * moment, and waiting for a pending `playTrackAsync()` would keep the room
   * listening to a track the DJ already paused.
   *
   * @returns {Promise<void>}
   */
  pause: async () => {
    transportToken++;
    return player.pause().catch((err) => console.error(err));
  },

  resume: () => enqueue(() => player.play()).catch((err) => console.error(err)),

  /** @returns {Promise<void>} */
  stop: async () => {
    transportToken++;
    return player.stop().catch((err) => console.error(err));
  },

  /** Stops the playback and forgets the track, so the next chapter starts clean. */
  reset: async () => {
    currentId = null;
    currentMetadata = null;
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

  /**
   * Metadata of the track that is playing, if any.
   *
   * @returns {import('./audioFile.mjs').TrackMetadata|null} The current track.
   */
  getMetadata: () => currentMetadata,
};

export default musicPlayer;
