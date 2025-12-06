import { TinyPromiseQueue } from 'tiny-essentials';
import SocketIoProxyUser from './proxyUser.mjs';

/**
 * @callback SocketEmit
 * @param {string} eventName
 * @param {any} data
 */

/**
 * @callback EmitTo
 * @param {string} roomId
 * @param {string} eventName
 * @param {any} data
 */

/**
 * @callback ProxyOnConnection
 * @param {Object} result
 * @param {import('socket.io-client').Socket} result.socket
 * @param {EmitTo} result.emitTo
 * @param {EmitTo} result.socketTo
 * @param {SocketEmit} result.socketEmit
 * @param {boolean} result.isProxy
 */

/**
 * @param {import('socket.io').Socket} io
 * @param {import('./proxy.mjs').default|null} proxy
 * @param {ProxyOnConnection} callback
 * @returns {TinyPromiseQueue}
 */
const proxyOnConnection = (io, proxy, callback) => {
  const queue = new TinyPromiseQueue();

  // Server Side
  io.on('connection', (socket) =>
    callback({
      // Socket
      socket,
      // IO To
      emitTo: async (roomId, eventName, data) => {
        await queue.enqueue(async () => io.to(roomId).emit(eventName, data));
        if (proxy) await queue.enqueue(async () => proxy.to(roomId).emit(eventName, data));
      },
      // Socket To
      socketTo: async (roomId, eventName, data) => {
        await queue.enqueue(async () => socket.to(roomId).emit(eventName, data));
        if (proxy) await queue.enqueue(async () => proxy.to(roomId).emit(eventName, data));
      },
      // Socket Emit
      socketEmit: async (eventName, ...args) => {
        await queue.enqueue(async () => socket.emit(eventName, ...args));
      },
      // isProxy
      isProxy: false,
    }),
  );

  // Proxy Side
  if (proxy)
    proxy.on('connection', (/** @type {SocketIoProxyUser} */ socket) =>
      callback({
        // Socket
        // @ts-ignore
        socket,
        // IO To
        emitTo: async (roomId, eventName, data) => {
          await queue.enqueue(async () => io.to(roomId).emit(eventName, data));
          await queue.enqueue(async () => proxy.to(roomId).emit(eventName, data));
        },
        // Socket To
        socketTo: async (roomId, eventName, data) => {
          await queue.enqueue(async () => socket.to(roomId).emit(eventName, data));
          await queue.enqueue(async () => io.to(roomId).emit(eventName, data));
        },
        // Socket Emit
        socketEmit: async (eventName, ...args) => {
          await queue.enqueue(async () => socket.emit(eventName, ...args));
        },
        // isProxy
        isProxy: true,
      }),
    );

  return queue;
};

export default proxyOnConnection;
