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
  serverOwnerId,
  NICKNAME_SIZE_LIMIT,
} from './values';

export default function userManager(socket, io) {
  socket.on('ban', (data) => {
    const { userId, reason } = data;
    // Validate values
    if (typeof userId !== 'string' || typeof reason !== 'string') return;

    // Get user
    const yourId = userSession.getUserId(socket);
    if (!yourId) return; // Only logged-in users can use it
    if (userIsRateLimited(socket)) return;

    // Check if user is server owner or server mod
    if (yourId !== serverOwnerId && !moderators.has(yourId)) {
      socket.emit('ban-failed', { msg: 'You are not allowed to do this.', banned: true, code: 1 });
      return;
    }

    // Check if user exists
    if (!users.has(userId)) {
      socket.emit('ban-failed', { msg: 'User not found.', banned: true, code: 2 });
      return;
    }

    // Disconnect user
    if (userSockets.has(userId)) userSockets.get(userId).disconnect();

    // Add into the ban list
    bannedUsers.set(userId, { date: Date.now(), reason });

    // User ban successfully.
    socket.emit('ban-status', { userId, reason, banned: true });
  });

  socket.on('unban', (data) => {
    const { userId } = data;
    // Validate values
    if (typeof userId !== 'string') return;

    // Get user
    const yourId = userSession.getUserId(socket);
    if (!yourId) return; // Only logged-in users can use it
    if (userIsRateLimited(socket)) return;

    // Check if user is server owner or server mod
    if (yourId !== serverOwnerId && !moderators.has(yourId)) {
      socket.emit('ban-failed', { msg: 'You are not allowed to do this.', banned: true, code: 1 });
      return;
    }

    // Check if user exists
    if (!users.has(userId)) {
      socket.emit('ban-failed', { msg: 'User not found.', banned: false, code: 2 });
      return;
    }

    // Remove user from the ban list
    bannedUsers.delete(userId);

    // User unban successfully.
    socket.emit('ban-status', { userId, banned: false });
  });

  socket.on('kick', (data) => {
    const { userId } = data;
    // Validate values
    if (typeof userId !== 'string') return;

    // Get user
    const yourId = userSession.getUserId(socket);
    if (!yourId) return; // Only logged-in users can use it
    if (userIsRateLimited(socket)) return;

    // Check if user is server owner or server mod
    if (yourId !== serverOwnerId && !moderators.has(yourId)) {
      socket.emit('kick-failed', { msg: 'You are not allowed to do this.', code: 1 });
      return;
    }

    // Disconnect user
    if (userSockets.has(userId)) userSockets.get(userId).disconnect();
    else {
      socket.emit('kick-failed', { msg: 'User not found.', code: 2 });
      return;
    }

    // User kick successfully.
    socket.emit('kick-status', { userId });
  });

  socket.on('change-password', (data) => {
    const { password } = data;
    // Validate values
    if (typeof password !== 'string') return;

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return; // Only logged-in users can use it
    if (userIsRateLimited(socket)) return;
    const user = users.get(userId);

    // Change password
    user.password = getHashString(password.substring(0, PASSWORD_SIZE_LIMIT));

    // Set user data
    users.set(userId, user);

    // User unban successfully.
    socket.emit('user-password-status', { userId, password: user.password });
  });

  socket.on('change-nickname', (data) => {
    const { nickname } = data;
    // Validate values
    if (typeof nickname !== 'string') return;

    // Get user
    const userId = userSession.getUserId(socket);
    if (!userId) return; // Only logged-in users can use it
    if (userIsRateLimited(socket)) return;
    const user = users.get(userId);

    // Change nickname
    user.nickname = nickname.substring(0, NICKNAME_SIZE_LIMIT);

    // Set user data
    users.set(userId, user);
    userSession.setNickname(socket, user.nickname);

    // User unban successfully.
    socket.emit('user-nickname-status', { userId, nickname: user.nickname });
  });

  socket.on('register', (data) => {
    const { userId, password, nickname } = data;
    // Validate values
    if (typeof userId !== 'string' || typeof password !== 'string' || typeof nickname !== 'string')
      return;

    // Check User
    if (userIsRateLimited(socket)) return;

    if (userSession.getUserId(socket) !== serverOwnerId) {
      // Only the owner can create accounts.
      socket.emit('register-status', 2);
      return;
    }

    if (users.has(userId)) {
      // User ID already exists.
      socket.emit('register-status', 1);
      return;
    }

    // Create Account
    createAccount(userId, password, nickname);

    // User registered successfully.
    socket.emit('register-status', { userId, password, nickname });
  });

  socket.on('login', (data) => {
    const { userId, password } = data;
    // Validate values
    if (typeof userId !== 'string' || typeof password !== 'string') return;

    // Check if user is using account
    if (bannedUsers.has(userId)) {
      const banData = bannedUsers.get(userId);
      socket.emit('login-failed', {
        reason: banData.reason,
        date: banData.date,
        msg: "You're banned!",
        code: 5,
      });
      return;
    }

    if (userSession.getUserId(socket)) {
      socket.emit('login-failed', { msg: "You're already logged in!", code: 4 });
      return;
    }

    if (userSockets.has(userId)) {
      socket.emit('login-failed', { msg: 'The account is already in use.', code: 3 });
      return;
    }

    // Validate user credentials
    if (!users.has(userId)) {
      socket.emit('login-failed', { msg: 'User does not exist.', code: 2 });
      return;
    }

    const user = users.get(userId);
    const hashedPassword = getHashString(password);
    if (user.password !== hashedPassword) {
      socket.emit('login-failed', { msg: 'Invalid user credentials.', code: 1 });
      return;
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
    socket.emit('login-success', { userId, nickname });
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
