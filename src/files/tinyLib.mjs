import tippy from 'tippy.js';
import { isJsonObject } from 'tiny-essentials/basics/objChecker';
import { readJsonBlob, readBase64Blob } from 'tiny-essentials/basics/html';
import TinyHtml from 'tiny-essentials/libs/html/TinyHtml';
import storyCfg from '../chapters/config.mjs';
import { Modal } from '../modules/TinyBootstrap.mjs';
import { body } from '../html/query.mjs';

/**
 * @import { TinyHtmlAny } from 'tiny-essentials/libs/html/TinyHtml';
 */

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

    const newValue = structuredClone(accumulator);
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
 * @typedef {TinyHtmlAny|string} ModalContent
 */

/**
 * A single entry rendered by {@link tinyLib.bs.dropdownClick}.
 *
 * @typedef {Object} DropdownItem
 * @property {string} [id] - Element id of the generated link.
 * @property {string} [text] - Visible label.
 * @property {string} [href] - Link target.
 * @property {string} [icon] - Font Awesome class list of the leading icon.
 * @property {string} [file] - Markdown file opened when the entry is clicked.
 * @property {boolean} [web3Element] - Whether the entry requires a Web3 wallet.
 * @property {(e: Event) => void} [click] - Extra click handler.
 */

/**
 * Opens a Bootstrap modal built from the given pieces.
 *
 * @param {Object} data - Modal configuration.
 * @param {string} [data.dialog] - Extra dialog classes.
 * @param {number|string} [data.width] - Fixed width of the dialog.
 * @param {string|null} [data.id] - Element id of the modal.
 * @param {() => void} [data.hidden] - Callback fired after the modal is hidden.
 * @param {ModalContent|ModalContent[]} [data.footer] - Footer content.
 * @param {ModalContent|ModalContent[]} [data.title] - Title content.
 * @param {ModalContent|ModalContent[]} [data.body] - Body content.
 * @returns {{ modal: bootstrap.Modal, html: TinyHtml<HTMLElement> }}
 */
