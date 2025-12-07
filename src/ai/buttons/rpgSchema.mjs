import TinyHtml from 'tiny-essentials/libs/TinyHtml';
import TinyHtmlElems from 'tiny-essentials/libs/TinyHtmlElems';
import { isJsonObject } from 'tiny-essentials/basics';

import { tinyIo } from '../software/base.mjs';
import tinyLib, { alert } from '../../files/tinyLib.mjs';
import { loaderScreen } from '../../important.mjs';

const { Textarea } = TinyHtmlElems;

export const rpgSchemaSettingsMenu = () => {
  if (tinyIo.client) {
    const room = tinyIo.client.getRoom() || {};
    const roomSchema = tinyIo.client.getRpgSchema() || {};
    // const ratelimit = tinyIo.client.getRateLimit() || { size: {}, limit: {} };
    const user = tinyIo.client.getUser() || {};
    const cantEdit = room.ownerId !== tinyIo.client.getUserId() && !user.isOwner;

    const $root = TinyHtml.createFrom('div');

    const $formContainer = TinyHtml.createFrom('div').addClass('mb-4');
    const $editError = TinyHtml.createFrom('div').addClass('text-danger small mt-2');

    // ─── Edit room ───────────────────────────────
    const $editForm = TinyHtml.createFrom('form').addClass('mb-4');
    $editForm.append(TinyHtml.createFrom('h5').setText('Edit Room Schema'));

    const roomEditDetector = (data) => {
      if (isJsonObject(data)) $roomSchema.setVal(JSON.stringify(data, null, 2));
    };

    tinyIo.client.on('rpgSchemaUpdates', roomEditDetector);

    const $roomSchema = new Textarea({
      value: JSON.stringify(roomSchema, null, 2),
      placeholder: 'Enter new schema data',
      disabled: cantEdit,
      mainClass: 'form-control',
      // maxLength: ratelimit.size.,
    });

    // Submit
    $editForm.append(
      $roomSchema,
      TinyHtml.createFrom('center', { class: 'mt-2' }).append(
        TinyHtml.createFrom('button')
          .setAttr('type', 'submit')
          .addClass('btn btn-primary')
          .setText('Save Changes')
          .toggleProp('disabled', cantEdit),
      ),
    );

    // ─── Container time ───────────────────────────────
    $formContainer.append($editForm);

    // ─── Add into the DOM ───
    $root.append($formContainer);
    $editForm.append($editError);

    // Start modal
    const { modal, html } = tinyLib.modal({
      title: 'Room Schema',
      dialog: 'modal-lg',
      id: 'room-schama',
      body: $root,
    });

    $editForm.on('submit', (e) => {
      e.preventDefault();
      if (!cantEdit) {
        $editError.empty(); // limpa erros anteriores

        const newData = $roomSchema.val().trim();
        let jsonResult;
        try {
          jsonResult = JSON.parse(newData);
        } catch (err) {
          $editError.setText(`${err.message}`);
          console.error(err);
          jsonResult = null;
        }

        if (jsonResult) {
          loaderScreen.start();
          tinyIo.client
            .updateRpgSchema(jsonResult)
            .then((result) => {
              if (result.error) {
                $editError.setText(`${result.msg}\nCode ${result.code}`);
              } else {
                modal.hide();
                alert('Your room schema has been changed successfully!');
              }
              loaderScreen.stop();
            })
            .catch((err) => {
              $editError.setText(`${err.message}`);
              console.error(err);
              loaderScreen.stop();
            });
        }
      }
    });

    // Close modal
    html.on('hidden.bs.modal', () => {
      tinyIo.client.off('rpgSchemaUpdates', roomEditDetector);
    });
  }
};
