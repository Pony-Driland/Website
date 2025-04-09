/**
 * UserRoomManager
 *
 * UI Component to manage users in a real-time room environment.
 *
 * Created by: Yasmin Seidel (JasminDreasond)
 * Co-developed with: ChatGPT (OpenAI) as coding assistant
 *
 * @param {Object} config
 * @param {string} config.currentUserId - The userId of the current logged-in user.
 * @param {boolean} config.isOwner - Whether the current user is the owner of the room.
 * @param {jQuery} config.target - DOM element where the manager will be rendered.
 *
 * @example
 * const manager = new UserRoomManager({
 *   currentUserId: 'meow123',
 *   isOwner: true,
 *   root: $('#room-content'),
 * });
 *
 * manager.addUser('user1', { nickname: 'Twilight', ping: Date.now() });
 * manager.setModerators([{ userId: 'user1' }]);
 */
class UserRoomManager {
  #usersHtml = [];
  #client;

  /**
   * Creates a new instance of the user room manager.
   *
   * @param {Object} options - The configuration object.
   * @param {Object} options.client - The client instance used for communication.
   * @param {jQuery} options.root - The root DOM element where the UI will be rendered.
   * @param {string} options.currentUserId - The ID of the current user.
   * @param {Object<string, Object>} [options.users={}] - An object containing user data, keyed by user ID.
   * @param {Array<Object>} [options.moderators=[]] - An array of moderator objects, each containing at least a `userId`.
   * @param {boolean} [options.isOwner=false] - Whether the current user is the room owner.
   */
  constructor({ client, root, currentUserId, users, moderators, isOwner }) {
    this.$root = root;
    this.#client = client;

    this.currentUserId = currentUserId;
    this.users = users || {};
    this.moderators = moderators || [];
    this.isOwner = isOwner === true;
    this.isModerator = false;

    this.roomActive = true;
    this.isWaitingRoomStatus = false;

    this.$header = null;
    this.$footer = null;
    this.$searchInput = null;
    this.$userList = $('<div>');

    this.init();
  }

