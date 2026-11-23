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
 * Cache of the resolved folders, so scrolling back and forth does not hit the
 * network again.
 *
 * @type {Map<string, Promise<{ id: string, dataUrl: string, urls: string[] }>>}
 */
const cache = new Map();

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
 * Validates the `data.json` of a music folder.
 *
 * The shape is the one documented in `public/audio/music_metadata.mjs`.
 *
 * @param {unknown} data - Parsed `data.json`.
 * @returns {{ files: string[], formats: string[] }} The file names and formats.
 * @throws {TypeError} When the metadata is not usable.
 */
export const parseMusicMetadata = (data) => {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new TypeError('Music metadata must be an object.');
  }

  const metadata = /** @type {Record<string, unknown>} */ (data);

  const files = toStringArray(metadata.file);
  if (files.length === 0) {
    throw new TypeError('Music metadata is missing the "file" field.');
  }

  const formats = toStringArray(metadata.format).map((format) =>
    format.replace(/^\./, '').toLowerCase(),
  );

  return { files, formats: formats.length > 0 ? formats : [DEFAULT_FORMAT] };
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
 * @returns {string[]} The candidate URLs, in the order of the metadata.
 */
export const buildAudioFileUrls = (id, data, baseUrl) => {
  const folder = getMusicFolderUrl(id);
  if (!folder) return [];

  const { files, formats } = parseMusicMetadata(data);
  /** @type {string[]} */
  const paths = [];

  for (const file of files) {
    // Some folders already carry the extension (`distant-dream-v1.1.mp3`).
    if (EXTENSION_PATTERN.test(file)) {
      paths.push(`${folder}${file}`);
      continue;
    }

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
 * @param {typeof fetch} [fetchImpl] - Fetch implementation, for the tests.
 * @returns {Promise<{ id: string, dataUrl: string, urls: string[] }>} The folder.
 */
export const loadAudioFile = (id, fetchImpl = globalThis.fetch) => {
  const dataUrl = getMusicDataUrl(id);
  if (!dataUrl) return Promise.reject(new TypeError(`Invalid music folder: ${String(id)}`));

  const key = /** @type {string} */ (id).trim();
  const cached = cache.get(key);
  if (cached) return cached;

  const task = (async () => {
    if (typeof fetchImpl !== 'function') throw new TypeError('fetch is not available.');

    const response = await fetchImpl(dataUrl, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Could not load ${dataUrl} (${response.status}).`);
    }

    const urls = buildAudioFileUrls(key, await response.json());
    if (urls.length === 0) {
      throw new Error(`No audio file declared in ${dataUrl}.`);
    }

    return { id: key, dataUrl, urls };
  })();

  // A failed load must not be cached, otherwise a single network hiccup would
  // silence the folder until the visitor reloads the page.
  task.catch(() => cache.delete(key));
  cache.set(key, task);

  return task;
};

/** Forgets every cached folder. */
export const clearAudioFileCache = () => cache.clear();
