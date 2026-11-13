import moment from 'moment';
import objHash from 'object-hash';
import { isJsonObject } from 'tiny-essentials/basics/objChecker';
import TinyHtml from 'tiny-essentials/libs/html/TinyHtml';
import { alert } from 'tiny-essentials/webTemplates/bootstrap/5.3/html/BootstrapDialogs';
import tinyLib from '../files/tinyLib.mjs';
import { Tooltip } from '../modules/TinyBootstrap.mjs';
import TinyClientIo from './socketClient.mjs';

/**
 * A single user row rendered by the manager.
 *
 * @typedef {Object} RoomUserHtml
 * @property {import('bootstrap').Tooltip[]} tooltips - Tooltips attached to the row.
 * @property {{ kick: TinyHtmlAny; ban: TinyHtmlAny; mod: TinyHtmlAny; permission: TinyHtmlAny }} actions - Row action buttons.
 * @property {string} userId - User id.
 */

/**
 * A moderator entry.
 *
 * @typedef {Object} RoomModerator
 * @property {string} userId - Moderator user id.
 */

/**
 * A single user entry stored by the manager.
 *
 * @typedef {Object} RoomUserData
 * @property {string|null} [nickname] - Display name.
 * @property {import('moment').Moment|number|string|Date} [ping] - Last ping.
 */

/**
 * UserRoomManager
 *
 * UI Component to manage users in a real-time room environment.
 *
 * Created by: Yasmin Seidel (JasminDreasond)
 * Co-developed with: ChatGPT (OpenAI) as coding assistant
 *
 * @param {Object} config - Manager configuration.
 * @param {string} config.currentUserId - The userId of the current logged-in user.
 * @param {boolean} config.isOwner - Whether the current user is the owner of the room.
 * @param {TinyHtmlAny} config.root - DOM element where the manager will be rendered.
 *
 * @example
 * const manager = new UserRoomManager({
 *   currentUserId: 'meow123',
 *   isOwner: true,
 *   root: TinyHtml.query('#room-content'),
 * });
 *
 * manager.addUser('user1', { nickname: 'Twilight', ping: Date.now() });
 * manager.setModerators([{ userId: 'user1' }]);
 */
class UserRoomManager {
  /** @type {RoomUserHtml[]} */
  #usersHtml = [];

  /** @type {string[]} */
  #permissions = [];

  /** @type {TinyClientIo} */
  #client;

  /** @type {TinyHtmlAny|null} */
  $unbanInput = null;

  /** @type {TinyHtmlAny|null} */
  $remveModInput = null;

  /** @type {TinyHtmlAny|null} */
  $readonlyButton = null;

  /** @type {TinyHtmlAny|null} */
  $roomStatusButton = null;

  /**
   * Creates a new instance of the user room manager.
   *
   * @param {Object} options - The configuration object.
   * @param {TinyClientIo} options.client - The client instance used for communication.
   * @param {TinyHtmlAny} options.root - The root DOM element where the UI will be rendered.
   * @param {string} options.currentUserId - The ID of the current user.
   * @param {Record<string, RoomUserData>} [options.users={}] - An object containing user data, keyed by user ID.
   * @param {RoomModerator[]} [options.moderators=[]] - An array of moderator objects, each containing at least a `userId`.
   * @param {RoomPermissionEntry[]} [options.permissions=[]] - Users allowed to speak in the room.
   * @param {boolean} [options.isOwner=false] - Whether the current user is the room owner.
   * @param {(() => void)|null} [options.onClose] - Closes the manager modal.
   */
  constructor({ client, root, currentUserId, users, moderators, permissions, isOwner, onClose }) {
    this.$root = root;
    this.#client = client;

    this.currentUserId = currentUserId;
    this.users = users || {};
    this.moderators = moderators || [];
    this.setPermissions(permissions);
    this.isOwner = isOwner === true;
    this.onClose = typeof onClose === 'function' ? onClose : null;
    this.isModerator = false;

    this.readOnly = false;
    this.roomActive = true;
    this.isWaitingRoomStatus = false;

    this.$header = null;
    this.$footer = null;
    this.$searchInput = null;
    this.$userList = TinyHtml.createFrom('div');
    this.$moderatorList = TinyHtml.createFrom('div').addClass('mb-3');

    this.init();
  }

