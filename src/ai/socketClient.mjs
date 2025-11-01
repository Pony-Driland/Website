import { EventEmitter } from 'events';
import { io as Io } from 'socket.io-client';
import { isJsonObject } from 'tiny-essentials/basics';

class TinyClientIo extends EventEmitter {
  #cfg = {
    /** @type {string|null} */
    roomId: null,
    /** @type {string|null} */
    username: null,
    /** @type {string|null} */
    password: null,
    /** @type {string|null} */
    roomPassword: null,
  };

  /** @type {string|null} */
  id = null;

  ratelimit = {};
  room = {};
  roomData = {};
  roomPrivateData = {};
  user = {};
  users = {};
  history = [];

  /** @type {string[]} */
  mods = [];

  connected = false;
  active = false;

  constructor(cfg) {
    super();
    const tinyThis = this;
    this.#cfg = cfg;

    /** @type {Io|null} */
    this.socket = typeof cfg.ip === 'string' && cfg.ip.length > 0 ? new Io(cfg.ip) : null;

    this.resetData();

    if (this.socket) {
      console.log('[socket.io] Starting...');
      this.socket.on('disconnect', (reason, details) => {
        tinyThis.active = tinyThis.socket.active;
        tinyThis.id = null;
        tinyThis.connected = tinyThis.socket.connected;

        console.log(
          `[socket-io] [disconnect]${typeof reason === 'string' ? ` ${reason}` : ''}`,
          details,
        );
      });

      this.socket.on('connect_error', (err) => {
        tinyThis.active = tinyThis.socket.active;
        if (!tinyThis.socket.active) {
          // the connection was denied by the server
          // in that case, `socket.connect()` must be manually called in order to reconnect
        }
      });

      this.socket.on('connect', () => {
        tinyThis.active = tinyThis.socket.active;
        console.log(`[socket.io] Connected! Id: ${tinyThis.socket.id}`);
        tinyThis.id = tinyThis.socket.id;
        tinyThis.connected = tinyThis.socket.connected;
      });

      this.socket.io.on('reconnect_attempt', () => {
        tinyThis.active = tinyThis.socket.active;
        console.log('[socket.io] Trying to reconnect...');
      });

      this.socket.io.on('reconnect', () => {
        tinyThis.active = tinyThis.socket.active;
        console.log('[socket.io] Reconnecting...');
      });
    }
  }

  /**
   * @param {string} userId
   * @returns {boolean}
   */
  isRoomMod(userId = this.getUserId()) {
    if (this.isRoomOwner(userId)) return true;
    for (const modId of this.getMods()) if (modId === userId) return true;
    return false;
  }

  /**
   * @param {string} userId
   * @returns {boolean}
   */
  isRoomOwner(userId = this.getUserId()) {
    if (this.room.ownerId === userId) return true;
    return false;
  }

  // Is Active
  isActive() {
    return this.active;
  }

  /**
   * Get user id
   * @returns {string|null}
   */
  getUserId() {
    return this.#cfg.username;
  }

  // Is connected
  isConnected() {
    return this.connected;
  }

  /**
   * Get room id
   * @returns {string|null}
   */
  getRoomId() {
    return this.#cfg.roomId;
  }

  // Reset data
  resetData() {
    this.ratelimit = {};
    this.room = {};
    this.roomData = {};
    this.roomPrivateData = {};
    this.user = {};
    this.users = {};
    this.history = [];
    this.mods = [];
  }

  // Rate limit
  setRateLimit(result) {
    this.ratelimit = { limit: {}, size: {}, time: null, loadAllHistory: null };
    if (isJsonObject(result)) {
      this.ratelimit.loadAllHistory =
        typeof result.loadAllHistory === 'boolean' ? result.loadAllHistory : true;
      this.ratelimit.time = typeof result.time === 'number' ? result.time : 0;
      this.ratelimit.openRegistration =
        typeof result.openRegistration === 'boolean' ? result.openRegistration : false;

      if (isJsonObject(result.limit)) {
        this.ratelimit.limit = {
          events: typeof result.limit.events === 'number' ? result.limit.events : 0,
          diceRolls: typeof result.limit.diceRolls === 'number' ? result.limit.diceRolls : 0,
          roomUpdates: typeof result.limit.roomUpdates === 'number' ? result.limit.roomUpdates : 0,
          msg: typeof result.limit.msg === 'number' ? result.limit.msg : 0,
          roomUsers: typeof result.limit.roomUsers === 'number' ? result.limit.roomUsers : 0,
        };
      }
      if (isJsonObject(result.size)) {
        this.ratelimit.size = {
          modelId: typeof result.size.modelId === 'number' ? result.size.modelId : 0,
          history: typeof result.size.history === 'number' ? result.size.history : 0,
          minPassword: typeof result.size.minPassword === 'number' ? result.size.minPassword : 0,
          msg: typeof result.size.msg === 'number' ? result.size.msg : 0,
          nickname: typeof result.size.nickname === 'number' ? result.size.nickname : 0,
          password: typeof result.size.password === 'number' ? result.size.password : 0,
          roomId: typeof result.size.roomId === 'number' ? result.size.roomId : 0,
          roomTitle: typeof result.size.roomTitle === 'number' ? result.size.roomTitle : 0,
          userId: typeof result.size.userId === 'number' ? result.size.userId : 0,
          prompt: typeof result.size.prompt === 'number' ? result.size.prompt : 0,
          systemInstruction:
            typeof result.size.systemInstruction === 'number' ? result.size.systemInstruction : 0,
          firstDialogue:
            typeof result.size.firstDialogue === 'number' ? result.size.firstDialogue : 0,
        };
      }
      if (isJsonObject(result.dice)) {
        this.ratelimit.dice = {
          img: typeof result.dice.img === 'number' ? result.dice.img : 0,
          border: typeof result.dice.border === 'number' ? result.dice.border : 0,
          bg: typeof result.dice.bg === 'number' ? result.dice.bg : 0,
          text: typeof result.dice.text === 'number' ? result.dice.text : 0,
          selectionBg: typeof result.dice.selectionBg === 'number' ? result.dice.selectionBg : 0,
          selectionText:
            typeof result.dice.selectionText === 'number' ? result.dice.selectionText : 0,
          amount: typeof result.dice.amount === 'number' ? result.dice.amount : 0,
          sides: typeof result.dice.sides === 'number' ? result.dice.sides : 0,
        };
      }
    }
  }

  getRateLimit() {
    return this.ratelimit || {};
  }

  // Dice
  setDice(result) {
    this.dice = {};
    if (isJsonObject(result)) {
      const ratelimit = this.getRateLimit()?.dice;
      this.dice.img =
        typeof result.img === 'string'
          ? result.img.substring(0, ratelimit.img || result.img.length)
          : null;
      this.dice.border =
        typeof result.border === 'string'
          ? result.border.substring(0, ratelimit.border || result.border.length)
          : null;
      this.dice.bg =
        typeof result.bg === 'string'
          ? result.bg.substring(0, ratelimit.bg || result.bg.length)
          : null;
      this.dice.text =
        typeof result.text === 'string'
          ? result.text.substring(0, ratelimit.text || result.text.length)
          : null;
      this.dice.selectionBg =
        typeof result.selectionBg === 'string'
          ? result.selectionBg.substring(0, ratelimit.selectionBg || result.selectionBg.length)
          : null;
      this.dice.selectionText =
        typeof result.selectionText === 'string'
          ? result.selectionText.substring(
              0,
              ratelimit.selectionText || result.selectionText.length,
            )
          : null;
    }
  }

  getDice() {
    return this.dice;
  }

  // User (local)
  setUser(result) {
    if (isJsonObject(result)) {
      this.user = {
        isAdmin: typeof result.isAdmin === 'boolean' ? result.isAdmin : false,
        isMod: typeof result.isMod === 'boolean' ? result.isMod : false,
        nickname: typeof result.nickname === 'string' ? result.nickname : '',
        userId: typeof result.userId === 'string' ? result.userId : '',
      };
      this.setRateLimit(result.ratelimit);
      this.setDice(result.dice);
    } else {
      this.user = {};
      this.setRateLimit();
      this.setDice();
    }
  }

  getUser() {
    return this.user || {};
  }

  // Users
  setUsers(result) {
    this.users = isJsonObject(result) ? result : {};
  }

  // Add user (Local)
  addUser(result) {
    if (!this.users) this.users = {};
    if (isJsonObject(result) && typeof result.userId === 'string') {
      this.users[result.userId] = {
        ping: typeof result.ping === 'number' ? result.ping : 0,
        nickname: typeof result.nickname === 'string' ? result.nickname : null,
      };
      return { data: this.users[result.userId], userId: result.userId };
    }
  }

  // Edit user (Local)
  editUser(result) {
    if (!this.users) this.users = {};
    if (isJsonObject(result) && typeof result.userId === 'string') {
      if (typeof result.ping === 'number') this.users[result.userId].ping = result.ping;
      if (typeof result.nickname === 'string') this.users[result.userId].nickname = result.nickname;
      return this.users[result.userId];
    }
  }

  // Remove user (Local)
  removeUser(result) {
    if (isJsonObject(result) && this.users) {
      if (typeof result.userId === 'string' && this.users[result.userId]) {
        delete this.users[result.userId];
        return result.userId;
      }
    }
    return null;
  }

  getUsers() {
    return this.users || {};
  }

  // Set Room (Local)
  setRoom(result) {
    if (isJsonObject(result)) {
      this.room = {
        title: typeof result.title === 'string' ? result.title : '',
        ownerId: typeof result.ownerId === 'string' ? result.ownerId : '',
        maxUsers: typeof result.maxUsers === 'number' ? result.maxUsers : 0,
        model: typeof result.model === 'string' ? result.model : null,
        prompt: typeof result.prompt === 'string' ? result.prompt : null,
        firstDialogue: typeof result.firstDialogue === 'string' ? result.firstDialogue : null,
        systemInstruction:
          typeof result.systemInstruction === 'string' ? result.systemInstruction : null,
        maxOutputTokens: typeof result.maxOutputTokens === 'number' ? result.maxOutputTokens : null,
        temperature: typeof result.temperature === 'number' ? result.temperature : null,
        topP: typeof result.topP === 'number' ? result.topP : null,
        topK: typeof result.topK === 'number' ? result.topK : null,
        presencePenalty: typeof result.presencePenalty === 'number' ? result.presencePenalty : null,
        frequencyPenalty:
          typeof result.frequencyPenalty === 'number' ? result.frequencyPenalty : null,
        disabled: typeof result.disabled === 'number' ? (result.disabled ? true : false) : false,
      };
      return this.room;
    }
  }

  // Set Room Data (Local)
  setRoomData(result) {
    if (
      isJsonObject(result) &&
      isJsonObject(result.values) &&
      typeof result.isPrivate === 'boolean'
    ) {
      if (result.isPrivate) this.roomPrivateData = result.values;
      else this.roomData = result.values;
      return { isPrivate: result.isPrivate, values: result.values };
    }
  }

  // Set room base (Local)
  setRoomBase(result) {
    if (
      isJsonObject(result) &&
      isJsonObject(result.data) &&
      isJsonObject(result.users) &&
      isJsonObject(result.roomData) &&
      isJsonObject(result.roomPrivateData) &&
      Array.isArray(result.mods)
    ) {
      // Room data
      this.setRoom(result.data);

      // Users
      this.setUsers({});
      for (const item in result.users) this.addUser({ userId: item, ...result.users[item] });

      // Mods
      this.setMods([]);
      for (const index in result.mods)
        if (typeof result.mods[index].userId === 'string')
          this.addModUser(result.mods[index].userId);

      // Room Data
      this.setRoomData({ values: result.roomData, isPrivate: false });
      this.setRoomData({ values: result.roomPrivateData, isPrivate: true });

      // Complete
      return true;
    }
    // Error
    else {
      this.setRoom({});
      this.setUsers({});
      this.setMods([]);
      return false;
    }
  }

  getRoomData() {
    return this.roomData || {};
  }

  getRoomPrivateData() {
    return this.roomPrivateData || {};
  }

  getRoom() {
    return this.room || {};
  }

  /**
   * Mods
   * @returns {string[]}
   */
  getMods() {
    return this.mods ?? [];
  }

  /**
   * (Local)
   * @param {string[]} result
   */
  setMods(result) {
    this.mods = Array.isArray(result) ? result : [];
  }

  /**
   * (Local)
   */
  addModUser(userId) {
    if (this.mods.indexOf(userId) < 0) this.mods.push(userId);
  }

  /**
   * (Local)
   */
  removeModUser(userId) {
    const index = this.mods.indexOf(userId);
    if (index > -1) this.mods.splice(index, 1);
  }

  // Socket emit
  #socketEmitApi(where, data) {
    const tinyThis = this;
    return new Promise((resolve) => tinyThis.socket.emit(where, data, (result) => resolve(result)));
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

  // On user updated
  onUserUpdated(callback) {
    this.socket.on('user-updated', callback);
  }

  offUserUpdated(callback) {
    this.socket.off('user-updated', callback);
  }

  // On message load
  onRoomEnter(callback) {
    this.socket.on('room-entered', callback);
  }

  offRoomEnter(callback) {
    this.socket.off('room-entered', callback);
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
    this.socket.on('message-updated', callback);
  }

  offMessageEdit(callback) {
    this.socket.off('message-updated', callback);
  }

  // On message delete
  onMessageDelete(callback) {
    this.socket.on('message-deleted', callback);
  }

  offMessageDelete(callback) {
    this.socket.off('message-deleted', callback);
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
    this.socket.on('ratelimt-updated', callback);
  }

  offGetRateLimit(callback) {
    this.socket.off('ratelimt-updated', callback);
  }

  // On room updates
  onRoomUpdates(callback) {
    this.socket.on('room-updated', callback);
  }

  offRoomUpdates(callback) {
    this.socket.off('room-updated', callback);
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
    this.socket.on('room-data-updated', callback);
  }

  offRoomData(callback) {
    this.socket.off('room-data-updated', callback);
  }

  // On mod change
  onRoomModChange(callback) {
    this.socket.on('room-mod-updated', callback);
  }

  offRoomModChange(callback) {
    this.socket.off('room-mod-updated', callback);
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
      password: this.#cfg.roomPassword,
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

  // Login account
  setAccountDice(diceSkin) {
    return this.#socketEmitApi('set-dice', {
      diceSkin,
    });
  }

  // Create room
  existsRoom() {
    return this.#socketEmitApi('exists-room', {
      roomId: this.#cfg.roomId,
    });
  }

  // Create room
  createRoom(title = '') {
    return this.#socketEmitApi('create-room', {
      roomId: this.#cfg.roomId,
      password: this.#cfg.roomPassword,
      title,
    });
  }

  // Delete room
  deleteRoom(password) {
    return this.#socketEmitApi('delete-room', {
      roomId: this.#cfg.roomId,
      password,
    });
  }

  // Disable room
  disableRoom() {
    const tinyThis = this;
    return new Promise((resolve, reject) =>
      tinyThis
        .#socketEmitApi('disable-room', {
          roomId: this.#cfg.roomId,
        })
        .then((result) => {
          if (!result.error) tinyThis.room.disabled = true;
          resolve(result);
        })
        .catch(reject),
    );
  }

  // Enable room
  enableRoom() {
    const tinyThis = this;
    return new Promise((resolve, reject) =>
      tinyThis
        .#socketEmitApi('enable-room', {
          roomId: this.#cfg.roomId,
        })
        .then((result) => {
          if (!result.error) tinyThis.room.disabled = false;
          resolve(result);
        })
        .catch(reject),
    );
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
    return this.#socketEmitApi('update-room-data', {
      roomId: this.#cfg.roomId,
      isPrivate,
      values,
    });
  }

  // Is moderator
  accountIsMod(userId = '') {
    return this.#socketEmitApi('user-is-mod', {
      userId,
    });
  }

  // Is Owner
  accountIsOwner(userId = '') {
    return this.#socketEmitApi('user-is-owner', {
      userId,
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
  changePassword(oldPassword = '', password = '') {
    return this.#socketEmitApi('change-password', {
      password,
      oldPassword,
    });
  }

  // Change your nickname
  changeNickname(nickname = '') {
    const tinyThis = this;
    return new Promise((resolve, reject) =>
      tinyThis
        .#socketEmitApi('change-nickname', {
          nickname,
        })
        .then((result) => {
          if (!result.error) tinyThis.user.nickname = nickname;
          resolve(result);
        })
        .catch(reject),
    );
  }

  // Register account
  register(userId = '', password = '', nickname = '') {
    return this.#socketEmitApi('register', {
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
  rollDice(dice = [], canZero = false) {
    return this.#socketEmitApi('roll-dice', {
      roomId: this.#cfg.roomId,
      canZero,
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

  /** @returns {boolean} */
  checkRoomId(result) {
    return isJsonObject(result) && result.roomId === this.getRoomId();
  }

  install(tinyAiScript) {
    const client = this;
    window.tinyClient = client;
    // Dice
    client.onDiceRoll((result) => {
      if (client.checkRoomId(result)) {
        const data = { total: null, results: null, userId: null, skin: null };

        if (isJsonObject(result.skin)) {
          data.skin = {
            bg: typeof result.skin.bg === 'string' ? result.skin.bg : null,
            border: typeof result.skin.border === 'string' ? result.skin.border : null,
            img: typeof result.skin.img === 'string' ? result.skin.img : null,
            selectionBg:
              typeof result.skin.selectionBg === 'string' ? result.skin.selectionBg : null,
            selectionText:
              typeof result.skin.selectionText === 'string' ? result.skin.selectionText : null,
            text: typeof result.skin.text === 'string' ? result.skin.text : null,
          };
        }

        if (typeof result.userId === 'string') data.userId = result.userId;
        if (typeof result.total === 'number') data.total = result.total;
        if (Array.isArray(result.results)) {
          data.results = [];
          for (const index in result.results)
            if (
              typeof result.results[index].sides === 'number' &&
              typeof result.results[index].roll === 'number'
            )
              data.results.push({
                sides: result.results[index].sides,
                roll: result.results[index].roll,
              });
        }

        client.emit('diceRoll', data);
        console.log('[socket-io] [dice]', data);
      }
    });

    // Get user updated
    client.onUserUpdated((result) => {
      if (
        client.checkRoomId(result) &&
        isJsonObject(result.data) &&
        typeof result.userId === 'string' &&
        typeof result.data.nickname === 'string'
      ) {
        const data = client.editUser({ userId: result.userId, nickname: result.data.nickname });
        if (result.userId === client.getUserId()) this.user.nickname = result.data.nickname;

        if (data) client.emit('userUpdated', data);
        console.log('[socket-io] [user-data]', result);
      }
    });

    // Get ratelimit data
    client.onGetRateLimit((result) => {
      client.setRateLimit(result);
      client.emit('getRateLimit', client.getRateLimit());
      console.log('[socket-io] [ratelimit]', client.getRateLimit());
    });

    // Room updates
    client.onRoomUpdates((result) => {
      if (client.checkRoomId(result) && isJsonObject(result.data)) {
        const data = client.setRoom(result.data);
        if (data) client.emit('roomUpdates', data);
        console.log('[socket-io] [room]', client.getRoom());
      }
    });

    // User ban
    client.onRoomBan((result) => {
      if (client.checkRoomId(result)) {
        const data = typeof result.userId === 'string' ? result.userId : null;
        client.emit('userBanned', data);
        console.log('[socket-io] [room-ban]', data);
      }
    });

    // User kick
    client.onRoomKick((result) => {
      if (client.checkRoomId(result)) {
        const data = typeof result.userId === 'string' ? result.userId : null;
        client.emit('userKicked', data);
        console.log('[socket-io] [room-kick]', data);
      }
    });

    // User left
    client.onUserLeft((result) => {
      if (client.checkRoomId(result)) {
        const data = client.removeUser(result);
        if (data) client.emit('userLeft', data);
        console.log('[socket-io] [room-users]', client.getUsers());
      }
    });

    // User join
    client.onUserJoin((result) => {
      if (client.checkRoomId(result)) {
        const data = client.addUser(result);
        if (data) client.emit('userJoined', data);
        console.log('[socket-io] [room-users]', client.getUsers());
      }
    });

    // Room data
    client.onRoomData((result) => {
      if (client.checkRoomId(result)) {
        const data = client.setRoomData(result);
        if (data) client.emit('roomDataUpdates', data);
        console.log('[socket-io] [room-json-data]', data);
      }
    });

    // New message
    client.onNewMessage((result) => {
      if (client.checkRoomId(result)) {
        client.emit('newMessage', data);
        console.log('[socket-io] [message-add]');
      }
    });

    // Message delete
    client.onMessageDelete((result) => {
      if (client.checkRoomId(result)) {
        client.emit('messageDelete', data);
        console.log('[socket-io] [message-delete]');
      }
    });

    // Message edit
    client.onMessageEdit((result) => {
      if (client.checkRoomId(result)) {
        client.emit('messageEdit', data);
        console.log('[socket-io] [message-edit]');
      }
    });

    // Get room data
    client.onRoomEnter((result) => {
      if (client.checkRoomId(result)) {
        if (!client.setRoomBase(result)) client.emit('roomEntered', false);
        else client.emit('roomEntered', true);

        client.emit('roomEnter');
        console.log('[socket-io] [room-data]', {
          room: client.getRoom(),
          users: client.getUsers(),
          mods: client.getMods(),
          roomData: client.getRoomData(),
          roomPrivateData: client.getRoomPrivateData(),
        });
      }
    });

    // Mod list update
    client.onRoomModChange((result) => {
      if (client.checkRoomId(result)) {
        if (Array.isArray(result.result)) {
          for (const index in result.result) {
            if (typeof result.result[index] === 'string') {
              if (result.type === 'add') {
                client.addModUser(result.result[index]);
                client.emit('roomModChange', 'add', result.result[index]);
              }
              if (result.type === 'remove') {
                client.removeModUser(result.result[index]);
                client.emit('roomModChange', 'remove', result.result[index]);
              }
            }
          }
        }

        console.log('[socket-io] [mod-data]', client.getMods());
      }
    });

    // Connect
    client.onConnect(() => {
      client.resetData();
      client.emit('connect', client.getSocket()?.id);
      // Login
      client.login().then((result) => {
        // Check room
        client.emit('join', result);
        if (!result.error) {
          // Insert data
          client.setUser(result);
          console.log('[socket-io] [user-data]', client.getUser());
          console.log('[socket-io] [dice]', client.getDice());
          console.log('[socket-io] [ratelimit]', client.getRateLimit());
          client.existsRoom().then((result2) => {
            // Join room
            const joinRoom = () =>
              client.joinRoom().then((result4) => {
                // Error
                if (result4.error) client.emit('roomError', result4);
                // Complete
                else client.emit('roomJoinned', result4);
              });

            // Error
            if (result2.error) client.emit('roomError', result2);
            // Exists?
            else if (result2.exists) joinRoom();
            else {
              if (!tinyAiScript.mpClient)
                client.createRoom().then((result3) => {
                  if (!result3.error) joinRoom();
                  else client.emit('roomError', result3);
                });
              else client.emit('roomNotFound', result2);
            }
          });
        }
      });
    });

    // Disconnect
    client.onDisconnect((reason, details) => {
      client.emit('disconnect', reason, details);
    });
  }
}

export default TinyClientIo;
