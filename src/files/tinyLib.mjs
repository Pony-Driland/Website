import tippy from 'tippy.js';
import { objType, readJsonBlob, readBase64Blob, TinyHtml } from 'tiny-essentials';
import storyCfg from '../chapters/config.mjs';
import { Modal } from '../modules/TinyBootstrap.mjs';

// Prepare Tiny Lib
const tinyLib = {};

// MD Data manager
tinyLib.mdManager = {};

tinyLib.mdManager.extractMetadata = (markdown) => {
  const charactersBetweenGroupedHyphens = /^\#---([\s\S]*?)\#---/;
  const metadataMatched = markdown.match(charactersBetweenGroupedHyphens);
  const metadata = metadataMatched[1];
  if (!metadata) {
    return {};
  }

  const metadataLines = metadata.split('\n');
  const metadataObject = metadataLines.reduce((accumulator, line) => {
    const [key, ...value] = line.split(':').map((part) => part.trim());

    if (key) {
      accumulator[key] = value[1] ? value.join(':') : value.join('');

      if (
        (accumulator[key].startsWith("'") && accumulator[key].endsWith("'")) ||
        (accumulator[key].startsWith('"') && accumulator[key].endsWith('"'))
      )
        accumulator[key] = accumulator[key].substring(1, accumulator[key].length - 1);
    }
    return accumulator;
  }, {});

  return metadataObject;
};

