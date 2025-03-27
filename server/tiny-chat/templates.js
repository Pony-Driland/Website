// Define a default room for testing
const templates = {
  message: {
    password: 'roompassword', // Room password
    maxUsers: 50, // Max users allowed in the room
    ownerId: 'owner456', // Secondary room owner
    roomModerators: new Set(['roomMod1', 'roomMod2']), // Room-specific moderators
    users: new Set(), // Track users in this room
    last_index: 0,
  },
  user: {
    password: 'password',
    nickname: 'nickname',
  },
};
