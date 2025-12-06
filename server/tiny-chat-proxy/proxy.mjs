import { EventEmitter } from 'events';
import { Server } from 'socket.io';
import { isJsonObject, TinyRateLimiter } from 'tiny-essentials';

/**
 * @typedef {Object} ProxyUserDisconnect
 * Represents a disconnection report sent to the proxy server.
 *
 * @property {string} id - Disconnected user socket ID.
 * @property {import('socket.io').DisconnectReason} reason - Reason provided by Socket.IO.
 * @property {any} desc - Additional description or error object.
 */

/**
 * @typedef {Object} ProxyUserConnectionUpdated
 * Represents a diff patch of updated user connection data.
 *
 * @property {string} id - User socket ID.
 * @property {ProxyUserConnection} changes - Only changed fields.
 */

/**
 * @typedef {Object} ProxyUserConnection
 * Represents all serializable data of a connected socket.
 * This object is transmitted to the proxy server so it can simulate
 * remote access to all user details without having direct access to the runtime socket.
 *
 * This enables:
 * - fully remote introspection
 * - remote user operations
 * - remote room joins/leaves
 * - remote event emission
 *
 * @property {string} id - Unique socket identifier.
 *
 * @property {string[]} rooms - All rooms the socket currently belongs to.
 *
 * @property {Object} handshake - Full handshake information sent by the client.
 * @property {string} handshake.address - Client IP address.
 * @property {Object.<string, any>} handshake.headers - HTTP headers from the client request.
 * @property {Object.<string, any>} handshake.query - Incoming connection query-string params.
 * @property {string} handshake.time - Connection timestamp.
 * @property {boolean} handshake.secure - Whether the handshake occurred over HTTPS/WSS.
 * @property {boolean} handshake.xdomain - Whether the request originated from another domain.
 * @property {number} handshake.issued - Unix timestamp for handshake issuance.
 * @property {string} handshake.url - Full request URL.
 *
 * @property {Object} engine - Safe subset of Engine.IO internal metadata.
 * @property {string} engine.readyState - Engine.IO connection state.
 * @property {string} engine.transport - Current transport ("polling" or "websocket").
 * @property {number} engine.protocol - Engine.IO protocol version.
 *
 * @property {string} namespace - Namespace the client is connected to.
 */

/**
 * @typedef {[id: string, ...import('socket.io').Event]} ProxyRequest
 */

