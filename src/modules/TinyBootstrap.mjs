import {
  Modal as BsModal,
  Tooltip as BsTooltip,
  Alert as BsAlert,
  Button as BsButton,
  Carousel as BsCarousel,
  Collapse as BsCollapse,
  Dropdown as BsDropdown,
  Offcanvas as BsOffcanvas,
  Popover as BsPopover,
  ScrollSpy as BsScrollSpy,
  Tab as BsTab,
  Toast as BsToast,
} from 'bootstrap';
import { TinyHtml } from 'tiny-essentials';

/**
 * Initializes and returns a Bootstrap Modal instance bound to a TinyHtml element.
 *
 * @param {TinyHtml<any>} instance - A TinyHtml element wrapper. Must contain a valid DOM element.
 * @param {Partial<BsModal.Options>} [options] - Configuration options for the Bootstrap Modal.
 * @param {boolean} [autoStart=false] - Whether the modal should be shown immediately after initialization.
 * @returns {BsModal} The initialized Bootstrap Modal instance.
 * @throws {TypeError} If `instance` is not a TinyHtml instance.
 * @throws {Error} If `instance` does not wrap a valid DOM Element.
 */
export function Modal(instance, options, autoStart = false) {
  if (!(instance instanceof TinyHtml))
    throw new TypeError("Modal: 'instance' must be an instance of TinyHtml.");
  const el = instance.get(0);
  if (!(el instanceof Element))
    throw new Error('Modal: TinyHtml instance must wrap a valid DOM Element.');
  instance.setData('BootstrapModal', new BsModal(el, options));

  /** @type {BsModal} */
  const modal = instance.data('BootstrapModal');
  if (autoStart) modal.show();
  return modal;
}

/**
 * Initializes and returns a Bootstrap Tooltip instance bound to a TinyHtml element.
 *
 * @param {TinyHtml<any>} instance - A TinyHtml element wrapper. Must contain a valid DOM element.
 * @param {Partial<BsTooltip.Options>} [options] - Configuration options for the Bootstrap Tooltip.
 * @returns {BsTooltip} The initialized Bootstrap Tooltip instance.
 * @throws {TypeError} If `instance` is not a TinyHtml instance.
 * @throws {Error} If `instance` does not wrap a valid DOM Element.
 */
export function Tooltip(instance, options) {
  if (!(instance instanceof TinyHtml))
    throw new TypeError("Tooltip: 'instance' must be an instance of TinyHtml.");
  const el = instance.get(0);
  if (!(el instanceof Element))
    throw new Error('Tooltip: TinyHtml instance must wrap a valid DOM Element.');
  instance.setData('BootstrapToolTip', new BsTooltip(el, options));

  /** @type {BsTooltip} */
  const tooltip = instance.data('BootstrapToolTip');
  return tooltip;
}

/**
 * Initializes and returns a Bootstrap Alert instance bound to a TinyHtml element.
 *
 * @param {TinyHtml<any>} instance - A TinyHtml element wrapper. Must contain a valid DOM element.
 * @returns {BsAlert} The initialized Bootstrap Alert instance.
 * @throws {TypeError} If `instance` is not a TinyHtml instance.
 * @throws {Error} If `instance` does not wrap a valid DOM Element.
 */
export function Alert(instance) {
  if (!(instance instanceof TinyHtml))
    throw new TypeError("Alert: 'instance' must be an instance of TinyHtml.");
  const el = instance.get(0);
  if (!(el instanceof Element))
    throw new Error('Alert: TinyHtml instance must wrap a valid DOM Element.');
  instance.setData('BootstrapAlert', new BsAlert(el));

  /** @type {BsAlert} */
  return instance.data('BootstrapAlert');
}

/**
 * Initializes and returns a Bootstrap Button instance bound to a TinyHtml element.
 *
 * @param {TinyHtml<any>} instance - A TinyHtml element wrapper. Must contain a valid DOM element.
 * @returns {BsButton} The initialized Bootstrap Button instance.
 * @throws {TypeError} If `instance` is not a TinyHtml instance.
 * @throws {Error} If `instance` does not wrap a valid DOM Element.
 */
export function Button(instance) {
  if (!(instance instanceof TinyHtml))
    throw new TypeError("Button: 'instance' must be an instance of TinyHtml.");
  const el = instance.get(0);
  if (!(el instanceof Element))
    throw new Error('Button: TinyHtml instance must wrap a valid DOM Element.');
  instance.setData('BootstrapButton', new BsButton(el));

  /** @type {BsButton} */
  return instance.data('BootstrapButton');
}

