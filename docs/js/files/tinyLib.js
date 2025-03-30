// Bootstrap 5
const enableQuery = function () {
  $.fn.modal = function (type, configObject) {
    this.each(function () {
      if (!$(this).data('bs-modal')) {
        if (configObject) {
          $(this).data('bs-modal', new bootstrap.Modal(this, configObject));
        } else if (typeof type !== 'string') {
          $(this).data('bs-modal', new bootstrap.Modal(this, type));
        } else {
          $(this).data('bs-modal', new bootstrap.Modal(this));
        }
      }

      const modal = $(this).data('bs-modal');

      if (typeof type === 'string' && typeof modal[type] === 'function') {
        modal[type]();
      } else {
        modal.show();
      }
    });
  };

  $.fn.tooltip = function (type, configObject) {
    this.each(function () {
      if (!$(this).data('bs-tooltip')) {
        if (configObject) {
          $(this).data('bs-tooltip', new bootstrap.Tooltip(this, configObject));
        } else if (typeof type !== 'string') {
          $(this).data('bs-tooltip', new bootstrap.Tooltip(this, type));
        } else {
          $(this).data('bs-tooltip', new bootstrap.Tooltip(this));
        }
      }
    });
  };
};

enableQuery();
$(() => {
  enableQuery();
});

// Prepare Tiny Lib
const tinyLib = {};

(function () {
  var hidden = 'windowHidden';

  // Standards:
  if (hidden in document) document.addEventListener('visibilitychange', onchange);
  else if ((hidden = 'mozHidden') in document)
    document.addEventListener('mozvisibilitychange', onchange);
  else if ((hidden = 'webkitHidden') in document)
    document.addEventListener('webkitvisibilitychange', onchange);
  else if ((hidden = 'msHidden') in document)
    document.addEventListener('msvisibilitychange', onchange);
  // IE 9 and lower:
  else if ('onfocusin' in document) document.onfocusin = document.onfocusout = onchange;
  // All others:
  else window.onpageshow = window.onpagehide = window.onfocus = window.onblur = onchange;

  function onchange(evt) {
    $('body').removeClass('windowHidden').removeClass('windowVisible');
    var v = 'windowVisible',
      h = 'windowHidden',
      evtMap = {
        focus: v,
        focusin: v,
        pageshow: v,
        blur: h,
        focusout: h,
        pagehide: h,
      };

    evt = evt || window.event;
    if (evt.type in evtMap) $('body').addClass(evtMap[evt.type]);
    else $('body').addClass(this[hidden] ? 'windowHidden' : 'windowVisible');
  }

  // set the initial state (but only if browser supports the Page Visibility API)
  if (document[hidden] !== undefined) onchange({ type: document[hidden] ? 'blur' : 'focus' });
})();

// MD Data manager
tinyLib.mdManager = {};