/**
 * SocketIoProxyServer
 *
 * This class creates a **remote control layer** on top of a Socket.IO server.
 *
 * It exposes:
 * - A **single authenticated controlling socket** (the operator)
 * - All connected users with full serializable metadata
 * - Automatic change detection via diffing
 * - Remote room operations (join, leave)
 * - Remote broadcasting
 * - Remote event emission
 * - Proxied user events with return-path back to the operator
 *
 * It is effectively a "virtualized mirror" of all socket activity,
 * allowing external systems to observe and interact with real users
 * without having direct access to the socket server runtime.
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

  /**
   * Sets the authentication value required by the operator client.
   * Only one socket is allowed to become the proxy operator.
   *
   * @param {null|string|number} value - Authentication secret.
   */
  set auth(value) {
    if (typeof value !== 'string' && typeof value !== 'number' && value !== null)
      throw new Error('Invalid Server Auth!');
    this.#auth = value;
  }

  /** @type {null|number} */
  #connTimeout = null;

  /**
   * Sets the maximum allowed time (ms) before a newly connected socket
   * must authenticate as the proxy operator.
   * If authentication does not occur in time, the socket is forcibly disconnected.
   *
   * @param {null|number} value
   */
  set connTimeout(value) {
    if (typeof value !== 'number' && value !== null) throw new Error('Invalid connection timeout!');
    this.#connTimeout = value;
  }

  /** @returns {null|number} */
  get connTimeout() {
    return this.#connTimeout;
  }

  /**
   * Extracts all safe, serializable information from a Socket.IO socket instance.
   * Used for:
   * - initial connection sync
   * - remote inspection
   * - diff computation
   *
   * @param {import('socket.io').Socket} socket
   * @returns {ProxyUserConnection}
   */
  extractSocketInfo(socket) {
    return {
      id: socket.id,

      // Rooms this client belongs to
      rooms: [...socket.rooms],

      // Handshake data (⚠ contains headers, query)
      handshake: {
        address: socket.handshake.address,
        headers: socket.handshake.headers,
        query: socket.handshake.query,
        time: socket.handshake.time,
        secure: socket.handshake.secure,
        xdomain: socket.handshake.xdomain,
        issued: socket.handshake.issued,
        url: socket.handshake.url,
      },

      // Engine.IO internal data (serializable only!)
      engine: {
        readyState: socket.conn.readyState,
        transport: socket.conn.transport.name,
        protocol: socket.conn.protocol,
      },

      // Namespace
      namespace: socket.nsp.name,
    };
  }

  /**
   * Computes a deep diff between two ProxyUserConnection objects.
   * Only returns changed fields, keeping full structure where needed.
   *
   * @param {ProxyUserConnection} oldData
   * @param {ProxyUserConnection} newData
   * @returns {ProxyUserConnection|null} - Diff or null if nothing changed.
   */
  #diff(oldData, newData) {
    const diff = oldData;
    let hasChanges = false;

    for (const key of Object.keys(newData)) {
      // @ts-ignore
      const oldVal = oldData[key];
      // @ts-ignore
      const newVal = newData[key];

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        // @ts-ignore
        diff[key] = newVal;
        hasChanges = true;
      }
    }

    return hasChanges ? diff : null;
  }

  /**
   * Emits an update event and sends delta-changes to the proxy operator.
   * Triggered when:
   * - user joins/leaves room
   * - connection upgrades
   * - transport changes
   * - handshake changes
   *
   * @param {import('socket.io').Socket} socket
   * @param {string} type - Update category.
   * @param {string|null} [room] - Room affected (if any).
   */
  #emitUpdate(socket, type, room) {
    if (!this.#socket) return;

    const current = this.extractSocketInfo(socket);
    const previous = this.#socketStates.get(socket.id) ?? current;

    const changes = this.#diff(previous, current);
    if (!changes) return;

    this.#socketStates.set(socket.id, current);

    /** @type {ProxyUserConnectionUpdated} */
    const result = { id: socket.id, changes };

    this.emit(`user-update`, socket, type, room);
    this.#socket.emit('PROXY_USER_UPDATE', result, type, room);
  }

  /**
   * Sends full state for a newly connected user to the operator.
   * @param {import('socket.io').Socket} socket
   */
  #sendNewUser(socket) {
    if (!this.#socket) return;
    const initial = this.extractSocketInfo(socket);
    this.#socketStates.set(socket.id, initial);
    this.#socket.emit('PROXY_USER_CONNECTION', initial);
  }

  /** @type {Map<string, import('socket.io').Socket>} */
  #sockets = new Map();

  /** @type {Map<string, ProxyUserConnection>} */
  #socketStates = new Map();

  /**
   * Returns an object representation of all active sockets.
   * Key = socket.id
   * Value = socket instance
   *
   * @returns {Record<string, import('socket.io').Socket>}
   */
  get sockets() {
    return Object.fromEntries(this.#sockets);
  }

  /**
   * Hooks into the adapter layer of a specific namespace, allowing detection of:
   * - join-room
   * - leave-room
   *
   * This ensures room-level changes emit diffs to the proxy operator.
   *
   * @param {string} where - Namespace path.
   */
  listenAdapter(where) {
    if (!this.#server) throw new Error('No server detected!');
    const adapter = this.#server.of(where).adapter;

    adapter.on('join-room', (room, id) => {
      const userSocket = this.#sockets.get(id);
      if (!userSocket) return;
      this.#emitUpdate(userSocket, 'join-room', room);
    });

    adapter.on('leave-room', (room, id) => {
      const userSocket = this.#sockets.get(id);
      if (!userSocket) return;
      this.#emitUpdate(userSocket, 'leave-room', room);
    });

    return adapter;
  }

  /**
   * Creates a full Socket.IO proxy server instance.
   *
   * @param {import('socket.io').ServerOptions} proxyCfg - Socket.IO server config.
   * @param {Object} [rlCfg] - Rate limiter settings.
   * @param {number} [rlCfg.maxHits=3] - Maximum hits before blocking.
   * @param {number} [rlCfg.interval=1000] - Rate limiter interval.
   * @param {number} [rlCfg.cleanupInterval=60000] - Cleanup frequency.
   */
  constructor(proxyCfg, { maxHits = 3, interval = 1000, cleanupInterval = 60000 } = {}) {
    super();
    this.#server = new Server(proxyCfg);

    const authRl = new TinyRateLimiter({ maxHits, interval, cleanupInterval });

    // ---- Main connection logic ----
    this.#server.on('connection', (userSocket) => {
      // Data
      /** 
      const dataProxy = new Proxy(userSocket.data, {
        set: (obj, prop, value) => {
          obj[prop] = value;
          this.#emitUpdate(userSocket, 'data');
          return true;
        },
      });

      userSocket.data = dataProxy;
      */

      // Set socket data
      this.#sockets.set(userSocket.id, userSocket);
      this.#sendNewUser(userSocket);
      // Start connection
      this.emit('connection', userSocket);

      // Timeout
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

      // Transport upgrade
      userSocket.conn.on('upgrade', () => {
        this.#emitUpdate(userSocket, 'upgrade');
      });

      // Closed transport
      userSocket.conn.on('close', () => {
        this.#emitUpdate(userSocket, 'close');
      });

      // Pre-registered event handlers map
      /** @type {Map<string, (...args: any) => void>} */
      const events = new Map();

      // ---- Authentication event ----
      events.set(
        'AUTH_PROXY',
        (/** @type {string} */ auth, /** @type {(arg: any) => void} */ fn) => {
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

          // Send state of all existing users
          this.#sockets.forEach((socket) => this.#sendNewUser(socket));
        },
      );

      // ---- Remote user disconnect ----
      events.set('DISCONNECT_PROXY_USER', (...args) => {
        if (
          this.#socket?.id !== userSocket.id ||
          !isJsonObject(args[0]) ||
          typeof args[0].id !== 'string' ||
          typeof args[0].close !== 'boolean'
        )
          return;

        const socket = this.#sockets.get(args[0].id);
        if (!socket) return;
        removeTimeout();
        socket.disconnect(args[0].close);
      });

      // ---- Remote join room ----
      events.set(
        'PROXY_USER_JOIN',
        (
          /** @type {{ id: string; room: string; }} */ data,
          /** @type {(arg: any) => boolean} */ fn,
        ) => {
          const { id, room } = data;
          const socket = this.#sockets.get(id);
          if (!socket) return fn(false);
          socket.join(room);
          fn(true);
        },
      );

      // ---- Remote leave room ----
      events.set(
        'PROXY_USER_LEAVE',
        (
          /** @type {{ id: string; room: string; }} */ data,
          /** @type {(arg: any) => boolean} */ fn,
        ) => {
          const { id, room } = data;
          const socket = this.#sockets.get(id);
          if (!socket) return fn(false);
          socket.leave(room);
          fn(true);
        },
      );

      // ---- Remote broadcast from specific user ----
      events.set('PROXY_USER_BROADCAST_OPERATOR', (id, room, eventName, ...args) => {
        const socket = this.#sockets.get(id);
        if (!socket) return args[args.length - 1]();
        socket.to(room).emit(eventName, ...args);
      });

      // ---- Remote broadcast from proxy server ----
      events.set('PROXY_BROADCAST_OPERATOR', (room, eventName, ...args) => {
        if (this.#server) this.#server.to(room).emit(eventName, ...args);
      });

      // ---- Remote emit directly to user ----
      events.set('PROXY_EMIT', (id, eventName, ...args) => {
        const socket = this.#sockets.get(id);
        if (!socket) return args[args.length - 1]();
        socket.emit(eventName, ...args);
      });

      // ---- Generic user events ----
      userSocket.onAny((eventName, ...args) => {
        this.emit('user-event', userSocket, eventName, [...args]);

        // Custom Event
        const eventFn = events.get(eventName);
        if (eventFn) return eventFn(...args);

        // No server
        if (!this.#socket) {
          userSocket.disconnect(true);
          removeTimeout();
          return;
        }

        removeTimeout();

        /** @type {ProxyRequest} */
        const data = [userSocket.id, eventName, ...args];
        this.#socket.emit('PROXY_REQUEST', ...data);
      });

      // ---- On disconnect ----
      userSocket.on('disconnect', (reason, desc) => {
        this.#sockets.delete(userSocket.id);
        this.#socketStates.delete(userSocket.id);

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

  /**
   * Fully destroys the proxy server, closing the Socket.IO instance
   * and clearing all tracked state from memory.
   */
  destroy() {
    this.#server?.close();
    this.#server?.removeAllListeners();
    this.#sockets.clear();
    this.#socketStates.clear();
    this.#socket = null;
    this.#auth = null;
    this.#connTimeout = null;
    this.#isDestroyed = true;
    this.#server = null;
    this.removeAllListeners();
  }
}

export default SocketIoProxyServer;
