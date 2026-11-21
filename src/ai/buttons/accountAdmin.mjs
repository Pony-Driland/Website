import TinyHtml from 'tiny-essentials/libs/html/TinyHtml';
import { alert } from 'tiny-essentials/webTemplates/bootstrap/5.3/html/BootstrapDialogs';

import { tinyIo } from '../software/base.mjs';
import tinyLib from '../../files/tinyLib.mjs';

/**
 * @typedef {Object} AccountAdminRow
 * @property {TinyHtmlAny} $row - Row element.
 * @property {TinyHtmlAny} $status - Status badge of the row.
 */

/**
 * Opens the server account administration modal.
 *
 * The server exposes three owner/moderator only events that had no UI yet:
 * `ban`, `unban` and `kick`. They all work on a user id, so the modal is a
 * single input plus one button per action.
 *
 * Does nothing when there is no active socket client.
 *
 * @returns {void}
 */
export const openAccountAdmin = () => {
  const client = tinyIo.client;
  if (!client) return;

  const user = client.getUser() || {};
  const $root = TinyHtml.createFrom('div');

  // Only the server owner and the server moderators can use these events.
  if (!user.isAdmin && !user.isMod) {
    $root.append(tinyLib.bs.alert('warning', 'Only the server staff can manage accounts.', false));
    tinyLib.modal({
      title: 'Account manager',
      dialog: 'modal-lg',
      id: 'account-admin',
      body: $root,
    });
    return;
  }

  // Error place
  const $errorBox = tinyLib.bs.alert('danger', '', false).addClass('d-none');

  /** @param {string} msg */
  const showError = (msg) => $errorBox.setHtml(msg).removeClass('d-none');
  const clearError = () => $errorBox.addClass('d-none');

  // User id
  const $userIdGroup = TinyHtml.createFrom('div').addClass('mb-3');
  const $userId = TinyHtml.createFrom('input')
    .addClass('form-control')
    .setAttr({
      type: 'text',
      id: 'account-admin-user-id',
      placeholder: 'User ID',
      maxLength: client.getRateLimit().size?.userId,
    })
    .on('input', clearError);

  $userIdGroup.append(
    TinyHtml.createFrom('label')
      .addClass('form-label')
      .setAttr('for', 'account-admin-user-id')
      .setText('User ID'),
    $userId,
  );

  // Ban reason
  const $reasonGroup = TinyHtml.createFrom('div').addClass('mb-3');
  const $reason = TinyHtml.createFrom('input')
    .addClass('form-control')
    .setAttr({
      type: 'text',
      id: 'account-admin-reason',
      placeholder: 'Reason (used by the ban)',
    })
    .on('input', clearError);

  $reasonGroup.append(
    TinyHtml.createFrom('label')
      .addClass('form-label')
      .setAttr('for', 'account-admin-reason')
      .setText('Reason'),
    $reason,
  );

  // Actions
  const $actions = TinyHtml.createFrom('div').addClass('d-flex flex-wrap gap-2');
  const $kick = tinyLib.bs.button('warning').setText('Kick');
  const $ban = tinyLib.bs.button('danger').setText('Ban');
  const $unban = tinyLib.bs.button('success').setText('Unban');
  $actions.append($kick, $ban, $unban);

  /**
   * Runs an account action, keeping the buttons disabled while it is running.
   *
   * @param {() => Promise<{ error?: boolean, msg?: string }>} action - Request to run.
   * @param {string} successMessage - Message shown when the request succeeds.
   * @returns {Promise<void>}
   */
  const run = async (action, successMessage) => {
    clearError();
    $actions.addClass('disabled');
    try {
      const result = await action();
      if (result && result.error) showError(result.msg ?? 'Unknown error');
      else alert(successMessage);
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
    } finally {
      $actions.removeClass('disabled');
    }
  };

  /** @returns {string} The trimmed user id, or an empty string. */
  const getUserId = () => {
    const userId = String($userId.val() ?? '').trim();
    if (!userId) showError('Please enter an user ID.');
    return userId;
  };

  $kick.on('click', () => {
    const userId = getUserId();
    if (!userId) return;
    run(() => client.kickAccount(userId), `The account "${userId}" has been kicked.`);
  });

  $ban.on('click', () => {
    const userId = getUserId();
    if (!userId) return;
    run(
      () => client.banAccount(userId, String($reason.val() ?? '').trim()),
      `The account "${userId}" has been banned.`,
    );
  });

  $unban.on('click', () => {
    const userId = getUserId();
    if (!userId) return;
    run(() => client.unbanAccount(userId), `The account "${userId}" has been unbanned.`);
  });

  // Build all
  $root.append($errorBox, $userIdGroup, $reasonGroup, $actions);

  // Create modal
  const { html } = tinyLib.modal({
    title: 'Account manager',
    dialog: 'modal-lg',
    id: 'account-admin',
    body: $root,
  });

  html.on('shown.bs.modal', () => $userId.trigger('focus'));
};
