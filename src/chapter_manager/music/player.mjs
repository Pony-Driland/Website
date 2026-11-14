import TinyMediaPlayer from 'tiny-essentials/libs/media/TinyMediaPlayer';
import { YoutubeMediaAdapter } from 'tiny-essentials/libs/media/TinyMediaPlayer/Youtube';
import { HtmlAudioAdapter } from 'tiny-essentials/libs/media/TinyMediaPlayer/HtmlAudio';

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

const player = new TinyMediaPlayer({
  persistVolume: true,
  volumeStorageKey: VOLUME_STORAGE_KEY,
  smoothPlayPauseVolume: true,
  smoothStopVolume: true,
});

player.fadeVolumeSpeed = 400;
player.registerAdapter(new HtmlAudioAdapter());

/** @type {YoutubeMediaAdapter|null} */
let youtube = null;

/** @type {string|null} */
let currentId = null;

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
 * @returns {void}
 */
const ensureYoutube = (videoId) => {
  if (youtube) return;

  YoutubeMediaAdapter.defaultContainer = YoutubeMediaAdapter.createIframeContainer({
    videoId,
    hidden: true,
    autoplay: false,
    controls: false,
  });

  youtube = new YoutubeMediaAdapter();
  player.registerAdapter(youtube);
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

    if (isYoutube) ensureYoutube(track.id);

    if (currentId === id) {
      player.play().catch((err) => console.error(err));
      return;
    }

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

    player.play().catch((err) => console.error(err));
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

  pause: () => player.pause().catch((err) => console.error(err)),
  resume: () => player.play().catch((err) => console.error(err)),
  stop: () => player.stop().catch((err) => console.error(err)),

  /** Stops the playback and forgets the track, so the next chapter starts clean. */
  reset: async () => {
    currentId = null;
    await player.stop().catch((err) => console.error(err));
  },

  /** @returns {string|null} Public URL of the current track. */
  getSourceUrl: () => (currentId ? (player.playlist[0]?.url ?? null) : null),
};

export default musicPlayer;
