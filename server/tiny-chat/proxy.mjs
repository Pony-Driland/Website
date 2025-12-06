import EventEmitter from 'events';
import { io as Io } from 'socket.io-client';
import SocketIoProxyUser from './proxyUser.mjs';
import fixProxyArgs from './proxyArgs.mjs';

/** @typedef {import('../tiny-chat-proxy/proxy.mjs').ProxyUserDisconnect} ProxyUserDisconnect */
/** @typedef {import('../tiny-chat-proxy/proxy.mjs').ProxyUserConnection} ProxyUserConnection */
/** @typedef {import('../tiny-chat-proxy/proxy.mjs').ProxyUserConnectionUpdated} ProxyUserConnectionUpdated */
/** @typedef {import('../tiny-chat-proxy/proxy.mjs').ProxyRequest} ProxyRequest */

/**
 * SocketIoProxyClient
 * -------------------
 * This class acts as a high-level client wrapper for a remote Proxy Server.
 *
 * The proxy server forwards real Socket.IO client events (from real users) to this instance.
 * Each connected user becomes a `SocketIoProxyUser`, allowing you to:
 * - Listen to the user's custom events
 * - Emit events back to the user
 * - Detect connection, disconnection and data updates
 *
 * The class controls reconnection, user mapping, event routing and authentication logic.
 *
 * Lifecycle Summary:
 * 1. `connect()` → authenticates with the proxy and starts receiving events.
 * 2. Proxy notifies about users:
 *        - `PROXY_USER_CONNECTION`
 *        - `PROXY_USER_UPDATE`
 *        - `PROXY_USER_DISCONNECT`
 * 3. Incoming user events arrive as `PROXY_REQUEST`.
 * 4. You can broadcast events through `.to(room).emit()`.
 *
 * When destroyed, all listeners and user references are cleaned up.
 */
class SocketIoProxyClient extends EventEmitter {
  #debugMode = false;

  /**
   * Whether debug logging is enabled.
   * @returns {boolean}
   */
  get debugMode() {
    return this.#debugMode;
  }

  /**
   * Enables or disables debug logging. When enabled,
   * every proxy event is logged to the console.
   * @param {boolean} value
   */
  set debugMode(value) {
    if (typeof value !== 'boolean') throw new Error('Invalid debug mode value!');
    this.#debugMode = value;
  }

  #isDestroyed = false;

  /**
   * Returns true if the client has been destroyed and cannot be reused.
   * @returns {boolean}
   */
  get isDestroyed() {
    return this.#isDestroyed;
  }

  #enabled = false;
  #firstTime = true;

  /** @type {import('socket.io-client').Socket} */
  #client;

  /**
   * The underlying raw Socket.IO client instance.
   * This can be used for low-level Socket.IO operations if needed.
   * @returns {import('socket.io-client').Socket}
   */
  get client() {
    return this.#client;
  }

  /** @type {null|string|number} */
  #auth = null;

  /**
   * Sets the authentication value that will be sent when connecting
   * to the proxy server through the `AUTH_PROXY` event.
   * @param {null|string|number} value
   */
  set auth(value) {
    if (typeof value !== 'string' && typeof value !== 'number' && value !== null)
      throw new Error('Invalid Server Auth!');
    this.#auth = value;
  }

  #connected = false;

  /**
   * True if the proxy is authenticated AND the socket is alive.
   * @returns {boolean}
   */
  get connected() {
    return this.#connected && this.#client.connected && this.#client.id ? true : false;
  }

  /** @type {null|number} */
  #connTimeout = 500;

  /**
   * Sets the reconnection attempt interval in milliseconds.
   * Set to `null` to disable auto retry.
   * @param {null|number} value
   */
  set connTimeout(value) {
    if (typeof value !== 'number' && value !== null) throw new Error('Invalid connection timeout!');
    this.#connTimeout = value;
  }

  /**
   * Gets the reconnection attempt interval.
   * @returns {null|number}
   */
  get connTimeout() {
    return this.#connTimeout;
  }

  /**
   * Map of all current proxied users.
   * Key = user socket ID, Value = SocketIoProxyUser instance.
   * @type {Map<string, SocketIoProxyUser>}
   */
  #sockets = new Map();