tinyLib.mdManager.removeMetadata = (text) => {
  let result = text.replace(/^\#---([\s\S]*?)\#---/, '');
  while (result.startsWith('\n')) {
    result = result.substring(1);
  }
  return result;
};

// Alert
tinyLib.alert = (where, alertType, icon, text) => {
  TinyHtml.query(where)
    .empty()
    .append(
      tinyLib.bs.alert(alertType, [TinyHtml.createFrom('i', { class: icon }), ' ', text], true),
    );
};

// Modal
/** @returns {bootstrap.Modal} */
tinyLib.modal = (data) => {
  if (typeof data.dialog !== 'string') data.dialog = '';

  const modal = TinyHtml.createFrom('div', {
    class: 'modal fade',
    id: data.id,
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

  TinyHtml.query('body').prepend(modal);
  return Modal(modal, undefined, true);
};

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
      value: data.value,
      placeholder: data.placeholder,
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

// Alert
alert = (text, title = 'Browser Warning!') => {
  return tinyLib.modal({
    title: TinyHtml.createFrom('span').setText(title),
    body: TinyHtml.createFrom('div', { class: 'text-break' })
      .setStyle('white-space', 'pre-wrap')
      .setText(text),
    dialog: 'modal-lg',
  });
};

// Remove AI tags
tinyLib.removeAiTags = (str) => {
  return str.replace(/\<ai\>|\<\/ai\>/g, '');
};

tinyLib.getGitUrlPath = (text, type = 'g') => {
  const tinyUrl = `https\\:\\/\\/github.com\\/${storyCfg.github.account}\\/${storyCfg.github.repository}\\/blob\\/main\\/`;
  return new RegExp(typeof text === 'string' ? text.replace('{url}', tinyUrl) : tinyUrl, type);
};

// Icon
tinyLib.icon = (classItem) => TinyHtml.createFrom('i', { class: classItem });

// Files Upload button
tinyLib.upload = {};
tinyLib.upload.button = (configs = {}, button = null, callback = null) => {
  // Create button
  const importButton = TinyHtml.createFrom('input', { type: 'file', style: 'display: none;' });
  importButton.setAttr('accept', configs.accept ?? null);

  // Multiple
  if (configs.multiple) importButton.addProp('multiple');

  // Directory
  if (configs.directory) importButton.addProp('directory');

  // Prepare button functions
  importButton.on('change', callback);
  button.on('click', () => importButton.trigger('click'));
  button.parent().append(importButton);
  return button;
};

// File base64 selector template
tinyLib.upload.dataUrl = (button = null, baseFormat = '', callback = null, accept = '*') =>
  tinyLib.upload.button({ accept: `${baseFormat}/${accept}` }, button, (event) => {
    const file = event.target.files[0];
    if (!file) return;
    // Image type validation
    if (!file.type.startsWith(`${baseFormat}/`)) {
      callback(new Error('Selected file is not an image'), null);
      return;
    }
    // Complete
    readBase64Blob(file, `${baseFormat}/${format}`)
      .then((dataUrl) => callback(null, dataUrl))
      .catch((err) => callback(err, null));
  });

// Image upload
tinyLib.upload.img = (button = null, callback = null, accept = '*') =>
  tinyLib.upload.dataUrl(button, 'image', callback, accept);

// Json upload
tinyLib.upload.json = (button = null, callback = null) =>
  tinyLib.upload.button({ accept: '.json' }, button, (event) => {
    const file = event.target.files[0];
    if (file)
      readJsonBlob(file)
        .then((jsonData) => callback(null, jsonData))
        .catch((err) => callback(err, null));
  });

// Bootstrap
tinyLib.bs = {};

// Button
tinyLib.bs.button = (className = 'primary', tag = 'button', isButton = true) => {
  const buttonClass =
    typeof className === 'string'
      ? className
      : objType(className, 'object') && typeof className.class === 'string'
        ? className.class
        : null;
  const introClass = typeof className === 'string' || !className.dsBtn ? 'btn btn-' : '';

  return TinyHtml.createFrom(tag, {
    id: objType(className, 'object') && typeof className.id === 'string' ? className.id : null,
    class: `${introClass}${buttonClass}`,
    role: isButton && (!objType(className, 'object') || !className.toggle) ? 'button' : null,
    type: isButton ? 'button' : null,
    'data-bs-toggle':
      objType(className, 'object') && typeof className.toggle === 'string'
        ? className.toggle
        : null,
    'data-bs-target':
      objType(className, 'object') && typeof className.target === 'string'
        ? className.target
        : null,
  });
};

// Btn Close
tinyLib.bs.closeButton = (dataDismiss = null) =>
  TinyHtml.createFrom('button', {
    class: 'btn-close',
    type: 'button',
    'data-bs-dismiss': dataDismiss,
  });

// Navbar
tinyLib.bs.navbar = {};
tinyLib.bs.navbar.root = (id, theme = 'dark', isFixed = false) =>
  TinyHtml.createFrom('nav', {
    class: `navbar navbar-expand-lg navbar-${theme} bg-${theme}${isFixed ? ' fixed-top' : ''} px-4 py-0 tiny-navabar-style`,
    id,
  });

tinyLib.bs.navbar.title = (text, href) =>
  TinyHtml.createFrom('a', {
    class: 'navbar-brand',
    href,
    text,
  });

tinyLib.bs.navbar.collapse = (dir, className, id, content) =>
  TinyHtml.createFrom('div', {
    class: `collapse navbar-collapse navbar-nav-${dir}${className ? ` ${className}` : ''}`,
    id,
  }).append(
    TinyHtml.createFrom('ul', {
      class: `navbar-nav ${dir === 'left' ? 'me' : dir === 'right' ? 'ms' : ''}-auto mb-2 mb-lg-0`,
    }).append(content),
  );

// Offcanvas
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

// Container
tinyLib.bs.container = (id = null, classItems = null, tag = 'div') =>
  TinyHtml.createFrom(tag, {
    id,
    class: `container${classItems ? ` ${classItems}` : ''}`,
  });

// Alert
tinyLib.bs.alert = (type = 'primary', content = null, isDismissible = false) => {
  const result = TinyHtml.createFrom('div', {
    class: `alert alert-${type}${isDismissible ? ` alert-dismissible fade show` : ''}`,
    role: 'alert',
  });
  result.append(content);
  if (isDismissible) result.append(tinyLib.bs.closeButton('alert'));
  return result;
};

// Dropdown
tinyLib.bs.dropdownClick = (place, data, callbackInsert) => {
  const rootBase = TinyHtml.createFrom('ul', { class: 'dropdown-menu show' });
  const element = tippy(place.get(0), {
    content: rootBase.get(0),
    allowHTML: true,
    interactive: true,
    arrow: false,
    theme: 'dark-border',
    placement: 'bottom-start',
    trigger: 'click',
    hideOnClick: true,
    appendTo: () => TinyHtml.query('body > #root').get(0),
  });

  for (const index in data) {
    const li = TinyHtml.createFrom('li');
    rootBase.append(li);
    callbackInsert(li, element, data[index], index);
  }
};

export default tinyLib;
