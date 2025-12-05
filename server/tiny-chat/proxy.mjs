import EventEmitter from 'events';
import { Server } from 'socket.io';
import { io as Io } from 'socket.io-client';
import SocketIoProxyUser from './proxyUser.mjs';

/** @typedef {import('../tiny-chat-proxy/proxy.mjs').ProxyUserDisconnect} ProxyUserDisconnect */
/** @typedef {import('../tiny-chat-proxy/proxy.mjs').ProxyUserConnection} ProxyUserConnection */
/** @typedef {import('../tiny-chat-proxy/proxy.mjs').ProxyRequest} ProxyRequest */

class SocketIoProxyClient extends EventEmitter {
  #isDestroyed = false;

  /** @returns {boolean} */
  get isDestroyed() {
    return this.#isDestroyed;
  }

  #enabled = false;

  #firstTime = true;

  /** @type {import('socket.io-client').Socket} */
  #client;

  /** @returns {import('socket.io-client').Socket} */
  get client() {
    return this.#client;
  }

  /** @type {null|import('socket.io').Server} */
  #server = null;

  /** @returns {null|import('socket.io').Server} */
  get server() {
    return this.#server;
  }

  /** @param {import('socket.io').Server} server */
  set server(server) {
    if (!(server instanceof Server)) throw new Error('Invalid socket io server!');
    this.#server = server;
  }

  /** @type {null|string|number} */
  #auth = null;

  /** @param {null|string|number} value */
  set auth(value) {
    if (typeof value !== 'string' && typeof value !== 'number' && value !== null)
      throw new Error('Invalid Server Auth!');
    this.#auth = value;
  }

  #connected = false;

  get connected() {
    return this.#connected && this.#client.connected && this.#client.id;
  }

  /** @type {null|number} */
  #connTimeout = 500;

  /** @param {null|number} value */
  set connTimeout(value) {
    if (typeof value !== 'number' && value !== null) throw new Error('Invalid connection timeout!');
    this.#connTimeout = value;
  }

  /** @returns {null|number} */
  get connTimeout() {
    return this.#connTimeout;
  }

  /** @type {Map<string, SocketIoProxyUser>} */
  #sockets = new Map();

  /**
   * @param {string} proxyAddress
   * @param {import('socket.io-client').SocketOptions} cfg
   */
  constructor(proxyAddress, cfg) {
    super();

    // Client Config
    const clientCfg = { ...cfg };
    clientCfg.reconnection = false;
    clientCfg.autoConnect = false;
    this.#client = new Io(proxyAddress, clientCfg);

    // Reconnect
    this.#client.on('disconnect', () => {
      this.emit('disconnect');
      this.#connected = false;
    });

    const retryConn = () => {
      if (!this.#firstTime && !this.#connected) this.connect();
      if (this.#enabled) setTimeout(retryConn, this.#connTimeout);
    };

    setTimeout(retryConn, this.#connTimeout);

    // User events
    this.#client.on(
      'PROXY_REQUEST',
      /** @type {(...args: ProxyRequest) => avoid} */ (socketId, eventName, ...args) => {
        if ((typeof socketId !== 'string' && typeof eventName !== 'string') || !this.#server)
          return;
        console.log('PROXY_REQUEST', socketId, eventName, ...args);
      },
    );

    this.#client.on('PROXY_USER_CONNECTION', (/** @type {ProxyUserConnection} */ socketInfo) => {
      console.log('PROXY_USER_CONNECTION', socketInfo);
      this.#sockets.set(socketInfo.id, new SocketIoProxyUser(socketInfo));
      // this.emit('socketConnection', { id: socketInfo.id });
    });

    this.#client.on('PROXY_USER_DISCONNECT', (/** @type {ProxyUserDisconnect} */ socketInfo) => {
      console.log('PROXY_USER_DISCONNECT', socketInfo);
      const socket = this.#sockets.get(socketInfo.id);
      if (!socket) return;

      socket.removeAllListeners();
      this.#sockets.delete(socketInfo.id);
      // this.emit('socketDisconnect', socketInfo);
    });
  }

  /**
   * Connect proxy
   * @returns {Promise<boolean>}
   */
  connect() {
    return new Promise((resolve, reject) => {
      if (this.#isDestroyed) reject(new Error('Destroyed instance!'));
      if (!(this.#server instanceof Server)) {
        reject(new Error('Invalid socket io server!'));
        return;
      }

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

  /** Disconnect proxy */
  disconnect() {
    this.client.disconnect();
    this.#enabled = false;
    this.#firstTime = true;
    this.#sockets.forEach((socket) => socket.removeAllListeners());
    this.#sockets.clear();
  }

  destroy() {
    this.disconnect();
    this.#server.removeAllListeners();
    this.removeAllListeners();
    this.#isDestroyed = true;
  }
}

export default SocketIoProxyClient;
