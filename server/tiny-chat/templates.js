// Define a default room for testing
const templates = {
  message: {
    password: 'roompassword', // Room password
    maxUsers: 50, // Max users allowed in the room
    ownerId: 'owner456', // Secondary room owner
    moderators: new Set(['roomMod1', 'roomMod2']), // Room-specific moderators
    last_index: 0,
  },
  user: {
    password: 'password',
    nickname: 'nickname',
  },
  moderators: {
    reason: 'Yay',
    date: Date.now(),
  },
  banned: {
    reason: 'Yay',
    date: Date.now(),
  },
};
