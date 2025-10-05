import objHash from 'object-hash';
import { countObj, toTitleCase } from 'tiny-essentials/basics';
import TinyHtml from 'tiny-essentials/libs/TinyHtml';
import TinyHtmlElems from 'tiny-essentials/libs/TinyHtmlElems';
import paginateArray from 'paginate-array';

import { isNoNsfw, loaderScreen, tinyLs } from '../important.mjs';
import tinyLib, { alert } from '../files/tinyLib.mjs';
import { storyData } from '../files/chapters.mjs';
import cacheChapterUpdater from './updater.mjs';
import musicManager from './music/index.mjs';
import storyCfg from '../chapters/config.mjs';
import BootstrapPaginator from '../modules/bootstrap-paginator.mjs';
import { Tooltip } from '../modules/TinyBootstrap.mjs';
import { clearFicData, urlUpdate } from '../fixStuff/markdown.mjs';
import { body, tinyWin } from '../html/query.mjs';
import { markdownBase } from '../html/base.mjs';

const { Icon, Button, Anchor } = TinyHtmlElems;

/*  Rain made by Aaron Rickle */
const rainConfig = {};
(() => {
  var increment = 0;
  rainConfig.drops = '';
  rainConfig.backDrops = '';
  while (increment < 100) {
    //couple random numbers to use for various randomizations
    //random number between 98 and 1
    var randoHundo = Math.floor(Math.random() * (98 - 1 + 1) + 1);
    //random number between 5 and 2
    var randoFiver = Math.floor(Math.random() * (5 - 2 + 1) + 2);
    //increment
    increment += randoFiver;
    //add in a new raindrop with various randomizations to certain CSS properties
    rainConfig.drops +=
      '<div class="drop" style="left: ' +
      increment +
      '%; bottom: ' +
      (randoFiver + randoFiver - 1 + 100) +
      '%; animation-delay: 0.' +
      randoHundo +
      's; animation-duration: 0.5' +
      randoHundo +
      's;"><div class="stem" style="animation-delay: 0.' +
      randoHundo +
      's; animation-duration: 0.5' +
      randoHundo +
      's;"></div><div class="splat" style="animation-delay: 0.' +
      randoHundo +
      's; animation-duration: 0.5' +
      randoHundo +
      's;"></div></div>';
    rainConfig.backDrops +=
      '<div class="drop" style="right: ' +
      increment +
      '%; bottom: ' +
      (randoFiver + randoFiver - 1 + 100) +
      '%; animation-delay: 0.' +
      randoHundo +
      's; animation-duration: 0.5' +
      randoHundo +
      's;"><div class="stem" style="animation-delay: 0.' +
      randoHundo +
      's; animation-duration: 0.5' +
      randoHundo +
      's;"></div><div class="splat" style="animation-delay: 0.' +
      randoHundo +
      's; animation-duration: 0.5' +
      randoHundo +
      's;"></div></div>';
  }

  return;
})();

// Start Rain
const rainMode = {
  start: () => {
    TinyHtml.queryAll('.rain').empty();
    TinyHtml.queryAll('.rain.front-row').append(TinyHtml.createFromHTML(rainConfig.drops));
    TinyHtml.queryAll('.rain.back-row').append(TinyHtml.createFromHTML(rainConfig.backDrops));
  },

  on: () => {
    body.addClass('raining-sky');
  },

  off: () => {
    body.addClass('raining-sky');
  },
};

