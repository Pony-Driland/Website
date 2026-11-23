/**
 * Resolver of the `audio-file` soundtrack entries.
 *
 * Every song of the website lives in its own folder, next to a `data.json`
 * with its metadata:
 *
 * ```
 * public/audio/<root>/music/<folders...>/<song>/data.json
 * ```
 *
 * The track id is the folder path without the `/audio` prefix, for example
 * `ai/music/battle/the-hard-battle`. The file name is never written by hand:
 * it is read from the `data.json` of the folder, which is the single source of
 * truth for the metadata (see `public/audio/music_metadata.mjs`).
 *
 * This module is also the only place that knows which paths may reach the
 * player, so a chapter file can never make the reader download an arbitrary
 * URL (a remote host, a `javascript:` payload or a file outside `public/audio`).
 *
 * @module chapter_manager/music/audioFile
 */

import { fetchYouTubeOEmbed } from 'tiny-essentials/basics/media/youtube';
import { console } from '../../dev.mjs';
import musicMetadata from './musicMetadata.mjs';

/** Track type of a file shipped with the website. */
export const AUDIO_FILE_TYPE = 'audio-file';

/** Public folder that holds every audio asset. */
export const AUDIO_ROOT = '/audio/';

/**
 * Folders that contain a `music` collection.
 *
 * A new author only has to be added here to become playable.
 */
export const MUSIC_ROOTS = ['ai', 'jasmindreasond'];

/** Name of the metadata file of a song folder. */
export const MUSIC_DATA_FILE = 'data.json';

/** Extension used when `data.json` does not declare any format. */
export const DEFAULT_FORMAT = 'mp3';

/**
 * Characters allowed in a single path segment.
 *
 * The folders are hand written, so the set is the permissive one used by the
 * repository (`rainbow-queen's-childhood`, `distant-dream-V1.1(alternative-2)`)
 * and nothing else: no slash, no backslash, no `..` and no query string.
 */
const SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._()'’&+-]*$/;

/** Matches a file name that already carries an extension. */
const EXTENSION_PATTERN = /\.[a-z0-9]{2,5}$/i;

/**
 * Everything the player needs to know about a track, no matter where it comes
 * from.
 *
 * @typedef {Object} TrackMetadata
 * @property {string} key - Cache key (`<type>:<id>`).
 * @property {'audio-file'|'youtube'} type - Provider of the track.
 * @property {string} id - Track id inside the provider.
 * @property {string} title - Display title.
 * @property {string} artist - Display artist.
 * @property {string} [thumbnail] - Cover image URL.
 * @property {string[]} urls - Playable URLs, in the order they should be tried.
 */

/**
 * Cache of the track metadata, so scrolling back and forth does not hit the
 * network again.
 *
 * Both providers share it: a local song is described by the `data.json` of its
 * folder and a YouTube video by its oEmbed payload, but the player only ever
 * sees a {@link TrackMetadata}.
 *
 * @type {Map<string, Promise<TrackMetadata>>}
 */
const cache = new Map();

/**
 * Builds the cache key of a track.
 *
 * @param {string} type - Provider of the track.
 * @param {string} id - Track id inside the provider.
 * @returns {string} The cache key.
 */
export const getTrackKey = (type, id) => `${type}:${id}`;

/**
 * Stores a pending metadata load, dropping it again when it fails.
 *
 * A failed load must not be cached, otherwise a single network hiccup would
 * silence the track until the visitor reloads the page.
 *
 * @param {string} key - Cache key of the track.
 * @param {Promise<TrackMetadata>} task - Pending metadata.
 * @returns {Promise<TrackMetadata>} The same promise, for chaining.
 */
const remember = (key, task) => {
  cache.set(key, task);
  task.catch(() => cache.delete(key));
  return task;
};

/**
 * Checks whether a value is a track of the `audio-file` provider.
 *
 * @param {unknown} track - Value to check.
 * @returns {boolean} `true` when the value is an `audio-file` track.
 */
export const isAudioFileTrack = (track) =>
  typeof track === 'object' &&
  track !== null &&
  /** @type {{ type?: unknown }} */ (track).type === AUDIO_FILE_TYPE;

