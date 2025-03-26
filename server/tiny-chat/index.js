import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import crypto from 'crypto';

import TimedMap from './TimedMap';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

// Define a fixed port chosen by the user
const PORT = 35421;

const ownerId = 'owner123'; // Room owner ID
const moderators = new Set(['mod1', 'mod2']); // List of moderators
const messages = []; // Stores sent messages
const userSockets = new TimedMap();
const users = new TimedMap(); // Stores user credentials
const roomSettings = { topic: 'Default Topic', maxUsers: 50 }; // Room settings

// Track the message timestamps for rate limiting
const userMessageTimestamps = new TimedMap();
const userMessageCounts = new TimedMap();

// Rate limit settings
const MESSAGE_LIMIT = 5; // Max messages
const RATE_LIMIT_TIME = 10 * 1000; // 10 seconds

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('register', ({ userId, password }) => {
    if (socket.userId !== ownerId) {
      socket.emit('register-failed', 'Only the owner can create accounts.');
      return;
    }
    if (users.has(userId)) {
      socket.emit('register-failed', 'User ID already exists.');
      return;
    }
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    users.set(userId, hashedPassword);
    socket.emit('register-success', 'User registered successfully.');
  });

  socket.on('join', ({ userId, password }) => {
    if (userSockets.size >= roomSettings.maxUsers) {
      socket.emit('join-failed', 'Room is full.');
      return;
    }

    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    if (!users.has(userId) || users.get(userId) !== hashedPassword) {
      socket.emit('join-failed', 'Invalid credentials.');
      return;
    }

    socket.userId = userId;
    userSockets.set(userId, socket);
    console.log(`${userId} joined the chat.`);
    socket.emit('chat-history', messages);
    socket.emit('update-settings', roomSettings);
  });

  socket.on('send-message', (message) => {
    if (!message.text || message.text.trim() === '') return;

    // Rate limiting logic
    const currentTime = Date.now();
    const userTimestamp = userMessageTimestamps.get(socket.userId) || 0;
    const userMessageCount = userMessageCounts.get(socket.userId) || 0;

    // Check if rate limit is exceeded based on MESSAGE_LIMIT
    if (currentTime - userTimestamp < RATE_LIMIT_TIME && userMessageCount >= MESSAGE_LIMIT) {
      socket.emit(
        'rate-limit',
        `Rate limit exceeded. You can send a maximum of ${MESSAGE_LIMIT} messages in ${RATE_LIMIT_TIME / 1000} seconds.`,
      );
      return;
    }

    // Update message count and timestamp
    if (currentTime - userTimestamp > RATE_LIMIT_TIME) {
      // Reset the message count if the rate limit window has passed
      userMessageCounts.set(socket.userId, 1); // Start new count for a new window
    } else {
      // Increment message count for messages within the window
      userMessageCounts.set(socket.userId, userMessageCount + 1);
    }

    // Reset the timestamp for the rate limiting window if within the limit
    userMessageTimestamps.set(socket.userId, currentTime);

    const msg = { id: Date.now(), userId: socket.userId, text: message.text };
    messages.push(msg);
    io.emit('new-message', msg);
  });

  socket.on('edit-message', ({ messageId, newText }) => {
    const msg = messages.find((m) => m.id === messageId);
    if (
      !msg ||
      (msg.userId !== socket.userId && socket.userId !== ownerId && !moderators.has(socket.userId))
    )
      return;

    msg.text = newText;
    io.emit('update-message', msg);
  });

  socket.on('delete-message', (messageId) => {
    const index = messages.findIndex((m) => m.id === messageId);
    if (index === -1) return;
    const msg = messages[index];
    if (msg.userId !== socket.userId && socket.userId !== ownerId && !moderators.has(socket.userId))
      return;

    messages.splice(index, 1);
    io.emit('delete-message', messageId);
  });

  socket.on('custom-event', (eventData) => {
    if (socket.userId !== ownerId && !moderators.has(socket.userId)) return;
    io.emit('custom-event', eventData);
  });

  socket.on('update-settings', (newSettings) => {
    if (socket.userId !== ownerId && !moderators.has(socket.userId)) return;
    Object.assign(roomSettings, newSettings);
    io.emit('update-settings', roomSettings);
  });

  socket.on('disconnect', () => {
    console.log(`${socket.userId} disconnected.`);
    userSockets.delete(socket.userId);
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
