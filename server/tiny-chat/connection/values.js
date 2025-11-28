import crypto from 'crypto';
import { isJsonObject } from 'tiny-essentials/basics';
import db from './sql';

export const userSockets = new Map(); // Socket users

// Rate limit settings
const LIMITS = {
  OWNER_ID: '',
};

export const getIniConfig = (where) => LIMITS[where];
export const _setIniConfig = (where, value) => {
  LIMITS[where] = value ?? 0;
};

// Track the users in rooms
export const roomUsers = new Map(); // Stores room users

// Track the timestamps for rate limiting
export const userMessageTimestamps = new Map();

// Hashed String
export const getHashString = (text) => crypto.createHash('sha256').update(text).digest('hex');

// Map to Array
export function mapToArray(map) {
  return map.size > 0 ? Array.from(map) : [];
}

/**
 * Creates a new user account.
 * @param {string} userId - The user's unique ID.
 * @param {string} password - The user's password.
 * @param {string} nickname - The user's chosen nickname.
 */
export const createAccount = async (userId, password, nickname) => {
  const hashedPassword = getHashString(password.substring(0, getIniConfig('PASSWORD_SIZE')));
  const users = db.getTable('users');
  await users.set(userId.substring(0, getIniConfig('USER_ID_SIZE')).replace(/ /g, ''), {
    password: hashedPassword,
    nickname: nickname.substring(0, getIniConfig('NICKNAME_SIZE')),
  });
};

export const createRoom = async (userId, roomId, password, title) => {
  const hashedPassword = getHashString(password.substring(0, getIniConfig('PASSWORD_SIZE')));
  const rooms = db.getTable('rooms');
  await rooms.set(roomId.substring(0, getIniConfig('ROOM_ID_SIZE')), {
    password: hashedPassword,
    title: title.substring(0, getIniConfig('ROOM_TITLE_SIZE')),
    maxUsers: getIniConfig('MAX_USERS_PER_ROOM'),
    ownerId: userId,
    disabled: false,
  });
};

export const userSession = {
  check: (socket) => {
    if (!socket.tinySession) socket.tinySession = { rooms: [] };
  },
  isInRoom: (socket, roomId) => {
    if (
      socket.tinySession &&
      Array.isArray(socket.tinySession.rooms) &&
      socket.tinySession.rooms.indexOf(roomId) > -1
    )
      return true;

    return false;
  },
  addRoom: (socket, roomId) => {
    if (socket.tinySession && typeof roomId === 'string') {
      if (Array.isArray(socket.tinySession.rooms) && socket.tinySession.rooms.indexOf(roomId) < 0)
        socket.tinySession.rooms.push(roomId);
      return true;
    }
    return false;
  },
  eachRooms: (socket, callback) => {
    if (socket.tinySession && Array.isArray(socket.tinySession.rooms))
      for (const index in socket.tinySession.rooms) callback(socket.tinySession.rooms[index]);
  },
  removeRoom: (socket, roomId) => {
    if (
      socket.tinySession &&
      Array.isArray(socket.tinySession.rooms) &&
      typeof roomId === 'string'
    ) {
      const index = socket.tinySession.rooms.indexOf(roomId);
      if (index > -1) socket.tinySession.rooms.splice(index, 1);
    }
    return false;
  },
  getUserId: (socket) =>
    socket.tinySession && typeof socket.tinySession.userId === 'string'
      ? socket.tinySession.userId
      : null,
  getNickname: (socket) =>
    socket.tinySession && typeof socket.tinySession.nickname === 'string'
      ? socket.tinySession.nickname
      : null,
  setUserId: (socket, userId) => {
    if (socket.tinySession) {
      socket.tinySession.userId = userId;
      return true;
    }
    return false;
  },
  setNickname: (socket, nickname) => {
    if (socket.tinySession) {
      socket.tinySession.nickname = nickname;
      return true;
    }
    return false;
  },
};

