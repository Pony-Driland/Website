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
import GlobBypassPlugin from 'tiny-essentials/libs/sw/service/plugins/GlobBypassPlugin';

import isDev from '../dev.mjs';
import { cacheName } from '../version.mjs';

/** Cache bucket used by the runtime cache plugin. */
const CACHE_NAME = cacheName;

/**
 * Static assets.
 *
 * Media files are intentionally **not** listed. The Cache API refuses to store
 * a `206 Partial Content` response, and `<audio>`/`<video>` rely on range
 * requests, so caching them made `cache.put()` reject on every seek and kept
 * the whole file in memory for nothing.
 */
const CACHE_PATTERNS = [
  '**/*.{js,css,woff,woff2,ttf,eot,png,jpg,jpeg,gif,svg,webp,avif,mp3,mp4,wav,ogg,opus}',
];

/**
 * Paths that must always be answered by the network.
 *
 * `/service-worker.js` is the worker itself, and `/index.html` is the document
 * the SPA fallback fetches. Letting the router answer them would either loop or
 * replace the shell with the 404 page.
 */
const BYPASS = ['/service-worker.js', '/index.html'];

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

/** @type {string[]} */
let bypassPatterns;

if (isDev) {
  // A previous (cached) run may have left files behind. They are dropped so the
  // browser can not answer a request with a build that no longer exists.
  engine.on('beforeActivated', ({ event }) => {
    event.waitUntil(caches.delete(CACHE_NAME));
  });
  bypassPatterns = [...BYPASS, ...CACHE_PATTERNS];
} else {
  // Static assets are cached on the fly.
  engine.installPlugin(RegisterGlobCachePlugin, {
    cacheName: CACHE_NAME,
    patterns: CACHE_PATTERNS,
    exclude: BYPASS,
  });
  bypassPatterns = BYPASS;
}

engine.installPlugin(GlobBypassPlugin, {
  patterns: bypassPatterns,
});

engine.on('fetchRequested', ({ request, url, result }) => {
  if (!TinyServiceWorkerEngine.isSameOrigin(request)) {
    result.canStart = false;
    return;
  }

  if (TinyServiceWorkerEngine.isNavigate(request)) return;

  result.canStart = false;
});

/**
 * The engine starts every request with `code: 404` and expects a plugin to
 * promote it. A navigation must be promoted to `200`, otherwise the shell is
 * served with a 404 status and the browser refuses to render it.
 *
 * Every other request that reaches this point is a static asset, which must skip
 * the router completely, otherwise the app would receive the HTML shell where it
 * expects a script, a stylesheet or an image.
 */
engine.addFetchGlobalListener('spa-navigation-only', (fetchObj, result) => {
  if (TinyServiceWorkerEngine.isNavigate(fetchObj.request)) {
    result.code = 200;
  } else {
    result.needValidation = false;
  }
});

engine.init();

export default engine;
