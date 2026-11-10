import TinyHtml from 'tiny-essentials/libs/html/TinyHtml';
import TinyMap from '../TinyMap.mjs';
import tinyLib from '../../files/tinyLib.mjs';
import { contentEnabler } from '../software/enablerContent.mjs';

/**
 * Opens the classic map viewer for the current room.
 *
 * The map is read from the RPG data stored in the room schema. When the room
 * has no map configured, the user is informed through an alert instead.
 *
 * @returns {void}
 * @throws {Error} If the RPG data is not available when the map is opened.
 */
export const openClassicMap = () => {
  /**
   * @param {'public'|'private'} place - Which map set to render.
   * @returns {void}
   */
  const startTinyMap = (place) => {
    const rpgData = contentEnabler.rpgData;
    if (!rpgData) throw new Error('INVALID RPG DATA!');
    const editor = rpgData.data[place];
    if (!editor) throw new Error('INVALID RPG EDITOR!');
    // Get Map Data
    /** @type {(import('../../ai/software/rpgData.mjs').RpgDataValues)|null} */
    let maps = null;
    /** @type {string} */
    let location = '';
    /** @type {NonNullable<ConstructorParameters<typeof TinyMap>[2]>} */
    let items = [];
    try {
      maps = editor.getEditor('root.settings.maps')?.getValue() ?? null;
      const rawLocation = editor.getEditor('root.location')?.getValue();
      if (typeof rawLocation === 'string') location = rawLocation;
      const rawItems = editor.getEditor('root.settings.items')?.getValue();
      if (Array.isArray(rawItems)) items = rawItems;
    } catch (e) {
      maps = null;
      console.error(e);
      alert(e instanceof Error ? e.message : 'Unknown error');
    }

    // Exist Map
    tinyHtml.empty();
    try {
      if (Array.isArray(maps)) {
        for (const index in maps) {
          const map = new TinyMap(
            /** @type {ConstructorParameters<typeof TinyMap>[0]} */ (maps[index]),
            false,
            items,
          );
          map.setLocation(location);
          map.buildMap(true);
          tinyHtml.append(
            map.getMapBaseHtml(),
            TinyHtml.createFrom('center').append(map.getMapButton()),
          );
        }
      }
    } catch (e) {
      // No Map
      console.error(e);
      tinyHtml.empty();
    }
  };

  const tinyHtml = TinyHtml.createFrom('span');
  const tinyHr = TinyHtml.createFrom('hr', { class: 'my-5 d-none' });
  tinyLib.modal({
    title: 'Maps',
    dialog: 'modal-lg',
    id: 'tinyMaps',
    body: [
      tinyHtml,
      tinyHr,
      TinyHtml.createFrom('center').append(
        // Public Maps
        tinyLib.bs
          .button('secondary m-2')
          .setText('Public')
          .on('click', () => {
            tinyHr.removeClass('d-none');
            startTinyMap('public');
          }),
        // Private Maps
        tinyLib.bs
          .button('secondary m-2')
          .setText('Private')
          .on('click', () => {
            tinyHr.removeClass('d-none');
            startTinyMap('private');
          }),
      ),
    ],
  });
};