  /**
   * Retrieves the current search input value in lowercase.
   *
   * @returns {string} The trimmed, lowercase search query or an empty string if not valid.
   */
  #getSearch() {
    const value = String(this.$searchInput?.val() ?? '')
      .trim()
      .toLowerCase();
    return typeof value === 'string' ? value : '';
  }

  /**
   * Sets a new client instance for the manager.
   *
   * @param {TinyClientIo} client - The new client instance to assign.
   */
  setClient(client) {
    this.#client = client;
  }

  /**
   * Initializes the user interface by rendering the header, user list, footer,
   * and checking permissions.
   */
  init() {
    this.renderHeader();
    this.renderUserList();
    this.renderFooter();
    this.checkPerms();
  }

  /**
   * Updates the active status of the room and resets the waiting room flag.
   *
   * @param {boolean} active - Indicates whether the room is active.
   */
  setRoomStatus(active) {
    this.roomActive = active;
    this.isWaitingRoomStatus = false;
    this.updateRoomStatusButton();

    // Disabling a room kicks everybody out, so the list has to be rebuilt
    // from the client state instead of the stale local copy.
    this.users = structuredClone(this.#client.getUsers());
    this.renderUserList(this.#getSearch());
    this.checkPerms();
  }

  /**
   * Checks and updates permissions for the current user and enables/disables
   * appropriate UI controls based on user roles.
   */
  checkPerms() {
    const room = this.#client.getRoom() || {};
    const user = this.#client.getUser() || {};

    if (this.$unbanInput)
      this.$unbanInput.toggleProp('disabled', !this.isModerator && !this.isOwner && !user.isOwner);

    if (this.$remveModInput)
      this.$remveModInput.toggleProp(
        'disabled',
        !this.isModerator && !this.isOwner && !user.isOwner,
      );

    if (this.$kickAll)
      this.$kickAll.toggleProp('disabled', !this.isModerator && !this.isOwner && !user.isOwner);

    if (this.$banInput)
      this.$banInput.toggleProp('disabled', !this.isModerator && !this.isOwner && !user.isOwner);

    for (const item of this.#usersHtml) {
      const needDisable =
        item.userId === room.ownerId ||
        item.userId === this.currentUserId ||
        (!this.isModerator && !this.isOwner && !user.isOwner);
      item.actions.kick.toggleProp('disabled', needDisable);
      item.actions.ban.toggleProp('disabled', needDisable);
    }
  }

  /**
   * Renders the header section of the user manager UI.
   *
   * Includes:
   * - A "Kick all" button to remove all users except the current user and the room owner.
   * - A room status toggle button to enable or disable the room.
   * - A ReadOnly toggle button to enable or disable read-only mode.
   * - A search input to filter users in real-time.
   *
   * Appends the constructed elements to the root and initializes their events.
   */
  renderHeader() {
    this.$header = TinyHtml.createFrom('div').addClass(
      'd-flex flex-wrap align-items-center justify-content-between mb-3 gap-2',
    );

    // Kick all
    this.$kickAll = tinyLib.bs.button('danger').setText('Kick all');
    this.$kickAll.on('click', () => {
      const room = this.#client.getRoom() || {};
      /** @type {string[]} */
      const userIds = [];
      Object.keys(this.users).forEach((userId) => {
        if (userId !== this.currentUserId && userId !== room.ownerId) userIds.push(userId);
      });
      if (userIds.length > 0) this.kickUser(userIds);
    });

    // Room status
    const $roomStatus = tinyLib.bs.button('secondary');
    this.$roomStatusButton = $roomStatus;
    $roomStatus.on('click', () => {
      if (this.isWaitingRoomStatus) return;

      this.isWaitingRoomStatus = true;
      this.updateRoomStatusButton();

      if (this.roomActive)
        this.#client.disableRoom().then((result) => {
          if (!result.error) this.setRoomStatus(false);
          else this.setRoomStatus(true);
        });
      else
        this.#client.enableRoom().then((result) => {
          if (!result.error) this.setRoomStatus(true);
          else this.setRoomStatus(false);
        });
    });

    // ReadOnly status
    const $readonlyBtn = tinyLib.bs.button('secondary');
    this.$readonlyButton = $readonlyBtn;
    $readonlyBtn.on('click', () => {
      if (this.isWaitingReadonly) return;

      this.isWaitingReadonly = true;
      this.updateReadonlyButton();

      if (this.readonlyActive)
        this.#client.disableReadOnlyRoom().then((result) => {
          if (!result.error) this.setReadonly(false);
          else this.setReadonly(true);
        });
      else
        this.#client.enableReadOnlyRoom().then((result) => {
          if (!result.error) this.setReadonly(true);
          else this.setReadonly(false);
        });
    });

    // Search input
    this.$searchInput = TinyHtml.createFrom('input', {
      type: 'text',
      class: 'form-control',
      placeholder: 'Search users...',
    });
    this.$searchInput.on('input', () => {
      this.renderUserList(
        String(this.$searchInput?.val() ?? '')
          .trim()
          .toLowerCase(),
      );
    });

    const $searchWrapper = TinyHtml.createFrom('div')
      .addClass('flex-grow-1')
      .append(this.$searchInput);

    // Banned users
    const $bannedBtn = tinyLib.bs.button('secondary').setText('Banned users');
    $bannedBtn.on('click', () => {
      this.onClose?.();
      this.openBannedUsers();
    });

    this.$header.append(this.$kickAll, $readonlyBtn, $roomStatus, $bannedBtn, $searchWrapper);
    this.$root.append(this.$header, this.$moderatorList, this.$userList);

    this.updateRoomStatusButton();
    this.updateReadonlyButton();
  }

  /**
   * Renders the list of room moderators.
   *
   * The owner uses it to know who can moderate the room without opening the
   * user list.
   *
   * @returns {void}
   */
  renderModerators() {
    this.$moderatorList.empty();
    if (!Array.isArray(this.moderators) || this.moderators.length < 1) return;

    const $wrapper = TinyHtml.createFrom('div').addClass('small');
    $wrapper.append(TinyHtml.createFrom('strong').setText('Moderators: '));

    this.moderators.forEach((mod, index) => {
      if (index > 0) $wrapper.append(TinyHtml.createFrom('span').setText(', '));
      $wrapper.append(TinyHtml.createFrom('span').addClass('text-muted').setText(mod.userId));
    });

    this.$moderatorList.append($wrapper);
  }

  /**
   * Opens the list of users banned from the room.
   *
   * @returns {void}
   */
  openBannedUsers() {
    const $root = TinyHtml.createFrom('div');
    const $list = TinyHtml.createFrom('div').addClass('mt-3');
    const $pagination = TinyHtml.createFrom('div').addClass(
      'd-flex justify-content-between align-items-center mt-3',
    );
    $root.append($list, $pagination);

    let page = 1;
    let totalPages = 1;

    /** Loads the ban list from the server. */
    const load = () => {
      $list.empty();
      $pagination.empty();
      $list.append(TinyHtml.createFrom('div').addClass('text-muted').setText('Loading...'));

      this.#client
        .listRoomBanned(page, 10)
        .then((result) => {
          $list.empty();

          if (result.error) {
            $list.append(
              TinyHtml.createFrom('div')
                .addClass('text-danger')
                .setText(result.msg ?? 'Error'),
            );
            return;
          }

          totalPages = typeof result.totalPages === 'number' ? result.totalPages : 1;

          const users = Array.isArray(result.users) ? result.users : [];
          if (users.length < 1) {
            $list.append(
              TinyHtml.createFrom('div').addClass('text-muted').setText('No banned users.'),
            );
            return;
          }

          for (const user of users) {
            const $row = TinyHtml.createFrom('div').addClass(
              'd-flex align-items-center gap-2 border-bottom py-2',
            );

            const $info = TinyHtml.createFrom('div').addClass('flex-grow-1');
            $info.append(
              TinyHtml.createFrom('strong').setText(user.userId),
              TinyHtml.createFrom('div')
                .addClass('small text-muted')
                .setText(user.reason || 'No reason given'),
            );

            const $unban = tinyLib.bs
              .button('success btn-sm')
              .addClass('unban-button')
              .setText('Unban');
            /** @type {NodeJS.Timeout|null} */
            let confirmTimer = null;
            let isConfirming = false;

            $unban.on('click', async (event) => {
              // Holding shift skips the confirmation.
              const mouseEvent = /** @type {MouseEvent} */ (event);
              const skipConfirm = Boolean(mouseEvent?.shiftKey);

              // First click arms the button, the second one really unbans.
              if (!skipConfirm && !isConfirming) {
                isConfirming = true;
                $unban.removeClass('btn-success').addClass('btn-danger').setText('Confirm?');

                confirmTimer = setTimeout(() => {
                  isConfirming = false;
                  $unban.removeClass('btn-danger').addClass('btn-success').setText('Unban');
                }, 5000);
                return;
              }

              if (confirmTimer) clearTimeout(confirmTimer);
              $unban.addClass('disabled').addProp('disabled');
              await this.#client.unbanUser(user.userId);
              load();
            });

            $row.append($info, $unban);
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
        })
        .catch((err) => {
          $list.empty();
          $list.append(
            TinyHtml.createFrom('div')
              .addClass('text-danger')
              .setText(err instanceof Error ? err.message : String(err)),
          );
        });
    };

    const { html } = tinyLib.modal({
      title: 'Banned users',
      dialog: 'modal-lg',
      id: 'room-banned-users',
      body: $root,
    });

    // Highlights the unban buttons while shift is held, warning that the click
    // skips the confirmation.
    /** @param {boolean} active */
    const setShiftDanger = (active) => html.toggleClass('shift-danger', active);
    const onKeyDown = (/** @type {KeyboardEvent} */ e) => {
      if (e.key === 'Shift') setShiftDanger(true);
    };
    const onKeyUp = (/** @type {KeyboardEvent} */ e) => {
      if (e.key === 'Shift') setShiftDanger(false);
    };
    const onBlur = () => setShiftDanger(false);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    html.on('hidden.bs.modal', () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    });

    load();
  }

  /**
   * Updates the visual state and label of the ReadOnly toggle button.
   *
   * Changes the button style and text based on the current read-only state:
   * - Green ("Disable ReadOnly") when read-only mode is active.
   * - Red ("Enable ReadOnly") when read-only mode is inactive.
   * - Yellow ("Waiting...") while the state is updating.
   *
   * Disables the button if the current user is not the room owner.
   */
  updateReadonlyButton() {
    const $btn = this.$readonlyButton;
    if (!$btn) return;

    $btn
      .removeClass('btn-success btn-danger btn-warning')
      .addClass(
        this.isWaitingReadonly ? 'btn-warning' : this.readonlyActive ? 'btn-success' : 'btn-danger',
      )
      .setText(
        this.isWaitingReadonly
          ? 'Waiting...'
          : this.readonlyActive
            ? 'Disable ReadOnly'
            : 'Enable ReadOnly',
      )
      .toggleProp('disabled', !this.isOwner);
  }

  /**
   * Updates the read-only state and resets the waiting flag.
   *
   * @param {boolean} active - Indicates whether read-only mode is active.
   */
  setReadonly(active) {
    this.readonlyActive = active;
    this.isWaitingReadonly = false;
    this.updateReadonlyButton();
  }

  /**
   * Renders the footer section of the user manager UI.
   *
   * Includes:
   * - An input field to manually enter a user ID to unban.
   * - An "Unban" button that triggers the unbanning action.
   *
   * The input listens for the "Enter" key to trigger the unban action as well.
   * Appends the constructed elements to the root container.
   */
  renderFooter() {
    this.$footer = TinyHtml.createFrom('div');
    const $unbanWrapper = TinyHtml.createFrom('div').addClass(
      'd-flex mt-4 gap-2 align-items-center',
    );

    const $removeModWrapper = TinyHtml.createFrom('div').addClass(
      'd-flex mt-4 gap-2 align-items-center',
    );

    const $banWrapper = TinyHtml.createFrom('div').addClass('d-flex mt-4 gap-2 align-items-center');

    this.$unbanInput = TinyHtml.createFrom('input')
      .addClass('form-control')
      .setAttr('type', 'text')
      .setAttr('placeholder', 'Enter user ID to unban')
      .on('keydown', (e) => {
        if (/** @type {KeyboardEvent} */ (e).key === 'Enter') {
          e.preventDefault();
          $unbanButton.trigger('click');
        }
      });

    this.$remveModInput = TinyHtml.createFrom('input')
      .addClass('form-control')
      .setAttr('type', 'text')
      .setAttr('placeholder', 'Enter user ID to remove mod')
      .on('keydown', (e) => {
        if (/** @type {KeyboardEvent} */ (e).key === 'Enter') {
          e.preventDefault();
          $removeModButton.trigger('click');
        }
      });

    this.$banInput = TinyHtml.createFrom('input')
      .addClass('form-control')
      .setAttr('type', 'text')
      .setAttr('placeholder', 'Enter user ID to ban')
      .on('keydown', (e) => {
        if (/** @type {KeyboardEvent} */ (e).key === 'Enter') {
          e.preventDefault();
          $banButton.trigger('click');
        }
      });

    const $unbanButton = tinyLib.bs.button('success').setText('Unban');
    $unbanButton.on('click', () => {
      if (this.$unbanInput && !this.$unbanInput.hasProp('disabled')) {
        const userId = String(this.$unbanInput?.val() ?? '').trim();
        if (userId) {
          this.$unbanInput.setVal('');
          this.unbanUser(userId);
        }
      }
    });

    const $removeModButton = tinyLib.bs.button('danger').setText('Remove Mod');
    $removeModButton.on('click', () => {
      if (this.$remveModInput && !this.$remveModInput.hasProp('disabled')) {
        const userId = String(this.$remveModInput?.val() ?? '').trim();
        if (userId) {
          this.$remveModInput.setVal('');
          this.reqDemoteModerator(userId).catch((err) => alert(err.message));
        }
      }
    });

    const $banButton = tinyLib.bs.button('danger').setText('Ban');
    $banButton.on('click', () => {
      if (this.$banInput && !this.$banInput.hasProp('disabled')) {
        const userId = String(this.$banInput?.val() ?? '').trim();
        if (userId) {
          this.$banInput.setVal('');
          this.banUser(userId);
        }
      }
    });

    $unbanWrapper.append(this.$unbanInput, $unbanButton);
    $removeModWrapper.append(this.$remveModInput, $removeModButton);
    $banWrapper.append(this.$banInput, $banButton);
    this.$footer.append($unbanWrapper, $removeModWrapper, $banWrapper);
    this.$root.append(this.$footer);
  }

  /**
   * Updates the visual state and label of the room status toggle button.
   *
   * Changes the button style and text based on the current room state:
   * - Green ("Room is Active") when the room is active.
   * - Red ("Room is Inactive") when the room is inactive.
   * - Yellow ("Waiting...") while the state is updating.
   *
   * Disables the button if the current user is not the room owner.
   */
  updateRoomStatusButton() {
    const $btn = this.$roomStatusButton;
    if (!$btn) return;

    $btn
      .removeClass('btn-success btn-danger btn-warning')
      .addClass(
        this.isWaitingRoomStatus ? 'btn-warning' : this.roomActive ? 'btn-success' : 'btn-danger',
      )
      .setText(
        this.isWaitingRoomStatus
          ? 'Waiting...'
          : this.roomActive
            ? 'Room is Active'
            : 'Room is Inactive',
      )
      .toggleProp('disabled', !this.isOwner);
  }

  /**
   * Renders the user list in the room, applying optional search filtering and sorting.
   *
   * This method:
   * - Clears and rebuilds the user list UI.
   * - Sorts users by:
   *    1. Logged-in user first,
   *    2. Then by most recent ping (activity),
   *    3. Then by nickname (alphabetically).
   * - Filters the list based on a search string, matching against nickname and userId.
   * - Displays for each user:
   *    - Nickname and user ID
   *    - Last ping time (human-readable)
   *    - Action buttons: Kick, Ban, Promote/Demote Moderator
   * - Updates `this.isModerator` if the logged-in user is found among moderators.
   * - Stores tooltip and action button references in `this.#usersHtml` for later updates.
   *
   * @param {string} [filter=''] - Optional filter string to match against nickname or userId.
   */
  renderUserList(filter = '') {
    this.renderModerators();

    for (const item of this.#usersHtml) item.tooltips.forEach((tooltip) => tooltip.hide());
    this.$userList.empty();
    this.#usersHtml = [];

    const isMod = (/** @type {string} */ userId) =>
      this.moderators.some((mod) => {
        const modStatus = mod.userId === userId;
        if (this.currentUserId === userId) this.isModerator = modStatus;
        return modStatus;
      });

    const sortedUsers = Object.entries(this.users)
      .map(([userId, data]) => ({
        userId,
        nickname: data.nickname || userId,
        ping: moment(data.ping),
        isSelf: userId === this.currentUserId,
        isModerator: isMod(userId),
      }))
      .sort((a, b) => {
        if (a.isSelf) return -1;
        if (b.isSelf) return 1;

        if (b.ping.valueOf() !== a.ping.valueOf()) {
          return b.ping.valueOf() - a.ping.valueOf();
        }

        return a.nickname.localeCompare(b.nickname);
      });

    sortedUsers.forEach((user, index) => {
      if (
        filter &&
        !user.nickname.toLowerCase().includes(filter.toLowerCase()) &&
        !user.userId.toLowerCase().includes(filter.toLowerCase())
      )
        return;

      const $row = TinyHtml.createFrom('div').addClass(
        `d-flex align-items-center py-2${index < sortedUsers.length - 1 ? ' border-bottom' : ''}`,
      );

      const $info = TinyHtml.createFrom('div').addClass(
        'flex-grow-1 d-flex align-items-center gap-2',
      );
      const $nickname = TinyHtml.createFrom('strong').setText(user.nickname);
      const $userIdText = TinyHtml.createFrom('small')
        .addClass('text-muted')
        .setText(`(${user.userId})`);
      $info.append($nickname, $userIdText);

      const $ping = TinyHtml.createFrom('div')
        .addClass('text-muted small text-nowrap')
        .setText(user.ping.fromNow());
      const $actions = TinyHtml.createFrom('div').addClass('d-flex flex-wrap gap-2');
      const tooltips = [];
      const actions = {};

      const $kickBtn = tinyLib.bs
        .button('warning')
        .append(TinyHtml.createFrom('i').addClass('fas fa-user-slash'))
        .setAttr('title', 'Kick');
      $kickBtn.on('click', () => this.kickUser(user.userId));

      const $banBtn = tinyLib.bs
        .button('danger')
        .append(TinyHtml.createFrom('i').addClass('fas fa-ban'))
        .setAttr('title', 'Ban');
      $banBtn.on('click', () => this.banUser(user.userId));

      $actions.append($kickBtn, $banBtn);
      actions.kick = $kickBtn;
      actions.ban = $banBtn;
      tooltips.push(Tooltip($banBtn));
      tooltips.push(Tooltip($kickBtn));

      const $modBtn = tinyLib.bs.button(user.isModerator ? 'secondary' : 'info');
      $modBtn
        .append(
          TinyHtml.createFrom('i').addClass(
            user.isModerator ? 'fas fa-user-minus' : 'fas fa-user-plus',
          ),
        )
        .setAttr('title', user.isModerator ? 'Demote' : 'Promote')
        .toggleProp('disabled', user.isSelf || !this.isOwner);
      $modBtn.on('click', () => {
        if (user.isModerator) {
          this.reqDemoteModerator(user.userId);
        } else {
          this.reqPromoteModerator(user.userId);
        }
      });

      $actions.append($modBtn);
      actions.mod = $modBtn;
      tooltips.push(Tooltip($modBtn));

      // Allow / revoke the permission to speak in the room.
      const canSpeak = this.canSpeak(user.userId);
      const $permBtn = tinyLib.bs
        .button(canSpeak ? 'secondary' : 'success')
        .append(
          TinyHtml.createFrom('i').addClass(canSpeak ? 'fas fa-comment-slash' : 'fas fa-comment'),
        )
        .setAttr('title', canSpeak ? 'Revoke permission to speak' : 'Allow to speak')
        .toggleProp('disabled', !this.isOwner);
      $permBtn.on('click', () => {
        if (canSpeak) this.revokePermission(user.userId);
        else this.grantPermission(user.userId);
      });

      $actions.append($permBtn);
      actions.permission = $permBtn;
      tooltips.push(Tooltip($permBtn));

      if (user.isSelf)
        $info.append(
          TinyHtml.createFrom('span').addClass('badge bg-secondary ms-2').setText('You'),
        );

      $row.append(
        $info.addClass('col-5'),
        $ping.addClass('col-2 text-end'),
        $actions.addClass('col-5 justify-content-end'),
      );
      this.#usersHtml.push({ tooltips, actions, userId: user.userId });

      this.$userList.append($row);
    });
  }

  /**
   * Adds or updates a user in the internal user list.
   *
   * If the user is new or their data (nickname/ping) has changed,
   * it triggers a re-render of the user list and re-checks permissions.
   *
   * @param {string} userId - Unique identifier of the user.
   * @param {{nickname?: string, ping: number|string|Date}} data - User data, including nickname and ping timestamp.
   */
  addUser(userId, data) {
    const oldHash = this.users[userId] ? objHash(this.users[userId]) : null;
    this.users[userId] = {
      nickname: data.nickname || userId,
      ping: moment(data.ping),
    };
    const newHash = objHash(this.users[userId]);
    if (newHash !== oldHash) {
      this.renderUserList(this.#getSearch());
      this.checkPerms();
    }
  }

  /**
   * Removes a user from the internal user list.
   *
   * If the user exists, they are removed and the user list is re-rendered.
   *
   * @param {string} userId - Unique identifier of the user to remove.
   */
  removeUser(userId) {
    if (this.users[userId]) {
      delete this.users[userId];
      this.renderUserList(this.#getSearch());
    }
  }

  /**
   * Adds a user to the list of moderators, if not already present.
   * Triggers a re-render of the user list and permission checks.
   *
   * @param {string} userId - The user ID to promote to moderator.
   */
  promoteModerator(userId) {
    if (!this.moderators.find((m) => m.userId === userId)) {
      this.moderators.push({ userId });
      if (userId === this.currentUserId) this.isModerator = true;
      this.renderUserList(this.#getSearch());
      this.checkPerms();
    }
  }

  /**
   * Removes a user from the list of moderators.
   * Triggers a re-render of the user list and permission checks.
   *
   * @param {string} userId - The user ID to demote from moderator.
   */
  demoteModerator(userId) {
    this.moderators = this.moderators.filter((m) => m.userId !== userId);
    if (userId === this.currentUserId) this.isModerator = false;
    this.renderUserList(this.#getSearch());
    this.checkPerms();
  }

  /**
   * Replaces the entire list of moderators with a new list.
   * Triggers a re-render of the user list and permission checks.
   *
   * @param {Array<{userId: string}>} moderatorList - Array of moderator objects.
   */
  setModerators(moderatorList) {
    this.moderators = Array.isArray(moderatorList) ? moderatorList : [];
    this.renderUserList(this.#getSearch());
    this.checkPerms();
  }

  /**
   * Replaces the list of users allowed to speak in the room.
   *
   * @param {RoomPermissionEntry[]|undefined} permissions - Permission list sent by the server.
   * @returns {void}
   */
  setPermissions(permissions) {
    this.#permissions = Array.isArray(permissions)
      ? permissions
          .filter((item) => item && typeof item.userId === 'string')
          .map((item) => item.userId)
      : [];
  }

  /**
   * Tells whether an user is allowed to speak in the room.
   *
   * @param {string} userId - User id.
   * @returns {boolean}
   */
  canSpeak(userId) {
    return this.#permissions.indexOf(userId) > -1;
  }

  /**
   * Sends a request to allow an user to speak in the room.
   *
   * @param {string} userId - User id.
   * @returns {Promise<void>}
   */
  async grantPermission(userId) {
    const html = this.#usersHtml.find((item) => item.userId === userId);
    if (html) html.actions.permission.addProp('disabled');
    const result = await this.#client.grantPermission([userId]);
    if (html) html.actions.permission.removeProp('disabled').removeClass('disabled');
    if (!result.error) {
      this.#permissions.push(userId);
      this.renderUserList(this.#getSearch());
      this.checkPerms();
    }
  }

  /**
   * Sends a request to remove the permission to speak of an user.
   *
   * @param {string} userId - User id.
   * @returns {Promise<void>}
   */
  async revokePermission(userId) {
    const html = this.#usersHtml.find((item) => item.userId === userId);
    if (html) html.actions.permission.addProp('disabled');
    const result = await this.#client.revokePermission([userId]);
    if (html) html.actions.permission.removeProp('disabled').removeClass('disabled');
    if (!result.error) {
      this.#permissions = this.#permissions.filter((id) => id !== userId);
      this.renderUserList(this.#getSearch());
      this.checkPerms();
    }
  }

  /**
   * Sends a request to promote a user to moderator via the client.
   * Updates UI button state during request and, on success, adds the user as a moderator.
   *
   * @param {string} userId - The user ID to promote.
   */
  async reqPromoteModerator(userId) {
    if (!this.moderators.find((m) => m.userId === userId)) {
      const html = this.#usersHtml.find((item) => item.userId === userId);
      if (html) html.actions.mod.addProp('disabled');
      await this.#client.addMod([userId]).then((result) => {
        if (html) html.actions.mod.removeProp('disabled').removeClass('disabled');
        if (!result.error) this.promoteModerator(userId);
      });
    }
  }

  /**
   * Sends a request to demote a user from moderator via the client.
   * Updates UI button state during request and, on success, removes the user from the moderator list.
   *
   * @param {string} userId - The user ID to demote.
   */
  async reqDemoteModerator(userId) {
    const html = this.#usersHtml.find((item) => item.userId === userId);
    if (html) html.actions.mod.addProp('disabled');
    return this.#client.removeMod([userId]).then((result) => {
      if (html) html.actions.mod.removeProp('disabled').removeClass('disabled');
      if (!result.error) this.demoteModerator(userId);
    });
  }

  /**
   * Sends a request to ban a user via the client.
   * Disables the ban button during the request.
   * On success, removes the user from the user list.
   *
   * @param {string} userId - The user ID to ban.
   */
  banUser(userId) {
    const html = this.#usersHtml.find((item) => item.userId === userId);
    if (html) html.actions.ban.addProp('disabled');
    this.#client.banUser(userId).then((result) => {
      if (html) html.actions.ban.removeProp('disabled').removeClass('disabled');
      if (!result.error) this.removeUser(userId);
    });
  }

  /**
   * Sends a request to unban a user via the client.
   * Disables the input field during the request.
   * On failure, displays the error message in the input.
   *
   * @param {string} userId - The user ID to unban.
   */
  unbanUser(userId) {
    const $input = this.$unbanInput;
    if (!$input) return;

    $input.addProp('disabled');
    this.#client
      .unbanUser(userId)
      .then((result) => {
        $input.removeProp('disabled').removeClass('disabled');
        if (result.error)
          $input.setVal(typeof result.msg === 'string' ? result.msg : 'Unknown error');
        $input.trigger('focus').trigger('select');
      })
      .catch((err) => alert(err.message));
  }

  /**
   * Sends a request to kick a user via the client.
   * Disables the kick button during the request.
   * On success, removes the user from the user list.
   *
   * @param {string|string[]} userId - The user ID to kick.
   */
  kickUser(userId) {
    const html = this.#usersHtml.find((item) => item.userId === userId);
    if (html) html.actions.kick.addProp('disabled');
    this.#client.kickUser(userId).then((result) => {
      if (html) html.actions.kick.removeProp('disabled').removeClass('disabled');
      if (!result.error) {
        if (Array.isArray(result.data)) {
          for (const data of result.data) {
            if (isJsonObject(data) && typeof data.userId === 'string') {
              this.removeUser(data.userId);
            }
          }
        }
      }
    });
  }

  /**
   * Destroys the root element, removing all child elements.
   * Used to clean up the component from the DOM.
   */
  destroy() {
    if (this.$root) this.$root.empty();
  }
}

export default UserRoomManager;
