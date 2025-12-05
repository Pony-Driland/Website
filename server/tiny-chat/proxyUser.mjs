import EventEmitter from 'events';

/** @typedef {import('../tiny-chat-proxy/proxy.mjs').ProxyUserConnection} ProxyUserConnection */

class SocketIoProxyUser extends EventEmitter {
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
    return this.#id;
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
   */
  #updateData(socketInfo) {
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
  }

  /**
   * @param {ProxyUserConnection} socketInfo
   * @param {import('socket.io-client').Socket} socket
   */
  constructor(socketInfo, socket) {
    super();
    this.#socket = socket;
    this.#updateData(socketInfo);
  }

  /**
   * @param {boolean} [close=false]
   * @returns {this}
   */
  disconnect(close = false) {
    if (typeof close !== 'boolean') throw new Error('Close needs to be a boolean value!');
    this.#socket.emit('DISCONNECT_PROXY_USER', { id: this.#id, close });
    this.removeAllListeners();
    this.#connected = false;
    this.#disconnected = true;
    return this;
  }
}

export default SocketIoProxyUser;
