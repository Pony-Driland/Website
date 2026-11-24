import { isAudioFilePath } from '../chapter_manager/music/audioFile.mjs';

/**
 * Validation of the track sources accepted by the room player.
 *
 * A playlist is shared between every listener of a room, so the source of a
 * track is untrusted input: it may come from an old row, from another client
 * or from a hand crafted socket message. Only two providers are allowed, and
 * the check lives in a single place so the editor, the player and the error
 * message can never disagree.
 *
 * @module ai/musicTrack
 */

/** Provider of a YouTube video. */
export const YOUTUBE_TYPE = 'youtube';

/** Provider of a file shipped with the website. */
export const AUDIO_FILE_TYPE = 'audio-file';

/** Every provider the player is allowed to load. */
export const TRACK_TYPES = [YOUTUBE_TYPE, AUDIO_FILE_TYPE];

/**
 * A YouTube id is 11 characters of the URL safe alphabet.
 *
 * The player builds `youtube.com/watch?v=<id>` from it, so anything else is
 * either a typo or an attempt to smuggle a different URL into the iframe.
 */
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Why a track was refused.
 *
 * @typedef {Object} TrackRejection
 * @property {string} reason - Message shown to the user.
 */

/**
 * Tells whether a value is a valid YouTube video id.
 *
 * @param {unknown} id - Value to check.
 * @returns {boolean}
 */
export const isYoutubeId = (id) => typeof id === 'string' && YOUTUBE_ID.test(id.trim());

/**
 * Checks the source of a track.
 *
 * @param {unknown} track - Track to check.
 * @returns {{ ok: true, type: string, id: string } | { ok: false, reason: string }}
 */
export const validateTrack = (track) => {
  if (typeof track !== 'object' || track === null) {
    return { ok: false, reason: 'The track is not a valid entry.' };
  }

  const { type, id } = /** @type {Record<string, unknown>} */ (track);

  if (typeof type !== 'string' || TRACK_TYPES.indexOf(type) < 0) {
    return {
      ok: false,
      reason: `Unsupported source "${String(type)}". Only YouTube and files hosted on this website are allowed.`,
    };
  }

  if (typeof id !== 'string' || id.trim().length < 1) {
    return { ok: false, reason: 'The track has no source.' };
  }

  const trackId = id.trim();

  if (type === YOUTUBE_TYPE) {
    if (!isYoutubeId(trackId)) {
      return {
        ok: false,
        reason: `"${trackId}" is not a valid YouTube video id.`,
      };
    }

    return { ok: true, type, id: trackId };
  }

  // `audio-file` is a folder inside `public/audio`, never a URL: the helper
  // rejects a protocol, a leading slash and any `..` segment.
  if (!isAudioFilePath(trackId)) {
    return {
      ok: false,
      reason: `"${trackId}" is not an audio folder of this website.`,
    };
  }

  return { ok: true, type, id: trackId };
};

/**
 * Tells whether a track can be played.
 *
 * @param {unknown} track - Track to check.
 * @returns {boolean}
 */
export const isPlayableTrack = (track) => validateTrack(track).ok;
