import TinyHtml from 'tiny-essentials/libs/TinyHtml';
import { isJsonObject } from 'tiny-essentials/basics';

import { tinyIo } from '../software/base.mjs';
import { isOnline } from '../software/enablerContent.mjs';
import tinyLib from '../../files/tinyLib.mjs';

export const openDiceHistory = () => {
  // Start modal
  tinyLib.modal({
    title: 'Dice Roll',
    dialog: 'modal-lg',
    id: 'dice-roll',
    body: $root,
  });
};
