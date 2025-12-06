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
 */
const proxyOnConnection = (io, proxy, callback) => {
  // Server Side
  io.on('connection', (socket) =>
    callback({
      // Socket
      socket,
      // IO To
      emitTo: (roomId, eventName, data) => {
        io.to(roomId).emit(eventName, data);
        if (proxy) proxy.to(roomId).emit(eventName, data);
      },
      // Socket To
      socketTo: (roomId, eventName, data) => {
        socket.to(roomId).emit(eventName, data);
        if (proxy) proxy.to(roomId).emit(eventName, data);
      },
      // Socket Emit
      socketEmit: (eventName, ...args) => {
        socket.emit(eventName, ...args);
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
        emitTo: (roomId, eventName, data) => {
          io.to(roomId).emit(eventName, data);
          proxy.to(roomId).emit(eventName, data);
        },
        // Socket To
        socketTo: (roomId, eventName, data) => {
          socket.to(roomId).emit(eventName, data);
          io.to(roomId).emit(eventName, data);
        },
        // Socket Emit
        socketEmit: (eventName, ...args) => {
          socket.emit(eventName, ...args);
        },
        // isProxy
        isProxy: true,
      }),
    );
};

export default proxyOnConnection;
