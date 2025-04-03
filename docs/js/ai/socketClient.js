class TinyClientIo {
  #cfg;

  constructor(cfg) {
    const tinyThis = this;
    this.#cfg = cfg;
    this.socket = typeof cfg.ip === 'string' && cfg.ip.length > 0 ? new io(cfg.ip) : null;
    this.disconnectedDetails = { reason: null, details: null };

    this.id = null;
    this.connected = false;

    if (this.socket) {
      console.log('[socket.io] Starting...');
      this.socket.on('disconnect', (reason, details) => {
        console.log('[socket.io] Disconnected!', reason, details);
        tinyThis.id = null;
        tinyThis.disconnectedDetails = { reason, details };
        tinyThis.connected = tinyThis.socket.connected;
      });

      this.socket.on('connect_error', (err) => {
        console.error(err);
        if (!tinyThis.socket.active) {
          // the connection was denied by the server
          // in that case, `socket.connect()` must be manually called in order to reconnect
        }
      });

      this.socket.on('connect', () => {
        console.log(`[socket.io] Connected! Id: ${tinyThis.socket.id}`);
        tinyThis.id = tinyThis.socket.id;
        tinyThis.connected = tinyThis.socket.connected;
      });

      this.socket.io.on('reconnect_attempt', () => {
        console.log('[socket.io] Trying to reconnect...');
      });

      this.socket.io.on('reconnect', () => {
        console.log('[socket.io] Reconnecting...');
      });
    }
  }

  // Socket emit
  #socketEmitApi(where, data) {
    const tinyThis = this;
    return new Promise((resolve) => {
      tinyThis.socket.emit(where, data, (result) => resolve(result));
    });
  }

  // On connection
  onConnect(callback) {
    this.socket.on('connect', callback);
  }

  offConnect(callback) {
    this.socket.off('connect', callback);
  }
  onDisconnect(callback) {
    this.socket.on('disconnect', callback);
  }

  offDisconnect(callback) {
    this.socket.off('disconnect', callback);
  }

  // On new message
  onNewMessage(callback) {
    this.socket.on('new-message', callback);
  }

  offNewMessage(callback) {
    this.socket.off('new-message', callback);
  }

  // On message edit
  onMessageEdit(callback) {
    this.socket.on('update-message', callback);
  }

  offMessageEdit(callback) {
    this.socket.off('update-message', callback);
  }

  // On message delete
  onMessageDelete(callback) {
    this.socket.on('delete-message', callback);
  }

  offMessageDelete(callback) {
    this.socket.off('delete-message', callback);
  }

  // On dice result
  onDiceRoll(callback) {
    this.socket.on('roll-result', callback);
  }

  offDiceRoll(callback) {
    this.socket.off('roll-result', callback);
  }

  // On server ratelimit load
  onGetRateLimit(callback) {
    this.socket.on('update-ratelimts', callback);
  }

  offGetRateLimit(callback) {
    this.socket.off('update-ratelimts', callback);
  }

  // On user list load from room
  onUserList(callback) {
    this.socket.on('room-users', callback);
  }

  offUserList(callback) {
    this.socket.off('room-users', callback);
  }

  // On room history load
  onGetHistory(callback) {
    this.socket.on('room-history', callback);
  }

  offGetHistory(callback) {
    this.socket.off('room-history', callback);
  }

  // On room updates
  onRoomUpdates(callback) {
    this.socket.on('update-room', callback);
  }

  offRoomUpdates(callback) {
    this.socket.off('update-room', callback);
  }

  // On user banned from room
  onRoomBan(callback) {
    this.socket.on('user-banned', callback);
  }

  offRoomBan(callback) {
    this.socket.off('user-banned', callback);
  }

  // On kicked from room
  onRoomKick(callback) {
    this.socket.on('user-kicked', callback);
  }

  offRoomKick(callback) {
    this.socket.off('user-kicked', callback);
  }

  // On user left room
  onUserLeft(callback) {
    this.socket.on('user-left', callback);
  }

  offUserLeft(callback) {
    this.socket.off('user-left', callback);
  }

  // On user join room
  onUserJoin(callback) {
    this.socket.on('user-joined', callback);
  }

  offUserJoin(callback) {
    this.socket.off('user-joined', callback);
  }

  // On room data
  onRoomData(callback) {
    this.socket.on('update-room-data', callback);
  }

  offRoomData(callback) {
    this.socket.off('update-room-data', callback);
  }

  // On private room data
  onPrivateRoomData(callback) {
    this.socket.on('private-update-room-data', callback);
  }

  offPrivateRoomData(callback) {
    this.socket.off('private-update-room-data', callback);
  }

  // Login account
  login() {
    return this.#socketEmitApi('login', {
      userId: this.#cfg.username,
      password: this.#cfg.password,
    });
  }

  // Join room
  joinRoom() {
    return this.#socketEmitApi('join', {
      roomId: this.#cfg.roomId,
      roomPassword: this.#cfg.password,
    });
  }

  // Leave room
  leaveRoom() {
    return this.#socketEmitApi('leave', {
      roomId: this.#cfg.roomId,
    });
  }

  // Ban user room
  banUser(userId = '') {
    return this.#socketEmitApi('ban-from-room', {
      userId,
      roomId: this.#cfg.roomId,
    });
  }

  // Unban user room
  unbanUser(userId = '') {
    return this.#socketEmitApi('unban-from-room', {
      userId,
      roomId: this.#cfg.roomId,
    });
  }

  // Kick user room
  kickUser(userId = '') {
    return this.#socketEmitApi('kick-from-room', {
      userId,
      roomId: this.#cfg.roomId,
    });
  }

  // Create room
  createRoom(password = '', title = '') {
    return this.#socketEmitApi('create-room', {
      roomId: this.#cfg.roomId,
      password,
      title,
    });
  }

  // Delete room
  deleteRoom() {
    return this.#socketEmitApi('delete-room', {
      roomId: this.#cfg.roomId,
    });
  }

  // Disable room
  disableRoom() {
    return this.#socketEmitApi('disable-room', {
      roomId: this.#cfg.roomId,
    });
  }

  // Enable room
  enableRoom() {
    return this.#socketEmitApi('enable-room', {
      roomId: this.#cfg.roomId,
    });
  }

  // Add room mods
  addMod(mods = []) {
    return this.#socketEmitApi('room-add-mod', {
      roomId: this.#cfg.roomId,
      mods,
    });
  }

  // Remove room mods
  removeMod(mods = []) {
    return this.#socketEmitApi('room-remove-mod', {
      roomId: this.#cfg.roomId,
      mods,
    });
  }

  // Update room settings
  updateRoomSettings(settings = {}) {
    return this.#socketEmitApi('update-room', {
      roomId: this.#cfg.roomId,
      newSettings: settings,
    });
  }

  // Update room data
  updateRoomData(values = {}, isPrivate = false) {
    return this.#socketEmitApi('update-room', {
      roomId: this.#cfg.roomId,
      isPrivate,
      values,
    });
  }

  // Ban a server account
  banAccount(userId = '', reason = '') {
    return this.#socketEmitApi('ban', {
      userId,
      reason,
    });
  }

  // Unban a server account
  unbanAccount(userId = '') {
    return this.#socketEmitApi('unban', {
      userId,
    });
  }

  // Kick a server account
  kickAccount(userId = '') {
    return this.#socketEmitApi('kick', {
      userId,
    });
  }

  // Change your password
  changePassword(password = '') {
    return this.#socketEmitApi('change-password', {
      password,
    });
  }

  // Change your nickname
  changeNickname(nickname = '') {
    return this.#socketEmitApi('change-password', {
      nickname,
    });
  }

  // Register account
  register(userId = '', password = '', nickname = '') {
    return this.#socketEmitApi('change-password', {
      userId,
      password,
      nickname,
    });
  }

  // Send room message
  sendMessage(message = '') {
    return this.#socketEmitApi('send-message', {
      roomId: this.#cfg.roomId,
      message,
    });
  }

  // Edit room message
  editMessage(message = '', msgId = '') {
    return this.#socketEmitApi('edit-message', {
      roomId: this.#cfg.roomId,
      messageId: msgId,
      newText: message,
    });
  }

  // Delete room message
  deleteMessage(msgId = '') {
    return this.#socketEmitApi('delete-message', {
      roomId: this.#cfg.roomId,
      messageId: msgId,
    });
  }

  // Roll Dice
  rollDice(dice = [], sameSides = false) {
    return this.#socketEmitApi('roll-dice', {
      roomId: this.#cfg.roomId,
      sameSides,
      dice,
    });
  }

  getSocket() {
    return this.socket;
  }

  connect() {
    this.socket.connect();
  }

  disconnect() {
    this.socket.disconnect();
  }

  destroy() {
    if (this.socket) this.socket.destroy();
  }
}
