// Start Load
const appData = {
  youtube: {},
  ai: { using: false, interval: null, secondsUsed: 0 },
};
appData.emitter = new EventEmitter();

// Check if CTRL + ALT + A was pressed
$(document).on('keydown', function (event) {
  if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'a') {
    event.preventDefault(); // Prevent any default behavior
    if ($('body').hasClass('detect-made-by-ai')) {
      $('body').removeClass('detect-made-by-ai');
    } else $('body').addClass('detect-made-by-ai');
  }
});

// Start Document
console.groupCollapsed('App Information');
console.log(
  `Fanfic Engine Creator: Yasmin Seidel (JasminDreasond) https://github.com/JasminDreasond`,
);
console.log(`Name: ${storyCfg.title}`);
console.log(`Description: ${storyCfg.description}`);
console.log(`Author: ${storyCfg.creator}`);
console.log(`Author Page: ${storyCfg.creator_url}`);
console.log(`Age Rating: ${storyCfg.ageRating}`);
console.log(
  `Github Repository: https://github.com/${storyCfg.github.account}/${storyCfg.github.repository}`,
);
console.log(`Tags`, storyCfg.tags);
console.groupEnd();

// Roleplay format
const renderRoleplayFormat = (chapter, saveCfg = {}) => {
  let data = '';

  let day = null;
  let dayNightCycle = null;
  let weather = null;
  let where = null;

  for (const item in storyData.data[chapter]) {
    let lineText = `${saveCfg.ficLine ? `[Fic Line ${Number(item) + 1}] ` : ''}`;
    const ficData = storyData.data[chapter][item];

    if (ficData.set) {
      if (saveCfg.dayNumber && typeof ficData.set.day === 'number') {
        day = ficData.set.day;
        data += `\nDay Number= ${day}`;
      }

      if (saveCfg.dayStatus && typeof ficData.set.dayNightCycle === 'string') {
        dayNightCycle = ficData.set.dayNightCycle;
        data += `\nDay Status= ${dayNightCycle}`;
      }

      if (saveCfg.weather && typeof ficData.set.weather === 'string') {
        weather = ficData.set.weather;
        data += `\nWeather= ${weather}`;
      }

      if (saveCfg.location && typeof ficData.set.where === 'string') {
        where = ficData.set.where;
        data += `\nLocation= ${`${where !== '???' ? where : 'Unknown'}`}`;
      }
    }

    if (saveCfg.curiosities && ficData.info) {
      for (const info in ficData.info) {
        data += `\nCuriosity= ${info}: ${ficData.info[info]}`;
      }
    }

    const isFlashBack = ficData.flashback ? ' from flashback scene' : '';

    if (ficData.type === 'action') data += `\n${lineText}*${tinyLib.removeAiTags(ficData.value)}*`;

    if (ficData.type === 'think')
      data += `\n${lineText}${ficData.character}'s thinks${isFlashBack}: ${tinyLib.removeAiTags(ficData.value)}`;
    if (ficData.type === 'telepathy')
      data += `\n${lineText}${ficData.character}'s telepathy voice${isFlashBack}: ${tinyLib.removeAiTags(ficData.value)}`;
    if (ficData.type === 'dialogue')
      data += `\n${lineText}${ficData.character}${isFlashBack}: ${tinyLib.removeAiTags(ficData.value)}`;
  }
  return data;
};

const saveRoleplayFormat = (chapter, saveAsFile = true, tinyCfg = {}) => {
  // Save Config
  const saveCfg = {
    dayNumber: true,
    dayStatus: true,
    weather: true,
    location: true,
    curiosities: true,
    ficLine: true,
  };

  for (const item in tinyCfg) {
    if (typeof tinyCfg[item] === 'boolean') saveCfg[item] = tinyCfg[item];
  }

  // File start and end
  const fileStart = `---------- Official Pony Driland fic file ----------`;
  const fileEnd = `---------- The end Official Pony Driland fic file ----------`;
  let file = ``;

  // Insert chapter
  const insertChapter = (cpId) => {
    file += `\n\n---------- Chapter ${cpId} ----------\n`;
    file += renderRoleplayFormat(cpId, saveCfg);
    file += `\n\n---------- The end chapter ${cpId} ----------`;
  };

  // Insert all chapters
  if (typeof chapter !== 'number' || Array.isArray(chapter)) {
    for (let i = 0; i < storyData.chapter.amount; i++) {
      // Chapter item
      const item = i + 1;

      // Insert all chapters
      if (!Array.isArray(chapter)) insertChapter(item);
      // Selected chapters
      else {
        for (const index in chapter) {
          if (typeof chapter[index] === 'number' && item === chapter[index]) insertChapter(item);
        }
      }
    }
  }

  // Insert chapter number
  else {
    insertChapter(chapter);
  }

  // Fix file
  file = file.substring(2, file.length);

  // Info data
  let info = `Title: ${storyData.title}\nDescription: ${storyData.description}\nAuthor: ${storyCfg.creator}\nAuthor Page: ${storyCfg.creator_url}`;
  if (
    (storyCfg.bitcoin && storyCfg.bitcoin.address) ||
    (storyCfg.dogecoin && storyCfg.dogecoin.address) ||
    (storyCfg.ethereum && storyCfg.ethereum.address) ||
    (storyCfg.polygon && storyCfg.polygon.address) ||
    (storyCfg.bnb && storyCfg.bnb.address)
  ) {
    info += `\n`;
  }

  if (storyCfg.bitcoin && storyCfg.bitcoin.address) {
    info += `\nBitcoin Donations: ${storyCfg.bitcoin.address}`;
  }

  if (storyCfg.dogecoin && storyCfg.dogecoin.address) {
    info += `\nDogecoin Donations: ${storyCfg.dogecoin.address}`;
  }

  if (storyCfg.ethereum && storyCfg.ethereum.address) {
    info += `\nEthereum Donations: ${storyCfg.ethereum.address}`;
  }

  if (storyCfg.polygon && storyCfg.polygon.address) {
    info += `\nPolygon Donations: ${storyCfg.polygon.address}`;
  }

  if (storyCfg.bnb && storyCfg.bnb.address) {
    info += `\nBNB Donations: ${storyCfg.bnb.address}`;
  }

  // Save file
  if (saveAsFile)
    saveAs(
      new Blob([`${fileStart}\n\n${info}\n\n${file}\n\n${fileEnd}`], {
        type: 'text/plain',
      }),
      `Pony Driland${
        typeof chapter !== 'number' && !Array.isArray(chapter)
          ? ''
          : ` - Chapter ${typeof chapter === 'number' ? String(chapter) : chapter.join('-')}`
      }.txt`,
    );
  else return { data: `${info}\n\n${file}`, mime: 'text/plain' };
};

