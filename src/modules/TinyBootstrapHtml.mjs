import TinyHtml from 'tiny-essentials/libs/html/TinyHtml';
import Button from 'tiny-essentials/libs/html/TinyHtmlElems/Button';

/**
 * @param {string | Element | TinyHtml<any>} label
 * @returns {Button}
 */
export const bsButton = (label) => new Button({ label: label, mainClass: 'btn' });
