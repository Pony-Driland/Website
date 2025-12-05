import { EventEmitter } from 'events';
import { Server } from 'socket.io';
import { isJsonObject, TinyRateLimiter } from 'tiny-essentials';

/**
 * @typedef {Object} ProxyUserDisconnect
 * @property {string} id
 * @property {import('socket.io').DisconnectReason} reason
 * @property {any} desc
 */

/**
 * @typedef {Object} ProxyUserConnection
 * Represents all serializable data of a connected user socket,
 * sent to the proxy server to allow full remote interaction and inspection.
 *
 * @property {string} id - Socket unique identifier.
 *
 * @property {string[]} rooms - List of rooms the socket is part of.
 *
 *
 * @property {Object} handshake - Full handshake information.
 * @property {string} handshake.address - IP address of the connected client.
 * @property {Object.<string, any>} handshake.headers - Client HTTP headers.
 * @property {Object.<string, any>} handshake.query - URL query parameters.
 * @property {string} handshake.time - Human-readable time string.
 * @property {boolean} handshake.secure - Whether the connection is secured (HTTPS/WSS).
 * @property {boolean} handshake.xdomain - Whether the connection comes from a different domain.
 * @property {number} handshake.issued - Timestamp of when the handshake was generated.
 * @property {string} handshake.url - Full request URL.
 *
 * @property {Object} engine - Engine.IO internal details (safe subset).
 * @property {string} engine.readyState - Current ready state of the Engine.IO connection.
 * @property {string} engine.transport - Current Engine.IO transport name.
 * @property {number} engine.protocol - Engine.IO protocol version.
 *
 * @property {string} namespace - Namespace to which the client is connected.
 */

/**
 * @typedef {[id: string, ...import('socket.io').Event]} ProxyRequest
 */

class SocketIoProxyServer extends EventEmitter {
  #isDestroyed = false;

  /** @returns {boolean} */
  get isDestroyed() {
    return this.#isDestroyed;
  }

  /** @type {null|import('socket.io').Socket} */
  #socket = null;

  /** @type {import('socket.io').Server|null} */
  #server;

  /** @returns {null|import('socket.io').Socket} */
  get socket() {
    return this.#socket;
  }

