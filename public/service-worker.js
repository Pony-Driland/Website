/*
 * Service worker entry point.
 *
 * The real implementation lives in `src/pwa/service-worker.mjs` and is bundled
 * to `/vendor/service-worker.js`. This file only exists so the worker can be
 * registered from the root scope (a service worker can not control a path above
 * its own location).
 */

import '/vendor/service-worker.js';
