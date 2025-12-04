import { EventEmitter } from 'events';
import { Server } from 'socket.io';
import { TinyRateLimiter } from 'tiny-essentials';

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
          this.emit('server-connection', userSocket);
          removeTimeout();
          fn();
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
        this.#socket.emit('PROXY_REQUEST', ...[eventName, ...args]);
      });

      // Disconnect
      userSocket.on('disconnect', () => {
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
