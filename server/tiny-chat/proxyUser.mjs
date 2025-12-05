import EventEmitter from 'events';

/** @typedef {import('../tiny-chat-proxy/proxy.mjs').ProxyUserConnection} ProxyUserConnection */

class SocketIoProxyUser extends EventEmitter {
  /** @type {ProxyUserConnection} */
  #data;

  /** @param {ProxyUserConnection} socketInfo */
  constructor(socketInfo) {
    super();
    this.#data = socketInfo;
  }

  disconnect() {
    this.removeAllListeners();
  }
}

export default SocketIoProxyUser;
