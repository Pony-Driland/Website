import EventEmitter from 'events';

/** @typedef {import('../tiny-chat-proxy/proxy.mjs').ProxyUserConnection} ProxyUserConnection */

class SocketIoProxyUser extends EventEmitter {
  /** @type {ProxyUserConnection} */
  #data;

  /** @type {string} */
  #id;

  /** @type {import('socket.io-client').Socket} */
  #socket;

  /** @returns {string} */
  get id() {
    return this.#id;
  }

  /**
   * @param {ProxyUserConnection} socketInfo
   * @param {import('socket.io-client').Socket} socket
   */
  constructor(socketInfo, socket) {
    super();
    this.#socket = socket;
    this.#data = socketInfo;
    this.#id = socketInfo.id;
  }

  disconnect() {
    this.removeAllListeners();
  }
}

export default SocketIoProxyUser;
