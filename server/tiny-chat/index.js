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
  roomHash,
  roomHistoriesDeleted,
  roomModerators,
  rooms,
  roomTokens,
  users,
  usersDice,
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
    prompt TEXT,
    model TEXT,
    systemInstruction TEXT,
    firstDialogue TEXT,
    maxOutputTokens REAL,
    temperature REAL,
    topP REAL,
    topK REAL,
    presencePenalty REAL,
    frequencyPenalty REAL,
    maxUsers INTEGER DEFAULT 50,
    ownerId TEXT NOT NULL,
    disabled BOOLEAN DEFAULT 0
    );
    `);

  await appStorage.runQuery(`CREATE TABLE IF NOT EXISTS roomTokens (
    roomId TEXT PRIMARY KEY,
    prompt INTEGER,
    systemInstruction INTEGER,
    rpgSchema INTEGER,
    rpgData INTEGER,
    rpgPrivateData INTEGER,
    file INTEGER,
    FOREIGN KEY (roomId) REFERENCES rooms(roomId) ON DELETE CASCADE
    );
  `);

  await appStorage.runQuery(`CREATE TABLE IF NOT EXISTS roomHash (
    roomId TEXT PRIMARY KEY,
    prompt TEXT,
    systemInstruction TEXT,
    rpgSchema TEXT,
    rpgData TEXT,
    rpgPrivateData TEXT,
    file TEXT,
    FOREIGN KEY (roomId) REFERENCES rooms(roomId) ON DELETE CASCADE
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

  const historyQuery = `
    roomId TEXT TEXT NOT NULL,
    userId TEXT TEXT NOT NULL,
    text TEXT NOT NULL,
    date INTEGER NOT NULL,
    edited INTEGER,
    tokens INTEGER,
    errorCode TEXT,
    FOREIGN KEY (roomId) REFERENCES rooms(roomId) ON DELETE CASCADE
  `;
  await appStorage.runQuery(
    `CREATE TABLE IF NOT EXISTS history (historyId TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), ${historyQuery});`,
  );
  await appStorage.runQuery(
    `CREATE TABLE IF NOT EXISTS historyDeleted (historyId TEXT NOT NULL, ${historyQuery});`,
  );

  await appStorage.runQuery(`CREATE TABLE IF NOT EXISTS users (
    userId TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    nickname TEXT
    );
  `);

  await appStorage.runQuery(`CREATE TABLE IF NOT EXISTS usersDice (
    userId TEXT PRIMARY KEY,
    bg TEXT,
    text TEXT,
    border TEXT,
    img TEXT,
    selectionBg TEXT,
    selectionText TEXT,
    FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
    );
  `);

  await appStorage.runQuery(`CREATE TABLE IF NOT EXISTS moderators (
    userId TEXT PRIMARY KEY,
    reason TEXT,
    date INTEGER NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
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

  await appStorage.runQuery(`CREATE TABLE IF NOT EXISTS rpgSchema (
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

  moderators.setDb(appStorage, { name: 'moderators', id: 'userId' });
  moderators.setDebug(debugMode);

  privateRoomData.setDb(appStorage, { name: 'privateRoomData', id: 'roomId', json: ['data'] });
  privateRoomData.setDebug(debugMode);

  roomData.setDb(appStorage, { name: 'roomData', id: 'roomId', json: ['data'] });
  roomData.setDebug(debugMode);

  rooms.setDb(appStorage, { name: 'rooms', id: 'roomId' });
  rooms.setDebug(debugMode);

  roomHash.setDb(appStorage, { name: 'roomHash', id: 'roomId' });
  roomHash.setDebug(debugMode);

  roomTokens.setDb(appStorage, { name: 'roomTokens', id: 'roomId' });
  roomTokens.setDebug(debugMode);

  users.setDb(appStorage, { name: 'users', id: 'userId' });
  users.setDebug(debugMode);

  usersDice.setDb(appStorage, { name: 'usersDice', id: 'userId' });
  usersDice.setDebug(debugMode);

  roomHistoriesDeleted.setDb(appStorage, {
    name: 'historyDeleted',
    id: 'roomId',
    subId: 'historyId',
  });
  roomHistoriesDeleted.setDebug(debugMode);

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
