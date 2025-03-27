import { userIsRateLimited, userSession, roomUsers, rooms, moderators } from './values';

export default function disableRoom(socket, io) {
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
}