const storyDialogue = {
  // Extract Ai tag (script created by ChatGPT)
  extractAiTags: (input) => {
    const regex = /(<ai>(.*?)<\/ai>|[^<]+)/gs;
    const result = [];
    let match;
    let previousIndex = null;

    while ((match = regex.exec(input)) !== null) {
      const text = match[2] !== undefined ? match[2] : match[0];
      const isInsideAiTag = match[2] !== undefined;
      const hasLeadingSpace = text.startsWith(' ');
      const hasTrailingSpace = text.endsWith(' ');

      if (previousIndex !== null && hasLeadingSpace) {
        result[previousIndex][3] = true; // Pass the initial space to the previous element
      }

      result.push([text.trim(), isInsideAiTag, false, hasTrailingSpace]);
      previousIndex = result.length - 1;
    }

    return result;
  },

  // Template
  template: (data, line, items, type, msgTag, baseWidth = null, baseName = '') => {
    const message = storyDialogue.nsfwChecker(data);
    if (message) {
      // Get text html
      const text = storyDialogue.extractAiTags(message).map((txt) =>
        TinyHtml.createFrom('span', {
          class: txt[1] ? 'made-by-ai' : '',
        }).setText(`${txt[2] ? ' ' : ''}${txt[0]}${txt[3] ? ' ' : ''}`),
      );

      // Insert html
      storyData.chapter.html[line] = TinyHtml.createFrom('tr', { line: line }).append(
        // Line number
        TinyHtml.createFrom('td', {
          class: 'py-4 font-weight-bold d-none d-md-table-cell text-white text-center',
        }).setText(line),

        // Type base
        TinyHtml.createFrom('td', { class: 'py-4 text-white text-center', width: baseWidth })
          .setText(baseName)
          .prepend(
            TinyHtml.createFrom('span', { class: 'badge bg-secondary' }).setText(
              `${type}${data.flashback ? ` (Flashback)` : ''}`,
            ),
            baseName ? TinyHtml.createFrom('br') : null,
          ),

        // Text
        TinyHtml.createFrom('td', { class: 'py-4 text-break text-white' }).append(
          TinyHtml.createFrom(msgTag, { class: 'text-break' }).append(text),
        ),
      );

      items.push(storyData.chapter.html[line]);
    }
  },

  // Mature Content Checker
  nsfwChecker: (data) => {
    if (Array.isArray(data.nsfw)) {
      let nsfwValue = false;
      for (const item in data.nsfw) {
        nsfwValue = TinyHtml.boolCheck(tinyLs.getItem('NSFW' + data.nsfw[item]));
        if (nsfwValue) {
          break;
        }
      }

      if (nsfwValue) {
        return typeof data.value === 'string' ? data.value : null;
      } else {
        return typeof data.value_alternative === 'string' ? data.value_alternative : null;
      }
    } else {
      return typeof data.value === 'string' ? data.value : null;
    }
  },

  // Action
  action: (line, items, data) => storyDialogue.template(data, line, items, 'Action', 'strong'),

  // Dialogue
  dialogue: (line, items, data) =>
    storyDialogue.template(data, line, items, 'Character', 'span', '15%', data.character),

  // Telepathy
  telepathy: (line, items, data) =>
    storyDialogue.template(data, line, items, 'Telepathy', 'small', '15%', data.character),

  // Think
  think: (line, items, data) =>
    storyDialogue.template(data, line, items, 'Thought', 'small', '15%', data.character),
};

