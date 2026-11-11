/*
 * Page registry.
 *
 * Every page of the website is described here exactly once. Both directions of
 * the routing (URL -> page and page -> URL) are derived from this module, so a
 * new page only has to be registered in a single place.
 *
 * URL scheme
 * ----------
 * | page      | URL                        |
 * | --------- | -------------------------- |
 * | home      | `/`                        |
 * | markdown  | `/<slug>`                  |
 * | read-fic  | `/read-fic`                |
 * | ai        | `/ai`                      |
 * | character | `/characters/<slug>.html`  |
 * | chapter   | `/chapter/<id>.html`       |
 *
 * The `.html` suffix is intentional: character and chapter URLs are the ones
 * shared on social networks, so they keep a static looking path. The service
 * worker answers them with the SPA shell.
 *
 * @module router/pages
 */

import storyCfg from '../chapters/config.mjs';

/**
 * @typedef {'home'|'markdown'|'read-fic'|'ai'|'character'|'chapter'} PageName
 */

/**
 * A page resolved from the current URL.
 *
 * @typedef {Object} RouterPage
 * @property {PageName} name - Page kind.
 * @property {string} [path] - Markdown file of a `markdown` page.
 * @property {string} [slug] - Character slug of a `character` page.
 * @property {number} [chapter] - Chapter id of a `chapter` page.
 * @property {string} [title] - Document title.
 * @property {Record<string, string>} [query] - Extra query string values.
 */

/** Route of the chapter reader. */
export const READ_FIC_PATH = '/read-fic';

/** Route of the AI page. */
export const AI_PATH = '/ai';

/** Base path of the character pages. */
export const CHARACTER_BASE = '/characters';

/** Base path of the chapter pages. */
export const CHAPTER_BASE = '/chapter';

/**
 * Markdown pages that are reachable through a pretty URL.
 *
 * @type {ReadonlyArray<{ slug: string, path: string, title?: string }>}
 */
export const MARKDOWN_PAGES = Object.freeze([
  { slug: 'license', path: '/LICENSE.md', title: 'License' },
  { slug: 'privacy', path: '/PRIVACY.md', title: 'Privacy Policy' },
  { slug: 'museum', path: '/pages/museum.md', title: 'Museum' },
  { slug: 'artist-tips', path: '/pages/artistTips.md', title: 'Artist Tips' },
  { slug: 'ai-models', path: '/pages/ai-templates/ai-models.md', title: 'AI Models' },
]);

/**
 * Returns the character entry registered for a markdown path.
 *
 * @param {string} path - Markdown file path.
 * @returns {{ slug: string, path: string, url: string, title?: string }|undefined}
 */
export const getCharacterByPath = (path) => {
  const custom = storyCfg.custom_url?.[path];
  if (!custom || typeof custom.url !== 'string') return undefined;
  const prefix = `${CHARACTER_BASE}/`;
  if (!custom.url.startsWith(prefix) || !custom.url.endsWith('.html')) return undefined;
  const slug = custom.url.slice(prefix.length, -'.html'.length);
  if (slug.length < 1) return undefined;
  return { slug, path, url: custom.url, title: custom.title };
};

/**
 * Returns the character entry registered for a slug.
 *
 * @param {string} slug - Character slug (ex: `amy`).
 * @returns {{ slug: string, path: string, url: string, title?: string }|undefined}
 */
export const getCharacterBySlug = (slug) => {
  const customUrl = storyCfg.custom_url ?? {};
  for (const path in customUrl) {
    const custom = customUrl[path];
    if (custom.url === `${CHARACTER_BASE}/${slug}.html`) {
      return { slug, path, url: custom.url, title: custom.title };
    }
  }
  return undefined;
};

/**
 * Returns the markdown page registered for a slug.
 *
 * @param {string} slug - Page slug (ex: `license`).
 * @returns {{ slug: string, path: string, title?: string }|undefined}
 */
export const getMarkdownBySlug = (slug) => MARKDOWN_PAGES.find((page) => page.slug === slug);

/**
 * Resolves the markdown file of a page.
 *
 * @param {RouterPage} page - Page to resolve.
 * @returns {string|undefined}
 */
export const getPagePath = (page) => {
  if (page.name === 'character') return getCharacterBySlug(page.slug ?? '')?.path;
  return page.path;
};

/**
 * Returns the markdown page registered for a file path.
 *
 * @param {string} path - Markdown file path (ex: `/LICENSE.md`).
 * @returns {{ slug: string, path: string, title?: string }|undefined}
 */
export const getMarkdownByPath = (path) => MARKDOWN_PAGES.find((page) => page.path === path);

/**
 * Resolves a pretty markdown URL back to the markdown file path.
 *
 * Markdown pages that are not listed in {@link MARKDOWN_PAGES} use their own
 * file path as the URL, without the `.md` extension (`/pages/museum` for
 * `/pages/museum.md`). This reverses that mapping.
 *
 * @param {string} slug - URL path without the leading slash (ex: `pages/museum`).
 * @returns {string|undefined} The markdown file path, or `undefined` when the
 *   slug can not be a markdown page.
 */
export const resolveMarkdownSlug = (slug) => {
  if (typeof slug !== 'string') return undefined;

  // Reject anything that could escape the site root.
  if (slug.length < 1 || slug.includes('..') || slug.startsWith('.')) return undefined;

  // Already a markdown path (`/pages/museum.md`).
  if (/.md$/i.test(slug)) return `/${slug}`;

  // A known page keeps its registered path.
  const known = MARKDOWN_PAGES.find((page) => page.slug === slug);
  if (known) return known.path;

  // Anything else is a markdown file served from its own path.
  return `/${slug}.md`;
};

/**
 * Builds the pathname of a page.
 *
 * @param {RouterPage} page - Page to serialize.
 * @returns {string}
 */
const buildPath = (page) => {
  switch (page.name) {
    case 'read-fic':
      return READ_FIC_PATH;
    case 'ai':
      return AI_PATH;
    case 'chapter':
      return `${CHAPTER_BASE}/${page.chapter}.html`;
    case 'character':
      return `${CHARACTER_BASE}/${page.slug}.html`;
    case 'markdown': {
      const known = page.path ? getMarkdownByPath(page.path) : undefined;
      if (known) return `/${known.slug}`;
      return `/${(page.path ?? '').replace(/^\//, '').replace(/\.md$/i, '')}`;
    }
    default:
      return '/';
  }
};

/**
 * Serializes a page into a public URL, including its query string.
 *
 * @param {RouterPage} page - Page to serialize.
 * @returns {string}
 */
export const buildUrl = (page) => {
  const params = new URLSearchParams();
  for (const key in page.query) {
    const value = page.query[key];
    if (typeof value !== 'undefined' && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }

  const path = buildPath(page);
  const search = params.toString();
  return search ? `${path}?${search}` : path;
};
