import { validateTrack } from './musicTrack.mjs';

/**
 * Import and export of a playlist file.
 *
 * The file follows the same shape as the playlist of the reader
 * (`src/chapters/sound.mjs`): an array of tracks, or an object with a `tracks`
 * array plus the draw options. Keeping the two in sync means a playlist can be
 * copied between the reader and a room without a conversion step.
 *
 * @module ai/playlistFile
 */

/** Extension of the exported file. */
export const PLAYLIST_FILE_EXTENSION = 'json';

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
 * Only the fields the reader understands are written, so an exported file can
 * be pasted straight into `src/chapters/sound.mjs`.
 *
 * @param {Object} playlist - Playlist to export.
 * @param {Array<Record<string, any>>} playlist.tracks - Tracks of the playlist.
 * @param {Record<string, any>|null} [playlist.raffle] - Draw configuration.
 * @returns {string}
 */
export const exportPlaylist = ({ tracks, raffle }) => {
  const list = (Array.isArray(tracks) ? tracks : []).map((track) => {
    /** @type {Record<string, any>} */
    const item = { id: track.id, type: track.type };

    // `file` is only meaningful for a folder with more than one song.
    if (Number.isFinite(track.file) && track.file > 0) item.file = track.file;

    return item;
  });

  const config = raffle && typeof raffle === 'object' ? raffle : null;
  const payload = config ? { ...config, tracks: list } : list;

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
 * @returns {{ tracks: Array<Record<string, any>>, raffle: Record<string, any>|null }}
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

  const tracks = list.map((track, index) => {
    const checked = validateTrack(track);

    if (!checked.ok) {
      throw new Error(`Track ${index + 1}: ${checked.reason}`);
    }

    return {
      type: checked.type,
      id: checked.id,
      file: Number.isFinite(track?.file) ? Math.max(0, Math.floor(track.file)) : 0,
      title: typeof track?.title === 'string' ? track.title : null,
    };
  });

  // The draw options travel with the file, so a shuffled playlist keeps its
  // configuration after a round trip.
  const raffle = isArray ? null : { ...data };
  if (raffle) delete raffle.tracks;

  return { tracks, raffle: raffle && Object.keys(raffle).length > 0 ? raffle : null };
};
