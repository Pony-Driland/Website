import TinyHtml from 'tiny-essentials/libs/html/TinyHtml';
import TinyHtmlElems from 'tiny-essentials/libs/html/TinyHtmlElems';

import storyCfg from './chapters/config.mjs';
import { fa, isNoNsfw, tinyLs } from './important.mjs';
import tinyLib from './files/tinyLib.mjs';
import { Tooltip } from './modules/TinyBootstrap.mjs';
import { getUsedNsfwFilters, notifyNsfwChange, NSFW_STORAGE_PREFIX } from './nsfw.mjs';

const { Icon } = TinyHtmlElems;

/**
 * Mature content settings dialog.
 *
 * The dialog is shared by the chapter reader and by the markdown pages, so a
 * filter can be toggled from anywhere without leaving the current page.
 *
 * @module nsfw-settings
 */

/**
 * Returns the configuration of a filter, creating a placeholder for the filters
 * that are only declared inside a markdown page.
 *
 * @param {string} key - Filter key.
 * @returns {StoryNsfwEntry} The filter configuration.
 */
const getFilterConfig = (key) =>
  storyCfg.nsfw[key] ?? {
    size: 6,
    aiMsg: false,
    name: key,
    description: 'This content is only available on some pages of this website.',
  };

/**
 * Lists every filter that can be toggled on the current page.
 *
 * @param {string[]} [extra=[]] - Extra keys discovered by the caller.
 * @returns {string[]} The filter keys, without duplicates.
 */
export const listNsfwFilters = (extra = []) => {
  const keys = new Set([...Object.keys(storyCfg.nsfw ?? {}), ...getUsedNsfwFilters(), ...extra]);
  return Array.from(keys).filter((key) => typeof key === 'string' && key.length > 0);
};

/**
 * Builds a single filter card.
 *
 * @param {string} key - Filter key.
 * @returns {import('tiny-essentials/libs/html/TinyHtml').default<HTMLElement>} The card column.
 */
const buildFilterCard = (key) => {
  const config = getFilterConfig(key);
  let value = tinyLs.getBool(NSFW_STORAGE_PREFIX + key) === true;

  const button = tinyLib.bs.button(value ? 'danger' : 'success');
  button.setText(value ? 'Disable' : 'Enable');

  button.on('click', () => {
    value = !value;
    tinyLs.setBool(NSFW_STORAGE_PREFIX + key, value);
    button.removeClass('btn-danger').removeClass('btn-success');
    button.addClass(value ? 'btn-danger' : 'btn-success');
    button.setText(value ? 'Disable' : 'Enable');

    // Every page listening to the filters must re-render its blocks.
    notifyNsfwChange();
  });

  return TinyHtml.createFrom('div', { class: `col-sm-${config.size ?? 6}` }).append(
    TinyHtml.createFrom('div', { class: 'card h-100' }).append(
      TinyHtml.createFrom('div', { class: 'card-body' }).append(
        TinyHtml.createFrom('h5', { class: 'card-title' }).setText(config.name),
        TinyHtml.createFrom('p', {
          class: `card-text small${config.aiMsg ? ' made-by-ai' : ''}`,
        }).setText(config.description),
        button,
      ),
    ),
  );
};

/**
 * Builds the body of the mature content dialog.
 *
 * @param {string[]} [extra=[]] - Extra filter keys to display.
 * @returns {import('tiny-essentials/libs/html/TinyHtml').default<HTMLElement>} The dialog body.
 */
export const buildNsfwSettings = (extra = []) => {
  const keys = listNsfwFilters(extra);
  const body = TinyHtml.createFrom('center');

  body.append(
    TinyHtml.createFrom('p', { class: 'text-danger made-by-ai' }).setText(
      "Don't expect any explicit 18+ content here. The mature themes are not graphic and are only used to add depth to the story — for example, to make certain scenes feel more realistic. By enabling these settings, you confirm that you are over 18 and accept full responsibility for the content you choose to view.",
    ),
  );

  if (keys.length === 0) {
    body.append(
      TinyHtml.createFrom('p', { class: 'm-3 small text-warning made-by-ai' }).setText(
        'No mature content has been detected. However, some may be added in the future.',
      ),
    );
    return body;
  }

  const row = TinyHtml.createFrom('div', { class: 'row g-3 text-start' });
  keys.forEach((key) => row.append(buildFilterCard(key)));
  body.append(row);
  return body;
};

/**
 * Opens the mature content settings dialog.
 *
 * @param {string[]} [extra=[]] - Extra filter keys to display.
 * @returns {void}
 */
export const openNsfwSettings = (extra = []) => {
  tinyLib.modal({
    title: [new Icon('fas fa-eye me-3'), 'Mature Content Settings'],
    body: buildNsfwSettings(extra),
    dialog: 'modal-lg',
  });
};

/**
 * Checks whether the mature content settings can be used right now.
 *
 * When the age gate is disabled the settings are always available. Otherwise the
 * reader must be signed in with an account that is old enough.
 *
 * @returns {boolean} `true` when the settings may be opened.
 */
export const canUseNsfwSettings = () => !isNoNsfw();

/**
 * Builds the navbar entry that opens the mature content settings.
 *
 * The entry follows the same markup as the other navbar icons, so it lines up
 * with the `Read Fic` link. It is hidden while the reader is not allowed to use
 * the mature content settings and reacts to the account state on its own.
 *
 * @returns {import('tiny-essentials/libs/html/TinyHtml').default<HTMLElement>} The navbar item.
 */
export const nsfwSettingsNavItem = () => {
  const item = TinyHtml.createFrom('li', { class: 'nav-item' });
  const link = TinyHtml.createFrom('a', {
    class: 'nav-link',
    href: 'javascript:void(0)',
    id: 'nsfw-settings',
    title: 'Mature Content Settings',
    'aria-label': 'Mature Content Settings',
  });

  link.append(new Icon('fa-solid fa-eye'));
  item.append(link);

  Tooltip(link);

  // The entry only exists while the reader is allowed to change the filters.
  const sync = () => item.toggleClass('d-none', !canUseNsfwSettings());
  sync();

  link.on('click', (e) => {
    e.preventDefault();
    openNsfwSettings();
  });

  // The account state can change at any time (login, logout, birthday load).
  fa.on('login', sync);
  fa.on('logout', sync);
  fa.on('authStateChanged', sync);
  fa.on('birthdayFetched', sync);

  return item;
};
