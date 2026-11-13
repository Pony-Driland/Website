import TinyHtml from 'tiny-essentials/libs/html/TinyHtml';
import { alert } from 'tiny-essentials/webTemplates/bootstrap/5.3/html/BootstrapDialogs';

import { tinyIo, tinyStorage } from '../software/base.mjs';
import tinyLib from '../../files/tinyLib.mjs';

/**
 * @typedef {Object} RoomBrowserEntry
 * @property {string} roomId - Room id.
 * @property {string} title - Room title.
 * @property {string} ownerId - Owner of the room.
 * @property {string|null} ownerNickname - Owner display name.
 * @property {number} chapter - Current chapter.
 * @property {number} users - Amount of users inside the room.
 * @property {number} maxUsers - Maximum amount of users.
 * @property {boolean} disabled - Whether the room is disabled.
 * @property {boolean} readOnly - Whether the room is read-only.
 * @property {boolean} hasPassword - Whether the room requires a password.
 * @property {boolean} isOwner - Whether the signed-in account owns the room.
 * @property {boolean} isModerator - Whether the signed-in account moderates the room.
 * @property {number|null} lastMessage - Date of the last message.
 */

/**
 * Formats a timestamp as a relative date.
 *
 * @param {number|null} value - Timestamp.
 * @returns {string}
 */
const formatDate = (value) => {
  if (typeof value !== 'number' || value < 1) return 'No messages yet';
  const diff = Date.now() - value;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
};

/**
 * Builds a small badge with an icon and an optional label.
 *
 * @param {string} icon - Font Awesome class list.
 * @param {string} title - Tooltip of the badge.
 * @param {string} [color] - Bootstrap color of the badge.
 * @returns {TinyHtmlAny}
 */
const makeBadge = (icon, title, color = 'secondary') =>
  TinyHtml.createFrom('span')
    .addClass(`badge bg-${color} me-1`)
    .setAttr('title', title)
    .append(TinyHtml.createFrom('i').addClass(icon));

/**
 * Asks for the room password and stores the new room in the credentials.
 *
 * The room is only changed in `localStorage`; the caller is responsible for
 * reloading the page so the connection is rebuilt from scratch.
 *
 * @param {string} roomId - Room that will be joined.
 */
const askPasswordAndStore = (roomId) => {
  const $root = TinyHtml.createFrom('div');

  const $input = TinyHtml.createFrom('input').addClass('form-control').setAttr({
    type: 'password',
    id: 'room-browser-password',
    placeholder: 'Leave empty if the room has no password',
  });

  $root.append(
    TinyHtml.createFrom('p').setText(
      `Enter the password of the room "${roomId}". Leave it empty if the room has no password.`,
    ),
    TinyHtml.createFrom('label')
      .addClass('form-label')
      .setAttr('for', 'room-browser-password')
      .setText('Room password'),
    $input,
  );

  const $join = tinyLib.bs.button('primary').addClass('w-100 mt-3').setText('Join room');
  $root.append($join);

  const { modal, html } = tinyLib.modal({
    title: 'Join room',
    dialog: 'modal-lg',
    id: 'room-browser-password',
    body: $root,
  });

  /** Stores the new room and reloads the page. */
  const submit = () => {
    const roomPassword = String($input.val() ?? '');

    try {
      // Written and verified before the reload, so a failed write never sends
      // the user back to the previous room.
      tinyStorage.setRoom(roomId, roomPassword);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
      return;
    }

    modal.hide();

    // Let Bootstrap finish hiding the modals before the page goes away.
    setTimeout(() => window.location.reload(), 0);
  };

  $join.on('click', submit);
  $input.on('keydown', (e) => {
    if (/** @type {KeyboardEvent} */ (e).key === 'Enter') {
      e.preventDefault();
      submit();
    }
  });

  html.on('shown.bs.modal', () => $input.trigger('focus'));
};

/**
 * Opens the "create room" form.
 *
 * The room is created on the server and the credentials are stored, so the
 * caller only has to reload the page.
 *
 * @param {() => void} onCreated - Called after the room is created.
 * @returns {void}
 */
