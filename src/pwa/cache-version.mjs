/*
 * Cache invalidation between builds.
 *
 * The service worker keeps every static asset inside the `pony-driland-v1`
 * bucket. When a new build is deployed the bucket may still hold files from the
 * previous version, which would be served instead of the fresh ones.
 *
 * The build version (see `build/version/index.js`) is stored in the local
 * storage on every visit. As soon as it changes, the whole bucket is dropped so
 * the service worker repopulates it with the files of the current build.
 *
 * @module pwa/cache-version
 */

import { console } from '../dev.mjs';
import { cacheName, version } from '../version.mjs';
import { tinyLs } from '../important.mjs';

/** Local storage key that stores the version of the last visit. */
const VERSION_KEY = 'app-version';

/**
 * Reads the version of the previous visit.
 *
 * @returns {number|null} The stored version, or `null` when it is missing.
 */
function readStoredVersion() {
  try {
    const stored = tinyLs.getNumber(VERSION_KEY);
    return typeof stored === 'number' && Number.isFinite(stored) ? stored : null;
  } catch {
    return null;
  }
}

/**
 * Removes every entry of the service worker cache bucket.
 *
 * @returns {Promise<boolean>} `true` when the bucket was deleted.
 */
async function clearServiceWorkerCache() {
  if (typeof caches === 'undefined') return false;

  try {
    return await caches.delete(cacheName);
  } catch (err) {
    console.error(`[PWA] Failed to clear the "${cacheName}" cache.`, err);
    return false;
  }
}

/**
 * Drops the service worker cache when the build version changed.
 *
 * Must run before the service worker is registered, otherwise the old bucket
 * would be used to answer the requests of the current page load.
 *
 * @returns {Promise<boolean>} `true` when the cache was cleared.
 */
export async function syncCacheVersion() {
  const stored = readStoredVersion();

  // Same build, the cache is still valid.
  if (stored === version) return false;

  const cleared = await clearServiceWorkerCache();
  tinyLs.setNumber(VERSION_KEY, version);

  console.log(
    `[PWA] Version ${stored ?? 'unknown'} -> ${version}. ` +
      (cleared ? `Cache "${cacheName}" cleared.` : 'No cache to clear.'),
  );

  return cleared;
}
