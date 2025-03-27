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
  createRoom,
  MAX_USERS_PER_ROOM,
  ROOM_TITLE_SIZE_LIMIT,
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

    // Check if the room is disabled
    if (room.disabled) {
      socket.emit('join-failed', { msg: 'Room is disabled.', roomId, code: 4 });
      return;
    }

    // Check if the user is banned
    if (room.banned.has(userId)) {
      socket.emit('join-failed', { msg: "You're banned.", roomId, code: 5 });
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
    socket.emit('update-room', room);
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

  socket.on('ban-from-room', (data) => {
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

  socket.on('unban-from-room', (data) => {
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

    // User unban successfully.
    socket.emit('room-ban-status', { roomId, userId, banned: false });
  });

  socket.on('kick-from-room', (data) => {
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

  socket.on('create-room', (data) => {
    const { roomId, password, title } = data;
    // Validate values
    if (typeof roomId !== 'string' || typeof password !== 'string' || typeof title !== 'string')
      return;

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return; // Only logged-in users can use it
    if (userIsRateLimited(socket)) return;

    // Check if the room exists
    let room = rooms.get(roomId);
    if (!room) {
      createRoom(userId, roomId, password, title);
      socket.emit('room-create-status', { userId, roomId, password, title });
    } else {
      socket.emit('room-create-failed', {
        msg: 'This room already exists.',
        roomId,
        code: 1,
      });
      return;
    }
  });

  socket.on('delete-room', (data) => {
    const { roomId } = data;
    // Validate values
    if (typeof roomId !== 'string') return;

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return; // Only logged-in users can use it
    if (userIsRateLimited(socket)) return;

    // Check if the room exists
    const room = rooms.get(roomId);
    const rUsers = roomUsers.get(roomId);
    if (!room) {
      socket.emit('room-delete-failed', {
        msg: 'Room not found.',
        roomId,
        code: 1,
      });
      return;
    }

    // Check if user is server owner or server mod
    if (userId !== serverOwnerId && !moderators.has(userId) && room.ownerId !== userId) {
      socket.emit('room-delete-failed', {
        msg: 'You are not allowed to do this.',
        roomId,
        code: 2,
      });
      return;
    }

    // Disconnect user from rooms
    if (rUsers) {
      rUsers.forEach((userData, tUser) => {
        // Remove the user from their room
        rUsers.delete(tUser);
        socket.leave(roomId);
        io.to(roomId).emit('user-left', { roomId, userId: tUser });
      });

      roomUsers.delete(roomId);
    }

    if (rooms.has(roomId)) rooms.delete(roomId);
    if (roomHistories.has(roomId)) roomHistories.delete(roomId);
    if (privateRoomData.has(roomId)) privateRoomData.delete(roomId);
    if (roomData.has(roomId)) roomData.delete(roomId);

    // Room delete successfully.
    socket.emit('room-delete-status', { roomId });
  });

  socket.on('disable-room', (data) => {
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
      socket.emit('room-disable-failed', {
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
      socket.emit('room-disable-failed', {
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
    rUsers.forEach((userData, tUser) => {
      // Remove the user from their room
      rUsers.delete(tUser);
      socket.leave(roomId);
      io.to(roomId).emit('user-left', { roomId, userId: tUser });
    });

    // Room disabled successfully.
    socket.emit('room-disable-status', { roomId, disabled: true });
  });

  socket.on('enable-room', (data) => {
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
      socket.emit('room-enable-failed', {
        msg: 'Room not found.',
        disabled: false,
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
      socket.emit('room-enable-failed', {
        msg: 'You are not allowed to do this.',
        disabled: false,
        roomId,
        code: 2,
      });
      return;
    }

    // Enable room back
    room.disabled = false;
    room.set(roomId, room);

    // Room enabled successfully.
    socket.emit('room-disable-status', { roomId, disabled: false });
  });

  socket.on('room-add-mod', (data) => {
    const { roomId, mods } = data;
    // Validate values
    if (typeof roomId !== 'string' || Array.isArray(mods)) return;

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

    const rUsers = roomUsers.get(roomId);
    let canExecute = rUsers ? true : false;
    const newMods = room.moderators ? [...room.moderators] : [];
    if (canExecute) {
      for (const index in mods) {
        if (
          typeof mods[index] === 'string' &&
          rUsers.has(mods[index]) &&
          newMods.indexOf(mods[index]) < 0
        )
          newMods.push(mods[index]);
      }
      allowedUpdates.moderators = new Set(newMods);
    }

    // Apply updates if there are valid changes
    if (Object.keys(allowedUpdates).length > 0) {
      rooms.set(roomId, Object.assign(room, allowedUpdates));

      // Notify all users in the room about the updated settings
      io.to(roomId).emit('update-room', { room: rooms.get(roomId), roomId });
    }
  });

  socket.on('room-remove-mod', (data) => {
    const { roomId, mods } = data;
    // Validate values
    if (typeof roomId !== 'string' || Array.isArray(mods)) return;

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

    const newMods = [];
    const oldMods = room.moderators ? [...room.moderators] : [];
    for (const index in oldMods) {
      if (typeof oldMods[index] === 'string' && mods.indexOf(oldMods[index]) < 0)
        newMods.push(mods[index]);
    }
    allowedUpdates.moderators = new Set(newMods);

    // Apply updates if there are valid changes
    if (Object.keys(allowedUpdates).length > 0) {
      rooms.set(roomId, Object.assign(room, allowedUpdates));

      // Notify all users in the room about the updated settings
      io.to(roomId).emit('update-room', { room: rooms.get(roomId), roomId });
    }
  });

  socket.on('update-room', (data) => {
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

    if ('title' in newSettings) {
      if (typeof newSettings.title === 'string')
        allowedUpdates.title = newSettings.title.substring(0, ROOM_TITLE_SIZE_LIMIT);
    }

    if ('password' in newSettings) {
      if (typeof newSettings.password === 'string')
        allowedUpdates.password = newSettings.password.substring(0, PASSWORD_SIZE_LIMIT);
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

    // Apply updates if there are valid changes
    if (Object.keys(allowedUpdates).length > 0) {
      rooms.set(roomId, Object.assign(room, allowedUpdates));

      // Notify all users in the room about the updated settings
      io.to(roomId).emit('update-room', { room: rooms.get(roomId), roomId });
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
      privateRoomData.set(roomId, Object.assign(privateRoomData.get(roomId), values));
      // Notify all users in the room about the updated data
      socket.emit('private-update-room-data', { roomId, values: privateRoomData.get(roomId) });
    }
    // Nope
    else {
      roomData.set(roomId, Object.assign(roomData.get(roomId), values));
      // Notify all users in the room about the updated data
      socket.to(roomId).emit('update-room-data', { roomId, values: roomData.get(roomId) });
    }
  });
}
