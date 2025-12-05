import { EventEmitter } from 'events';
import { Server } from 'socket.io';
import { TinyRateLimiter } from 'tiny-essentials';

/**
 * @typedef {Object} ProxyUserDisconnect
 * @property {string} id
 * @property {import('socket.io').DisconnectReason} reason
 * @property {any} desc
 */

/**
 * @typedef {Object} ProxyUserConnection
 * @property {string} id
 */

/**
 * @typedef {[id: string, eventName: string, ...any[]]} ProxyRequest
 */

class SocketIoProxyServer extends EventEmitter {
  /** @type {null|import('socket.io').Socket} */
  #socket = null;

  /** @type {import('socket.io').Server} */
  #server;

  /** @returns {null|import('socket.io').Socket} */
  get socket() {
    return this.#socket;
  }

  /** @returns {import('socket.io').Server} */
  get server() {
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
   * @param {import('socket.io').Socket} userSocket
   */
  #sendNewUser(userSocket) {
    if (!this.#socket) return;
    /** @type {ProxyUserConnection} */
    const data = { id: userSocket.id };
    this.#socket.emit('PROXY_USER_CONNECTION', data);
  }

  /**
   * @param {import('socket.io').ServerOptions} proxyCfg
   * @param {{ maxHits: number, interval: number, cleanupInterval: number }} [rlCfg]
   */
  constructor(proxyCfg, { maxHits = 3, interval = 1000, cleanupInterval = 60000 } = {}) {
    super();
    this.#server = new Server(proxyCfg);

    // RateLimit
    const authRl = new TinyRateLimiter({ maxHits, interval, cleanupInterval });

    // Handle user connections
    this.#server.on('connection', (userSocket) => {
      // Send socket data
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
            if (this.#socket.id === userSocket.id) return;
            authRl.hit(userSocket.id);
            userSocket.disconnect(true);
            removeTimeout();
            return;
          }

          this.#socket = userSocket;
          const sendResult = async () => {
            fn(!!this.#socket);
            for (const socket of await this.#server.fetchSockets()) this.#sendNewUser(socket);
          };
          this.emit('server-connection', userSocket);
          removeTimeout();
          sendResult();
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
        if (this.#socket) {
          /** @type {ProxyUserDisconnect} */
          const data = { id: userSocket.id, reason, desc };
          this.#socket.emit('PROXY_USER_DISCONNECT', data);
        }
        if (this.#socket.id === userSocket.id) {
          this.#socket = null;
          this.emit('server-disconnect', userSocket);
          return;
        }
        this.emit('disconnect', userSocket);
        removeTimeout();
      });
    });
  }
}

export default SocketIoProxyServer;
