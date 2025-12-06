import EventEmitter from 'events';
import { isJsonObject } from 'tiny-essentials';

import fixProxyArgs from './proxyArgs.mjs';

/** @typedef {import('../tiny-chat-proxy/proxy.mjs').ProxyUserConnection} ProxyUserConnection */

/**
 * Represents a proxied Socket.IO user inside the architecture.
 *
 * This class mirrors a remote user connection received from the proxy layer and exposes
 * an API very similar to a regular Socket.IO `Socket` instance, but all actions
 * (emit, join, leave, broadcast, disconnect) are routed through the proxy operator.
 *
 * The purpose of this class is:
 * - Keep an internal synchronized representation of the remote user's socket
 * - Provide a safe and validated interface for broadcasting events or modifying the user's state
 * - Emit local events notifying about remote room-joins, room-leaves, and metadata updates
 *
 * Internally, the class maintains snapshots of:
 * - Rooms
 * - Handshake data
 * - Transport and Engine.IO details
 * - Namespace information
 *
 * These are updated whenever the proxy sends new data.
 */
class SocketIoProxyUser extends EventEmitter {
  /** @type {EventEmitter} Internal event emitter for per-user system events */
  #userConn = new EventEmitter();

  /** @returns {EventEmitter} Exposes internal user event stream */
  get userConn() {
    return this.#userConn;
  }

  /** @type {Record<string|number|symbol, any>} Arbitrary metadata container */
  #data = {};

  /** @returns {Record<string|number|symbol, any>} Returns stored custom metadata */
  get data() {
    return this.#data;
  }

  /**
   * Overwrites metadata with a new JSON-compatible object.
   * @param {Record<string|number|symbol, any>} value
   */
  set data(value) {
    if (!isJsonObject(value)) throw new Error('Invalid data object type!');
    this.#data = value;
  }

  /** @type {boolean} Connection state tracking */
  #connected = true;
  #disconnected = false;

  /**
   * Remote socket identifier provided by the proxy.
   * @type {string}
   */
  #id = '';

  /**
   * Set of rooms the proxied user belongs to.
   * @type {Set<string>}
   */
  #rooms = new Set();

