import tippy from 'tippy.js';
import clone from 'clone';
import { readJsonBlob, readBase64Blob, isJsonObject } from 'tiny-essentials/basics';
import TinyHtml from 'tiny-essentials/libs/TinyHtml';
import storyCfg from '../chapters/config.mjs';
import { Modal } from '../modules/TinyBootstrap.mjs';
import { body } from '../html/query.mjs';

/** Tiny Lib */
const tinyLib = {};

/** MD Data manager */
tinyLib.mdManager = {};

/**
 * @param {string} markdown
 * @returns {Record<string, string>}
 */
tinyLib.mdManager.extractMetadata = (markdown) => {
  const charactersBetweenGroupedHyphens = /^\#---([\s\S]*?)\#---/;
  const metadataMatched = markdown.match(charactersBetweenGroupedHyphens);
  const metadata = metadataMatched ? metadataMatched[1] : null;
  if (!metadata) {
    return {};
  }

  const metadataLines = metadata.split('\n');
  const metadataObject = metadataLines.reduce((accumulator, line) => {
    const [key, ...value] = line.split(':').map((part) => part.trim());

    const newValue = clone(accumulator);
    if (key) {
      // @ts-ignore
      newValue[key] = value[1] ? value.join(':') : value.join('');

      if (
        // @ts-ignore
        (newValue[key].startsWith("'") && newValue[key].endsWith("'")) ||
        // @ts-ignore
        (newValue[key].startsWith('"') && newValue[key].endsWith('"'))
      )
        // @ts-ignore
        newValue[key] = newValue[key].substring(1, newValue[key].length - 1);
    }
    return newValue;
  }, {});

  return metadataObject;
};

/**
 * @param {string} text
 * @returns {string}
 */
