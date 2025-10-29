import TinyHtml from 'tiny-essentials/libs/TinyHtml';
import TinyMap from '../TinyMap.mjs';
import tinyLib from '../../files/tinyLib.mjs';
import { contentEnabler } from '../software/enablerContent.mjs';

export const openClassicMap = () => {
  const startTinyMap = (place) => {
    const rpgData = contentEnabler.rpgData;
    if (!rpgData) throw new Error('INVALID RPG DATA!');
    // Get Map Data
    let maps;
    let location;
    try {
      maps = rpgData.data[place].getEditor('root.settings.maps').getValue();
      location = rpgData.data[place].getEditor('root.location').getValue();
    } catch (e) {
      maps = null;
    }

    // Exist Map
    tinyHtml.empty();
    try {
      if (Array.isArray(maps)) {
        for (const index in maps) {
          const map = new TinyMap(maps[index]);
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
