import { Server } from 'socket.io';
import SocketIoProxyClient from './proxy.mjs';

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

  /////////////////////////////////////////////////////////////

  const proxy = proxyAddress ? new SocketIoProxyClient(proxyAddress) : null;

  if (proxy) {
    proxy.auth = proxyAuth;
    proxy.on('connect', () => console.log(`[PROXY] [${proxyAddress}] Connected!`));
    proxy.on('disconnect', () => console.log(`[PROXY] [${proxyAddress}] Disconnected!`));
    proxy.connect();
  }

  /////////////////////////////////////////////////////////////

  if (
    typeof ownerData.password === 'string' &&
    ownerData.password.length > 0 &&
    typeof ownerData.userId === 'string' &&
    ownerData.userId.length > 0
  )
    await users.set(ownerData.userId, { password: getHashString(ownerData.password) }, true);

  // Socket IO

  /**
   * @param {import('socket.io-client').Socket} socket
   */
  const onConnection = (socket) => {
    console.log(
      `[APP] [${socket.handshake ? socket.handshake.address : '?.?.?.?'}] User connected: ${socket.id}`,
    );
    messageManager(socket, io);
    userManager(socket, io);
    roomManager(socket, io, appStorage);
  };

  const io = new Server({ cors: { origin: '*' } });
  io.on('connection', onConnection);

  // Start server
  process.on('SIGINT', async () => {
    try {
      io.close();
    } catch {}
  });

  io.listen(appStorage.config.server.port);
  console.log(`[APP] Server running on port ${appStorage.config.server.port}`);
});
