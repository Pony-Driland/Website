/*
 * Client side router.
 *
 * `TinyRouter` is the single source of truth for the URL <-> page mapping.
 *
 * The legacy `?path=` URLs are still accepted, but they are immediately
 * replaced by the canonical URL through `history.replaceState`, so the address
 * bar never keeps a legacy URL around.
 *
 * @module router
 */

import TinyRouter from 'tiny-essentials/libs/router/TinyRouter';
import {
  AI_PATH,
  CHAPTER_BASE,
  CHARACTER_BASE,
  MARKDOWN_PAGES,
  READ_FIC_PATH,
  buildUrl,
  getCharacterByPath,
  getCharacterBySlug,
  resolveMarkdownSlug,
} from './pages.mjs';

/**
 * @typedef {import('./pages.mjs').RouterPage} RouterPage
 */

/**
 * @callback RouterPageHandler
 * @param {RouterPage} page - Page resolved from the current URL.
 * @returns {void|Promise<void>}
 */

/** @type {TinyRouter|null} */
let router = null;

/** @type {RouterPageHandler} */
let pageHandler = () => {};

/**
 * `true` while the router is rendering a page, so the page itself does not
 * push a new history entry.
 *
 * @type {boolean}
 */
let silent = false;

/**
 * Reads the query string of a match as a plain object.
 *
 * @param {URLSearchParams} search - Query string of the current URL.
 * @returns {Record<string, string>}
 */
const queryToObject = (search) => {
  /** @type {Record<string, string>} */
  const query = {};
  search.forEach((value, key) => {
    if (key !== 'path') query[key] = value;
  });
  return query;
};

/**
 * Checks if the browser is already on the given URL.
 *
 * @param {string} url - URL to compare.
 * @returns {boolean}
 */
const isCurrentUrl = (url) => {
  const target = new URL(url, location.origin);
  if (target.pathname !== location.pathname) return false;
  return target.search === location.search;
};

/**
 * Writes a page to the browser history.
 *
 * @param {RouterPage} page - Page being rendered.
 * @param {boolean} [replace=false] - Replace the current entry instead of pushing a new one.
 * @returns {boolean} `true` when the URL changed.
 */
export const updateUrl = (page, replace = false) => {
  const url = buildUrl(page);
  if (silent || isCurrentUrl(url)) return false;

  const state = { pageTitle: page.title };
  if (replace) window.history.replaceState(state, '', url);
  else window.history.pushState(state, '', url);
  return true;
};

/**
 * Resolves a legacy `?path=` query into a page.
 *
 * @param {URLSearchParams} search - Query string of the current URL.
 * @returns {RouterPage}
 */
const resolveQueryPage = (search) => {
  const path = search.get('path') ?? '';
  const query = queryToObject(search);

  if (path === 'read-fic') return { name: 'read-fic', title: 'Read Fic', query };
  if (path === 'ai') return { name: 'ai', title: 'AI Page', query };
  if (path.length < 1) return { name: 'home', query };

  const character = getCharacterByPath(path);
  if (character) return { name: 'character', slug: character.slug, title: character.title, query };

  const markdown = MARKDOWN_PAGES.find((page) => page.path === path);
  return { name: 'markdown', path, title: markdown?.title, query };
};

/**
 * Renders a page without letting the page push a new history entry.
 *
 * @param {RouterPage} page - Page to render.
 * @returns {Promise<void>}
 */
const render = async (page) => {
  const previous = silent;
  silent = true;
  try {
    await pageHandler(page);
  } finally {
    silent = previous;
  }
};

/**
 * Renders a page and rewrites the URL to its canonical form.
 *
 * Used by the legacy `?path=` URLs: the page is rendered as usual and the
 * address bar is updated with `replaceState`, so the legacy URL never comes
 * back when the user navigates.
 *
 * @param {RouterPage} page - Page to render.
 * @returns {Promise<void>}
 */
const redirect = async (page) => {
  await render(page);
  updateUrl(page, true);
};

