import { objType } from '../lib/objChecker';
import TimedMap from '../TimedMap';

import {
  userIsRateLimited,
  sendRateLimit,
  userSession,
  mapToArray,
  roomUsers,
  roomData,
  privateRoomData,
  roomHistories,
  rooms,
  moderators,
  users,
  userSockets,
  serverOwnerId,
  MAX_USERS_PER_ROOM,
} from './values';

export default function roomManager(socket, io) {
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
}
