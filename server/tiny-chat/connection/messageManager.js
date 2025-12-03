import { countObj, isJsonObject } from 'tiny-essentials/basics';
import db from './sql';
import {
  userMsgIsRateLimited,
  userSession,
  accountNotDetected,
  sendIncompleteDataInfo,
  getIniConfig,
  noDataInfo,
  userDiceIsRateLimited,
  roomUsers,
  userUpdateDiceIsRateLimited,
  userMsgEditIsRateLimited,
  userMsgDeleteIsRateLimited,
  userMsgLoadIsRateLimited,
} from './values';

export default function messageManager(socket, io) {
  socket.on('send-message', async (data, fn) => {
    if (noDataInfo(data, fn)) return;
    const { message, roomId, tokens, model, hash, isModel, errorCode } = data;
    // Validate values
    if (
      typeof message !== 'string' ||
      message.trim() === '' ||
      typeof roomId !== 'string' ||
      typeof isModel !== 'boolean'
    )
      return sendIncompleteDataInfo(fn);

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return accountNotDetected(fn);
    if (userMsgIsRateLimited(socket, fn)) return;

    // Check text size
    if (message.length > getIniConfig('MESSAGE_SIZE')) {
      // The text reached the limit size
      return fn({
        error: true,
        msg: `The text reached the limit size of ${getIniConfig('MESSAGE_SIZE')}.`,
        code: 1,
        numbers: [getIniConfig('MESSAGE_SIZE')],
      });
    }

    // Check if the room exist
    const rooms = db.getTable('rooms');
    const room = await rooms.get(roomId);
    if (!room) return fn({ error: true, msg: 'Room not found.', code: 2 });

    // Check if the user is in the room
    const rUsers = roomUsers.get(roomId);
    if (!rUsers || !rUsers.get(userId))
      return fn({ error: true, code: 3, msg: 'You are not in this room.' });

    const moderators = db.getTable('moderators');
    const roomModerators = db.getTable('roomModerators');
    if (
      !rUsers.get(room.ownerId) ||
      (room.readOnly &&
        userId !== getIniConfig('OWNER_ID') &&
        !(await moderators.has(userId)) &&
        room.ownerId !== userId &&
        !(await roomModerators.has(roomId, userId))) ||
      (isModel && userId !== getIniConfig('OWNER_ID'))
    )
      return fn({
        error: true,
        msg: `You don't have enough permissions.`,
        code: 4,
      });

    const msgDate = Date.now();
    const roomHistories = db.getTable('history');
    const msgData = {
      isModel,
      userId,
      text: message,
      date: msgDate,
      chapter: room.chapter,
      edited: 0,
    };

    if (typeof errorCode === 'string')
      msgData.errorCode = errorCode.substring(0, getIniConfig('MESSAGE_SIZE'));
    if (typeof model === 'string') msgData.model = model.substring(0, getIniConfig('MESSAGE_SIZE'));
    if (typeof tokens === 'number') msgData.tokens = tokens;
    if (typeof hash === 'string') msgData.hash = hash.substring(0, getIniConfig('MESSAGE_SIZE'));

    const msg = await roomHistories.set(roomId, msgData);

    // Emit to the room that the user joined (based on roomId)
    socket.to(roomId).emit('new-message', {
      roomId,
      id: msg.historyId,
      userId,
      isModel,
      chapter: room.chapter,
      text: message,
      date: msgDate,
      tokens: typeof tokens === 'number' ? msgData.tokens : null,
      hash: typeof msgData.hash === 'string' ? msgData.hash : null,
      model: typeof model === 'string' ? msgData.model : null,
      errorCode: typeof errorCode === 'string' ? msgData.errorCode : null,
      edited: 0,
    });

    // Complete
    fn({ id: msg.historyId, date: msgDate, chapter: room.chapter });
  });

  socket.on('edit-message', async (data, fn) => {
    if (noDataInfo(data, fn)) return;
    const { roomId, messageId, newText, tokens, model, errorCode } = data;
    // Validate values
    if (typeof newText !== 'string' || typeof roomId !== 'string' || typeof messageId !== 'string')
      return sendIncompleteDataInfo(fn);

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return accountNotDetected(fn); // Only logged-in users can edit
    if (userMsgEditIsRateLimited(socket, fn)) return;

    // Get room
    const rooms = db.getTable('rooms');
    const room = await rooms.get(roomId);
    if (!room) return fn({ error: true, msg: 'Room not found.', code: 1 });

    // Check if the user is in the room
    const rUsers = roomUsers.get(roomId);
    if (!rUsers || !rUsers.get(userId))
      return fn({ error: true, code: 2, msg: 'You are not in this room.' });

    // Check text size
    if (newText.length > getIniConfig('MESSAGE_SIZE')) {
      // The text reached the limit size
      return fn({
        error: true,
        msg: `The text reached the limit size of ${getIniConfig('MESSAGE_SIZE')}.`,
        code: 3,
        numbers: [getIniConfig('MESSAGE_SIZE')],
      });
    }

    // Get message
    const roomHistories = db.getTable('history');
    const msg = await roomHistories.get(roomId, messageId);
    if (!msg)
      return fn({
        error: true,
        msg: `The original message was not found.`,
        code: 4,
      });

    const moderators = db.getTable('moderators');
    const roomModerators = db.getTable('roomModerators');
    if (
      !rUsers.get(room.ownerId) ||
      ((room.readOnly || msg.userId !== userId) &&
        userId !== getIniConfig('OWNER_ID') &&
        !(await moderators.has(userId)) &&
        room.ownerId !== userId &&
        !(await roomModerators.has(roomId, userId)))
    )
      return fn({
        error: true,
        msg: `You don't have enough permissions.`,
        code: 5,
      });

    // Edit message
    const msgDate = Date.now();
    msg.text = newText;
    if (typeof tokens === 'number') msg.tokens = tokens;
    if (typeof model === 'string') msg.model = model.substring(0, getIniConfig('MESSAGE_SIZE'));
    if (typeof errorCode === 'string')
      msg.errorCode = errorCode.substring(0, getIniConfig('MESSAGE_SIZE'));
    msg.edited = msgDate;

    await roomHistories.advancedUpdate(msg, {
      historyId: { value: messageId },
      roomId: { value: roomId },
    });

    const newEvent = {
      roomId,
      id: messageId,
      userId: msg,
      text: newText,
      date: msg.date,
      edited: msgDate,
      tokens: typeof tokens === 'number' ? tokens : null,
      model: typeof model === 'string' ? model : null,
      errorCode: typeof errorCode === 'string' ? errorCode : null,
    };

    // Emit the event only to logged-in users in the room
    socket.to(roomId).emit('message-updated', newEvent);

    // Complete
    fn(newEvent);
  });

  socket.on('delete-message', async (data, fn) => {
    if (noDataInfo(data, fn)) return;
    const { roomId, messageId } = data;
    // Validate values
    if (typeof roomId !== 'string' || typeof messageId !== 'string')
      return sendIncompleteDataInfo(fn);

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return accountNotDetected(fn); // Only logged-in users can delete
    if (userMsgDeleteIsRateLimited(socket, fn)) return;

    // Get room
    const rooms = db.getTable('rooms');
    const room = await rooms.get(roomId);
    if (!room) return fn({ error: true, msg: 'Room not found.', code: 1 });

    // Check if the user is in the room
    const rUsers = roomUsers.get(roomId);
    if (!rUsers || !rUsers.get(userId))
      return fn({ error: true, code: 2, msg: 'You are not in this room.' });

    // Get message
    const roomHistories = db.getTable('history');
    const msg = await roomHistories.get(roomId, messageId);
    if (!msg)
      return fn({
        error: true,
        msg: `The original message was not found.`,
        code: 3,
      });

    const moderators = db.getTable('moderators');
    const roomModerators = db.getTable('roomModerators');
    if (
      msg.userId !== userId &&
      userId !== getIniConfig('OWNER_ID') &&
      !(await moderators.has(userId)) &&
      room.ownerId !== userId &&
      !(await roomModerators.has(roomId, userId))
    )
      return fn({
        error: true,
        msg: `You don't have enough permissions.`,
        code: 4,
      });

    // Delete message
    const roomHistoriesDeleted = db.getTable('historyDeleted');
    await roomHistoriesDeleted.set(roomId, msg);

    await roomHistories.advancedDelete({
      historyId: { value: messageId },
      roomId: { value: roomId },
    });

    // Emit the event only to logged-in users in the room
    socket.to(roomId).emit('message-deleted', { roomId, id: messageId });
    fn({ success: true });
  });

  // Dice data
  const getDiceData = (diceSkin = {}) =>
    isJsonObject(diceSkin)
      ? {
          img:
            typeof diceSkin.img === 'string'
              ? diceSkin.img.substring(0, getIniConfig('DICE_IMG_SIZE')).trim()
              : null,
          border:
            typeof diceSkin.border === 'string'
              ? diceSkin.border.substring(0, getIniConfig('DICE_BORDER_STYLE')).trim()
              : null,
          bg:
            typeof diceSkin.bg === 'string'
              ? diceSkin.bg.substring(0, getIniConfig('DICE_BG_STYLE')).trim()
              : null,
          text:
            typeof diceSkin.text === 'string'
              ? diceSkin.text.substring(0, getIniConfig('DICE_TEXT_STYLE')).trim()
              : null,
          selectionBg:
            typeof diceSkin.selectionBg === 'string'
              ? diceSkin.selectionBg.substring(0, getIniConfig('DICE_SELECTION_BG_STYLE')).trim()
              : null,
          selectionText:
            typeof diceSkin.selectionText === 'string'
              ? diceSkin.selectionText
                  .substring(0, getIniConfig('DICE_SELECTION_TEXT_STYLE'))
                  .trim()
              : null,
        }
      : {};

  socket.on('load-messages', async (data, fn) => {
    if (noDataInfo(data, fn)) return;
    const { roomId, page, perPage, text, chapter, start, end, userId } = data;

    // Validate input
    if (
      (typeof text !== 'string' && text !== null) ||
      ((typeof chapter !== 'number' || Number.isNaN(chapter) || !Number.isFinite(chapter)) &&
        chapter !== null) ||
      ((typeof start !== 'number' || Number.isNaN(start) || !Number.isFinite(start)) &&
        start !== null) ||
      ((typeof end !== 'number' || Number.isNaN(end) || !Number.isFinite(end)) && end !== null) ||
      typeof roomId !== 'string' ||
      typeof page !== 'number' ||
      (typeof userId !== 'string' && userId !== null) ||
      ((typeof perPage !== 'number' || perPage < 1) && perPage !== null) ||
      page < 1
    )
      return sendIncompleteDataInfo(fn);

    // Get user
    const yourId = userSession.getUserId(socket);
    if (!yourId) return accountNotDetected(fn);
    if (userMsgLoadIsRateLimited(socket, fn)) return;

    const loadLimit = getIniConfig('HISTORY_SIZE');
    const canLoadAll = getIniConfig('LOAD_ALL_HISTORY');

    // Check if room exists
    const rooms = db.getTable('rooms');
    const room = await rooms.get(roomId);
    if (!room) return fn({ error: true, msg: 'Room not found.', code: 1 });

    // Check if the user is in the room
    const rUsers = roomUsers.get(roomId);
    if (!rUsers || !rUsers.get(yourId))
      return fn({ error: true, code: 2, msg: 'You are not in this room.' });

    let allMessages = [];
    const history = db.getTable('history');
    const order = 'date DESC';

    // Query
    const query = {
      group: 'AND',
      conditions: [{ column: 'roomId', value: roomId }],
    };

    // Text
    if (typeof text === 'string') {
      // Check text size
      if (text.length > getIniConfig('MESSAGE_SIZE')) {
        // The text reached the limit size
        return fn({
          error: true,
          msg: `The text reached the limit size of ${getIniConfig('MESSAGE_SIZE')}.`,
          code: 3,
          numbers: [getIniConfig('MESSAGE_SIZE')],
        });
      }
      query.conditions.push({ column: 'text', operator: 'LIKE', value: `%${text}%` });
    }

    // Message owner
    if (typeof userId === 'string') {
      // Check text size
      if (userId.length > getIniConfig('USER_ID_SIZE')) {
        // The userId reached the limit size
        return fn({
          error: true,
          msg: `The userId reached the limit size of ${getIniConfig('USER_ID_SIZE')}.`,
          code: 3,
          numbers: [getIniConfig('USER_ID_SIZE')],
        });
      }

      query.conditions.push({ column: 'userId', value: userId });
    }

    // Chapter
    if (typeof chapter === 'number' && chapter > 0)
      query.conditions.push({ column: 'chapter', value: chapter });

    // Date
    const existsStart = typeof start === 'number' && start > 0;
    const existsEnd = typeof end === 'number' && end > 0;

    if (existsStart || existsEnd) {
      const dateData = [];
      query.conditions.push({ group: 'AND', conditions: dateData });
      if (existsStart) dateData.push({ column: 'date', operator: '>=', value: start });
      if (existsEnd) dateData.push({ column: 'date', operator: '<=', value: end });
    }

    // Load Limit
    if (perPage !== null) {
      if (perPage > loadLimit)
        return fn({
          error: true,
          code: 4,
          msg: `You can\'t load a number bigger than ${loadLimit}!`,
        });

      if (perPage < 1)
        return fn({ error: true, code: 5, msg: `You can\'t load a number smaller than 1!` });
      allMessages = await history.search({ perPage, page, order, q: query });
    } else {
      if (!canLoadAll && room.ownerId !== yourId)
        return fn({ error: true, code: 6, msg: `You can\'t load all messages!` });
      allMessages = await history.search({ order, q: query });
    }

    // Complete
    if (Array.isArray(allMessages)) {
      fn({
        success: true,
        page: 1,
        totalItems: allMessages.length,
        totalPages: 1,
        messages: allMessages.reverse(),
      });
    } else {
      fn({
        success: true,
        page,
        totalItems: allMessages.totalItems,
        totalPages: allMessages.totalPages,
        messages: allMessages.items.reverse(),
      });
    }
  });

  socket.on('load-dice-history', async (data, fn) => {
    if (noDataInfo(data, fn)) return;

    const { roomId, page, perPage, userId, start, end } = data;

    // Validate input
    if (
      typeof roomId !== 'string' ||
      typeof page !== 'number' ||
      page < 1 ||
      (typeof perPage !== 'number' && perPage !== null) ||
      (typeof perPage === 'number' && perPage < 1 && perPage !== null) ||
      (typeof userId !== 'string' && userId !== null) ||
      ((typeof start !== 'number' || Number.isNaN(start) || !Number.isFinite(start)) &&
        start !== null) ||
      ((typeof end !== 'number' || Number.isNaN(end) || !Number.isFinite(end)) && end !== null)
    ) {
      return sendIncompleteDataInfo(fn);
    }

    // User authentication
    const yourId = userSession.getUserId(socket);
    if (!yourId) return accountNotDetected(fn);
    if (userMsgLoadIsRateLimited(socket, fn)) return;

    const loadLimit = getIniConfig('HISTORY_SIZE');

    // Check if room exists
    const rooms = db.getTable('rooms');
    const room = await rooms.get(roomId);
    if (!room) return fn({ error: true, msg: 'Room not found.', code: 1 });

    // Check if user is in the room
    const rUsers = roomUsers.get(roomId);
    if (!rUsers || !rUsers.get(yourId))
      return fn({ error: true, code: 2, msg: 'You are not in this room.' });

    // Prepare query
    const order = 'date DESC';
    const diceHistory = db.getTable('diceHistory');

    const query = {
      group: 'AND',
      conditions: [{ column: 'roomId', value: roomId }],
    };

    // Message owner filter
    if (typeof userId === 'string') {
      if (userId.length > getIniConfig('USER_ID_SIZE')) {
        return fn({
          error: true,
          msg: `The userId reached the limit size of ${getIniConfig('USER_ID_SIZE')}.`,
          code: 3,
          numbers: [getIniConfig('USER_ID_SIZE')],
        });
      }

      query.conditions.push({ column: 'userId', value: userId });
    }

    // Date range
    const existsStart = typeof start === 'number' && start > 0;
    const existsEnd = typeof end === 'number' && end > 0;

    if (existsStart || existsEnd) {
      const dateData = [];
      query.conditions.push({ group: 'AND', conditions: dateData });

      if (existsStart) dateData.push({ column: 'date', operator: '>=', value: start });
      if (existsEnd) dateData.push({ column: 'date', operator: '<=', value: end });
    }

    // Run search
    let allData = [];

    if (perPage !== null) {
      if (perPage > loadLimit) {
        return fn({
          error: true,
          code: 4,
          msg: `You can\'t load a number bigger than ${loadLimit}!`,
        });
      }

      if (perPage < 1) {
        return fn({ error: true, code: 5, msg: `You can\'t load a number smaller than 1!` });
      }

      allData = await diceHistory.search({ perPage, page, order, q: query });
    } else return fn({ error: true, code: 6, msg: `You can\'t load all history!` });

    // Output
    if (!Array.isArray(allData)) {
      fn({
        success: true,
        page,
        totalItems: allData.totalItems,
        totalPages: allData.totalPages,
        history: allData.items.reverse(),
      });
    } else return fn({ error: true, code: 6, msg: `You can\'t load all history!` });
  });

  socket.on('set-dice', async (data, fn) => {
    if (noDataInfo(data, fn)) return;
    const { diceSkin } = data;
    // Validate input data
    if (!isJsonObject(diceSkin)) return sendIncompleteDataInfo(fn);

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return accountNotDetected(fn); // Only logged-in users can use dices
    if (userUpdateDiceIsRateLimited(socket, fn)) return;

    // Insert skin
    const skin = getDiceData(diceSkin);
    const usersDice = db.getTable('usersDice');
    await usersDice.set(userId, skin);
    fn({ success: true });
  });

  socket.on('roll-dice', async (data, fn) => {
    if (noDataInfo(data, fn)) return;
    const { canZero, dice, diceSkin, modifiers, roomId } = data;
    // Validate input data
    if (
      !Array.isArray(dice) ||
      dice.length === 0 ||
      typeof roomId !== 'string' ||
      typeof canZero !== 'boolean' ||
      !Array.isArray(modifiers) ||
      !modifiers.every(
        (item) =>
          countObj(item) === 3 &&
          typeof item.index === 'number' &&
          typeof item.original === 'string' &&
          typeof item.expression === 'string',
      )
    )
      return sendIncompleteDataInfo(fn);

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return accountNotDetected(fn); // Only logged-in users can use dices
    if (userDiceIsRateLimited(socket, fn)) return;

    // Check if the room exists
    const rUsers = roomUsers.get(roomId);
    if (!rUsers) {
      return fn({
        error: true,
        msg: 'Room not found.',
        code: 1,
      });
    }

    // You need join the room
    if (!rUsers.get(userId)) return fn({ error: true, code: 2, msg: 'You are not in this room.' });

    // Dice skin
    const skin = getDiceData(diceSkin);
    if (!Object.values(skin).every((value) => typeof value === 'string')) {
      const usersDice = db.getTable('usersDice');
      const userDice = getDiceData(await usersDice.get(userId));
      if (userDice) for (const name in userDice) skin[name] = userDice[name];
    }

    // Prepare results

    const finalMods = modifiers.map((item) => ({
      index: item.index,
      expression: item.expression.substring(0, getIniConfig('MESSAGE_SIZE')),
      original: item.original.substring(0, getIniConfig('MESSAGE_SIZE')),
    }));

    /**
     * @param {number} sides
     * @param {number} index
     */
    const rollDice = (sides, index) => {
      let max = sides;
      let tinyFix = 1;
      if (canZero) {
        max++;
        tinyFix--;
      }

      return Math.floor(Math.random() * max) + tinyFix;
    };

    const diceResults = [];

    // Roll dice with different number of sides
    // Iterate over each die and roll with its respective number of sides
    for (const index in dice) {
      const sides = dice[index];
      if (typeof sides !== 'number' || sides < 0)
        return fn({ error: true, code: 3, msg: 'Invalid dice of diff sides configuration' });
      diceResults.push({ value: rollDice(sides, Number(index)), sides });
    }

    // Result
    const diceHistory = db.getTable('diceHistory');

    const result = {
      date: Date.now(),
      results: diceResults,
      modifiers: finalMods,
      skin,
      canZero,
      userId,
      roomId,
    };

    const diceData = await diceHistory.set(roomId, {
      results: diceResults,
      modifiers: finalMods,
      date: result.date,
      canZero,
      userId,
    });

    result.id = diceData.id;

    // Complete
    socket.to(roomId).emit('roll-result', result);

    fn({ success: true, results: diceResults, id: diceData.id });
  });
}
