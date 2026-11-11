/*
 * PWA controller.
 *
 * Thin wrapper around `TinyServiceWorker`, which owns the registration, the
 * update flow and the display-mode detection. This module only exposes the
 * pieces the UI needs.
 *
 * @module pwa/installer
 */

import { EventEmitter } from 'events';
import TinyServiceWorker from 'tiny-essentials/libs/sw/browser/TinyServiceWorker';
import TinyDomReadyManager from 'tiny-essentials/libs/html/TinyDomReadyManager';
import { body } from '../html/query.mjs';
import isDev from '../dev.mjs';

/**
 * A tab rendered by the install banner.
 *
 * @typedef {Object} PwaTab
 * @property {string} id - Unique tab id.
 * @property {string} [title] - Tab label.
 * @property {string} [icon] - Icon class of the tab.
 * @property {() => void} [onClick] - Click handler of the tab.
 */

/**
 * Class representing the PWA management system.
 */
class TinyPwa extends EventEmitter {
  constructor() {
    super();
    /** @type {PwaTab[]} */
    this.tabs = [];
    /** @type {string|null} */
    this.tabId = null;
    this.enabled = false;
    this.initialized = false;
    this.needRefresh = false;
  }

  _init() {
    if (!this.initialized) {
      this.initialized = true;
      this.emit('ready');
    }
  }

  /** @param {PwaTab} item */
  _addTab(item) {
    this.tabs.push(item);
    this.emit('tabAdded', item);
  }

  /** @param {string} id */
  _removeTab(id) {
    const index = this.tabs.findIndex((tab) => tab.id === id);
    if (index > -1) {
      const item = this.tabs.splice(index, 1);
      this.emit('tabRemoved', item);
    }
  }

  /** @param {string} id */
  _setTabId(id) {
    if (typeof id === 'string') {
      this.tabId = id;
      this.emit('tabIdUpdated', id);
    } else this.tabId = null;
  }

  /** @param {boolean} enabled */
  _setIsEnabled(enabled) {
    if (typeof enabled === 'boolean') {
      this.enabled = enabled;
      this.emit('isEnabled', enabled);
    }
  }

  /** @param {boolean} enabled */
  _setNeedRefresh(enabled) {
    if (typeof enabled === 'boolean') {
      this.needRefresh = enabled;
      this.emit('needRefresh', enabled);
    }
  }

  waitInit() {
    return new Promise((resolve, reject) => {
      if (this.initialized) resolve(true);
      else setTimeout(() => this.waitInit().then(resolve).catch(reject), 100);
    });
  }

  getTabs() {
    return this.tabs;
  }

  /** @param {string} id */
  getTab(id) {
    return this.tabs.find((item) => item.id === id);
  }

  getTabId() {
    return this.tabId;
  }

  isEnabled() {
    return this.enabled;
  }

  getDisplayMode() {
    return worker.displayMode;
  }

  clearFetchCache() {
    return worker.emitMessage('CLEAR_FETCH_CACHE');
  }
}

/** Shared PWA state. */
export const tinyPwa = new TinyPwa();

/**
 * The service worker manager.
 *
 * `TinyServiceWorker` handles the registration, the version check, the update
 * prompt and the display-mode detection.
 */
export const worker = new TinyServiceWorker({
  id: 'pony-driland',
  swUrl: '/service-worker.js',
  version: String(window.fileVersion ?? '1').replace(/^\?v=/, ''),
});

// `TinyServiceWorker` emits these lifecycle events at runtime, but they are not
// part of the public `TinyDebuggerEvents` map, so the emitter is widened here.
const swEvents = /** @type {import('events').EventEmitter} */ (/** @type {unknown} */ (worker));

swEvents.on('sw:VersionUpdateAvailable', () => tinyPwa._setNeedRefresh(true));
swEvents.on('sw:NewVersionReady', () => tinyPwa._setNeedRefresh(true));

/**
 * Registers the service worker and wires the PWA state into the UI.
 *
 * @returns {void}
 */
function installPWA() {
  worker
    // The service worker is bundled as an ES module (it imports the
    // `TinyServiceWorkerEngine`), so the browser has to load it as one.
    //
    // `updateViaCache: 'none'` keeps the development build honest: the worker
    // and its imports are always revalidated instead of being read from the
    // HTTP cache, which would keep an old build alive after a reload.
    .register({ scope: '/', type: 'module', updateViaCache: isDev ? 'none' : 'imports' })
    .then(() => {
      tinyPwa._setIsEnabled(!worker.isFailed);
    })
    .catch((err) => {
      console.log('[PWA] Service Worker Failed to Register.');
      console.error(err);
    })
    .finally(() => tinyPwa._init());
}

const initDom = new TinyDomReadyManager();

initDom.onReady(() => {
  const displayMode = worker.displayMode;
  console.log(`[PWA] This is running as ${displayMode}.`);
  body.addClass(`window-${displayMode}`);
  tinyPwa.emit('displayMode', displayMode);
});

export const vanillaPwa = {
  /**
   * Sends a message to the active Service Worker controller.
   *
   * @param {{ type: string, data?: unknown }} data - The message payload.
   * @returns {boolean} `true` when the message was sent.
   */
  postMessage: (data) => {
    if (!data || typeof data !== 'object') {
      throw new TypeError('The data parameter must be a valid object.');
    }
    if (!worker.isSwAvailable) return false;
    worker.postMessage(data);
    return true;
  },
  getDisplayMode: () => worker.displayMode,
  isUsing: () => tinyPwa.enabled,
  clearFetch: () => tinyPwa.clearFetchCache(),
  install: installPWA,
};

initDom.init();
