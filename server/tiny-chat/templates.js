// Define a default room for testing
const templates = {
  room: {
    title: '',
    password: 'roompassword', // Room password
    maxUsers: 50, // Max users allowed in the room
    ownerId: 'owner456',
    moderators: new Set(['roomMod1', 'roomMod2']), // Room-specific moderators
    banned: new Set(['user1', 'user2']),
    disabled: false,
    last_index: 0,
  },
  history: {
    userId: 'user',
    text: 'message',
    date: Date.now(),
    edited: Date.now(),
  },
  users: {
    password: 'password',
    nickname: 'nickname',
  },
  moderators: {
    reason: 'Yay',
    date: Date.now(),
  },
  bannedUsers: {
    reason: 'Yay',
    date: Date.now(),
  },
  privateRoomData: {},
  roomData: {},
};
