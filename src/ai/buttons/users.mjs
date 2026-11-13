import TinyHtml from 'tiny-essentials/libs/html/TinyHtml';

import { tinyIo } from '../software/base.mjs';
import tinyLib from '../../files/tinyLib.mjs';
import UserRoomManager from '../RoomUserManagerUI.mjs';

/**
 * Opens the user manager modal, which lists the users in the current room and
 * exposes the moderation actions available to the signed-in account.
 *
 * Does nothing when there is no active socket client.
 *
 * @returns {void}
 */
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
      currentUserId: user.userId ?? '',
      isOwner: user.userId === room.ownerId,
      root: $root,
      users: structuredClone(tinyIo.client.getUsers()),
      moderators: [],
      permissions: tinyIo.client.getPermissions(),
    });

    const mods = tinyIo.client.getMods() || [];
    for (const userId of mods) userManager.promoteModerator(userId);

    userManager.setRoomStatus(!room.disabled);
    userManager.setReadonly(Boolean(room.readOnly));

    // Add events
    /** @param {{ userId: string, data: { nickname?: string, ping: string|number|Date } }} data */
    const usersAdded = (data) => userManager.addUser(data.userId, structuredClone(data.data));
    /** @param {string} userId */
    const usersRemoved = (userId) => userManager.removeUser(userId);
    /**
     * @param {'add'|'remove'} type
     * @param {string} userId
     */
    const userModUpdated = (type, userId) => {
      if (type === 'add') userManager.promoteModerator(userId);
      if (type === 'remove') userManager.demoteModerator(userId);
    };
    /** @param {{ disabled?: boolean, readOnly: boolean }} roomData */
    const roomStatusUpdate = (roomData) => {
      userManager.setRoomStatus(!roomData.disabled);
      userManager.setReadonly(roomData.readOnly);
    };
    /** @param {RoomPermissionEntry[]} permissions */
    const permissionUpdated = (permissions) => userManager.setPermissions(permissions);

    // const userUpdated = (data) => console.log(data);

    tinyIo.client.on('userPing', usersAdded);
    tinyIo.client.on('userJoined', usersAdded);
    tinyIo.client.on('userLeft', usersRemoved);
    tinyIo.client.on('userKicked', usersRemoved);
    tinyIo.client.on('userBanned', usersRemoved);
    tinyIo.client.on('roomModChange', userModUpdated);
    tinyIo.client.on('roomUpdates', roomStatusUpdate);
    tinyIo.client.on('roomPermissionChange', permissionUpdated);
    // tinyIo.client.on('userUpdated', userUpdated);

    // Close modal
    html.on('hidden.bs.modal', () => {
      const client = tinyIo.client;
      if (!client) return;
      client.off('userPing', usersAdded);
      client.off('userJoined', usersAdded);
      client.off('userLeft', usersRemoved);
      client.off('userKicked', usersRemoved);
      client.off('userBanned', usersRemoved);
      client.off('roomModChange', userModUpdated);
      client.off('roomUpdates', roomStatusUpdate);
      client.off('roomPermissionChange', permissionUpdated);
      // client.off('userUpdated', userUpdated);
      userManager.destroy();
    });
  }
};
