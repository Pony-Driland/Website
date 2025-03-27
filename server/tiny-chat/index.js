import { Server } from 'socket.io';
import crypto from 'crypto';
import { objType } from 'for-promise/utils/lib.mjs';

import TimedMap from './TimedMap';
import startFiles from './appStorage';

// Define a fixed port chosen by the user
const PORT = 35421;

// Socket IO
const io = new Server({
  cors: { origin: '*' },
});

const userSockets = new Map(); // Socket users

// Ids
const serverOwnerId = 'owner123'; // Room owner ID
const moderators = new Set(['mod1', 'mod2']); // List of moderators

// Rate limit settings
const EVENT_LIMIT = 5; // Max events
const MESSAGES_LIMIT = 5; // Max messages
const RATE_LIMIT_TIME = 10 * 1000; // 10 seconds
const MESSAGE_SIZE_LIMIT = 200; // Max message size

const USER_ID_SIZE_LIMIT = 100; // Max user id size
const PASSWORD_SIZE_LIMIT = 200; // Max password size
const NICKNAME_SIZE_LIMIT = 100; // Max user id size

// Database
const users = new TimedMap(); // Stores user credentials
const rooms = new TimedMap(); // Stores room configurations, including password, etc.
const roomHistories = new Map(); // Stores room histories

const privateRoomData = new TimedMap(); // Stores room private data
const roomData = new TimedMap(); // Stores room data

// Track the users in rooms
const roomUsers = new Map(); // Stores room users

// Track the timestamps for rate limiting
const userMessageTimestamps = new Map();

// Hashed String
const getHashString = (text) => crypto.createHash('sha256').update(text).digest('hex');

// Map to Array
function mapToArray(map) {
  return map.size > 0 ? Array.from(map) : [];
}

/**
 * Creates a new user account.
 * @param {string} userId - The user's unique ID.
 * @param {string} password - The user's password.
 * @param {string} nickname - The user's chosen nickname.
 */
const createAccount = (userId, password, nickname) => {
  const hashedPassword = getHashString(password.substring(0, PASSWORD_SIZE_LIMIT));
  users.set(userId.substring(0, USER_ID_SIZE_LIMIT), {
    password: hashedPassword,
    nickname: nickname.substring(0, NICKNAME_SIZE_LIMIT),
  });
};

