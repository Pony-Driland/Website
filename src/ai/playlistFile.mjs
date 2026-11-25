import { validateTrack } from './musicTrack.mjs';

/**
 * Import and export of a playlist file.
 *
 * The file follows the same shape as the playlist of the reader
 * (`src/chapters/sound.mjs`): an array of tracks, or an object with a `tracks`
 * array plus the draw options. Keeping the two in sync means a playlist can be
 * copied between the reader and a room without a conversion step.
 *
 * On top of the reader format, the file also carries the playlist metadata
 * that only the room knows about (`name`, `scope` and `mode`), so a playlist
 * can be moved between rooms without losing its configuration.
 *
 * @module ai/playlistFile
 */

/** Extension of the exported file. */
export const PLAYLIST_FILE_EXTENSION = 'json';

/**
 * Reads a non-empty string.
 *
 * @param {unknown} value - Value to read.
 * @returns {string|null}
 */
const readText = (value) => {
  if (typeof value !== 'string') return null;

  const text = value.trim();
  return text.length > 0 ? text : null;
};

/**
 * Reads a finite number.
 *
 * @param {unknown} value - Value to read.
 * @returns {number|null}
 */
const readNumber = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim().length < 1) return null;

  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

/**
 * Reads a list of non-empty strings.
 *
 * @param {unknown} value - Value to read.
 * @returns {string[]|null}
 */
const readGroups = (value) => {
  if (!Array.isArray(value)) return null;

  const list = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);

  return list.length > 0 ? list : null;
};

/**
 * Reads the pity configuration of a track.
 *
 * @param {unknown} value - Value to read.
 * @returns {{ threshold?: number, increment?: number, cap?: number }|false|null}
 */
const readPity = (value) => {
  if (value === false) return false;
  if (!value || typeof value !== 'object') return null;

  const source = /** @type {Record<string, unknown>} */ (value);
  /** @type {{ threshold?: number, increment?: number, cap?: number }} */
  const pity = {};

  const threshold = readNumber(source.threshold);
  if (threshold !== null) pity.threshold = threshold;

  const increment = readNumber(source.increment);
  if (increment !== null) pity.increment = increment;

  const cap = readNumber(source.cap);
  if (cap !== null) pity.cap = cap;

  return Object.keys(pity).length > 0 ? pity : null;
};

/**
 * Serializes a single track.
 *
 * @param {Record<string, any>} track - Track to serialize.
 * @returns {Record<string, any>}
 */
const exportTrack = (track) => {
  /** @type {Record<string, any>} */
  const item = { id: track.id, type: track.type };

  // `file` is only meaningful for a folder with more than one song.
  if (Number.isFinite(track.file) && track.file > 0) item.file = track.file;

  const title = readText(track.title);
  if (title) item.title = title;

  const artist = readText(track.artist);
  if (artist) item.artist = artist;

  if (typeof track.weight === 'number' && Number.isFinite(track.weight)) item.weight = track.weight;

  const groups = readGroups(track.groups);
  if (groups) item.groups = groups;

  const pity = readPity(track.pity);
  if (pity !== null) item.pity = pity;

  if (track.exclude === true) item.exclude = true;

  return item;
};

/**
 * Reads a single track.
 *
 * @param {unknown} track - Track to read.
 * @param {number} index - Position of the track in the file.
 * @returns {Record<string, any>}
 * @throws {Error} When the track is not valid.
 */
const importTrack = (track, index) => {
  const checked = validateTrack(track);

  if (!checked.ok) {
    throw new Error(`Track ${index + 1}: ${checked.reason}`);
  }

  const source = /** @type {Record<string, any>} */ (track);
  const file = readNumber(source.file);

  /** @type {Record<string, any>} */
  const item = {
    type: checked.type,
    id: checked.id,
    file: file !== null ? Math.max(0, Math.floor(file)) : 0,
    title: typeof source.title === 'string' ? source.title : null,
  };

  const artist = readText(source.artist);
  if (artist) item.artist = artist;

  const weight = readNumber(source.weight);
  if (weight !== null) item.weight = weight;

  const groups = readGroups(source.groups);
  if (groups) item.groups = groups;

  const pity = readPity(source.pity);
  if (pity !== null) item.pity = pity;

  if (source.exclude === true) item.exclude = true;

  return item;
};

