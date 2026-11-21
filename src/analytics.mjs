/*
 * Google Analytics 4.
 *
 * The website is a single page application: the document is downloaded once and
 * every navigation after that is handled by `TinyRouter`, which rewrites the
 * URL with `history.pushState()`. Google Analytics only reports the document it
 * was loaded with, so every route change has to be reported by hand through
 * {@link trackPageView}. Without it the whole report collapses into a single
 * entry (`/`) and the chapter reader, the character pages and the AI page are
 * invisible.
 *
 * Every helper is a no-op when the measurement id is missing or when the app is
 * running on a development host, so callers never need to guard the calls.
 *
 * @module analytics
 */

import storyCfg from './chapters/config.mjs';
import isDev from './dev.mjs';
import { buildUrl } from './router/pages.mjs';

/** Measurement id of the property. */
const MEASUREMENT_ID = typeof storyCfg.gtag === 'string' ? storyCfg.gtag : '';

/**
 * `true` when the events are actually collected.
 *
 * The development server is excluded on purpose: `localhost` traffic would
 * otherwise pollute the production reports.
 *
 * @type {boolean}
 */
export const analyticsEnabled = MEASUREMENT_ID.length > 0 && !isDev;

/**
 * Queue read by gtag.js.
 *
 * It is created here (and not only in the HTML) so the events fired before the
 * library finishes loading are not lost.
 *
 * @type {any[]}
 */
window.dataLayer = window.dataLayer || [];

/**
 * Path of the last reported page view.
 *
 * @type {string|null}
 */
let lastPagePath = null;

/**
 * Events that must be reported only once per session.
 *
 * @type {Set<string>}
 */
const sentOnce = new Set();

/** Reading milestones reported by the chapter reader, from the highest. */
const CHAPTER_MILESTONES = [100, 75, 50, 25];

/**
 * Number of lines of each chapter, cached by the chapter data object.
 *
 * `trackChapterProgress()` runs on every scroll, so the lines can not be
 * counted again on each call. The cache is keyed by the data itself, so it is
 * released together with the chapter.
 *
 * @type {WeakMap<object, number>}
 */
const chapterSizes = new WeakMap();

/** Extensions that are reported as a download instead of an outbound link. */
const DOWNLOAD_EXTENSIONS =
  /\.(?:pdf|zip|rar|7z|tar|gz|epub|cbz|cbr|txt|json|md|mp3|wav|ogg|opus|mp4|webm)$/i;

/**
 * Pushes a command to the gtag.js queue.
 *
 * @param {...any} args - gtag.js command (`'js'`, `'config'`, `'event'`, ...).
 * @returns {void}
 */
export function gtag(...args) {
  if (!analyticsEnabled) return;
  window.dataLayer.push(args);
}

/**
 * Current path, including the query string.
 *
 * @returns {string}
 */
const currentPath = () => `${location.pathname}${location.search}`;

/**
 * Truncates a value to the size Google Analytics accepts.
 *
 * @param {unknown} value - Raw value.
 * @returns {string|number|boolean|undefined} A value accepted by gtag.js.
 */
const sanitizeValue = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'boolean') return value;
  if (value === null || typeof value === 'undefined') return undefined;
  return String(value).slice(0, 100);
};

/**
 * Drops the parameters gtag.js would reject.
 *
 * Google Analytics accepts at most 25 parameters per event and 100 characters
 * per value. Sending more makes the whole event be discarded, so the payload is
 * normalized before it reaches the queue.
 *
 * @param {Record<string, unknown>} params - Raw parameters.
 * @returns {Record<string, string|number|boolean>}
 */
const sanitizeParams = (params) => {
  /** @type {Record<string, string|number|boolean>} */
  const clean = {};
  let count = 0;

  for (const key in params) {
    if (count >= 25) break;
    const value = sanitizeValue(params[key]);
    if (typeof value === 'undefined') continue;
    clean[key] = value;
    count++;
  }

  return clean;
};

/**
 * Configures the property. Must run once, before any other helper.
 *
 * @returns {void}
 */
export const initAnalytics = () => {
  if (!analyticsEnabled) return;

  gtag('js', new Date());
  gtag('config', MEASUREMENT_ID);

  // `config` already reported the document that was just loaded, so the first
  // `trackPageView()` of the same URL is dropped instead of counted twice.
  lastPagePath = currentPath();
};

/**
 * Reports a navigation.
 *
 * @param {import('./router/pages.mjs').RouterPage} [page] - Page that is being
 *   rendered. When omitted the current URL is reported.
 * @returns {void}
 */
export const trackPageView = (page) => {
  if (!analyticsEnabled) return;

  const path = page ? buildUrl({ ...page, query: page.query ?? {} }) : currentPath();
  if (path === lastPagePath) return;
  lastPagePath = path;

  gtag('event', 'page_view', {
    page_path: path,
    page_location: new URL(path, location.origin).href,
    page_title: page?.title || document.title,
  });
};

