import { EventEmitter } from 'events';
import { io as Io } from 'socket.io-client';
import { countObj, isJsonObject } from 'tiny-essentials/basics/objChecker';

/** @typedef {{ error: boolean; msg: string; code: number; }} SocketError */

/**
 * @typedef {Object} TinyClientIoConfig
 * @property {string} [ip] - Socket.IO server URL.
 * @property {string|null} [roomId] - Current room id.
 * @property {string|null} [username] - Current username.
 * @property {string|null} [password] - Current user password.
 * @property {string|null} [roomPassword] - Current room password.
 */

class TinyClientIo extends EventEmitter {
  /** @type {TinyClientIoConfig} */
  #cfg = {
    roomId: null,
    username: null,
    password: null,
    roomPassword: null,
  };

  /** @type {string|null} */
  id = null;

  /** @type {RatelimitState} */
  ratelimit = { limit: {}, size: {} };
  /** @type {RoomState} */
  room = {};
  /** @type {RoomDataValues} */
  roomData = {};
  /** @type {RoomDataValues} */
  roomPrivateData = {};
  /** @type {SocketUser} */
  user = {};
  /** @type {Record<string, SocketUserEntry>} */
  users = {};
  /** @type {SocketHistoryEntry[]} */
  history = [];

  /** @type {string[]} */
  mods = [];

  /** @type {RoomRole} */
  role = 'guest';

  /**
   * Whether the server reported the room roles.
   *
   * Older servers do not know about the room permissions, so the client must
   * keep the composer enabled for everybody in that case.
   *
   * @type {boolean}
   */
  rolesEnabled = false;

  /** @type {RoomPermissionEntry[]} */
  permissions = [];

  /** @type {Record<string, string>} */
  roles = {
    OWNER: 'owner',
    MODERATOR: 'moderator',
    MEMBER: 'member',
    GUEST: 'guest',
  };

  connected = false;
  active = false;

  /** @type {RpgSchemaValues} */
  rpgSchema = {};

  /** @type {DiceSkin} */
  dice = {};

  /** @type {import('socket.io-client').Socket|null} */
  socket = null;

  /**
   * @param {TinyClientIoConfig} cfg - Client configuration.
   */
  constructor(cfg) {
    super();
    this.#cfg = cfg;

    this.socket = typeof cfg.ip === 'string' && cfg.ip.length > 0 ? Io(cfg.ip) : null;

    this.resetData();

    const socket = this.socket;

    if (socket) {
      console.log('[socket.io] Starting...');
      socket.on('disconnect', (reason, details) => {
        this.active = socket.active;
        this.id = null;
        this.connected = socket.connected;

        console.log(
          `[socket-io] [disconnect]${typeof reason === 'string' ? ` ${reason}` : ''}`,
          details,
        );
      });

      socket.on('connect_error', () => {
        this.active = socket.active;
        if (!socket.active) {
          // the connection was denied by the server
          // in that case, `socket.connect()` must be manually called in order to reconnect
        }
      });

      socket.on('connect', () => {
        this.active = socket.active;
        console.log(`[socket.io] Connected! Id: ${socket.id}`);
        this.id = socket.id ?? null;
        this.connected = socket.connected;
      });

      socket.io.on('reconnect_attempt', () => {
        this.active = socket.active;
        console.log('[socket.io] Trying to reconnect...');
      });

      socket.io.on('reconnect', () => {
        this.active = socket.active;
        console.log('[socket.io] Reconnecting...');
      });
    }
  }

  /**
   * @param {string|null} [userId]
   * @returns {boolean}
   */
  isRoomMod(userId = this.getUserId()) {
    if (this.isRoomOwner(userId)) return true;
    for (const modId of this.getMods()) if (modId === userId) return true;
    return false;
  }

  /**
   * @param {string|null} [userId]
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
    return this.#cfg.username ?? null;
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
    return this.#cfg.roomId ?? null;
  }

  // Reset data
  resetData() {
    this.ratelimit = { limit: {}, size: {} };
    this.room = {};
    this.rpgSchema = {};
    this.roomData = {};
    this.roomPrivateData = {};
    this.user = {};
    this.users = {};
    this.history = [];
    this.mods = [];
    this.role = 'guest';
    this.rolesEnabled = false;
    this.permissions = [];
  }

  /**
   * Role of the signed-in account inside the room.
   *
   * @returns {RoomRole}
   */
  getRole() {
    return this.role;
  }

  /**
   * Stores the role of the signed-in account inside the room.
   *
   * @param {unknown} role - Role sent by the server.
   * @returns {RoomRole} The stored role.
   */
  setRole(role) {
    const roles = Object.values(this.roles);
    const isValid = typeof role === 'string' && roles.includes(role);
    this.rolesEnabled = isValid;
    this.role = /** @type {RoomRole} */ (isValid ? role : 'guest');
    return this.role;
  }

  /**
   * Tells whether the signed-in account is a read-only guest.
   *
   * A guest can read the room, but cannot send messages, edit or delete them.
   *
   * @returns {boolean}
   */
  isGuest() {
    return this.rolesEnabled && this.role === 'guest';
  }

  /**
   * Tells whether the signed-in account may talk in the room.
   *
   * @returns {boolean}
   */
  canSpeak() {
    return !this.isGuest();
  }

  /**
   * Replaces the list of users allowed to speak in the room.
   *
   * @param {unknown} permissions - Permission list sent by the server.
   * @returns {RoomPermissionEntry[]} The stored list.
   */
  setPermissions(permissions) {
    this.permissions = Array.isArray(permissions)
      ? permissions
          .filter((item) => isJsonObject(item) && typeof item.userId === 'string')
          .map((item) => ({
            userId: String(item.userId),
            grantedBy: typeof item.grantedBy === 'string' ? item.grantedBy : null,
            date: typeof item.date === 'number' ? item.date : 0,
          }))
      : [];
    return this.permissions;
  }

  /**
   * List of users allowed to speak in the room.
   *
   * @returns {RoomPermissionEntry[]}
   */
  getPermissions() {
    return this.permissions || [];
  }

  /**
   * Tells whether an user is allowed to speak in the room.
   *
   * @param {string} userId - User id.
   * @returns {boolean}
   */
  canUserSpeak(userId) {
    return this.getPermissions().some((item) => item.userId === userId);
  }

  // Rate limit
  /** @param {unknown} [result] */
  setRateLimit(result) {
    this.ratelimit = { limit: {}, size: {}, time: null, loadAllHistory: false };
    if (isJsonObject(result)) {
      this.ratelimit.loadAllHistory =
        typeof result.loadAllHistory === 'boolean' ? result.loadAllHistory : false;
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
  /** @param {unknown} [result] */
  setDice(result) {
    this.dice = {};
    if (isJsonObject(result)) {
      const ratelimit = this.getRateLimit()?.dice ?? {};
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
  /** @param {unknown} result */
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
  /** @param {unknown} result */
  setUsers(result) {
    this.users = isJsonObject(result)
      ? /** @type {Record<string, SocketUserEntry>} */ (result)
      : {};
  }

  // Add user (Local)
  /** @param {unknown} result */
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
  /** @param {unknown} result */
  editUser(result) {
    if (!this.users) this.users = {};
    if (isJsonObject(result) && typeof result.userId === 'string') {
      if (typeof result.ping === 'number') this.users[result.userId].ping = result.ping;
      if (typeof result.nickname === 'string') this.users[result.userId].nickname = result.nickname;
      return this.users[result.userId];
    }
  }

  // Remove user (Local)
  /** @param {unknown} result */
  removeUser(result) {
    if (isJsonObject(result) && this.users) {
      if (typeof result.userId === 'string' && this.users[result.userId]) {
        const data = { data: structuredClone(this.users[result.userId]), userId: result.userId };
        delete this.users[result.userId];
        return data;
      }
    }
    return null;
  }

  getUsers() {
    return this.users || {};
  }

  // Set Room (Local)
  /** @param {unknown} result */
  /** @param {unknown} result */
  setRoom(result) {
    if (isJsonObject(result)) {
      this.room = {
        title: typeof result.title === 'string' ? result.title : '',
        ownerId: typeof result.ownerId === 'string' ? result.ownerId : '',
        maxUsers: typeof result.maxUsers === 'number' ? result.maxUsers : 0,
        chapter: typeof result.chapter === 'number' ? result.chapter : 0,
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

        disabled:
          typeof result.disabled === 'number'
            ? result.disabled
              ? true
              : false
            : typeof result.disabled === 'boolean'
              ? result.disabled
              : false,

        readOnly:
          typeof result.readOnly === 'number'
            ? result.readOnly
              ? true
              : false
            : typeof result.readOnly === 'boolean'
              ? result.readOnly
              : false,
      };
      return this.room;
    }
  }

  /**
   * @param {unknown} result
   */
  setRpgSchema(result) {
    if (isJsonObject(result)) {
      this.rpgSchema = result;
      return { values: result };
    }
  }

  /**
   * Set Room Data (Local)
   * @param {unknown} result
   */
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

  /**
   * Set room base (Local)
   * @param {unknown} result
   */
  setRoomBase(result) {
    if (
      isJsonObject(result) &&
      isJsonObject(result.data) &&
      isJsonObject(result.rpgSchema) &&
      isJsonObject(result.users) &&
      isJsonObject(result.roomData) &&
      isJsonObject(result.roomPrivateData) &&
      Array.isArray(result.mods)
    ) {
      // Room rpg schema
      this.setRpgSchema(result.rpgSchema);

      // Room data
      this.setRoom(result.data);

      // Role and permissions of the signed-in account
      this.setRole(result.role);
      this.setPermissions(result.permissions);

      // Users
      this.setUsers({});
      for (const item in result.users)
        this.addUser({
          userId: item,
          .../** @type {Record<string, unknown>} */ (result.users[item]),
        });

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
      this.setRpgSchema({});
      this.setRoom({});
      this.setUsers({});
      this.setMods([]);
      this.setRole('guest');
      this.setPermissions([]);
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

  getRpgSchema() {
    return this.rpgSchema || {};
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
  /** @param {unknown} result */
  setMods(result) {
    this.mods = Array.isArray(result) ? result : [];
  }

  /**
   * (Local)
   */
  /** @param {string} userId */
  addModUser(userId) {
    if (this.mods.indexOf(userId) < 0) this.mods.push(userId);
  }

  /**
   * (Local)
   */
  /** @param {string} userId */
  removeModUser(userId) {
    const index = this.mods.indexOf(userId);
    if (index > -1) this.mods.splice(index, 1);
  }

  /**
   * Emits a socket event and resolves with the server acknowledgement.
   *
   * @template {SocketAck} T
   * @param {string} where - Event name.
   * @param {unknown} data - Event payload.
   * @returns {Promise<T>} The server acknowledgement.
   */
  #socketEmitApi(where, data) {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve(/** @type {T} */ (/** @type {unknown} */ ({ error: true })));
        return;
      }
      this.socket.emit(where, data, (/** @type {T} */ result) => resolve(result));
    });
  }

  /**
   * Registers a listener on the underlying socket.
   *
   * @param {string} event - Socket event name.
   * @param {SocketListener} callback - Listener invoked by the server.
   * @returns {void}
   */
  #socketOn(event, callback) {
    if (!this.socket) return;
    this.socket.on(event, callback);
  }

  /**
   * Removes a listener from the underlying socket.
   *
   * @param {string} event - Socket event name.
   * @param {SocketListener} callback - Listener to remove.
   * @returns {void}
   */
  #socketOff(event, callback) {
    if (!this.socket) return;
    this.socket.off(event, callback);
  }

  /**
   * On connection
   * @param {SocketListener} callback
   */
  onConnect(callback) {
    this.#socketOn('connect', callback);
  }

  /**
   * @param {SocketListener} callback
   */
  offConnect(callback) {
    this.#socketOff('connect', callback);
  }

  /**
   * @param {SocketListener} callback
   **/
  onDisconnect(callback) {
    this.#socketOn('disconnect', callback);
  }

  /**
   * @param {SocketListener} callback
   */
  offDisconnect(callback) {
    this.#socketOff('disconnect', callback);
  }

  /**
   * On user updated
   * @param {SocketListener} callback
   */
  onUserUpdated(callback) {
    this.#socketOn('user-updated', callback);
  }

  /**
   * @param {SocketListener} callback
   */
  offUserUpdated(callback) {
    this.#socketOff('user-updated', callback);
  }

  /**
   * On message load
   * @param {SocketListener} callback
   */
  onRoomEnter(callback) {
    this.#socketOn('room-entered', callback);
  }

  /**
   * @param {SocketListener} callback
   */
  offRoomEnter(callback) {
    this.#socketOff('room-entered', callback);
  }

  /**
   * On new message
   * @param {SocketListener} callback
   */
  onNewMessage(callback) {
    this.#socketOn('new-message', callback);
  }

  /**
   * @param {SocketListener} callback
   */
  offNewMessage(callback) {
    this.#socketOff('new-message', callback);
  }

  /**
   * On message edit
   * @param {SocketListener} callback
   * */
  onMessageEdit(callback) {
    this.#socketOn('message-updated', callback);
  }

  /**
   * @param {SocketListener} callback
   * */
  offMessageEdit(callback) {
    this.#socketOff('message-updated', callback);
  }

  /**
   * On message delete
   * @param {SocketListener} callback
   * */
  onMessageDelete(callback) {
    this.#socketOn('message-deleted', callback);
  }

  /**
   * @param {SocketListener} callback
   * */
  offMessageDelete(callback) {
    this.#socketOff('message-deleted', callback);
  }

  /**
   * On dice result
   * @param {SocketListener} callback
   */
  onDiceRoll(callback) {
    this.#socketOn('roll-result', callback);
  }

  /**
   * @param {SocketListener} callback
   */
  offDiceRoll(callback) {
    this.#socketOff('roll-result', callback);
  }

  /**
   * On server ratelimit load
   * @param {SocketListener} callback
   */
  onGetRateLimit(callback) {
    this.#socketOn('ratelimt-updated', callback);
  }

  /**
   * @param {SocketListener} callback
   */
  offGetRateLimit(callback) {
    this.#socketOff('ratelimt-updated', callback);
  }

  /**
   * On room updates
   * @param {SocketListener} callback
   */
  onRpgSchemaUpdates(callback) {
    this.#socketOn('rpg-schema-updated', callback);
  }

  /**
   * On room updates
   * @param {SocketListener} callback
   */
  onRoomUpdates(callback) {
    this.#socketOn('room-updated', callback);
  }

  /**
   * @param {SocketListener} callback
   */
  offRoomUpdates(callback) {
    this.#socketOff('room-updated', callback);
  }

  /**
   *  On user banned from room
   * @param {SocketListener} callback
   */
  onRoomBan(callback) {
    this.#socketOn('user-banned', callback);
  }

  /**
   * @param {SocketListener} callback
   */
  offRoomBan(callback) {
    this.#socketOff('user-banned', callback);
  }

  /**
   * On kicked from room
   * @param {SocketListener} callback
   */
  onRoomKick(callback) {
    this.#socketOn('user-kicked', callback);
  }

  /**
   * @param {SocketListener} callback
   */
  offRoomKick(callback) {
    this.#socketOff('user-kicked', callback);
  }

  /**
   * On user left room
   * @param {SocketListener} callback
   */
  onUserLeft(callback) {
    this.#socketOn('user-left', callback);
  }

  /**
   * @param {SocketListener} callback
   */
  offUserLeft(callback) {
    this.#socketOff('user-left', callback);
  }

  /**
   * On user join room
   * @param {SocketListener} callback
   */
  onUserJoin(callback) {
    this.#socketOn('user-joined', callback);
  }

  /**
   * @param {SocketListener} callback
   */
  offUserJoin(callback) {
    this.#socketOff('user-joined', callback);
  }

  /**
   * On room data
   * @param {SocketListener} callback
   */
  onRoomData(callback) {
    this.#socketOn('room-data-updated', callback);
  }

  /**
   * @param {SocketListener} callback
   */
  offRoomData(callback) {
    this.#socketOff('room-data-updated', callback);
  }

  /**
   * On room permission change
   * @param {SocketListener} callback
   */
  onRoomPermissionChange(callback) {
    this.#socketOn('room-permission-updated', callback);
  }

  /**
   * @param {SocketListener} callback
   */
  offRoomPermissionChange(callback) {
    this.#socketOff('room-permission-updated', callback);
  }

  /**
   * On mod change
   * @param {SocketListener} callback
   */
  onRoomModChange(callback) {
    this.#socketOn('room-mod-updated', callback);
  }

  /**
   * @param {SocketListener} callback
   */
  offRoomModChange(callback) {
    this.#socketOff('room-mod-updated', callback);
  }

  /**
   * Login account
   */
  login() {
    return this.#socketEmitApi('login', {
      userId: this.#cfg.username,
      password: this.#cfg.password,
    });
  }

  /**
   * Join room
   */
  joinRoom() {
    return this.#socketEmitApi('join', {
      roomId: this.#cfg.roomId,
      password: this.#cfg.roomPassword,
    });
  }

  /**
   * Leave room
   */
  leaveRoom() {
    return this.#socketEmitApi('leave', {
      roomId: this.#cfg.roomId,
    });
  }

  /**
   * Ban user room
   */
  banUser(userId = '') {
    return this.#socketEmitApi('ban-from-room', {
      userId,
      roomId: this.#cfg.roomId,
    });
  }

  /**
   * Unban user room
   */
  unbanUser(userId = '') {
    return this.#socketEmitApi('unban-from-room', {
      userId,
      roomId: this.#cfg.roomId,
    });
  }

  /**
   * Kick user room
   * @param {string|string[]} userId
   */
  kickUser(userId = '') {
    return this.#socketEmitApi('kick-from-room', {
      userId,
      roomId: this.#cfg.roomId,
    });
  }

  /**
   * Login account
   * @param {DiceSkin} diceSkin
   */
  setAccountDice(diceSkin) {
    return this.#socketEmitApi('set-dice', {
      diceSkin,
    });
  }

  /**
   * Create room
   */
  existsRoom() {
    return this.#socketEmitApi('exists-room', {
      roomId: this.#cfg.roomId,
    });
  }

  /**
   * Create room
   */
  createRoom(title = '') {
    return this.#socketEmitApi('create-room', {
      roomId: this.#cfg.roomId,
      password: this.#cfg.roomPassword,
      title,
    });
  }

  /**
   * Delete room
   * @param {string} password
   */
  deleteRoom(password) {
    return this.#socketEmitApi('delete-room', {
      roomId: this.#cfg.roomId,
      password,
    });
  }

  /**
   * Disable readOnly room
   */
  disableReadOnlyRoom() {
    return new Promise((resolve, reject) =>
      this.#socketEmitApi('disable-readonly-room', {
        roomId: this.#cfg.roomId,
      })
        .then((result) => {
          if (!result.error) this.room.readOnly = false;
          resolve(result);
        })
        .catch(reject),
    );
  }

  /**
   * Enable readOnly room
   */
  enableReadOnlyRoom() {
    return new Promise((resolve, reject) =>
      this.#socketEmitApi('enable-readonly-room', {
        roomId: this.#cfg.roomId,
      })
        .then((result) => {
          if (!result.error) this.room.readOnly = true;
          resolve(result);
        })
        .catch(reject),
    );
  }

  /**
   * Disable room
   */
  disableRoom() {
    return new Promise((resolve, reject) =>
      this.#socketEmitApi('disable-room', {
        roomId: this.#cfg.roomId,
      })
        .then((result) => {
          if (!result.error) this.room.disabled = true;
          resolve(result);
        })
        .catch(reject),
    );
  }

  /**
   * Enable room
   */
  enableRoom() {
    return new Promise((resolve, reject) =>
      this.#socketEmitApi('enable-room', {
        roomId: this.#cfg.roomId,
      })
        .then((result) => {
          if (!result.error) this.room.disabled = false;
          resolve(result);
        })
        .catch(reject),
    );
  }

  /**
   * Add room mods
   * @param {string[]} mods
   */
  addMod(mods = []) {
    return this.#socketEmitApi('room-add-mod', {
      roomId: this.#cfg.roomId,
      mods,
    });
  }

  /**
   * Remove room mods
   * @param {string[]} mods
   */
  removeMod(mods = []) {
    return this.#socketEmitApi('room-remove-mod', {
      roomId: this.#cfg.roomId,
      mods,
    });
  }

  /**
   * Grant the permission to speak to a list of users.
   *
   * Only the room owner (or the server owner) is allowed to do it.
   *
   * @param {string[]} userIds - Users that will be allowed to talk.
   * @returns {Promise<SocketAck>}
   */
  grantPermission(userIds = []) {
    return this.#socketEmitApi('room-grant-permission', {
      roomId: this.#cfg.roomId,
      userIds,
    });
  }

  /**
   * Revoke the permission to speak of a list of users.
   *
   * Only the room owner (or the server owner) is allowed to do it.
   *
   * @param {string[]} userIds - Users that will lose the permission to talk.
   * @returns {Promise<SocketAck>}
   */
  revokePermission(userIds = []) {
    return this.#socketEmitApi('room-revoke-permission', {
      roomId: this.#cfg.roomId,
      userIds,
    });
  }

  /**
   * Load the role of the signed-in account and the room permission list.
   *
   * @returns {Promise<SocketAck>}
   */
  loadPermissions() {
    return this.#socketEmitApi('room-permissions', {
      roomId: this.#cfg.roomId,
    });
  }

  /**
   * Update room settings
   */
  updateRoomSettings(settings = {}) {
    return this.#socketEmitApi('update-room', {
      roomId: this.#cfg.roomId,
      newSettings: settings,
    });
  }

  /**
   * Update room schema
   */
  updateRpgSchema(schemaData = {}) {
    return new Promise((resolve, reject) =>
      this.#socketEmitApi('update-rpg-schema', {
        roomId: this.#cfg.roomId,
        values: schemaData,
      })
        .then((result) => {
          if (!result.error) this.setRpgSchema(schemaData);
          resolve(result);
        })
        .catch(reject),
    );
  }

  /**
   * Update room data
   */
  updateRoomData(values = {}, isPrivate = false) {
    return this.#socketEmitApi('update-room-data', {
      roomId: this.#cfg.roomId,
      isPrivate,
      values,
    });
  }

  /**
   * Is moderator
   */
  accountIsMod(userId = '') {
    return this.#socketEmitApi('user-is-mod', {
      userId,
    });
  }

  /**
   * Is Owner
   */
  accountIsOwner(userId = '') {
    return this.#socketEmitApi('user-is-owner', {
      userId,
    });
  }

  /**
   * Ban a server account
   */
  banAccount(userId = '', reason = '') {
    return this.#socketEmitApi('ban', {
      userId,
      reason,
    });
  }

  /**
   * Unban a server account
   */
  unbanAccount(userId = '') {
    return this.#socketEmitApi('unban', {
      userId,
    });
  }

  /**
   * Kick a server account
   */
  kickAccount(userId = '') {
    return this.#socketEmitApi('kick', {
      userId,
    });
  }

  /**
   * Change your password
   */
  changePassword(oldPassword = '', password = '') {
    return this.#socketEmitApi('change-password', {
      password,
      oldPassword,
    });
  }

  /**
   * Change your nickname
   */
  changeNickname(nickname = '') {
    return new Promise((resolve, reject) =>
      this.#socketEmitApi('change-nickname', {
        nickname,
      })
        .then((result) => {
          if (!result.error) this.user.nickname = nickname;
          resolve(result);
        })
        .catch(reject),
    );
  }

  /**
   * Register account
   */
  register(userId = '', password = '', nickname = '') {
    return this.#socketEmitApi('register', {
      userId,
      password,
      nickname,
    });
  }

  /**
   * Load messages
   *
   * @param {Object} [filters] - Search filters.
   * @param {string|null} [filters.text] - Free text filter.
   * @param {number|null} [filters.chapter] - Chapter filter.
   * @param {string|null} [filters.userId] - Author filter.
   * @param {number|null} [filters.start] - Start of the date range.
   * @param {number|null} [filters.end] - End of the date range.
   * @param {number} [filters.page] - Page number.
   * @param {number|null} [filters.perPage] - Items per page.
   * @returns {Promise<HistorySearchResult>}
   */
  loadMessages({
    text = null,
    chapter = null,
    userId = null,
    start = null,
    end = null,
    page = 1,
    perPage = this.getRateLimit().size?.history ?? null,
  } = {}) {
    return new Promise((resolve, reject) =>
      this.#socketEmitApi('load-messages', {
        roomId: this.#cfg.roomId,
        page,
        perPage,
        text,
        chapter,
        start,
        end,
        userId,
      })
        .then((result) => {
          /** @type {(value: never) => void} */ (resolve)(/** @type {never} */ (result));
        })
        .catch(reject),
    );
  }

  /**
   * Load the dice history.
   *
   * @param {Object} [filters] - Search filters.
   * @param {string|null} [filters.userId] - Author filter.
   * @param {number|null} [filters.start] - Start of the date range.
   * @param {number|null} [filters.end] - End of the date range.
   * @param {number} [filters.page] - Page number.
   * @param {number|null} [filters.perPage] - Items per page.
   * @returns {Promise<DiceHistorySearchResult>}
   */
  loadDiceHistory({
    userId = null,
    start = null,
    end = null,
    page = 1,
    perPage = this.getRateLimit().size?.history ?? null,
  } = {}) {
    return new Promise((resolve, reject) =>
      this.#socketEmitApi('load-dice-history', {
        roomId: this.#cfg.roomId,
        page,
        perPage,
        start,
        end,
        userId,
      })
        .then((result) => {
          resolve(/** @type {DiceHistorySearchResult} */ (/** @type {unknown} */ (result)));
        })
        .catch(reject),
    );
  }

  /**
   * Send room message
   * @param {string} message
   * @param {{ tokens?: unknown, model?: string, hash?: string, isModel?: boolean }} options
   */
  sendMessage(message = '', { tokens, model, hash, isModel = false }) {
    return new Promise((resolve, reject) =>
      this.#socketEmitApi('send-message', {
        roomId: this.#cfg.roomId,
        tokens,
        model,
        hash,
        message,
        isModel,
      })
        .then((result) => {
          resolve(result);
        })
        .catch(reject),
    );
  }

  /**
   * Edit room message
   * @param {{ message?: string, hash?: string|null, tokens?: unknown }} data - Message payload.
   * @param {string|number|undefined} msgId - Message id.
   * @returns {Promise<SocketAck>} The server acknowledgement.
   */
  editMessage(
    { message = '', hash = null, tokens = null },
    msgId = /** @type {string|number|undefined} */ (''),
  ) {
    return new Promise((resolve, reject) =>
      this.#socketEmitApi('edit-message', {
        roomId: this.#cfg.roomId,
        messageId: msgId,
        hash,
        tokens,
        newText: message,
      })
        .then((result) => {
          resolve(result);
        })
        .catch(reject),
    );
  }

  /**
   * Delete room message
   */
  deleteMessage(msgId = '') {
    return new Promise((resolve, reject) =>
      this.#socketEmitApi('delete-message', {
        roomId: this.#cfg.roomId,
        messageId: msgId,
      })
        .then((result) => {
          resolve(result);
        })
        .catch(reject),
    );
  }

  /**
   * Roll Dice
   * @param {DiceRollResult[]|number[]} dice
   * @param {boolean} canZero
   * @param {DiceRollModifier[]} modifiers
   */
  rollDice(dice = [], canZero = false, modifiers = []) {
    return this.#socketEmitApi('roll-dice', {
      roomId: this.#cfg.roomId,
      canZero,
      dice,
      modifiers,
    });
  }

  getSocket() {
    return this.socket;
  }

  connect() {
    this.socket?.connect();
  }

  disconnect() {
    this.socket?.disconnect();
  }

  destroy() {
    if (this.socket)
      /** @type {{ destroy: () => void }} */ (/** @type {unknown} */ (this.socket)).destroy();
  }

  /**
   * @param {unknown} result
   * @returns {boolean}
   */
  checkRoomId(result) {
    return isJsonObject(result) && result.roomId === this.getRoomId();
  }

  /** @param {SocketAiScript} tinyAiScript */
  install(tinyAiScript) {
    // Dice
    this.onDiceRoll((/** @type {SocketPayload} */ result) => {
      if (this.checkRoomId(result)) {
        /** @type {DiceRollEventData} */
        const data = {
          results: null,
          modifiers: null,
          userId: null,
          canZero: null,
          skin: null,
          id: null,
          date: null,
        };

        // Skin
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

        // UserId
        if (typeof result.id === 'string') data.id = result.id;
        if (typeof result.userId === 'string') data.userId = result.userId;
        if (typeof result.canZero === 'boolean') data.canZero = result.canZero;

        // Results
        if (
          Array.isArray(result.results) &&
          result.results.every(
            (/** @type {SocketPayload} */ item) =>
              typeof item.value === 'number' && typeof item.sides === 'number',
          )
        )
          data.results = /** @type {DiceRollResult[]} */ (result.results);

        if (
          Array.isArray(result.modifiers) &&
          result.modifiers.every(
            (/** @type {SocketPayload} */ item) =>
              countObj(item) === 3 &&
              typeof item.index === 'number' &&
              typeof item.expression === 'string' &&
              typeof item.original === 'string',
          )
        ) {
          data.modifiers = /** @type {DiceRollModifier[]} */ (result.modifiers);
          data.original = result.original;
          data.index = result.index;
        }

        data.date = typeof result.date === 'number' ? new Date(result.date) : null;

        // Complete
        this.emit('diceRoll', data);
        console.log('[socket-io] [dice]', data);
      }
    });

    // Get user updated
    this.onUserUpdated((result) => {
      if (
        this.checkRoomId(result) &&
        isJsonObject(result.data) &&
        typeof result.userId === 'string' &&
        typeof result.data.nickname === 'string'
      ) {
        const data = this.editUser({ userId: result.userId, nickname: result.data.nickname });
        if (result.userId === this.getUserId()) this.user.nickname = result.data.nickname;

        if (data) this.emit('userUpdated', data);
        console.log('[socket-io] [user-data]', result);
      }
    });

    // Get ratelimit data
    this.onGetRateLimit((result) => {
      this.setRateLimit(result);
      this.emit('getRateLimit', this.getRateLimit());
      console.log('[socket-io] [ratelimit]', this.getRateLimit());
    });

    // Room schema updates
    this.onRpgSchemaUpdates((result) => {
      if (this.checkRoomId(result) && isJsonObject(result.values)) {
        const data = this.setRpgSchema(result.values);
        if (data) this.emit('rpgSchemaUpdates', data.values);
        console.log('[socket-io] [rpg-schema]', this.getRpgSchema());
      }
    });

    // Room updates
    this.onRoomUpdates((result) => {
      if (this.checkRoomId(result) && isJsonObject(result.data)) {
        const data = this.setRoom(result.data);
        if (data) this.emit('roomUpdates', data);
        console.log('[socket-io] [room]', this.getRoom());
      }
    });

    // User ban
    this.onRoomBan((result) => {
      if (this.checkRoomId(result)) {
        const data = typeof result.userId === 'string' ? result.userId : null;
        this.emit('userBanned', data);
        console.log('[socket-io] [room-ban]', data);
      }
    });

    // User kick
    this.onRoomKick((result) => {
      if (this.checkRoomId(result)) {
        const data = typeof result.userId === 'string' ? result.userId : null;
        this.emit('userKicked', data);
        console.log('[socket-io] [room-kick]', data);
      }
    });

    // User left
    this.onUserLeft((result) => {
      if (this.checkRoomId(result)) {
        const data = this.removeUser(result);
        if (data) this.emit('userLeft', data);
        console.log('[socket-io] [room-users]', this.getUsers());
      }
    });

    // User join
    this.onUserJoin((result) => {
      if (this.checkRoomId(result)) {
        const data = this.addUser(result);
        if (data) this.emit('userJoined', data);
        console.log('[socket-io] [room-users]', this.getUsers());
      }
    });

    // Room data
    this.onRoomData((result) => {
      if (this.checkRoomId(result)) {
        const data = this.setRoomData(result);
        if (data) this.emit('roomDataUpdates', data);
        console.log('[socket-io] [room-json-data]', data);
      }
    });

    // New message
    this.onNewMessage((result) => {
      if (this.checkRoomId(result)) {
        this.emit('newMessage', result);
        console.log('[socket-io] [message-add]', result);
      }
    });

    // Message delete
    this.onMessageDelete((result) => {
      if (this.checkRoomId(result)) {
        this.emit('messageDelete', result);
        console.log('[socket-io] [message-delete]', result);
      }
    });

    // Message edit
    this.onMessageEdit((result) => {
      if (this.checkRoomId(result)) {
        this.emit('messageEdit', result);
        console.log('[socket-io] [message-edit]', result);
      }
    });

    // Get room data
    this.onRoomEnter((result) => {
      if (this.checkRoomId(result)) {
        if (!this.setRoomBase(result)) this.emit('roomEntered', false);
        else this.emit('roomEntered', true);

        this.emit('roomEnter');
        console.log('[socket-io] [room-data]', {
          room: this.getRoom(),
          users: this.getUsers(),
          mods: this.getMods(),
          rpgSchema: this.getRpgSchema(),
          roomData: this.getRoomData(),
          roomPrivateData: this.getRoomPrivateData(),
        });
      }
    });

    // Permission list update
    this.onRoomPermissionChange((result) => {
      if (this.checkRoomId(result)) {
        const permissions = this.setPermissions(result.permissions);
        const users = Array.isArray(result.users) ? result.users : [];
        const type = result.type === 'revoke' ? 'revoke' : 'grant';
        this.emit('roomPermissionChange', type, users, permissions);
        console.log('[socket-io] [room-permissions]', { type, users, permissions });
      }
    });

    // Mod list update
    this.onRoomModChange((result) => {
      if (this.checkRoomId(result)) {
        if (Array.isArray(result.result)) {
          for (const index in result.result) {
            if (typeof result.result[index] === 'string') {
              if (result.type === 'add') {
                this.addModUser(result.result[index]);
                this.emit('roomModChange', 'add', result.result[index]);
              }
              if (result.type === 'remove') {
                this.removeModUser(result.result[index]);
                this.emit('roomModChange', 'remove', result.result[index]);
              }
            }
          }
        }

        console.log('[socket-io] [mod-data]', this.getMods());
      }
    });

    // Connect
    this.onConnect(() => {
      this.resetData();
      this.emit('connect', this.getSocket()?.id);
      // Login
      this.login().then((result) => {
        // Check room
        this.emit('login', result);
        this.emit('join', result);
        if (!result.error) {
          // Insert data
          this.setUser(result);
          console.log('[socket-io] [user-data]', this.getUser());
          console.log('[socket-io] [dice]', this.getDice());
          console.log('[socket-io] [ratelimit]', this.getRateLimit());
          this.existsRoom().then((result2) => {
            // Join room
            const joinRoom = () =>
              this.joinRoom().then((result4) => {
                // Error
                if (result4.error) this.emit('roomError', result4);
                // Complete
                else this.emit('roomJoinned', result4);
              });

            // Error
            if (result2.error) this.emit('roomError', result2);
            // Exists?
            else if (result2.exists) joinRoom();
            else {
              if (!tinyAiScript.mpClient)
                this.createRoom().then((result3) => {
                  if (!result3.error) joinRoom();
                  else this.emit('roomError', result3);
                });
              else this.emit('roomNotFound', result2);
            }
          });
        }
      });
    });

    // Disconnect
    this.onDisconnect((/** @type {SocketPayload} */ reason) => {
      this.emit('disconnect', reason);
    });
  }
}

export default TinyClientIo;
