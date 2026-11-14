import TinyMediaPlayer from 'tiny-essentials/libs/media/TinyMediaPlayer';
import { YoutubeMediaAdapter } from 'tiny-essentials/libs/media/TinyMediaPlayer/Youtube';
import { HtmlAudioAdapter } from 'tiny-essentials/libs/media/TinyMediaPlayer/HtmlAudio';

import storyCfg from '../../chapters/config.mjs';
import audioUnlock from '../audioUnlock.mjs';

/**
 * Soundtrack engine of the reader.
 *
 * This module is a thin, story-aware facade over `TinyMediaPlayer`. It owns the
 * single player instance, keeps the YouTube and HTML5 audio adapters registered
 * and exposes the small API the rest of the reader needs (play a track, pause,
 * stop, change the volume).
 *
 * Every story track is played as a single-item playlist, so the player never has
 * to know the story format: `musicManager` picks the track and this module only
 * knows how to play it.
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

/**
 * Playback progress of the current track.
 *
 * @typedef {Object} MusicTimeData
 * @property {number} total - Total duration in milliseconds.
 * @property {number} current - Current position in milliseconds.
 * @property {number} remaining - Remaining time in milliseconds.
 * @property {number} playbackPercentage - Played percentage (0-100).
 */

/** Local storage key used to remember the volume between visits. */
const VOLUME_STORAGE_KEY = 'storyMusicVolume';

/** Matches every YouTube URL format supported by the adapter. */
const YOUTUBE_PATTERN =
  /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;

/** @type {TinyMediaPlayer|null} */
let player = null;

/** @type {YoutubeMediaAdapter|null} */
let youtube = null;

/** @type {{ id: string, url: string }|null} */
let current = null;

/** @type {Map<string, Function[]>} */
const listeners = new Map();

/**
 * Emits a local event.
 *
 * @param {string} event - Event name.
 * @param {...unknown} args - Event payload.
 * @returns {void}
 */
const emit = (event, ...args) => {
  const handlers = listeners.get(event);
  if (!handlers) return;

  for (const handler of handlers) {
    try {
      handler(...args);
    } catch (err) {
      console.error(err);
    }
  }
};

/**
 * Checks whether the volume was already stored by a previous visit.
 *
 * @returns {boolean}
 */
const hasStoredVolume = () => {
  try {
    return window.localStorage.getItem(VOLUME_STORAGE_KEY) !== null;
  } catch (err) {
    console.error(err);
    return false;
  }
};

/**
 * Converts a story track into a `MediaContent` object.
 *
 * @param {MusicTrack} track - Story track.
 * @returns {{ id: string, title: string, artist: string, duration: number, mediaType: string, url: string }}
 */
const toContent = (track) => {
  const isYoutube = track.type === 'youtube';

  return {
    id: `${track.type}:${track.id}`,
    title: typeof track.title === 'string' ? track.title : '',
    artist: typeof track.artist === 'string' ? track.artist : '',
    duration: 0,
    // `HtmlAudioAdapter.canHandle()` accepts every `http(s)` URL whose
    // `mediaType` is `audio` (or undefined). A YouTube track must never be
    // flagged as audio, otherwise it is routed to a plain `<audio>` element
    // that can never play it.
    mediaType: isYoutube ? 'video' : 'audio',
    url: isYoutube ? `https://www.youtube.com/watch?v=${track.id}` : String(track.id),
  };
};

/**
 * Creates the YouTube adapter on demand.
 *
 * The adapter binds itself to a single iframe, so the container can only be
 * created once the first video id is known.
 *
 * @param {string} videoId - First video that will be played.
 * @returns {YoutubeMediaAdapter}
 */
const ensureYoutube = (videoId) => {
  if (youtube) return youtube;

  YoutubeMediaAdapter.defaultContainer = YoutubeMediaAdapter.createIframeContainer({
    videoId,
    hidden: true,
    autoplay: false,
    controls: false,
  });

  youtube = new YoutubeMediaAdapter();
  player?.registerAdapter(youtube);
  return youtube;
};

/**
 * Forwards the player events to the local listeners.
 *
 * @param {TinyMediaPlayer} instance - Player to observe.
 * @returns {void}
 */
const bind = (instance) => {
  /** @type {any} */
  const emitter = instance;

  emitter.on('play', () => emit('play'));
  emitter.on('pause', () => emit('pause'));
  emitter.on('stop', () => emit('stop'));
  emitter.on('ended', () => emit('ended'));
  emitter.on('timeupdate', (/** @type {MusicTimeData} */ data) => emit('timeupdate', data));
  emitter.on('volumeChange', (/** @type {number} */ volume) => emit('volumeChange', volume));
  emitter.on('trackChange', (/** @type {number} */ index) => emit('trackChange', index));
};