tinyLib.modal = (data) => {
  if (typeof data.dialog !== 'string') data.dialog = '';

  const dialog = TinyHtml.createFrom('div', {
    class: 'modal-dialog ' + data.dialog,
    role: 'document',
  });
  if (typeof data.width === 'string' || typeof data.width === 'number')
    dialog.setStyle({
      'max-width': 'none',
      width: typeof data.width === 'number' ? `${data.width}px` : data.width,
    });

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
      dialog.append(
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
  return { modal: Modal(modal, undefined, true), html: modal };
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
 * @param {{ enabled: boolean, value: string|number|boolean|null }} [data.checkbox]
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
 * @param {string|number|boolean|null} [data.value]
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
 * @template {TinyHtmlAny} T
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
 * @template {TinyHtmlAny} T
 * @param {T} button
 * @param {string} [baseFormat]
 * @param {(err: Error | null, data: string | null) => void} callback
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
 * @template {TinyHtmlAny} T
 * @param {T} button
 * @param {(err: Error | null, data: string | null) => void} callback
 * @param {string} [accept='*']
 * @param {string} [baseFormat='image']
 * @returns {T}
 */
tinyLib.upload.img = (button, callback, accept = '*', baseFormat = 'image') =>
  tinyLib.upload.dataUrl(button, callback, baseFormat, accept);

/**
 * Json upload
 *
 * @template {TinyHtmlAny} T
 * @param {T} button
 * @param {(err: Error | null, data: JsonValue | null) => void} callback
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
 * Builds a Bootstrap button.
 *
 * @param {string|{ class?: string, dsBtn?: boolean, id?: string, toggle?: string, target?: string }} [className] - Class list or options.
 * @param {string} [tag] - Tag name of the element.
 * @param {boolean} [isButton] - Whether the element behaves as a button.
 * @returns {TinyHtmlAny} The button element.
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
 * @param {TinyHtmlAny|null} content
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
 * Enables mouse wheel / trackpad scrolling on a horizontally scrollable element.
 *
 * The wheel delta is converted into horizontal scrolling while the element still has
 * room to scroll. Once an edge is reached the event is not prevented, so the page
 * keeps scrolling naturally.
 *
 * @param {TinyHtmlAny|HTMLElement|string} target
 * @param {Object} [options]
 * @param {number} [options.speed=1] - Multiplier applied to the wheel delta.
 * @param {number} [options.easing=0.22] - Easing factor, from 0 (instant) to 1 (slowest).
 * @returns {(() => void)|null} A function that removes the listeners, if they were attached.
 */
tinyLib.bs.navbar.horizontalWheel = (target, options = {}) => {
  const speed = typeof options.speed === 'number' ? options.speed : 1;
  const easing = typeof options.easing === 'number' ? options.easing : 0.22;
  const el =
    target instanceof HTMLElement
      ? target
      : target instanceof TinyHtml
        ? target.get(0)
        : typeof target === 'string'
          ? document.querySelector(target)
          : null;

  if (!(el instanceof HTMLElement)) return null;

  const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)') || null;
  const isSmooth = () => !motionQuery?.matches;

  /** @type {number} */
  let rafId = 0;
  /** @type {number|null} */
  let targetLeft = null;

  const stop = () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    targetLeft = null;
  };

  const step = () => {
    rafId = 0;
    if (targetLeft === null) return;

    // The content may have been resized while the animation was running.
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const goal = Math.max(0, Math.min(maxScroll, targetLeft));

    const current = el.scrollLeft;
    const distance = goal - current;

    // Close enough: land exactly on the target so the last pixels are never lost.
    if (Math.abs(distance) < 1) {
      el.scrollLeft = goal;
      targetLeft = null;
      return;
    }

    // Ease towards the target, but never move less than one pixel per frame.
    // Without the minimum the browser rounding of `scrollLeft` can swallow the step
    // and the animation freezes a few pixels before the end, leaving the scroll
    // incomplete. The minimum guarantees the whole distance is always covered.
    const stepSize = Math.max(Math.abs(distance) * easing, 1) * Math.sign(distance);
    const next = Math.abs(stepSize) >= Math.abs(distance) ? goal : current + stepSize;

    el.scrollLeft = next;

    if (next === goal) {
      targetLeft = null;
      return;
    }

    rafId = requestAnimationFrame(step);
  };

  /** @param {WheelEvent} event */
  const onWheel = (event) => {
    // Ctrl + wheel is the browser zoom gesture.
    if (event.ctrlKey) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 1) return;

    // Prefer the dominant axis so both mouse wheels and trackpads feel right.
    const rawDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (!rawDelta) return;

    // Normalize line/page deltas (Firefox) to pixels.
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? el.clientWidth : 1;
    const delta = rawDelta * unit * speed;

    // Accumulate over the pending target so fast wheel bursts are not lost.
    const base = targetLeft === null ? el.scrollLeft : targetLeft;
    const next = Math.max(0, Math.min(maxScroll, base + delta));
    if (next === base) return;

    event.preventDefault();

    if (!isSmooth()) {
      stop();
      el.scrollLeft = next;
      return;
    }

    targetLeft = next;
    if (!rafId) rafId = requestAnimationFrame(step);
  };

  // A manual drag on the scrollbar must win over the running animation.
  el.addEventListener('pointerdown', stop);
  el.addEventListener('wheel', onWheel, { passive: false });

  return () => {
    stop();
    el.removeEventListener('pointerdown', stop);
    el.removeEventListener('wheel', onWheel);
  };
};

/**
 * Offcanvas
 *
 * @param {string} [where='start']
 * @param {string} [id='']
 * @param {string} [title='']
 * @param {TinyHtmlAny|null} [content]
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
 * @param {TinyHtmlAny|string|(TinyHtmlAny|string)[]|null} content
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
 * @param {TinyHtmlAny} place
 * @param {DropdownItem[]} data
 * @param {(li: TinyHtml<HTMLElement>, props: TippyInstance<TippyProps>[] & TippyInstance<TippyProps>, item: DropdownItem, index: number) => void} callbackInsert
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
