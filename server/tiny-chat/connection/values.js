import crypto from 'crypto';
import TimedMap from '../TimedMap';

export const serverOwnerId = 'owner123'; // Server owner ID
export const userSockets = new Map(); // Socket users

// Rate limit settings
export const EVENT_LIMIT = 5; // Max events
export const MESSAGES_LIMIT = 5; // Max messages
export const RATE_LIMIT_TIME = 10 * 1000; // 10 seconds
export const MAX_USERS_PER_ROOM = 50; // Max users per room

export const MESSAGE_SIZE_LIMIT = 200; // Max message size
export const USER_ID_SIZE_LIMIT = 100; // Max user id size
export const PASSWORD_SIZE_LIMIT = 200; // Max password size
export const NICKNAME_SIZE_LIMIT = 100; // Max user id size

// Database
export const users = new TimedMap(); // Stores user credentials
export const moderators = new TimedMap(); // Stores the list of server moderators
export const bannedUsers = new TimedMap(); // Stores the list of banned users

export const rooms = new TimedMap(); // Stores room configurations, including password, etc.
export const roomHistories = new Map(); // Stores room histories

export const privateRoomData = new TimedMap(); // Stores room private data
export const roomData = new TimedMap(); // Stores room data

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
export const createAccount = (userId, password, nickname) => {
  const hashedPassword = getHashString(password.substring(0, PASSWORD_SIZE_LIMIT));
  users.set(userId.substring(0, USER_ID_SIZE_LIMIT), {
    password: hashedPassword,
    nickname: nickname.substring(0, NICKNAME_SIZE_LIMIT),
  });
};

export const userSession = {
  check: (socket) => {
    if (!socket.tinySession) socket.tinySession = {};
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

export const sendRateLimit = (socket) => {
  socket.emit('update-ratelimts', {
    size: {
      userId: USER_ID_SIZE_LIMIT,
      password: PASSWORD_SIZE_LIMIT,
      nickname: NICKNAME_SIZE_LIMIT,
      msg: MESSAGE_SIZE_LIMIT,
    },
    limit: {
      msg: MESSAGES_LIMIT,
      events: EVENT_LIMIT,
      roomUsers: MAX_USERS_PER_ROOM,
    },
    time: RATE_LIMIT_TIME,
  });
};

// Rate limit editor
export const createRateLimit = (limitCount = 5, itemName = 'items', code = -1) => {
  // Track the events for rate limiting
  const userEventCounts = new Map();
  return (socket) => {
    // Is a user
    const userId = userSession.getUserId(socket);
    if (!userId) return;

    // Rate limiting logic
    const currentTime = Date.now();
    const userTimestamp = userMessageTimestamps.get(userId) || 0;
    const userMessageCount = userEventCounts.get(userId) || 0;

    // Check if rate limit is exceeded based on EVENT_LIMIT
    if (currentTime - userTimestamp < RATE_LIMIT_TIME && userMessageCount >= limitCount) {
      const rateLimitTime = RATE_LIMIT_TIME / 1000;
      socket.emit('rate-limit', {
        roomId,
        msg: `Rate limit exceeded. You can send a maximum of ${limitCount} ${itemName} in ${rateLimitTime} seconds.`,
        code,
        numbers: [limitCount, rateLimitTime],
      });
      return true;
    }

    // Update message count and timestamp
    if (currentTime - userTimestamp > RATE_LIMIT_TIME) {
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

export const userIsRateLimited = createRateLimit(EVENT_LIMIT, 'events', 1);
export const userMsgIsRateLimited = createRateLimit(MESSAGES_LIMIT, 'messages', 2);