  /**
   * Retrieves the current search input value in lowercase.
   *
   * @returns {string} The trimmed, lowercase search query or an empty string if not valid.
   * @private
   */
  #getSearch() {
    const value = this.$searchInput?.val()?.trim().toLowerCase();
    return typeof value === 'string' ? value : '';
  }

  /**
   * Sets a new client instance for the manager.
   *
   * @param {Object} client - The new client instance to assign.
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
  }

  /**
   * Checks and updates permissions for the current user and enables/disables
   * appropriate UI controls based on user roles.
   */
  checkPerms() {
    const room = this.#client.getRoom() || {};
    if (this.$unbanInput) this.$unbanInput.prop('disabled', !this.isModerator && !this.isOwner);
    if (this.$kickAll) this.$kickAll.prop('disabled', !this.isModerator && !this.isOwner);
    for (const item of this.#usersHtml) {
      const needDisable =
        item.userId === room.ownerId ||
        item.userId === this.currentUserId ||
        (!this.isModerator && !this.isOwner);
      item.actions.kick.prop('disabled', needDisable);
      item.actions.ban.prop('disabled', needDisable);
    }
  }

  /**
   * Renders the header section of the user manager UI.
   *
   * Includes:
   * - A "Kick all" button to remove all users except the current user and the room owner.
   * - A room status toggle button to enable or disable the room.
   * - A search input to filter users in real-time.
   *
   * Appends the constructed elements to the root and initializes their events.
   */
  renderHeader() {
    this.$header = $('<div>').addClass(
      'd-flex flex-wrap align-items-center justify-content-between mb-3 gap-2',
    );

    // Kick all (menos quem está logado)
    this.$kickAll = tinyLib.bs.button('danger').text('Kick all');
    this.$kickAll.on('click', () => {
      const room = this.#client.getRoom() || {};
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

    // Input de pesquisa
    this.$searchInput = $('<input>', {
      type: 'text',
      class: 'form-control',
      placeholder: 'Search users...',
    });
    this.$searchInput.on('input', () => {
      this.renderUserList(this.$searchInput.val().trim().toLowerCase());
    });

    const $searchWrapper = $('<div>').addClass('flex-grow-1').append(this.$searchInput);
    this.$header.append(this.$kickAll, $roomStatus, $searchWrapper);
    this.$root.append(this.$header, this.$userList);

    this.updateRoomStatusButton();
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
    this.$footer = $('<div>');
    // Desbanir usuário manualmente
    const $unbanWrapper = $('<div>').addClass('d-flex mt-4 gap-2 align-items-center');
    this.$unbanInput = $('<input>')
      .addClass('form-control')
      .attr('type', 'text')
      .attr('placeholder', 'Enter user ID to unban')
      .on('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          $unbanButton.trigger('click');
        }
      });

    const $unbanButton = tinyLib.bs.button('success').text('Unban');
    $unbanButton.on('click', () => {
      if (!this.$unbanInput.prop('disabled')) {
        const userId = this.$unbanInput.val().trim();
        if (userId) {
          this.$unbanInput.val('');
          this.unbanUser(userId);
        }
      }
    });

    $unbanWrapper.append(this.$unbanInput, $unbanButton);
    this.$userList.append();
    this.$footer.append($unbanWrapper);
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
      .text(
        this.isWaitingRoomStatus
          ? 'Waiting...'
          : this.roomActive
            ? 'Room is Active'
            : 'Room is Inactive',
      )
      .prop('disabled', !this.isOwner);
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
    for (const item of this.#usersHtml) item.tooltips.map((item) => item.hide());
    this.$userList.empty();
    this.#usersHtml = [];

    const isMod = (userId) =>
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

      const $row = $('<div>').addClass(
        `d-flex align-items-center py-2${index < sortedUsers.length - 1 ? ' border-bottom' : ''}`,
      );

      const $info = $('<div>').addClass('flex-grow-1 d-flex align-items-center gap-2');
      const $nickname = $('<strong>').text(user.nickname);
      const $userIdText = $('<small>').addClass('text-muted').text(`(${user.userId})`);
      $info.append($nickname, $userIdText);

      const $ping = $('<div>').addClass('text-muted small text-nowrap').text(user.ping.fromNow());
      const $actions = $('<div>').addClass('d-flex flex-wrap gap-2');
      const tooltips = [];
      const actions = {};

      const $kickBtn = tinyLib.bs
        .button('warning')
        .append($('<i>').addClass('fas fa-user-slash'))
        .attr('title', 'Kick');
      $kickBtn.on('click', () => this.kickUser(user.userId));

      const $banBtn = tinyLib.bs
        .button('danger')
        .append($('<i>').addClass('fas fa-ban'))
        .attr('title', 'Ban');
      $banBtn.on('click', () => this.banUser(user.userId));

      $actions.append($kickBtn, $banBtn);
      actions.kick = $kickBtn;
      actions.ban = $banBtn;
      tooltips.push($banBtn.tooltip(null, null, true));
      tooltips.push($kickBtn.tooltip(null, null, true));

      const $modBtn = tinyLib.bs.button(user.isModerator ? 'secondary' : 'info');
      $modBtn
        .append($('<i>').addClass(user.isModerator ? 'fas fa-user-minus' : 'fas fa-user-plus'))
        .attr('title', user.isModerator ? 'Demote' : 'Promote')
        .prop('disabled', user.isSelf || !this.isOwner);
      $modBtn.on('click', () => {
        if (user.isModerator) {
          this.reqDemoteModerator(user.userId);
        } else {
          this.reqPromoteModerator(user.userId);
        }
      });

      $actions.append($modBtn);
      actions.mod = $modBtn;
      tooltips.push($modBtn.tooltip(null, null, true));

      if (user.isSelf) $info.append($('<span>').addClass('badge bg-secondary ms-2').text('You'));

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
   * Sends a request to promote a user to moderator via the client.
   * Updates UI button state during request and, on success, adds the user as a moderator.
   *
   * @param {string} userId - The user ID to promote.
   */
  reqPromoteModerator(userId) {
    if (!this.moderators.find((m) => m.userId === userId)) {
      const html = this.#usersHtml.find((item) => item.userId === userId);
      if (html) html.actions.mod.prop('disabled', true);
      this.#client.addMod([userId]).then((result) => {
        if (html) html.actions.mod.prop('disabled', false).removeClass('disabled');
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
  reqDemoteModerator(userId) {
    const html = this.#usersHtml.find((item) => item.userId === userId);
    if (html) html.actions.mod.prop('disabled', true);
    this.#client.removeMod([userId]).then((result) => {
      if (html) html.actions.mod.prop('disabled', false).removeClass('disabled');
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
    if (html) html.actions.ban.prop('disabled', true);
    this.#client.banUser(userId).then((result) => {
      if (html) html.actions.ban.prop('disabled', false).removeClass('disabled');
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
    this.$unbanInput.prop('disabled', true);
    this.#client.unbanUser(userId).then((result) => {
      this.$unbanInput.prop('disabled', false).removeClass('disabled');
      if (result.error)
        this.$unbanInput.val(typeof result.msg === 'string' ? result.msg : 'Unknown error');
      this.$unbanInput.trigger('focus').trigger('select');
    });
  }

  /**
   * Sends a request to kick a user via the client.
   * Disables the kick button during the request.
   * On success, removes the user from the user list.
   *
   * @param {string} userId - The user ID to kick.
   */
  kickUser(userId) {
    const html = this.#usersHtml.find((item) => item.userId === userId);
    if (html) html.actions.kick.prop('disabled', true);
    this.#client.kickUser(userId).then((result) => {
      if (html) html.actions.kick.prop('disabled', false).removeClass('disabled');
      if (!result.error) this.removeUser(userId);
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
