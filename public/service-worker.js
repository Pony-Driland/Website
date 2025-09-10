/**
 * Helper to get current timestamp
 * @returns {Number}
 */
function now() {
  const d = new Date();
  return d.getTime();
}

/**
 * Checks if the service worker is running on localhost
 * @returns {Boolean}
 */
function isLocalhost() {
  return (
    self.location.hostname === 'localhost' ||
    self.location.hostname === '127.0.0.1' ||
    self.location.hostname === '::1'
  );
}

/**
 * Service worker interepts requests for images
 * It puts retrieved images in cache for 1 day
 * If image not found responds with fallback
 */

const INVALIDATION_INTERVAL = Number(24 * 60 * 60 * 1000) * 31; // 31 days
const NS = 'MAGE';
const SEPARATOR = '|';
const VERSION = Math.ceil(now() / INVALIDATION_INTERVAL);
const OFFLINE_CACHE_NAME = 'offline-v1';
const OFFLINE_URL = '/offline.html';

/**
 * Build cache storage key that includes namespace, url and record version
 * @param {String} url
 * @returns {String}
 */
function buildKey(url) {
  return NS + SEPARATOR + url + SEPARATOR + VERSION;
}

/**
 * The complete Triforce, or one or more components of the Triforce.
 * @typedef {Object} RecordKey
 * @property {String} ns - namespace
 * @property {String} url - request identifier
 * @property {String} ver - record varsion
 */

/**
 * Parse cache key
 * @param {String} key
 * @returns {RecordKey}
 */
function parseKey(key) {
  const parts = key.split(SEPARATOR);
  return {
    ns: parts[0],
    key: parts[1],
    ver: parseInt(parts[2], 10),
  };
}

/**
 * Invalidate records matchinf actual version
 *
 * @param {Cache} cacheStorage
 * @returns {Promise}
 */
function purgeExpiredRecords(cacheStorage) {
  console.log('[PWA] [service-worker] Purging...');
  return cacheStorage.keys().then((keys) =>
    Promise.all(
      keys.map((key) => {
        const record = parseKey(key);
        if (record.ns === NS && record.ver !== VERSION) {
          console.log('[PWA] [service-worker] deleting', key);
          return cacheStorage.delete(key);
        }
      }),
    )
  );
}

/**
 * Handles versioned JavaScript and CSS files from same origin or subdomains.
 * Caches based on version (?v=*) and only updates if version is higher.
 * Removes old cached versions when newer is stored.
 *
 * @param {CacheStorage} cacheStorage
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handleVersionedStatic(cacheStorage, request) {
  const requestURL = new URL(request.url);
  const originURL = new URL(self.location.origin);

  // Only allow same origin or subdomains
  if (
    requestURL.hostname !== originURL.hostname &&
    !requestURL.hostname.endsWith(`.${originURL.hostname}`)
  ) {
    return fetch(request); // cross-origin not allowed
  }

  const versionParam = requestURL.searchParams.get('v');
  const path = requestURL.pathname;

  if (!versionParam || isNaN(versionParam)) {
    return fetch(request); // not versioned
  }

  const incomingVersion = Number(versionParam);
  const versionedCache = await cacheStorage.open('versioned-static');
  const cachedRequests = await versionedCache.keys();

  let outdatedRequest = null;

  for (const cachedReq of cachedRequests) {
    const cachedURL = new URL(cachedReq.url);
    const cachedVersion = Number(cachedURL.searchParams.get('v') || 0);

    if (
      cachedURL.hostname === requestURL.hostname &&
      cachedURL.pathname === path
    ) {
      if (incomingVersion <= cachedVersion) {
        const response = await versionedCache.match(cachedReq);
        if (response) return response; // use cached older version
      } else {
        outdatedRequest = cachedReq; // mark for deletion
      }
    }
  }

  // Fetch the new version
  const networkResponse = await fetch(request);
  if (networkResponse.ok && !isLocalhost()) {
    if (outdatedRequest) await versionedCache.delete(outdatedRequest); // remove old version
    await versionedCache.put(request, networkResponse.clone()); // save new
  }

  return networkResponse;
}

/**
 * Proxy request using cache-first strategy
 *
 * @param {Cache} caches
 * @param {Request} request
 * @returns {Promise}
 */