/**
 * Builds the file name of a playlist.
 *
 * @param {string} name - Playlist name.
 * @returns {string}
 */
export const getPlaylistFileName = (name) => {
  const slug = String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${slug.length > 0 ? slug : 'playlist'}.${PLAYLIST_FILE_EXTENSION}`;
};

/**
 * Serializes a playlist into the reader format.
 *
 * The draw options are written at the top level, exactly like the reader
 * expects, and the playlist metadata (`name`, `scope` and `mode`) is added
 * next to them. Tracks keep every field the player understands, so a round
 * trip never loses the configuration of a song.
 *
 * @param {Object} playlist - Playlist to export.
 * @param {string} [playlist.name] - Playlist name.
 * @param {Array<Record<string, any>>} playlist.tracks - Tracks of the playlist.
 * @param {Record<string, any>|null} [playlist.raffle] - Draw configuration.
 * @param {'all'|'rooms'} [playlist.scope] - Where the playlist is available.
 * @param {'ordered'|'raffle'} [playlist.mode] - How the track order is drawn.
 * @returns {string}
 */
export const exportPlaylist = ({ name, tracks, raffle, scope, mode }) => {
  const list = (Array.isArray(tracks) ? tracks : []).map(exportTrack);
  const config = raffle && typeof raffle === 'object' ? raffle : {};
  const payload = { ...config };

  const playlistName = readText(name);
  if (playlistName) payload.name = playlistName;

  if (scope === 'all' || scope === 'rooms') payload.scope = scope;
  if (mode === 'ordered' || mode === 'raffle') payload.mode = mode;

  payload.tracks = list;

  return JSON.stringify(payload, null, 2);
};

/**
 * Reads a playlist file.
 *
 * Accepts both shapes the reader accepts: a plain array of tracks or an object
 * with a `tracks` array. Every track is validated, so a file can never inject
 * a source the player would refuse to play.
 *
 * @param {string} text - File contents.
 * @returns {{
 *   name: string|null,
 *   scope: 'all'|'rooms'|null,
 *   mode: 'ordered'|'raffle'|null,
 *   tracks: Array<Record<string, any>>,
 *   raffle: Record<string, any>|null,
 * }}
 * @throws {Error} When the file is not a valid playlist.
 */
export const readPlaylistFile = (text) => {
  let data;

  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error(`The file is not valid JSON: ${/** @type {Error} */ (err).message}`);
  }

  const isArray = Array.isArray(data);
  const list = isArray ? data : data?.tracks;

  if (!Array.isArray(list)) {
    throw new Error('The file does not contain a track list.');
  }

  const tracks = list.map(importTrack);

  // The draw options travel with the file, so a shuffled playlist keeps its
  // configuration after a round trip. The playlist metadata is read first and
  // removed, so it is never mistaken for a draw option.
  const raffle = isArray ? null : { ...data };

  /** @type {string|null} */
  let name = null;
  /** @type {'all'|'rooms'|null} */
  let scope = null;
  /** @type {'ordered'|'raffle'|null} */
  let mode = null;

  if (raffle) {
    delete raffle.tracks;

    name = readText(raffle.name);
    delete raffle.name;

    scope = raffle.scope === 'all' || raffle.scope === 'rooms' ? raffle.scope : null;
    delete raffle.scope;

    mode = raffle.mode === 'ordered' || raffle.mode === 'raffle' ? raffle.mode : null;
    delete raffle.mode;
  }

  return {
    name,
    scope,
    mode,
    tracks,
    raffle: raffle && Object.keys(raffle).length > 0 ? raffle : null,
  };
};
