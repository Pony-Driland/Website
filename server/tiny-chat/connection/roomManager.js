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
  joinRoom,
  leaveRoom,
  ownerOnly,
  accountNotDetected,
  sendIncompleteDataInfo,
  MAX_USERS_PER_ROOM,
  ROOM_TITLE_SIZE_LIMIT,
} from './values';

export default function roomManager(socket, io) {
  socket.on('join', (data, fn) => {
    const { roomId, password } = data;
    // Validate values
    if (typeof roomId !== 'string' || password !== 'string') return sendIncompleteDataInfo(fn);

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return accountNotDetected(fn);
    if (userIsRateLimited(socket, fn)) return;

    // Check if the room exists
    const room = rooms.get(roomId);
    if (!room) {
      //
      return fn({ error: true, msg: 'Room not found.', code: 1 });
    }

    // Check if the room has a password and validate it
    if (room.password && room.password !== password) {
      return fn({ error: true, msg: 'Incorrect room password.', code: 2 });
    }

    // Check if the room is full
    if (room.users.size >= room.maxUsers) {
      return fn({ error: true, msg: 'Room is full.', code: 3 });
    }

    // Check if the room is disabled
    if (
      userId !== serverOwnerId &&
      !moderators.has(userId) &&
      room.ownerId !== userId &&
      room.disabled
    ) {
      return fn({ error: true, msg: 'Room is disabled.', code: 4 });
    }

    // Check if the user is banned
    if (room.banned.has(userId)) {
      return fn({ error: true, msg: "You're banned.", code: 5 });
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

    // Complete
    joinRoom(socket, io, roomId, fn);
  });

  socket.on('leave', (data, fn) => {
    const { roomId } = data;
    // Validate values
    if (typeof roomId !== 'string') return sendIncompleteDataInfo(fn);

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return accountNotDetected(fn);

    // Execute leave
    const leaveStatus = leaveRoom(socket, io, roomId);
    if (!leaveStatus.success) {
      if (leaveStatus.code === 1) {
        fn({ error: true, msg: 'No Room users.', roomId, code: 1 });
      } else if (leaveStatus.code === 2)
        fn({ error: true, msg: "You're not in the room.", roomId, code: 2 });
      else if (leaveStatus.code === 3) fn({ error: true, msg: 'Invalid data.', roomId, code: 3 });
    } else fn({ success: true });
  });

  socket.on('ban-from-room', (data, fn) => {
    const { userId, roomId } = data;
    // Validate values
    if (typeof userId !== 'string' || typeof roomId !== 'string') return sendIncompleteDataInfo(fn);

    // Get user
    const yourId = userSession.getUserId(socket);
    if (!yourId) return accountNotDetected(fn); // Only logged-in users can use it
    if (userIsRateLimited(socket, fn)) return;

    // Check if the room exists
    const rUsers = roomUsers.get(roomId);
    const room = rooms.get(roomId);
    if (!rUsers || !room) {
      return fn({
        error: true,
        msg: 'Room not found.',
        code: 1,
      });
    }

    // Check if user is server owner or server mod
    if (
      yourId !== serverOwnerId &&
      !moderators.has(yourId) &&
      room.ownerId !== yourId &&
      !room.moderators.has(yourId)
    ) {
      return fn({
        msg: 'You are not allowed to do this.',
        error: true,
        code: 2,
      });
    }

    // Check if user exists
    if (!users.has(userId)) {
      return fn({
        error: true,
        msg: 'User not found.',
        code: 3,
      });
    }

    // Add into the ban list
    room.banned.add(userId);
    room.set(roomId, room);

    // Remove the user from their room
    io.to(roomId).emit('user-banned', { roomId, userId });
    leaveRoom(userSockets.get(userId), io, roomId);

    // User ban successfully.
    fn({ success: true });
  });

  socket.on('unban-from-room', (data, fn) => {
    const { userId, roomId } = data;
    // Validate values
    if (typeof userId !== 'string' || typeof roomId !== 'string') return sendIncompleteDataInfo(fn);

    // Get user
    const yourId = userSession.getUserId(socket);
    if (!yourId) return accountNotDetected(fn); // Only logged-in users can use it
    if (userIsRateLimited(socket, fn)) return;

    // Check if the room exists
    const room = rooms.get(roomId);
    if (!room) {
      return fn({
        error: true,
        msg: 'Room not found.',
        code: 1,
      });
    }

    // Check if user is server owner or server mod
    if (
      yourId !== serverOwnerId &&
      !moderators.has(yourId) &&
      room.ownerId !== yourId &&
      !room.moderators.has(yourId)
    ) {
      return fn({
        error: true,
        msg: 'You are not allowed to do this.',
        code: 2,
      });
    }

    // Check if user exists
    if (!users.has(userId)) {
      return fn({ error: true, msg: 'User not found.', code: 3 });
    }

    // Remove user from the ban list
    room.banned.delete(userId);
    room.set(roomId, room);

    // User unban successfully.
    fn({ success: true });
  });

  socket.on('kick-from-room', (data, fn) => {
    const { userId, roomId } = data;
    // Validate values
    if (typeof userId !== 'string' || typeof roomId !== 'string') return sendIncompleteDataInfo(fn);

    // Get user
    const yourId = userSession.getUserId(socket);
    if (!yourId) return accountNotDetected(fn); // Only logged-in users can use it
    if (userIsRateLimited(socket, fn)) return;

    // Check if the room exists
    const room = roomUsers.get(roomId);
    if (!room) {
      return fn({ error: true, msg: 'Room not found.', code: 1 });
    }

    // Check if user is server owner or server mod
    if (
      yourId !== serverOwnerId &&
      !moderators.has(yourId) &&
      room.ownerId !== yourId &&
      !room.moderators.has(yourId)
    ) {
      return fn({
        error: true,
        msg: 'You are not allowed to do this.',
        code: 4,
      });
    }

    // Remove the user from their room
    const kickResult = {};
    const kickStatus = leaveRoom(userSockets.get(userId), io, roomId);
    if (!kickStatus.success) {
      if (kickStatus.code === 2) {
        kickResult.code = 2;
        kickResult.error = true;
        kickResult.msg = 'User not found.';
      } else if (kickStatus.code === 3) {
        kickResult.code = 3;
        kickResult.error = true;
        kickResult.msg = 'Invalid data.';
      }
    } else {
      kickResult.success = true;
      io.to(roomId).emit('user-kicked', { roomId, userId });
    }

    // Complete
    fn(kickResult);
  });

  socket.on('create-room', (data, fn) => {
    const { roomId, password, title } = data;
    // Validate values
    if (typeof roomId !== 'string' || typeof password !== 'string' || typeof title !== 'string')
      return sendIncompleteDataInfo(fn);

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return accountNotDetected(fn); // Only logged-in users can use it
    if (userIsRateLimited(socket, fn)) return;

    // Check if the room exists
    let room = rooms.get(roomId);
    if (!room) {
      createRoom(userId, roomId, password, title);
      return fn({ success: true });
    }

    // Room exists
    fn({
      error: true,
      msg: 'This room already exists.',
      code: 1,
    });
  });

  socket.on('delete-room', (data, fn) => {
    const { roomId } = data;
    // Validate values
    if (typeof roomId !== 'string') return sendIncompleteDataInfo(fn);

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return accountNotDetected(fn); // Only logged-in users can use it
    if (userIsRateLimited(socket, fn)) return;

    // Check if the room exists
    const room = rooms.get(roomId);
    const rUsers = roomUsers.get(roomId);
    if (!room) {
      return fn({
        error: true,
        msg: 'Room not found.',
        code: 1,
      });
    }

    // Check if user is server owner or server mod
    if (userId !== serverOwnerId && !moderators.has(userId) && room.ownerId !== userId) {
      return fn({
        error: true,
        msg: 'You are not allowed to do this.',
        code: 2,
      });
    }

    // Disconnect user from rooms
    if (rUsers) {
      rUsers.forEach((userData, tUser) => {
        leaveRoom(userSockets.get(tUser), io, roomId);
      });
      roomUsers.delete(roomId);
    }

    if (rooms.has(roomId)) rooms.delete(roomId);
    if (roomHistories.has(roomId)) roomHistories.delete(roomId);
    if (privateRoomData.has(roomId)) privateRoomData.delete(roomId);
    if (roomData.has(roomId)) roomData.delete(roomId);

    // Room delete successfully.
    fn({ success: true });
  });

  socket.on('disable-room', (data, fn) => {
    const { roomId } = data;
    // Validate values
    if (typeof roomId !== 'string') return sendIncompleteDataInfo(fn);

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return accountNotDetected(fn); // Only logged-in users can use it
    if (userIsRateLimited(socket, fn)) return;

    // Check if the room exists
    const rUsers = roomUsers.get(roomId);
    const room = rooms.get(roomId);
    if (!rUsers || !room) {
      return fn({
        error: true,
        msg: 'Room not found.',
        code: 1,
      });
    }

    // Check if user is server owner or server mod
    if (userId !== serverOwnerId && !moderators.has(userId) && room.ownerId !== userId) {
      return fn({
        error: true,
        msg: 'You are not allowed to do this.',
        code: 2,
      });
    }

    // Change room status
    room.disabled = true;
    room.set(roomId, room);

    // Disconnect user from rooms
    rUsers.forEach((userData, tUser) => {
      leaveRoom(userSockets.get(tUser), io, roomId);
    });

    // Room disabled successfully.
    fn({ success: true });
  });

  socket.on('enable-room', (data, fn) => {
    const { roomId } = data;
    // Validate values
    if (typeof roomId !== 'string') return sendIncompleteDataInfo(fn);

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return accountNotDetected(fn); // Only logged-in users can use it
    if (userIsRateLimited(socket, fn)) return;

    // Check if the room exists
    const room = rooms.get(roomId);
    if (!room) {
      return fn({
        error: true,
        msg: 'Room not found.',
        code: 1,
      });
    }

    // Check if user is server owner or server mod
    if (userId !== serverOwnerId && !moderators.has(userId) && room.ownerId !== userId) {
      return fn({
        error: true,
        msg: 'You are not allowed to do this.',
        code: 2,
      });
    }

    // Enable room back
    room.disabled = false;
    room.set(roomId, room);

    // Room enabled successfully.
    fn({ success: true });
  });

  socket.on('room-add-mod', (data, fn) => {
    const { roomId, mods } = data;
    // Validate values
    if (typeof roomId !== 'string' || Array.isArray(mods)) return sendIncompleteDataInfo(fn);

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return accountNotDetected(fn); // Only logged-in users can update settings
    if (userIsRateLimited(socket, fn)) return;

    // Get room
    const room = rooms.get(roomId);
    if (!room) return fn({ error: true, msg: 'Room not found.', code: 1 }); // Room does not exist

    // Check if the user is the room owner or the server owner
    const isRoomOwner = userId === room.ownerId;
    const isServerOwner = userId === serverOwnerId; // 'serverOwnerId' refers to the server owner

    if (!isRoomOwner && !isServerOwner) return ownerOnly(fn, 2); // Only room owner or server owner can update settings

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

    // Complete
    fn({ success: true });
  });

  socket.on('room-remove-mod', (data, fn) => {
    const { roomId, mods } = data;
    // Validate values
    if (typeof roomId !== 'string' || Array.isArray(mods)) return sendIncompleteDataInfo(fn);

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return accountNotDetected(fn); // Only logged-in users can update settings
    if (userIsRateLimited(socket, fn)) return;

    // Get room
    const room = rooms.get(roomId);
    if (!room) return fn({ error: true, msg: 'Room not found.', code: 1 }); // Room does not exist

    // Check if the user is the room owner or the server owner
    const isRoomOwner = userId === room.ownerId;
    const isServerOwner = userId === serverOwnerId; // 'serverOwnerId' refers to the server owner

    if (!isRoomOwner && !isServerOwner) return ownerOnly(fn, 2); // Only room owner or server owner can update settings

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

    // Complete
    fn({ success: true });
  });

  socket.on('update-room', (data, fn) => {
    const { roomId, newSettings } = data;
    // Validate values
    if (typeof roomId !== 'string' || !objType(newSettings, 'object'))
      return sendIncompleteDataInfo(fn);

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return accountNotDetected(fn); // Only logged-in users can update settings
    if (userIsRateLimited(socket, fn)) return;

    // Get room
    const room = rooms.get(roomId);
    if (!room) return fn({ error: true, msg: 'Room not found.', code: 1 }); // Room does not exist

    // Check if the user is the room owner or the server owner
    const isRoomOwner = userId === room.ownerId;
    const isServerOwner = userId === serverOwnerId; // 'serverOwnerId' refers to the server owner

    if (!isRoomOwner && !isServerOwner) return ownerOnly(fn, 2); // Only room owner or server owner can update settings

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

    // Complete
    fn({ success: true });
  });

  socket.on('update-room-data', (data, fn) => {
    const { roomId, isPrivate, values } = data;
    // Validate values
    if (typeof roomId !== 'string' || !objType(values, 'object') || typeof isPrivate !== 'boolean')
      return sendIncompleteDataInfo(fn);

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return accountNotDetected(fn); // Only logged-in users can update settings
    if (userIsRateLimited(socket, fn)) return;

    // Get room
    const room = rooms.get(roomId);
    if (!room) return fn({ error: true, msg: 'Room not found.', code: 1 });

    // Check if the user is the owner of the room or the server owner
    if (userId !== room.ownerId && userId !== serverOwnerId) {
      return fn({
        error: true,
        msg: `You do not have permission to update this room${isPrivate ? ' private' : ''} data.`,
        code: 2,
      });
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

    // Complete
    fn({ success: true });
  });
}
