import TinyHtml from 'tiny-essentials/libs/TinyHtml';
import tinyLib from '../../files/tinyLib.mjs';

export const openDonatePage = () => {
  const $container = TinyHtml.createFrom('div').addClass('text-center');
  $container.append(
    TinyHtml.createFrom('p', { class: 'made-by-ai' }).setHtml(
      'This project took <strong>months of dedication</strong> and many <em>sleepless nights</em>.',
    ),
  );

  $container.append(
    TinyHtml.createFrom('p', { class: 'made-by-ai m-0' }).setHtml(
      'If you enjoyed all the love and effort I put into this <strong>super AI roleplay project</strong>,',
    ),
  );

  $container.append(
    TinyHtml.createFrom('p', { class: 'made-by-ai' }).setHtml(
      'I warmly invite you to support it with a <strong>voluntary donation</strong>',
    ),
  );

  $container.append(
    TinyHtml.createFrom('p', { class: 'made-by-ai m-0' }).setHtml(
      'I accept both <strong>traditional currencies</strong> and <strong>cryptocurrencies</strong> as donation methods',
    ),
  );

  $container.append(
    TinyHtml.createFrom('p', { class: 'made-by-ai' }).setHtml(
      'Thank you for helping this tiny magical project grow! 🎁💕',
    ),
  );

  const patreonNames = ['Jimm'];

  const $thankYouBox = TinyHtml.createFrom('div').addClass('patreon-thankyou');

  const $thankYouText = TinyHtml.createFrom('p').setText(
    'Tiny magic moment to thank these magical patreons which supports the tiny fic:',
  );
  const $ul = TinyHtml.createFrom('ul', { class: 'list-unstyled' });

  patreonNames.forEach((name) => {
    const $nameSpan = TinyHtml.createFrom('span').addClass('magic-name').setText(name);
    const $li = TinyHtml.createFrom('li').append($nameSpan);
    $ul.append($li);
  });

  $thankYouBox.append($thankYouText, $ul);
  $container.append($thankYouBox);

  tinyLib.modal({
    title: 'Tiny Donations!',
    dialog: 'modal-lg',
    id: 'modal-donate',
    body: $container.append(
      TinyHtml.createFrom('div', { class: 'donation-highlight' }).append(
        TinyHtml.createFrom('img', {
          class: 'd-block w-100',
          src: '/img/ai-example/2025-04-09_06-48.jpg',
        }),
      ),
    ),
  });
};
