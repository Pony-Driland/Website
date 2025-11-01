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
} from './values';
import { applyDiceModifiers } from '../../../src/ai/buttons/diceUtils.mjs';

export default function messageManager(socket, io) {
  socket.on('send-message', async (data, fn) => {
    if (noDataInfo(data, fn)) return;
    const { message, roomId, tokens, model, errorCode } = data;
    // Validate values
    if (typeof message !== 'string' || message.trim() === '' || typeof roomId !== 'string')
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

    const msgDate = Date.now();
    const roomHistories = db.getTable('history');
    const msg = await roomHistories.set(roomId, {
      userId,
      text: message,
      date: msgDate,
      edited: 0,
      tokens: typeof tokens === 'number' ? tokens : undefined,
      model:
        typeof model === 'string' ? model.substring(0, getIniConfig('MESSAGE_SIZE')) : undefined,
      errorCode:
        typeof errorCode === 'string'
          ? errorCode.substring(0, getIniConfig('MESSAGE_SIZE'))
          : undefined,
    });

    // Emit to the room that the user joined (based on roomId)
    socket.to(roomId).emit('new-message', {
      roomId,
      id: msg.id,
      userId,
      text: message,
      date: msgDate,
      tokens: typeof tokens === 'number' ? tokens : null,
      model: typeof model === 'string' ? model.substring(0, getIniConfig('MESSAGE_SIZE')) : null,
      errorCode:
        typeof errorCode === 'string' ? errorCode.substring(0, getIniConfig('MESSAGE_SIZE')) : null,
      edited: 0,
    });

    // Complete
    fn({ id: msgIndex, date: msgDate });
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
    if (userMsgIsRateLimited(socket, fn)) return;

    // Get room
    const rooms = db.getTable('rooms');
    const room = await rooms.get(roomId);
    if (!room) return fn({ error: true, msg: 'Room not found.', code: 1 });

    // Check text size
    if (newText.length > getIniConfig('MESSAGE_SIZE')) {
      // The text reached the limit size
      return fn({
        error: true,
        msg: `The text reached the limit size of ${getIniConfig('MESSAGE_SIZE')}.`,
        code: 2,
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

    // Edit message
    const msgDate = Date.now();
    msg.text = newText;
    if (typeof tokens === 'number') msg.tokens = tokens;
    if (typeof model === 'string') msg.model = model.substring(0, getIniConfig('MESSAGE_SIZE'));
    if (typeof errorCode === 'string')
      msg.errorCode = errorCode.substring(0, getIniConfig('MESSAGE_SIZE'));
    msg.edited = msgDate;
    await history.set(messageId, msg);

    // Emit the event only to logged-in users in the room
    socket.to(roomId).emit('message-updated', {
      roomId,
      id: messageId,
      userId: msg,
      text: newText,
      date: msg.date,
      edited: msgDate,
      tokens: typeof tokens === 'number' ? tokens : null,
      model: typeof model === 'string' ? model : null,
      errorCode: typeof errorCode === 'string' ? errorCode : null,
    });

    // Complete
    fn({ edited: msgDate });
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
    if (userMsgIsRateLimited(socket, fn)) return;

    // Get room
    const rooms = db.getTable('rooms');
    const room = await rooms.get(roomId);
    if (!room) return fn({ error: true, msg: 'Room not found.', code: 1 });

    // Get message
    const roomHistories = db.getTable('history');
    const msg = await roomHistories.get(roomId, messageId);
    if (!msg)
      return fn({
        error: true,
        msg: `The original message was not found.`,
        code: 2,
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
        code: 3,
      });

    // Delete message
    const roomHistoriesDeleted = db.getTable('historyDeleted');
    await roomHistoriesDeleted.set(roomId, msg);
    await history.delete(messageId);

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
          (typeof item.original === 'string' || typeof item.original === 'undefined') &&
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
    const results = [];
    let total = 0;

    const finalMods = modifiers.map((item) => ({
      index: item.index,
      expression: item.expression.substring(0, getIniConfig('MESSAGE_SIZE')),
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

      const mods = finalMods.find((item) => item.index === index);
      const roll = Math.floor(Math.random() * max) + tinyFix;
      const resultRoll = { sides, roll, total: roll, tokens: [String(roll)] };
      if (mods) {
        const modResult = applyDiceModifiers(resultRoll.total, [mods]);
        resultRoll.total = modResult.final;
        resultRoll.tokens = modResult.steps[0].tokens ?? [String(resultRoll.roll)];
      }

      results.push(resultRoll);
      total += resultRoll.total;
    };

    // Roll dice with different number of sides
    // Iterate over each die and roll with its respective number of sides
    for (const index in dice) {
      const sides = dice[index];
      if (typeof sides !== 'number' || sides < 0)
        return fn({ error: true, code: 3, msg: 'Invalid dice of diff sides configuration' });
      rollDice(sides, Number(index));
    }

    // Complete
    socket.to(roomId).emit('roll-result', {
      results,
      total,
      skin,
      canZero,
      userId,
      roomId,
      modifiers: finalMods,
    });

    fn({ success: true, results, total });
  });
}
