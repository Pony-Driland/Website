import tinyLib from '../files/tinyLib.mjs';

/**
 * Root container that every markdown page is rendered into.
 *
 * @type {import('tiny-essentials/libs/html/TinyHtml').TinyHtmlAny}
 */
export const markdownBase = tinyLib.bs.container('markdown-read');
