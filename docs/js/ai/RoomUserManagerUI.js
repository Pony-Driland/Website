/**
 * UserRoomManager
 *
 * UI Component to manage users in a real-time room environment.
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
  constructor({ root, currentUserId, users, moderators, isOwner }) {
    this.$root = root; // DOM container principal
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

  #getSearch() {
    const value = this.$searchInput?.val()?.trim().toLowerCase();
    return typeof value === 'string' ? value : '';
  }

  setClient(client) {
    this.#client = client;
  }

  init() {
    this.renderHeader();
    this.renderUserList();
    this.renderFooter();
    this.checkPerms();
  }

  // Essa função será chamada pelo backend para atualizar o status da sala
  setRoomStatus(active) {
    this.roomActive = active;
    this.isWaitingRoomStatus = false;
    this.updateRoomStatusButton();
  }

  checkPerms() {
    if (this.$unbanInput) {
      if (!this.isModerator && !this.isOwner)
        this.$unbanInput.prop('disabled', true).addClass('disabled');
      else this.$unbanInput.prop('disabled', false).removeClass('disabled');
    }
  }

  renderHeader() {
    this.$header = $('<div>').addClass(
      'd-flex flex-wrap align-items-center justify-content-between mb-3 gap-2',
    );

    // Kick all (menos quem está logado)
    const $kickAll = tinyLib.bs.button('danger').text('Kick all');
    $kickAll.on('click', () => {
      const userIds = [];
      Object.keys(this.users).forEach((userId) => {
        if (userId !== this.currentUserId) userIds.push(userId);
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
    this.$header.append($kickAll, $roomStatus, $searchWrapper);
    this.$root.append(this.$header, this.$userList);

    this.updateRoomStatusButton();
  }

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
      );
  }

  renderUserList(filter = '') {
    for (const item of this.#usersHtml) item.tooltips.map((item) => item.hide());
    this.$userList.empty();
    this.#usersHtml = [];

    const isMod = (userId) =>
      this.moderators.some((mod) => {
        const modStatus = mod.userId === userId;
        if (this.currentUserId === userId) {
          this.isModerator = modStatus;
          this.checkPerms();
        }
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

      if (!user.isSelf) {
        if (this.isOwner || this.isModerator) {
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
        }

        if (this.isOwner) {
          const $modBtn = tinyLib.bs.button(user.isModerator ? 'secondary' : 'info');
          $modBtn
            .append($('<i>').addClass(user.isModerator ? 'fas fa-user-minus' : 'fas fa-user-plus'))
            .attr('title', user.isModerator ? 'Demote' : 'Promote');
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
        }
      } else {
        const $kickBtn = tinyLib.bs
          .button('warning')
          .append($('<i>').addClass('fas fa-user-slash'))
          .attr('title', 'Kick')
          .prop('disabled', true);

        const $banBtn = tinyLib.bs
          .button('danger')
          .append($('<i>').addClass('fas fa-ban'))
          .attr('title', 'Ban')
          .prop('disabled', true);

        const $modBtn = tinyLib.bs
          .button('secondary')
          .append($('<i>').addClass('fas fa-arrow-up'))
          .attr('title', 'Promote')
          .prop('disabled', true);

        $actions.append($kickBtn, $banBtn);
        if (this.isOwner) $actions.append($modBtn);

        $info.append($('<span>').addClass('badge bg-secondary ms-2').text('You'));
      }

      $row.append(
        $info.addClass('col-5'),
        $ping.addClass('col-2 text-end'),
        $actions.addClass('col-5 justify-content-end'),
      );
      this.#usersHtml.push({ tooltips, actions, userId: user.userId });

      this.$userList.append($row);
    });
  }

  addUser(userId, data) {
    const oldHash = this.users[userId] ? objHash(this.users[userId]) : null;
    this.users[userId] = {
      nickname: data.nickname || userId,
      ping: moment(data.ping),
    };
    const newHash = objHash(this.users[userId]);
    if (newHash !== oldHash) this.renderUserList(this.#getSearch());
  }

  removeUser(userId) {
    if (this.users[userId]) {
      delete this.users[userId];
      this.renderUserList(this.#getSearch());
    }
  }

  promoteModerator(userId) {
    if (!this.moderators.find((m) => m.userId === userId)) {
      this.moderators.push({ userId });
      this.renderUserList(this.#getSearch());
    }
  }

  demoteModerator(userId) {
    this.moderators = this.moderators.filter((m) => m.userId !== userId);
    this.renderUserList(this.#getSearch());
  }

  setModerators(moderatorList) {
    this.moderators = Array.isArray(moderatorList) ? moderatorList : [];
    this.renderUserList(this.#getSearch());
  }

  reqPromoteModerator(userId) {
    if (!this.moderators.find((m) => m.userId === userId)) {
      const html = this.#usersHtml.find((item) => item.userId === userId);
      if (html) html.actions.mod.prop('disabled', true).addClass('disabled');
      this.#client.addMod([userId]).then((result) => {
        if (html) html.actions.mod.prop('disabled', false).removeClass('disabled');
        if (!result.error) this.promoteModerator(userId);
      });
    }
  }

  reqDemoteModerator(userId) {
    const html = this.#usersHtml.find((item) => item.userId === userId);
    if (html) html.actions.mod.prop('disabled', true).addClass('disabled');
    this.#client.removeMod([userId]).then((result) => {
      if (html) html.actions.mod.prop('disabled', false).removeClass('disabled');
      if (!result.error) this.demoteModerator(userId);
    });
  }

  banUser(userId) {
    const html = this.#usersHtml.find((item) => item.userId === userId);
    if (html) html.actions.ban.prop('disabled', true).addClass('disabled');
    this.#client.banUser(userId).then((result) => {
      if (html) html.actions.ban.prop('disabled', false).removeClass('disabled');
      if (!result.error) this.removeUser(userId);
    });
  }

  unbanUser(userId) {
    this.$unbanInput.prop('disabled', true).addClass('disabled');
    this.#client.unbanUser(userId).then((result) => {
      this.$unbanInput.prop('disabled', false).removeClass('disabled');
      if (result.error)
        this.$unbanInput.val(typeof result.msg === 'string' ? result.msg : 'Unknown error');
      this.$unbanInput.trigger('focus').trigger('select');
    });
  }

  kickUser(userId) {
    const html = this.#usersHtml.find((item) => item.userId === userId);
    if (html) html.actions.kick.prop('disabled', true).addClass('disabled');
    this.#client.kickUser(userId).then((result) => {
      if (html) html.actions.kick.prop('disabled', false).removeClass('disabled');
      if (!result.error) this.removeUser(userId);
    });
  }

  destroy() {
    if (this.$root) this.$root.empty();
  }
}
