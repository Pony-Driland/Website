import clone from 'clone';
import TinyHtml from 'tiny-essentials/libs/TinyHtml';

import { tinyIo } from '../software/base.mjs';
import tinyLib from '../../files/tinyLib.mjs';
import UserRoomManager from '../RoomUserManagerUI.mjs';

export const userButtonActions = () => {
  if (tinyIo.client) {
    const $root = TinyHtml.createFrom('div');

    // Start modal
    const { html } = tinyLib.modal({
      title: 'User manager',
      dialog: 'modal-lg',
      id: 'user-manager',
      body: $root,
    });

    // Start user room data
    const user = tinyIo.client.getUser() || {};
    const room = tinyIo.client.getRoom() || {};
    const userManager = new UserRoomManager({
      client: tinyIo.client,
      currentUserId: user.userId,
      isOwner: user.userId === room.ownerId,
      root: $root,
      users: clone(tinyIo.client.getUsers()),
      moderators: [],
    });

    const mods = tinyIo.client.getMods() || [];
    for (const userId of mods) userManager.promoteModerator(userId);

    userManager.setRoomStatus(!room.disabled);

    // Add events
    const usersAdded = (data) => userManager.addUser(data.userId, clone(data.data));
    const usersRemoved = (userId) => userManager.removeUser(userId);
    const userModUpdated = (type, userId) => {
      if (type === 'add') userManager.promoteModerator(userId);
      if (type === 'remove') userManager.demoteModerator(userId);
    };
    const roomStatusUpdate = (roomData) => {
      userManager.setRoomStatus(!roomData.disabled);
    };

    // const userUpdated = (data) => console.log(data);

    tinyIo.client.on('userPing', usersAdded);
    tinyIo.client.on('userJoined', usersAdded);
    tinyIo.client.on('userLeft', usersRemoved);
    tinyIo.client.on('userKicked', usersRemoved);
    tinyIo.client.on('userBanned', usersRemoved);
    tinyIo.client.on('roomModChange', userModUpdated);
    tinyIo.client.on('roomUpdates', roomStatusUpdate);
    // tinyIo.client.on('userUpdated', userUpdated);

    // Close modal
    html.on('hidden.bs.modal', () => {
      tinyIo.client.off('userPing', usersAdded);
      tinyIo.client.off('userJoined', usersAdded);
      tinyIo.client.off('userLeft', usersRemoved);
      tinyIo.client.off('userKicked', usersRemoved);
      tinyIo.client.off('userBanned', usersRemoved);
      tinyIo.client.off('roomModChange', userModUpdated);
      tinyIo.client.off('roomUpdates', roomStatusUpdate);
      // tinyIo.client.off('userUpdated', userUpdated);
      userManager.destroy();
    });
  }
};
