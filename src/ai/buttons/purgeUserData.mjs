import TinyHtml from 'tiny-essentials/libs/html/TinyHtml';

import { tinyIo } from '../software/base.mjs';
import tinyLib from '../../files/tinyLib.mjs';

/**
 * Options offered by the purge window selector.
 *
 * `hours`, `days` and `count` open an extra number input, the other ones are
 * applied straight away.
 *
 * @type {{ value: PurgeMode, label: string, unit: 'hours'|'days'|'count'|null, fallback: number }[]}
 */
const PURGE_OPTIONS = [
  { value: 'none', label: 'No records', unit: null, fallback: 0 },
  { value: 'hours', label: '1 hour ago', unit: 'hours', fallback: 1 },
  { value: 'hours', label: '6 hours ago', unit: 'hours', fallback: 6 },
  { value: 'hours', label: '12 hours ago', unit: 'hours', fallback: 12 },
  { value: 'hours', label: '24 hours ago', unit: 'hours', fallback: 24 },
  { value: 'days', label: '3 days ago', unit: 'days', fallback: 3 },
  { value: 'days', label: '7 days ago', unit: 'days', fallback: 7 },
  { value: 'hours', label: 'Custom (hours)', unit: 'hours', fallback: 2 },
  { value: 'days', label: 'Custom (days)', unit: 'days', fallback: 2 },
  { value: 'count', label: 'Custom (data amount)', unit: 'count', fallback: 100 },
  { value: 'all', label: 'All records', unit: null, fallback: 0 },
];

/**
 * Opens the purge window picker.
 *
 * The same dialog is used by the messages and by the dice history, so the
 * caller only has to say what it is about and how to run the request.
 *
 * @param {Object} options - Dialog options.
 * @param {string} options.id - Element id of the modal.
 * @param {string} options.title - Modal title.
 * @param {string} options.description - Text shown above the selector.
 * @param {string} options.confirmLabel - Label of the confirm button.
 * @param {(userId: string, mode: PurgeMode, amount?: number) => Promise<{ error?: boolean, msg?: string, deleted?: number }>} options.onConfirm - Runs the purge.
 * @returns {void}
 */
export const openPurgeUserData = ({ id, title, description, confirmLabel, onConfirm }) => {
  const client = tinyIo.client;
  if (!client) return;

  const $root = TinyHtml.createFrom('div');

  // User id
  const $userInput = TinyHtml.createFrom('input', {
    type: 'text',
    class: 'form-control',
    placeholder: 'Enter the user ID',
  });

  // Window
  const $select = TinyHtml.createFrom('select', { class: 'form-select' });
  PURGE_OPTIONS.forEach((option, index) => {
    $select.append(TinyHtml.createFrom('option', { value: String(index) }).setText(option.label));
  });

  // Custom amount
  const $amount = TinyHtml.createFrom('input', {
    type: 'number',
    class: 'form-control',
    min: '1',
    value: '1',
  });
  const $amountWrapper = TinyHtml.createFrom('div').addClass('mt-2 d-none').append($amount);

  const syncAmount = () => {
    const option = PURGE_OPTIONS[Number($select.val())] ?? PURGE_OPTIONS[0];
    const isCustom = option.label.startsWith('Custom');
    $amountWrapper.toggleClass('d-none', !isCustom);
    if (isCustom) $amount.setAttr('min', '1').setVal(String(option.fallback));
  };

  $select.on('change', syncAmount);

  // Feedback
  const $feedback = TinyHtml.createFrom('div').addClass('small mt-2');

  $root.append(
    TinyHtml.createFrom('label').addClass('form-label').setText('User ID'),
    $userInput,
    TinyHtml.createFrom('label').addClass('form-label mt-3').setText('Delete records'),
    $select,
    $amountWrapper,
    $feedback,
  );

  const { html, modal } = tinyLib.modal({
    title,
    dialog: 'modal-lg',
    id,
    body: [TinyHtml.createFrom('p').addClass('text-muted small').setText(description), $root],
  });

  const $confirm = tinyLib.bs.button('danger w-100 mt-3').setText(confirmLabel);
  $root.append($confirm);

  $confirm.on('click', async () => {
    const userId = String($userInput.val() ?? '').trim();
    if (!userId) {
      $feedback.removeClass('text-success').addClass('text-danger').setText('Enter an user ID.');
      return;
    }

    const option = PURGE_OPTIONS[Number($select.val())] ?? PURGE_OPTIONS[0];
    if (option.value === 'none') {
      $feedback
        .removeClass('text-success')
        .addClass('text-danger')
        .setText('Pick a window other than "No records".');
      return;
    }

    const amount = option.label.startsWith('Custom') ? Number($amount.val()) : option.fallback;
    if (option.label.startsWith('Custom') && (!Number.isFinite(amount) || amount < 1)) {
      $feedback.addClass('text-danger').removeClass('text-success').setText('Invalid amount.');
      return;
    }

    $confirm.addProp('disabled');
    $feedback.removeClass('text-danger text-success').setText('Deleting...');

    try {
      const result = await onConfirm(userId, option.value, amount);
      if (result?.error) {
        $feedback
          .removeClass('text-success')
          .addClass('text-danger')
          .setText(result.msg ?? 'Unknown error.');
        return;
      }

      $feedback
        .removeClass('text-danger')
        .addClass('text-success')
        .setText(`${result?.deleted ?? 0} record(s) deleted.`);
    } catch (err) {
      $feedback
        .removeClass('text-success')
        .addClass('text-danger')
        .setText(err instanceof Error ? err.message : String(err));
    } finally {
      $confirm.removeProp('disabled').removeClass('disabled');
    }
  });

  html.on('shown.bs.modal', () => $userInput.trigger('focus'));
  modal.show();
};

export default openPurgeUserData;