/**
 * Initializes and returns a Bootstrap Carousel instance bound to a TinyHtml element.
 *
 * @param {TinyHtml<any>} instance - A TinyHtml element wrapper. Must contain a valid DOM element.
 * @param {Partial<BsCarousel.Options>} [options] - Configuration options for the Bootstrap Carousel.
 * @returns {BsCarousel} The initialized Bootstrap Carousel instance.
 * @throws {TypeError} If `instance` is not a TinyHtml instance.
 * @throws {Error} If `instance` does not wrap a valid DOM Element.
 */
export function Carousel(instance, options) {
  if (!(instance instanceof TinyHtml))
    throw new TypeError("Carousel: 'instance' must be an instance of TinyHtml.");
  const el = instance.get(0);
  if (!(el instanceof Element))
    throw new Error('Carousel: TinyHtml instance must wrap a valid DOM Element.');
  instance.setData('BootstrapCarousel', new BsCarousel(el, options));

  /** @type {BsCarousel} */
  return instance.data('BootstrapCarousel');
}

/**
 * Initializes and returns a Bootstrap Collapse instance bound to a TinyHtml element.
 *
 * @param {TinyHtml<any>} instance - A TinyHtml element wrapper. Must contain a valid DOM element.
 * @param {Partial<BsCollapse.Options>} [options] - Configuration options for the Bootstrap Collapse.
 * @returns {BsCollapse} The initialized Bootstrap Collapse instance.
 * @throws {TypeError} If `instance` is not a TinyHtml instance.
 * @throws {Error} If `instance` does not wrap a valid DOM Element.
 */
export function Collapse(instance, options) {
  if (!(instance instanceof TinyHtml))
    throw new TypeError("Collapse: 'instance' must be an instance of TinyHtml.");
  const el = instance.get(0);
  if (!(el instanceof Element))
    throw new Error('Collapse: TinyHtml instance must wrap a valid DOM Element.');
  instance.setData('BootstrapCollapse', new BsCollapse(el, options));

  /** @type {BsCollapse} */
  return instance.data('BootstrapCollapse');
}

/**
 * Initializes and returns a Bootstrap Dropdown instance bound to a TinyHtml element.
 *
 * @param {TinyHtml<any>} instance - A TinyHtml element wrapper. Must contain a valid DOM element.
 * @param {Partial<BsDropdown.Options>} [options] - Configuration options for the Bootstrap Dropdown.
 * @returns {BsDropdown} The initialized Bootstrap Dropdown instance.
 * @throws {TypeError} If `instance` is not a TinyHtml instance.
 * @throws {Error} If `instance` does not wrap a valid DOM Element.
 */
export function Dropdown(instance, options) {
  if (!(instance instanceof TinyHtml))
    throw new TypeError("Dropdown: 'instance' must be an instance of TinyHtml.");
  const el = instance.get(0);
  if (!(el instanceof Element))
    throw new Error('Dropdown: TinyHtml instance must wrap a valid DOM Element.');
  instance.setData('BootstrapDropdown', new BsDropdown(el, options));

  /** @type {BsDropdown} */
  return instance.data('BootstrapDropdown');
}

/**
 * Initializes and returns a Bootstrap Offcanvas instance bound to a TinyHtml element.
 *
 * @param {TinyHtml<any>} instance - A TinyHtml element wrapper. Must contain a valid DOM element.
 * @param {Partial<BsOffcanvas.Options>} [options] - Configuration options for the Bootstrap Offcanvas.
 * @param {boolean} [autoStart=false] - Whether the offcanvas should be shown immediately after initialization.
 * @returns {BsOffcanvas} The initialized Bootstrap Offcanvas instance.
 * @throws {TypeError} If `instance` is not a TinyHtml instance.
 * @throws {Error} If `instance` does not wrap a valid DOM Element.
 */
export function Offcanvas(instance, options, autoStart = false) {
  if (!(instance instanceof TinyHtml))
    throw new TypeError("Offcanvas: 'instance' must be an instance of TinyHtml.");
  const el = instance.get(0);
  if (!(el instanceof Element))
    throw new Error('Offcanvas: TinyHtml instance must wrap a valid DOM Element.');
  instance.setData('BootstrapOffcanvas', new BsOffcanvas(el, options));

  /** @type {BsOffcanvas} */
  const offcanvas = instance.data('BootstrapOffcanvas');
  if (autoStart) offcanvas.show();
  return offcanvas;
}

