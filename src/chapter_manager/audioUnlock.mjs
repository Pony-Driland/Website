/**
 * Browsers only allow audio to start after the visitor interacts with the page
 * (autoplay policy). Every sound of the reader is requested by the scroll
 * position, not by the visitor, so the very first playback would be silently
 * dropped by the browser.
 *
 * This module holds those requests until the browser reports a user activation
 * and then runs them in order.
 *
 * Instead of listening to the gesture events, the activation is read from
 * `navigator.userActivation.hasBeenActive`. It is sticky, so a single
 * interaction is enough for the whole session and an interaction that happens
 * before the first sound is requested is not lost.
 *
 * @module chapter_manager/audioUnlock
 */

import { console } from '../dev.mjs';

/** How often the user activation is checked, in milliseconds. */
const POLL_INTERVAL = 100;

/**
 * Whether the document already received a user gesture.
 *
 * `navigator.userActivation` is the only reliable way to know if the page was
 * already activated (a back/forward navigation, a reload or a gesture that
 * happened before this module was imported, for example).
 *
 * @returns {boolean}
 */
const hasUserActivation = () =>
  typeof navigator !== 'undefined' && navigator.userActivation?.hasBeenActive === true;

/** @type {boolean} */
let unlocked = typeof navigator === 'undefined' || hasUserActivation();

/** @type {Map<string, () => void>} */
let queue = new Map();

/** @type {number} */
let autoKey = 0;

/** @type {ReturnType<typeof setTimeout>|undefined} */
let timer;

/** Stops watching the user activation. */
const stopWatching = () => {
  if (timer === undefined) return;
  clearTimeout(timer);
  timer = undefined;
};

/** Runs every pending callback. */
const flush = () => {
  const pending = queue;
  queue = new Map();

  for (const callback of pending.values()) {
    try {
      callback();
    } catch (err) {
      console.error(err);
    }
  }
};

/** Unlocks the audio and runs everything that was waiting for it. */
const unlock = () => {
  if (unlocked) return;

  unlocked = true;
  stopWatching();
  flush();
};

/** Checks the activation again on the next tick. */
const watch = () => {
  if (timer !== undefined || unlocked) return;

  timer = setTimeout(() => {
    timer = undefined;
    if (hasUserActivation()) unlock();
    else watch();
  }, POLL_INTERVAL);
};

const audioUnlock = {
  /** @returns {boolean} Whether the audio can already be played. */
  get unlocked() {
    return unlocked;
  },

  /**
   * Runs the callback as soon as the audio is allowed to play.
   *
   * A `key` makes the request unique: a new callback with a key that is still
   * waiting replaces the previous one, so scrolling around before the first
   * interaction does not queue the same playback twice.
   *
   * @param {() => void} callback - Playback to start.
   * @param {string} [key] - Unique key of the request.
   * @returns {void}
   */
  whenReady: (callback, key) => {
    if (typeof callback !== 'function') return;

    // The visitor may have interacted with the page before this request (or
    // before this module was even imported). The activation is sticky, so a
    // single interaction is enough for the whole session.
    if (!unlocked && hasUserActivation()) unlock();

    if (unlocked) {
      callback();
      return;
    }

    queue.set(key ?? `auto-${autoKey++}`, callback);
    watch();
  },

  /**
   * Discards a pending request.
   *
   * @param {string} key - Key of the request.
   * @returns {void}
   */
  cancel: (key) => {
    queue.delete(key);
  },

  /** Marks the audio as unlocked, running every pending playback. */
  unlock: () => unlock(),
};

export default audioUnlock;
