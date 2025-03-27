import { Server } from 'socket.io';
import crypto from 'crypto';

import { objType } from './lib/objChecker';
import TimedMap from './TimedMap';
import startFiles from './appStorage';

// Define a fixed port chosen by the user
const PORT = 35421;

// Socket IO
const io = new Server({
  cors: { origin: '*' },
});

const serverOwnerId = 'owner123'; // Server owner ID
const userSockets = new Map(); // Socket users

// Rate limit settings
const EVENT_LIMIT = 5; // Max events
const MESSAGES_LIMIT = 5; // Max messages
const RATE_LIMIT_TIME = 10 * 1000; // 10 seconds
const MAX_USERS_PER_ROOM = 50; // Max users per room

const MESSAGE_SIZE_LIMIT = 200; // Max message size
const USER_ID_SIZE_LIMIT = 100; // Max user id size
const PASSWORD_SIZE_LIMIT = 200; // Max password size
const NICKNAME_SIZE_LIMIT = 100; // Max user id size

// Database
const users = new TimedMap(); // Stores user credentials
const moderators = new TimedMap(); // Stores the list of server moderators
const bannedUsers = new TimedMap(); // Stores the list of banned users

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
  console.log(
    `[APP] [${socket.handshake ? socket.handshake.address : '?.?.?.?'}] User connected: ${socket.id}`,
  );

  socket.on('ban', (data) => {
    const { userId, reason } = data;
    // Validate values
    if (typeof userId !== 'string' || typeof reason !== 'string') return;

    // Get user
    const yourId = userSession.getUserId(socket);
    if (!yourId) return; // Only logged-in users can use it
    if (userIsRateLimited(socket)) return;

    // Check if user is server owner or server mod
    if (yourId !== serverOwnerId && !moderators.has(yourId)) {
      socket.emit('ban-failed', { msg: 'You are not allowed to do this.', banned: true, code: 1 });
      return;
    }

    // Check if user exists
    if (!users.has(userId)) {
      socket.emit('ban-failed', { msg: 'User not found.', banned: true, code: 2 });
      return;
    }

    // Disconnect user
    if (userSockets.has(userId)) userSockets.get(userId).disconnect();

    // Add into the ban list
    bannedUsers.set(userId, { date: Date.now(), reason });

    // User ban successfully.
    socket.emit('ban-status', { userId, reason, banned: true });
  });

  socket.on('unban', (data) => {
    const { userId } = data;
    // Validate values
    if (typeof userId !== 'string') return;

    // Get user
    const yourId = userSession.getUserId(socket);
    if (!yourId) return; // Only logged-in users can use it
    if (userIsRateLimited(socket)) return;

    // Check if user is server owner or server mod
    if (yourId !== serverOwnerId && !moderators.has(yourId)) {
      socket.emit('ban-failed', { msg: 'You are not allowed to do this.', banned: true, code: 1 });
      return;
    }

    // Check if user exists
    if (!users.has(userId)) {
      socket.emit('ban-failed', { msg: 'User not found.', banned: false, code: 2 });
      return;
    }

    // Remove user from the ban list
    bannedUsers.delete(userId);

    // User ban successfully.
    socket.emit('ban-status', { userId, banned: false });
  });

  socket.on('kick', (data) => {
    const { userId } = data;
    // Validate values
    if (typeof userId !== 'string') return;

    // Get user
    const yourId = userSession.getUserId(socket);
    if (!yourId) return; // Only logged-in users can use it
    if (userIsRateLimited(socket)) return;

    // Check if user is server owner or server mod
    if (yourId !== serverOwnerId && !moderators.has(yourId)) {
      socket.emit('kick-failed', { msg: 'You are not allowed to do this.', code: 1 });
      return;
    }

    // Disconnect user
    if (userSockets.has(userId)) userSockets.get(userId).disconnect();
    else {
      socket.emit('kick-failed', { msg: 'User not found.', code: 2 });
      return;
    }

    // User kick successfully.
    socket.emit('kick-status', { userId });
  });

  socket.on('banFromRoom', (data) => {
    const { userId, roomId } = data;
    // Validate values
    if (typeof userId !== 'string' || typeof roomId !== 'string') return;

    // Get user
    const yourId = userSession.getUserId(socket);
    if (!yourId) return; // Only logged-in users can use it
    if (userIsRateLimited(socket)) return;

    // Check if the room exists
    const rUsers = roomUsers.get(roomId);
    const room = rooms.get(roomId);
    if (!rUsers || !room) {
      socket.emit('room-ban-failed', {
        msg: 'Room not found.',
        banned: true,
        userId,
        roomId,
        code: 1,
      });
      return;
    }

    // Check if user is server owner or server mod
    if (
      yourId !== serverOwnerId &&
      !moderators.has(yourId) &&
      room.ownerId !== yourId &&
      !room.moderators.has(yourId)
    ) {
      socket.emit('room-ban-failed', {
        msg: 'You are not allowed to do this.',
        roomId,
        userId,
        banned: true,
        code: 2,
      });
      return;
    }

    // Check if user exists
    if (!users.has(userId)) {
      //
      socket.emit('room-ban-failed', {
        msg: 'User not found.',
        banned: true,
        userId,
        roomId,
        code: 3,
      });
      return;
    }

    // Check if user is connected
    const userSocket = userSockets.get(userId);

    // Add into the ban list
    room.banned.add(userId);
    room.set(roomId, room);

    // Remove the user from their room
    if (rUsers.has(userId)) {
      rUsers.delete(userId);
      io.to(roomId).emit('user-left', { roomId, userId });
      io.to(roomId).emit('user-banned', { roomId, userId });
      if (userSocket) userSocket.leave(roomId);
    }

    // User ban successfully.
    socket.emit('room-ban-status', { roomId, userId, banned: true });
  });

  socket.on('unbanFromRoom', (data) => {
    const { userId, roomId } = data;
    // Validate values
    if (typeof userId !== 'string' || typeof roomId !== 'string') return;

    // Get user
    const yourId = userSession.getUserId(socket);
    if (!yourId) return; // Only logged-in users can use it
    if (userIsRateLimited(socket)) return;

    // Check if the room exists
    const room = rooms.get(roomId);
    if (!room) {
      //
      socket.emit('room-ban-failed', {
        msg: 'Room not found.',
        banned: false,
        userId,
        roomId,
        code: 1,
      });
      return;
    }

    // Check if user is server owner or server mod
    if (
      yourId !== serverOwnerId &&
      !moderators.has(yourId) &&
      room.ownerId !== yourId &&
      !room.moderators.has(yourId)
    ) {
      socket.emit('room-ban-failed', {
        msg: 'You are not allowed to do this.',
        banned: false,
        userId,
        roomId,
        code: 2,
      });
      return;
    }

    // Check if user exists
    if (!users.has(userId)) {
      socket.emit('ban-failed', { msg: 'User not found.', roomId, userId, banned: false, code: 3 });
      return;
    }

    // Remove user from the ban list
    room.banned.delete(userId);
    room.set(roomId, room);

    // User ban successfully.
    socket.emit('room-ban-status', { roomId, userId, banned: false });
  });

  socket.on('kickFromRoom', (data) => {
    const { userId, roomId } = data;
    // Validate values
    if (typeof userId !== 'string' || typeof roomId !== 'string') return;

    // Get user
    const yourId = userSession.getUserId(socket);
    if (!yourId) return; // Only logged-in users can use it
    if (userIsRateLimited(socket)) return;

    // Check if the room exists
    const room = roomUsers.get(roomId);
    if (!room) {
      socket.emit('room-kick-failed', { msg: 'Room not found.', userId, roomId, code: 1 });
      return;
    }

    // Check if user is server owner or server mod
    if (
      yourId !== serverOwnerId &&
      !moderators.has(yourId) &&
      room.ownerId !== yourId &&
      !room.moderators.has(yourId)
    ) {
      socket.emit('room-kick-failed', {
        msg: 'You are not allowed to do this.',
        userId,
        roomId,
        code: 2,
      });
      return;
    }

    // Check if user is connected
    const userSocket = userSockets.get(userId);
    if (!userSocket) {
      socket.emit('room-kick-failed', { msg: 'User not found.', userId, roomId, code: 3 });
      return;
    }

    // Remove the user from their room
    if (room.has(userId)) {
      room.delete(userId);
      io.to(roomId).emit('user-left', { roomId, userId });
      io.to(roomId).emit('user-kicked', { roomId, userId });
      userSocket.leave(roomId);
    } else socket.emit('room-kick-failed', { msg: 'User is not in the room.', roomId, code: 2 });

    // User kick successfully.
    socket.emit('room-kick-status', { roomId, userId });
  });

  socket.on('disableRoom', (data) => {
    const { roomId } = data;
    // Validate values
    if (typeof roomId !== 'string') return;

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return; // Only logged-in users can use it
    if (userIsRateLimited(socket)) return;

    // Check if the room exists
    const rUsers = roomUsers.get(roomId);
    const room = rooms.get(roomId);
    if (!rUsers || !room) {
      socket.emit('room-ban-failed', {
        msg: 'Room not found.',
        disabled: true,
        roomId,
        code: 1,
      });
      return;
    }

    // Check if user is server owner or server mod
    if (
      userId !== serverOwnerId &&
      !moderators.has(userId) &&
      room.ownerId !== userId &&
      !room.moderators.has(userId)
    ) {
      socket.emit('room-ban-failed', {
        msg: 'You are not allowed to do this.',
        roomId,
        disabled: true,
        code: 2,
      });
      return;
    }

    // Change room status
    room.disabled = true;
    room.set(roomId, room);

    // Disconnect user from rooms
    roomUsers.forEach((users, roomId) => {
      roomUsers.forEach((userData, tUser) => {
        // Remove the user from their room
        users.delete(tUser);
        socket.leave(roomId);
        io.to(roomId).emit('user-left', { roomId, userId: tUser });
      });
    });

    // User ban successfully.
    socket.emit('room-disable-status', { roomId, disabled: true });
  });

  socket.on('enableRoom', (data) => {
    const { roomId } = data;
    // Validate values
    if (typeof roomId !== 'string') return;

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return; // Only logged-in users can use it
    if (userIsRateLimited(socket)) return;

    // Check if the room exists
    const room = rooms.get(roomId);
    if (!room) {
      //
      socket.emit('room-ban-failed', {
        msg: 'Room not found.',
        banned: false,
        roomId,
        code: 1,
      });
      return;
    }

    // Check if user is server owner or server mod
    if (
      userId !== serverOwnerId &&
      !moderators.has(userId) &&
      room.ownerId !== userId &&
      !room.moderators.has(userId)
    ) {
      socket.emit('room-ban-failed', {
        msg: 'You are not allowed to do this.',
        banned: false,
        roomId,
        code: 2,
      });
      return;
    }

    // Enable room back
    room.disabled = false;
    room.set(roomId, room);

    // User ban successfully.
    socket.emit('room-disable-status', { roomId, disabled: false });
  });

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
    socket.emit('register-status', { userId, password, nickname });
  });

  socket.on('login', (data) => {
    const { userId, password } = data;
    // Validate values
    if (typeof userId !== 'string' || typeof password !== 'string') return;

    // Check if user is using account
    if (bannedUsers.has(userId)) {
      const banData = bannedUsers.get(userId);
      socket.emit('login-failed', {
        reason: banData.reason,
        date: banData.date,
        msg: "You're banned!",
        code: 5,
      });
      return;
    }

    if (userSession.getUserId(socket)) {
      socket.emit('login-failed', { msg: "You're already logged in!", code: 4 });
      return;
    }

    if (userSockets.has(userId)) {
      socket.emit('login-failed', { msg: 'The account is already in use.', code: 3 });
      return;
    }

    // Validate user credentials
    if (!users.has(userId)) {
      socket.emit('login-failed', { msg: 'User does not exist.', code: 2 });
      return;
    }

    const user = users.get(userId);
    const hashedPassword = getHashString(password);
    if (user.password !== hashedPassword) {
      socket.emit('login-failed', { msg: 'Invalid user credentials.', code: 1 });
      return;
    }

    // Get the user's nickname from the users map
    const nickname = user.nickname;

    // Set session data
    userSession.check(socket);
    userSession.setUserId(socket, userId);
    userSession.setNickname(socket, nickname);

    // Add user into userSockets
    userSockets.set(userId, socket);

    // Success!
    console.log(
      `[APP] [${socket.handshake ? socket.handshake.address : '?.?.?.?'}] User ${userId} logged in: ${socket.id}`,
    );
    socket.emit('login-success', { userId, nickname });
  });

  socket.on('join', (data) => {
    const { roomId, password } = data;
    // Validate values
    if (typeof roomId !== 'string' || password !== 'string') return;

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return;
    if (userIsRateLimited(socket)) return;

    // Check if the room exists
    const room = rooms.get(roomId);
    if (!room) {
      //
      socket.emit('join-failed', { msg: 'Room not found.', roomId, code: 1 });
      return;
    }

    // Check if the room has a password and validate it
    if (room.password && room.password !== password) {
      //
      socket.emit('join-failed', { msg: 'Incorrect room password.', roomId, code: 2 });
      return;
    }

    // Check if the room is full
    if (room.users.size >= room.maxUsers) {
      socket.emit('join-failed', { msg: 'Room is full.', roomId, code: 3 });
      return;
    }

    // Check if the user is banned
    if (room.banned.has(userId)) {
      socket.emit('join-failed', { msg: "You're is banned.", roomId, code: 4 });
      return;
    }

    // Add user to the room
    room.users.add(userId);

    // Send chat history and settings only to the joined user
    let history = roomHistories.get(roomId);
    if (!history) {
      history = new TimedMap();
      roomHistories.set(history);
    }

    // Emit chat history and settings to the user
    socket.emit('room-users', mapToArray(roomUsers.get(roomId)));
    socket.emit('room-history', mapToArray(history));
    socket.emit('update-settings', room);
    socket.emit('update-settings', room);
    sendRateLimit(socket);

    // Add user to the room's user map with their nickname and initial ping value (e.g., 0 for now)
    const pingNow = Date.now();
    if (!roomUsers.has(roomId)) {
      roomUsers.set(roomId, new Map());
    }
    roomUsers.get(roomId).set(userId, { nickname, ping: pingNow });

    // Notify room members about the new user (excluding the user who just joined)
    socket.join(roomId);
    io.to(roomId).emit('user-joined', { roomId, userId, nickname, ping: pingNow });
  });

  socket.on('leave', (data) => {
    const { roomId } = data;
    // Validate values
    if (typeof roomId !== 'string') return;

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return;

    // Disconnect user from room
    const room = roomUsers.get(roomId);
    if (!room) {
      socket.emit('leave-failed', { msg: 'No Room users.', roomId, code: 1 });
      return;
    }

    if (room.has(userId)) {
      // Remove the user from their room
      room.delete(userId);
      io.to(roomId).emit('user-left', { roomId, userId });
      socket.leave(roomId);
    } else socket.emit('leave-failed', { msg: "You're not in the room.", roomId, code: 2 });
  });

  socket.on('send-message', (data) => {
    const { message, roomId } = data;
    // Validate values
    if (typeof message !== 'string' || message.trim() === '' || typeof roomId !== 'string') return;

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return;
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

    const msgDate = Date.now();
    history.set(msgIndex, { userId, text: message, date: msgDate, edited: 0 });

    // Emit to the room that the user joined (based on roomId)
    io.to(roomId).emit('new-message', {
      roomId,
      id: msgIndex,
      userId,
      text: message,
      date: msgDate,
      edited: 0,
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
        !room.moderators.has(userId))
    )
      return;

    // Edit message
    const msgDate = Date.now();
    msg.text = newText;
    msg.edited = msgDate;
    history.set(messageId, msg);

    // Emit the event only to logged-in users in the room
    io.to(roomId).emit('update-message', { roomId, id: messageId, text: newText, edited: msgDate });
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
        !room.moderators.has(userId))
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

    // Allowed updates
    const allowedUpdates = {};

    if ('password' in newSettings) {
      if (typeof newSettings.password === 'string') allowedUpdates.password = newSettings.password;
    }

    if ('maxUsers' in newSettings) {
      if (
        typeof newSettings.maxUsers === 'number' &&
        !Number.isNaN(newSettings.maxUsers) &&
        Number.isFinite(newSettings.maxUsers)
      ) {
        allowedUpdates.maxUsers = newSettings.maxUsers;
        if (allowedUpdates.maxUsers > MAX_USERS_PER_ROOM)
          allowedUpdates.maxUsers = MAX_USERS_PER_ROOM;
        else if (allowedUpdates.maxUsers < 1) allowedUpdates.maxUsers = 1;
      }
    }

    if ('moderators' in newSettings) {
      if (Array.isArray(newSettings.moderators)) {
        let canExecute = true;
        for (const index in newSettings.moderators) {
          if (typeof newSettings.moderators[index] !== 'string') {
            canExecute = false;
            break;
          }
        }
        if (canExecute) allowedUpdates.moderators = new Set(newSettings.moderators);
      }
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

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return; // Only logged-in users can update settings
    if (userIsRateLimited(socket)) return;

    // Get room
    const room = rooms.get(roomId);
    if (!room) return;

    // Check if the user is the owner of the room or the server owner
    if (userId !== room.ownerId && userId !== serverOwnerId) {
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

  socket.on('roll-dice', (data) => {
    // Validate input data
    const { sameSides, dice, roomId } = data;
    if (!Array.isArray(dice) || dice.length === 0 || typeof roomId !== 'string') {
      io.to(roomId).emit('roll-result', { error: 'Invalid parameters' });
    }

    // Prepare results
    const results = [];
    let total = 0;
    const rollDice = (sides) => {
      const roll = Math.floor(Math.random() * sides) + 1;
      results.push({ sides, roll });
      total += roll;
    };

    // Check if all dice should have the same number of sides
    if (sameSides) {
      const sides = dice[0];
      if (typeof sides !== 'number' || sides < 2) {
        return io.to(roomId).emit('roll-result', { error: 'Invalid dice configuration' });
      }
      // Roll all dice with the same number of sides
      for (let i = 0; i < dice.length; i++) rollDice(sides);
      return io.to(roomId).emit('roll-result', { results, total });
    } else {
      // Roll dice with different number of sides
      // Iterate over each die and roll with its respective number of sides
      for (const sides of dice) {
        if (typeof sides !== 'number' || sides < 2) {
          return io.to(roomId).emit('roll-result', { error: 'Invalid dice configuration' });
        }
        rollDice(sides);
      }
      return io.to(roomId).emit('roll-result', { results, total, sides: sidesList });
    }
  });

  socket.on('disconnect', () => {
    // Get user
    const userId = userSession.getUserId(socket);
    const ipAddress = socket.handshake ? socket.handshake.address : '?.?.?.?';

    // Bye
    console.log(
      `[APP] [${ipAddress}] ${userId ? `User ${userId}` : 'Unknown user'} disconnected: ${socket.id}`,
    );

    // Disconnect user from rooms
    if (userId)
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
