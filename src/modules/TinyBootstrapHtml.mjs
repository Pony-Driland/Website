import TinyHtml from 'tiny-essentials/libs/html/TinyHtml';
import Button from 'tiny-essentials/libs/html/TinyHtmlElems/Button';

/**
 * @import { TinyHtmlAny } from 'tiny-essentials/libs/html/TinyHtml';
 */

/**
 * @param {string | Element | TinyHtmlAny} label
 * @returns {Button}
 */
export const bsButton = (label) => new Button({ label: label, mainClass: 'btn' });