// Tiny dice
const dice = {
  roll: function () {
    return (randomNumber = Math.floor(Math.random() * this.sides) + 1);
  },
};

if (Array.isArray(storyCfg.mirror) || storyCfg.mirror.length > 0) {
  dice.sides = storyCfg.mirror.length;
} else {
  dice.sides = 0;
}

// URL Update
const urlUpdate = function (url, title, isPopState = false, extra = {}) {
  // Page Title
  if (typeof title !== 'string' || title.length < 1) {
    title = storyCfg.title;
  }

  if (url === 'ai') {
    if (!appData.ai.using) {
      appData.ai.using = true;
      appData.emitter.emit('isUsingAI', true);
    }
  } else {
    if (appData.ai.using) {
      appData.ai.using = false;
      appData.emitter.emit('isUsingAI', false);
    }
  }

  let newUrl =
    typeof url === 'string' && !url.startsWith('/') && url !== 'read-fic' && url !== 'ai'
      ? `/${url}`
      : url;

  let extraReady = '';
  for (const item in extra) {
    extraReady += `&${item}=${extra[item]}`;
  }

  document.title = title;
  storyData.urlPage = newUrl;

  // Google
  if (typeof storyCfg.gtag === 'string' && gtag) {
    gtag('event', 'url', {
      event_title: title,
      event_category: 'open_url',
      url: newUrl,
    });
  }

  // Pop State
  if (!isPopState) {
    if (typeof newUrl === 'string' && newUrl.length > 0) {
      if (!storyCfg.custom_url[newUrl]) {
        window.history.pushState(
          { pageTitle: title },
          '',
          '/?path=' + encodeURIComponent(newUrl) + extraReady,
        );
      } else {
        window.history.pushState(
          { pageTitle: storyCfg.custom_url[newUrl].title },
          '',
          storyCfg.custom_url[newUrl].url + extraReady,
        );
      }
    } else {
      window.history.pushState({ pageTitle: title }, '', '/');
    }
  }
};

const openNewAddress = function (data, isPopState = false, useCustom = false) {
  // File Path
  const filePath = data.path;

  // Prepare Custom URL
  if (useCustom && storyCfg.custom_url[data.path]) {
    isPopState = false;
  }

  if (
    !data ||
    typeof filePath !== 'string' ||
    filePath.length < 1 ||
    !filePath.startsWith('/') ||
    filePath.indexOf('http://') > -1 ||
    filePath.indexOf('https://') > -1
  ) {
    insertMarkdownFile(storyData.readme, null, true, true);
  } else {
    openMDFile(filePath);
    if (typeof data.title === 'string' && data.title.length > 0) {
      urlUpdate(data.path, data.title, isPopState);
    } else {
      urlUpdate(data.path, null, isPopState);
    }
  }
};

// Pop State
$(window).on('popstate', function () {
  // Remove Fic Data
  clearFicData();

  // Get Params
  const urlSearchParams = new URLSearchParams(document.location.search);
  const params = Object.fromEntries(urlSearchParams.entries());

  // Load Page
  const loadPage = function () {
    if (storyData.urlPage !== params.path) {
      storyData.urlPage = params.path;
      if (params.path === 'read-fic') openChapterMenu(params);
      if (params.path === 'ai') return;
      else openNewAddress(params, true);
    }
  };

  // Default
  if (document.location.pathname === '/') {
    loadPage();
  }

  // Custom
  else {
    // Get Data
    const urlData = Object.entries(storyCfg.custom_url).find(
      (item) => item[1].url === document.location.pathname,
    );
    if (urlData) {
      params.path = urlData[0];
      params.title = urlData[1].title;
      loadPage();
    }
  }
});

