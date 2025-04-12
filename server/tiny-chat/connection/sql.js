import path from 'path';
import TinySQL from '../TinySQL';
import isDebug from '../isDebug';

const db = new TinySQL();

export const startDatabase = async (appStorage) => {
  const { config, appDir } = appStorage;
  try {
    // Opening the database
    console.log(`[APP] [${config.database.type}] Starting database...`);

    // Sqlite3
    if (config.database.type === 'sqlite3')
      await db.initSqlite3(path.join(appDir(), `./database.db`));
    // Postgre
    else if (config.database.type === 'postgre')
      await db.initPostgre({
        user: config.database.user,
        host: config.database.host,
        database: config.database.database,
        password: config.database.password,
        port: config.database.port,
      });
    // Nothing
    else {
      console.log('[APP] No database detected.');
      return false;
    }

    // Debug mode
    db.setIsDebug(isDebug());
    console.log(`[APP] [${config.database.type}] Loading tables...`);

    // Start database

    // Stores room configurations, including password, etc.
    console.log(`[APP] [${config.database.type}] [table] Loading rooms...`);
    await db.initTable({ name: 'rooms', id: 'roomId' }, [
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

    // Stores room tokens data
    console.log(`[APP] [${config.database.type}] [table] Loading room tokens...`);
    await db.initTable({ name: 'roomTokens', id: 'roomId' }, [
      ['roomId', 'TEXT', 'PRIMARY KEY'],
      ['prompt', 'INTEGER'],
      ['systemInstruction', 'INTEGER'],
      ['rpgSchema', 'INTEGER'],
      ['rpgData', 'INTEGER'],
      ['rpgPrivateData', 'INTEGER'],
      ['file', 'INTEGER'],
      ['FOREIGN KEY (roomId) REFERENCES rooms(roomId) ON DELETE CASCADE'],
    ]);

    // Stores room hash data
    console.log(`[APP] [${config.database.type}] [table] Loading room hash...`);
    await db.initTable({ name: 'roomHash', id: 'roomId' }, [
      ['roomId', 'TEXT', 'PRIMARY KEY'],
      ['prompt', 'TEXT'],
      ['systemInstruction', 'TEXT'],
      ['rpgSchema', 'TEXT'],
      ['rpgData', 'TEXT'],
      ['rpgPrivateData', 'TEXT'],
      ['file', 'TEXT'],
      ['FOREIGN KEY (roomId) REFERENCES rooms(roomId) ON DELETE CASCADE'],
    ]);

    // Stores mod users from room
    console.log(`[APP] [${config.database.type}] [table] Loading room moderators...`);
    await db.initTable({ name: 'roomModerators', id: 'roomId', subId: 'userId' }, [
      ['roomId', 'TEXT'],
      ['userId', 'TEXT'],
      ['PRIMARY KEY (roomId, userId)'],
      ['FOREIGN KEY (roomId) REFERENCES rooms(roomId) ON DELETE CASCADE'],
    ]);

    // Stores users banned from room
    console.log(`[APP] [${config.database.type}] [table] Loading room banned users...`);
    await db.initTable({ name: 'roomBannedUsers', id: 'roomId', subId: 'userId' }, [
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

    // Stores room histories
    console.log(`[APP] [${config.database.type}] [table] Loading history...`);
    await db.initTable(
      {
        name: 'history',
        id: 'roomId',
        subId: 'historyId',
      },
      [
        ['historyId', 'TEXT', 'PRIMARY KEY DEFAULT (lower(hex(randomblob(16))))'],
        ...historyTemplate,
      ],
    );

    // Stores room deleted histories
    console.log(`[APP] [${config.database.type}] [table] Loading deleted history...`);
    await db.initTable(
      {
        name: 'historyDeleted',
        id: 'roomId',
        subId: 'historyId',
      },
      [['historyId', 'TEXT', 'PRIMARY KEY'], ...historyTemplate],
    );

    // Stores user credentials
    console.log(`[APP] [${config.database.type}] [table] Loading users...`);
    await db.initTable({ name: 'users', id: 'userId' }, [
      ['userId', 'TEXT', 'PRIMARY KEY'],
      ['password', 'TEXT', 'NOT NULL'],
      ['nickname', 'TEXT'],
    ]);

    // Stores users dice
    console.log(`[APP] [${config.database.type}] [table] Loading dices...`);
    await db.initTable({ name: 'usersDice', id: 'userId' }, [
      ['userId', 'TEXT', 'PRIMARY KEY'],
      ['bg', 'TEXT'],
      ['text', 'TEXT'],
      ['border', 'TEXT'],
      ['img', 'TEXT'],
      ['selectionBg', 'TEXT'],
      ['selectionText', 'TEXT'],
      ['FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE'],
    ]);

    // Stores the list of server moderators
    console.log(`[APP] [${config.database.type}] [table] Loading moderators...`);
    await db.initTable({ name: 'moderators', id: 'userId' }, [
      ['userId', 'TEXT', 'PRIMARY KEY'],
      ['reason', 'TEXT'],
      ['date', 'INTEGER', 'NOT NULL'],
      ['FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE'],
    ]);

    // Stores the list of banned users
    console.log(`[APP] [${config.database.type}] [table] Loading banned accounts...`);
    await db.initTable({ name: 'banned', id: 'userId' }, [
      ['userId', 'TEXT', 'PRIMARY KEY'],
      ['reason', 'TEXT'],
      ['date', 'INTEGER', 'NOT NULL'],
    ]);

    // Stores room private data
    console.log(`[APP] [${config.database.type}] [table] Loading private room data...`);
    await db.initTable({ name: 'privateRoomData', id: 'roomId' }, [
      ['roomId', 'TEXT', 'PRIMARY KEY'],
      ['data', 'JSON', 'NOT NULL'],
      ['FOREIGN KEY (roomId) REFERENCES rooms(roomId) ON DELETE CASCADE'],
    ]);

    // Stores room data
    console.log(`[APP] [${config.database.type}] [table] Loading room data...`);
    await db.initTable({ name: 'roomData', id: 'roomId' }, [
      ['roomId', 'TEXT', 'PRIMARY KEY'],
      ['data', 'JSON', 'NOT NULL'],
      ['FOREIGN KEY (roomId) REFERENCES rooms(roomId) ON DELETE CASCADE'],
    ]);

    // Stores room rpg schema data
    console.log(`[APP] [${config.database.type}] [table] Loading rpg schema...`);
    await db.initTable({ name: 'rpgSchema', id: 'roomId' }, [
      ['roomId', 'TEXT', 'PRIMARY KEY'],
      ['data', 'JSON', 'NOT NULL'],
      ['FOREIGN KEY (roomId) REFERENCES rooms(roomId) ON DELETE CASCADE'],
    ]);

    // Stores audit data
    console.log(`[APP] [${config.database.type}] [table] Loading audit...`);
    await db.initTable({ name: 'audit', id: 'auditId' }, [
      ['auditId', 'TEXT', 'PRIMARY KEY DEFAULT (lower(hex(randomblob(16))))'],
      ['userId', 'TEXT', 'NOT NULL'],
      ['target', 'TEXT'],
      ['type', 'TEXT', 'NOT NULL'],
    ]);

    // Complete
    console.log(`[APP] [${config.database.type}] Database connection opened.`);
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
};

export default db;
