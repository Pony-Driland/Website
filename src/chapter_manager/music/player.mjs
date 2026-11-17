import TinyMediaPlayer from 'tiny-essentials/libs/media/TinyMediaPlayer';
import { YoutubeMediaAdapter } from 'tiny-essentials/libs/media/TinyMediaPlayer/Youtube';
import { HtmlAudioAdapter } from 'tiny-essentials/libs/media/TinyMediaPlayer/HtmlAudio';
import TinyPromiseQueue from 'tiny-essentials/libs/utils/TinyPromiseQueue';
import { waitForTrue } from 'tiny-essentials/basics/promiseUtils';

import storyCfg from '../../chapters/config.mjs';
import audioUnlock from '../audioUnlock.mjs';

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
 * @property {string} type - Track provider (`youtube` or `audio`).
 * @property {string} id - YouTube video id or audio file URL.
 * @property {string} [title] - Optional track title.
 * @property {string} [artist] - Optional track artist.
 */

/** Local storage key used to remember the volume between visits. */
const VOLUME_STORAGE_KEY = 'storyMusicVolume';

/**
 * Maximum time a single playback task may block the queue.
 *
 * `YoutubeMediaAdapter.play()` only resolves after the iframe fires `onReady`.
 * A blocked or offline iframe would never settle that promise, so the queue is
 * released by force instead of freezing the soundtrack for the rest of the
 * session.
 */
const PLAYBACK_TIMEOUT = 20000;

/** How often the playback deadline is checked, in milliseconds. */
const TIMEOUT_CHECK_INTERVAL = 250;

const player = new TinyMediaPlayer({
  persistVolume: true,
  volumeStorageKey: VOLUME_STORAGE_KEY,
  smoothPlayPauseVolume: true,
  smoothStopVolume: true,
});

player.fadeVolumeSpeed = 400;
player.registerAdapter(new HtmlAudioAdapter());

/**
 * Serializes every call that touches the player.
 *
 * `TinyMediaPlayer` is not re-entrant. `YoutubeMediaAdapter.play()` assigns the
 * `YT.Player` instance to its internal field *before* awaiting `onReady`, so a
 * second call made while the first one is still booting sees a truthy (but not
 * yet functional) player and runs `this.#player.loadVideoById(...)` on the
 * iframe stub. That is what throws
 * `TypeError: this.#player?.loadVideoById is not a function`.
 *
 * The reader asks for a track on every scroll event, so overlapping calls are
 * the norm, not the exception.
 */
const queue = new TinyPromiseQueue();

/** @type {YoutubeMediaAdapter|null} */
let youtube = null;

/** @type {string|null} */
let currentId = null;

/** @type {boolean} */
let youtubeApiReady = false;


window.onYouTubeIframeAPIReady = function() {
  youtubeApiReady = true;
}

/**
 * Runs a playback task, giving up when it takes too long.
 *
 * `waitForTrue` is used as the clock instead of `setTimeout`, so the deadline
 * is polled and no timer outlives the call.
 *
 * @param {() => Promise<void>} task - Playback to run.
 * @param {number} [timeout] - Maximum time to wait, in milliseconds.
 * @returns {Promise<void>}
 */
const withTimeout = async (task, timeout = PLAYBACK_TIMEOUT) => {
  let settled = false;
  const startedAt = Date.now();

  const playback = Promise.resolve()
    .then(task)
    .finally(() => {
      settled = true;
    });

  // The deadline may win the race below, leaving the playback running. Its
  // rejection is already reported by the caller, so it must not surface as an
  // unhandled rejection.
  playback.catch(() => {});

  // Resolves as soon as the playback settles or the deadline is reached,
  // whichever comes first.
  const deadline = waitForTrue(
    () => settled || Date.now() - startedAt >= timeout,
    TIMEOUT_CHECK_INTERVAL,
  );

  await Promise.race([playback, deadline]);

  if (!settled) throw new Error('Playback timed out.');
};

/**
 * Queues a playback task, so the adapter is never re-entered while it is still
 * initializing.
 *
 * @param {() => Promise<void>} task - Playback to run.
 * @returns {Promise<void>}
 */
const enqueue = (task) => queue.enqueue(() => withTimeout(task));

if (window.localStorage.getItem(VOLUME_STORAGE_KEY) === null) {
  const volume = Number(storyCfg.defaultYoutubeVolume);
  player.volume = Number.isFinite(volume) ? Math.min(100, Math.max(0, volume)) / 100 : 1;
} else {
  // `persistVolume` restores the internal value, but the adapters are created
  // afterwards, so the volume has to be pushed to them again.
  player.volume = player.volume;
}

/**
 * Creates the YouTube adapter on demand: it binds itself to a single iframe, so
 * the container can only be created once the first video id is known.
 *
 * @param {string} videoId - First video that will be played.
 * @returns {Promise<void>}
 */
const ensureYoutube = async (videoId) => {
  if (youtube) return;

  YoutubeMediaAdapter.defaultContainer = YoutubeMediaAdapter.createIframeContainer({
    videoId,
    hidden: true,
    autoplay: false,
    controls: false,
  });

  youtube = new YoutubeMediaAdapter();
  player.registerAdapter(youtube);
  await waitForTrue(() => youtubeApiReady === true);
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
    const isYoutube = track.type === 'youtube';
    const id = `${track.type}:${track.id}`;

    enqueue(async () => {
      if (isYoutube) await ensureYoutube(track.id);
      if (currentId === id) {
        await player.play();
        return;
      }

      // The `playlist` setter restarts the playback on its own (and does not
      // await it) when the player was playing, which would run `play()` twice
      // at the same time. Stopping first keeps a single, awaited transition.
      await player.stop();

      currentId = id;
      player.playlist = [
        {
          id,
          title: track.title ?? '',
          artist: track.artist ?? '',
          duration: 0,
          // `HtmlAudioAdapter.canHandle()` accepts every `http(s)` URL whose
          // `mediaType` is `audio` (or undefined). A YouTube track must never be
          // flagged as audio, otherwise it is routed to a plain `<audio>`
          // element that can never play it.
          mediaType: isYoutube ? 'video' : 'audio',
          url: isYoutube ? `https://www.youtube.com/watch?v=${track.id}` : String(track.id),
        },
      ];

      await player.play();
    }).catch((err) => console.error(err));
  }, 'music');
};

const musicPlayer = {
  /**
   * The underlying player, for the events and the volume.
   *
   * @type {TinyMediaPlayer & { on: (event: string, cb: (...a: any[]) => void) => void }}
   */
  player: /** @type {any} */ (player),
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
};

export default musicPlayer;
