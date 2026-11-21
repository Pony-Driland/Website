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
import RegisterGlobCachePlugin from 'tiny-essentials/libs/sw/service/plugins/GlobCachePlugin';

import isDev from '../dev.mjs';

/** Cache bucket used by the runtime cache plugin. */
const CACHE_NAME = 'pony-driland-v1';

/**
 * Static assets handled by `RegisterGlobCachePlugin`.
 *
 * Media files are intentionally **not** listed. The Cache API refuses to store
 * a `206 Partial Content` response, and `<audio>`/`<video>` rely on range
 * requests, so caching them made `cache.put()` reject on every seek and kept
 * the whole file in memory for nothing.
 */
const CACHE_PATTERNS = ['**/*.{js,css,woff,woff2,ttf,eot,png,jpg,jpeg,gif,svg,webp,avif,mp3,mp4,wav,ogg,opus}'];

/**
 * Paths that must always be answered by the network.
 *
 * `/service-worker.js` is the worker itself, and `/index.html` is the document
 * the SPA fallback fetches. Letting the router answer them would either loop or
 * replace the shell with the 404 page.
 */
const BYPASS = new Set(['/service-worker.js', '/index.html']);

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

// const console = engine.toConsole();

if (isDev) {
  // A previous (cached) run may have left files behind. They are dropped so the
  // browser can not answer a request with a build that no longer exists.
  engine.on('beforeActivated', ({ event }) => {
    event.waitUntil(caches.delete(CACHE_NAME));
  });
} else {
  // Static assets are cached on the fly.
  engine.installPlugin(RegisterGlobCachePlugin, {
    cacheName: CACHE_NAME,
    patterns: CACHE_PATTERNS,
    exclude: Array.from(BYPASS),
  });
}

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

/**
 * Decides which requests this worker is allowed to answer.
 *
 * `TinyServiceWorkerEngine` calls `event.respondWith()` for every request it
 * accepts and finishes with a bare `fetch(event.request)` when no plugin claims
 * it. That promise has no `catch`, so a single network failure (offline, an
 * aborted navigation, a worker being replaced mid-flight, a `Range` request for
 * a video) rejects the whole `FetchEvent` and the browser reports
 * `TypeError: Failed to fetch` for the navigation.
 *
 * Only the two cases this worker can actually answer are accepted:
 *
 * - **navigations**, answered with the SPA shell;
 * - **static assets**, answered by `RegisterGlobCachePlugin`.
 *
 * Everything else (chapter JSON, the API, cross-origin requests, media) is left
 * completely untouched and handled natively by the browser.
 */
engine.on('fetchRequested', ({ request, url, result }) => {
  if (!TinyServiceWorkerEngine.isSameOrigin(request)) {
    result.canStart = false;
    return;
  }

  if (BYPASS.has(url.pathname)) {
    result.canStart = false;
    return;
  }

  if (TinyServiceWorkerEngine.isNavigate(request)) return;

  result.canStart = false;
});

// The engine starts every request with `code: 404` and expects a plugin to
// promote it. A navigation must be promoted to `200`, otherwise the shell is
// served with a 404 status and the browser refuses to render it.
//
// Every other request that reaches this point is a static asset, which must skip
// the router completely, otherwise the app would receive the HTML shell where it
// expects a script, a stylesheet or an image.
engine.addFetchGlobalListener('spa-navigation-only', (fetchObj, result) => {
  if (TinyServiceWorkerEngine.isNavigate(fetchObj.request)) {
    result.code = 200;
  } else {
    result.needValidation = false;
  }
});

engine.init();

export default engine;
