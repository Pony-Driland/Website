import { Server } from 'socket.io';
import startFiles from './appStorage';

import messageManager from './connection/messageManager';
import userManager from './connection/userManager';
import roomManager from './connection/roomManager';

// Define a fixed port chosen by the user
const PORT = 35421;

// Socket IO
const io = new Server({
  cors: { origin: '*' },
});

io.on('connection', (socket) => {
  console.log(
    `[APP] [${socket.handshake ? socket.handshake.address : '?.?.?.?'}] User connected: ${socket.id}`,
  );
  messageManager(socket, io);
  userManager(socket, io);
  roomManager(socket, io);
});

// Start server
startFiles().then((appStorage) => {
  io.listen(PORT);
  console.log(`[APP] Server running on port ${PORT}`);
});