export const getRateLimit = () => ({
  size: {
    history: getIniConfig('HISTORY_SIZE'),
    userId: getIniConfig('USER_ID_SIZE'),
    password: getIniConfig('PASSWORD_SIZE'),
    minPassword: getIniConfig('MIN_PASSWORD_SIZE'),
    nickname: getIniConfig('NICKNAME_SIZE'),
    msg: getIniConfig('MESSAGE_SIZE'),
    roomId: getIniConfig('ROOM_ID_SIZE'),
    roomTitle: getIniConfig('ROOM_TITLE_SIZE'),
    modelId: getIniConfig('MODEL_ID_SIZE'),
    prompt: getIniConfig('ROOM_PROMPT'),
    systemInstruction: getIniConfig('ROOM_SYSTEM_INSTRUCTION'),
    firstDialogue: getIniConfig('ROOM_FIRST_DIALOGUE'),
  },
  limit: {
    msg: getIniConfig('MESSAGES'),
    roomUpdates: getIniConfig('ROOM_UPDATES'),
    diceRolls: getIniConfig('DICE_ROLLS'),
    events: getIniConfig('EVENT'),
    roomUsers: getIniConfig('MAX_USERS_PER_ROOM'),
  },
  dice: {
    amount: getIniConfig('DICE_AMOUNT'),
    sides: getIniConfig('DICE_SIDES'),
    img: getIniConfig('DICE_IMG_SIZE'),
    border: getIniConfig('DICE_BORDER_STYLE'),
    bg: getIniConfig('DICE_BG_STYLE'),
    text: getIniConfig('DICE_TEXT_STYLE'),
    selectionBg: getIniConfig('DICE_SELECTION_BG_STYLE'),
    selectionText: getIniConfig('DICE_SELECTION_TEXT_STYLE'),
  },
  loadAllHistory: getIniConfig('LOAD_ALL_HISTORY'),
  time: getIniConfig('RATE_LIMIT_TIME'),
  openRegistration: getIniConfig('OPEN_REGISTRATION'),
});

export const sendRateLimit = (socket) => {
  socket.emit('ratelimt-updated', getRateLimit());
};

// Rate limit editor
export const createRateLimit = (limitCountName = '', itemName = 'items', code = -1) => {
  // Track the events for rate limiting
  const userEventCounts = new Map();
  return (socket, fn, isUnknown = false) => {
    /** @type {number} */
    const limitCount = getIniConfig(limitCountName) || 5;

    // Is a user
    const userId = !isUnknown
      ? userSession.getUserId(socket)
      : socket.handshake
        ? socket.handshake.address
        : '?.?.?.?';
    if (!userId) return false;

    // Rate limiting logic
    const currentTime = Date.now();
    /** @type {number} */
    const userTimestamp = userMessageTimestamps.get(userId) || 0;
    /** @type {number} */
    const userMessageCount = userEventCounts.get(userId) || 0;

    // Check if rate limit is exceeded based on RATE_LIMIT_TIME
    if (
      currentTime - userTimestamp < getIniConfig('RATE_LIMIT_TIME') &&
      userMessageCount >= limitCount
    ) {
      const rateLimitTime = getIniConfig('RATE_LIMIT_TIME') / 1000;
      fn({
        error: true,
        ratelimit: true,
        msg: `Rate limit exceeded. You can send a maximum of ${limitCount} ${itemName} in ${rateLimitTime} seconds.`,
        code,
        numbers: [limitCount, rateLimitTime],
      });
      return true;
    }

    // Update message count and timestamp
    if (currentTime - userTimestamp > getIniConfig('RATE_LIMIT_TIME')) {
      // Reset the message count if the rate limit window has passed
      userEventCounts.set(userId, 1); // Start new count for a new window
    } else {
      // Increment message count for messages within the window
      userEventCounts.set(userId, userMessageCount + 1);
    }

    // Reset the timestamp for the rate limiting window if within the limit
    userMessageTimestamps.set(userId, currentTime);

    // Free user!
    return false;
  };
};

