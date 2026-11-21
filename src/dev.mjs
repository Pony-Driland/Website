/*
 * Development environment detection.
 *
 * The development server (`npm start`) always serves the app from `localhost`
 * on a custom port, while the production build is served from a real domain on
 * the default port. Detecting it at runtime (instead of through a build-time
 * constant) keeps the check working in the page bundle and in the service
 * worker, which has no access to the page URL.
 *
 * @module dev
 */

/** Hostnames that only exist on a development machine. */
const DEV_HOSTNAMES = ['localhost', '127.0.0.1', '[::1]', '0.0.0.0'];

/**
 * `true` when the app is being served by the development server.
 *
 * @type {boolean}
 */
const isDev = (() => {
  if (typeof location === 'undefined') return false;
  return DEV_HOSTNAMES.includes(location.hostname) || location.port !== '';
})();

if (isDev) {
  console.log('[DEV MODE] Enabled!');
}

export default isDev;
