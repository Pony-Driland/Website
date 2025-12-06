import { Server } from 'socket.io';
import SocketIoProxyClient from 'tiny-server-essentials/proxy/client';
import proxyOnConnection from 'tiny-server-essentials/proxy/client/onConnection';

import startFiles from './appStorage';

import messageManager from './connection/messageManager';
import userManager from './connection/userManager';
import roomManager from './connection/roomManager';
import { getHashString, getIniConfig } from './connection/values';
import db from './connection/sql';

// Start server
startFiles().then(async (appStorage) => {
  // Cancel start
  if (!appStorage) return;

  // Start admin account
  const ownerData = {
    password: getIniConfig('OWNER_PASSWORD') || '',
    userId: getIniConfig('OWNER_ID') || '',
  };

  const users = db.getTable('users');
  const proxyAddress =
    (typeof appStorage.config.proxy.address === 'string'
      ? appStorage.config.proxy.address !== 'null'
        ? appStorage.config.proxy.address
        : null
      : null) ?? null;

  const proxyAuth =
    (typeof appStorage.config.proxy.auth === 'string'
      ? appStorage.config.proxy.auth !== 'null'
        ? appStorage.config.proxy.auth
        : null
      : null) ?? null;

  if (
    typeof ownerData.password === 'string' &&
    ownerData.password.length > 0 &&
    typeof ownerData.userId === 'string' &&
    ownerData.userId.length > 0
  )
    await users.set(ownerData.userId, { password: getHashString(ownerData.password) }, true);

  // Socket IO
  const proxy = proxyAddress ? new SocketIoProxyClient(proxyAddress) : null;
  const io = new Server({ cors: { origin: '*' } });

  // Proxy
  if (proxy) {
    proxy.auth = proxyAuth;
    proxy.on('connect', () => console.log(`[PROXY] [${proxyAddress}] Connected!`));
    proxy.on('disconnect', () => console.log(`[PROXY] [${proxyAddress}] Disconnected!`));

    // Connect
    proxy.connect();
  }

  // On connection
  proxyOnConnection(io, proxy, ({ socket, emitTo, socketTo, socketEmit }) => {
    console.log(
      `[APP] [${socket.handshake ? socket.handshake.address : '?.?.?.?'}] User connected: ${socket.id}`,
    );
    messageManager(socket, socketTo);
    userManager(socket, emitTo);
    roomManager(socket, emitTo, socketTo, socketEmit);
  });

  // Start server
  process.on('SIGINT', async () => {
    try {
      proxy.disconnect();
      io.close();
    } catch {}
  });

  io.listen(appStorage.config.server.port);
  console.log(
    `[APP] Server running on port ${appStorage.config.server.port}${proxy ? ` and in the proxy ${proxyAddress}` : ''}`,
  );
});
