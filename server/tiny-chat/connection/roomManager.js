import isDebug from '../isDebug';
import { objType } from '../lib/objChecker';
import TinySQL from '../TinySQL';

import {
  userIsRateLimited,
  userSession,
  roomUsers,
  roomData,
  privateRoomData,
  roomHistories,
  rooms,
  moderators,
  users,
  userSockets,
  createRoom,
  joinRoom,
  leaveRoom,
  ownerOnly,
  accountNotDetected,
  sendIncompleteDataInfo,
  getIniConfig,
  roomModerators,
  roomBannedUsers,
  getHashString,
  noDataInfo,
  getJoinData,
} from './values';

export default function roomManager(socket, io, appStorage) {
  socket.on('exists-room', async (data, fn) => {
    if (noDataInfo(data, fn)) return;
    const { roomId } = data;
    // Validate values
    if (typeof roomId !== 'string') return sendIncompleteDataInfo(fn);

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return accountNotDetected(fn);

    // Check room
    const result = await rooms.has(roomId);
    fn({ exists: result });
  });

  socket.on('join', async (data, fn) => {
    if (noDataInfo(data, fn)) return;
    const { roomId, password } = data;
    // Validate values
    if (typeof roomId !== 'string' || typeof password !== 'string')
      return sendIncompleteDataInfo(fn);

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return accountNotDetected(fn);
    if (userIsRateLimited(socket, fn)) return;

    // Check if the room exists
    const room = await rooms.get(roomId);
    if (!room) {
      //
      return fn({ error: true, msg: 'Room not found.', code: 1 });
    }
    room.maxUsers = room.maxUsers || getIniConfig('MAX_USERS_PER_ROOM');

    // Check if the room has a password and validate it
    if (room.password && room.password !== getHashString(password)) {
      return fn({ error: true, msg: 'Incorrect room password.', code: 2 });
    }

    // Check if the room is full
    const roomUserList = roomUsers.get(roomId);
    if (roomUserList && roomUserList.size >= room.maxUsers) {
      return fn({ error: true, msg: 'Room is full.', code: 3 });
    }

    // Check if the room is disabled
    if (
      userId !== getIniConfig('OWNER_ID') &&
      !(await moderators.has(userId)) &&
      room.ownerId !== userId &&
      room.disabled
    ) {
      return fn({ error: true, msg: 'Room is disabled.', code: 4 });
    }

    // Check if the user is banned
    if (await roomBannedUsers.has(roomId, userId)) {
      return fn({ error: true, msg: "You're banned.", code: 5 });
    }

    // Send chat history and settings only to the joined user
    let history = roomHistories.get(roomId);
    if (!history) {
      history = new TinySQL();
      history.setDb(appStorage, { name: 'history', id: 'roomId', subId: 'historyId' });
      history.setDebug(isDebug());
      roomHistories.set(history);
    }

    const historyData = getIniConfig('LOAD_ALL_HISTORY')
      ? await history.getAll()
      : await history.getAmount(getIniConfig('HISTORY_SIZE'));

    // Emit chat history and settings to the user
    if (typeof room.password !== 'undefined') delete room.password;
    const usersList = roomUsers.get(roomId);
    const users = usersList ? Object.fromEntries(usersList) : {};
    if (!users[userId]) users[userId] = getJoinData(socket);

    socket.emit('room-entered', {
      roomId,
      users,
      history: historyData || [],
      mods: (await roomModerators.getAll()) || [],
      roomData: (await roomData.get(roomId)) || {},
      roomPrivateData:
        userId === room.ownerId || userId === getIniConfig('OWNER_ID')
          ? (await privateRoomData.get(roomId)) || {}
          : {},
      data: room || {},
    });

    // Complete
    joinRoom(socket, io, roomId, fn);
  });

  socket.on('leave', (data, fn) => {
    if (noDataInfo(data, fn)) return;
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

  socket.on('ban-from-room', async (data, fn) => {
    if (noDataInfo(data, fn)) return;
    const { userId, roomId } = data;
    // Validate values
    if (typeof userId !== 'string' || typeof roomId !== 'string') return sendIncompleteDataInfo(fn);

    // Get user
    const yourId = userSession.getUserId(socket);
    if (!yourId) return accountNotDetected(fn); // Only logged-in users can use it
    if (userIsRateLimited(socket, fn)) return;

    // Check if the room exists
    const room = await rooms.get(roomId);
    if (!room) {
      return fn({
        error: true,
        msg: 'Room not found.',
        code: 1,
      });
    }

    // Check if user is server owner or server mod
    if (
      (yourId !== getIniConfig('OWNER_ID') &&
        !(await moderators.has(yourId)) &&
        room.ownerId !== yourId &&
        !(await roomModerators.has(roomId, yourId))) ||
      userId === room.ownerId ||
      userId === getIniConfig('OWNER_ID')
    ) {
      return fn({
        msg: 'You are not allowed to do this.',
        error: true,
        code: 2,
      });
    }

    // Check if user exists
    if (!(await users.has(userId))) {
      return fn({
        error: true,
        msg: 'User not found.',
        code: 3,
      });
    }

    // Add into the ban list
    await roomBannedUsers.set(roomId, { userId });

    // Remove the user from their room
    io.to(roomId).emit('user-banned', { roomId, userId });
    leaveRoom(userSockets.get(userId), io, roomId);

    // User ban successfully.
    fn({ success: true });
  });

  socket.on('unban-from-room', async (data, fn) => {
    if (noDataInfo(data, fn)) return;
    const { userId, roomId } = data;
    // Validate values
    if (typeof userId !== 'string' || typeof roomId !== 'string') return sendIncompleteDataInfo(fn);

    // Get user
    const yourId = userSession.getUserId(socket);
    if (!yourId) return accountNotDetected(fn); // Only logged-in users can use it
    if (userIsRateLimited(socket, fn)) return;

    // Check if the room exists
    const room = await rooms.get(roomId);
    if (!room) {
      return fn({
        error: true,
        msg: 'Room not found.',
        code: 1,
      });
    }

    // Check if user is server owner or server mod
    if (
      yourId !== getIniConfig('OWNER_ID') &&
      !(await moderators.has(yourId)) &&
      room.ownerId !== yourId &&
      !(await roomModerators.has(roomId, yourId))
    ) {
      return fn({
        error: true,
        msg: 'You are not allowed to do this.',
        code: 2,
      });
    }

    // Check if user exists
    if (!(await users.has(userId))) {
      return fn({ error: true, msg: 'User not found.', code: 3 });
    }

    // Remove user from the ban list
    await roomBannedUsers.delete(roomId, userId);

    // User unban successfully.
    fn({ success: true });
  });

  socket.on('kick-from-room', async (data, fn) => {
    if (noDataInfo(data, fn)) return;
    const { userId, roomId } = data;
    // Validate values
    if ((typeof userId !== 'string' && !Array.isArray(userId)) || typeof roomId !== 'string')
      return sendIncompleteDataInfo(fn);

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
      yourId !== getIniConfig('OWNER_ID') &&
      !(await moderators.has(yourId)) &&
      room.ownerId !== yourId &&
      !(await roomModerators.has(roomId, yourId))
    ) {
      return fn({
        error: true,
        msg: 'You are not allowed to do this.',
        code: 4,
      });
    }

    // User list
    const userIds = [];
    if (typeof userId === 'string') userIds.push(userId);
    else
      for (const index in userId)
        if (typeof userId[index] === 'string') userIds.push(userId[index]);

    // Remove the user from their room
    const kickResults = { success: true, data: [] };
    for (const userId of userIds) {
      const kickResult = {};
      if (userId !== room.ownerId && userId !== getIniConfig('OWNER_ID')) {
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
      } else {
        kickResult.code = 4;
        kickResult.error = true;
        kickResult.msg = 'You are not allowed to do this.';
      }
      kickResults.data.push(kickResult);
    }

    // Complete
    fn(kickResults);
  });

  socket.on('create-room', async (data, fn) => {
    if (noDataInfo(data, fn)) return;
    const { roomId, password, title } = data;
    // Validate values
    if (typeof roomId !== 'string' || typeof password !== 'string' || typeof title !== 'string')
      return sendIncompleteDataInfo(fn);

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return accountNotDetected(fn); // Only logged-in users can use it
    if (userIsRateLimited(socket, fn)) return;

    if (roomId.length < 1)
      return fn({
        error: true,
        code: 2,
        msg: 'Your room id does not have the minimum number of characters.',
      });

    // Check if the room exists
    let room = await rooms.get(roomId);
    if (!room) {
      await createRoom(userId, roomId, password, title);
      return fn({ success: true });
    }

    // Room exists
    fn({
      error: true,
      msg: 'This room already exists.',
      code: 1,
    });
  });

  socket.on('delete-room', async (data, fn) => {
    if (noDataInfo(data, fn)) return;
    const { roomId } = data;
    // Validate values
    if (typeof roomId !== 'string') return sendIncompleteDataInfo(fn);

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return accountNotDetected(fn); // Only logged-in users can use it
    if (userIsRateLimited(socket, fn)) return;

    // Check if the room exists
    const room = await rooms.get(roomId);
    const rUsers = roomUsers.get(roomId);
    if (!room) {
      return fn({
        error: true,
        msg: 'Room not found.',
        code: 1,
      });
    }

    // Check if user is server owner or server mod
    if (
      userId !== getIniConfig('OWNER_ID') &&
      !(await moderators.has(userId)) &&
      room.ownerId !== userId
    ) {
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

    if (await rooms.has(roomId)) await rooms.delete(roomId);
    if (roomHistories.has(roomId)) roomHistories.delete(roomId);
    if (await privateRoomData.has(roomId)) await privateRoomData.delete(roomId);
    if (await roomData.has(roomId)) await roomData.delete(roomId);

    // Room delete successfully.
    fn({ success: true });
  });

  socket.on('disable-room', async (data, fn) => {
    if (noDataInfo(data, fn)) return;
    const { roomId } = data;
    // Validate values
    if (typeof roomId !== 'string') return sendIncompleteDataInfo(fn);

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return accountNotDetected(fn); // Only logged-in users can use it
    if (userIsRateLimited(socket, fn)) return;

    // Check if the room exists
    const rUsers = roomUsers.get(roomId);
    const room = await rooms.get(roomId);
    if (!rUsers || !room) {
      return fn({
        error: true,
        msg: 'Room not found.',
        code: 1,
      });
    }

    // Check if user is server owner or server mod
    if (
      userId !== getIniConfig('OWNER_ID') &&
      !(await moderators.has(userId)) &&
      room.ownerId !== userId
    ) {
      return fn({
        error: true,
        msg: 'You are not allowed to do this.',
        code: 2,
      });
    }

    // Change room status
    room.disabled = true;
    rooms.set(roomId, room);

    // Disconnect user from rooms
    rUsers.forEach((userData, tUser) => {
      if (tUser !== getIniConfig('OWNER_ID') && tUser !== room.ownerId)
        leaveRoom(userSockets.get(tUser), io, roomId);
    });

    // Room disabled successfully.
    fn({ success: true });
  });

  socket.on('enable-room', async (data, fn) => {
    if (noDataInfo(data, fn)) return;
    const { roomId } = data;
    // Validate values
    if (typeof roomId !== 'string') return sendIncompleteDataInfo(fn);

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return accountNotDetected(fn); // Only logged-in users can use it
    if (userIsRateLimited(socket, fn)) return;

    // Check if the room exists
    const room = await rooms.get(roomId);
    if (!room) {
      return fn({
        error: true,
        msg: 'Room not found.',
        code: 1,
      });
    }

    // Check if user is server owner or server mod
    if (
      userId !== getIniConfig('OWNER_ID') &&
      !(await moderators.has(userId)) &&
      room.ownerId !== userId
    ) {
      return fn({
        error: true,
        msg: 'You are not allowed to do this.',
        code: 2,
      });
    }

    // Enable room back
    room.disabled = false;
    rooms.set(roomId, room);

    // Room enabled successfully.
    fn({ success: true });
  });

  socket.on('room-add-mod', async (data, fn) => {
    if (noDataInfo(data, fn)) return;
    const { roomId, mods } = data;
    // Validate values
    if (typeof roomId !== 'string' || !Array.isArray(mods)) return sendIncompleteDataInfo(fn);

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return accountNotDetected(fn); // Only logged-in users can update settings
    if (userIsRateLimited(socket, fn)) return;

    // Get room
    const room = await rooms.get(roomId);
    if (!room) return fn({ error: true, msg: 'Room not found.', code: 1 }); // Room does not exist

    // Check if the user is the room owner or the server owner
    const isRoomOwner = userId === room.ownerId;
    const isServerOwner = userId === getIniConfig('OWNER_ID'); // 'getIniConfig('OWNER_ID')' refers to the server owner

    if (!isRoomOwner && !isServerOwner) return ownerOnly(fn, 2); // Only room owner or server owner can update settings

    const result = [];
    if (roomUsers.get(roomId)) {
      for (const index in mods) {
        if (typeof mods[index] === 'string') {
          await roomModerators.set(roomId, { userId: mods[index] });
          result.push(mods[index]);
        }
      }
    }

    // Notify all users in the room about the updated settings
    io.to(roomId).emit('room-mod-updated', { result, type: 'add', roomId });

    // Complete
    fn({ success: true });
  });

  socket.on('room-remove-mod', async (data, fn) => {
    if (noDataInfo(data, fn)) return;
    const { roomId, mods } = data;
    // Validate values
    if (typeof roomId !== 'string' || !Array.isArray(mods)) return sendIncompleteDataInfo(fn);

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return accountNotDetected(fn); // Only logged-in users can update settings
    if (userIsRateLimited(socket, fn)) return;

    // Get room
    const room = await rooms.get(roomId);
    if (!room) return fn({ error: true, msg: 'Room not found.', code: 1 }); // Room does not exist

    // Check if the user is the room owner or the server owner
    const isRoomOwner = userId === room.ownerId;
    const isServerOwner = userId === getIniConfig('OWNER_ID'); // 'getIniConfig('OWNER_ID')' refers to the server owner

    if (!isRoomOwner && !isServerOwner) return ownerOnly(fn, 2); // Only room owner or server owner can update settings

    const result = [];
    for (const index in mods) {
      if (typeof mods[index] === 'string') {
        await roomModerators.delete(roomId, mods[index]);
        result.push(mods[index]);
      }
    }

    // Notify all users in the room about the updated settings
    io.to(roomId).emit('room-mod-updated', { result, type: 'remove', roomId });

    // Complete
    fn({ success: true });
  });

  socket.on('update-room', async (data, fn) => {
    if (noDataInfo(data, fn)) return;
    const { roomId, newSettings } = data;
    // Validate values
    if (typeof roomId !== 'string' || !objType(newSettings, 'object'))
      return sendIncompleteDataInfo(fn);

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return accountNotDetected(fn); // Only logged-in users can update settings
    if (userIsRateLimited(socket, fn)) return;

    // Get room
    const room = await rooms.get(roomId);
    if (!room) return fn({ error: true, msg: 'Room not found.', code: 1 }); // Room does not exist

    // Check if the user is the room owner or the server owner
    const isRoomOwner = userId === room.ownerId;
    const isServerOwner = userId === getIniConfig('OWNER_ID'); // 'getIniConfig('OWNER_ID')' refers to the server owner

    if (!isRoomOwner && !isServerOwner) return ownerOnly(fn, 2); // Only room owner or server owner can update settings

    // Allowed updates
    const allowedUpdates = {};

    const checkRealValues = (where, value) => {
      if (typeof value !== 'number' || !Number.isFinite(value)) return;
      const MIN_REAL = -3.4e38;
      const MAX_REAL = 3.4e38;

      // Check interval
      if (value < MIN_REAL || value > MAX_REAL) return;

      // Check accuracy: maximum ~7 significant digits
      const significantDigits = parseFloat(value.toPrecision(7));

      // Insert config
      if (value === significantDigits) allowedUpdates[where] = value;
    };

    if ('title' in newSettings) {
      if (typeof newSettings.title === 'string')
        allowedUpdates.title = newSettings.title.substring(0, getIniConfig('ROOM_TITLE_SIZE'));
    }

    if ('password' in newSettings) {
      if (typeof newSettings.password === 'string')
        allowedUpdates.password = newSettings.password.substring(0, getIniConfig('PASSWORD_SIZE'));
    }

    if ('model' in newSettings) {
      if (typeof newSettings.model === 'string')
        allowedUpdates.model = newSettings.model.substring(0, getIniConfig('MODEL_ID_SIZE'));
    }

    if ('maxOutputTokens' in newSettings)
      checkRealValues('maxOutputTokens', newSettings.maxOutputTokens);
    if ('temperature' in newSettings) checkRealValues('temperature', newSettings.temperature);
    if ('topP' in newSettings) checkRealValues('topP', newSettings.topP);
    if ('topK' in newSettings) checkRealValues('topK', newSettings.topK);
    if ('presencePenalty' in newSettings)
      checkRealValues('presencePenalty', newSettings.presencePenalty);
    if ('frequencyPenalty' in newSettings)
      checkRealValues('frequencyPenalty', newSettings.frequencyPenalty);

    if ('maxUsers' in newSettings) {
      if (
        typeof newSettings.maxUsers === 'number' &&
        !Number.isNaN(newSettings.maxUsers) &&
        Number.isFinite(newSettings.maxUsers)
      ) {
        allowedUpdates.maxUsers = newSettings.maxUsers;
        if (allowedUpdates.maxUsers > getIniConfig('MAX_USERS_PER_ROOM'))
          allowedUpdates.maxUsers = getIniConfig('MAX_USERS_PER_ROOM');
        else if (allowedUpdates.maxUsers < 1) allowedUpdates.maxUsers = 1;
      }
    }

    // Apply updates if there are valid changes
    if (Object.keys(allowedUpdates).length > 0) {
      await rooms.set(roomId, Object.assign(room, allowedUpdates));

      // Notify all users in the room about the updated settings
      const newRoom = await rooms.get(roomId);
      if (typeof newRoom.password !== 'undefined') delete newRoom.password;
      io.to(roomId).emit('room-updated', { data: newRoom, roomId });
    }

    // Complete
    fn({ success: true });
  });

  socket.on('update-room-data', async (data, fn) => {
    if (noDataInfo(data, fn)) return;
    const { roomId, isPrivate, values } = data;
    // Validate values
    if (typeof roomId !== 'string' || !objType(values, 'object') || typeof isPrivate !== 'boolean')
      return sendIncompleteDataInfo(fn);

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return accountNotDetected(fn); // Only logged-in users can update settings
    if (userIsRateLimited(socket, fn)) return;

    // Get room
    const room = await rooms.get(roomId);
    if (!room) return fn({ error: true, msg: 'Room not found.', code: 1 });

    // Check if the user is the owner of the room or the server owner
    if (userId !== room.ownerId && userId !== getIniConfig('OWNER_ID')) {
      return fn({
        error: true,
        msg: `You do not have permission to update this room${isPrivate ? ' private' : ''} data.`,
        code: 2,
      });
    }

    // Update the room data
    if (isPrivate) {
      let privateData = await privateRoomData.get(roomId);
      if (!privateData) privateData = {};
      await privateRoomData.set(roomId, Object.assign(privateData, values));
      // Notify all users in the room about the updated data
      socket.emit('room-data-updated', {
        roomId,
        isPrivate: true,
        values: await privateRoomData.get(roomId),
      });
    }
    // Nope
    else {
      await roomData.set(roomId, Object.assign(await roomData.get(roomId), values));
      // Notify all users in the room about the updated data
      socket.to(roomId).emit('room-data-updated', {
        roomId,
        isPrivate: false,
        values: await roomData.get(roomId),
      });
    }

    // Complete
    fn({ success: true });
  });
}
