import { storyData } from './files/chapters.mjs';
import { isNoNsfw, tinyLs } from './important.mjs';

/**
 * Shared mature content filter helpers.
 *
 * The chapter reader stores one boolean per filter in the local storage using the
 * `NSFW<key>` naming (see `storyCfg.nsfw` in `src/chapters/config.mjs`). The
 * markdown extensions reuse the exact same storage, so a reader that enabled a
 * filter inside the reader also unlocks the matching markdown blocks and the
 * other way around.
 *
 * @module nsfw
 */

/**
 * Lists every mature content filter used by the loaded chapters.
 *
 * @returns {string[]} The filter keys, in the order they are found.
 */
export const getFicNsfwFilters = () => {
  /** @type {string[]} */
  const keys = [];

  for (const fic in storyData.data) {
    for (const item in storyData.data[fic]) {
      const nsfw = storyData.data[fic][item].nsfw;
      if (!Array.isArray(nsfw)) continue;

      for (const key of nsfw) {
        if (typeof key === 'string' && !keys.includes(key)) keys.push(key);
      }
    }
  }

  return keys;
};

/** Prefix of the localStorage entry that stores a mature content filter. */
export const NSFW_STORAGE_PREFIX = 'NSFW';

/** Event fired on `window` whenever a filter changes. */
export const NSFW_CHANGE_EVENT = 'nsfw-filter-change';

/**
 * Notifies the listeners that a mature content filter changed.
 *
 * @returns {void}
 */
export const notifyNsfwChange = () => {
  window.dispatchEvent(new CustomEvent(NSFW_CHANGE_EVENT));
};

/** Tokens that always match, used to declare a fallback branch. */
const FALLBACK_TOKENS = ['default', '*'];

/** Every filter referenced by the page that is currently rendered. */
const usedFilters = new Set();

/**
 * Splits a filter expression into its tokens.
 *
 * @param {string} [raw] - Expression such as `vore, !questionable`.
 * @returns {string[]} The individual tokens.
 */
export const parseNsfwExpression = (raw) =>
  String(raw ?? '')
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

/**
 * Checks whether a single mature content filter is enabled.
 *
 * The age/region gate always wins: when the visitor still has to prove the age
 * every filter is reported as disabled, so no mature content can leak through a
 * markdown page.
 *
 * @param {string} key - Filter key (`vore`, `questionable`, ...).
 * @returns {boolean} `true` when the reader enabled the filter.
 */
export const isNsfwFilterEnabled = (key) => {
  if (typeof key !== 'string' || key.length === 0) return false;
  if (isNoNsfw()) return false;
  return tinyLs.getBool(NSFW_STORAGE_PREFIX + key) === true;
};

/**
 * Remembers every filter used by the rendered page.
 *
 * The settings dialog reads this list so a filter that only exists inside a
 * markdown page can still be toggled by the reader.
 *
 * @param {string} [raw] - Filter expression.
 * @returns {string[]} The keys that were registered.
 */
export const registerNsfwFilterExpression = (raw) => {
  const keys = parseNsfwExpression(raw)
    .map((token) => (token.startsWith('!') ? token.slice(1) : token))
    .filter((token) => token.length > 0 && !FALLBACK_TOKENS.includes(token));

  keys.forEach((key) => usedFilters.add(key));
  return keys;
};

/**
 * Lists every mature content filter referenced by the rendered page.
 *
 * @returns {string[]} The filter keys, in registration order.
 */
export const getUsedNsfwFilters = () => Array.from(usedFilters);

/**
 * Checks whether a filter expression matches the current reader settings.
 *
 * - An empty expression is a fallback branch and always matches.
 * - `default` and `*` are no-op tokens, so they can be used to document a
 *   fallback branch.
 * - A `!` prefix inverts the check (`!vore` matches while `vore` is disabled).
 * - Every token must match, so `vore, !questionable` requires the first filter
 *   and the absence of the second one.
 *
 * @param {string} [raw] - Filter expression.
 * @returns {boolean} `true` when the branch must be rendered.
 */
export const matchesNsfwExpression = (raw) => {
  const tokens = parseNsfwExpression(raw);
  if (tokens.length === 0) return true;

  return tokens.every((token) => {
    if (FALLBACK_TOKENS.includes(token)) return true;
    if (token.startsWith('!')) return !isNsfwFilterEnabled(token.slice(1));
    return isNsfwFilterEnabled(token);
  });
};

/**
 * Checks whether an expression only holds fallback tokens.
 *
 * Fallback branches are the ones rendered when no filter matches, so they are
 * also the branches that must be shown when the reader has no filter enabled.
 *
 * @param {string} [raw] - Filter expression.
 * @returns {boolean} `true` when the expression is a fallback.
 */
export const isFallbackNsfwExpression = (raw) => {
  const tokens = parseNsfwExpression(raw);
  return tokens.length > 0 && tokens.every((token) => FALLBACK_TOKENS.includes(token));
};