export const openChapterMenu = (params = {}) => {
  // Prepare Data
  clearFicData();
  markdownBase.empty();
  storyData.chapter.blockLineSave = false;

  // Get Page Data
  const getPageData = (line, chapter) => {
    // Prepare data
    let page = 1;
    let selectedLine = null;
    const filtedItems = [];
    // Validator
    if (
      typeof storyData.chapter.bookmark[chapter] === 'number' &&
      storyData.chapter.bookmark[chapter] !== 1
    ) {
      // Update Line
      if (line === null) selectedLine = storyData.chapter.bookmark[chapter];
      else selectedLine = line;

      // Read Data
      let counter = 1;
      for (const i in storyData.data[chapter]) {
        if (storyDialogue.nsfwChecker(storyData.data[chapter][i])) {
          if (i < selectedLine) {
            // Reset
            if (counter > storyCfg.itemsPerPage) {
              counter = 1;
              page++;
            }
            // Counter Update
            counter++;
          }
          // Add item
          filtedItems.push({
            content: storyData.data[chapter][i],
            line: Number(i) + 1,
          });
        }
      }
    }

    // Add item
    else {
      for (const index in storyData.data[chapter]) {
        if (storyDialogue.nsfwChecker(storyData.data[chapter][index])) {
          filtedItems.push({
            content: storyData.data[chapter][index],
            line: Number(index) + 1,
          });
        }
      }
    }

    // Complete
    return { page, selectedLine, filtedItems };
  };

  // Insert table data
  const insertTableData = (table, pagination) => {
    // Reset Item
    storyData.chapter.html = {};
    table.empty();

    // Items
    const items = [];

    // Insert Items
    const numberPag = Number(pagination.perPage * Number(pagination.currentPage - 1));
    for (const item in pagination.data) {
      const pagData = pagination.data[item].content;
      if (typeof storyDialogue[pagData.type] === 'function') {
        storyDialogue[pagData.type](pagination.data[item].line, items, pagData);
      }
    }

    // Update Data
    cacheChapterUpdater.data(numberPag + 1);

    // Insert
    table.append(items);
  };

  // New Read
  const newRead = async (chapter = 1, selectedLine = null) => {
    // Clear Update Warn
    TinyHtml.query('#fic-start')?.setText('Read Fic').prepend(new Icon('fab fa-readme me-2'));

    // Load Sounds
    if (storyCfg.sfx) {
      console.log(`Loading Audio Data...`);
      loaderScreen.start(`Loading audio data...`);

      if (!storyData.sfx) storyData.sfx = {};
      const countAudioTotal = countObj(storyCfg.sfx);
      let countAudio = 0;
      for (const item in storyCfg.sfx) {
        countAudio++;
        loaderScreen.update(`Loading audio data ${countAudio}/${countAudioTotal}...`);
        if (
          !storyData.sfx[item] &&
          typeof storyCfg.sfx[item].type === 'string' &&
          typeof storyCfg.sfx[item].value === 'string'
        ) {
          if (
            storyCfg.sfx[item].type === 'file' ||
            (storyCfg.sfx[item].type === 'ipfs' &&
              storyCfg.ipfs &&
              typeof storyCfg.ipfs.host === 'string')
          ) {
            if (typeof storyCfg.sfx[item].loop !== 'boolean') {
              storyCfg.sfx[item].loop = true;
            }
            if (typeof storyCfg.sfx[item].module !== 'string') {
              storyCfg.sfx[item].module = 'all';
            }
            await musicManager
              .insertSFX(item, storyCfg.sfx[item].loop, storyCfg.sfx[item].module)
              .catch((err) => {
                console.error(err);
                alert(err.message);
              });
          }
        }
      }

      loaderScreen.stop();
      console.log(`Audio Data Loaded!`);
    }

    // Set Selected
    storyData.readFic = true;
    TinyHtml.query('#fic-chapter')?.setText(`Chapter ${chapter}`);
    storyData.chapter.selected = chapter;

    // Prepare Data
    markdownBase.empty();

    // Detect Bookmark
    const { page, filtedItems, selectedLine: line } = getPageData(selectedLine, chapter);
    storyData.chapter.ficPageData = filtedItems;

    // Save MD5
    tinyLs.setItem('chapter' + chapter + 'MD5', objHash(storyData.data[chapter]));

    // Pagination
    const pagination = paginateArray(filtedItems, page, storyCfg.itemsPerPage);

    // Items
    const table = TinyHtml.createFrom('tbody');

    /** @type {Record<string, TinyHtml[]>} */
    const tinyPag = {
      base: [],
      default: [],
      search: [],
    };

    tinyPag.base[0] = TinyHtml.createElement('div');
    tinyPag.base[1] = TinyHtml.createElement('div');

    const addDefaultPagination = (ftItems, tPage, where = 'default') => {
      tinyPag.base[0].empty();
      tinyPag.base[1].empty();

      tinyPag[where][0] = TinyHtml.createElement('nav');
      const pagination1 = new BootstrapPaginator(tinyPag[where][0], {
        listContainerClass: 'justify-content-center',
        currentPage: tPage.currentPage,
        totalPages: tPage.totalPages,
        size: 'normal',
        alignment: 'center',
        onPageChanged: () => {
          // Process Data
          const page = Number(new TinyHtml(tinyPag[where][0].find('.active')).text().trim());
          const tPage = paginateArray(ftItems, page, storyCfg.itemsPerPage);
          insertTableData(table, tPage);

          // Scroll
          TinyHtml.setWinScrollTop(TinyHtml.getById('app').offset().top);
          pagination2.show(page);
          tinyWin.trigger('scroll');
        },
      });

      tinyPag[where][1] = TinyHtml.createElement('nav');
      const pagination2 = new BootstrapPaginator(tinyPag[where][1], {
        listContainerClass: 'justify-content-center',
        currentPage: tPage.currentPage,
        totalPages: tPage.totalPages,
        size: 'normal',
        alignment: 'center',
        onPageChanged: () => {
          // Get Page
          const page = Number(new TinyHtml(tinyPag[where][1].find('.active')).text().trim());
          pagination1.show(page);
        },
      });

      tinyPag.base[0].append(tinyPag[where][0]);
      tinyPag.base[1].append(tinyPag[where][1]);
    };

    addDefaultPagination(filtedItems, pagination);
    insertTableData(table, pagination);

    // Search
    storyData.chapter.blockLineSave = false;
    const searchItems = {
      base: TinyHtml.createFrom('div', { class: 'input-group mb-3' }),
    };

    // Search checker
    const searchCheck = () => {
      // Get values
      const character = searchItems.character.val().toLowerCase();
      const message = searchItems.message.val().toLowerCase();

      // Nope
      if (character.length < 1 && message.length < 1) {
        storyData.chapter.blockLineSave = false;
        addDefaultPagination(filtedItems, pagination);
        insertTableData(table, pagination);
      }

      // Search data
      else {
        tinyPag.base[0].empty();
        tinyPag.base[1].empty();
        storyData.chapter.blockLineSave = true;

        // Add search data
        const searchResult = [];
        for (const index in storyData.data[chapter]) {
          const chapterData = storyData.data[chapter][index];
          const dialogue = storyDialogue.nsfwChecker(chapterData);
          if (
            typeof dialogue === 'string' &&
            (message.length < 1 || dialogue.toLocaleLowerCase().includes(message)) &&
            (character.length < 1 ||
              (typeof chapterData.character === 'string' &&
                chapterData.character.toLocaleLowerCase() === character))
          ) {
            searchResult.push({
              content: chapterData,
              line: Number(index) + 1,
            });
          }
        }

        // Complete
        const pagination = paginateArray(searchResult, 1, storyCfg.itemsPerPage);

        addDefaultPagination(searchResult, pagination, 'search');
        insertTableData(table, pagination);
      }

      TinyHtml.setWinScrollTop(TinyHtml.getById('app').offset().top);
      tinyWin.trigger('scroll');
    };

    searchItems.character = TinyHtml.createFrom('input', {
      type: 'text',
      class: 'form-control',
      placeholder: 'Character Name',
    });

    searchItems.message = TinyHtml.createFrom('input', {
      type: 'text',
      class: 'form-control',
      placeholder: 'Dialogue / Action',
      style: 'width: 60%',
    });

    searchItems.character.on('change', searchCheck);
    searchItems.message.on('change', searchCheck);
    searchItems.base.append(searchItems.character, searchItems.message);

    // Table
    markdownBase.append(
      // Info
      tinyLib.bs
        .alert('info')
        .setText(
          'Bold texts are action texts, small texts are thoughts of characters, common texts are dialogues or telepathy. If you are using filters to keep your reading 100% SFW, some unnecessary text lines will be automatically skipped.',
        )
        .prepend(new Icon('fas fa-info-circle me-3')),

      // Title
      TinyHtml.createFrom('h3')
        .setText(`Chapter ${chapter}`)
        .append(
          TinyHtml.createFrom('small', { class: 'ms-3' }).setText(
            storyCfg.chapterName[chapter].title,
          ),
        ),

      // Pagination
      searchItems.base,
      tinyPag.base[0],

      // Table
      TinyHtml.createFrom('table', {
        class: 'table table-bordered table-striped text-white small',
      })
        .setStyle('background-color', 'rgb(44 44 44)')
        .append([
          TinyHtml.createFrom('thead').append(
            TinyHtml.createFrom('tr').append(
              TinyHtml.createFrom('th', { class: 'd-none d-md-table-cell', scope: 'col' }).setText(
                'Line',
              ),
              TinyHtml.createFrom('th', { scope: 'col' }).setText('Type'),
              TinyHtml.createFrom('th', { scope: 'col' }).setText('Content'),
            ),
          ),
          table,
        ]),

      // Pagination
      tinyPag.base[1],

      // Night Effects
      TinyHtml.createFrom('div', { id: 'bg-sky' }).append(
        TinyHtml.createFrom('div', { class: 'flash' }),
        TinyHtml.createFrom('div', { class: 'rain front-row' }),
        TinyHtml.createFrom('div', { class: 'rain back-row' }),
        TinyHtml.createFrom('div', { class: 'stars' }),
        TinyHtml.createFrom('div', { class: 'twinkling' }),
        TinyHtml.createFrom('div', { class: 'clouds' }),
      ),
    );

    // Fic Mode
    body.addClass('ficMode');

    // Complete
    tinyWin.trigger('scroll');
    if (line !== null) {
      const tinyLine = new TinyHtml(markdownBase.find('[line="' + line + '"]'));
      if (tinyLine.size > 0) TinyHtml.setWinScrollTop(tinyLine.offset().top);
    }
    rainMode.start();
    return;
  };

  // Exist Chapter
  if (typeof params.chapter === 'string' && params.chapter.length > 0) {
    // Fix Line
    if (params.line) {
      params.line = Number(params.line);
      if (
        typeof params.line !== 'number' ||
        isNaN(params.line) ||
        !isFinite(params.line) ||
        params.line < 1
      ) {
        params.line = 1;
      }
    }

    const newParams = { chapter: params.chapter };
    if (params.line) newParams.line = params.line;

    // Send Data
    urlUpdate(`read-fic`, null, false, newParams);
    newRead(Number(params.chapter), params.line, true);
  }

  // Nope. Choose One
  else {
    const cantNsfw = isNoNsfw();
    if (cantNsfw) {
      for (const item in storyCfg.nsfw) {
        if (tinyLs.getItem('NSFW' + item)) tinyLs.removeItem('NSFW' + item);
      }
    }

    /** @type {TinyHtmlElems.Button[]} */
    const spoilersButton = [];

    /** @param {number} chapter */
    const getCanSpoilerMsg = (chapter) => {
      const canSpoiler = tinyLs.getBool(`bookmarkCanSpoiler${chapter}`);
      return canSpoiler ? 'Disable spoiler auto-reveal' : 'Enable spoiler auto-reveal';
    };

    // All Spoilers Button
    const allSpoilersButton = new Button({
      mainClass: 'btn',
      tags: 'btn-secondary flex-fill mx-3',
      label: `Change spoiler auto-reveal for all`,
    }).on('click', () => {
      /** @type {boolean|null} */
      let valueToSet = null;
      for (let i = 0; i < storyData.chapter.amount; i++) {
        const bmValueName = `bookmarkCanSpoiler${i}`;
        if (valueToSet === null) valueToSet = !tinyLs.getBool(bmValueName);
        tinyLs.setBool(bmValueName, valueToSet);
      }

      for (const item of spoilersButton) {
        item.setLabel(getCanSpoilerMsg(item.attrNumber('chapter')));
      }
    });

    // Prepare Choose
    markdownBase.append(
      // Banner
      TinyHtml.createFrom('img', { class: 'img-fluid mb-2', src: '/img/external/banner1.jpg' }),

      // Nav
      TinyHtml.createFrom('nav', { class: 'nav nav-pills nav-fill' }).append(
        // Warnings
        TinyHtml.createFrom('a', {
          class: 'nav-item nav-link',
          href: '#warnings',
          'data-bs-toggle': 'collapse',
          role: 'button',
          'aria-expanded': false,
          'aria-controls': 'warnings',
        }).setText('Important Warnings'),

        // Character Statistics
        TinyHtml.createFrom('a', { class: 'nav-item nav-link', href: 'javascript:void(0)' })
          .setText('Character Statistics')
          .on('click', (e) => {
            e.preventDefault();
            // Prepare Content
            const newDiv = TinyHtml.createFrom('div', { class: 'row' });
            const content = [];
            for (const item in storyData.characters.data) {
              const charData = storyData.characters.data[item];
              const isNpc = storyCfg.characters[`npc/${charData.id}`];
              if (!charData.value.startsWith('???') && !isNpc) {
                // Prepare Data
                const dataBase = TinyHtml.createFrom('div', { class: 'card-body' }).append(
                  TinyHtml.createFrom('h5', { class: 'card-title' }).setText(
                    toTitleCase(charData.value),
                  ),
                  TinyHtml.createFrom('p', { class: 'card-text small' }).setText(
                    `Performed ${charData.count} dialogues`,
                  ),
                );

                // Chapter Read
                for (const item2 in charData.chapter) {
                  dataBase.append(
                    TinyHtml.createFrom('p', { class: 'card-text small' }).setText(
                      `${charData.chapter[item2]} dialogues in Chapter ${item2}`,
                    ),
                  );
                }

                // Insert Data
                content.push(
                  TinyHtml.createFrom('div', { class: 'col-sm-6' }).append(
                    TinyHtml.createFrom('div', { class: 'card' }).append(dataBase),
                  ),
                );
              }
            }

            // Modal
            tinyLib.modal({
              title: [new Icon('fa-solid fa-user me-3'), 'Character Statistics'],
              body: TinyHtml.createFrom('span').append(newDiv.append(content)),
              dialog: 'modal-lg',
            });
          }),

        // Word Statistics
        TinyHtml.createFrom('a', { class: 'nav-item nav-link', href: 'javascript:void(0)' })
          .setText('Letter Statistics')
          .on('click', (e) => {
            e.preventDefault();
            // Prepare Content
            const newDiv = TinyHtml.createFrom('div', { class: 'row' });
            const content = [];

            // Insert Data
            content.push(
              TinyHtml.createFrom('div', { class: 'col-sm-6' }).append(
                TinyHtml.createFrom('div', { class: 'card' }).append(
                  TinyHtml.createFrom('div', { class: 'card-body' }).append(
                    TinyHtml.createFrom('h5', { class: 'card-title' }).setText(`Total Letters`),
                    TinyHtml.createFrom('p', { class: 'card-text small' }).setText(
                      storyData.lettersCount.total,
                    ),
                  ),
                ),
              ),
            );

            // Insert Chapter Data
            for (const item in storyData.lettersCount) {
              if (item !== 'total') {
                // Prepare Data
                const charData = storyData.lettersCount[item];
                const dataBase = TinyHtml.createFrom('div', { class: 'card-body' });

                dataBase.append(
                  TinyHtml.createFrom('h5', { class: 'card-title' }).setText(`Chapter ${item}`),
                  TinyHtml.createFrom('p', { class: 'card-text small' }).setText(charData),
                );

                // Insert Data
                content.push(
                  TinyHtml.createFrom('div', { class: 'col-sm-6' }).append(
                    TinyHtml.createFrom('div', { class: 'card' }).append(dataBase),
                  ),
                );
              }
            }

            // Modal
            tinyLib.modal({
              title: [new Icon('fa-solid fa-a me-3'), 'Letter Statistics'],
              body: TinyHtml.createFrom('span').append(newDiv.append(content)),
              dialog: 'modal-lg',
            });
          }),

        TinyHtml.createFrom('a', { class: 'nav-item nav-link', href: 'javascript:void(0)' })
          .setText('Word Statistics')
          .on('click', (e) => {
            e.preventDefault();
            // Prepare Content
            const newDiv = TinyHtml.createFrom('div', { class: 'row' });
            const content = [];

            // Insert Data
            content.push(
              TinyHtml.createFrom('div', { class: 'col-sm-6' }).append(
                TinyHtml.createFrom('div', { class: 'card' }).append(
                  TinyHtml.createFrom('div', { class: 'card-body' }).append(
                    TinyHtml.createFrom('h5', { class: 'card-title' }).setText(`Total Words`),
                    TinyHtml.createFrom('p', { class: 'card-text small' }).setText(
                      storyData.wordsCount.total,
                    ),
                  ),
                ),
              ),
            );

            // Insert Chapter Data
            for (const item in storyData.wordsCount) {
              if (item !== 'total') {
                // Prepare Data
                const charData = storyData.wordsCount[item];
                const dataBase = TinyHtml.createFrom('div', { class: 'card-body' });

                dataBase.append(
                  TinyHtml.createFrom('h5', { class: 'card-title' }).setText(`Chapter ${item}`),
                  TinyHtml.createFrom('p', { class: 'card-text small' }).setText(charData),
                );

                // Insert Data
                content.push(
                  TinyHtml.createFrom('div', { class: 'col-sm-6' }).append(
                    TinyHtml.createFrom('div', { class: 'card' }).append(dataBase),
                  ),
                );
              }
            }

            // Modal
            tinyLib.modal({
              title: [new Icon('fa-solid fa-a me-3'), 'Word Statistics'],
              body: TinyHtml.createFrom('span').append(newDiv.append(content)),
              dialog: 'modal-lg',
            });
          }),
      ),

      // Info
      TinyHtml.createFrom('div', { class: 'collapse', id: 'warnings' }).append(
        tinyLib.bs
          .alert('info')
          .setText(
            'Each time you read a chapter, your progress is automatically saved. This checkpoint is stored in your browser. If you want to continue reading on another device, simply save the checkpoint URL that appears when you open a chapter.',
          )
          .prepend(new Icon('fas fa-info-circle me-3'))
          .addClass('made-by-ai'),

        tinyLib.bs
          .alert('info')
          .setText(
            "Disclaimer: All songs on this page are streamed directly from YouTube. This means many tracks are not owned by me and are used solely to enhance the reading experience. I acknowledge that if any artist requests removal, the song will be replaced. All songs played count as views on the original creator's YouTube channel. You can find the official music page via the info icon on the player.",
          )
          .prepend(new Icon('fas fa-info-circle me-3'))
          .addClass('made-by-ai'),

        tinyLib.bs
          .alert('info')
          .setText(
            'This site does not collect your personal access data. However, some third-party services used on this page — such as YouTube, Google, and Cloudflare — may collect browsing information.',
          )
          .prepend(new Icon('fas fa-info-circle me-3'))
          .addClass('made-by-ai'),
      ),

      TinyHtml.createFrom('h2')
        .setText(`Please select a chapter to read.`)
        .prepend(new Icon('fas fa-book-open me-3'))
        .append(
          tinyLib.bs
            .button(`${!cantNsfw ? 'info' : 'danger'} btn-sm ms-3`)
            .setText(
              !cantNsfw
                ? 'Choose Optional Mature Content'
                : 'Unavailable in your region (Login with an 18+ account)',
            )
            .toggleProp('disabled', cantNsfw)
            .on('click', () => {
              // Nothing NSFW
              let existNSFW = false;
              let nsfwContent = TinyHtml.createFrom('center', {
                class: 'm-3 small text-warning',
              })
                .addClass('made-by-ai')
                .setText(
                  'No mature content has been detected. However, some may be added in the future.',
                );
              const nsfwList = [];

              // Detect Fic Mature Content
              for (const fic in storyData.data) {
                for (const item in storyData.data[fic]) {
                  if (storyData.data[fic][item].nsfw) {
                    for (const nsfwItem in storyData.data[fic][item].nsfw) {
                      if (nsfwList.indexOf(storyData.data[fic][item].nsfw[nsfwItem]) < 0) {
                        // Add Item
                        const NSFWITEM = storyData.data[fic][item].nsfw[nsfwItem];
                        nsfwList.push(NSFWITEM);

                        // Convert Mature Content
                        if (!existNSFW) {
                          nsfwContent = [];
                        }

                        // Exist Now
                        existNSFW = true;

                        // Add Mature Content Item
                        if (storyCfg.nsfw[NSFWITEM]) {
                          // Get Value
                          let nsfwValue = TinyHtml.boolCheck(tinyLs.getItem('NSFW' + NSFWITEM));

                          // Set Button Text
                          let buttonClass = 'success';
                          let allowButton = 'Enable';
                          if (nsfwValue) {
                            allowButton = 'Disable';
                            buttonClass = 'danger';
                          }

                          const nsfwButton = tinyLib.bs.button(buttonClass);
                          nsfwContent.push(
                            TinyHtml.createFrom('div', {
                              class: `col-sm-${storyCfg.nsfw[NSFWITEM].size}`,
                            }).append(
                              TinyHtml.createFrom('div', { class: 'card' }).append(
                                TinyHtml.createFrom('div', { class: 'card-body' }).append(
                                  TinyHtml.createFrom('h5', { class: 'card-title' }).setText(
                                    storyCfg.nsfw[NSFWITEM].name,
                                  ),
                                  TinyHtml.createFrom('p', {
                                    class: `card-text small${storyCfg.nsfw[NSFWITEM].aiMsg ? ' made-by-ai' : ''}`,
                                  }).setText(storyCfg.nsfw[NSFWITEM].description),

                                  nsfwButton
                                    .on('click', () => {
                                      // Enable
                                      if (!nsfwValue) {
                                        tinyLs.setItem('NSFW' + NSFWITEM, true);
                                        nsfwValue = true;
                                        nsfwButton
                                          .removeClass('btn-success')
                                          .addClass('btn-danger')
                                          .setText('Disable');
                                      }

                                      // Disable
                                      else {
                                        tinyLs.setItem('NSFW' + NSFWITEM, false);
                                        nsfwValue = false;
                                        nsfwButton
                                          .removeClass('btn-danger')
                                          .addClass('btn-success')
                                          .setText('Enable');
                                      }
                                    })
                                    .setText(allowButton),
                                ),
                              ),
                            ),
                          );
                        }

                        // Unknown
                        else {
                        }
                      }
                    }
                  }
                }
              }

              // Mature Content Item
              const nsfwDIV = TinyHtml.createFrom('div');
              nsfwDIV.append(nsfwContent);
              if (existNSFW) {
                nsfwDIV.addClass('row');
              }

              // Modal
              tinyLib.modal({
                title: [new Icon('fas fa-eye me-3'), 'Mature Content Settings'],
                body: TinyHtml.createFrom('center').append(
                  TinyHtml.createFrom('p', { class: 'text-danger made-by-ai' }).setText(
                    "Don't expect any explicit 18+ content here. The mature themes are not graphic and are only used to add depth to the story — for example, to make certain scenes feel more realistic. By enabling these settings, you confirm that you are over 18 and accept full responsibility for the content you choose to view.",
                  ),
                  nsfwDIV,
                ),
                dialog: 'modal-lg',
              });
            }),
        ),
      TinyHtml.createFrom('h5')
        .addClass('made-by-ai')
        .setText(
          `When you open a chapter, look at the top of the page. You'll find extra tools, including a bookmark manager to save your progress directly in your browser.`,
        )
        .append(allSpoilersButton),
    );

    // Read More Data
    for (let i = 0; i < storyData.chapter.amount; i++) {
      // Chapter Number
      const chapter = String(i + 1);
      let isNewValue = '';
      if (storyData.isNew[chapter] === 2) {
        isNewValue = TinyHtml.createFrom('span', {
          class: 'badge chapter-notification badge-primary ms-3',
        }).setText('NEW');
      } else if (storyData.isNew[chapter] === 1) {
        isNewValue = TinyHtml.createFrom('span', {
          class: 'badge chapter-notification badge-secondary ms-3',
        }).setText('UPDATE');
      }

      if (isNewValue) {
        Tooltip(isNewValue.setAttr('title', 'Click to mark as read'));
        isNewValue.on('click', () => {
          // Clear is new value
          tinyLs.setItem('chapter' + chapter + 'MD5', objHash(storyData.data[chapter]));
          storyData.isNew[chapter] = 0;

          // Remove tooltip
          const tooltip = isNewValue.data('BootstrapToolTip');
          if (tooltip) {
            tooltip.hide();
            tooltip.disable();
          }

          // Remove element
          isNewValue.remove();
        });
      }

      // Chapter Button
      const chapterButton = new Anchor({
        mainClass: 'btn',
        tags: 'btn-primary flex-fill mx-3',
        href: `/chapter/${chapter}.html`,
        label: 'Load Chapter',
      })
        .setAttr('chapter', chapter)
        .on('click', (e) => {
          e.preventDefault();
          // Start Chapter
          urlUpdate(`read-fic`, null, false, { chapter });
          newRead(Number(chapterButton.attr('chapter')));
        });

      // Spoiler Button
      const bmValueName = `bookmarkCanSpoiler${chapter}`;
      const chapterSpoiler = new Button({
        mainClass: 'btn',
        tags: 'btn-secondary flex-fill mx-3',
        label: getCanSpoilerMsg(chapter),
      })
        .setAttr('chapter', chapter)
        .on('click', () => {
          tinyLs.setBool(bmValueName, !tinyLs.getBool(bmValueName) ?? true);
          chapterSpoiler.setLabel(getCanSpoilerMsg(chapter));
        });

      spoilersButton.push(chapterSpoiler);

      new Tooltip(
        chapterSpoiler.setAttr(
          'title',
          'Do you want every spoiler of this chapter to be automatically revealed on the website?',
        ),
      );

      // Add Chapter
      markdownBase.append(
        TinyHtml.createFrom('div', { class: 'card mb-2' }).append(
          TinyHtml.createFrom('div', { class: 'card-body' }).append(
            // Info
            TinyHtml.createFrom('h5', { class: 'card-title' })
              .setText('Chapter ' + chapter)
              .append(isNewValue),
            TinyHtml.createFrom('p', { class: 'card-text' }).setText(
              storyCfg.chapterName[chapter].title,
            ),
            TinyHtml.createFrom('span', { class: 'card-text small me-1' }).setText(
              `${storyData.data[chapter].length} Lines`,
            ),
            TinyHtml.createFrom('span', { class: 'card-text small me-2' }).setText(
              `${Math.ceil(storyData.data[chapter].length / storyCfg.itemsPerPage)} Pages`,
            ),
            TinyHtml.createFrom('span', { class: 'card-text small ms-1' }).setText(
              `${storyData.lettersCount[chapter]} Letters`,
            ),
            TinyHtml.createFrom('span', { class: 'card-text small ms-1' }).setText(
              `${storyData.wordsCount[chapter]} Words`,
            ),
            TinyHtml.createFrom('p', { class: 'card-text small' }).setText(
              storyCfg.chapterName[chapter].description,
            ),
            // Load Chapter
            TinyHtml.createFrom('div', { class: 'd-flex justify-content-between px-3' }).append(
              chapterButton,
              chapterSpoiler,
            ),
          ),
        ),
      );
    }
  }

  /* 

        Se o nome do personagem bater com algum personagem com página, ele vai ser um link para acessar a página.
        If the character's name matches a character with a page, it will be a link to access the page.

    */
  urlUpdate('read-fic', 'Read Fic');
};
