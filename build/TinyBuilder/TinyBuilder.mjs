import { basename, join } from 'path';
import clone from 'clone';
import chokidar from 'chokidar';
import { build, context } from 'esbuild';
import { TinyEvents } from 'tiny-essentials';

/** @typedef {import('tiny-essentials/dist/v1/libs/TinyEvents.mjs').handler} handler */
/** @typedef {import('esbuild').BuildOptions} BuildOptions */
/** @typedef {import('esbuild').BuildContext} BuildContext */
/** @typedef {import('esbuild').BuildResult} BuildResult */
/** @typedef {import('esbuild').Loader} Loader */
/** @typedef {import('chokidar').FSWatcher} FSWatcher */
/** @typedef {import('chokidar').EmitArgsWithName} ChokidarEmitArgsWithName */

/**
 * Represents the loader configuration used by esbuild.
 * Keys are file extensions, values are loader types (e.g., "ts", "js").
 * @typedef {{ [ext: string]: Loader }} BuildOptionsLoader
 */

/**
 * Callback function signature used for file events.
 * @callback TinyFileFn
 * @param {ChokidarEmitArgsWithName} args - Chokidar event arguments
 */

/**
 * TinyBuilder is a small wrapper around esbuild with integrated
 * file watching and queued update handling.
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

  /** Internal console tag. */
  #tag = '[tiny-builder]';

  /** Internal console tag. */
  get tag() {
    return this.#tag;
  };

  /**
   * Internal esbuild configuration.
   * Cloned on get/set to avoid external mutations.
   * @type {BuildOptions}
   */
  #config = {};

  /**
   * Returns a copy of the current esbuild config.
   * @returns {BuildOptions}
   */
  get config() {
    return clone(this.#config);
  }

  /**
   * Replaces the current esbuild config.
   * @param {BuildOptions} value
   * @throws {TypeError} If value is not a plain object.
   */
  set config(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
      throw new TypeError('Expected a plain object for config.');
    this.#config = clone(value);
  }

  ////////////////////////////////////////////

  /**
   * Returns the current output directory.
   * @returns {string|undefined}
   */
  get dist() {
    return this.#config.outdir;
  }

  /**
   * Sets the output directory.
   * @param {string} value
   * @throws {TypeError} If value is not a string.
   */
  set dist(value) {
    if (typeof value !== 'string') throw new TypeError('Expected string for dist.');
    this.#config.outdir = value;
  }

  ////////////////////////////////////////////

  /**
   * Source directory for watched entry points.
   * @type {string|undefined}
   */
  #src;

  /**
   * Returns the current source directory.
   * @returns {string|undefined}
   */
  get src() {
    return this.#src;
  }

  /**
   * Sets the source directory and rewrites entryPoints
   * accordingly, ensuring they point to the new src path.
   * @param {string} value
   * @throws {TypeError} If value is not a string.
   */
  set src(value) {
    if (typeof value !== 'string') throw new TypeError('Expected string for src.');
    this.#src = value;
    if (Array.isArray(this.#config.entryPoints))
      this.#config.entryPoints.forEach((entry, index) => {
        if (typeof entry === 'string')
          // @ts-ignore
          this.#config.entryPoints[index] = 
            join(this.#src ?? '', basename(entry));
        else {
          // @ts-ignore
          this.#config.entryPoints[index].in = 
            join(this.#src ?? '', basename(entry.in));
        }
      });
  }

  ////////////////////////////////////////////

  /**
   * Creates a new TinyBuilder instance.
   * @param {BuildOptions} cfg - Initial esbuild configuration
   */
  constructor(cfg) {
    this.config = cfg;
  }

  ////////////////////////////////////////////

  /**
   * File system watcher instance.
   * @type {FSWatcher|null}
   */
  #fsWatcher = null;

  /**
   * Returns the current chokidar watcher instance.
   * @returns {FSWatcher|null}
   */
  get fsWatcher() {
    return this.#fsWatcher;
  }

  /**
   * Esbuild context object used for watch mode.
   * @type {BuildContext|null}
   */
  #ctx = null;

  /**
   * Returns the esbuild context if available.
   * @returns {BuildContext|null}
   */
  get ctx() {
    return this.#ctx;
  }

  /**
   * Loader configuration.
   * @type {BuildOptionsLoader|null}
   */
  #loader = null;

  /**
   * Returns the current loader configuration.
   * @returns {BuildOptionsLoader|null}
   */
  get loader() {
    return this.#loader;
  }

  /**
   * Replaces the loader configuration.
   * @param {BuildOptionsLoader|null} value
   * @throws {TypeError} If value is not a plain object.
   */
  set loader(value) {
    if (value !== null && (typeof value !== 'object' || value === null || Array.isArray(value)))
      throw new TypeError('Expected plain object for loader.');
    this.#loader = value;
  }

  /**
   * Starts the watcher + builder process.
   * @param {Function} beforeCallback - Optional callback executed before build starts
   * @returns {Promise<BuildContext>} Esbuild context
   */
  async start(beforeCallback) {
    if (typeof this.#src !== 'string') throw new Error('Expected string for Tiny Builder src.');
    // File Watcher
    this.#fsWatcher = chokidar.watch(this.#src);

    console.log(`${this.#tag} Starting file watcher...`);
    this.#fsWatcher.on('all', (event, path, stats) => {
      // Get file path
      const file = path.split(this.#src ?? '')[1] ?? '';
      const filePath = file.startsWith('/') ? file.substring(1) : file;
      this._addFilePath([event, filePath, stats]);
    });

    // File Builder
    if (typeof beforeCallback === 'function') await beforeCallback();
    /** @type {BuildOptions} */
    const tinyCfg = {
      ...this.#config,
      loader: this.#loader ?? undefined, // allow TypeScript files
      plugins: [
        ...this.#config.plugins ?? [],
        // Build sender
        {
          name: 'tiny-build-watcher',
          setup: (build) => {
            build.onStart(() => {
              this.usingQueue = true;
              console.log(`${this.#tag} Instance received updates...`);
            });
            build.onEnd((result) => {
              this.usingQueue = false;
              console.log(
                `${this.#tag} Instance updates finished:`,
                result.errors.length,
                'errors.',
              );
            });
          },
        },
      ],
    };

    console.log(`${this.#tag} Starting Esbuild context...`);
    this.#ctx = await context(tinyCfg);
    console.log(`${this.#tag} Started!`);
    return this.#ctx;
  }

  /**
   * Stops the watcher + builder process.  
   * Closes the file system watcher and disposes the esbuild context.
   *
   * @returns {Promise<boolean>}
   */
  async stop() {
    let closed = false;
    // Stop chokidar watcher
    if (this.#fsWatcher) {
      await this.#fsWatcher.close();
      this.#fsWatcher = null;
      console.log(`${this.#tag} File watcher stopped.`);
      closed = true;
    }

    // Dispose esbuild context
    if (this.#ctx) {
      await this.#ctx.dispose();
      this.#ctx = null;
      console.log(`${this.#tag} Esbuild context disposed.`);
      closed = true;
    }

    return closed;
  }

  ////////////////////////////////////////////

  /**
   * Executes a one-off esbuild build with the current config.
   * @returns {Promise<BuildResult>}
   */
  build() {
    return build(this.#config);
  }

  ////////////////////////////////////////////

  /**
   * Queue of chokidar event arguments awaiting dispatch.
   * @type {Array<ChokidarEmitArgsWithName>}
   */
  #queue = [];

  /**
   * Whether file events are currently being queued.
   * When `false`, all queued events are flushed immediately.
   * @type {boolean}
   */
  #usingQueue = false;

  /**
   * Returns whether events are currently queued.
   * @returns {boolean}
   */
  get usingQueue() {
    return this.#usingQueue;
  }

  /**
   * Enables or disables event queueing.
   * When set to `false`, all queued events are flushed.
   * @param {boolean} value
   * @throws {TypeError} If value is not a boolean.
   */
  set usingQueue(value) {
    if (typeof value !== 'boolean') throw new TypeError('Expected boolean for usingQueue.');
    this.#usingQueue = value;
    if (!this.#usingQueue) this._send();
  }

  ////////////////////////////////////////////

  /**
   * Flushes queued file events and emits them as "FileUpdate".
   * Clears the queue afterwards.
   * @private
   */
  _send() {
    /** @type {string|null} */
    let lastFile = null;
    this.#queue.forEach(([eventName, filePath, stats]) => {
      if (lastFile === filePath) return;
      lastFile = filePath;
      console.log(`${this.#tag} [update] ${filePath}`);
      this.#emit('FileUpdate', eventName, filePath, stats);
    });
    this.#queue = [];
  }

  /**
   * Adds a file event to the internal queue.
   * @param {ChokidarEmitArgsWithName} value
   * @private
   */
  _addFilePath(value) {
    this.#queue.push(value);
  }
}

export default TinyBuilder;
