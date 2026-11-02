/**
 * Cached TinyHtml wrappers around the singleton DOM nodes declared in
 * `index.html`.
 *
 * Importing these avoids re-querying the document on every render.
 *
 * @module html/query
 */

import TinyHtml from 'tiny-essentials/libs/html/TinyHtml';

export const tinyWin = new TinyHtml(window);

// Base
export const body = new TinyHtml('body');
export const head = new TinyHtml('head');
export const topPage = new TinyHtml('#top_page');
export const newUrl = new TinyHtml('#newURL');
export const app = new TinyHtml('#app');