/**
 * Checks whether a value is the id of a music folder.
 *
 * The id is relative to `public/audio`, must start with a known music root and
 * must point to a folder (never to a file), so the `data.json` can be appended
 * to it safely.
 *
 * @param {unknown} value - Value to check.
 * @returns {boolean} `true` when the value is a music folder id.
 */
export const isAudioFilePath = (value) => {
  if (typeof value !== 'string') return false;

  const id = value.trim();
  if (id.length === 0 || id.length > 512) return false;

  // A leading slash, a protocol (`https:`), a protocol relative path
  // (`//host`) or a Windows separator would all escape the folder check.
  if (id.startsWith('/') || id.endsWith('/')) return false;
  if (id.includes('\\') || id.includes('//')) return false;
  if (id.includes('?') || id.includes('#')) return false;

  const segments = id.split('/');

  // `<root>/music/<song>`, at least.
  if (segments.length < 3) return false;
  if (!segments.every((segment) => SEGMENT_PATTERN.test(segment))) return false;

  return MUSIC_ROOTS.includes(segments[0]) && segments[1] === 'music';
};

/**
 * Builds the public URL of a music folder.
 *
 * @param {unknown} id - Music folder id.
 * @returns {string|null} The folder URL, or `null` when the id is refused.
 */
export const getMusicFolderUrl = (id) => {
  if (!isAudioFilePath(id)) return null;
  return `${AUDIO_ROOT}${/** @type {string} */ (id).trim()}/`;
};

/**
 * Builds the public URL of the metadata file of a music folder.
 *
 * @param {unknown} id - Music folder id.
 * @returns {string|null} The `data.json` URL, or `null` when the id is refused.
 */
export const getMusicDataUrl = (id) => {
  const folder = getMusicFolderUrl(id);
  return folder ? `${folder}${MUSIC_DATA_FILE}` : null;
};

/**
 * Normalizes a `string | string[]` field of the metadata.
 *
 * @param {unknown} value - Value to normalize.
 * @returns {string[]} The non-empty strings of the value.
 */
