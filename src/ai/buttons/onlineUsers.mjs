import TinyHtml from 'tiny-essentials/libs/html/TinyHtml';
import { prompt } from 'tiny-essentials/webTemplates/bootstrap/5.3/html/BootstrapDialogs';

import { tinyIo } from '../software/base.mjs';
import tinyLib from '../../files/tinyLib.mjs';

/**
 * @typedef {Object} ServerUser
 * @property {string} userId - Account id.
 * @property {string|null} nickname - Display name.
 * @property {boolean} online - Whether the account is connected.
 * @property {string[]} rooms - Rooms the account is connected to.
 * @property {boolean} banned - Whether the account is banned.
 * @property {string|null} banReason - Reason of the ban.
 * @property {boolean} isMod - Whether the account is a server moderator.
 * @property {boolean} isOwner - Whether the account is the server owner.
 */

/**
 * Builds a small badge with an icon and an optional label.
 *
 * @param {string} icon - Font Awesome class list.
 * @param {string} title - Tooltip of the badge.
 * @param {string} color - Bootstrap color of the badge.
 * @param {string} [text] - Optional label.
 * @returns {TinyHtmlAny}
 */
const makeBadge = (icon, title, color, text) => {
  const $badge = TinyHtml.createFrom('span')
    .addClass(`badge bg-${color} me-1`)
    .setAttr('title', title)
    .append(TinyHtml.createFrom('i').addClass(icon));

  if (typeof text === 'string') $badge.append(TinyHtml.createFrom('span').setText(` ${text}`));
  return $badge;
};

/**
 * Opens the account manager.
 *
 * The list starts with the online users and can be expanded to every account
 * of the server. Only the server staff can open it.
 *
 * @returns {void}
 */
