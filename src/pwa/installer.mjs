/*
 * PWA controller.
 *
 * Thin wrapper around `TinyServiceWorker`, which owns the registration, the
 * update flow and the display-mode detection. This module only exposes the
 * pieces the UI needs.
 *
 * @module pwa/installer
 */

import TinyServiceWorker from 'tiny-essentials/libs/sw/browser/TinyServiceWorker';
import TinyDomReadyManager from 'tiny-essentials/libs/html/TinyDomReadyManager';
import { body } from '../html/query.mjs';
import { fileVersion } from '../important.mjs';
import isDev from '../dev.mjs';

/**
 * The service worker manager.
 *
 * `TinyServiceWorker` handles the registration, the version check, the update
 * prompt and the display-mode detection.
 */
export const worker = new TinyServiceWorker({
  id: 'pony-driland',
  swUrl: '/service-worker.js',
  version: String(fileVersion ?? '1').replace(/^\?v=/, ''),
});

/**
 * Registers the service worker and wires the PWA state into the UI.
 *
 * @returns {void}
 */
export function installPWA() {
  worker
    // The service worker is bundled as an ES module (it imports the
    // `TinyServiceWorkerEngine`), so the browser has to load it as one.
    //
    // `updateViaCache: 'none'` keeps the development build honest: the worker
    // and its imports are always revalidated instead of being read from the
    // HTTP cache, which would keep an old build alive after a reload.
    .register({ scope: '/', type: 'module', updateViaCache: isDev ? 'none' : 'imports' })
    .catch((err) => {
      console.log('[PWA] Service Worker Failed to Register.');
      console.error(err);
    });
}

const initDom = new TinyDomReadyManager();

initDom.onReady(() => {
  const displayMode = worker.displayMode;
  console.log(`[PWA] This is running as ${displayMode}.`);
  body.addClass(`window-${displayMode}`);
});

initDom.init();
