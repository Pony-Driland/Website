import { Server } from 'socket.io';
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

  if (
    typeof ownerData.password === 'string' &&
    ownerData.password.length > 0 &&
    typeof ownerData.userId === 'string' &&
    ownerData.userId.length > 0
  )
    await users.set(ownerData.userId, { password: getHashString(ownerData.password) }, true);

  // Socket IO
  const io = new Server({ cors: { origin: '*' } });
  io.on('connection', (socket) => {
    console.log(
      `[APP] [${socket.handshake ? socket.handshake.address : '?.?.?.?'}] User connected: ${socket.id}`,
    );
    messageManager(socket, io);
    userManager(socket, io);
    roomManager(socket, io, appStorage);
  });

  // Start server
  process.on('SIGINT', async () => {
    try {
      io.close();
    } catch {}
  });

  io.listen(appStorage.config.server.port);
  console.log(`[APP] Server running on port ${appStorage.config.server.port}`);
});
