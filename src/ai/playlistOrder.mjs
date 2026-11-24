import { createPlaylistRaffle } from '../chapter_manager/music/raffle.mjs';

/**
 * Draws the playback order of a playlist.
 *
 * The draw is done once, on the client that owns the playlist, and the result
 * is written back to the server as the new track order. Every listener then
 * follows the same list through the regular sync, so the room never has to
 * agree on a seed or replay the raffle.
 *
 * @module ai/playlistOrder
 */

/** How a playlist is walked. */
export const PLAYLIST_MODES = ['ordered', 'raffle'];

/**
 * Normalizes the mode of a playlist.
 *
 * @param {unknown} mode - Raw mode.
 * @returns {'ordered'|'raffle'}
 */
export const normalizeMode = (mode) => (mode === 'raffle' ? 'raffle' : 'ordered');

/**
 * Draws a new order for the given tracks.
 *
 * Uses `TinyAdvancedRaffle` through {@link createPlaylistRaffle}, so weights,
 * groups, pity and cooldown all work exactly like they do in the reader.
 *
 * A track the raffle refuses to draw (an exclusion, a group filter) is
 * appended in the original order instead of disappearing: a playlist must never
 * lose a song because of its draw configuration.
 *
 * @param {Array<Record<string, any>>} tracks - Tracks to shuffle.
 * @param {Record<string, any>|null} [options] - Draw configuration.
 * @returns {Array<Record<string, any>>} A new list, in the drawn order.
 */
export const drawPlaylistOrder = (tracks, options) => {
  const list = Array.isArray(tracks) ? tracks : [];
  if (list.length < 2) return [...list];

  const config = options && typeof options === 'object' ? options : {};

  let session;

  try {
    session = createPlaylistRaffle(/** @type {any} */ (list), {
      ...config,
      // A playlist plays every song once before repeating one.
      unique: config.unique !== false,
    });
  } catch (err) {
    console.error('[playlist-order] Could not start the raffle.', err);
    return [...list];
  }

  const drawn = [];
  const used = new Set();

  try {
    for (let index = 0; index < list.length; index++) {
      const track = session.next();
      if (!track) break;

      // The raffle returns the track itself, so the index is resolved by
      // identity first and by content as a fallback (the caller may have
      // cloned the list).
      let position = list.indexOf(track);
      if (position < 0 || used.has(position)) {
        position = list.findIndex(
          (item, itemIndex) =>
            !used.has(itemIndex) && item.type === track.type && item.id === track.id,
        );
      }

      if (position < 0 || used.has(position)) continue;

      used.add(position);
      drawn.push(list[position]);
    }
  } catch (err) {
    console.error('[playlist-order] The raffle failed.', err);
    return [...list];
  } finally {
    session.destroy();
  }

  // Anything the raffle refused keeps its original position at the end.
  list.forEach((track, index) => {
    if (!used.has(index)) drawn.push(track);
  });

  return drawn;
};