tinyLib.mdManager.removeMetadata = (text) => {
  let result = text.replace(/^\#---([\s\S]*?)\#---/, '');
  while (result.startsWith('\n')) {
    result = result.substring(1);
  }
  return result;
};

/**
 * Alert
 * @param {string} where
 * @param {string} alertType
 * @param {string} icon
 * @param {string} text
 *
 */
tinyLib.alert = (where, alertType, icon, text) => {
  TinyHtml.query(where)
    ?.empty()
    .append(
      tinyLib.bs.alert(alertType, [TinyHtml.createFrom('i', { class: icon }), ' ', text], true),
    );
};

/**
 * Modal
 * @param {Object} data
 * @param {string} [data.dialog]
 * @param {string} [data.id]
 * @param {Function} [data.hidden]
 * @param {TinyHtml<any>} [data.footer]
 * @param {TinyHtml<any>} [data.title]
 * @param {TinyHtml<any>} [data.body]
 * @returns {bootstrap.Modal}
 */
tinyLib.modal = (data) => {
  if (typeof data.dialog !== 'string') data.dialog = '';

  const modal = TinyHtml.createFrom('div', {
    class: 'modal fade',
    id: data.id ?? null,
    tabindex: -1,
    role: 'dialog',
  })
    .on('hidden.bs.modal', () => {
      modal.remove();
      if (typeof data.hidden === 'function') {
        data.hidden();
      }
    })
    .append(
      TinyHtml.createFrom('div', { class: 'modal-dialog ' + data.dialog, role: 'document' }).append(
        TinyHtml.createFrom('div', { class: 'modal-content' }).append(
          TinyHtml.createFrom('div', { class: 'modal-header' }).append(
            TinyHtml.createFrom('h5', { class: 'modal-title' }).append(data.title),
            TinyHtml.createFrom('button', {
              type: 'button',
              class: 'btn-close',
              'data-bs-dismiss': 'modal',
            }),
          ),

          TinyHtml.createFrom('div', { class: 'modal-body' }).append(data.body),
          data.footer
            ? TinyHtml.createFrom('div', { class: 'modal-footer' }).append(data.footer)
            : null,
        ),
      ),
    );

  body.prepend(modal);
  return Modal(modal, undefined, true);
};

/**
 * @param {Object} data
 * @param {string} [data.class]
 * @param {string} [data.title]
 * @param {string} data.id
 * @param {string} data.type
 * @param {string} [data.value]
 * @param {string} [data.placeholder]
 * @param {string} [data.help]
 * @param {{ enabled: boolean, value: any }} [data.checkbox]
 */
tinyLib.formGroup = (data) => {
  if (typeof data.class !== 'string') {
    data.class = '';
  }
  const result = TinyHtml.createFrom('div', { class: 'form-group ' + data.class, id: data.id });

  if (typeof data.title === 'string') {
    result.append(TinyHtml.createFrom('label', { for: data.id + '_input' }).setText(data.title));
  }

  result.append(
    TinyHtml.createFrom('input', {
      type: data.type,
      class: 'form-control',
      name: data.id,
      id: data.id + '_input',
      'aria-describedby': data.id + '_help',
      value: data.value ?? null,
      placeholder: data.placeholder ?? null,
    }),
  );

  if (typeof data.help === 'string') {
    const newValue = TinyHtml.createFrom('label', {
      id: data.id + '_help',
      class: 'form-text text-muted small',
    }).setText(data.help);
    if (data.checkbox && data.checkbox.enabled) {
      newValue.prepend(
        TinyHtml.createFrom('input', {
          class: 'me-2',
          id: data.id + '_enabled',
          name: data.id + '_enabled',
          type: 'checkbox',
        }).setAttr('checked', data.checkbox.value ?? null),
      );
    }
    result.append(newValue);
  }

  return result;
};

/**
 * @param {Object} data
 * @param {string} [data.class]
 * @param {string} data.id
 * @param {string} [data.title]
 * @param {any} [data.value]
 */
tinyLib.formGroupCheck = (data) => {
  if (typeof data.class !== 'string') {
    data.class = '';
  }

  return TinyHtml.createFrom('div', {
    class: 'form-group form-check ' + data.class,
    id: data.id,
  }).append(
    TinyHtml.createFrom('input', {
      type: 'checkbox',
      class: 'form-check-input',
      name: data.id,
      id: data.id + '_input',
      'aria-describedby': data.id + '_help',
    }).setAttr('checked', data.value ?? null),
    TinyHtml.createFrom('label', { class: 'form-check-label', for: data.id + '_input' }).setText(
      data.title,
    ),
  );
};

/**
 * Alert
 * @param {string} text
 * @param {string} title
 */
export const alert = (text, title = 'Browser Warning!') => {
  return tinyLib.modal({
    title: TinyHtml.createFrom('span').setText(title),
    body: TinyHtml.createFrom('div', { class: 'text-break' })
      .setStyle('white-space', 'pre-wrap')
      .setText(text),
    dialog: 'modal-lg',
  });
};

/**
 * Remove AI tags
 *
 * @param {string} str
 */
tinyLib.removeAiTags = (str) => {
  return str.replace(/\<ai\>|\<\/ai\>/g, '');
};

/**
 * @param {string} text
 * @param {string} [type='g']
 */
tinyLib.getGitUrlPath = (text, type = 'g') => {
  const tinyUrl = `https\\:\\/\\/github.com\\/${storyCfg.github.account}\\/${storyCfg.github.repository}\\/blob\\/main\\/`;
  return new RegExp(typeof text === 'string' ? text.replace('{url}', tinyUrl) : tinyUrl, type);
};

/** Files Upload button */
tinyLib.upload = {};

/**
 * @template {TinyHtml<any>} T
 * @param {{ multiple?: boolean; directory?: boolean; accept?: string; }} configs
 * @param {T} button
 * @param {(e: Event) => void} callback
 * @returns {T}
 */
tinyLib.upload.button = (configs, button, callback) => {
  // Create button
  const importButton = TinyHtml.createFrom('input', { type: 'file', style: 'display: none;' });
  importButton.setAttr('accept', configs.accept ?? null);

  // Multiple
  if (configs.multiple) importButton.addProp('multiple');

  // Directory
  if (configs.directory) importButton.addProp('directory');

  // Prepare button functions
  importButton.on('change', callback);
  button.on('click', () => {
    const elem = importButton.get(0);
    if (elem instanceof HTMLInputElement) elem.click();
  });

  button.append(importButton);
  return button;
};

/**
 * File base64 selector template
 *
 * @template {TinyHtml<any>} T
 * @param {T} button
 * @param {string} [baseFormat]
 * @param {(err: Error | null, data: any[] | string | null) => void} callback
 * @param {string} [accept='*']
 * @returns {T}
 */
tinyLib.upload.dataUrl = (button, callback, baseFormat, accept = '*') =>
  tinyLib.upload.button({ accept: `${baseFormat}/${accept}` }, button, (event) => {
    // Get File Element
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const files = target?.files;
    const file = files ? files[0] : null;
    if (!file) return;
    // Image type validation
    if (!file.type.startsWith(`${baseFormat}/`)) {
      callback(new Error('Selected file is not an image'), null);
      return;
    }
    // Complete
    readBase64Blob(file, file.type)
      .then((dataUrl) => callback(null, dataUrl))
      .catch((err) => callback(err, null));
  });

/**
 * Image upload
 *
 * @template {TinyHtml<any>} T
 * @param {T} button
 * @param {string} [baseFormat='image']
 * @param {(err: Error | null, data: any[] | string | null) => void} callback
 * @param {string} [accept='*']
 * @returns {T}
 */
tinyLib.upload.img = (button, callback, accept = '*', baseFormat = 'image') =>
  tinyLib.upload.dataUrl(button, callback, baseFormat, accept);

/**
 * Json upload
 *
 * @template {TinyHtml<any>} T
 * @param {T} button
 * @param {(err: Error | null, data: any[] | Record<string | number | symbol, any> | null) => void} callback
 * @returns {T}
 */
tinyLib.upload.json = (button, callback) =>
  tinyLib.upload.button({ accept: '.json' }, button, (event) => {
    // Get File Element
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const files = target?.files;
    const file = files ? files[0] : null;
    if (!file) return;
    if (file)
      readJsonBlob(file)
        .then((jsonData) => callback(null, jsonData))
        .catch((err) => callback(err, null));
  });

/** Bootstrap */
tinyLib.bs = {};

/**
 * Button
 *
 * @param {string|Record<string, string>} [className='primary']
 * @param {string} [tag='button']
 * @param {boolean} [isButton=true]
 */
tinyLib.bs.button = (className = 'primary', tag = 'button', isButton = true) => {
  const buttonClass =
    typeof className === 'string'
      ? className
      : isJsonObject(className) && typeof className.class === 'string'
        ? className.class
        : null;
  const introClass = typeof className === 'string' || !className.dsBtn ? 'btn btn-' : '';

  return TinyHtml.createFrom(tag, {
    id: isJsonObject(className) && typeof className.id === 'string' ? className.id : null,
    class: `${introClass}${buttonClass}`,
    role: isButton && (!isJsonObject(className) || !className.toggle) ? 'button' : null,
    type: isButton ? 'button' : null,
    'data-bs-toggle':
      isJsonObject(className) && typeof className.toggle === 'string' ? className.toggle : null,
    'data-bs-target':
      isJsonObject(className) && typeof className.target === 'string' ? className.target : null,
  });
};

/**
 * Btn Close
 *
 * @param {string|null} [dataDismiss=null]
 */
tinyLib.bs.closeButton = (dataDismiss = null) =>
  TinyHtml.createFrom('button', {
    class: 'btn-close',
    type: 'button',
    'data-bs-dismiss': dataDismiss,
  });

/** Navbar  */
tinyLib.bs.navbar = {};

/**
 * @param {string} id
 * @param {string} [theme='dark']
 * @param {boolean} [isFixed=false]
 */
tinyLib.bs.navbar.root = (id, theme = 'dark', isFixed = false) =>
  TinyHtml.createFrom('nav', {
    class: `navbar navbar-expand-lg navbar-${theme} bg-${theme}${isFixed ? ' fixed-top' : ''} px-4 py-0 tiny-navabar-style`,
    id,
  });

/**
 * @param {string} text
 * @param {string} href
 */
tinyLib.bs.navbar.title = (text, href) =>
  TinyHtml.createFrom('a', {
    class: 'navbar-brand',
    href,
  }).setText(text);

/**
 * @param {string} dir
 * @param {string} className
 * @param {string} id
 * @param {TinyHtml<any>} content
 */
tinyLib.bs.navbar.collapse = (dir, className, id, content) =>
  TinyHtml.createFrom('div', {
    class: `collapse navbar-collapse navbar-nav-${dir}${className ? ` ${className}` : ''}`,
    id,
  }).append(
    TinyHtml.createFrom('ul', {
      class: `navbar-nav ${dir === 'left' ? 'me' : dir === 'right' ? 'ms' : ''}-auto mb-2 mb-lg-0`,
    }).append(content),
  );

/**
 * Offcanvas
 *
 * @param {string} [where='start']
 * @param {string} [id='']
 * @param {string} [title='']
 * @param {TinyHtml<any>|null} [content]
 * @param {boolean} [closeButtonInverse=false]
 * @param {number} [tabIndex=-1]
 */
tinyLib.bs.offcanvas = (
  where = 'start',
  id = '',
  title = '',
  content = null,
  closeButtonInverse = false,
  tabIndex = -1,
) => {
  const body = TinyHtml.createFrom('div', {
    class: 'offcanvas-body',
  });

  if (!Array.isArray(content)) body.append(content);
  else for (const index in content) body.append(content[index]);

  return TinyHtml.createFrom('div', {
    class: `offcanvas offcanvas-${where}`,
    tabindex: tabIndex,
    id,
  }).append(
    TinyHtml.createFrom('div', { class: 'offcanvas-header' }).append(
      title
        ? TinyHtml.createFrom('h5', {
            class: 'offcanvas-title',
            id: `${id}Label`,
          }).setText(title ?? null)
        : null,
      !closeButtonInverse && tinyLib.bs.closeButton('offcanvas'),
      body,
      closeButtonInverse && tinyLib.bs.closeButton('offcanvas'),
    ),
  );
};

/**
 * Container
 *
 * @param {string|null} [id]
 * @param {string|null} [classItems]
 * @param {string} [tag='div']
 */
tinyLib.bs.container = (id = null, classItems = null, tag = 'div') =>
  TinyHtml.createFrom(tag, {
    id,
    class: `container${classItems ? ` ${classItems}` : ''}`,
  });

/**
 * Alert
 * @param {string} type
 * @param {TinyHtml<any>|string|(TinyHtml<any>|string)[]|null} content
 * @param {boolean} isDismissible
 */
tinyLib.bs.alert = (type = 'primary', content = null, isDismissible = false) => {
  const result = TinyHtml.createFrom('div', {
    class: `alert alert-${type}${isDismissible ? ` alert-dismissible fade show` : ''}`,
    role: 'alert',
  });
  result.append(content);
  if (isDismissible) result.append(tinyLib.bs.closeButton('alert'));
  return result;
};

/**
 * @typedef {import('tippy.js').Props} TippyProps
 */

/**
 * @template T
 * @typedef {import('tippy.js').Instance<T>} TippyInstance
 */

/**
 * Dropdown
 * @param {TinyHtml<any>} place
 * @param {any[]} data
 * @param {(li: TinyHtml<HTMLElement>, props: TippyInstance<TippyProps>[] & TippyInstance<TippyProps>, item: any, index: number) => void} callbackInsert
 */
tinyLib.bs.dropdownClick = (place, data, callbackInsert) => {
  const elem = place.get(0);
  if (!(elem instanceof HTMLElement)) throw new Error('Invalid element type!');
  const rootBase = TinyHtml.createFrom('ul', { class: 'dropdown-menu show' });
  // @ts-ignore
  const element = tippy(elem, {
    content: rootBase.get(0),
    allowHTML: true,
    interactive: true,
    arrow: false,
    theme: 'dark-border',
    placement: 'bottom-start',
    trigger: 'click',
    hideOnClick: true,
    appendTo: () => TinyHtml.query('body > #root')?.get(0),
  });

  for (const index in data) {
    const li = TinyHtml.createFrom('li');
    rootBase.append(li);
    callbackInsert(li, element, data[index], Number(index));
  }
};

export default tinyLib;
