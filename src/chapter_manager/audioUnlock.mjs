/**
 * Browsers only allow audio to start after the visitor interacts with the page
 * (autoplay policy). Every sound of the reader is requested by the scroll
 * position, not by the visitor, so the very first playback would be silently
 * dropped by the browser.
 *
 * This module holds those requests until the first user gesture and then runs
 * them in order.
 *
 * @module chapter_manager/audioUnlock
 */

/** Events that count as a user gesture. */
const gestureEvents = ['pointerdown', 'mousedown', 'touchstart', 'keydown', 'click'];

/**
 * Whether the document already received a user gesture.
 *
 * `navigator.userActivation` is the only reliable way to know if the page was
 * already activated (a back/forward navigation, for example), but it is not
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
    window.removeEventListener(event, onGesture, true);
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

/** Unlocks the audio and runs everything that was waiting for it. */
const onGesture = () => {
  if (unlocked) return;

  unlocked = true;
  stopListening();
  flush();
};

/** Starts listening to the first user gesture. */
const startListening = () => {
  if (listening || typeof window === 'undefined') return;
  listening = true;

  for (const event of gestureEvents) {
    window.addEventListener(event, onGesture, true);
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

export default audioUnlock;