/**
 * Creates the player instance. Safe to call multiple times.
 *
 * @returns {TinyMediaPlayer}
 */
const install = () => {
  if (player) return player;

  player = new TinyMediaPlayer({
    persistVolume: true,
    volumeStorageKey: VOLUME_STORAGE_KEY,
    smoothPlayPauseVolume: true,
    smoothStopVolume: true,
  });

  player.fadeVolumeSpeed = 400;

  // The YouTube adapter is registered lazily, once the first video is known.
  player.registerAdapter(new HtmlAudioAdapter());
  bind(player);

  if (!hasStoredVolume()) {
    const volume = Number(storyCfg.defaultYoutubeVolume);
    player.volume = Number.isFinite(volume) ? Math.min(100, Math.max(0, volume)) / 100 : 1;
  }

  // Publish the initial volume so the sound effects can follow it.
  emit('volumeChange', player.volume);

  return player;
};

/**
 * Resumes the current track.
 *
 * @returns {Promise<void>}
 */
const resume = async () => {
  if (!player || !current) return;
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
    const instance = install();
    const content = toContent(track);

    if (track.type === 'youtube') ensureYoutube(track.id);

    if (current && current.id === content.id) {
      resume();
      return;
    }

    current = { id: content.id, url: content.url };
    instance.playlist = [content];
    instance.play().catch((err) => console.error(err));
  }, 'music');
};

/** @returns {boolean} Whether the player was already created. */
const isReady = () => player !== null;

/** @returns {boolean} Whether a track is currently playing. */
const isPlaying = () => (player ? player.isPlaying : false);

/** @returns {string|null} Public URL of the current track. */
const getSourceUrl = () => (current ? current.url : null);

/**
 * Reads the playback progress.
 *
 * @returns {MusicTimeData}
 */
const getTimeData = () => {
  /** @type {MusicTimeData} */
  const empty = { total: 0, current: 0, remaining: 0, playbackPercentage: 0 };
  if (!player || !current) return empty;

  try {
    return {
      total: player.getTotalDuration(),
      current: player.getCurrentTime(),
      remaining: player.getRemainingTime(),
      playbackPercentage: player.getPlaybackPercentage(),
    };
  } catch (err) {
    return empty;
  }
};

/** @param {number} value - Volume between 0 and 100. */
const setVolume = (value) => {
  const instance = install();
  const volume = Number(value);
  if (!Number.isFinite(volume)) return;
  instance.volume = Math.min(100, Math.max(0, volume)) / 100;
};

/** @returns {number} Volume between 0 and 100. */
const getVolume = () => (player ? Math.round(player.volume * 100) : 0);

/**
 * Pauses the current track.
 *
 * @returns {Promise<void>}
 */
const pause = () => {
  if (!player) return Promise.resolve();
  return player.pause().catch((err) => console.error(err));
};

/**
 * Stops the current track, keeping it loaded so it can be played again.
 *
 * @returns {Promise<void>}
 */
const stop = () => {
  if (!player) return Promise.resolve();
  return player.stop().catch((err) => console.error(err));
};

/**
 * Stops the playback and forgets the current track.
 *
 * Used when the reader is closed: the next `playTrack()` must start from a
 * clean state instead of resuming the track of the previous chapter.
 *
 * @returns {Promise<void>}
 */
const reset = async () => {
  if (!player) return;

  try {
    await player.stop();
  } catch (err) {
    console.error(err);
  }

  current = null;
};

/**
 * Subscribes to a player event.
 *
 * @param {string} event - Event name.
 * @param {(...args: any[]) => void} handler - Event handler.
 * @returns {() => void} Unsubscribe function.
 */
const on = (event, handler) => {
  if (typeof handler !== 'function') return () => {};

  const handlers = listeners.get(event);
  if (handlers) {
    handlers.push(handler);
  } else {
    listeners.set(event, [handler]);
  }

  return () => {
    const list = listeners.get(event);
    if (!list) return;
    const index = list.indexOf(handler);
    if (index > -1) list.splice(index, 1);
  };
};

/**
 * Checks whether a string is a supported YouTube URL.
 *
 * @param {string} url - URL to check.
 * @returns {boolean}
 */
const isYoutubeUrl = (url) => typeof url === 'string' && YOUTUBE_PATTERN.test(url);

const musicPlayer = {
  install,
  on,
  playTrack,
  pause,
  resume,
  stop,
  reset,
  setVolume,
  getVolume,
  getSourceUrl,
  getTimeData,
  isYoutubeUrl,
  get ready() {
    return isReady();
  },
  get playing() {
    return isPlaying();
  },
  get volume() {
    return getVolume();
  },
};

export default musicPlayer;
