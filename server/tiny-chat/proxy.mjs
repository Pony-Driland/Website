import EventEmitter from 'events';
import { io as Io } from 'socket.io-client';
import { TinyPromiseQueue } from 'tiny-essentials';

class SocketIoProxyClient extends EventEmitter {
  #queue = new TinyPromiseQueue();

  #enabled = false;

  #firstTime = true;

  /** @type {import('socket.io-client').Socket} */
  #client;

  /** @returns {import('socket.io-client').Socket} */
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
    });

    const retryConn = () => {
      if (!this.#firstTime && !this.#connected) this.connect();
      if (this.#enabled) setTimeout(retryConn, this.#connTimeout);
    };

    setTimeout(retryConn, this.#connTimeout);
  }

  /**
   * @returns {Promise<boolean>}
   */
  connect() {
    return new Promise((resolve) => {
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

  disconnect() {
    this.client.disconnect();
    this.#enabled = false;
    this.#firstTime = true;
  }
}

export default SocketIoProxyClient;
