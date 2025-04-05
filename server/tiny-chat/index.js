import { Server } from 'socket.io';
import startFiles from './appStorage';

import messageManager from './connection/messageManager';
import userManager from './connection/userManager';
import roomManager from './connection/roomManager';
import {
  bannedUsers,
  getHashString,
  getIniConfig,
  moderators,
  privateRoomData,
  roomBannedUsers,
  roomData,
  roomModerators,
  rooms,
  users,
} from './connection/values';
import isDebug from './isDebug';

// Start server
startFiles().then(async (appStorage) => {
  // Cancel start
  if (!appStorage) return;

  // Start database
  await appStorage.runQuery(`CREATE TABLE IF NOT EXISTS rooms (
    roomId TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title TEXT,
    password TEXT,
    maxUsers INTEGER DEFAULT 50,
    ownerId TEXT NOT NULL,
    disabled BOOLEAN DEFAULT 0
    );
    `);

  await appStorage.runQuery(`CREATE TABLE IF NOT EXISTS roomModerators (
    roomId TEXT,
    userId TEXT,
    PRIMARY KEY (roomId, userId),
    FOREIGN KEY (roomId) REFERENCES rooms(roomId) ON DELETE CASCADE
    );
  `);

  await appStorage.runQuery(`CREATE TABLE IF NOT EXISTS roomBannedUsers (
    roomId TEXT,
    userId TEXT,
    PRIMARY KEY (roomId, userId),
    FOREIGN KEY (roomId) REFERENCES rooms(roomId) ON DELETE CASCADE
    );
  `);

  await appStorage.runQuery(`CREATE TABLE IF NOT EXISTS history (
    historyId INTEGER PRIMARY KEY AUTOINCREMENT,
    roomId TEXT TEXT NOT NULL,
    userId TEXT TEXT NOT NULL,
    text TEXT NOT NULL,
    date INTEGER NOT NULL,
    edited INTEGER,
    FOREIGN KEY (roomId) REFERENCES rooms(roomId) ON DELETE CASCADE
    );
  `);

  await appStorage.runQuery(`CREATE TABLE IF NOT EXISTS users (
    userId TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    nickname TEXT
    );
  `);

  await appStorage.runQuery(`CREATE TABLE IF NOT EXISTS moderators (
    userId TEXT PRIMARY KEY,
    reason TEXT,
    date INTEGER NOT NULL
    );
  `);

  await appStorage.runQuery(`CREATE TABLE IF NOT EXISTS banned (
    userId TEXT PRIMARY KEY,
    reason TEXT,
    date INTEGER NOT NULL
    );
  `);

  await appStorage.runQuery(`CREATE TABLE IF NOT EXISTS privateRoomData (
    roomId TEXT PRIMARY KEY,
    data JSON NOT NULL,
    FOREIGN KEY (roomId) REFERENCES rooms(roomId) ON DELETE CASCADE
    );
  `);

  await appStorage.runQuery(`CREATE TABLE IF NOT EXISTS roomData (
    roomId TEXT PRIMARY KEY,
    data JSON NOT NULL,
    FOREIGN KEY (roomId) REFERENCES rooms(roomId) ON DELETE CASCADE
    );
  `);

  await appStorage.runQuery(`CREATE TABLE IF NOT EXISTS audit (
    auditId INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,
    target TEXT,
    type TEXT NOT NULL
    );
  `);

  const debugMode = isDebug();

  roomModerators.setDb(appStorage, { name: 'roomModerators', id: 'roomId', subId: 'userId' });
  roomModerators.setDebug(debugMode);

  roomBannedUsers.setDb(appStorage, { name: 'roomBannedUsers', id: 'roomId', subId: 'userId' });
  roomBannedUsers.setDebug(debugMode);

  bannedUsers.setDb(appStorage, { name: 'banned', id: 'userId' });
  bannedUsers.setDebug(debugMode);

  moderators.setDb(appStorage, { name: 'moderators', id: 'roomId' });
  moderators.setDebug(debugMode);

  privateRoomData.setDb(appStorage, { name: 'privateRoomData', id: 'roomId', json: ['data'] });
  privateRoomData.setDebug(debugMode);

  roomData.setDb(appStorage, { name: 'roomData', id: 'roomId', json: ['data'] });
  roomData.setDebug(debugMode);

  rooms.setDb(appStorage, { name: 'rooms', id: 'roomId' });
  rooms.setDebug(debugMode);

  users.setDb(appStorage, { name: 'users', id: 'userId' });
  users.setDebug(debugMode);

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
    await appStorage.runQuery(
      `INSERT INTO users (userId, password)
    SELECT $1, $2
    WHERE NOT EXISTS (
        SELECT 1 FROM users WHERE userId = $1
    )
  `,
      [ownerData.userId, getHashString(ownerData.password)],
    );

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