// Insert Maarkdown File
const insertMarkdownFile = function (text, metadata = null, isMainPage = false, isHTML = false) {
  // Convert Data
  let data;

  if (!isHTML) {
    data = marked.parse(text.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, ''));
  } else {
    data = text;
  }

  data = data
    .replace(tinyLib.getGitUrlPath(`href\=\"{url}docs\\/`), 'href="javascript:void(0)" file="../')
    .replace(tinyLib.getGitUrlPath(`src\=\"{url}docs\\/`), 'src="../')
    .replace(
      new RegExp(`src\=\"https\:\/\/ipfs\.io\/ipfs\/`, 'g'),
      'src="https://cloudflare-ipfs.com/ipfs/',
    );

  const canContentList =
    metadata && Array.isArray(metadata.contentList) && metadata.contentList.length > 0;
  if (canContentList)
    data = data.replace('{{content_list}}', '<div class="content-list-data"></div>');
  else data = data.replace('{{content_list}}', '');

  // Markdown page ways
  const markdownBase = $('#markdown-read');
  const pageTypes = {
    // Wiki
    wiki: () => {
      // Row
      const row = $('<div>', { class: 'wiki-page' });

      // Main content
      const colMain = $('<div>');

      colMain.append($('<h1>').text(metadata.name), data);

      // Sidebar
      const colSidebar = $('<div>', {
        class: 'float-end character-wikicard ms-2 mb-2',
      });

      const card = $('<div>', { class: 'card position-relative' });
      const cardImg = $('<img>', {
        src: metadata.cardUrl,
        class: 'card-img-top',
        alt: metadata.name,
      });

      // Card body
      const cardBody = $('<div>', { class: 'card-body' }).append(
        $('<h5>', { class: 'card-title' }).text(metadata.name),
        $('<p>', { class: 'card-text text-muted' }).text(`(${metadata.subName})`),
      );

      // Character table
      if (Array.isArray(metadata.charTable) && metadata.charTable.length > 0) {
        const cardBodyTable = $('<table>', { class: 'table table-hover m-0' });
        const cardBodyTbody = $('<tbody>');
        for (const tIndex in metadata.charTable) {
          if (typeof metadata.charTable[tIndex][1] !== 'undefined') {
            const td = $('<td>', { class: 'bg-transparent' });
            if (typeof metadata.charTable[tIndex][1] === 'string')
              td.text(metadata.charTable[tIndex][1]);
            else if (
              typeof metadata.charTable[tIndex][1].text === 'string' &&
              typeof metadata.charTable[tIndex][1].url === 'string'
            )
              td.append(
                $('<a>', {
                  class: 'text-decoration-none',
                  target: '_blank',
                  href: !metadata.charTable[tIndex][1].isRepUrl
                    ? metadata.charTable[tIndex][1].url
                    : 'javascript:void(0)',
                  file: metadata.charTable[tIndex][1].isRepUrl
                    ? `../${metadata.charTable[tIndex][1].isRepUrl}`
                    : null,
                }).text(metadata.charTable[tIndex][1].text),
              );

            cardBodyTbody.append(
              $('<tr>').append(
                $('<th>', { class: 'bg-transparent', scope: 'row' }).text(
                  metadata.charTable[tIndex][0],
                ),
                td,
              ),
            );
          }
        }

        cardBodyTable.append(cardBodyTbody);
        cardBody.append(cardBodyTable);
      }

      // Add card
      card.append(cardImg, cardBody);
      colSidebar.append(card);

      // Complete
      row.append(colSidebar, colMain);
      markdownBase.html(row);
    },
  };

  // Insert Data
  markdownBase.empty();
  if (
    !metadata ||
    typeof metadata.mode !== 'string' ||
    typeof pageTypes[metadata.mode] !== 'function'
  )
    markdownBase.html(data);
  else pageTypes[metadata.mode]();

  // Top Page
  if (isMainPage) {
    $('#top_page').removeClass('d-none');
  } else {
    $('#top_page').addClass('d-none');
  }

  const markdownHid = (text) =>
    `tiny-wiki-${encodeURIComponent(
      text
        .toLowerCase()
        .trim()
        .replace(/ /g, '_')
        .replace(/\(|\)|\?|\!/g, '_'),
    )}`;

  markdownBase.find(`h1,h2,h3,h4,h5`).each(function () {
    $(this).attr('id', markdownHid($(this).text()));
  });

  // Content List
  if (canContentList)
    $('[id="markdown-read"] .content-list-data').each(function () {
      const tinyBase = $('<div>', {
        class: 'bg-black rounded-top collapse-content d-flex align-items-center',
      });
      // Open Button
      const openButton = $('<h5>', { class: 'm-0 p-2 w-100' });
      openButton
        .text('Contents')
        .prepend(tinyLib.icon('d-flex align-items-center fa-solid fa-list me-2 small'));

      const collapseButton = tinyLib.bs
        .button('link btn-bg p-2 d-flex justify-content-center align-items-center me-2')
        .attr('data-bs-toggle', 'collapse')
        .attr('href', '#content-list-collapse')
        .css({
          height: 30,
          width: 30,
          'font-size': '14px',
        })
        .append(tinyLib.icon('fa-solid fa-square-minus'));

      tinyBase.append(openButton, collapseButton);

      // The Ul
      const ul = $('<ul>', {
        class: 'list-group mb-3 rounded-top-0 bg-black collapse show',
        id: 'content-list-collapse',
      });

      // Insert Li
      const insertLi = (tClass = '', text, isLast, index, index2 = null, extraElement = null) => {
        const li = $('<li>', { class: `${tClass} pb-0 border-0` });
        const liTarget = markdownBase.find(`#${markdownHid(text)}`);
        const tinyText = `${Number(index) + 1}.${index2 !== null ? `${Number(index2)}.` : ''} ${text}`;

        li.append(
          $('<a>', {
            class: 'btn btn-link btn-bg w-100 text-start',
            href: liTarget.length > 0 ? `#${liTarget.attr('id')}` : null,
          }).text(tinyText),
        );
        if (extraElement) li.append(extraElement);

        return li;
      };

      // Read data
      let isLast = false;
      for (let index = 0; index < metadata.contentList.length; index++) {
        isLast = index === metadata.contentList.length - 1;
        if (typeof metadata.contentList[index] === 'string')
          ul.append(insertLi('list-group-item pt-0', metadata.contentList[index], isLast, index));
        else if (
          Array.isArray(metadata.contentList[index]) &&
          metadata.contentList[index].length > 0
        ) {
          const ul2 = $('<ul>', { class: 'my-0' });

          ul.append(
            insertLi(
              'list-group-item py-0',
              metadata.contentList[index][0],
              null,
              index,
              null,
              ul2,
            ),
          );

          for (const index2 in metadata.contentList[index])
            if (Number(index2) !== 0 && typeof metadata.contentList[index][index2] === 'string')
              ul2.append(
                insertLi(`pt-0`, metadata.contentList[index][index2], isLast, index, index2),
              );
        }
      }

      ul.find('> li:first').removeClass('py-0').removeClass('pt-0').addClass('pb-0');
      ul.find('> li:last').removeClass('py-0').removeClass('pb-0').addClass('pt-0');
      $(this).append(tinyBase, ul);
    });

  // Convert File URLs
  $('[id="markdown-read"] a[file]')
    .removeAttr('target')
    .on('click', function () {
      openMDFile($(this).attr('file'));
    });

  // Fix Image
  $('[id="markdown-read"] img').each(function () {
    if ($(this).parents('a').length < 1) {
      // New Image Item
      const src = $(this).attr('src');
      const newImage = $('<img>', { class: 'img-fluid' })
        .css('height', $(this).attr('height'))
        .css('width', $(this).attr('width'));
      $(this).replaceWith(newImage);

      // Load Image FIle
      newImage
        .css({
          cursor: 'pointer',
          opacity: '0%',
          'pointer-events': 'none',
        })
        .on('load', function () {
          const newImg = new Image();
          const tinyThis = $(this);

          newImg.onload = function () {
            tinyThis.data('image-size', {
              width: this.width,
              height: this.height,
            });
            tinyThis.css({ opacity: '100%', 'pointer-events': '' });
          };

          newImg.src = $(this).attr('src');
        })
        .on('click', function () {
          const imgSize = $(this).data('image-size');
          const imgData = { src: $(this).attr('src') };
          const imgAlt = $(this).add('alt');
          if (imgSize) {
            imgData.h = imgSize?.height;
            imgData.w = imgSize?.width;
          }

          if (typeof imgAlt === 'string' && imgAlt.length > 0) imgData.alt = imgAlt;
          const pswp = new PhotoSwipeLightbox({
            dataSource: [imgData],
            close: true,
            zoom: true,
            fullscreen: true,
            counter: false,
            arrowPrev: false,
            arrowNext: false,
            share: false,
            padding: { top: 40, bottom: 40, left: 100, right: 100 },
          });

          pswp.on('close', () => {
            setTimeout(() => {
              pswp.destroy();
            }, 5000);
          });

          pswp.init();
          $(this).fadeTo('fast', 0.7, function () {
            $(this).fadeTo('fast', 1);
          });
          return false;
        })
        .hover(
          function () {
            $(this).fadeTo('fast', 0.8);
          },
          function () {
            $(this).fadeTo('fast', 1);
          },
        );

      // Load Image
      newImage.attr('src', src);

      const newTinyPlace = $('<p>', { class: 'pswp-space mt-4' });
      newTinyPlace.insertAfter(newImage);
    }
  });
};

