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

import TinyDebugger from 'tiny-essentials/libs/tools/TinyDebugger';
import { isDev } from '../dev.mjs';

/**
 * Configuration options for initializing the TinyUserActivationDetector instance.
 * @typedef {Object} ActivationOptions
 * @property {boolean} [debugMode=false] - Whether to enable internal debug logging.
 * @property {boolean} [useLogColors=false] - Whether to enable log color support.
 * @property {Partial<Console>} [logger=console] - A custom logger object (must implement console methods).
 */

class TinyUserActivationDetector extends TinyDebugger {
  /** How often the user activation is checked, in milliseconds. */
  static #POLL_INTERVAL = 100;

  /**
   * Whether the document already received a user gesture.
   *
   * `navigator.userActivation` is the only reliable way to know if the page was
   * already activated (a back/forward navigation, a reload or a gesture that
   * happened before this module was imported, for example).
   *
   * @returns {boolean}
   */
  static hasUserActivation() {
    return typeof navigator !== 'undefined' && navigator.userActivation?.hasBeenActive === true;
  }

  /**
   * @param {ActivationOptions} [options={}] - Configuration options for the user activation.
   * @throws {TypeError} If options is not an object or if the logger lacks required methods.
   */
  constructor(options = {}) {
    super({
      id: '[_main_class_TinyUserActivationDetector_reset_]',
      logger: options.logger ?? console,
      debugMode: options.debugMode ?? false,
      useLogColors: options.useLogColors ?? false,
    });
  }

  /** @type {boolean} */
  #unlocked = typeof navigator === 'undefined' || TinyUserActivationDetector.hasUserActivation();

  /** @type {Map<string, () => void>} */
  #queue = new Map();

  /** @type {number} */
  #autoKey = 0;

  /** @type {ReturnType<typeof setTimeout>|undefined} */
  #timer;

  get size() {
    return this.#queue.size;
  }

  get autoKey() {
    return this.#autoKey;
  }

  get unlocked() {
    return this.#unlocked;
  }

  get existsTime() {
    return !!this.#timer;
  }

  /** Stops watching the user activation. */
  #stopWatching() {
    if (this.#timer === undefined) return;
    clearTimeout(this.#timer);
    this.#timer = undefined;
  }

  /** Runs every pending callback. */
  flush() {
    const pending = this.#queue;
    this.#queue = new Map();

    for (const callback of pending.values()) {
      try {
        callback();
      } catch (err) {
        this.log('error', 'Flush Error', err);
      }
    }
  }

  /** Unlocks the audio and runs everything that was waiting for it. */
  unlock() {
    if (this.#unlocked) return;

    this.#unlocked = true;
    this.#stopWatching();
    this.flush();
  }

  /** Checks the activation again on the next tick. */
  #watch() {
    if (this.#timer !== undefined || this.#unlocked) return;

    this.#timer = setTimeout(() => {
      this.#timer = undefined;
      if (TinyUserActivationDetector.hasUserActivation()) this.unlock();
      else this.#watch();
    }, TinyUserActivationDetector.#POLL_INTERVAL);
  }

  /**
   * Runs the callback as soon as the audio is allowed to play.
   *
   * A `key` makes the request unique: a new callback with a key that is still
   * waiting replaces the previous one, so scrolling around before the first
   * interaction does not queue the same playback twice.
   *
   * @param {() => void} callback - Playback to start.
   * @param {string} [key] - Unique key of the request.
   * @returns {string}
   */
  whenReady(callback, key) {
    if (typeof callback !== 'function') return '';

    // The visitor may have interacted with the page before this request (or
    // before this module was even imported). The activation is sticky, so a
    // single interaction is enough for the whole session.
    if (!this.#unlocked && TinyUserActivationDetector.hasUserActivation()) this.unlock();

    if (this.#unlocked) {
      callback();
      return '';
    }

    const keyResult = key ?? `auto-${this.#autoKey++}`;
    this.#queue.set(keyResult, callback);
    this.#watch();
    return keyResult;
  }

  /**
   * Discards a pending request.
   *
   * @param {string} key - Key of the request.
   * @returns {void}
   */
  cancel(key) {
    this.#queue.delete(key);
  }
}

export default new TinyUserActivationDetector({ debugMode: isDev });