  /**
   * Engine.IO transport details (safe subset).
   */
  #conn = {
    /**
     *  Current transport used by the client
     */
    transport: {
      /** @type {string} Current transport being used */
      name: '',
    },
    /** @type {string} Current readyState of the transport */
    readyState: '',
    /** @type {number} Engine.IO protocol version */
    protocol: NaN,
  };

  /**
   * Handshake information mirrored from the proxy.
   */
  #handshake = {
    /** @type {Object.<string, string>} Request headers */
    headers: {},
    /** @type {Object.<string, any>} Query parameters */
    query: {},
    /** @type {string} Human-readable connection time */
    time: '',
    /** @type {boolean} Whether the connection is secure */
    secure: false,
    /** @type {boolean} Whether the client is from another domain */
    xdomain: false,
    /** @type {number} Timestamp of handshake issuance */
    issued: NaN,
    /** @type {string} Full request URL */
    url: '',
    /** @type {string} Client IP address */
    address: '',
  };

  /**
   * Namespace information of the proxied user.
   */
  #nsp = {
    /** @type {string} Namespace name */
    name: '',
  };

  /**
   * Returns a proxy-adjusted unique id (local socket id + remote id).
   * @returns {string}
   */
  get id() {
    return `${this.#socket.id}_PROXY_${this.#id}`;
  }

  /** @returns {boolean} Whether the proxied user is currently connected */
  get connected() {
    return this.#connected;
  }

  /** @returns {boolean} Whether the proxied user is permanently disconnected */
  get disconnected() {
    return this.#disconnected;
  }

  /**
   * Returns a cloned list of rooms.
   * @returns {string[]}
   */
  get rooms() {
    return Array.from(this.#rooms);
  }

  /**
   * Returns a deep clone of Engine.IO connection details.
   * @returns {{
   *  transport: { name: string },
   *  readyState: string,
   *  protocol: number
   * }}
   */
  get conn() {
    return structuredClone(this.#conn);
  }

  /**
   * Returns a deep clone of handshake information.
   * @returns {{
   *   headers: Object.<string, string>,
   *   query: Object.<string, any>,
   *   time: string,
   *   secure: boolean,
   *   xdomain: boolean,
   *   issued: number,
   *   url: string,
   *   address: string
   * }}
   */
  get handshake() {
    return structuredClone(this.#handshake);
  }

  /**
   * Returns a cloned namespace information object.
   * @returns {{ name: string }}
   */
  get nsp() {
    return structuredClone(this.#nsp);
  }

  /** @type {import('socket.io-client').Socket} Underlying Socket.IO client used to send proxy commands */
  #socket;

  /**
   * Updates internal proxy user state and optionally emits a change event.
   *
   * @param {ProxyUserConnection} socketInfo Remote user state snapshot
   * @param {string} [type] Optional event type to emit (e.g., "join", "leave")
   * @param {string|null} [room] Room related to the update, if applicable
   */
  _updateData(socketInfo, type, room) {
    this.#id = socketInfo.id;
    this.#rooms = new Set(socketInfo.rooms);

    this.#nsp.name = socketInfo.namespace;

    this.#conn.transport.name = socketInfo.engine.transport;
    this.#conn.readyState = socketInfo.engine.readyState;
    this.#conn.protocol = socketInfo.engine.protocol;

    this.#handshake.headers = socketInfo.handshake.headers;
    this.#handshake.address = socketInfo.handshake.address;
    this.#handshake.query = socketInfo.handshake.query;
    this.#handshake.time = socketInfo.handshake.time;
    this.#handshake.secure = socketInfo.handshake.secure;
    this.#handshake.xdomain = socketInfo.handshake.xdomain;
    this.#handshake.issued = socketInfo.handshake.issued;
    this.#handshake.url = socketInfo.handshake.url;

    if (type) this.#userConn.emit(type, room);
  }

  /**
   * Creates a new proxied user instance.
   *
   * @param {ProxyUserConnection} socketInfo Initial remote state snapshot
   * @param {import('socket.io-client').Socket} socket Client-side operator socket
   */
  constructor(socketInfo, socket) {
    super();
    this.#socket = socket;
    this._updateData(socketInfo);
  }

  /**
   * Broadcasts an event to one or more rooms on behalf of the proxied user.
   *
   * This does NOT emit locally — it sends a command to the proxy.
   *
   * @param {string|string[]} room Target room(s)
   */
  to(room) {
    return {
      /**
       * Emits a broadcast event to specified rooms through the proxy engine.
       *
       * @param {string} eventName
       * @param {...any} args
       * @returns {import('socket.io-client').Socket}
       */
      emit: (eventName, ...args) =>
        this.#socket.emit(
          'PROXY_USER_BROADCAST_OPERATOR',
          ...fixProxyArgs([this.#id, room, eventName, ...args]),
        ),
    };
  }

  /**
   * Emits a local event inside the proxy-user instance.
   * @param {string|symbol} eventName
   * @param {...any} args
   */
  _emit(eventName, ...args) {
    return super.emit(eventName, ...args);
  }

  /**
   * Emits an event to the proxied user's remote socket.
   *
   * This does NOT emit locally — it sends a proxy-level `PROXY_EMIT`.
   *
   * @param {string|symbol} eventName
   * @param {...any} args
   * @returns {boolean} Whether the emit command was accepted
   */
  emit(eventName, ...args) {
    return !!this.#socket.emit('PROXY_EMIT', ...fixProxyArgs([this.#id, eventName, ...args]));
  }

  /**
   * Requests the remote user to join a room through the proxy.
   *
   * @param {string} room
   * @returns {Promise<boolean>}
   */
  join(room) {
    return new Promise((resolve) => {
      this.#socket.emit(
        'PROXY_USER_JOIN',
        { id: this.#id, room },
        (/** @type {boolean} */ result) => resolve(typeof result === 'boolean' ? result : false),
      );
    });
  }

  /**
   * Requests the remote user to leave a room through the proxy.
   *
   * @param {string} room
   * @returns {Promise<boolean>}
   */
  leave(room) {
    return new Promise((resolve) => {
      this.#socket.emit(
        'PROXY_USER_LEAVE',
        { id: this.#id, room },
        (/** @type {boolean} */ result) => resolve(typeof result === 'boolean' ? result : false),
      );
    });
  }

  /**
   * Marks the proxied user as disconnected and clears local state.
   * Internal use only.
   */
  _disconnect() {
    if (this.#disconnected) return;
    this.removeAllListeners();
    this.#connected = false;
    this.#disconnected = true;
    this.#rooms.clear();
  }

  /**
   * Requests the proxy to disconnect the remote user.
   *
   * @param {boolean} [close=false] Whether the underlying engine should also close the session
   * @returns {this}
   */
  disconnect(close = false) {
    if (this.#disconnected) return this;
    if (typeof close !== 'boolean') throw new Error('Close needs to be a boolean value!');
    this.#socket.emit('DISCONNECT_PROXY_USER', { id: this.#id, close });
    this._disconnect();
    return this;
  }
}

export default SocketIoProxyUser;