const toStringArray = (value) => {
  const list = Array.isArray(value) ? value : [value];
  return list
    .filter((item) => typeof 'string' === typeof item)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

/**
 * Describes the value of a schema entry.
 *
 * The schema uses a small DSL: a bare type name (`"string"`), a union
 * (`"string|string[]"`) or an array with a single example (`["string"]`).
 *
 * @param {unknown} spec - Schema entry.
 * @returns {string} A human readable description of the expected value.
 */
const describeSpec = (spec) => {
  if (Array.isArray(spec)) {
    return spec.length > 0 ? `array of ${describeSpec(spec[0])}` : 'array';
  }

  if (spec !== null && typeof spec === 'object') return 'object';
  return String(spec);
};

/**
 * Reads a field of the schema, ignoring the optional marker.
 *
 * The schema writes the optional fields as `"title?"`, so the key has to be
 * normalized before the lookup.
 *
 * @param {string} name - Field name, without the optional marker.
 * @returns {unknown} The schema entry, or `undefined` when it does not exist.
 */
const getSchemaEntry = (name) => {
  const schema = /** @type {Record<string, unknown>} */ (musicMetadata);
  if (name in schema) return schema[name];
  return schema[`${name}?`];
};

/**
 * Checks a value against a schema entry.
 *
 * @param {unknown} value - Value to check.
 * @param {unknown} spec - Schema entry that describes it.
 * @returns {boolean} `true` when the value matches the schema entry.
 */
const matchesSpec = (value, spec) => {
  if (Array.isArray(spec)) {
    return (
      Array.isArray(value) &&
      (spec.length === 0 || value.every((item) => matchesSpec(item, spec[0])))
    );
  }

  if (spec !== null && typeof spec === 'object') {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  // `"string|string[]"` accepts both shapes.
  return String(spec)
    .split('|')
    .some((type) => {
      if (type === 'string') return typeof value === 'string';
      if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
      if (type === 'boolean') return typeof value === 'boolean';
      if (type === 'string[]') {
        return Array.isArray(value) && value.every((item) => typeof item === 'string');
      }
      if (type === 'number[]') {
        return (
          Array.isArray(value) &&
          value.every((item) => typeof item === 'number' && Number.isFinite(item))
        );
      }
      return false;
    });
};

/**
 * Validates the `data.json` of a music folder.
 *
 * The shape is the one declared by `music_metadata.mjs`, so a typo in a hand
 * written file is reported instead of silently producing a track without a
 * title.
 *
 * @param {unknown} data - Parsed `data.json`.
 * @returns {{ title: string, files: string[], formats: string[] }} The metadata.
 * @throws {TypeError} When the metadata is not usable.
 */
export const parseMusicMetadata = (data) => {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new TypeError('Music metadata must be an object.');
  }

  const metadata = /** @type {Record<string, unknown>} */ (data);
  const context = 'Music metadata';

  for (const [name, value] of Object.entries(metadata)) {
    const spec = getSchemaEntry(name);

    // An unknown key is almost always a typo (`files`, `tittle`), and the
    // player would silently ignore it.
    if (spec === undefined) {
      console.warn(`${context}: unknown field "${name}".`);
      continue;
    }

    if (!matchesSpec(value, spec)) {
      console.warn(
        `${context}: "${name}" must be ${describeSpec(spec)}, received ${JSON.stringify(value)}.`,
      );
    }
  }

  // Only `file` is required to play the song, so a problem in any other field
  // is reported without silencing the soundtrack.
  const files = toStringArray(metadata.file);
  if (files.length === 0) {
    throw new TypeError(`${context} is missing the "file" field.`);
  }

  const formats = toStringArray(metadata.format).map((format) =>
    format.replace(/^\./, '').toLowerCase(),
  );

  // `title` is optional: when it is absent the file name is the best name the
  // repository can offer.
  const title = typeof metadata.title === 'string' ? metadata.title.trim() : '';

  return {
    title: title.length > 0 ? title : files[0],
    files,
    formats: formats.length > 0 ? formats : [DEFAULT_FORMAT],
  };
};

/**
 * Builds every URL declared by the metadata of a music folder.
 *
 * The URLs are absolute because `HtmlAudioAdapter.canHandle()` only accepts
 * `http(s):` and `blob:` URLs, so a root relative path would be refused by
 * every adapter and the player would throw "No compatible adapter found".
 *
 * @param {unknown} id - Music folder id.
 * @param {unknown} data - Parsed `data.json`.
 * @param {string} [baseUrl] - URL used to make the paths absolute.
 * @param {number} [fileIndex] - Which entry of `file` to use, when it is an array.
 * @returns {string[]} The candidate URLs, in the order of the metadata.
 */
export const buildAudioFileUrls = (id, data, baseUrl, fileIndex = 0) => {
  const folder = getMusicFolderUrl(id);
  if (!folder) return [];

  const { files, formats } = parseMusicMetadata(data);

  // A folder may hold more than one song. The story picks one of them with the
  // `file` index, so only that entry is used; an out of range index falls back
  // to the first file instead of silencing the scene.
  const selected = files[fileIndex];
  if (selected === undefined) {
    if (fileIndex !== 0) {
      console.warn(
        `[music] ${id}: file index ${fileIndex} is out of range (${files.length} file(s)).`,
      );
    }
  }

  const file = selected ?? files[0];
  /** @type {string[]} */
  const paths = [];

  // Some folders already carry the extension (`distant-dream-v1.1.mp3`).
  if (EXTENSION_PATTERN.test(file)) {
    paths.push(`${folder}${file}`);
  } else {
    for (const format of formats) paths.push(`${folder}${file}.${format}`);
  }

  return paths.map((path) => toAbsoluteUrl(path, baseUrl));
};

/**
 * Makes a path absolute, keeping it untouched when there is no base to use.
 *
 * @param {string} path - Path to resolve.
 * @param {string} [baseUrl] - URL used as the base.
 * @returns {string} The absolute URL, or the path itself.
 */
const toAbsoluteUrl = (path, baseUrl) => {
  const base = baseUrl ?? globalThis.location?.href;
  if (!base) return path;

  try {
    return new URL(path, base).href;
  } catch {
    return path;
  }
};

/**
 * Loads and resolves a music folder.
 *
 * The result is cached, so a folder is only downloaded once per session.
 *
 * @param {unknown} id - Music folder id.
 * @param {number} [fileIndex] - Which entry of `file` to play.
 * @param {typeof fetch} [fetchImpl] - Fetch implementation, for the tests.
 * @returns {Promise<TrackMetadata>} The track metadata.
 */
export const loadAudioFile = (id, fileIndex = 0, fetchImpl = globalThis.fetch) => {
  const dataUrl = getMusicDataUrl(id);
  if (!dataUrl) return Promise.reject(new TypeError(`Invalid music folder: ${String(id)}`));

  const folder = /** @type {string} */ (id).trim();
  const index = Number.isInteger(fileIndex) && fileIndex > 0 ? fileIndex : 0;

  // Each file of the folder is its own track, so the index is part of the key.
  const key = getTrackKey(AUDIO_FILE_TYPE, index > 0 ? `${folder}#${index}` : folder);
  const cached = cache.get(key);
  if (cached) return cached;

  return remember(
    key,
    (async () => {
      if (typeof fetchImpl !== 'function') throw new TypeError('fetch is not available.');

      const response = await fetchImpl(dataUrl, { cache: 'no-cache' });
      if (!response.ok) {
        throw new Error(`Could not load ${dataUrl} (${response.status}).`);
      }

      const data = await response.json();
      const urls = buildAudioFileUrls(folder, data, undefined, index);
      if (urls.length === 0) {
        throw new Error(`No audio file declared in ${dataUrl}.`);
      }

      // The metadata of a local song is the `data.json` of its folder. The
      // `title` field wins when present, so the file name never leaks into the
      // interface; the folder name is the only artist information available.
      const { title } = parseMusicMetadata(data);

      return {
        key,
        type: AUDIO_FILE_TYPE,
        id: folder,
        title: index > 0 ? `${title} (${index + 1})` : title,
        artist: folder.split('/')[0],
        urls,
      };
    })(),
  );
};

/**
 * Loads the metadata of a YouTube video.
 *
 * The oEmbed endpoint is the only public API that returns the title and the
 * channel of a video without an API key, so it is the one used to fill the
 * same cache the local songs use.
 *
 * @param {string} id - YouTube video id.
 * @param {typeof fetch} [fetchImpl] - Fetch implementation, for the tests.
 * @returns {Promise<TrackMetadata>} The track metadata.
 */
export const loadYoutubeFile = (id, fetchImpl = globalThis.fetch) => {
  const videoId = String(id).trim();
  if (videoId.length === 0) {
    return Promise.reject(new TypeError('A YouTube video id is required.'));
  }

  const key = getTrackKey('youtube', videoId);
  const cached = cache.get(key);
  if (cached) return cached;

  return remember(
    key,
    (async () => {
      const data = await fetchYouTubeOEmbed(videoId, { fetchImpl });

      return {
        key,
        type: /** @type {const} */ ('youtube'),
        id: videoId,
        title: data.title,
        artist: data.author_name,
        thumbnail: data.thumbnail_url,
        urls: [`https://www.youtube.com/watch?v=${videoId}`],
      };
    })(),
  );
};

/**
 * Loads the metadata of a track, whichever provider it belongs to.
 *
 * @param {{ type: string, id: string, file?: number }} track - Track to load.
 * @param {typeof fetch} [fetchImpl] - Fetch implementation, for the tests.
 * @returns {Promise<TrackMetadata>} The track metadata.
 */
export const loadTrackMetadata = (track, fetchImpl) => {
  if (track.type === 'youtube') return loadYoutubeFile(track.id, fetchImpl);
  if (track.type === AUDIO_FILE_TYPE) return loadAudioFile(track.id, track.file ?? 0, fetchImpl);
  return Promise.reject(new TypeError(`Unsupported track type: ${track.type}`));
};

/** Forgets every cached track. */
export const clearAudioFileCache = () => cache.clear();