tinyLib.mdManager.extractMetadata = function (markdown) {
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

tinyLib.mdManager.removeMetadata = function (text) {
  let result = text.replace(/^\#---([\s\S]*?)\#---/, '');
  while (result.startsWith('\n')) {
    result = result.substring(1);
  }
  return result;
};

// Dialog
tinyLib.dialog = function (data1, data2) {
  const newData = $('<div>', {
    id: data1.id,
    title: data1.title,
  }).append(data1.html);

  $('body').append(newData);
  newData.dialog(data2);
};

// Alert
tinyLib.alert = function (where, alertType, icon, text) {
  $(where)
    .empty()
    .append(tinyLib.bs.alert(alertType, [$('<i>', { class: icon }), ' ', text], true));
};

// Modal
tinyLib.modal = function (data) {
  if (typeof data.dialog !== 'string') {
    data.dialog = '';
  }

  const modal = $('<div>', { class: 'modal fade', id: data.id, tabindex: -1, role: 'dialog' })
    .on('hidden.bs.modal', function (e) {
      $(this).remove();
      if (typeof data.hidden === 'function') {
        data.hidden();
      }
    })
    .append(
      $('<div>', { class: 'modal-dialog ' + data.dialog, role: 'document' }).append(
        $('<div>', { class: 'modal-content' }).append(
          $('<div>', { class: 'modal-header' }).append(
            $('<h5>', { class: 'modal-title' }).append(data.title),
            $('<button>', { type: 'button', class: 'btn-close', 'data-bs-dismiss': 'modal' }),
          ),

          $('<div>', { class: 'modal-body' }).append(data.body),
          data.footer ? $('<div>', { class: 'modal-footer' }).append(data.footer) : null,
        ),
      ),
    );

  $('body').prepend(modal);
  modal.modal();
};

tinyLib.formGroup = function (data) {
  if (typeof data.class !== 'string') {
    data.class = '';
  }
  const result = $('<div>', { class: 'form-group ' + data.class, id: data.id });

  if (typeof data.title === 'string') {
    result.append($('<label>', { for: data.id + '_input' }).text(data.title));
  }

  result.append(
    $('<input>', {
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
    const newValue = $('<label>', {
      id: data.id + '_help',
      class: 'form-text text-muted small',
    }).text(data.help);
    if (data.checkbox && data.checkbox.enabled) {
      newValue.prepend(
        $('<input>', {
          class: 'me-2',
          id: data.id + '_enabled',
          name: data.id + '_enabled',
          type: 'checkbox',
        }).attr('checked', data.checkbox.value),
      );
    }
    result.append(newValue);
  }

  return result;
};

tinyLib.formGroupCheck = function (data) {
  if (typeof data.class !== 'string') {
    data.class = '';
  }

  return $('<div>', { class: 'form-group form-check ' + data.class, id: data.id }).append(
    $('<input>', {
      type: 'checkbox',
      class: 'form-check-input',
      name: data.id,
      id: data.id + '_input',
      'aria-describedby': data.id + '_help',
    }).attr('checked', data.value),
    $('<label>', { class: 'form-check-label', for: data.id + '_input' }).text(data.title),
  );
};

// https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
tinyLib.formatBytes = function (bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

alert = function (text, title = 'Browser Warning!') {
  return tinyLib.modal({
    title: title,
    body: $('<div>', { class: 'text-break' }).css('white-space', 'pre-wrap').text(text),
    dialog: 'modal-lg',
  });
};

$.fn.selectRange = function (start, end) {
  if (typeof start === 'number') {
    if (typeof end !== 'number') {
      end = start;
    }
    return this.each(function () {
      if (this.setSelectionRange) {
        this.trigger('focus');
        this.setSelectionRange(start, end);
      } else if (this.createTextRange) {
        var range = this.createTextRange();
        range.collapse(true);
        range.moveEnd('character', end);
        range.moveStart('character', start);
        range.select();
      }
    });
  } else {
    const start = this[0].selectionStart;
    const end = this[0].selectionEnd;
    return { start, end };
  }
};

// https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
tinyLib.formatBytes = function (bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Alert
alert = function (text, title = 'Browser Warning!') {
  return tinyLib.modal({
    title: $('<span>').text(title),
    body: $('<div>', { class: 'text-break' }).css('white-space', 'pre-wrap').text(text),
    dialog: 'modal-lg',
  });
};

// This is a functions that scrolls to #{blah}link
tinyLib.goToByScroll = function (id, speed = 'slow') {
  const offset = id.offset();
  if (offset) {
    $('html,body').animate(
      {
        scrollTop: offset.top,
      },
      speed,
    );
  }
};

tinyLib.goToByScrollTop = function (speed = 'slow') {
  $('html,body').animate(
    {
      scrollTop: 0,
    },
    speed,
  );
};

tinyLib.isPageTop = function () {
  return $(window).scrollTop() + $(window).height() === $(document).height();
};

tinyLib.isPageBottom = function () {
  return window.innerHeight + window.scrollY >= document.body.offsetHeight;
};

// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
tinyLib.shuffle = function (array) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }

  return array;
};

// Rule 3
tinyLib.rule3 = function (val1, val2, val3, inverse) {
  if (inverse == true) {
    return Number(val1 * val2) / val3;
  } else {
    return Number(val3 * val2) / val1;
  }
};

// Title Case
tinyLib.toTitleCase = function (str) {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

// Remove AI tags
tinyLib.removeAiTags = function (str) {
  return str.replace(/\<ai\>|\<\/ai\>/g, '');
};

// Boolean Checker
tinyLib.booleanCheck = function (value) {
  if (
    typeof value !== 'undefined' &&
    (value === 'true' || value === '1' || value === true || value === 1 || value === 'on')
  ) {
    return true;
  } else {
    return false;
  }
};

tinyLib.formatTimer = function (seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

tinyLib.formatDayTimer = function (seconds) {
  const days = Math.floor(seconds / (24 * 3600));
  seconds %= 24 * 3600;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  // Build the display string with the conditions
  let timeString = '';

  if (days > 0) {
    timeString += `${days}d `;
  }
  timeString += `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;

  return timeString.trim();
};

tinyLib.getGitUrlPath = function (text, type = 'g') {
  const tinyUrl = `https\\:\\/\\/github.com\\/${storyCfg.github.account}\\/${storyCfg.github.repository}\\/blob\\/main\\/`;
  return new RegExp(typeof text === 'string' ? text.replace('{url}', tinyUrl) : tinyUrl, type);
};

// Visible Item
$.fn.isInViewport = function () {
  const elementTop = $(this).offset().top;
  const elementBottom = elementTop + $(this).outerHeight();

  const viewportTop = $(window).scrollTop();
  const viewportBottom = viewportTop + $(window).height();

  return elementBottom > viewportTop && elementTop < viewportBottom;
};

$.fn.isScrolledIntoView = function () {
  const docViewTop = $(window).scrollTop();
  const docViewBottom = docViewTop + $(window).height();

  const elemTop = $(this).offset().top;
  const elemBottom = elemTop + $(this).height();

  return elemBottom <= docViewBottom && elemTop >= docViewTop;
};

$.fn.visibleOnWindow = function () {
  // Don't include behind the header
  const header = $('#md-navbar');
  let headerOffset = 0;
  if (header) {
    headerOffset = header.outerHeight();
  }

  let element = $(this);
  if (element) {
    element = element[0];
    if (element) {
      let position = element.getBoundingClientRect();
      if (
        position &&
        typeof position.top === 'number' &&
        typeof position.bottom === 'number' &&
        typeof window.innerHeight === 'number'
      ) {
        // checking whether fully visible
        if (position.top >= headerOffset && position.bottom <= window.innerHeight) {
          return 'full';
        }

        // checking for partial visibility
        else if (position.top < window.innerHeight && position.bottom >= headerOffset) {
          return 'partial';
        }

        // Nothing
        else {
          return null;
        }
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
};

tinyLib.lastScrollTime = 0;
window.addEventListener('scroll', function () {
  tinyLib.lastScrollTime = new Date().getTime();
});
tinyLib.afterScrollQueue = [];
(tinyLib.afterScrollCheck = function () {
  requestAnimationFrame(tinyLib.afterScrollCheck);
  if (new Date().getTime() - tinyLib.lastScrollTime > 100) {
    while (tinyLib.afterScrollQueue.length) {
      tinyLib.afterScrollQueue.pop()();
    }
  }
})();
tinyLib.doAfterScroll = function (f) {
  tinyLib.lastScrollTime = new Date().getTime();
  tinyLib.afterScrollQueue.push(f);
};

// Icon
tinyLib.icon = (classItem) => $('<i>', { class: classItem });

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

  return $(`<${tag}>`, {
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
  $('<button>', {
    class: 'btn-close',
    type: 'button',
    'data-bs-dismiss': dataDismiss,
  });

// Navbar
tinyLib.bs.navbar = {};
tinyLib.bs.navbar.root = (id, theme = 'dark', isFixed = false) =>
  $('<nav>', {
    class: `navbar navbar-expand-lg navbar-${theme} bg-${theme}${isFixed ? ' fixed-top' : ''} px-4 py-0 tiny-navabar-style`,
    id,
  });

tinyLib.bs.navbar.title = (text, href) =>
  $('<a>', {
    class: 'navbar-brand',
    href,
    text,
  });

tinyLib.bs.navbar.collapse = (dir, className, id, content) =>
  $('<div>', {
    class: `collapse navbar-collapse navbar-nav-${dir}${className ? ` ${className}` : ''}`,
    id,
  }).append(
    $('<ul>', {
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
  const body = $('<div>', {
    class: 'offcanvas-body',
  });

  if (!Array.isArray(content)) body.append(content);
  else for (const index in content) body.append(content[index]);

  return $('<div>', {
    class: `offcanvas offcanvas-${where}`,
    tabindex: tabIndex,
    id,
  }).append(
    $('<div>', { class: 'offcanvas-header' }).append(
      title
        ? $('<h5>', {
            class: 'offcanvas-title',
            id: `${id}Label`,
          }).text(title)
        : null,
      !closeButtonInverse && tinyLib.bs.closeButton('offcanvas'),
      body,
      closeButtonInverse && tinyLib.bs.closeButton('offcanvas'),
    ),
  );
};

// Container
tinyLib.bs.container = (id = null, classItems = null, tag = 'div') =>
  $(`<${tag}>`, {
    id,
    class: `container${classItems ? ` ${classItems}` : ''}`,
  });

// Alert
tinyLib.bs.alert = (type = 'primary', content = null, isDismissible = false) => {
  const result = $('<div>', {
    class: `alert alert-${type}${isDismissible ? ` alert-dismissible fade show` : ''}`,
    role: 'alert',
  });
  result.append(content);
  if (isDismissible) result.append(tinyLib.bs.closeButton('alert'));
  return result;
};

// Dropdown
tinyLib.bs.dropdownClick = (place, data, callbackInsert) => {
  const rootBase = $('<ul>', { class: 'dropdown-menu show' });
  const element = tippy(place.get(0), {
    content: rootBase.get(0),
    allowHTML: true,
    interactive: true,
    arrow: false,
    theme: 'dark-border',
    placement: 'bottom-start',
    trigger: 'click',
    hideOnClick: true,
    appendTo: () => $('body > #root').get(0),
  });

  for (const index in data) {
    const li = $('<li>');
    rootBase.append(li);
    callbackInsert(li, element, data[index], index);
  }
};
