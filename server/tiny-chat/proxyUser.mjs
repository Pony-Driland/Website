import EventEmitter from 'events';
import { isJsonObject } from 'tiny-essentials';

import fixProxyArgs from './proxyArgs.mjs';

/** @typedef {import('../tiny-chat-proxy/proxy.mjs').ProxyUserConnection} ProxyUserConnection */

class SocketIoProxyUser extends EventEmitter {
  #debugMode = false;

  /** @returns {boolean} */
  get debugMode() {
    return this.#debugMode;
  }

  /** @param {boolean} value */
  set debugMode(value) {
    if (typeof value !== 'boolean') throw new Error('Invalid debug mode value!');
    this.#debugMode = true;
  }

  /** @type {EventEmitter} */
  #userConn = new EventEmitter();

  /** @returns {EventEmitter} */
  get userConn() {
    return this.#userConn;
  }

  /** @type {Record<string|number|symbol, any>} */
  #data = {};

  /** @returns {Record<string|number|symbol, any>} */
  get data() {
    return this.#data;
  }

  /** @param {Record<string|number|symbol, any>} value */
  set data(value) {
    if (!isJsonObject(value)) throw new Error('Invalid data object type!');
    this.#data = value;
  }

  #allowOnAny = false;

  /** @returns {boolean} */
  get allowOnAny() {
    return this.#allowOnAny;
  }

  /** @param {boolean} value */
  set allowOnAny(value) {
    if (typeof value !== 'boolean') throw new Error('Invalid allowOnAny value!');
    this.#allowOnAny = true;
  }

  #connected = true;
  #disconnected = false;

  /**
   * Socket unique identifier.
   * @type {string}
   */
  #id = '';

  /**
   * Rooms this client belongs to
   * @type {Set<string>}
   */
  #rooms = new Set();

  /**
   * Engine.IO internal details (safe subset).
   */
  #conn = {
    /**
     *  Current transport used by the client
     */
    transport: {
      /**
       * Current Engine.IO transport name.
       * @type {string}
       */
      name: '',
    },

    /**
     * Current ready state of the Engine.IO connection.
     * @type {string}
     */
    readyState: '',

    /**
     * Engine.IO protocol version.
     * @type {number}
     */
    protocol: NaN,
  };

  /**
   * Full handshake information.
   */
  #handshake = {
    /**
     * Client HTTP headers.
     * @type {Object.<string, string>}
     */
    headers: {},

    /**
     * URL query parameters.
     * @type {Object.<string, any>}
     */
    query: {},

    /**
     * Human-readable time string.
     * @type {string}
     */
    time: '',

    /**
     * Whether the connection is secured (HTTPS/WSS).
     * @type {boolean}
     */
    secure: false,

    /**
     * Whether the connection comes from a different domain.
     * @type {boolean}
     */
    xdomain: false,

    /**
     * Timestamp of when the handshake was generated.
     * @type {number}
     */
    issued: NaN,

    /**
     * Full request URL.
     * @type {string}
     */
    url: '',

    /**
     * IP address of the connected client.
     * @type {string}
     */
    address: '',
  };

  /**  Direct IP address seen by the server */
  #nsp = {
    /**
     * Namespace to which the client is connected.
     * @type {string}
     */
    name: '',
  };

  /** @returns {string} */
  get id() {
    return `${this.#socket.id}_PROXY_${this.#id}`;
  }

  /** @returns {boolean} */
  get connected() {
    return this.#connected;
  }

  /** @returns {boolean} */
  get disconnected() {
    return this.#disconnected;
  }

  /**
   * Returns a cloned array of rooms this client belongs to.
   * @returns {string[]}
   */
  get rooms() {
    return Array.from(this.#rooms);
  }

  /**
   * Returns a deep-cloned snapshot of the Engine.IO connection details.
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
   * Returns a deep-cloned snapshot of the socket handshake information.
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
   * Returns a cloned value of the namespace information.
   * @returns {{ name: string }}
   */
  get nsp() {
    return structuredClone(this.#nsp);
  }

  /** @type {import('socket.io-client').Socket} */
  #socket;

  /**
   * @param {ProxyUserConnection} socketInfo
   *  @param {string}  [type]
   *  @param {string|null} [room]
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
   * @param {ProxyUserConnection} socketInfo
   * @param {import('socket.io-client').Socket} socket
   */
  constructor(socketInfo, socket) {
    super();
    this.#socket = socket;
    this._updateData(socketInfo);
  }

  /**
   * @param {string|string[]} room
   */
  to(room) {
    return {
      /**
       * @type {(eventName: string, ...args: any) => import('socket.io-client').Socket} args
       */
      emit: (eventName, ...args) =>
        this.#socket.emit(
          'PROXY_USER_BROADCAST_OPERATOR',
          ...fixProxyArgs([this.#id, room, eventName, ...args]),
        ),
    };
  }

  /**
   * @param {string|symbol} eventName
   * @param {...any} args
   */
  _emit(eventName, ...args) {
    return super.emit(eventName, ...args);
  }

  /**
   * @param {string|symbol} eventName
   * @param {...any} args
   */
  emit(eventName, ...args) {
    return !!this.#socket.emit('PROXY_EMIT', ...fixProxyArgs([this.#id, eventName, ...args]));
  }

  /**
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

  _disconnect() {
    if (this.#disconnected) return;
    this.removeAllListeners();
    this.#connected = false;
    this.#disconnected = true;
    this.#rooms.clear();
  }

  /**
   * @param {boolean} [close=false]
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
