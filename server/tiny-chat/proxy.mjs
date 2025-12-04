import EventEmitter from 'events';
import { io as Io } from 'socket.io-client';

class SocketIoProxyClient extends EventEmitter {
  /** @type {import('socket.io-client').WebSocket} */
  #client;

  /** @returns {import('socket.io-client').WebSocket} */
  get client() {
    return this.#client;
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

  get isConnected() {
    return this.#connected;
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

  /**
   * @param {string} proxyAddress
   * @param {import('socket.io-client').SocketOptions} cfg
   */
  constructor(proxyAddress, cfg) {
    super();

    const clientCfg = { ...cfg };
    clientCfg.reconnection = false;
    clientCfg.autoConnect = false;
    this.#client = new Io(proxyAddress, clientCfg);

    this.#client.on('disconnect', () => {
      this.emit('disconnect');
      this.#connected = false;
      setTimeout(() => this.connect(), this.#connTimeout);
    });
  }

  /**
   * @returns {Promise<boolean>}
   */
  connect() {
    return new Promise((resolve) => {
      if (this.#connected) {
        resolve(false);
        return;
      }

      this.#client.emit('AUTH_PROXY', this.#auth, () => {
        this.emit('connect');
        this.#connected = true;
        resolve(true);
      });
    });
  }
}

export default SocketIoProxyClient;