const userSession = {
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

const sendRateLimit = (socket) => {
  socket.emit('update-ratelimts', {
    userId: USER_ID_SIZE_LIMIT,
    password: PASSWORD_SIZE_LIMIT,
    nickname: NICKNAME_SIZE_LIMIT,
  });
};

// Rate limit editor
const createRateLimit = (limitCount = 5, itemName = 'items', code = -1) => {
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

const userIsRateLimited = createRateLimit(EVENT_LIMIT, 'events', 1);
const userMsgIsRateLimited = createRateLimit(MESSAGES_LIMIT, 'messages', 2);

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('register', (data) => {
    const { userId, password, nickname } = data;
    // Validate values
    if (typeof userId !== 'string' || typeof password !== 'string' || typeof nickname !== 'string')
      return;

    // Check User
    if (userIsRateLimited(socket)) return;

    if (userSession.getUserId(socket) !== serverOwnerId) {
      // Only the owner can create accounts.
      socket.emit('register-status', 2);
      return;
    }

    if (users.has(userId)) {
      // User ID already exists.
      socket.emit('register-status', 1);
      return;
    }

    // Create Account
    createAccount(userId, password, nickname);

    // User registered successfully.
    socket.emit('register-status', 0);
  });

  socket.on('join', (data) => {
    const { userId, password, roomId, roomPassword } = data;
    // Validate values
    if (
      typeof userId !== 'string' ||
      typeof password !== 'string' ||
      typeof roomId !== 'string' ||
      roomPassword !== 'string'
    )
      return;

    // Check if user is using account
    if (userSockets.get(userId)) return;

    // Check if the room exists
    const room = rooms.get(roomId);
    if (!room) {
      // Room not found.
      socket.emit('join-failed', { roomId, code: 0 });
      return;
    }

    // Validate user credentials
    const hashedPassword = getHashString(password);
    if (!users.has(userId) || users.get(userId).password !== hashedPassword) {
      // Invalid user credentials.
      socket.emit('join-failed', { roomId, code: 1 });
      return;
    }

    // Get the user's nickname from the users map
    const nickname = users.get(userId).nickname;

    // Check if the room has a password and validate it
    if (room.password && room.password !== roomPassword) {
      // Incorrect room password.
      socket.emit('join-failed', { roomId, code: 2 });
      return;
    }

    // Check if the room is full
    if (room.users.size >= room.maxUsers) {
      // Room is full.
      socket.emit('join-failed', { roomId, code: 3 });
      return;
    }

    // Set session data
    userSession.check(socket);
    userSession.setUserId(socket, userId);
    userSession.setNickname(socket, nickname);

    // Add user to the room
    room.users.add(userId);

    // Add user to the room's user map with their nickname and initial ping value (e.g., 0 for now)
    if (!roomUsers.has(roomId)) {
      roomUsers.set(roomId, new Map());
    }
    roomUsers.get(roomId).set(userId, { nickname, ping: Date.now() });

    socket.join(roomId);
    console.log(`${userId} joined the room: ${roomId}`);

    // Send chat history and settings only to the joined user
    let history = roomHistories.get(roomId);
    if (!history) {
      history = new TimedMap();
      roomHistories.set(history);
    }

    // Emit chat history and settings to the user
    socket.emit('chat-history', mapToArray(history));
    socket.emit('update-settings', room);
    sendRateLimit(socket);

    // Add user into userSockets
    userSockets.set(userId, socket);

    // Notify room members about the new user (excluding the user who just joined)
    io.to(roomId).emit('user-joined', { roomId, userId, nickname });
  });

  socket.on('send-message', (data) => {
    const { message, roomId } = data;
    // Validate values
    if (typeof message !== 'string' || message.trim() === '' || typeof roomId !== 'string') return;

    // Get user
    const userId = userSession.getUserId(socket);
    if (userMsgIsRateLimited(socket)) return;

    // Check text size
    if (message.length > MESSAGE_SIZE_LIMIT) {
      // The text reached the limit size
      socket.emit('error-message', {
        roomId,
        text: message,
        msg: `The text reached the limit size of ${MESSAGE_SIZE_LIMIT}.`,
        code: 1,
        numbers: [MESSAGE_SIZE_LIMIT],
      });
      return;
    }

    // Check if the room exist
    const room = rooms.get(roomId);
    if (!room) return;

    // Update the last index of the room
    const msgIndex = ++room.last_index;
    room.set(roomId, room);

    // Emit to the room that the history index is updated
    io.to(roomId).emit('history-index-updated', {
      index: msgIndex,
      roomId,
    });

    // Get the room history
    const history = roomHistories.get(roomId);
    if (!history) return;

    history.set(msgIndex, { userId, text: message });

    // Emit to the room that the user joined (based on roomId)
    io.to(roomId).emit('new-message', {
      roomId,
      id: msgIndex,
      userId,
      text: message,
    });
  });

  socket.on('edit-message', (data) => {
    const { roomId, messageId, newText } = data;
    // Validate values
    if (typeof newText !== 'string' || typeof roomId !== 'string' || messageId !== 'string') return;

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return; // Only logged-in users can edit
    if (userMsgIsRateLimited(socket)) return;

    // Get room
    const room = rooms.get(roomId);
    if (!room) return;

    // Get history
    const history = roomHistories.get(roomId);
    if (!history) return;

    // Check text size
    if (newText.length > MESSAGE_SIZE_LIMIT) {
      // The text reached the limit size
      socket.emit('error-message', {
        roomId,
        text: newText,
        msg: `The text reached the limit size of ${MESSAGE_SIZE_LIMIT}.`,
        code: 1,
        numbers: [MESSAGE_SIZE_LIMIT],
      });
      return;
    }

    // Get message
    const msg = history.get(messageId);
    if (
      !msg ||
      (msg.userId !== userId &&
        userId !== serverOwnerId &&
        !moderators.has(userId) &&
        room.ownerId !== userId &&
        !room.roomModerators.has(userId))
    )
      return;

    // Edit message
    msg.text = newText;
    history.set(messageId, msg);

    // Emit the event only to logged-in users in the room
    io.to(roomId).emit('update-message', { roomId, id: messageId, text: newText });
  });

  socket.on('delete-message', (data) => {
    const { roomId, messageId } = data;
    // Validate values
    if (typeof roomId !== 'string' || typeof messageId !== 'string') return;

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return; // Only logged-in users can delete
    if (userMsgIsRateLimited(socket)) return;

    // Get room
    const room = rooms.get(roomId);
    if (!room) return;

    // Get history
    const history = roomHistories.get(roomId);
    if (!history) return;

    // Get message
    const msg = history.get(messageId);
    if (
      !msg ||
      (msg.userId !== userId &&
        userId !== serverOwnerId &&
        !moderators.has(userId) &&
        room.ownerId !== userId &&
        !room.roomModerators.has(userId))
    )
      return;

    // Delete message
    history.delete(messageId);

    // Emit the event only to logged-in users in the room
    io.to(roomId).emit('delete-message', { roomId, id: messageId });
  });

  socket.on('update-settings', (data) => {
    const { roomId, newSettings } = data;
    // Validate values
    if (typeof roomId !== 'string' || !objType(newSettings, 'object')) return;

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return; // Only logged-in users can update settings
    if (userIsRateLimited(socket)) return;

    // Get room
    const room = rooms.get(roomId);
    if (!room) return; // Room does not exist

    // Check if the user is the room owner or the server owner
    const isRoomOwner = userId === room.ownerId;
    const isServerOwner = userId === serverOwnerId; // 'serverOwnerId' refers to the server owner

    if (!isRoomOwner && !isServerOwner) return; // Only room owner or server owner can update settings

    // Allowed updates (only password and roomModerators)
    const allowedUpdates = {};

    if ('password' in newSettings) {
      allowedUpdates.password = newSettings.password;
    }

    if ('roomModerators' in newSettings) {
      allowedUpdates.roomModerators = new Set(newSettings.roomModerators);
    }

    // Apply updates if there are valid changes
    if (Object.keys(allowedUpdates).length > 0) {
      rooms.set(roomId, Object.assign(room, allowedUpdates));

      // Notify all users in the room about the updated settings
      io.to(roomId).emit('update-settings', { room, roomId });
    }
  });

  socket.on('update-room-data', (data) => {
    const { roomId, isPrivate, values } = data;
    // Validate values
    if (typeof roomId !== 'string' || !objType(values, 'object') || typeof isPrivate !== 'boolean')
      return;

    // Check user
    if (userIsRateLimited(socket)) return;

    // Get room
    const room = rooms.get(roomId);
    if (!room) return;

    // Check if the user is the owner of the room or the server owner
    if (socket.userId !== room.ownerId && socket.userId !== serverOwnerId) {
      socket.emit('error-message', {
        roomId,
        text: message,
        isPrivate,
        msg: `You do not have permission to update this room${isPrivate ? ' private' : ''} data.`,
        code: 2,
      });
      return;
    }

    // Update the room data
    if (isPrivate) {
      if (!privateRoomData.has(roomId)) {
        privateRoomData.set(roomId, {});
      }
      Object.assign(privateRoomData.get(roomId), values);
      socket.emit('private-room-data-updated', { roomId, values: privateRoomData.get(roomId) });
    }
    // Nope
    else {
      roomData.set(roomId, Object.assign(roomData.get(roomId), values));
      // Notify all users in the room about the updated data
      io.to(roomId).emit('room-data-updated', { roomId, values: roomData.get(roomId) });
    }
  });

  socket.on('disconnect', () => {
    // Get user
    const userId = userSession.getUserId(socket);

    // Bye
    console.log(`[APP] ${userId} disconnected.`);

    // Disconnect user from rooms
    roomUsers.forEach((users, roomId) => {
      if (users.has(userId)) {
        // Remove the user from their room
        users.delete(userId);
        socket.leave(roomId);
        io.to(roomId).emit('user-left', { roomId, userId });
      }
    });

    // Remove from userSockets
    userSockets.delete(userId);
  });
});

// Start server
startFiles().then((appStorage) => {
  io.listen(PORT);
  console.log(`[APP] Server running on port ${PORT}`);
});
