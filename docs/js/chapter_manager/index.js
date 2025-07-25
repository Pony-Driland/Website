/*  Rain made by Aaron Rickle */
const rainConfig = {};
(function () {
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
  start: function () {
    $('.rain').empty();
    $('.rain.front-row').append(rainConfig.drops);
    $('.rain.back-row').append(rainConfig.backDrops);
  },

  on: function () {
    $('body').addClass('raining-sky');
  },

  off: function () {
    $('body').addClass('raining-sky');
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
        $('<span>', {
          class: txt[1] ? 'made-by-ai' : '',
        }).text(`${txt[2] ? ' ' : ''}${txt[0]}${txt[3] ? ' ' : ''}`),
      );

      // Insert html
      storyData.chapter.html[line] = $('<tr>', { line: line }).append(
        // Line number
        $('<td>', {
          class: 'py-4 font-weight-bold d-none d-md-table-cell text-white text-center',
        }).text(line),

        // Type base
        $('<td>', { class: 'py-4 text-white text-center', width: baseWidth })
          .text(baseName)
          .prepend(
            $('<span>', { class: 'badge bg-secondary' }).text(
              `${type}${data.flashback ? ` (Flashback)` : ''}`,
            ),
            baseName ? $('<br>') : null,
          ),

        // Text
        $('<td>', { class: 'py-4 text-break text-white' }).append(
          $(`<${msgTag}>`, { class: 'text-break' }).append(text),
        ),
      );

      items.push(storyData.chapter.html[line]);
    }
  },

  // Mature Content Checker
  nsfwChecker: function (data) {
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

const openChapterMenu = (params = {}) => {
  // Prepare Data
  clearFicData();
  $('#markdown-read').empty();
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
    $('#fic-start').text('Read Fic').prepend(tinyLib.icon('fab fa-readme me-2'));

    // Load Sounds
    if (storyCfg.sfx) {
      console.log(`Loading Audio Data...`);
      $.LoadingOverlay('show', { background: 'rgba(0,0,0, 0.5)' });

      if (!storyData.sfx) {
        storyData.sfx = {};
      }
      for (const item in storyCfg.sfx) {
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

      $.LoadingOverlay('hide');
      console.log(`Audio Data Loaded!`);
    }

    // Set Selected
    storyData.readFic = true;
    $('#fic-chapter').text(`Chapter ${chapter}`);
    storyData.chapter.selected = chapter;

    // Prepare Data
    $('#markdown-read').empty();

    // Detect Bookmark
    const { page, filtedItems, selectedLine: line } = getPageData(selectedLine, chapter);
    storyData.chapter.ficPageData = filtedItems;

    // Save MD5
    tinyLs.setItem('chapter' + chapter + 'MD5', objHash(storyData.data[chapter]));

    // Pagination
    const pagination = paginateArray(filtedItems, page, storyCfg.itemsPerPage);

    // Items
    const table = $('<tbody>');
    const tinyPag = { base: [], default: [], search: [] };
    tinyPag.base[0] = $('<div>');
    tinyPag.base[1] = $('<div>');

    const addDefaultPagination = (ftItems, tPage, where = 'default') => {
      tinyPag.base[0].empty();
      tinyPag.base[1].empty();

      tinyPag[where][0] = $('<nav>');
      tinyPag[where][0].bootstrapPaginator({
        currentPage: tPage.currentPage,
        totalPages: tPage.totalPages,
        size: 'normal',
        alignment: 'center',
      });

      tinyPag[where][1] = $('<nav>');
      tinyPag[where][1].bootstrapPaginator({
        currentPage: tPage.currentPage,
        totalPages: tPage.totalPages,
        size: 'normal',
        alignment: 'center',
      });

      tinyPag[where][0].on('page-changed', function () {
        // Process Data
        const page = Number($(this).find('.active').text().trim());
        const tPage = paginateArray(ftItems, page, storyCfg.itemsPerPage);
        insertTableData(table, tPage);

        // Scroll
        TinyHtml.setWinScrollTop(TinyHtml.getById('app').offset().top);
        tinyPag[where][1].bootstrapPaginator('show', page);
        $(window).trigger('scroll');
      });

      tinyPag[where][1].on('page-changed', function () {
        // Get Page
        const page = Number($(this).find('.active').text().trim());
        tinyPag[where][0].bootstrapPaginator('show', page);
      });

      tinyPag.base[0].append(tinyPag[where][0]);
      tinyPag.base[1].append(tinyPag[where][1]);
    };

    addDefaultPagination(filtedItems, pagination);
    insertTableData(table, pagination);

    // Search
    storyData.chapter.blockLineSave = false;
    const searchItems = {
      base: $('<div>', { class: 'input-group mb-3' }),
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
      $(window).trigger('scroll');
    };

    searchItems.character = $('<input>', {
      type: 'text',
      class: 'form-control',
      placeholder: 'Character Name',
    });

    searchItems.message = $('<input>', {
      type: 'text',
      class: 'form-control',
      placeholder: 'Dialogue / Action',
      style: 'width: 60%',
    });

    searchItems.character.on('change', searchCheck);
    searchItems.message.on('change', searchCheck);
    searchItems.base.append(searchItems.character, searchItems.message);

    // Table
    $('#markdown-read').append(
      // Info
      tinyLib.bs
        .alert('info')
        .text(
          'Bold texts are action texts, small texts are thoughts of characters, common texts are dialogues or telepathy. If you are using filters to keep your reading 100% SFW, some unnecessary text lines will be automatically skipped.',
        )
        .prepend(tinyLib.icon('fas fa-info-circle me-3')),

      // Title
      $('<h3>')
        .text(`Chapter ${chapter}`)
        .append($('<small>', { class: 'ms-3' }).text(storyCfg.chapterName[chapter].title)),

      // Pagination
      searchItems.base,
      tinyPag.base[0],

      // Table
      $('<table>', {
        class: 'table table-bordered table-striped text-white small',
      })
        .css('background-color', 'rgb(44 44 44)')
        .append([
          $('<thead>').append(
            $('<tr>').append(
              $('<th>', { class: 'd-none d-md-table-cell', scope: 'col' }).text('Line'),
              $('<th>', { scope: 'col' }).text('Type'),
              $('<th>', { scope: 'col' }).text('Content'),
            ),
          ),
          table,
        ]),

      // Pagination
      tinyPag.base[1],

      // Night Effects
      $('<div>', { id: 'bg-sky' }).append(
        $('<div>', { class: 'flash' }),
        $('<div>', { class: 'rain front-row' }),
        $('<div>', { class: 'rain back-row' }),
        $('<div>', { class: 'stars' }),
        $('<div>', { class: 'twinkling' }),
        $('<div>', { class: 'clouds' }),
      ),
    );

    // Fic Mode
    $('body').addClass('ficMode');

    // Complete
    $(window).trigger('scroll');
    if (line !== null) {
      const tinyLine = TinyHtml.query('#markdown-read [line="' + line + '"]');
      if (tinyLine) TinyHtml.setWinScrollTop(tinyLine.offset().top);
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
    const markdownRead = $('#markdown-read');

    // Prepare Choose
    markdownRead.append(
      // Banner
      $('<img>', { class: 'img-fluid mb-2', src: '/img/external/banner1.jpg' }),

      // Nav
      $('<nav>', { class: 'nav nav-pills nav-fill' }).append(
        // Warnings
        $('<a>', {
          class: 'nav-item nav-link',
          href: '#warnings',
          'data-bs-toggle': 'collapse',
          role: 'button',
          'aria-expanded': false,
          'aria-controls': 'warnings',
        }).text('Important Warnings'),

        // Character Statistics
        $('<a>', { class: 'nav-item nav-link', href: 'javascript:void(0)' })
          .text('Character Statistics')
          .on('click', () => {
            // Prepare Content
            const newDiv = $('<div>', { class: 'row' });
            const content = [];
            for (const item in storyData.characters.data) {
              const charData = storyData.characters.data[item];
              const isNpc = storyCfg.characters[`npc/${charData.id}`];
              if (!charData.value.startsWith('???') && !isNpc) {
                // Prepare Data
                const dataBase = $('<div>', { class: 'card-body' }).append(
                  $('<h5>', { class: 'card-title' }).text(toTitleCase(charData.value)),
                  $('<p>', { class: 'card-text small' }).text(
                    `Performed ${charData.count} dialogues`,
                  ),
                );

                // Chapter Read
                for (const item2 in charData.chapter) {
                  dataBase.append(
                    $('<p>', { class: 'card-text small' }).text(
                      `${charData.chapter[item2]} dialogues in Chapter ${item2}`,
                    ),
                  );
                }

                // Insert Data
                content.push(
                  $('<div>', { class: 'col-sm-6' }).append(
                    $('<div>', { class: 'card' }).append(dataBase),
                  ),
                );
              }
            }

            // Modal
            tinyLib.modal({
              title: [tinyLib.icon('fa-solid fa-user me-3'), 'Character Statistics'],
              body: $('<span>').append(newDiv.append(content)),
              dialog: 'modal-lg',
            });

            // Complete
            return false;
          }),

        // Word Statistics
        $('<a>', { class: 'nav-item nav-link', href: 'javascript:void(0)' })
          .text('Letter Statistics')
          .on('click', () => {
            // Prepare Content
            const newDiv = $('<div>', { class: 'row' });
            const content = [];

            // Insert Data
            content.push(
              $('<div>', { class: 'col-sm-6' }).append(
                $('<div>', { class: 'card' }).append(
                  $('<div>', { class: 'card-body' }).append(
                    $('<h5>', { class: 'card-title' }).text(`Total Letters`),
                    $('<p>', { class: 'card-text small' }).text(storyData.lettersCount.total),
                  ),
                ),
              ),
            );

            // Insert Chapter Data
            for (const item in storyData.lettersCount) {
              if (item !== 'total') {
                // Prepare Data
                const charData = storyData.lettersCount[item];
                const dataBase = $('<div>', { class: 'card-body' });

                dataBase.append(
                  $('<h5>', { class: 'card-title' }).text(`Chapter ${item}`),
                  $('<p>', { class: 'card-text small' }).text(charData),
                );

                // Insert Data
                content.push(
                  $('<div>', { class: 'col-sm-6' }).append(
                    $('<div>', { class: 'card' }).append(dataBase),
                  ),
                );
              }
            }

            // Modal
            tinyLib.modal({
              title: [tinyLib.icon('fa-solid fa-a me-3'), 'Letter Statistics'],
              body: $('<span>').append(newDiv.append(content)),
              dialog: 'modal-lg',
            });

            // Complete
            return false;
          }),

        $('<a>', { class: 'nav-item nav-link', href: 'javascript:void(0)' })
          .text('Word Statistics')
          .on('click', () => {
            // Prepare Content
            const newDiv = $('<div>', { class: 'row' });
            const content = [];

            // Insert Data
            content.push(
              $('<div>', { class: 'col-sm-6' }).append(
                $('<div>', { class: 'card' }).append(
                  $('<div>', { class: 'card-body' }).append(
                    $('<h5>', { class: 'card-title' }).text(`Total Words`),
                    $('<p>', { class: 'card-text small' }).text(storyData.wordsCount.total),
                  ),
                ),
              ),
            );

            // Insert Chapter Data
            for (const item in storyData.wordsCount) {
              if (item !== 'total') {
                // Prepare Data
                const charData = storyData.wordsCount[item];
                const dataBase = $('<div>', { class: 'card-body' });

                dataBase.append(
                  $('<h5>', { class: 'card-title' }).text(`Chapter ${item}`),
                  $('<p>', { class: 'card-text small' }).text(charData),
                );

                // Insert Data
                content.push(
                  $('<div>', { class: 'col-sm-6' }).append(
                    $('<div>', { class: 'card' }).append(dataBase),
                  ),
                );
              }
            }

            // Modal
            tinyLib.modal({
              title: [tinyLib.icon('fa-solid fa-a me-3'), 'Word Statistics'],
              body: $('<span>').append(newDiv.append(content)),
              dialog: 'modal-lg',
            });

            // Complete
            return false;
          }),
      ),

      // Info
      $('<div>', { class: 'collapse', id: 'warnings' }).append(
        tinyLib.bs
          .alert('info')
          .text(
            'Every time you read a chapter, it will automatically save where you left off. This checkpoint is saved on your browser, if you want to transfer your checkpoint to other computers, save the URL of your checkpoint that will appear when you open a chapter.',
          )
          .prepend(tinyLib.icon('fas fa-info-circle me-3')),

        tinyLib.bs
          .alert('info')
          .text(
            "Disclaimer: All songs played on this page are played directly from Youtube. This means that many songs do not belong to me and are being used only to please the reading environment. I recognize that if an artist asks to remove a song, I will replace it with another song. And all the songs that are played are counted as views on the original author's youtube channel. The official music page link will also be available in the player info icon.",
          )
          .prepend(tinyLib.icon('fas fa-info-circle me-3')),

        tinyLib.bs
          .alert('info')
          .text(
            'Our site does not have access to your access information, but some third-party applications installed on this page can collect your navigation data. YouTube, Google, Cloudflare.',
          )
          .prepend(tinyLib.icon('fas fa-info-circle me-3')),
      ),

      $('<h2>')
        .text(`Please choose a chapter to read.`)
        .prepend(tinyLib.icon('fas fa-book-open me-3'))
        .append(
          tinyLib.bs
            .button('info btn-sm ms-3')
            .text('Choose Optional Mature Content')
            .on('click', () => {
              // Nothing NSFW
              let existNSFW = false;
              let nsfwContent = $('<center>', {
                class: 'm-3 small text-warning',
              }).text(
                'No mature content was detected. It may be that soon some mature content will be added.',
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

                          nsfwContent.push(
                            $('<div>', {
                              class: `col-sm-${storyCfg.nsfw[NSFWITEM].size}`,
                            }).append(
                              $('<div>', { class: 'card' }).append(
                                $('<div>', { class: 'card-body' }).append(
                                  $('<h5>', { class: 'card-title' }).text(
                                    storyCfg.nsfw[NSFWITEM].name,
                                  ),
                                  $('<p>', { class: `card-text small${storyCfg.nsfw[NSFWITEM].aiMsg ? ' made-by-ai' : ''}` }).text(
                                    storyCfg.nsfw[NSFWITEM].description,
                                  ),

                                  tinyLib.bs
                                    .button(buttonClass)
                                    .on('click', function () {
                                      // Enable
                                      if (!nsfwValue) {
                                        tinyLs.setItem('NSFW' + NSFWITEM, true);
                                        nsfwValue = true;
                                        $(this)
                                          .removeClass('btn-success')
                                          .addClass('btn-danger')
                                          .text('Disable');
                                      }

                                      // Disable
                                      else {
                                        tinyLs.setItem('NSFW' + NSFWITEM, false);
                                        nsfwValue = false;
                                        $(this)
                                          .removeClass('btn-danger')
                                          .addClass('btn-success')
                                          .text('Enable');
                                      }
                                    })
                                    .text(allowButton),
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
              const nsfwDIV = $('<div>');
              nsfwDIV.append(nsfwContent);
              if (existNSFW) {
                nsfwDIV.addClass('row');
              }

              // Modal
              tinyLib.modal({
                title: [tinyLib.icon('fas fa-eye me-3'), 'Mature Content Settings'],
                body: $('<center>').append(
                  $('<p>', { class: 'text-danger' }).text(
                    "Don't expect fantastic +18 stuff here. The mature content will not try to be explicit, and it is only used to enrich the content of the fic (example: bring more realistic scenes). By activating these settings, you agree that you are responsible for the content you consume and that you are over 18 years old!",
                  ),
                  nsfwDIV,
                ),
                dialog: 'modal-lg',
              });
            }),
        ),
      $('<h5>').text(
        `When you open a chapter, look at the top of the page. You will find extra tools and even a bookmark manager to save your progress in your browser.`,
      ),
    );

    // Read More Data
    for (let i = 0; i < storyData.chapter.amount; i++) {
      // Chapter Number
      const chapter = String(i + 1);
      let isNewValue = '';
      if (storyData.isNew[chapter] === 2) {
        isNewValue = $('<span>', {
          class: 'badge chapter-notification badge-primary ms-3',
        }).text('NEW');
      } else if (storyData.isNew[chapter] === 1) {
        isNewValue = $('<span>', {
          class: 'badge chapter-notification badge-secondary ms-3',
        }).text('UPDATE');
      }

      if (isNewValue) {
        isNewValue.attr('title', 'Click to mark as read').tooltip();
        isNewValue.on('click', function () {
          // Clear is new value
          tinyLs.setItem('chapter' + chapter + 'MD5', objHash(storyData.data[chapter]));
          storyData.isNew[chapter] = 0;

          // Remove tooltip
          const tooltip = $(this).data('bs-tooltip');
          if (tooltip) {
            tooltip.hide();
            tooltip.disable();
          }

          // Remove element
          $(this).remove();
        });
      }

      // Add Chapter
      markdownRead.append(
        $('<div>', { class: 'card mb-2' }).append(
          $('<div>', { class: 'card-body' }).append(
            $('<h5>', { class: 'card-title' })
              .text('Chapter ' + chapter)
              .append(isNewValue),
            $('<p>', { class: 'card-text' }).text(storyCfg.chapterName[chapter].title),
            $('<span>', { class: 'card-text small me-1' }).text(
              `${storyData.data[chapter].length} Lines`,
            ),
            $('<span>', { class: 'card-text small me-2' }).text(
              `${Math.ceil(storyData.data[chapter].length / storyCfg.itemsPerPage)} Pages`,
            ),
            $('<span>', { class: 'card-text small ms-1' }).text(
              `${storyData.lettersCount[chapter]} Letters`,
            ),
            $('<span>', { class: 'card-text small ms-1' }).text(
              `${storyData.wordsCount[chapter]} Words`,
            ),
            $('<p>', { class: 'card-text small' }).text(storyCfg.chapterName[chapter].description),
            $('<div>', { class: 'd-grid gap-2 col-6 mx-auto' }).append(
              $('<a>', {
                class: 'btn btn-primary m-2 ms-0',
                href: `/chapter/${chapter}.html`,
                chapter: chapter,
              })
                .on('click', function () {
                  // Start Chapter
                  urlUpdate(`read-fic`, null, false, { chapter });
                  newRead(Number($(this).attr('chapter')));

                  // Complete
                  return false;
                })
                .text('Load Chapter'),
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
