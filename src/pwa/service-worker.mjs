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

import isDev from '../dev.mjs';

/** Cache bucket used by the runtime cache plugin. */
const CACHE_NAME = 'pony-driland-v1';

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

// This worker only owns the requests of this website. Everything else
// (analytics, fonts, CDNs, third-party APIs, browser extensions, ...) belongs to
// the browser and must never be touched by the engine.
//
// `TinyServiceWorkerEngine` calls `event.respondWith()` for every request it
// accepts, so a cross-origin request would be re-issued by the worker instead of
// being handled natively by the browser. That breaks opaque responses, CORS
// preflights and `no-cors` requests, and it turns a blocked third-party request
// into an unhandled rejection. Setting `canStart` to `false` makes the engine
// return before `respondWith()`, leaving the event completely untouched.
engine.on('fetchRequested', ({ request, result }) => {
  if (!TinyServiceWorkerEngine.isSameOrigin(request)) result.canStart = false;
});

// Serve the static 404 page for every request the router can not answer.
// `spaMode` already answers navigations with `/index.html`, so this only kicks
// in for the requests that fall through (for example a missing asset).
engine.updateGlobalMsgCode({
  404: {
    path: '/404.html',
    msg: 'Not Found',
    logMsg: 'Route not found',
  },
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

if (isDev) {
  // A previous (cached) run may have left files behind. They are dropped so the
  // browser can not answer a request with a build that no longer exists.
  engine.on('beforeActivated', ({ event }) => {
    event.waitUntil(caches.delete(CACHE_NAME));
  });
} else {
  // Static assets are cached on the fly.
  engine.installPlugin(GlobCachePlugin, {
    cacheName: CACHE_NAME,
    patterns: [
      '**/*.{js,css,woff,woff2,ttf,eot,png,jpg,jpeg,gif,svg,webp,avif,mp3,mp4,wav,ogg,opus}',
    ],
    exclude: ['/service-worker.js', '/index.html'],
  });
}

engine.init();

export default engine;
