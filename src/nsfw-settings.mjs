import TinyHtml from 'tiny-essentials/libs/html/TinyHtml';
import TinyHtmlElems from 'tiny-essentials/libs/html/TinyHtmlElems';

import storyCfg from './chapters/config.mjs';
import { isNoNsfw, tinyLs } from './important.mjs';
import tinyLib from './files/tinyLib.mjs';
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
 * Builds the button that opens the settings dialog.
 *
 * @param {string} [className='btn-info'] - Bootstrap color of the button.
 * @returns {import('tiny-essentials/libs/html/TinyHtml').default<HTMLElement>} The button.
 */
export const nsfwSettingsButton = (className = 'btn-info') => {
  const cantNsfw = isNoNsfw();
  return tinyLib.bs
    .button(!cantNsfw ? className : 'danger')
    .setText(
      !cantNsfw
        ? 'Choose Optional Mature Content'
        : 'Unavailable in your region (Login with an 18+ account)',
    )
    .toggleProp('disabled', cantNsfw)
    .on('click', () => openNsfwSettings());
};
