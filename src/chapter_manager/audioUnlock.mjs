/**
 * Browsers only allow audio to start after the visitor interacts with the page
 * (autoplay policy). Every sound of the reader is requested by the scroll
 * position, not by the visitor, so the very first playback would be silently
 * dropped by the browser.
 *
 * This module holds those requests until the first user gesture and then runs
 * them in order.
 *
 * The unlock is permanent and global: the very first interaction of the visitor
 * with the page (a click on the menu, a key press, a tap on the chapter, ...)
 * is enough to unlock the audio for the whole session. The listeners are
 * registered as soon as this module is imported, so an interaction that happens
 * before the first sound is requested is not lost.
 *
 * @module chapter_manager/audioUnlock
 */

import { console } from '../dev.mjs';

/** Events that count as a user gesture. */
const gestureEvents = [
  'pointerdown',
  'pointerup',
  'mousedown',
  'touchstart',
  'touchend',
  'keydown',
  'click',
];

/**
 * Whether the document already received a user gesture.
 *
 * `navigator.userActivation` is the only reliable way to know if the page was
 * already activated (a back/forward navigation, a reload or a gesture that
 * happened before this module was imported, for example), but it is not
 * available on every browser.
 *
 * @returns {boolean}
 */
const hasUserActivation = () => {
  if (typeof navigator === 'undefined') return true;
  const activation = /** @type {{ hasBeenActive?: boolean }|undefined} */ (
    navigator.userActivation
  );
  return activation ? activation.hasBeenActive === true : false;
};

/** @type {boolean} */
let unlocked = hasUserActivation();

/** @type {Map<string, () => void>} */
let queue = new Map();

/** @type {number} */
let autoKey = 0;

/** @type {boolean} */
let listening = false;

/** Stops listening to the user gestures. */
const stopListening = () => {
  if (!listening || typeof window === 'undefined') return;
  listening = false;

  for (const event of gestureEvents) {
    window.removeEventListener(event, onGesture, { capture: true });
  }
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

/**
 * Marks the audio as unlocked and stops listening to the gestures.
 *
 * @returns {boolean} `true` when the state changed with this call.
 */
const markUnlocked = () => {
  if (unlocked) return false;

  unlocked = true;
  stopListening();
  return true;
};

/** Unlocks the audio and runs everything that was waiting for it. */
const onGesture = () => {
  if (!markUnlocked()) return;
  flush();
};

/** Starts listening to the first user gesture. */
const startListening = () => {
  if (listening || unlocked || typeof window === 'undefined') return;
  listening = true;

  for (const event of gestureEvents) {
    window.addEventListener(event, onGesture, { capture: true, passive: true });
  }
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
    if (!unlocked && hasUserActivation() && markUnlocked()) flush();

    if (unlocked) {
      callback();
      return;
    }

    queue.set(key ?? `auto-${autoKey++}`, callback);
    startListening();
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
  unlock: () => onGesture(),
};

// The first interaction of the visitor has to be caught even when no sound was
// requested yet, otherwise the request would wait for a second interaction.
startListening();

export default audioUnlock;
