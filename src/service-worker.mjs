/*
 * Service worker entry point.
 *
 * `TinyServiceWorkerEngine` intercepts every **navigation** request and answers
 * it with the SPA shell (`/index.html`), so `TinyRouter` can resolve the route
 * on the client. This is what makes `/characters/amy.html` and
 * `/chapter/1.html` work as deep links: the static HTML files are only used by
 * crawlers and social networks, a real browser always gets the app.
 *
 * @module service-worker
 */

import TinyServiceWorkerEngine from 'tiny-essentials/libs/sw/service/TinyServiceWorkerEngine';
import GlobCachePlugin from 'tiny-essentials/libs/sw/service/plugins/GlobCachePlugin';

/** Cache bucket used by the runtime cache plugin. */
const CACHE_NAME = 'pony-driland-v1';

// Cross-origin requests (analytics, fonts, APIs, ...) must be handled by the
// browser itself. `TinyServiceWorkerEngine` calls `event.respondWith()` for
// every request, which turns a blocked third-party request into an unhandled
// rejection. Stopping the event here keeps those requests untouched.
self.addEventListener('fetch', (/** @type {FetchEvent} */ event) => {
  if (new URL(event.request.url).origin !== self.location.origin) {
    event.stopImmediatePropagation();
  }
});

const engine = new TinyServiceWorkerEngine({
  // Every navigation is answered with the SPA shell. The router resolves the
  // real page on the client.
  spaMode: true,
  fetch: {
    enabled: true,
    router: { enabled: true },
  },
  push: { enabled: false },
  sync: { enabled: false },
  messaging: { enabled: true },
});

// The engine starts every request with `code: 404` and expects a plugin to
// promote it. A navigation must be promoted to `200`, otherwise the shell is
// served with a 404 status and the browser refuses to render it.
//
// Every other same-origin request (`fetch('/readme.html')`, the chapter JSON
// files, the API, ...) must skip the router completely, otherwise the app would
// receive the HTML shell where it expects data.
engine.addFetchGlobalListener('spa-navigation-only', (fetchObj, result) => {
  if (TinyServiceWorkerEngine.isNavigate(fetchObj.request)) {
    result.code = 200;
  } else {
    result.needValidation = false;
  }
});

// Static assets are cached on the fly.
engine.installPlugin(GlobCachePlugin, {
  cacheName: CACHE_NAME,
  patterns: [
    '**/*.{js,css,woff,woff2,ttf,eot,png,jpg,jpeg,gif,svg,webp,avif,mp3,mp4,wav,ogg,opus}',
  ],
  exclude: ['/service-worker.js', '/index.html'],
});

engine.init();

export default engine;