/**
 * Reports a custom event.
 *
 * @param {string} name - Event name (max 40 characters).
 * @param {Record<string, unknown>} [params] - Event parameters.
 * @returns {void}
 */
export const trackEvent = (name, params = {}) => {
  if (!analyticsEnabled) return;
  gtag('event', String(name).slice(0, 40), sanitizeParams(params));
};

/**
 * Reports a custom event only once per session.
 *
 * @param {string} key - Unique key of the event.
 * @param {string} name - Event name.
 * @param {Record<string, unknown>} [params] - Event parameters.
 * @returns {void}
 */
export const trackEventOnce = (key, name, params) => {
  if (!analyticsEnabled || sentOnce.has(key)) return;
  sentOnce.add(key);
  trackEvent(name, params);
};

/**
 * Reports that a chapter was opened.
 *
 * @param {string|number} [chapter] - Chapter id.
 * @returns {void}
 */
export const trackChapterOpen = (chapter) => {
  const id = Number(chapter);
  if (!Number.isFinite(id) || id < 1) return;
  trackEventOnce(`chapter_open:${id}`, 'chapter_open', { chapter_id: id });
};

/**
 * Reports how far into a chapter the reader is.
 *
 * `scrollData()` runs on every scroll, so the reader only reports the 25, 50,
 * 75 and 100% milestones, and only once each. Reporting every line would burn
 * through the 500 events per session Google Analytics accepts and the rest of
 * the session would be silently dropped.
 *
 * @param {string|number} chapter - Chapter id.
 * @param {number} line - Current line.
 * @param {Record<string, unknown>|null|undefined} lines - Lines of the chapter.
 * @returns {void}
 */
export const trackChapterProgress = (chapter, line, lines) => {
  if (!analyticsEnabled) return;

  const id = Number(chapter);
  const current = Number(line);
  if (!Number.isFinite(id) || id < 1) return;
  if (!lines || typeof lines !== 'object') return;

  let size = chapterSizes.get(lines);
  if (typeof size === 'undefined') {
    size = Object.keys(lines).length;
    chapterSizes.set(lines, size);
  }

  if (!Number.isFinite(current) || size <= 0) return;

  const percent = Math.min(100, Math.floor((current / size) * 100));
  const milestone = CHAPTER_MILESTONES.find((value) => percent >= value);
  if (typeof milestone === 'undefined') return;

  trackEventOnce(`chapter_progress:${id}:${milestone}`, 'chapter_progress', {
    chapter_id: id,
    percent: milestone,
  });
};

/**
 * Reports a page that could not be resolved by the router.
 *
 * @param {string} [path] - Missing path.
 * @returns {void}
 */
export const trackNotFound = (path) => {
  trackEvent('page_not_found', { page_path: path ?? currentPath() });
};

/**
 * Reports a runtime error.
 *
 * @param {unknown} error - Error or message.
 * @param {boolean} [fatal=false] - Whether the page stopped working.
 * @returns {void}
 */
export const trackError = (error, fatal = false) => {
  if (!analyticsEnabled) return;

  const description =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? 'Unknown error');

  gtag('event', 'exception', {
    description: description.slice(0, 150),
    fatal,
  });
};

/**
 * Reports a click that sends the visitor to another website.
 *
 * @param {string} url - Destination.
 * @param {string} [label] - Link text, when there is one.
 * @returns {void}
 */
export const trackOutboundLink = (url, label) => {
  let host = '';
  try {
    host = new URL(url, location.href).host;
  } catch {
    return;
  }

  trackEvent('click', {
    link_url: url,
    link_domain: host,
    link_text: label,
    outbound: true,
  });
};

/**
 * Reports a file download.
 *
 * @param {string} url - File URL.
 * @returns {void}
 */
export const trackDownload = (url) => {
  const name = url.split('/').pop() ?? url;
  trackEvent('file_download', {
    file_name: name,
    file_extension: name.includes('.') ? name.split('.').pop() : undefined,
    link_url: url,
  });
};

/**
 * Installs the global listeners (outbound links, downloads and errors).
 *
 * @returns {void}
 */
export const installAnalyticsListeners = () => {
  if (!analyticsEnabled) return;

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;

      // `download` is set by the browser on same origin files, and the
      // extension check catches the files served by the CDN.
      const href = anchor.getAttribute('href') ?? '';
      if (!href || href.startsWith('#') || href.startsWith('mailto:')) return;

      if (anchor.hasAttribute('download') || DOWNLOAD_EXTENSIONS.test(anchor.pathname)) {
        trackDownload(anchor.href);
        return;
      }
    },
    true,
  );
};
