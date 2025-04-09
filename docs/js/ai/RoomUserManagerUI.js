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
    this.$searchInput = null;
    this.$userList = $('<div>');

    this.init();
  }

  setClient(client) {
    this.#client = client;
  }

  init() {
    this.renderHeader();
    this.renderUserList();
  }

  // Essa função será chamada pelo backend para atualizar o status da sala
  setRoomStatus(active) {
    this.roomActive = active;
    this.isWaitingRoomStatus = false;
    this.updateRoomStatusButton();
  }

  renderHeader() {
    this.$header = $('<div>').addClass(
      'd-flex flex-wrap align-items-center justify-content-between mb-3 gap-2',
    );

    // Kick all (menos quem está logado)
    const $kickAll = tinyLib.bs.button('danger').text('Kick all');
    $kickAll.on('click', () => {
      Object.keys(this.users).forEach((userId) => {
        if (userId !== this.currentUserId) {
          this.kickUser(userId);
        }
      });
    });

    // Room status
    const $roomStatus = tinyLib.bs.button('secondary');
    this.$roomStatusButton = $roomStatus;
    $roomStatus.on('click', () => {
      if (this.isWaitingRoomStatus) return;

      this.isWaitingRoomStatus = true;
      this.updateRoomStatusButton();

      const newStatus = !this.roomActive;
      // requestRoomStatusChange(newStatus); // Dispara requisição ao backend
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

      if (!user.isSelf) {
        // Apenas moderadores ou o dono podem ver botões de kick/ban
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
          tooltips.push($banBtn.tooltip(null, null, true));
          tooltips.push($kickBtn.tooltip(null, null, true));
        }

        // Apenas o dono pode promover/despromover moderadores
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
          tooltips.push($modBtn.tooltip(null, null, true));
        }
      } else {
        // Show disabled action buttons for yourself ("You")
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

        // Add "You" label beside the user name
        $info.append($('<span>').addClass('badge bg-secondary ms-2').text('You'));
      }

      $row.append(
        $info.addClass('col-5'),
        $ping.addClass('col-2 text-end'),
        $actions.addClass('col-5 justify-content-end'),
      );
      this.#usersHtml.push({ tooltips });

      this.$userList.append($row);
    });
  }

  addUser(userId, data) {
    this.users[userId] = {
      nickname: data.nickname || userId,
      ping: moment(data.ping),
    };
    this.renderUserList(this.$searchInput?.val()?.trim().toLowerCase() || '');
  }

  removeUser(userId) {
    if (this.users[userId]) {
      delete this.users[userId];
      this.renderUserList(this.$searchInput?.val()?.trim().toLowerCase() || '');
    }
  }

  updateUser(userId, newData) {
    if (this.users[userId]) {
      if (newData.nickname) this.users[userId].nickname = newData.nickname;
      if (newData.ping) this.users[userId].ping = moment(newData.ping);
      this.renderUserList(this.$searchInput?.val()?.trim().toLowerCase() || '');
    }
  }

  promoteModerator(userId) {
    if (!this.moderators.find((m) => m.userId === userId)) {
      this.moderators.push({ userId });
      this.renderUserList(this.$searchInput?.val()?.trim().toLowerCase() || '');
    }
  }

  demoteModerator(userId) {
    this.moderators = this.moderators.filter((m) => m.userId !== userId);
    this.renderUserList(this.$searchInput?.val()?.trim().toLowerCase() || '');
  }

  reqPromoteModerator(userId) {
    if (!this.moderators.find((m) => m.userId === userId)) {
      this.#client;
    }
  }

  reqDemoteModerator(userId) {
    this.#client;
  }

  setModerators(moderatorList) {
    this.moderators = Array.isArray(moderatorList) ? moderatorList : [];
    this.renderUserList(this.$searchInput?.val()?.trim().toLowerCase() || '');
  }

  banUser(userId) {
    this.#client;
  }

  kickUser(userId) {
    this.#client;
  }

  destroy() {
    if (this.$root) this.$root.empty();
  }
}