export const openOnlineUsers = () => {
  const client = tinyIo.client;
  if (!client) return;

  const me = client.getUser() || {};
  const isStaff = Boolean(me.isAdmin || me.isMod);
  const isOwner = Boolean(me.isAdmin);

  const $root = TinyHtml.createFrom('div');
  const $errorBox = tinyLib.bs.alert('danger', '', false).addClass('d-none');
  const $list = TinyHtml.createFrom('div').addClass('mt-3');
  const $pagination = TinyHtml.createFrom('div').addClass(
    'd-flex justify-content-between align-items-center mt-3',
  );

  const $search = TinyHtml.createFrom('input')
    .addClass('form-control')
    .setAttr({ type: 'search', placeholder: 'Search users...' });

  /** @type {ServerUser[]} */
  let users = [];
  let loading = false;
  let destroyed = false;
  let page = 1;
  let totalPages = 1;
  let all = false;
  let bannedOnly = false;

  /** @param {string} msg */
  const showError = (msg) => $errorBox.removeClass('d-none').setText(msg);
  const clearError = () => $errorBox.addClass('d-none');

  /** Renders the current account list. */
  const render = () => {
    $list.empty();
    $pagination.empty();

    if (loading) {
      $list.append(TinyHtml.createFrom('div').addClass('text-muted').setText('Loading...'));
      return;
    }

    if (users.length < 1) {
      $list.append(TinyHtml.createFrom('div').addClass('text-muted').setText('No users found.'));
      return;
    }

    for (const user of users) {
      const $row = TinyHtml.createFrom('div').addClass(
        'd-flex flex-wrap align-items-center gap-2 border-bottom py-2',
      );

      // Name + metadata
      const $info = TinyHtml.createFrom('div').addClass('flex-grow-1');
      const $badges = TinyHtml.createFrom('div').addClass('mt-1');

      $badges.append(
        user.online
          ? makeBadge('fas fa-circle', 'Online', 'success')
          : makeBadge('fas fa-circle', 'Offline', 'secondary'),
      );

      if (user.isOwner) $badges.append(makeBadge('fas fa-crown', 'Server owner', 'warning'));
      else if (user.isMod) $badges.append(makeBadge('fas fa-shield-halved', 'Staff', 'info'));

      if (user.banned)
        $badges.append(
          makeBadge('fas fa-ban', user.banReason || 'Banned', 'danger', user.banReason || 'Banned'),
        );

      $badges.append(
        makeBadge(
          'fas fa-door-open',
          'Rooms',
          'dark',
          user.rooms.length > 0 ? user.rooms.join(', ') : 'No room',
        ),
      );

      $info.append(
        TinyHtml.createFrom('strong').setText(user.nickname || user.userId),
        TinyHtml.createFrom('div').addClass('small text-muted').setText(user.userId),
        $badges,
      );

      // Actions
      const $actions = TinyHtml.createFrom('div').addClass('d-flex flex-wrap gap-1');

      if (user.online)
        $actions.append(
          tinyLib.bs
            .button('warning btn-sm')
            .setText('Kick')
            .on('click', () => run(() => client.kickAccount(user.userId), 'User kicked.')),
        );

      if (user.banned)
        $actions.append(
          tinyLib.bs
            .button('success btn-sm')
            .setText('Unban')
            .on('click', () => run(() => client.unbanAccount(user.userId), 'User unbanned.')),
        );
      else
        $actions.append(
          tinyLib.bs
            .button('danger btn-sm')
            .setText('Ban')
            .on('click', async () => {
              const reason = await prompt(`Reason to ban "${user.userId}":`, '');
              if (reason === null) return;
              run(() => client.banAccount(user.userId, reason), 'User banned.');
            }),
        );

      // Only the server owner can promote or demote the staff.
      if (isOwner && !user.isOwner)
        $actions.append(
          tinyLib.bs
            .button(user.isMod ? 'secondary' : 'info')
            .addClass('btn-sm')
            .setText(user.isMod ? 'Demote' : 'Promote')
            .on('click', () =>
              run(
                () =>
                  user.isMod
                    ? client.demoteAccount(user.userId)
                    : client.promoteAccount(user.userId),
                user.isMod ? 'User demoted.' : 'User promoted.',
              ),
            ),
        );

      $row.append($info, $actions);
      $list.append($row);
    }

    // Pagination
    const $prev = tinyLib.bs.button('secondary btn-sm').setText('Previous');
    $prev.toggleProp('disabled', page <= 1);
    $prev.on('click', () => {
      if (page <= 1) return;
      page--;
      load();
    });

    const $next = tinyLib.bs.button('secondary btn-sm').setText('Next');
    $next.toggleProp('disabled', page >= totalPages);
    $next.on('click', () => {
      if (page >= totalPages) return;
      page++;
      load();
    });

    $pagination.append(
      $prev,
      TinyHtml.createFrom('span')
        .addClass('small text-muted')
        .setText(`Page ${page} / ${totalPages}`),
      $next,
    );
  };

  /**
   * Runs an account action and refreshes the list.
   *
   * @param {() => Promise<{ error?: boolean, msg?: string }>} action - Request to run.
   * @param {string} successMessage - Message shown when the request succeeds.
   * @returns {Promise<void>}
   */
  const run = async (action, successMessage) => {
    clearError();
    try {
      const result = await action();
      if (result && result.error) {
        showError(result.msg ?? 'Unknown error');
        return;
      }
      await load();
      if (successMessage) console.log(successMessage);
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
    }
  };

  /** Loads the account list from the server. */
  const load = async () => {
    if (destroyed) return;
    loading = true;
    clearError();
    render();

    try {
      const result = await client.listUsers({
        search: String($search.val() ?? '').trim() || null,
        all,
        bannedOnly,
        page,
        perPage: 20,
      });

      if (destroyed) return;
      if (result.error) showError(result.msg ?? 'Unknown error');
      users = Array.isArray(result.users) ? result.users : [];
      totalPages = typeof result.totalPages === 'number' ? result.totalPages : 1;
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
  $root.append($errorBox);

  if (!isStaff) {
    $root.append(
      tinyLib.bs.alert('warning', 'Only the server staff can see the online users.', false),
    );
  } else {
    const $header = TinyHtml.createFrom('div').addClass(
      'd-flex flex-wrap gap-2 align-items-center',
    );

    // Every account
    const $all = TinyHtml.createFrom('input').setAttr({
      type: 'checkbox',
      id: 'online-users-all',
    });
    $all.on('change', () => {
      all = Boolean($all.prop('checked'));
      page = 1;
      load();
    });

    $header.append(
      TinyHtml.createFrom('div')
        .addClass('form-check form-check-inline mb-0')
        .append(
          $all.addClass('form-check-input mt-0'),
          TinyHtml.createFrom('label')
            .addClass('form-check-label')
            .setAttr('for', 'online-users-all')
            .setText('All users'),
        ),
    );

    // Banned only
    const $banned = TinyHtml.createFrom('input').setAttr({
      type: 'checkbox',
      id: 'online-users-banned',
    });
    $banned.on('change', () => {
      bannedOnly = Boolean($banned.prop('checked'));
      page = 1;
      load();
    });

    $header.append(
      TinyHtml.createFrom('div')
        .addClass('form-check form-check-inline mb-0')
        .append(
          $banned.addClass('form-check-input mt-0'),
          TinyHtml.createFrom('label')
            .addClass('form-check-label')
            .setAttr('for', 'online-users-banned')
            .setText('Banned only'),
        ),
    );

    $header.append(TinyHtml.createFrom('div').addClass('flex-grow-1').append($search));
    $root.append($header);
  }

  $root.append($list, $pagination);

  const { html } = tinyLib.modal({
    title: 'Users',
    dialog: 'modal-lg',
    id: 'online-users',
    body: $root,
  });

  if (!isStaff) return;

  /** @type {ReturnType<typeof setTimeout>|null} */
  let searchTimer = null;
  $search.on('input', () => {
    page = 1;
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
