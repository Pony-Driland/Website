import TinyHtml from 'tiny-essentials/libs/TinyHtml';
import TinyHtmlNumberInput from 'tiny-essentials/libs/TinyHtmlElems/Input/Number';

import { tinyIo } from '../software/base.mjs';
import tinyLib, { alert } from '../../files/tinyLib.mjs';

export const roomSettingsMenu = () => {
  if (tinyIo.client) {
    const room = tinyIo.client.getRoom() || {};
    const ratelimit = tinyIo.client.getRateLimit() || { size: {}, limit: {} };
    const user = tinyIo.client.getUser() || {};
    const cantEdit = room.ownerId !== tinyIo.client.getUserId() && !user.isOwner;

    const $root = TinyHtml.createFrom('div');

    const $formContainer = TinyHtml.createFrom('div').addClass('mb-4');
    const $editError = TinyHtml.createFrom('div').addClass('text-danger small mt-2');
    const $deleteError = TinyHtml.createFrom('div').addClass('text-danger small mt-2');

    // ─── Edit room ───────────────────────────────
    const $editForm = TinyHtml.createFrom('form').addClass('mb-4');
    $editForm.append(TinyHtml.createFrom('h5').setText('Edit Room Info'));

    const roomEditDetector = (data) => {
      if (typeof data.title === 'string') $roomTitle.setVal(data.title);
      if (typeof data.maxUsers === 'number') $maxUsers.setVal(data.maxUsers);
      if (typeof data.chapter === 'number') $chapter.setVal(data.chapter);
    };

    tinyIo.client.on('roomUpdates', roomEditDetector);

    const $roomId = TinyHtml.createFrom('input')
      .setAttr({
        type: 'text',
        id: 'roomId',
        placeholder: 'Enter new room title',
        maxLength: ratelimit.size.roomId,
      })
      .addProp('disabled')
      .addClass('form-control')
      .addClass('form-control')
      .setVal(tinyIo.client.getRoomId());

    const $roomTitle = TinyHtml.createFrom('input')
      .setAttr({
        type: 'text',
        id: 'roomTitle',
        placeholder: 'Enter new room title',
        maxLength: ratelimit.size.roomTitle,
      })
      .addClass('form-control')
      .setVal(room.title)
      .toggleProp('disabled', cantEdit);

    const $maxUsers = new TinyHtmlNumberInput({
      value: room.maxUsers,
      min: 1,
      max: ratelimit.limit.roomUsers,
      placeholder: 'Maximum number of users',
      mainClass: 'form-control',
    }).toggleProp('disabled', cantEdit);

    const $chapter = new TinyHtmlNumberInput({
      value: room.chapter,
      min: 1,
      placeholder: 'The chapter number',
      mainClass: 'form-control',
    }).toggleProp('disabled', cantEdit);

    $editForm.append(
      TinyHtml.createFrom('div')
        .addClass('row mb-3')
        .append(
          TinyHtml.createFrom('div')
            .addClass('col-md-6')
            .append(
              TinyHtml.createFrom('label')
                .setAttr('for', 'roomId')
                .addClass('form-label')
                .setText('Room ID'),
              $roomId,
            ),
          TinyHtml.createFrom('div')
            .addClass('col-md-6')
            .append(
              TinyHtml.createFrom('label')
                .setAttr('for', 'roomTitle')
                .addClass('form-label')
                .setText('Room Title'),
              $roomTitle,
            ),
        ),
    );

    $editForm.append(
      TinyHtml.createFrom('div')
        .addClass('row mb-3')
        .append(
          // Max users
          TinyHtml.createFrom('div')
            .addClass('col-md-6')
            .append(
              TinyHtml.createFrom('label')
                .setAttr('for', 'maxUsers')
                .addClass('form-label')
                .setText('Max Users'),
              $maxUsers,
            ),

          // Max users
          TinyHtml.createFrom('div')
            .addClass('col-md-6')
            .append(
              TinyHtml.createFrom('label')
                .setAttr('for', 'chapter')
                .addClass('form-label')
                .setText('Chapter'),
              $chapter,
            ),
        ),
    );

    // New password
    $editForm.append(
      TinyHtml.createFrom('div')
        .addClass('mb-3')
        .append(
          TinyHtml.createFrom('label')
            .setAttr('for', 'roomPassword')
            .addClass('form-label')
            .setText('New Room Password'),
          TinyHtml.createFrom('input')
            .setAttr({
              type: 'password',
              id: 'roomPassword',
              placeholder: 'Leave empty to keep current password',
              maxLength: ratelimit.size.password,
            })
            .addClass('form-control')
            .toggleProp('disabled', cantEdit),
        ),
    );

    // Submit
    $editForm.append(
      TinyHtml.createFrom('button')
        .setAttr('type', 'submit')
        .addClass('btn btn-primary')
        .setText('Save Changes')
        .toggleProp('disabled', cantEdit),
    );

    // ─── Delete room ─────────────────────────────
    const $deleteSection = TinyHtml.createFrom('div').addClass('border-top pt-4');

    $deleteSection.append(
      TinyHtml.createFrom('h5').addClass('text-danger').setText('Delete Room'),
      TinyHtml.createFrom('p')
        .addClass('text-muted mb-2')
        .setHtml(
          'This action <strong>cannot be undone</strong>. Deleting this room will remove all its data permanently.',
        ),
    );

    const $deleteForm = TinyHtml.createFrom('form').addClass('d-flex flex-column gap-2');

    // Your password
    $deleteForm.append(
      TinyHtml.createFrom('div').append(
        TinyHtml.createFrom('label')
          .setAttr('for', 'ownerPassword')
          .addClass('form-label')
          .setText('Enter your current password to confirm:'),
        TinyHtml.createFrom('input')
          .setAttr({
            type: 'password',
            id: 'ownerPassword',
            placeholder: 'Current account password',
            maxLength: ratelimit.size.password,
          })
          .addClass('form-control')
          .toggleProp('disabled', cantEdit),
      ),
    );

    // Delete now
    $deleteForm.append(
      TinyHtml.createFrom('button')
        .setAttr('type', 'submit')
        .addClass('btn btn-danger mt-2')
        .setText('Delete Room Permanently')
        .toggleProp('disabled', cantEdit),
    );

    $deleteSection.append($deleteForm);

    // ─── Container time ───────────────────────────────
    $formContainer.append($editForm, $deleteSection);

    // ─── Add into the DOM ───
    $root.append($formContainer);

    $editForm.append($editError);
    $deleteForm.append($deleteError);

    // Start modal
    const { modal, html } = tinyLib.modal({
      title: 'Room Settings',
      dialog: 'modal-lg',
      id: 'user-manager',
      body: $root,
    });

    $editForm.on('submit', (e) => {
      e.preventDefault();
      if (!cantEdit) {
        $editError.empty(); // limpa erros anteriores

        const title = $roomTitle.val().trim();
        const maxUsers = $maxUsers.valNb();
        const chapter = $chapter.valNb();
        const password = new TinyHtml($editForm.find('#roomPassword')).val().trim();

        if (Number.isNaN(maxUsers) || maxUsers <= 0) {
          $editError.setText('Max users must be a positive number.');
          return;
        }

        if (maxUsers > 50) {
          $editError.setText('Max users cannot exceed 50.');
          return;
        }

        if (chapter < 1) {
          $editError.setText('Chapter must be a positive number.');
          return;
        }

        const newSettings = { title, maxUsers, chapter };
        if (typeof password === 'string' && password.length > 0) newSettings.password = password;

        modal.hide();
        tinyIo.client.updateRoomSettings(newSettings).then((result) => {
          if (result.error) alert(`${result.msg}\nCode ${result.code}`);
          else alert('Your room settings has been changed successfully!');
        });
      }
    });

    $deleteForm.on('submit', (e) => {
      e.preventDefault();
      if (!cantEdit) {
        $deleteError.empty(); // limpa erros anteriores

        const password = new TinyHtml($deleteForm.find('#ownerPassword')).valTxt().trim();

        if (!password) {
          $deleteError.setText('Please enter your current password.');
          return;
        }

        if (!confirm('Are you absolutely sure? This cannot be undone.')) return;

        modal.hide();
        tinyIo.client.deleteRoom(password).then((result) => {
          if (result.error) alert(`${result.msg}\nCode ${result.code}`);
          else alert('Your room has been deleted successfully!');
        });
      }
    });

    // Close modal
    html.on('hidden.bs.modal', () => {
      tinyIo.client.off('roomUpdates', roomEditDetector);
    });
  }
};