/**
 * Builds a route definition for a pattern that ends in `.html`.
 *
 * The default `:param` extractor is greedy, so `:slug.html` would capture
 * `amy.html` as the parameter value. This definition stops at the first
 * non-identifier character, keeping the `.html` suffix out of the value.
 *
 * @param {string} pattern - Route pattern (ex: `/characters/:slug.html`).
 * @returns {{ pattern: string, searchValue: RegExp, replaceValue: (paramNames: string[], match: string, paramName: string) => string, errorConfig: { pathPatternErrorMsg: string } }}
 */
const HTML_ROUTE = (pattern) => ({
  pattern,
  searchValue: /:([a-zA-Z0-9_]+)/g,
  replaceValue: (paramNames, _match, paramName) => {
    paramNames.push(paramName);
    return '([^/]+)';
  },
  errorConfig: { pathPatternErrorMsg: 'The route pattern must be a string.' },
});

/**
 * Registers every route of the website.
 *
 * @param {TinyRouter} instance - Router instance.
 * @returns {void}
 */
const registerRoutes = (instance) => {
  // Home. Also the entry point of the legacy `?path=` URLs, which are
  // redirected to their canonical URL right after being rendered.
  instance.add('/', (match) => {
    const page = resolveQueryPage(match.query);
    return page.name === 'home' ? render(page) : redirect(page);
  });

  // Chapter reader.
  instance.add(READ_FIC_PATH, (match) =>
    render({ name: 'read-fic', title: 'Read Fic', query: queryToObject(match.query) }),
  );

  // AI page.
  instance.add(AI_PATH, (match) =>
    render({ name: 'ai', title: 'AI Page', query: queryToObject(match.query) }),
  );

  // Character pages (`/characters/amy.html`).
  //
  // The default `:param` extractor is greedy, so `:slug.html` would capture
  // `amy.html` as the parameter value. The explicit `searchValue` below stops
  // at the first non-identifier character, keeping the `.html` suffix out of
  // the captured value.
  instance.add(HTML_ROUTE(`${CHARACTER_BASE}/:slug.html`), (match) => {
    const character = getCharacterBySlug(match.params.slug);
    if (!character) return render({ name: 'home' });
    return render({
      name: 'character',
      slug: character.slug,
      title: character.title,
      query: queryToObject(match.query),
    });
  });

  // Chapter pages (`/chapter/1.html`).
  instance.add(HTML_ROUTE(`${CHAPTER_BASE}/:chapter.html`), (match) =>
    render({
      name: 'chapter',
      chapter: Number(match.params.chapter),
      query: queryToObject(match.query),
    }),
  );

  // Pretty markdown pages (`/license`, `/privacy`, ...).
  for (const page of MARKDOWN_PAGES) {
    instance.add(`/${page.slug}`, (match) =>
      render({
        name: 'markdown',
        path: page.path,
        title: page.title,
        query: queryToObject(match.query),
      }),
    );
  }

  // Any other markdown file, reached through its own path
  // (`/pages/museum` -> `/pages/museum.md`). Registered last so the routes
  // above always win.
  instance.add(
    {
      pattern: '/*',
      searchValue: /\*/,
      replaceValue: (paramNames) => {
        paramNames.push('slug');
        return '(.+)';
      },
      errorConfig: { pathPatternErrorMsg: 'The route pattern must be a string.' },
    },
    (match) => {
      const path = resolveMarkdownSlug(match.params.slug);
      if (!path) return render({ name: 'not-found' });
      return render({ name: 'markdown', path, query: queryToObject(match.query) });
    },
  );
};

/**
 * Starts the router and renders the page of the current URL.
 *
 * @param {RouterPageHandler} handler - Renders a page.
 * @returns {Promise<void>}
 */
export const startRouter = async (handler) => {
  pageHandler = handler;
  if (router) return;

  router = new TinyRouter({
    onRouteNotFound: (match) => {
      console.warn(`[router] No route matched "${match.path}".`);
      return render({ name: 'not-found' });
    },
  });

  registerRoutes(router);
  await router.start();
};

/**
 * Stops the router and releases the registered routes.
 *
 * @returns {void}
 */
export const stopRouter = () => {
  if (!router) return;
  router.destroy();
  router = null;
};