const openCreateRoom = (onCreated) => {
  const client = tinyIo.client;
  if (!client) return;

  const ratelimit = client.getRateLimit() || { size: {} };
  const $root = TinyHtml.createFrom('div');
  const $errorBox = tinyLib.bs.alert('danger', '', false).addClass('d-none');

  const $roomId = TinyHtml.createFrom('input').addClass('form-control').setAttr({
    type: 'text',
    id: 'room-create-id',
    placeholder: 'Room id',
    maxLength: ratelimit.size?.roomId,
  });

  const $password = TinyHtml.createFrom('input').addClass('form-control').setAttr({
    type: 'password',
    id: 'room-create-password',
    placeholder: 'Room password',
    maxLength: ratelimit.size?.password,
  });

  const $submit = tinyLib.bs.button('primary').addClass('w-100 mt-3').setText('Create room');

  $root.append(
    $errorBox,
    TinyHtml.createFrom('label')
      .addClass('form-label')
      .setAttr('for', 'room-create-id')
      .setText('Room id'),
    $roomId,
    TinyHtml.createFrom('label')
      .addClass('form-label mt-3')
      .setAttr('for', 'room-create-password')
      .setText('Room password'),
    $password,
    $submit,
  );

  const { modal, html } = tinyLib.modal({
    title: 'Create room',
    dialog: 'modal-lg',
    id: 'room-create',
    body: $root,
  });

  /** @param {string} msg */
  const showError = (msg) => $errorBox.removeClass('d-none').setText(msg);

  const submit = async () => {
    const roomId = String($roomId.val() ?? '').trim();
    const password = String($password.val() ?? '');

    if (roomId.length < 1) return showError('Please enter a room id.');

    $submit.addProp('disabled');
    $errorBox.addClass('d-none');

    try {
      const result = await client.createRoom(roomId, roomId, password);
      if (result.error) return showError(result.msg ?? 'Unknown error');

      const credential = tinyStorage.getApiKey('tiny-chat');
      tinyStorage.setApiKey('tiny-chat', { ...credential, roomId, roomPassword: password });

      modal.hide();

      // Let Bootstrap finish hiding the modal before the page goes away.
      setTimeout(onCreated, 0);
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
    } finally {
      $submit.removeProp('disabled').removeClass('disabled');
    }
  };

  $submit.on('click', submit);
  $password.on('keydown', (e) => {
    if (/** @type {KeyboardEvent} */ (e).key === 'Enter') {
      e.preventDefault();
      submit();
    }
  });

  html.on('shown.bs.modal', () => $roomId.trigger('focus'));
};

/**
 * Opens the room browser.
 *
 * A regular account only sees the rooms it owns or already joined. The server
 * staff can switch the scope to search every room of the server instead.
 *
 * @returns {void}
 */
