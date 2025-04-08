import {
  userIsRateLimited,
  userSession,
  createAccount,
  getHashString,
  roomUsers,
  bannedUsers,
  moderators,
  users,
  userSockets,
  sendIncompleteDataInfo,
  accountNotDetected,
  getIniConfig,
  leaveRoom,
  getRateLimit,
  noDataInfo,
  usersDice,
} from './values';

export default function userManager(socket, io) {
  socket.on('ban', async (data, fn) => {
    if (noDataInfo(data, fn)) return;
    const { userId, reason } = data;
    // Validate values
    if (typeof userId !== 'string' || typeof reason !== 'string') return sendIncompleteDataInfo(fn);

    // Get user
    const yourId = userSession.getUserId(socket);
    if (!yourId) return accountNotDetected(fn); // Only logged-in users can use it
    if (userIsRateLimited(socket, fn)) return;

    // Check if user is server owner or server mod
    if (yourId !== getIniConfig('OWNER_ID') && !(await moderators.has(yourId))) {
      return fn({ error: true, msg: 'You are not allowed to do this.', code: 1 });
    }

    // Check if user exists
    if (!(await users.has(userId))) {
      return fn({ error: true, msg: 'User not found.', code: 2 });
    }

    // Disconnect user
    if (userSockets.has(userId)) userSockets.get(userId).disconnect();

    // Add into the ban list
    await bannedUsers.set(userId, { date: Date.now(), reason });

    // User ban successfully.
    fn({ success: true });
  });

  socket.on('unban', async (data, fn) => {
    if (noDataInfo(data, fn)) return;
    const { userId } = data;
    // Validate values
    if (typeof userId !== 'string') return sendIncompleteDataInfo(fn);

    // Get user
    const yourId = userSession.getUserId(socket);
    if (!yourId) return accountNotDetected(fn); // Only logged-in users can use it
    if (userIsRateLimited(socket, fn)) return;

    // Check if user is server owner or server mod
    if (yourId !== getIniConfig('OWNER_ID') && !(await moderators.has(yourId))) {
      return fn({ error: true, msg: 'You are not allowed to do this.', code: 1 });
    }

    // Check if user exists
    if (!(await users.has(userId))) {
      return fn({ error: true, msg: 'User not found.', code: 2 });
    }

    // Remove user from the ban list
    await bannedUsers.delete(userId);

    // User unban successfully.
    fn({ success: true });
  });

  socket.on('kick', async (data, fn) => {
    if (noDataInfo(data, fn)) return;
    const { userId } = data;
    // Validate values
    if (typeof userId !== 'string') return sendIncompleteDataInfo(fn);

    // Get user
    const yourId = userSession.getUserId(socket);
    if (!yourId) return accountNotDetected(fn); // Only logged-in users can use it
    if (userIsRateLimited(socket, fn)) return;

    // Check if user is server owner or server mod
    if (yourId !== getIniConfig('OWNER_ID') && !(await moderators.has(yourId))) {
      return fn({ error: true, msg: 'You are not allowed to do this.', code: 1 });
    }

    // Disconnect user
    if (userSockets.has(userId)) userSockets.get(userId).disconnect();
    else {
      return fn({ error: true, msg: 'User not found.', code: 2 });
    }

    // User kick successfully.
    fn({ success: true });
  });

  socket.on('change-password', async (data, fn) => {
    if (noDataInfo(data, fn)) return;
    const { password } = data;
    // Validate values
    if (typeof password !== 'string') return sendIncompleteDataInfo(fn);

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return accountNotDetected(fn); // Only logged-in users can use it
    if (userIsRateLimited(socket, fn)) return;
    const user = await users.get(userId);

    if (password.length < getIniConfig('MIN_PASSWORD_SIZE'))
      return fn({
        error: true,
        code: 1,
        msg: 'Your password does not have the minimum number of characters.',
      });

    // Change password
    user.password = getHashString(password.substring(0, getIniConfig('PASSWORD_SIZE')));

    // Set user data
    await users.set(userId, user);

    // User unban successfully.
    fn({ success: true });
  });

  socket.on('change-nickname', async (data, fn) => {
    if (noDataInfo(data, fn)) return;
    const { nickname } = data;
    // Validate values
    if (typeof nickname !== 'string') return sendIncompleteDataInfo(fn);

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return accountNotDetected(fn); // Only logged-in users can use it
    if (userIsRateLimited(socket, fn)) return;
    const user = await users.get(userId);

    // Change nickname
    user.nickname = nickname.substring(0, getIniConfig('NICKNAME_SIZE'));

    // Set user data
    await users.set(userId, user);
    userSession.setNickname(socket, user.nickname);
    userSession.eachRooms(socket, (roomId) =>
      io.to(roomId).emit('user-updated', { roomId, userId, data: { nickname: user.nickname } }),
    );

    // User unban successfully.
    fn({ nickname: user.nickname });
  });

  socket.on('register', async (data, fn) => {
    if (noDataInfo(data, fn)) return;
    const { userId, password, nickname } = data;
    // Validate values
    if (typeof userId !== 'string' || typeof password !== 'string' || typeof nickname !== 'string')
      return sendIncompleteDataInfo(fn);

    // Check User
    if (userIsRateLimited(socket, fn, true)) return;

    if (
      !getIniConfig('OPEN_REGISTRATION') &&
      userSession.getUserId(socket) !== getIniConfig('OWNER_ID')
    ) {
      return fn({ error: true, code: 2, msg: 'Only the owner can create accounts.' });
    }

    if (await users.has(userId)) {
      return fn({ error: true, code: 1, msg: 'User Id already exists.' });
    }

    if (password.length < getIniConfig('MIN_PASSWORD_SIZE'))
      return fn({
        error: true,
        code: 3,
        msg: 'Your password does not have the minimum number of characters.',
      });

    if (userId.length < 1)
      return fn({
        error: true,
        code: 4,
        msg: 'Your user id does not have the minimum number of characters.',
      });

    // Create Account
    await createAccount(userId, password, nickname);

    // User registered successfully.
    fn({ userId, nickname });
  });

  socket.on('login', async (data, fn) => {
    if (noDataInfo(data, fn)) return;
    const { userId, password } = data;
    // Validate values
    if (typeof userId !== 'string' || typeof password !== 'string')
      return sendIncompleteDataInfo(fn);

    // Check if user is using account
    if (await bannedUsers.has(userId)) {
      const banData = await bannedUsers.get(userId);
      return fn({
        error: true,
        reason: banData.reason,
        date: banData.date,
        msg: "You're banned!",
        code: 5,
      });
    }

    if (userSession.getUserId(socket)) {
      return fn({ error: true, msg: "You're already logged in!", code: 4 });
    }

    if (userSockets.has(userId)) {
      return fn({ error: true, msg: 'The account is already in use.', code: 3 });
    }

    // Validate user credentials
    if (!(await users.has(userId))) {
      return fn({ error: true, msg: 'User does not exist.', code: 2 });
    }

    const user = await users.get(userId);
    const hashedPassword = getHashString(password);
    if (user.password !== hashedPassword) {
      return fn({ error: true, msg: 'Invalid user credentials.', code: 1 });
    }

    // Get the user's nickname from the users map
    const nickname = user.nickname;

    // Set session data
    userSession.check(socket);
    userSession.setUserId(socket, userId);
    userSession.setNickname(socket, nickname);

    // Add user into userSockets
    userSockets.set(userId, socket);

    // Success!
    console.log(
      `[APP] [${socket.handshake ? socket.handshake.address : '?.?.?.?'}] User ${userId} logged in: ${socket.id}`,
    );

    // Complete
    fn({
      userId,
      nickname,
      isAdmin: userId === getIniConfig('OWNER_ID'),
      isMod: await moderators.has(userId),
      ratelimit: getRateLimit(),
      dice: await usersDice.get(userId),
    });
  });

  socket.on('disconnect', () => {
    // Get user
    const userId = userSession.getUserId(socket);
    const ipAddress = socket.handshake ? socket.handshake.address : '?.?.?.?';

    // Bye
    console.log(
      `[APP] [${ipAddress}] ${userId ? `User ${userId}` : 'Unknown user'} disconnected: ${socket.id}`,
    );

    // Disconnect user from rooms
    if (userId)
      roomUsers.forEach((users, roomId) => {
        if (users.has(userId)) leaveRoom(socket, io, roomId);
      });

    // Remove from userSockets
    userSockets.delete(userId);
  });
}