  /**
   * Creates a new Proxy Client connected to a Proxy server.
   *
   * @param {string} proxyAddress - The URL of the proxy server.
   * @param {import('socket.io-client').ManagerOptions} cfg - Socket.IO manager configuration.
   *
   * Configuration notes:
   * - reconnection is always disabled (handled manually)
   * - autoConnect is disabled; connection occurs on `.connect()`
   *
   * Events emitted by this class:
   * - `connect` when authentication succeeds
   * - `disconnect` when connection to the proxy is lost
   * - `connection` when a new proxied user appears
   */
  constructor(proxyAddress, cfg) {
    super();

    /**
     * Client Config
     * @type {import('socket.io-client').ManagerOptions} cfg
     */
    const clientCfg = { ...cfg };
    clientCfg.reconnection = false;
    clientCfg.autoConnect = false;

    this.#client = Io(proxyAddress, clientCfg);

    /** Handle disconnection and trigger retry logic */
    this.#client.on('disconnect', () => {
      this.emit('disconnect');
      this.#connected = false;
    });

    /** Periodic reconnection attempts */
    const retryConn = () => {
      if (!this.#firstTime && !this.#connected) this.connect();
      if (this.#enabled) setTimeout(retryConn, this.#connTimeout ?? 0);
    };
    setTimeout(retryConn, this.#connTimeout ?? 0);

    /**
     * PROXY_REQUEST
     * ----------------
     * Forwarded events emitted *by a specific remote user*.
     * Structure:
     *   socketId: string
     *   eventName: string
     *   args...
     */
    this.#client.on(
      'PROXY_REQUEST',
      /** @type {(...args: ProxyRequest) => void} */
      (socketId, eventName, ...args) => {
        if (this.#debugMode) console.log('PROXY_REQUEST', socketId, eventName, ...args);
        if (typeof socketId !== 'string' || typeof eventName !== 'string') return;

        const socket = this.#sockets.get(socketId);
        if (!socket) return;

        socket._emit(eventName, ...args);
      },
    );

    /**
     * PROXY_USER_CONNECTION
     * -----------------------
     * Fired when a new remote user connects to the proxy.
     */
    this.#client.on('PROXY_USER_CONNECTION', (/** @type {ProxyUserConnection} */ socketInfo) => {
      if (this.#debugMode) console.log('PROXY_USER_CONNECTION', socketInfo);

      const socket = new SocketIoProxyUser(socketInfo, this.#client);
      this.#sockets.set(socketInfo.id, socket);

      this.emit('connection', socket);
    });

    /**
     * PROXY_USER_DISCONNECT
     * ----------------------
     * Fired when a remote user disconnects.
     */
    this.#client.on('PROXY_USER_DISCONNECT', (/** @type {ProxyUserDisconnect} */ socketInfo) => {
      if (this.#debugMode) console.log('PROXY_USER_DISCONNECT', socketInfo);

      const socket = this.#sockets.get(socketInfo.id);
      if (!socket) return;

      socket._emit('disconnect', socketInfo.reason, socketInfo.desc);
      socket._disconnect();
      this.#sockets.delete(socketInfo.id);
    });

    /**
     * PROXY_USER_UPDATE
     * -------------------
     * Fired when a user's data is modified.
     * Includes room changes or custom metadata modifications.
     */
    this.#client.on(
      'PROXY_USER_UPDATE',
      (
        /** @type {ProxyUserConnectionUpdated} */ socketInfo,
        /** @type {string} */ type,
        /** @type {string|null|undefined} */ room,
      ) => {
        if (this.#debugMode) console.log('PROXY_USER_UPDATE', socketInfo);
        const socket = this.#sockets.get(socketInfo.id);
        if (!socket) return;
        socket._updateData(socketInfo.changes, type, room);
      },
    );
  }

  /**
   * Prepares a room-targeted broadcast mechanism.
   * Works similarly to Socket.IO `.to(room).emit()`.
   *
   * @param {string|string[]} room
   * @returns {{ emit(eventName: string, ...args: any): import('socket.io-client').Socket }}
   */
  to(room) {
    return {
      emit: (eventName, ...args) =>
        this.#client.emit('PROXY_BROADCAST_OPERATOR', ...fixProxyArgs([room, eventName, ...args])),
    };
  }

  /**
   * Establishes a connection with the proxy server and completes authentication.
   *
   * @returns {Promise<boolean>} Resolves `true` if authentication occurs,
   *                             `false` if already connected.
   *
   * Flow:
   * 1. Connect to raw Socket.IO server (if not already)
   * 2. Emit `AUTH_PROXY`
   * 3. Proxy responds via callback and confirms the session
   */
  connect() {
    return new Promise((resolve, reject) => {
      if (this.#isDestroyed) reject(new Error('Destroyed instance!'));

      this.#firstTime = false;
      this.#enabled = true;

      if (this.connected) {
        resolve(false);
        return;
      }

      const sendConnect = () =>
        this.#client.emit('AUTH_PROXY', this.#auth, () => {
          this.emit('connect');
          this.#connected = true;
          resolve(true);
        });

      if (this.#client.connected) sendConnect();
      else {
        this.client.once('connect', () => sendConnect());
        this.client.connect();
      }
    });
  }

  /**
   * Fully disconnects from the proxy and resets internal state.
   * All user objects are destroyed.
   */
  disconnect() {
    this.client.disconnect();
    this.#enabled = false;
    this.#firstTime = true;

    this.#sockets.forEach((socket) => {
      socket.removeAllListeners();
      try {
        socket.disconnect();
      } catch {}
    });

    this.#sockets.clear();
  }

  /**
   * Completely destroys the instance.
   * Used when the client will never be reused.
   */
  destroy() {
    this.disconnect();
    this.#client.removeAllListeners();
    this.removeAllListeners();
    this.#isDestroyed = true;
  }
}

export default SocketIoProxyClient;