  /** @returns {import('socket.io').Server} */
  get server() {
    if (this.#isDestroyed || !this.#server) throw new Error('Instance destroyed!');
    return this.#server;
  }

  /** @type {null|string|number} */
  #auth = null;

  /** @param {null|string|number} value */
  set auth(value) {
    if (typeof value !== 'string' && typeof value !== 'number' && value !== null)
      throw new Error('Invalid Server Auth!');
    this.#auth = value;
  }

  /** @type {null|number} */
  #connTimeout = null;

  /** @param {null|number} value */
  set connTimeout(value) {
    if (typeof value !== 'number' && value !== null) throw new Error('Invalid connection timeout!');
    this.#connTimeout = value;
  }

  /** @returns {null|number} */
  get connTimeout() {
    return this.#connTimeout;
  }

  /**
   * Sends a fully detailed user socket info to the proxy server.
   * This includes every serializable property that may be useful for a remote proxy.
   * @param {import('socket.io').Socket} userSocket
   */
  #sendNewUser(userSocket) {
    if (!this.#socket) return;

    /** @type {ProxyUserConnection} */
    const detailed = {
      id: userSocket.id,

      // Rooms this client belongs to
      rooms: [...userSocket.rooms],

      // Handshake data (⚠ contains headers, query)
      handshake: {
        address: userSocket.handshake.address,
        headers: userSocket.handshake.headers,
        query: userSocket.handshake.query,
        time: userSocket.handshake.time,
        secure: userSocket.handshake.secure,
        xdomain: userSocket.handshake.xdomain,
        issued: userSocket.handshake.issued,
        url: userSocket.handshake.url,
      },

      // Engine.IO internal data (serializable only!)
      engine: {
        readyState: userSocket.conn.readyState,
        transport: userSocket.conn.transport.name,
        protocol: userSocket.conn.protocol,
      },

      // Namespace
      namespace: userSocket.nsp.name,
    };

    this.#socket.emit('PROXY_USER_CONNECTION', detailed);
  }

  /** @type {Map<string, import('socket.io').Socket>} */
  #sockets = new Map();

  /** @returns {Record<string, import('socket.io').Socket>} */
  get sockets() {
    return Object.fromEntries(this.#sockets);
  }

  /**
   * @param {import('socket.io').ServerOptions} proxyCfg
   * @param {Object} [rlCfg]
   * @param {number} [rlCfg.maxHits=3]
   * @param {number} [rlCfg.interval=1000]
   * @param {number} [rlCfg.cleanupInterval=60000]
   */
  constructor(proxyCfg, { maxHits = 3, interval = 1000, cleanupInterval = 60000 } = {}) {
    super();
    this.#server = new Server(proxyCfg);

    // RateLimit
    const authRl = new TinyRateLimiter({ maxHits, interval, cleanupInterval });

    // Handle user connections
    this.#server.on('connection', (userSocket) => {
      // Send socket data
      this.#sockets.set(userSocket.id, userSocket);
      this.#sendNewUser(userSocket);
      // Start connection
      this.emit('connection', userSocket);

      /** @type {NodeJS.Timeout|null} */
      let timeoutConnection = !this.#socket
        ? setTimeout(() => {
            this.emit('connection-timeout', userSocket);
            userSocket.disconnect(true);
          }, this.#connTimeout ?? 0)
        : null;

      const removeTimeout = () => {
        if (!timeoutConnection) return;
        clearTimeout(timeoutConnection);
        timeoutConnection = null;
      };

      userSocket.onAny((eventName, ...args) => {
        this.emit('user-event', userSocket, eventName, [...args]);

        // Auth Server
        if (eventName === 'AUTH_PROXY') {
          const [auth, fn] = args;

          if (
            this.#socket ||
            this.#auth !== auth ||
            authRl.isRateLimited(userSocket.id) ||
            typeof fn !== 'function'
          ) {
            if (this.#socket?.id === userSocket.id) return;
            authRl.hit(userSocket.id);
            userSocket.disconnect(true);
            removeTimeout();
            return;
          }

          this.#socket = userSocket;
          this.emit('server-connection', userSocket);
          removeTimeout();
          fn(!!this.#socket);
          this.#sockets.forEach((socket) => this.#sendNewUser(socket));
          return;
        }

        // Disconnect user
        if (eventName === 'DISCONNECT_PROXY_USER') {
          if (
            this.#socket?.id !== userSocket.id ||
            !isJsonObject(args[0]) ||
            typeof args[0].id !== 'string' ||
            typeof args[0].close !== 'boolean'
          )
            return;
          const socket = this.#sockets.get(args[0].id);
          if (!socket) return;
          socket.disconnect(args[0].close);
          return;
        }

        // No server
        if (!this.#socket) {
          userSocket.disconnect(true);
          removeTimeout();
          return;
        }

        // Send request
        removeTimeout();

        /** @type {ProxyRequest} */
        const data = [userSocket.id, eventName, ...args];
        this.#socket.emit('PROXY_REQUEST', ...data);
      });

      // Disconnect
      userSocket.on('disconnect', (reason, desc) => {
        this.#sockets.delete(userSocket.id);
        if (this.#socket) {
          /** @type {ProxyUserDisconnect} */
          const data = { id: userSocket.id, reason, desc };
          this.#socket.emit('PROXY_USER_DISCONNECT', data);
        }
        if (this.#socket?.id === userSocket.id) {
          this.#socket = null;
          this.emit('server-disconnect', userSocket);
          return;
        }
        this.emit('disconnect', userSocket);
        removeTimeout();
      });
    });
  }

  destroy() {
    this.#server?.close();
    this.#server?.removeAllListeners();
    this.#sockets.clear();
    this.#socket = null;
    this.#auth = null;
    this.#connTimeout = null;
    this.#isDestroyed = true;
    this.#server = null;
    this.removeAllListeners();
  }
}

export default SocketIoProxyServer;