export const userIsRateLimited = createRateLimit('EVENT', 'events', 1);
export const roomUpdateIsRateLimited = createRateLimit('ROOM_UPDATES', 'room updates', 1);
export const userMsgLoadIsRateLimited = createRateLimit('MESSAGES_LOAD', 'message loads', 4);
export const userMsgDeleteIsRateLimited = createRateLimit('MESSAGES_DELETE', 'message deletes', 5);
export const userMsgEditIsRateLimited = createRateLimit('MESSAGES_EDIT', 'message edits', 6);
export const userMsgIsRateLimited = createRateLimit('MESSAGES', 'messages', 2);
export const userDiceIsRateLimited = createRateLimit('DICE_ROLLS', 'dice rolls', 3);
export const userUpdateDiceIsRateLimited = createRateLimit('DICE_ROLLS', 'dice changes', 3);

// Incomplete data
export const sendIncompleteDataInfo = (fn, code = 0) => {
  fn({
    error: true,
    msg: `Your data does not respect the requirements for this request. Your request has been cancelled.`,
    code,
  });
};

// Incomplete data
export const noDataInfo = (data, fn, code = 0) => {
  if (!isJsonObject(data)) {
    fn({
      error: true,
      msg: `Your data does not respect the requirements for this request. Your request has been cancelled.`,
      code,
    });
    return true;
  }
  return false;
};

export const accountNotDetected = (fn, code = 0) => {
  fn({
    error: true,
    noAccount: true,
    msg: `No account has been detected to complete this request. Your request has been cancelled.`,
    code,
  });
};

export const roomNotDetected = (fn, code = 0) => {
  fn({
    error: true,
    msg: `Room hasn't been detected.`,
    code,
  });
};

export const ownerOnly = (fn, code = 0) => {
  fn({
    error: true,
    msg: `Only the owner is allowed to perform this action.`,
    code,
  });
};

// Join Room
export const getJoinData = (socket) => {
  const nickname = userSession.getNickname(socket);
  const pingNow = Date.now();
  return { nickname, ping: pingNow };
};

export const joinRoom = (socket, io, roomId, fn) => {
  if (socket) {
    // Get data
    const userId = userSession.getUserId(socket);
    if (userId && roomId) {
      // Add user to the room's user map with their nickname and initial ping value (e.g., 0 for now)
      const joinData = getJoinData(socket);
      if (!roomUsers.has(roomId)) {
        roomUsers.set(roomId, new Map());
      }
      roomUsers.get(roomId).set(userId, joinData);

      // Notify room members about the new user (excluding the user who just joined)
      socket.join(roomId);

      userSession.addRoom(socket, roomId);
      const socketData = { roomId, userId, nickname: joinData.nickname, ping: joinData.ping };
      io.to(roomId).emit('user-joined', socketData);
      if (fn) fn(socketData);
      return true;
    }
  }
  if (fn) fn({ error: true, msg: 'Invalid data!' });
  return false;
};

// Leave room
export const leaveRoom = (socket, io, roomId, fn) => {
  if (socket) {
    // Get data
    const userId = userSession.getUserId(socket);
    const nickname = userSession.getNickname(socket);
    if (userId && roomId) {
      // Get room
      const room = roomUsers.get(roomId);
      // Room not found
      if (!room) return { success: false, code: 1 };

      // Disconnect user from room
      if (room.has(userId)) {
        // Remove the user from their room
        room.delete(userId);
        io.to(roomId).emit('user-left', { roomId, nickname, userId });
        socket.leave(roomId);
        userSession.removeRoom(socket, roomId);
        // Complete
        if (fn) fn({ success: true });
        return { success: true };
      }
      // User not found
      if (fn) fn({ success: false, code: 2, msg: 'User not found.' });
      return { success: false, code: 2 };
    }
    // Invalid data
    else if (!roomId) {
      if (fn) fn({ success: false, code: 3, msg: 'Invalid data.' });
      return { success: false, code: 3 };
    }
  }
  // No data
  else {
    if (fn) fn({ success: false, code: 0, msg: 'No data.' });
    return { success: false, code: 0 };
  }
};
