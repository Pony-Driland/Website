import {
  userMsgIsRateLimited,
  userSession,
  roomHistories,
  rooms,
  moderators,
  MESSAGE_SIZE_LIMIT,
} from './values';

export default function messageManager(socket, io) {
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
    socket.emit('message-status', {
      type: 'sent',
      roomId,
      id: msgIndex,
      text: message,
      date: msgDate,
      edited: 0,
    });

    socket.to(roomId).emit('new-message', {
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
    socket.emit('message-status', {
      type: 'edited',
      roomId,
      id: messageId,
      text: newText,
      edited: msgDate,
    });

    socket
      .to(roomId)
      .emit('update-message', { roomId, id: messageId, text: newText, edited: msgDate });
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
    socket.emit('message-status', { type: 'deleted', roomId, id: messageId });
    socket.to(roomId).emit('delete-message', { roomId, id: messageId });
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

      io.to(roomId).emit('roll-result', { results, total });
    }
  });
}
