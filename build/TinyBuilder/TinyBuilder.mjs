import { basename, join } from 'path';
import clone from 'clone';
import chokidar from 'chokidar';
import { build, context } from 'esbuild';
import { TinyEvents } from 'tiny-essentials';

/** @typedef {import('esbuild').BuildOptions} BuildOptions */
/** @typedef {import('chokidar').FSWatcher} FSWatcher */
/** @typedef {import('chokidar').EmitArgsWithName} ChokidarEmitArgsWithName */

/**
 * @typedef {{ [ext: string]: Loader; }} BuildOptionsLoader
 */

/**
 * Callback function signature used for file events.
 * @callback TinyFileFn
 * @param {ChokidarEmitArgsWithName} args
 */

class TinyBuilder {
  #events = new TinyEvents();

  /**
   * Emits an event, triggering all registered handlers for that event.
   *
   * @param {string|string[]} event - The event name to emit.
   * @param {...any} payload - Optional data to pass to each handler.
   * @returns {boolean[]} True if any listeners were called, false otherwise.
   */
  #emit(event, ...payload) {
    return this.#events.emit(event, ...payload);
  }

  /**
   * Enables or disables throwing an error when the maximum number of listeners is exceeded.
   *
   * @param {boolean} shouldThrow - If true, an error will be thrown when the max is exceeded.
   */
  setThrowOnMaxListeners(shouldThrow) {
    return this.#events.setThrowOnMaxListeners(shouldThrow);
  }

  /**
   * Checks whether an error will be thrown when the max listener limit is exceeded.
   *
   * @returns {boolean} True if an error will be thrown, false if only a warning is shown.
   */
  getThrowOnMaxListeners() {
    return this.#events.getThrowOnMaxListeners();
  }

  /////////////////////////////////////////////////////////////

  /**
   * Adds a listener to the beginning of the listeners array for the specified event.
   *
   * @param {string|string[]} event - Event name.
   * @param {handler} handler - The callback function.
   */
  prependListener(event, handler) {
    return this.#events.prependListener(event, handler);
  }

  /**
   * Adds a one-time listener to the beginning of the listeners array for the specified event.
   *
   * @param {string|string[]} event - Event name.
   * @param {handler} handler - The callback function.
   * @returns {handler[]} - The wrapped handler used internally.
   */
  prependListenerOnce(event, handler) {
    return this.#events.prependListenerOnce(event, handler);
  }

  //////////////////////////////////////////////////////////////////////

  /**
   * Adds a event listener.
   *
   * @param {string|string[]} event - Event name, such as 'onScrollBoundary' or 'onAutoScroll'.
   * @param {handler} handler - Callback function to be called when event fires.
   */
  appendListener(event, handler) {
    return this.#events.appendListener(event, handler);
  }

  /**
   * Registers an event listener that runs only once, then is removed.
   *
   * @param {string|string[]} event - Event name, such as 'onScrollBoundary' or 'onAutoScroll'.
   * @param {handler} handler - The callback function to run on event.
   * @returns {handler[]} - The wrapped version of the handler.
   */
  appendListenerOnce(event, handler) {
    return this.#events.appendListenerOnce(event, handler);
  }

  /**
   * Adds a event listener.
   *
   * @param {string|string[]} event - Event name, such as 'onScrollBoundary' or 'onAutoScroll'.
   * @param {handler} handler - Callback function to be called when event fires.
   */
  on(event, handler) {
    return this.#events.on(event, handler);
  }

  /**
   * Registers an event listener that runs only once, then is removed.
   *
   * @param {string|string[]} event - Event name, such as 'onScrollBoundary' or 'onAutoScroll'.
   * @param {handler} handler - The callback function to run on event.
   * @returns {handler[]} - The wrapped version of the handler.
   */
  once(event, handler) {
    return this.#events.once(event, handler);
  }

  ////////////////////////////////////////////////////////////////////

  /**
   * Removes a previously registered event listener.
   *
   * @param {string|string[]} event - The name of the event to remove the handler from.
   * @param {handler} handler - The specific callback function to remove.
   */
  off(event, handler) {
    return this.#events.off(event, handler);
  }

  /**
   * Removes all event listeners of a specific type from the element.
   *
   * @param {string|string[]} event - The event type to remove (e.g. 'onScrollBoundary').
   */
  offAll(event) {
    return this.#events.offAll(event);
  }

  /**
   * Removes all event listeners of all types from the element.
   */
  offAllTypes() {
    return this.#events.offAllTypes();
  }

  ////////////////////////////////////////////////////////////

  /**
   * Returns the number of listeners for a given event.
   *
   * @param {string} event - The name of the event.
   * @returns {number} Number of listeners for the event.
   */
  listenerCount(event) {
    return this.#events.listenerCount(event);
  }

  /**
   * Returns a copy of the array of listeners for the specified event.
   *
   * @param {string} event - The name of the event.
   * @returns {handler[]} Array of listener functions.
   */
  listeners(event) {
    return this.#events.listeners(event);
  }

  /**
   * Returns a copy of the array of listeners for the specified event.
   *
   * @param {string} event - The name of the event.
   * @returns {handler[]} Array of listener functions.
   */
  onceListeners(event) {
    return this.#events.onceListeners(event);
  }

  /**
   * Returns a copy of the internal listeners array for the specified event,
   * including wrapper functions like those used by `.once()`.
   * @param {string | symbol} event - The event name.
   * @returns {handler[]} An array of raw listener functions.
   */
  allListeners(event) {
    return this.#events.allListeners(event);
  }

  /**
   * Returns an array of event names for which there are registered listeners.
   *
   * @returns {string[]} Array of registered event names.
   */
  eventNames() {
    return this.#events.eventNames();
  }

  //////////////////////////////////////////////////////

  /**
   * Sets the maximum number of listeners per event before a warning is shown.
   *
   * @param {number} n - The maximum number of listeners.
   */
  setMaxListeners(n) {
    return this.#events.setMaxListeners(n);
  }

  /**
   * Gets the maximum number of listeners allowed per event.
   *
   * @returns {number} The maximum number of listeners.
   */
  getMaxListeners() {
    return this.#events.getMaxListeners();
  }

  /////////////////////////////////////////////

  /** @type {BuildOptions} */
  #config;

  /** @returns {BuildOptions} */
  get config() {
    return clone(this.#config);
  }

  /** @param {BuildOptions} value */
  set config(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
      throw new TypeError('');
    this.#config = clone(value);
  }

  ////////////////////////////////////////////

  /** @returns {string} */
  get dist() {
    return this.#config.outdir;
  }

  /** @param {string} value */
  set dist(value) {
    if (typeof value !== 'string') throw new TypeError('');
    this.#config.outdir = value;
  }

  ////////////////////////////////////////////

  /** @type {string} */
  #src;

  /** @returns {string} */
  get src() {
    return this.#src;
  }

  /** @param {string} value */
  set src(value) {
    if (typeof value !== 'string') throw new TypeError('');
    this.#src = value;
    if (Array.isArray(this.#config.entryPoints))
      this.#config.entryPoints.forEach((entry, index) => {
        if (typeof entry === 'string')
          this.#config.entryPoints[index] = join(this.#src, basename(entry));
        else {
          this.#config.entryPoints[index].in = join(this.#src, basename(entry.in));
        }
      });
  }

  ////////////////////////////////////////////

  /** @param {BuildOptions} cfg */
  constructor(cfg) {
    this.config = cfg;
  }

  ////////////////////////////////////////////

  /** @type {FSWatcher|null} */
  #fsWatcher = null;

  /** @returns {FSWatcher|null} */
  get fsWatcher() {
    return this.#fsWatcher;
  }

  /** @type {BuildContext<BuildOptions>|null} */
  #ctx = null;

  /** @returns {BuildContext<BuildOptions>|null} */
  get ctx() {
    return this.#ctx;
  }

  /**
   * @type {BuildOptionsLoader}
   */
  #loader = { '.ts': 'ts' };

  /** @returns {BuildOptionsLoader} */
  get loader() {
    return this.#loader;
  }

  /** @param {BuildOptionsLoader} value */
  set loader(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
      throw new TypeError('');
    this.#loader = value;
  }

  /** @param {Function} beforeCallback */
  async start(beforeCallback) {
    // File Watcher
    this.#fsWatcher = chokidar.watch(this.#src);

    this.#fsWatcher.on('all', (event, path, stats) => {
      // Get file path
      const file = path.split(this.#src)[1];
      const filePath = file.startsWith('/') ? file.substring(1) : file;
      this._addFilePath([event, filePath, stats]);
    });

    // File Builder
    if (typeof beforeCallback === 'function') await beforeCallback();
    /** @type {BuildOptions} */
    const tinyCfg = {
      ...this.#config,
      loader: this.#loader, // allow TypeScript files
      plugins: [
        ...this.#config.plugins,
        // Build sender
        {
          name: 'tiny-build-watcher',
          setup: (build) => {
            build.onStart(() => {
              this.usingQueue = true;
              console.log('[tiny-builder] Instance received updates...');
            });
            build.onEnd((result) => {
              this.usingQueue = false;
              console.log(
                '[tiny-builder] Instance updates finished:',
                result.errors.length,
                'errors.',
              );
            });
          },
        },
      ],
    };

    this.#ctx = await context(tinyCfg);
    return this.#ctx;
  }

  ////////////////////////////////////////////

  /** @returns {Promise<BuildResult<BuildOptions>>} */
  build() {
    return build(this.#config);
  }

  ////////////////////////////////////////////

  /**
   * Internal queue of chokidar event arguments.
   * @type {Array<ChokidarEmitArgsWithName>}
   */
  #queue = [];

  /**
   * Whether the watcher is holding events in the queue
   * instead of sending them immediately.
   * @type {boolean}
   */
  #usingQueue = false;

  /**
   * Returns whether the watcher is currently queueing events.
   * @returns {boolean}
   */
  get usingQueue() {
    return this.#usingQueue;
  }

  /**
   * Enables or disables the use of the queue.
   * When set to `false`, all queued events are sent immediately.
   * @param {boolean} value
   */
  set usingQueue(value) {
    if (typeof value !== 'boolean') throw new TypeError('');
    this.#usingQueue = value;
    if (!this.#usingQueue) this._send();
  }

  ////////////////////////////////////////////

  /**
   * Sends all queued events to the callback.
   * Clears the queue afterwards.
   * @private
   */
  _send() {
    this.#queue.forEach(([eventName, filePath, stats]) => {
      console.log(`[tiny-builder] [update] ${filePath}`);
      this.#emit('FileUpdate', eventName, filePath, stats);
    });
    this.#queue = [];
  }

  /**
   * Adds a file event to the queue.
   * @param {ChokidarEmitArgsWithName} value
   */
  _addFilePath(value) {
    this.#queue.push(value);
  }
}

export default TinyBuilder;