export const openRoomBrowser = () => {
  const client = tinyIo.client;
  if (!client) return;

  const user = client.getUser() || {};
  const isStaff = Boolean(user.isAdmin || user.isMod);

  /** @type {RoomBrowserEntry[]} */
  let rooms = [];
  /** @type {'mine'|'all'} */
  let scope = 'mine';
  let search = '';
  let loading = false;
  let page = 1;
  let totalPages = 1;
  let openOnly = false;

  const $root = TinyHtml.createFrom('div');
  const $errorBox = tinyLib.bs.alert('danger', '', false).addClass('d-none');
  const $list = TinyHtml.createFrom('div').addClass('mt-3');
  /** @type {import('bootstrap').Modal|null} */
  let modal = null;
  const $pagination = TinyHtml.createFrom('div').addClass(
    'd-flex justify-content-between align-items-center mt-3',
  );

  const $search = TinyHtml.createFrom('input')
    .addClass('form-control')
    .setAttr({ type: 'search', placeholder: 'Search rooms...' });

  /** @param {string} msg */
  const showError = (msg) => $errorBox.removeClass('d-none').setText(msg);
  const clearError = () => $errorBox.addClass('d-none');

  /** Renders the current room list. */
  const render = () => {
    $list.empty();
    $pagination.empty();

    if (loading) {
      $list.append(TinyHtml.createFrom('div').addClass('text-muted').setText('Loading...'));
      return;
    }

    if (rooms.length < 1) {
      $list.append(TinyHtml.createFrom('div').addClass('text-muted').setText('No rooms found.'));
      return;
    }

    const currentRoom = client.getRoomId();
    const isInsideRoom = Object.keys(client.getRoom()).length > 0;
    const visibleRooms = rooms;

    if (visibleRooms.length < 1) {
      $list.append(TinyHtml.createFrom('div').addClass('text-muted').setText('No rooms found.'));
      return;
    }

    for (const room of visibleRooms) {
      const $row = TinyHtml.createFrom('div').addClass(
        'd-flex align-items-center gap-2 border-bottom py-2',
      );

      // Name + metadata
      const $info = TinyHtml.createFrom('div').addClass('flex-grow-1');
      const $title = TinyHtml.createFrom('div').append(
        TinyHtml.createFrom('strong').setText(room.title || room.roomId),
      );

      const $badges = TinyHtml.createFrom('div').addClass('mt-1');

      // Chapter
      $badges.append(makeBadge('fas fa-book', 'Chapter', 'primary'));
      $badges.append(
        TinyHtml.createFrom('span').addClass('badge bg-primary me-1').setText(String(room.chapter)),
      );

      // Users
      $badges.append(
        TinyHtml.createFrom('span')
          .addClass('badge bg-dark me-1')
          .setAttr('title', 'Users')
          .append(
            TinyHtml.createFrom('i').addClass('fas fa-users me-1'),
            TinyHtml.createFrom('span').setText(`${room.users}/${room.maxUsers}`),
          ),
      );

      // Read-only
      $badges.append(
        room.readOnly
          ? makeBadge('fas fa-lock', 'Read-only', 'warning')
          : makeBadge('fas fa-lock-open', 'Writable', 'success'),
      );

      // Open / closed
      $badges.append(
        room.disabled
          ? makeBadge('fas fa-door-closed', 'Closed', 'danger')
          : makeBadge('fas fa-door-open', 'Open', 'success'),
      );

      // Password
      if (room.hasPassword) $badges.append(makeBadge('fas fa-key', 'Password', 'secondary'));

      // Role of the signed-in account inside the room.
      if (room.isOwner) $badges.append(makeBadge('fas fa-crown', 'You own this room', 'info'));
      else if (room.isModerator)
        $badges.append(makeBadge('fas fa-shield-halved', 'You moderate this room', 'info'));

      // Owner + last message
      $info.append(
        $title,
        TinyHtml.createFrom('div')
          .addClass('small text-muted')
          .setText(
            `${room.roomId} - ${room.ownerNickname ? `${room.ownerNickname} (${room.ownerId})` : room.ownerId} - ${formatDate(room.lastMessage)}`,
          ),
        $badges,
      );

      // The room data is only filled after a successful `room-entered`, so an
      // empty object means the join never completed (wrong password, room
      // full, ...) and the user must be able to try again.
      const isCurrent = room.roomId === currentRoom && isInsideRoom;
      const $join = tinyLib.bs
        .button(isCurrent ? 'secondary' : 'primary')
        .addClass('btn-sm')
        .setText(isCurrent ? 'Current' : room.roomId === currentRoom ? 'Rejoin' : 'Join')
        .toggleProp('disabled', isCurrent);

      $join.on('click', () => {
        modal?.hide();
        askPasswordAndStore(room.roomId);
      });

      $row.append($info, $join);
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

  /** Loads the room list from the server. */
  const load = async () => {
    loading = true;
    clearError();
    render();

    try {
      const result = await client.listRooms({
        search: search.length > 0 ? search : null,
        scope,
        openOnly,
        page,
        perPage: 20,
      });

      if (result.error) showError(result.msg ?? 'Unknown error');
      rooms = Array.isArray(result.rooms) ? result.rooms : [];
      totalPages = typeof result.totalPages === 'number' ? result.totalPages : 1;
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
      rooms = [];
    } finally {
      loading = false;
      render();
    }
  };

  // Events
  /** @type {ReturnType<typeof setTimeout>|null} */
  let searchTimer = null;
  $search.on('input', () => {
    search = String($search.val() ?? '').trim();
    page = 1;
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(load, 300);
  });

  // Build all
  const $header = TinyHtml.createFrom('div').addClass('d-flex flex-wrap gap-2 align-items-center');

  // Staff only: search the whole server instead of the account rooms.
  if (isStaff) {
    const $scope = TinyHtml.createFrom('input').setAttr({
      type: 'checkbox',
      id: 'room-browser-all',
    });

    $scope.on('change', () => {
      scope = $scope.prop('checked') ? 'all' : 'mine';
      page = 1;
      load();
    });

    $header.append(
      TinyHtml.createFrom('div')
        .addClass('form-check form-check-inline mb-0')
        .append(
          $scope.addClass('form-check-input mt-0'),
          TinyHtml.createFrom('label')
            .addClass('form-check-label')
            .setAttr('for', 'room-browser-all')
            .setText('All rooms'),
        ),
    );
  }

  // Open rooms only
  const $openOnly = TinyHtml.createFrom('input').setAttr({
    type: 'checkbox',
    id: 'room-browser-open',
  });

  $openOnly.on('change', () => {
    openOnly = Boolean($openOnly.prop('checked'));
    page = 1;
    load();
  });

  $header.append(
    TinyHtml.createFrom('div')
      .addClass('form-check form-check-inline mb-0')
      .append(
        $openOnly.addClass('form-check-input mt-0'),
        TinyHtml.createFrom('label')
          .addClass('form-check-label')
          .setAttr('for', 'room-browser-open')
          .setText('Open only'),
      ),
  );

  $header.append(TinyHtml.createFrom('div').addClass('flex-grow-1').append($search));

  // Any account allowed to create a room can do it from here.
  const $create = tinyLib.bs.button('success').setText('Create room');
  $create.on('click', () => {
    modal?.hide();
    openCreateRoom(() => window.location.reload());
  });
  $header.append($create);

  $root.append($errorBox, $header, $list, $pagination);

  modal = tinyLib.modal({
    title: 'Rooms',
    dialog: 'modal-lg',
    id: 'room-browser',
    body: $root,
  }).modal;

  load();
};