// Remove Fic Data
const clearFicData = function () {
  if (appData.ai.interval) {
    clearInterval(appData.ai.interval);
    appData.ai.interval = null;
    appData.ai.secondsUsed = 0;
  }

  for (const item in storyData.sfx) {
    if (typeof storyData.sfx[item].hide === 'function') {
      storyData.sfx[item].hide(0);
    }

    if (storyData.sfx[item].pizzicato && typeof storyData.sfx[item].pizzicato.hide === 'function') {
      storyData.sfx[item].pizzicato.hide(0);
    }
  }

  $('body')
    .removeClass('ficMode')
    .removeClass(`fic-daycicle-morning`)
    .removeClass(`fic-daycicle-evening`)
    .removeClass(`fic-daycicle-night`)
    .removeClass(`fic-daycicle-lateAtNight`);

  storyData.nc.base.right.find('> #status').empty();
  $('#fic-chapter').empty();
  storyData.readFic = false;
  storyData.chapter.html = {};
  storyData.chapter.line = null;
  storyData.chapter.nav = {};
  storyData.chapter.selected = 0;

  if (
    storyData.youtube.player &&
    storyData.youtube.checkYT() &&
    storyData.youtube.state === YT.PlayerState.PLAYING
  ) {
    storyData.youtube.player.stopVideo();
  }
};

// Open MD File
const openMDFile = function (url, isMain = false) {
  if (typeof url === 'string') {
    // Remove Fic Data
    clearFicData();

    // New page
    if (url !== 'MAIN') {
      // Read Data Base
      console.log(`Opening MD file "${url}"...`);
      $.LoadingOverlay('show', { background: 'rgba(0,0,0, 0.5)' });

      // Load ajax
      $.ajax({
        url: `${url.startsWith('/') ? url : `/${url}`}${fileVersion}`,
        type: 'get',
        dataType: 'text',
      })
        // Complete
        .done(function (fileData) {
          try {
            // Get metadata
            const fileLines = tinyLib.mdManager.removeMetadata(fileData);
            const md = tinyLib.mdManager.extractMetadata(fileData);
            const title = md.title;

            // Prepare metadata (script created by ChatGPT)
            const metadata = {};
            const githubRegex = tinyLib.getGitUrlPath('{url}docs\\/');
            for (const key in md) {
              const match = key.match(/^([^_]+)(?:_(\d+))+/);
              if (match) {
                const name = match[1];
                const indices = match[0].split('_').slice(1).map(Number);

                if (!metadata[name]) {
                  metadata[name] = [];
                }

                let currentLevel = metadata[name];
                for (let i = 0; i < indices.length - 1; i++) {
                  if (!currentLevel[indices[i]]) {
                    currentLevel[indices[i]] = [];
                  }
                  currentLevel = currentLevel[indices[i]];
                }

                const markdownLink = md[key].match(/^\[(.*?)\]\((.*?)\)$/);
                if (markdownLink) {
                  currentLevel[indices[indices.length - 1]] = {
                    text: markdownLink[1],
                    url: markdownLink[2],
                    isRepUrl: githubRegex.test(markdownLink[2])
                      ? markdownLink[2].replace(githubRegex, '')
                      : null,
                  };
                } else {
                  currentLevel[indices[indices.length - 1]] = md[key];
                }
              } else metadata[key] = md[key];
            }

            // Complete! Insert data into page
            console.log(`${url.endsWith('.md') ? 'MD' : 'HTML'} File opened successfully!`);
            insertMarkdownFile(fileLines, metadata, isMain, url.endsWith('.md') ? false : true);

            tinyLib.goToByScrollTop(0);
            $.LoadingOverlay('hide');
            urlUpdate(url, title);
          } catch (err) {
            // Error!
            $.LoadingOverlay('hide');
            console.error(err);
            alert(err.message);
          }
        })

        // Fail
        .fail((err) => {
          $.LoadingOverlay('hide');
          console.error(err);
          alert(err.message);
        });
    }

    // Main page
    else {
      insertMarkdownFile(storyData.readme, null, isMain, true);
      urlUpdate();
    }
    return;
  }
  throw new Error('Invalid Md File Url!');
};

