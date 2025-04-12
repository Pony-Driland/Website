import { Server } from 'socket.io';
import startFiles from './appStorage';

import messageManager from './connection/messageManager';
import userManager from './connection/userManager';
import roomManager from './connection/roomManager';
import {
  audit,
  bannedUsers,
  getHashString,
  getIniConfig,
  moderators,
  privateRoomData,
  roomBannedUsers,
  roomData,
  roomHash,
  roomHistories,
  roomHistoriesDeleted,
  roomModerators,
  rooms,
  roomTokens,
  rpgSchema,
  users,
  usersDice,
} from './connection/values';
import isDebug from './isDebug';

// Start server
startFiles().then(async (appStorage) => {
  // Cancel start
  if (!appStorage) return;

  // Start database
  const debugMode = isDebug();

  rooms.setAppStorage(appStorage);
  rooms.setDb({ name: 'rooms', id: 'roomId' });
  rooms.setDebug(debugMode);
  await rooms.createTable([
    ['roomId', 'TEXT', 'PRIMARY KEY DEFAULT (lower(hex(randomblob(16))))'],
    ['title', 'TEXT'],
    ['password', 'TEXT'],
    ['prompt', 'TEXT'],
    ['model', 'TEXT'],
    ['systemInstruction', 'TEXT'],
    ['firstDialogue', 'TEXT'],
    ['maxOutputTokens', 'REAL'],
    ['temperature', 'REAL'],
    ['topP', 'REAL'],
    ['topK', 'REAL'],
    ['presencePenalty', 'REAL'],
    ['frequencyPenalty', 'REAL'],
    ['maxUsers', 'INTEGER', 'DEFAULT 50'],
    ['ownerId', 'TEXT', 'NOT NULL'],
    ['disabled', 'BOOLEAN', 'DEFAULT 0'],
  ]);

  roomTokens.setAppStorage(appStorage);
  roomTokens.setDb({ name: 'roomTokens', id: 'roomId' });
  roomTokens.setDebug(debugMode);
  await roomTokens.createTable([
    ['roomId', 'TEXT', 'PRIMARY KEY'],
    ['prompt', 'INTEGER'],
    ['systemInstruction', 'INTEGER'],
    ['rpgSchema', 'INTEGER'],
    ['rpgData', 'INTEGER'],
    ['rpgPrivateData', 'INTEGER'],
    ['file', 'INTEGER'],
    ['FOREIGN KEY (roomId) REFERENCES rooms(roomId) ON DELETE CASCADE'],
  ]);

  roomHash.setAppStorage(appStorage);
  roomHash.setDb({ name: 'roomHash', id: 'roomId' });
  roomHash.setDebug(debugMode);
  await roomHash.createTable([
    ['roomId', 'TEXT', 'PRIMARY KEY'],
    ['prompt', 'TEXT'],
    ['systemInstruction', 'TEXT'],
    ['rpgSchema', 'TEXT'],
    ['rpgData', 'TEXT'],
    ['rpgPrivateData', 'TEXT'],
    ['file', 'TEXT'],
    ['FOREIGN KEY (roomId) REFERENCES rooms(roomId) ON DELETE CASCADE'],
  ]);

  roomModerators.setAppStorage(appStorage);
  roomModerators.setDb({ name: 'roomModerators', id: 'roomId', subId: 'userId' });
  roomModerators.setDebug(debugMode);
  await roomModerators.createTable([
    ['roomId', 'TEXT'],
    ['userId', 'TEXT'],
    ['PRIMARY KEY (roomId, userId)'],
    ['FOREIGN KEY (roomId) REFERENCES rooms(roomId) ON DELETE CASCADE'],
  ]);

  roomBannedUsers.setAppStorage(appStorage);
  roomBannedUsers.setDb({ name: 'roomBannedUsers', id: 'roomId', subId: 'userId' });
  roomBannedUsers.setDebug(debugMode);
  await roomBannedUsers.createTable([
    ['roomId', 'TEXT'],
    ['userId', 'TEXT'],
    ['PRIMARY KEY (roomId, userId)'],
    ['FOREIGN KEY (roomId) REFERENCES rooms(roomId) ON DELETE CASCADE'],
  ]);

  const historyTemplate = [
    ['roomId', 'TEXT', 'NOT NULL'],
    ['userId', 'TEXT', 'NOT NULL'],
    ['text', 'TEXT', 'NOT NULL'],
    ['date', 'INTEGER', 'NOT NULL'],
    ['edited', 'INTEGER'],
    ['tokens', 'INTEGER'],
    ['errorCode', 'TEXT'],
    ['FOREIGN KEY (roomId) REFERENCES rooms(roomId) ON DELETE CASCADE'],
  ];

  roomHistories.setAppStorage(appStorage);
  roomHistories.setDb({
    name: 'history',
    id: 'roomId',
    subId: 'historyId',
  });
  roomHistories.setDebug(debugMode);
  await roomHistories.createTable([
    ['historyId', 'TEXT', 'PRIMARY KEY DEFAULT (lower(hex(randomblob(16))))'],
    ...historyTemplate,
  ]);

  roomHistoriesDeleted.setAppStorage(appStorage);
  roomHistoriesDeleted.setDb({
    name: 'historyDeleted',
    id: 'roomId',
    subId: 'historyId',
  });
  roomHistoriesDeleted.setDebug(debugMode);
  await roomHistoriesDeleted.createTable([
    ['historyId', 'TEXT', 'PRIMARY KEY'],
    ...historyTemplate,
  ]);

  users.setAppStorage(appStorage);
  users.setDb({ name: 'users', id: 'userId' });
  users.setDebug(debugMode);
  await users.createTable([
    ['userId', 'TEXT', 'PRIMARY KEY'],
    ['password', 'TEXT', 'NOT NULL'],
    ['nickname', 'TEXT'],
  ]);

  usersDice.setAppStorage(appStorage);
  usersDice.setDb({ name: 'usersDice', id: 'userId' });
  usersDice.setDebug(debugMode);
  await usersDice.createTable([
    ['userId', 'TEXT', 'PRIMARY KEY'],
    ['bg', 'TEXT'],
    ['text', 'TEXT'],
    ['border', 'TEXT'],
    ['img', 'TEXT'],
    ['selectionBg', 'TEXT'],
    ['selectionText', 'TEXT'],
    ['FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE'],
  ]);

  moderators.setAppStorage(appStorage);
  moderators.setDb({ name: 'moderators', id: 'userId' });
  moderators.setDebug(debugMode);
  await moderators.createTable([
    ['userId', 'TEXT', 'PRIMARY KEY'],
    ['reason', 'TEXT'],
    ['date', 'INTEGER', 'NOT NULL'],
    ['FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE'],
  ]);

  bannedUsers.setAppStorage(appStorage);
  bannedUsers.setDb({ name: 'banned', id: 'userId' });
  bannedUsers.setDebug(debugMode);
  await bannedUsers.createTable([
    ['userId', 'TEXT', 'PRIMARY KEY'],
    ['reason', 'TEXT'],
    ['date', 'INTEGER', 'NOT NULL'],
  ]);

  privateRoomData.setAppStorage(appStorage);
  privateRoomData.setDb({ name: 'privateRoomData', id: 'roomId', json: ['data'] });
  privateRoomData.setDebug(debugMode);
  await privateRoomData.createTable([
    ['roomId', 'TEXT', 'PRIMARY KEY'],
    ['data', 'JSON', 'NOT NULL'],
    ['FOREIGN KEY (roomId) REFERENCES rooms(roomId) ON DELETE CASCADE'],
  ]);

  rpgSchema.setAppStorage(appStorage);
  rpgSchema.setDb({ name: 'rpgSchema', id: 'roomId', json: ['data'] });
  rpgSchema.setDebug(debugMode);
  await rpgSchema.createTable([
    ['roomId', 'TEXT', 'PRIMARY KEY'],
    ['data', 'JSON', 'NOT NULL'],
    ['FOREIGN KEY (roomId) REFERENCES rooms(roomId) ON DELETE CASCADE'],
  ]);

  roomData.setAppStorage(appStorage);
  roomData.setDb({ name: 'roomData', id: 'roomId', json: ['data'] });
  roomData.setDebug(debugMode);
  await roomData.createTable([
    ['roomId', 'TEXT', 'PRIMARY KEY'],
    ['data', 'JSON', 'NOT NULL'],
    ['FOREIGN KEY (roomId) REFERENCES rooms(roomId) ON DELETE CASCADE'],
  ]);

  audit.setAppStorage(appStorage);
  audit.setDb({ name: 'audit', id: 'auditId' });
  audit.setDebug(debugMode);
  await audit.createTable([
    ['auditId', 'TEXT', 'PRIMARY KEY DEFAULT (lower(hex(randomblob(16))))'],
    ['userId', 'TEXT', 'NOT NULL'],
    ['target', 'TEXT'],
    ['type', 'TEXT', 'NOT NULL'],
  ]);

  // Start admin account
  const ownerData = {
    password: getIniConfig('OWNER_PASSWORD') || '',
    userId: getIniConfig('OWNER_ID') || '',
  };

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