/**
 * Initializes and returns a Bootstrap Popover instance bound to a TinyHtml element.
 *
 * @param {TinyHtml<any>} instance - A TinyHtml element wrapper. Must contain a valid DOM element.
 * @param {Partial<BsPopover.Options>} [options] - Configuration options for the Bootstrap Popover.
 * @returns {BsPopover} The initialized Bootstrap Popover instance.
 * @throws {TypeError} If `instance` is not a TinyHtml instance.
 * @throws {Error} If `instance` does not wrap a valid DOM Element.
 */
export function Popover(instance, options) {
  if (!(instance instanceof TinyHtml))
    throw new TypeError("Popover: 'instance' must be an instance of TinyHtml.");
  const el = instance.get(0);
  if (!(el instanceof Element))
    throw new Error('Popover: TinyHtml instance must wrap a valid DOM Element.');
  instance.setData('BootstrapPopover', new BsPopover(el, options));

  /** @type {BsPopover} */
  return instance.data('BootstrapPopover');
}

/**
 * Initializes and returns a Bootstrap ScrollSpy instance bound to a TinyHtml element.
 *
 * @param {TinyHtml<any>} instance - A TinyHtml element wrapper. Must contain a valid DOM element.
 * @param {Partial<BsScrollSpy.Options>} [options] - Configuration options for the Bootstrap ScrollSpy.
 * @returns {BsScrollSpy} The initialized Bootstrap ScrollSpy instance.
 * @throws {TypeError} If `instance` is not a TinyHtml instance.
 * @throws {Error} If `instance` does not wrap a valid DOM Element.
 */
export function ScrollSpy(instance, options) {
  if (!(instance instanceof TinyHtml))
    throw new TypeError("ScrollSpy: 'instance' must be an instance of TinyHtml.");
  const el = instance.get(0);
  if (!(el instanceof Element))
    throw new Error('ScrollSpy: TinyHtml instance must wrap a valid DOM Element.');
  instance.setData('BootstrapScrollSpy', new BsScrollSpy(el, options));

  /** @type {BsScrollSpy} */
  return instance.data('BootstrapScrollSpy');
}

/**
 * Initializes and returns a Bootstrap Tab instance bound to a TinyHtml element.
 *
 * @param {TinyHtml<any>} instance - A TinyHtml element wrapper. Must contain a valid DOM element.
 * @returns {BsTab} The initialized Bootstrap Tab instance.
 * @throws {TypeError} If `instance` is not a TinyHtml instance.
 * @throws {Error} If `instance` does not wrap a valid DOM Element.
 */
export function Tab(instance) {
  if (!(instance instanceof TinyHtml))
    throw new TypeError("Tab: 'instance' must be an instance of TinyHtml.");
  const el = instance.get(0);
  if (!(el instanceof Element))
    throw new Error('Tab: TinyHtml instance must wrap a valid DOM Element.');
  instance.setData('BootstrapTab', new BsTab(el));

  /** @type {BsTab} */
  return instance.data('BootstrapTab');
}

/**
 * Initializes and returns a Bootstrap Toast instance bound to a TinyHtml element.
 *
 * @param {TinyHtml<any>} instance - A TinyHtml element wrapper. Must contain a valid DOM element.
 * @param {Partial<BsToast.Options>} [options] - Configuration options for the Bootstrap Toast.
 * @param {boolean} [autoStart=false] - Whether the toast should be shown immediately after initialization.
 * @returns {BsToast} The initialized Bootstrap Toast instance.
 * @throws {TypeError} If `instance` is not a TinyHtml instance.
 * @throws {Error} If `instance` does not wrap a valid DOM Element.
 */
export function Toast(instance, options, autoStart = false) {
  if (!(instance instanceof TinyHtml))
    throw new TypeError("Toast: 'instance' must be an instance of TinyHtml.");
  const el = instance.get(0);
  if (!(el instanceof Element))
    throw new Error('Toast: TinyHtml instance must wrap a valid DOM Element.');
  instance.setData('BootstrapToast', new BsToast(el, options));

  /** @type {BsToast} */
  const toast = instance.data('BootstrapToast');
  if (autoStart) toast.show();
  return toast;
}