// Start App
$(() => {
  vanillaPwa.install();
  const startApp = () => {
    console.log('Starting App...');
    storyData.start((fn, readme) => {
      const tinyAiScript = AiScriptStart();

      // Custom Colors
      $('head').append(
        $('<style>', { id: 'custom_color' }).text(`

            .alert .close span{
                color: ${storyCfg.theme.color4} !important;
            }
            
            .alert .close, .alert .close:hover{
                color: ${storyCfg.theme.color} !important;
            }
            
            
            .navbar-dark.bg-dark, #navTopPage {
                background-color: ${storyCfg.theme.primary} !important;
            }
            
            .navbar-dark .navbar-nav .nav-link {
                color: ${storyCfg.theme.color} !important;
            }
            
            .navbar-dark .navbar-nav .nav-link:hover {
                color: ${storyCfg.theme.color2} !important;
            }
            
            
            #sidebar {
                background: ${storyCfg.theme.secondary};
                color: ${storyCfg.theme.color3};
            }
            
            #sidebar .sidebar-header {
                background: ${storyCfg.theme.primary};
                color: ${storyCfg.theme.color};
            }
            
            #sidebar ul p {
                color: ${storyCfg.theme.color};
            }
            
            #sidebar ul li a:hover {
                color: ${storyCfg.theme.color};
                background: ${storyCfg.theme.primary};
            }
            
            #sidebar ul li.active > a, #sidebar a[aria-expanded="true"] {
                color: ${storyCfg.theme.color};
                background: ${storyCfg.theme.primary};
            }
            
            
            .tcat, #footer2{
                color: ${storyCfg.theme.color} !important;
                background-color: ${storyCfg.theme.secondary} !important;
            }
            
            .tcat, #footer2 a:hover{
                color: ${storyCfg.theme.color2} !important;
            }
            
            
            #footer, .modal.fade .modal-header, .thead, .page-footer, .comment-header{
                color: ${storyCfg.theme.color} !important;
                background-color: ${storyCfg.theme.primary} !important
            }
            
            .page-footer a:hover, .page-footer a:hover, #sidebar a {
                color: ${storyCfg.theme.color2} !important;
            }
            
            .thead a{
                color: ${storyCfg.theme.color} !important;
            }
            
            .thead a:hover{
                color: ${storyCfg.theme.color2} !important;
            }
            
            
            .nav-pills .nav-link.active, .nav-pills .show>.nav-link {
                color: ${storyCfg.theme.color} !important;
                background-color: ${storyCfg.theme.primary} !important;
            }
            
            .nav-pills .show>.nav-link:hover {
                color: ${storyCfg.theme.color2} !important;
            }
            
            .page-footer a, #sidebar a {
                color: ${storyCfg.theme.color} !important;
            }
            
            
            
            
            
            .dropdown-item.active, .dropdown-item:active {
                color: ${storyCfg.theme.color};
                background-color: ${storyCfg.theme.secondary}; 
            }
            
            .nav-pills .nav-link.active,
            .nav-pills .show > .nav-link {
                color: ${storyCfg.theme.color};
                background-color: ${storyCfg.theme.secondary}; 
            }
            
            `),
      );

      // Readme
      storyData.readme = readme;

      // Read Updater
      let isNewValue = '';
      storyData.globalIsNew = 0;
      for (const chapter in storyData.isNew) {
        if (storyData.isNew[chapter] === 2 && storyData.isNew[chapter] > storyData.globalIsNew) {
          storyData.globalIsNew = 2;
          isNewValue = $('<span>', { class: 'badge badge-primary ms-2' }).text('NEW');
        } else if (
          storyData.isNew[chapter] === 1 &&
          storyData.isNew[chapter] > storyData.globalIsNew
        ) {
          storyData.globalIsNew = 1;
          isNewValue = $('<span>', {
            class: 'badge badge-secondary ms-2',
          }).text('UPDATE');
        }
      }

      // Year
      const yearNow = moment().year();
      let copyrightText = null;
      if (yearNow === storyCfg.year) {
        copyrightText = `© ${storyCfg.year} ${storyCfg.title} | `;
      } else {
        copyrightText = `© ${storyCfg.year} - ${yearNow} ${storyCfg.title} | `;
      }

      // Dropdown
      const addDropdown = (newItem) => {
        for (const valueName in newItem.dropdowns) {
          const dataList = newItem.dbBase[valueName];
          const tinyHtml = newItem.dropdowns[valueName];
          tinyLib.bs.dropdownClick(tinyHtml, dataList, (li, element, item) => {
            // Create Dropdown
            const aItem = $('<a>', { class: 'dropdown-item', id: item.id, href: item.href });
            li.append(aItem);

            // Add text
            aItem.text(item.text);
            if (item.icon) aItem.prepend(tinyLib.icon(`${item.icon} me-2`));

            // File
            if (typeof item.file === 'string') {
              aItem.attr('href', 'javascript:void(0)');
              aItem.attr('file', item.file);
            }

            // Target
            if (item.href && item.href !== 'javascript:void(0)') aItem.attr('target', '_blank');

            // Is web3
            if (item.web3Element) li.addClass('web3-element');

            // Click
            if (typeof item.file === 'string')
              li.on('click', function () {
                openMDFile(aItem.attr('file'));
              });
            if (item.click) li.on('click', item.click);
            li.on('click', () => {
              element.hide();
              offCanvasNavCfg.hide();
            });
          });
        }
      };

      // Insert Navbars
      const navbarItems = function () {
        // Base Crypto Modal
        let offCanvasEl = null;
        const baseCryptoModal = function (crypto_value, title) {
          return function () {
            const qrcodeCanvas = $('<canvas>');
            QRCode.toCanvas(qrcodeCanvas[0], storyCfg[crypto_value].address, function (error) {
              if (error) {
                alert(error);
              } else {
                // Prepare Text
                tinyLib.modal({
                  title: title + ' Network Donation',

                  id: 'busd_request',
                  dialog: 'modal-lg',

                  body: $('<center>').append(
                    $('<h4>', { class: 'mb-5' }).text(
                      'Please enter the address correctly! Any type issue will be permanent loss of your funds!',
                    ),
                    $('<a>', {
                      target: '_blank',
                      href: storyCfg[crypto_value].explorer + storyCfg[crypto_value].address,
                    }).text('Blockchain Explorer'),
                    $('<br>'),
                    $('<span>').text(storyCfg[crypto_value].address),
                    $('<div>', { class: 'mt-3' }).append(qrcodeCanvas),
                  ),

                  footer: [],
                });
              }
            });

            // Complete
            return false;
          };
        };

        // Base
        const newItem = { dbBase: {} };
        newItem.dbBase.donations = [];
        newItem.dbBase.information = [];
        newItem.dbBase.characters = [];
        newItem.setOffCanvas = (newOffCanvas) => {
          offCanvasEl = newOffCanvas;
        };

        // Derpibooru
        newItem.dbBase.information.push({
          href: `https://derpibooru.org/tags/${storyCfg.derpibooru_tag}`,
          id: 'derpibooru-page',
          text: 'Derpibooru',
          icon: 'fa-solid fa-paintbrush',
        });

        // Tantabus
        newItem.dbBase.information.push({
          href: `https://tantabus.ai/tags/${storyCfg.derpibooru_tag}`,
          id: 'tantabus-page',
          text: 'Tantabus',
          icon: 'fa-solid fa-paintbrush',
        });

        // Tiny Tips
        newItem.dbBase.information.push({
          href: `javascript:void(0)`,
          id: 'information-menu',
          text: 'Museum',
          icon: 'fa-solid fa-building-columns',
          click: () => openMDFile('pages/museum.md'),
        });

        newItem.dbBase.information.push({
          href: `javascript:void(0)`,
          id: 'tiny-ai-writer-tips',
          text: 'AI Tips for human artists',
          icon: 'fa-solid fa-circle-info',
          click: () => openMDFile('pages/artistTips.md'),
        });

        newItem.dbBase.information.push({
          href: `javascript:void(0)`,
          id: 'ai-fic-template',
          text: 'Official AI Models',
          icon: 'fa-solid fa-toolbox',
          click: () => openMDFile('pages/ai-templates/ai-models.md'),
        });

        // Patreon
        if (storyCfg.patreon) {
          newItem.dbBase.donations.push({
            href: `https://patreon.com/${storyCfg.patreon}`,
            id: 'patreon-url',
            text: 'Patreon',
            icon: 'fa-brands fa-patreon',
          });
        }

        // Kofi
        if (storyCfg.kofi) {
          newItem.dbBase.donations.push({
            href: `https://ko-fi.com/${storyCfg.kofi}`,
            id: 'kofi-url',
            text: 'Ko-Fi',
            icon: 'fa-solid fa-mug-hot',
          });
        }

        // Bitcoin
        if (storyCfg.bitcoin && storyCfg.bitcoin.address && storyCfg.bitcoin.explorer) {
          newItem.dbBase.donations.push({
            href: storyCfg.bitcoin.explorer + storyCfg.bitcoin.address,
            id: 'bitcoin-wallet',
            text: 'Bitcoin',
            icon: 'fa-brands fa-bitcoin',
            click: baseCryptoModal('bitcoin', 'Bitcoin'),
          });
        }

        // Dogecoin
        if (storyCfg.dogecoin && storyCfg.dogecoin.address && storyCfg.dogecoin.explorer) {
          newItem.dbBase.donations.push({
            href: storyCfg.dogecoin.explorer + storyCfg.dogecoin.address,
            id: 'dogecoin-wallet',
            text: 'Dogecoin',
            icon: 'cf cf-doge',
            click: baseCryptoModal('dogecoin', 'Dogecoin'),
          });
        }

        // Ethereum
        if (storyCfg.ethereum && storyCfg.ethereum.address && storyCfg.ethereum.explorer) {
          newItem.dbBase.donations.push({
            href: storyCfg.ethereum.explorer + storyCfg.ethereum.address,
            id: 'ethereum-wallet',
            text: 'Ethereum',
            icon: 'fa-brands fa-ethereum',
            web3Element: true,
            click: baseCryptoModal('ethereum', 'Ethereum'),
          });
        }

        // Polygon
        if (storyCfg.polygon && storyCfg.polygon.address && storyCfg.polygon.explorer) {
          newItem.dbBase.donations.push({
            href: storyCfg.polygon.explorer + storyCfg.polygon.address,
            id: 'polygon-wallet',
            text: 'Polygon',
            icon: 'cf cf-matic',
            web3Element: true,
            click: baseCryptoModal('polygon', 'Polygon'),
          });
        }

        // BNB
        if (storyCfg.bnb && storyCfg.bnb.address && storyCfg.bnb.explorer) {
          newItem.dbBase.donations.push({
            href: storyCfg.bnb.explorer + storyCfg.bnb.address,
            id: 'bnb-wallet',
            text: 'BNB',
            icon: 'cf cf-bnb',
            web3Element: true,
            click: baseCryptoModal('bnb', 'BNB'),
          });
        }

        // Crypto Wallet
        if (storyCfg.nftDomain && storyCfg.nftDomain.url) {
          newItem.dbBase.donations.push({
            href: storyCfg.nftDomain.url.replace('{domain}', storyCfg.nftDomain.domainWallet),
            id: 'crypto-wallet',
            text: 'More crypto wallets',
            web3Element: true,
            icon: 'fas fa-wallet',
          });
        }

        // Characters
        newItem.dbBase.characters.push({
          file: '/data/characters/rayane/README.md',
          text: 'Rayane (Page WIP)',
        });

        newItem.dbBase.characters.push({
          file: '/data/characters/james/README.md',
          text: 'James (Character WIP)',
        });

        newItem.dbBase.characters.push({
          file: '/data/characters/rainbow-queen/README.md',
          text: 'Rainbow Queen',
        });

        newItem.dbBase.characters.push({
          file: '/data/characters/princess-ariella/README.md',
          text: 'Princess Ariella (Page WIP)',
        });

        newItem.dbBase.characters.push({
          file: '/data/characters/amy/README.md',
          text: 'Amy (Page WIP)',
        });

        newItem.dbBase.characters.push({
          file: '/data/characters/layla/README.md',
          text: 'Layla (Page WIP)',
        });

        newItem.dbBase.characters.push({
          file: '/data/characters/prisma/README.md',
          text: 'Prisma (Character WIP)',
        });

        newItem.dbBase.characters.push({
          file: '/data/characters/aniya/README.md',
          text: 'Aniya (Character WIP)',
        });

        newItem.dbBase.characters.push({
          file: '/data/characters/blue-screen/README.md',
          text: 'Blue Screen (Page WIP)',
        });

        newItem.dbBase.characters.push({
          file: '/data/characters/whistler/README.md',
          text: 'Whistler (Character WIP)',
        });

        // Meta Login
        const metaLogin = {
          base: $('<li>', { class: 'nav-item font-weight-bold' }),
          title: 'Login',
        };
        if (puddyWeb3.existAccounts()) {
          metaLogin.title = puddyWeb3.getAddress();
        }

        metaLogin.button = tinyLib.bs
          .button({ dsBtn: true, id: 'login', class: 'nav-link web3-element' })
          .attr('title', metaLogin.title)
          .prepend(tinyLib.icon('fa-brands fa-ethereum me-2'));

        metaLogin.base.prepend(metaLogin.button);
        metaLogin.button.on('click', storyCfg.web3.login);

        // AI Login
        const aiLogin = {
          base: $('<li>', { class: 'nav-item font-weight-bold' }),
          secondsUsed: 0,
          title: '',
          updateTitle: () => {
            if (aiLogin.button) {
              const title = `${aiLogin.title}${aiLogin.secondsUsed > 0 ? ` - ${tinyLib.formatDayTimer(aiLogin.secondsUsed)}` : ''}`;
              aiLogin.button.removeAttr('title');
              aiLogin.button.attr('data-bs-original-title', title);
            }
          },
        };
        tinyAiScript.setAiLogin(aiLogin);

        aiLogin.button = tinyLib.bs
          .button({ id: 'ai-login', dsBtn: true, class: 'nav-link' })
          .prepend(tinyLib.icon('fa-solid fa-robot me-2'));

        tinyAiScript.checkTitle();
        aiLogin.base.prepend(aiLogin.button);
        aiLogin.button.on('click', function () {
          tinyAiScript.login(this);
          return false;
        });

        // Nav Items
        newItem.dropdowns = {};

        newItem.dropdowns.information = $('<li>', {
          class: 'nav-item dropdown',
          id: 'information-menu',
        }).prepend(
          tinyLib.bs.button({ dsBtn: true, class: 'nav-link dropdown-toggle' }).text('Information'),
        );
        // Donations Button
        newItem.dropdowns.donations = $('<li>', {
          class: 'nav-item dropdown',
          id: 'donations-menu',
        }).prepend(
          tinyLib.bs.button({ dsBtn: true, class: 'nav-link dropdown-toggle' }).text('Donations'),
        );
        // Characters
        newItem.dropdowns.characters = $('<li>', {
          class: 'nav-item dropdown',
          id: 'characters-menu',
        }).prepend(
          tinyLib.bs.button({ dsBtn: true, class: 'nav-link dropdown-toggle' }).text('Characters'),
        );
        newItem.left = [
          // Homepage
          $('<li>', { class: 'nav-item' }).prepend(
            $('<a>', { class: 'nav-link', href: '/', id: 'homepage' })
              .text('Home')
              .prepend(tinyLib.icon('fas fa-home me-2'))
              .on('click', () => {
                openMDFile('MAIN', true);
                if (offCanvasEl) offCanvasEl.hide();
                return false;
              }),
          ),

          // Discord Server
          $('<li>', { class: 'nav-item' }).prepend(
            $('<a>', {
              class: 'nav-link',
              target: '_blank',
              href: `https://discord.gg/${storyCfg.discordInvite}`,
              id: 'discord-server',
            })
              .text('Discord')
              .prepend(tinyLib.icon('fab fa-discord me-2'))
              .on('click', () => {
                if (offCanvasEl) offCanvasEl.hide();
              }),
          ),

          // Blog
          $('<li>', { class: 'nav-item' }).prepend(
            $('<a>', {
              class: 'nav-link',
              target: '_blank',
              href: storyCfg.blog_url,
              id: 'blog-url',
            })
              .text('Blog')
              .prepend(tinyLib.icon('fa-solid fa-rss me-2'))
              .on('click', () => {
                if (offCanvasEl) offCanvasEl.hide();
              }),
          ),

          // AI
          $('<li>', { class: 'nav-item nav-ai' }).prepend(
            $('<a>', {
              class: 'nav-link',
              href: '/?path=ai',
              id: 'ai-access-page',
            })
              .text('AI Page')
              .prepend(tinyLib.icon('fa-solid fa-server me-2'))
              .on('click', () => {
                tinyAiScript.open();
                if (offCanvasEl) offCanvasEl.hide();
                return false;
              }),
          ),

          newItem.dropdowns.information,
          newItem.dropdowns.donations,
          newItem.dropdowns.characters,
        ];
        newItem.right = [
          // Status Place
          $('<span>', { id: 'status' }),

          // Chapter Name
          $('<li>', { id: 'fic-chapter', class: 'nav-item nav-link' }),

          // Login
          aiLogin.base,
          metaLogin.base,

          // Read Fic
          $('<li>', {
            class: 'nav-item font-weight-bold',
          })
            .prepend(
              $('<a>', {
                id: 'fic-start',
                class: 'nav-link',
                href: '/?path=read-fic',
              })
                .text('Read Fic')
                .append(isNewValue)
                .prepend(tinyLib.icon('fab fa-readme me-2')),
            )
            .on('click', () => {
              $('#top_page').addClass('d-none');
              openChapterMenu();
              if (offCanvasEl) offCanvasEl.hide();
              return false;
            }),
        ];

        aiLogin.button.tooltip();
        metaLogin.button.tooltip();
        return newItem;
      };

      // Navbar items
      const navbarData = navbarItems();
      const offCanvasBase = $('<ul>', { class: 'list-group list-group-flush' });
      const navbarOffCanvas = tinyLib.bs.offcanvas(
        'end d-lg-none',
        'offcanvasNavbar',
        'Pony Driland',
        offCanvasBase,
      );

      const tinyCollapse1 = tinyLib.bs.navbar.collapse('left', 'small mdMenu', null);
      const tinyCollapse2 = tinyLib.bs.navbar.collapse('right', 'small mdMenu', 'fic-nav');

      // Insert Navbar
      $('body').prepend(
        // Navbar
        navbarOffCanvas,
        tinyLib.bs.navbar.root('md-navbar', 'dark', true).append(
          // Title
          tinyLib.bs.navbar.title(storyCfg.title, '/').on('click', () => {
            openMDFile('MAIN', true);
            return false;
          }),

          // Offcanvas button
          tinyLib.bs
            .button({
              dsBtn: true,
              class: 'navbar-toggler',
              toggle: 'offcanvas',
              target: '#offcanvasNavbar',
            })
            .append($('<span>', { class: 'navbar-toggler-icon' })),

          // Collapse
          tinyCollapse1,
          tinyCollapse2,
        ),
      );

      storyData.nc = { base: {}, item: {} };
      storyData.nc.item.left = tinyCollapse1.find('> ul');
      storyData.nc.item.right = tinyCollapse2.find('> ul');
      const offCanvasNavCfg = new bootstrap.Offcanvas(navbarOffCanvas.get(0));
      addDropdown(navbarData);
      navbarData.setOffCanvas(offCanvasNavCfg);

      const checkWindowSize = () => {
        if (window.matchMedia('(min-width: 992px)').matches) {
          storyData.nc.base.left = storyData.nc.item.left;
          storyData.nc.base.right = storyData.nc.item.right;
          storyData.nc.item.left.append(navbarData.left);
          storyData.nc.item.right.append(navbarData.right);
        } else {
          storyData.nc.base.left = offCanvasBase;
          storyData.nc.base.right = offCanvasBase;
          offCanvasBase.append(navbarData.left, navbarData.right);
        }
      };

      window.addEventListener('resize', checkWindowSize);
      checkWindowSize();

      // Insert Readme
      $('#app').append(tinyLib.bs.container('markdown-read'));

      // Footer Base
      const tinyFooter = { 1: [], 2: [] };

      // Footer 1

      // OpenSea
      if (storyCfg.opensea) {
        tinyFooter[1].push(
          $('<li>').append(
            $('<a>', {
              target: '_blank',
              href: `https://opensea.io/collection/${storyCfg.opensea}`,
            })
              .text('OpenSea')
              .prepend(tinyLib.icon('fab fa-ethereum me-2')),
          ),
        );
      }

      // CID32
      if (storyData.cid32) {
        tinyFooter[1].push(
          $('<li>').append(
            $('<a>', { href: `https://${storyData.cid32}.ipfs.dweb.link/` })
              .text('IPFS ' + storyCfg.nftDomain.name)
              .prepend(tinyLib.icon('fas fa-wifi me-2')),
          ),
        );
      }

      // Mastodon
      if (storyCfg.mastodon) {
        tinyFooter[1].push(
          $('<li>').prepend(
            $('<a>', {
              rel: 'me',
              target: '_blank',
              href: `https://${storyCfg.mastodon.domain}/@${storyCfg.mastodon.username}`,
            })
              .text('Mastodon')
              .prepend(tinyLib.icon('fa-brands fa-mastodon me-2')),
          ),
        );
      }

      // Discord Invite
      if (storyCfg.discordInvite) {
        tinyFooter[1].push(
          $('<li>').append(
            $('<a>', {
              target: '_blank',
              href: `https://discord.gg/${storyCfg.discordInvite}`,
            })
              .text('Discord Server')
              .prepend(tinyLib.icon('fab fa-discord me-2')),
          ),
        );
      }

      // Mirror
      if (
        (Array.isArray(storyCfg.mirror) && storyCfg.mirror.indexOf(location.host) > -1) ||
        !Array.isArray(storyCfg.mirror) ||
        storyCfg.mirror.length < 1
      ) {
        tinyFooter[1].push(
          $('<li>').append(
            $('<a>', { target: '_blank', href: `https://${storyCfg.domain}` })
              .text('Website')
              .prepend(tinyLib.icon('fa-solid fa-pager me-2')),
          ),
        );
      } else {
        tinyFooter[1].push(
          $('<li>').append(
            $('<a>', {
              target: '_blank',
              href: `https://${storyCfg.mirror[dice.roll() - 1]}`,
            })
              .text('Mirror')
              .prepend(tinyLib.icon('fa-solid fa-pager me-2')),
          ),
        );
      }

      // Footer 2
      if (storyCfg.nftDomain) {
        tinyFooter[2].push(
          $('<li>').append(
            $('<a>', {
              target: '_blank',
              href: storyCfg.nftDomain.url.replace('{domain}', storyCfg.nftDomain.valueURL),
            })
              .text(storyCfg.nftDomain.name)
              .prepend(tinyLib.icon('fas fa-marker me-2')),
          ),
        );
      }

      if (storyCfg.github) {
        tinyFooter[2].push(
          $('<li>').append(
            $('<a>', {
              target: '_blank',
              href: `https://github.com/${storyCfg.github.account}/${storyCfg.github.repository}`,
            })
              .text('Github')
              .prepend(tinyLib.icon('fab fa-github me-2')),
          ),
        );
      }

      tinyFooter[2].push(
        $('<li>').append(
          $('<a>', { target: '_blank', href: 'mailto:' + storyCfg.contact })
            .text('Contact')
            .prepend(tinyLib.icon('fas fa-envelope me-2')),
        ),
      );

      tinyFooter[2].push(
        $('<li>')
          .prepend(
            $('<a>', {
              href: '/?path=%2FLICENSE.md&title=License',
              href: '/?path=%2FLICENSE.md&title=License',
              id: 'license',
            })
              .text('License')
              .prepend(tinyLib.icon('fas fa-copyright me-2')),
          )
          .on('click', () => {
            openMDFile('/LICENSE.md');
            return false;
          }),
      );

      // Insert Footer
      $('body').append(
        $('<footer>', { class: 'page-footer font-small pt-4 clearfix' }).append(
          // Base
          $('<div>', {
            class: 'container-fluid text-center text-md-left',
          }).append(
            $('<div>', { class: 'row' }).append(
              // Logo
              $('<div>', { class: 'col-md-6 mt-md-0 mt-3' }).append(
                $('<center>').append(
                  $('<img>', { class: 'img-fluid', src: '/img/logo.png' }),
                  $('<br/>'),
                ),
              ),

              // Links 1
              $('<div>', { class: 'col-md-3 mb-md-0 mb-3' }).append(
                $('<h5>').text('Links'),
                $('<ul>', { class: 'list-unstyled' }).append(tinyFooter[1]),
              ),

              // Links 2
              $('<div>', { class: 'col-md-3 mb-md-0 mb-3' }).append(
                $('<h5>').text('Links'),
                $('<ul>', { class: 'list-unstyled' }).append(tinyFooter[2]),
              ),
            ),
          ),

          // Copyright
          $('<div>', {
            id: 'footer2',
            class: 'footer-copyright text-center py-3 bg-secondary text-white',
          })
            .text(copyrightText)
            .append(
              $('<a>', { target: '_blank', href: storyCfg.creator_url }).text(storyCfg.creator),
              '.',
            ),
        ),
      );

      // Carousel
      const indicators = $('body > #root #carouselHomepage .carousel-indicators');
      const inner = $('body > #root #carouselHomepage .carousel-inner');

      const slides = [
        {
          img: './img/homepage/banner/pony_driland.jpg',
          title: 'Pony Driland',
          text: 'Discover a science fiction story mixed with horror, mystery, and adventure. A mysterious dimension has just been discovered!',
        },
        {
          img: './img/homepage/banner/discord.jpg',
          title: 'Discord Server',
          text: '<a href="https://discord.gg/sSkysVtj7y" target="_blank">Join the Discord official server to see real-time updates.</a>',
        },
      ];

      // Insert slides
      slides.forEach((slide, index) => {
        // Options
        $('<li>', {
          'data-bs-target': '#carouselHomepage',
          'data-bs-slide-to': index,
          class: index === 0 ? 'active' : '',
        }).appendTo(indicators);

        const item = $('<div>', {
          class: 'carousel-item' + (index === 0 ? ' active' : ''),
        }).appendTo(inner);

        // Image
        $('<div>', {
          class: 'img',
          css: { 'background-image': 'url(' + slide.img + ')' },
        }).appendTo(item);

        // Text
        const caption = $('<div>', { class: 'carousel-caption' }).appendTo(item);
        $('<h5>', { class: 'px-5', text: slide.title }).appendTo(caption);
        $('<p>', { class: 'px-5' }).html(slide.text).appendTo(caption);
      });

      // Start Readme
      if (params.path === 'read-fic') openChapterMenu(params);
      else if (params.path === 'ai') tinyAiScript.open();
      else openNewAddress(params, true, true);

      // Final part
      fn();

      // First Time
      if (!localStorage.getItem('firstTime')) {
        localStorage.setItem('firstTime', true);
        alert(
          `If this is the first time you enter the website, remember that to browse the website, use navbar at the top of the page. If you want to read the fic, go to the "Read Fic" page that is in the right corner of the navbar.

This same navbar will also show all the fic tools as "bookmark" and data progress of the story. Although we have an account system, you are not required to use. Please use only what you really find necessary to use.`,
          'Welcome to Pony Driland!',
        );
      }
    });
  };

  puddyWeb3.waitReadyProvider().then(startApp).catch(startApp);
});