function proxyRequest(caches, request) {
  const key = buildKey(request.url);
  // set namespace
  if (isLocalhost()) return fetch(request);
  return caches.open(key).then(function (cache) {
    // check cache
    return cache.match(request).then(function (cachedResponse) {
      if (cachedResponse) {
        return cachedResponse;
      }

      // { mode: "no-cors" } gives opaque response
      // https://fetch.spec.whatwg.org/#concept-filtered-response-opaque
      // so we cannot get info about response status
      const resolve = (networkResponse) => {
        if (networkResponse.type !== 'opaque' && networkResponse.ok === false) {
          throw new Error(
            `Resource not available\nType: ${networkResponse.type}\n${networkResponse.statusText}`,
          );
        }

        if (!networkResponse.ok) {
          const err = new Error(`Connection error: ${networkResponse.statusText}`);
          err.requestData = {
            status: networkResponse.status,
            statusText: networkResponse.statusText,
            type: networkResponse.type,
            redirected: networkResponse.redirected,
            headers: networkResponse.headers,
          };
          throw err;
        }
        console.info(
          '[PWA] [service-worker] Fetch it through Network',
          request.url,
          networkResponse.type,
        );
        if (!isLocalhost())
          cache.put(request, networkResponse.clone());
        return networkResponse;
      };

      return fetch(request.clone()).then(resolve).catch((err) => {
        if (request.mode === 'navigate') {
          caches.open(OFFLINE_CACHE_NAME).then((cache) => cache.match(OFFLINE_URL));
          return;
        }
        return err;
      });
    });
  });
}

self.addEventListener('install', function (event) {
  if (isLocalhost()) {
    console.warn('[PWA] [service-worker] Install on localhost, skipping offline cache.');
    event.waitUntil(self.skipWaiting());
  } else
    event.waitUntil(
      Promise.all([
        self.skipWaiting(),
        caches.open(OFFLINE_CACHE_NAME).then(cache => cache.add(OFFLINE_URL)),
      ])
    );
});

self.addEventListener('activate', function (event) {
  if (isLocalhost()) {
    console.warn('[PWA] [service-worker] Localhost detected, clearing all caches...');
    event.waitUntil(
      Promise.all([
        self.clients.claim(),
        caches.keys().then((keys) =>
          Promise.all(keys.map((key) => caches.delete(key)))
        ),
      ])
    );
  } else {
    event.waitUntil(
      Promise.all([
        self.clients.claim(),
        purgeExpiredRecords(caches),
      ])
    );
  }
});

const canCacheExt = [
  ".mp3",
  ".aac",
  ".ogg",
  ".opus",
  ".wma",
  ".flac",
  ".wav",
  ".m4a",
];
// const versionedExts = [];

self.addEventListener('fetch', function (event) {
  const request = event.request;
  const origin = self?.origin || self.location?.origin;

  /** if (
    request.method === 'GET' &&
    request.url.includes('?v=') &&
    (
      ['script', 'style', 'manifest', 'font'].includes(request.destination) &&
      versionedExts.some(ext => request.url.split('?')[0].endsWith(ext))
    )
  ) {
    event.respondWith(handleVersionedStatic(caches, request));
    return;
  } */

  if (
    request.method !== 'GET' ||
    request.url.startsWith('blob:') ||
    request.url.startsWith('data:') ||
    typeof origin !== 'string' ||
    origin.length < 1
  )
    return;

  const canCache = canCacheExt.some(ext => request.url.endsWith(ext));
  if (!canCache || isLocalhost()) return;
  event.respondWith(proxyRequest(caches, request));
});

const eventTypes = {
  CLEAR_FETCH_CACHE: (event) =>
    event.waitUntil(
      caches.keys().then(function (cacheNames) {
        return Promise.all(
          cacheNames.map(function (cacheName) {
            return caches.delete(cacheName);
          }),
        );
      }),
    ),
};

self.addEventListener('message', (event) => {
  if (event.data && typeof eventTypes[event.data.type] === 'function')
    eventTypes[event.data.type](event);
});
