import TinyHtml from 'tiny-essentials/libs/TinyHtml';
import TinyHtmlElems from 'tiny-essentials/libs/TinyHtmlElems';

import tinyLib from '../../files/tinyLib.mjs';
import { storyData } from '../../files/chapters.mjs';
import { saveRoleplayFormat } from '../../start.mjs';
import storyCfg from '../../chapters/config.mjs';

const { Icon } = TinyHtmlElems;

export const openDownloadsList = () => {
  const body = TinyHtml.createFrom('div');
  body.append(
    TinyHtml.createFrom('h3')
      .setText(`Download Content`)
      .prepend(new Icon('fa-solid fa-download me-3'))
      .append(
        tinyLib.bs
          .button('info btn-sm ms-3')
          .setText('Save As all chapters')
          .on('click', () => saveRoleplayFormat()),
      ),
    TinyHtml.createFrom('h5')
      .setText(
        `Here you can download the official content of fic to produce unofficial content dedicated to artificial intelligence.`,
      )
      .append(
        TinyHtml.createFrom('br'),
        TinyHtml.createFrom('small').setText(
          'Remember that you are downloading the uncensored version.',
        ),
      ),
  );

  for (let i = 0; i < storyData.chapter.amount; i++) {
    // Chapter Number
    const chapter = String(i + 1);
    const tinyClick = TinyHtml.createFrom('a', {
      class: 'btn btn-primary m-2 me-0 btn-sm',
      href: `/chapter/${chapter}.html`,
      chapter: chapter,
    });

    // Add Chapter
    body.append(
      TinyHtml.createFrom('div', { class: 'card' }).append(
        TinyHtml.createFrom('div', { class: 'card-body' }).append(
          TinyHtml.createFrom('h5', { class: 'card-title m-0' })
            .setText(`Chapter ${chapter} - `)
            .append(
              TinyHtml.createFrom('small').setText(storyCfg.chapterName[chapter].title),

              tinyClick
                .on('click', (e) => {
                  e.preventDefault();
                  // Save Chapter
                  saveRoleplayFormat(Number(tinyClick.attr('chapter')));
                })
                .setText('Save as'),
            ),
        ),
      ),
    );
  }

  body.append(
    TinyHtml.createFrom('p', { class: 'm-0' }).setText(
      `This content is ready for AI to know which lines of text, chapters, day number, weather, location on any part of the fic you ask. The website script will convert all content to be easily understood by AI languages.`,
    ),
  );

  tinyLib.modal({
    id: 'ai_downloads',
    title: 'AI Downloads',
    dialog: 'modal-lg',
    body,
  });
};
