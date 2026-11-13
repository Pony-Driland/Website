import TinyHtml from 'tiny-essentials/libs/html/TinyHtml';

import { tinyIo } from '../software/base.mjs';
import tinyLib from '../../files/tinyLib.mjs';

/**
 * @typedef {Object} OnlineUser
 * @property {string} userId - Account id.
 * @property {string|null} nickname - Display name.
 * @property {string[]} rooms - Rooms the user is connected to.
 */

/**
 * Opens the online user list.
 *
 * The list refreshes itself whenever somebody joins or leaves a room, so the
 * modal always shows the current state of the server.
 *
 * @returns {void}
 */
export const openOnlineUsers = () => {
  const client = tinyIo.client;
  if (!client) return;

  const user = client.getUser() || {};
  const isStaff = Boolean(user.isAdmin || user.isMod);

  const $root = TinyHtml.createFrom('div');
  const $errorBox = tinyLib.bs.alert('danger', '', false).addClass('d-none');
  const $list = TinyHtml.createFrom('div').addClass('mt-3');

  const $search = TinyHtml.createFrom('input')
    .addClass('form-control')
    .setAttr({ type: 'search', placeholder: 'Search users...' });

  /** @type {OnlineUser[]} */
  let users = [];
  let loading = false;
  let destroyed = false;

  /** @param {string} msg */
  const showError = (msg) => $errorBox.removeClass('d-none').setText(msg);
  const clearError = () => $errorBox.addClass('d-none');

  /** Renders the current user list. */
  const render = () => {
    $list.empty();

    if (loading) {
      $list.append(TinyHtml.createFrom('div').addClass('text-muted').setText('Loading...'));
      return;
    }

    if (users.length < 1) {
      $list.append(TinyHtml.createFrom('div').addClass('text-muted').setText('No users found.'));
      return;
    }

    for (const item of users) {
      const $row = TinyHtml.createFrom('div').addClass(
        'd-flex align-items-center gap-2 border-bottom py-2',
      );

      const $info = TinyHtml.createFrom('div').addClass('flex-grow-1');
      $info.append(
        TinyHtml.createFrom('strong').setText(item.nickname || item.userId),
        TinyHtml.createFrom('div')
          .addClass('small text-muted')
          .setText(
            item.rooms.length > 0 ? `${item.userId} - ${item.rooms.join(', ')}` : item.userId,
          ),
      );

      $row.append($info);
      $list.append($row);
    }
  };

  /** Loads the online user list from the server. */
  const load = async () => {
    if (destroyed) return;
    loading = true;
    clearError();
    render();

    try {
      const result = await client.listUsers(String($search.val() ?? '').trim() || null);
      if (destroyed) return;
      if (result.error) showError(result.msg ?? 'Unknown error');
      users = Array.isArray(result.users) ? result.users : [];
    } catch (err) {
      if (destroyed) return;
      showError(err instanceof Error ? err.message : String(err));
      users = [];
    } finally {
      if (destroyed) return;
      loading = false;
      render();
    }
  };

  // Build all
  $root.append($errorBox, $search, $list);

  if (!isStaff) {
    $root
      .empty()
      .append(
        tinyLib.bs.alert('warning', 'Only the server staff can see the online users.', false),
      );
  }

  const { html } = tinyLib.modal({
    title: 'Online users',
    dialog: 'modal-lg',
    id: 'online-users',
    body: $root,
  });

  if (!isStaff) return;

  /** @type {ReturnType<typeof setTimeout>|null} */
  let searchTimer = null;
  $search.on('input', () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(load, 300);
  });

  // Real time updates: any presence change refreshes the list.
  const refresh = () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(load, 200);
  };

  client.on('userJoined', refresh);
  client.on('userLeft', refresh);
  client.on('userKicked', refresh);
  client.on('userBanned', refresh);

  html.on('hidden.bs.modal', () => {
    destroyed = true;
    if (searchTimer) clearTimeout(searchTimer);
    client.off('userJoined', refresh);
    client.off('userLeft', refresh);
    client.off('userKicked', refresh);
    client.off('userBanned', refresh);
  });

  load();
};
