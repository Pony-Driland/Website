import SocketIoProxyUser from './proxyUser.mjs';

/**
 * A function that emits an event directly to the connected socket.
 *
 * @callback SocketEmit
 * @param {string} eventName Name of the event to emit
 * @param {any} data Payload sent to the socket
 */

/**
 * Emits an event to all sockets inside a given room.
 *
 * @callback EmitTo
 * @param {string} roomId Room identifier
 * @param {string} eventName Event name
 * @param {any} data Data to broadcast
 */

/**
 * Callback invoked when either a real Socket.IO connection or a proxied
 * user connection is established.
 *
 * This provides a unified interface where the application code does not need to
 * differentiate between:
 * - A real user connected directly to the server
 * - A proxied user forwarded through another proxy server
 *
 * @callback ProxyOnConnection
 * @param {Object} result Information about the connection context
 * @param {import('socket.io-client').Socket|SocketIoProxyUser} result.socket
 *   The socket instance (real or proxied)
 * @param {EmitTo} result.emitTo
 *   Broadcast from server context to all sockets in a room (including proxy mirrors)
 * @param {EmitTo} result.socketTo
 *   Broadcast from the socket context to a room (excluding itself)
 * @param {SocketEmit} result.socketEmit
 *   Emits an event directly to this socket
 * @param {boolean} result.isProxy
 *   Whether this event originates from a proxied connection
 */

/**
 * Creates a unified listener for both direct Socket.IO connections and proxy-driven
 * user connections.
 *
 * This abstracts away the difference between:
 * - Real users connected through the local Socket.IO server (`io`)
 * - Remote users connected through a proxy server (`proxy`)
 *
 * The main purpose of this function is to allow application code to handle both
 * connection types identically, without writing separate logic paths.
 *
 * How the system works:
 *
 * 1. **Local connections**
 *    When a real client connects, the callback receives:
 *    - The real socket instance
 *    - Methods for broadcasting to rooms via both local and proxy transports
 *    - `isProxy = false`
 *
 * 2. **Proxy connections**
 *    When the proxy layer emits a new proxied user connection:
 *    - A `SocketIoProxyUser` instance is passed as the socket
 *    - Broadcast/expose logic is mirrored between server and proxy
 *    - `isProxy = true`
 *
 * In both cases, your application receives:
 * - `socket`: a unified socket object
 * - `emitTo`: broadcast to rooms from the server context
 * - `socketTo`: broadcast to rooms from the socket context
 * - `socketEmit`: emit directly to the socket
 *
 * This eliminates the need to distinguish between remote and local users.
 *
 * @param {import('socket.io').Server} io
 *   The main Socket.IO server instance
 * @param {import('./proxy.mjs').default|null} proxy
 *   Optional proxy instance responsible for forwarding events between servers
 * @param {ProxyOnConnection} callback
 *   Function executed when either local or proxied users connect
 */
const proxyOnConnection = (io, proxy, callback) => {
  //
  // ───────────────────────────────────────────────────────────────
  //  LOCAL SERVER-SIDE CONNECTIONS
  // ───────────────────────────────────────────────────────────────
  //
  io.on('connection', (socket) =>
    callback({
      // @ts-ignore
      socket,

      // Server-wide broadcast to a room (includes local + proxy)
      emitTo: (roomId, eventName, data) => {
        io.to(roomId).emit(eventName, data);
        if (proxy) proxy.to(roomId).emit(eventName, data);
      },

      // Broadcast to a room except this socket (includes proxy users)
      socketTo: (roomId, eventName, data) => {
        socket.to(roomId).emit(eventName, data);
        if (proxy) proxy.to(roomId).emit(eventName, data);
      },

      // Emit directly to this socket
      socketEmit: (eventName, ...args) => {
        socket.emit(eventName, ...args);
      },

      isProxy: false,
    }),
  );

  //
  // ───────────────────────────────────────────────────────────────
  //  PROXY-SIDE USER CONNECTIONS
  // ───────────────────────────────────────────────────────────────
  //
  if (proxy)
    proxy.on('connection', (/** @type {SocketIoProxyUser} */ socket) =>
      callback({
        // The proxied user behaves like a socket
        socket,

        // Server broadcast: always mirror to real IO and proxy layers
        emitTo: (roomId, eventName, data) => {
          io.to(roomId).emit(eventName, data);
          proxy.to(roomId).emit(eventName, data);
        },

        // Broadcast from the proxied user to a room
        socketTo: (roomId, eventName, data) => {
          socket.to(roomId).emit(eventName, data);
          io.to(roomId).emit(eventName, data);
        },

        // Emit directly to the proxied user
        socketEmit: (eventName, ...args) => {
          socket.emit(eventName, ...args);
        },

        isProxy: true,
      }),
    );
};

export default proxyOnConnection;
