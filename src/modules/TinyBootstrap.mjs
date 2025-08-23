import { Modal as BsModal, Tooltip as BsTooltip } from 'bootstrap';
import { TinyHtml } from 'tiny-essentials';

/**
 * Initializes and returns a Bootstrap Modal instance bound to a TinyHtml element.
 *
 * @param {TinyHtml} instance - A TinyHtml element wrapper. Must contain a valid DOM element.
 * @param {BsModal.Options} options - Configuration options for the Bootstrap Modal.
 * @param {boolean} [autoStart=false] - Whether the modal should be shown immediately after initialization.
 * @returns {BsModal} The initialized Bootstrap Modal instance.
 * @throws {TypeError} If `instance` is not a TinyHtml instance.
 * @throws {Error} If `instance` does not wrap a valid DOM Element.
 */
export function Modal(instance, options, autoStart = false) {
  if (!(instance instanceof TinyHtml))
    throw new TypeError("Tooltip: 'instance' must be an instance of TinyHtml.");
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
 * @param {TinyHtml} instance - A TinyHtml element wrapper. Must contain a valid DOM element.
 * @param {BsTooltip.Options} options - Configuration options for the Bootstrap Tooltip.
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
