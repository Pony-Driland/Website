import { marked } from 'marked';
import TinyHtml from 'tiny-essentials/libs/TinyHtml';
import tinyLib, { alert } from '../files/tinyLib.mjs';

import { storyData } from '../files/chapters.mjs';
import { appData, gtag, loaderScreen } from '../important.mjs';
import { tinyAiScript } from '../ai/software/tinyAiScript.mjs';
import storyCfg from '../chapters/config.mjs';

import { fixFileUrl, fixHref, fixImageSrc } from './urls.mjs';

/**
 * Remove Fic Data
 */
export const clearFicData = () => {
  if (appData.ai.interval) {
    clearInterval(appData.ai.interval);
    appData.ai.interval = null;
    appData.ai.secondsUsed = 0;
  }
  tinyAiScript.killIo();

  for (const item in storyData.sfx) {
    if (typeof storyData.sfx[item].hide === 'function') {
      storyData.sfx[item].hide(0);
    }

    if (storyData.sfx[item].pizzicato && typeof storyData.sfx[item].pizzicato.hide === 'function') {
      storyData.sfx[item].pizzicato.hide(0);
    }
  }

  TinyHtml.query('body')
    ?.removeClass('ficMode')
    .removeClass(`fic-daycicle-morning`)
    .removeClass(`fic-daycicle-evening`)
    .removeClass(`fic-daycicle-night`)
    .removeClass(`fic-daycicle-lateAtNight`);

  new TinyHtml(storyData.nc.base.right.find(':scope > #status')).empty();
  TinyHtml.query('#fic-chapter')?.empty();
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

/**
 * URL Update
 *
 * @param {string} url
 * @param {string} [title]
 * @param {boolean} [isPopState=false]
 * @param {Record<string, any>} [extra={}]
 */
export const urlUpdate = (url, title, isPopState = false, extra = {}) => {
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
  if (typeof storyCfg.gtag === 'string') {
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

/**
 * @typedef {Object} MarkdownMetadata
 * @property {any[]} [contentList]
 * @property {any[]} [charTable]
 * @property {string} [name]
 * @property {string} [cardUrl]
 * @property {string} [subName]
 * @property {string} [mode]
 */

/**
 * Insert Maarkdown File
 *
 * @param {string} text
 * @param {MarkdownMetadata|null} [metadata=null]
 * @param {boolean} [isMainPage=false]
 * @param {boolean} [isHTML=false]
 */
const insertMarkdownFile = (text, metadata = null, isMainPage = false, isHTML = false) => {
  /** @type {string} */
  let data = '';

  if (!isHTML) data = marked.parse(text.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, ''));
  else data = text;

  data = data
    .replace(tinyLib.getGitUrlPath(`href\=\"{url}public\\/`), 'href="javascript:void(0)" file="../')
    .replace(tinyLib.getGitUrlPath(`src\=\"{url}public\\/`), 'src="../')
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
  const markdownBase = TinyHtml.query('#markdown-read');
  const pageTypes = {
    // Wiki
    wiki: () => {
      // Row
      const row = TinyHtml.createFrom('div', { class: 'wiki-page' });

      // Main content
      const colMain = TinyHtml.createFrom('div');

      colMain.append(
        TinyHtml.createFrom('h1').setText(metadata.name),
        TinyHtml.createFromHTML(data),
      );

      // Sidebar
      const colSidebar = TinyHtml.createFrom('div', {
        class: 'float-md-end character-wikicard ms-md-2 mb-3 mb-md-2',
      });

      const card = TinyHtml.createFrom('div', { class: 'card position-relative' });
      const cardImg = TinyHtml.createFrom('img', {
        src: metadata.cardUrl,
        class: 'card-img-top',
        alt: metadata.name,
      });

      // Card body
      const cardBody = TinyHtml.createFrom('div', { class: 'card-body' }).append(
        TinyHtml.createFrom('h5', { class: 'card-title' }).setText(metadata.name),
        TinyHtml.createFrom('p', { class: 'card-text text-muted' }).setText(
          `(${metadata.subName})`,
        ),
      );

      // Character table
      if (Array.isArray(metadata.charTable) && metadata.charTable.length > 0) {
        const cardBodyTable = TinyHtml.createFrom('table', { class: 'table table-hover m-0' });
        const cardBodyTbody = TinyHtml.createFrom('tbody');
        for (const tIndex in metadata.charTable) {
          if (typeof metadata.charTable[tIndex][1] !== 'undefined') {
            const td = TinyHtml.createFrom('td', { class: 'bg-transparent' });
            if (typeof metadata.charTable[tIndex][1] === 'string')
              td.setText(metadata.charTable[tIndex][1]);
            else if (
              typeof metadata.charTable[tIndex][1].text === 'string' &&
              typeof metadata.charTable[tIndex][1].url === 'string'
            )
              td.append(
                TinyHtml.createFrom('a', {
                  class: 'text-decoration-none',
                  target: '_blank',
                  href: !metadata.charTable[tIndex][1].isRepUrl
                    ? metadata.charTable[tIndex][1].url
                    : 'javascript:void(0)',
                  file: metadata.charTable[tIndex][1].isRepUrl
                    ? `../${metadata.charTable[tIndex][1].isRepUrl}`
                    : null,
                }).setText(metadata.charTable[tIndex][1].text),
              );

            cardBodyTbody.append(
              TinyHtml.createFrom('tr').append(
                TinyHtml.createFrom('th', { class: 'bg-transparent', scope: 'row' }).setText(
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
      markdownBase?.append(row);
    },
  };

  // Insert Data
  markdownBase?.empty();
  if (
    !metadata ||
    typeof metadata.mode !== 'string' ||
    typeof pageTypes[metadata.mode] !== 'function'
  )
    markdownBase?.setHtml(data);
  else pageTypes[metadata.mode]();

  // Top Page
  if (isMainPage) {
    TinyHtml.query('#top_page')?.removeClass('d-none');
  } else {
    TinyHtml.query('#top_page')?.addClass('d-none');
  }

  const markdownHid = (text) =>
    `tiny-wiki-${encodeURIComponent(
      text
        .toLowerCase()
        .trim()
        .replace(/ /g, '_')
        .replace(/\(|\)|\?|\!/g, '_'),
    )}`;

  if (markdownBase) {
    const markdownItems = new TinyHtml(markdownBase.find(`h1,h2,h3,h4,h5`));
    markdownItems.forEach((item) => {
      item.setAttr('id', markdownHid(item.text()));
    });
  }

  // Content List
  if (canContentList)
    TinyHtml.queryAll('[id="markdown-read"] .content-list-data').forEach((item) => {
      const tinyBase = TinyHtml.createFrom('div', {
        class: 'bg-black rounded-top collapse-content d-flex align-items-center',
      });
      // Open Button
      const openButton = TinyHtml.createFrom('h5', { class: 'm-0 p-2 w-100' });
      openButton
        .setText('Contents')
        .prepend(tinyLib.icon('d-flex align-items-center fa-solid fa-list me-2 small'));

      const collapseButton = tinyLib.bs
        .button('link btn-bg p-2 d-flex justify-content-center align-items-center me-2')
        .setAttr('data-bs-toggle', 'collapse')
        .setAttr('href', '#content-list-collapse')
        .setStyle({
          height: 30,
          width: 30,
          'font-size': '14px',
        })
        .append(tinyLib.icon('fa-solid fa-square-minus'));

      tinyBase.append(openButton, collapseButton);

      // The Ul
      const ul = TinyHtml.createFrom('ul', {
        class: 'list-group mb-3 rounded-top-0 bg-black collapse show',
        id: 'content-list-collapse',
      });

      /**
       * Insert Li
       * @param {string} [tClass='']
       * @param {string} [text]
       * @param {boolean} [isLast=false]
       * @param {string|number} [index]
       * @param {string|number|null} [index2=null]
       * @param {TinyHtml<any>|null} [extraElement=null]
       *
       * @returns {TinyHtml<HTMLElement>}
       */
      const insertLi = (
        tClass = '',
        text = '',
        isLast = false,
        index,
        index2 = null,
        extraElement = null,
      ) => {
        const li = TinyHtml.createFrom('li', { class: `${tClass} pb-0 border-0` });
        const liTarget = new TinyHtml(markdownBase.find(`#${markdownHid(text)}`));
        const tinyText = `${Number(index) + 1}.${index2 !== null ? `${Number(index2)}.` : ''} ${text}`;

        li.append(
          TinyHtml.createFrom('a', {
            class: 'btn btn-link btn-bg w-100 text-start',
            href: liTarget.size > 0 ? `#${liTarget.attr('id')}` : null,
          }).setText(tinyText),
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
          const ul2 = TinyHtml.createFrom('ul', { class: 'my-0' });

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

      new TinyHtml(ul.find(':scope > li:first-child'))
        .removeClass('py-0')
        .removeClass('pt-0')
        .addClass('pb-0');
      new TinyHtml(ul.find(':scope > li:last-child'))
        .removeClass('py-0')
        .removeClass('pb-0')
        .addClass('pt-0');
      item.append(tinyBase, ul);
    });

  // Convert File URLs
  TinyHtml.queryAll('[id="markdown-read"] a[file]').forEach(fixFileUrl(openMDFile));

  TinyHtml.queryAll('[id="markdown-read"] a:not([file])').forEach(fixHref);
  TinyHtml.queryAll('[id="markdown-read"] img').forEach(fixImageSrc);
};

/**
 * Open MD File
 * @param {string} url
 * @param {boolean} [isMain=false]
 */
export const openMDFile = async (url, isMain = false) => {
  if (typeof url === 'string') {
    // Remove Fic Data
    clearFicData();

    // New page
    if (url !== 'MAIN') {
      // Read Data Base
      console.log(`Opening MD file "${url}"...`);
      loaderScreen.start('Loading page...');

      // Load ajax
      const fileData = await fetch(
        `${url.startsWith('/') ? url : `/${url}`}${window.fileVersion ?? ''}`,
        {
          method: 'GET',
          dataType: 'text',
        },
      )
        .then((res) => res.text())
        .catch((err) => {
          loaderScreen.stop();
          console.error(err);
          alert(err.message);
        });

      if (!fileData) return;
      try {
        // Get metadata
        const fileLines = tinyLib.mdManager.removeMetadata(fileData);
        const md = tinyLib.mdManager.extractMetadata(fileData);
        const title = md.title;

        // Prepare metadata (script created by ChatGPT)
        /** @type {MarkdownMetadata} */
        const metadata = {};
        const githubRegex = tinyLib.getGitUrlPath('{url}public\\/');
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

        TinyHtml.setWinScrollTop(0);
        loaderScreen.stop();
        urlUpdate(url, title);
      } catch (err) {
        // Error!
        loaderScreen.stop();
        console.error(err);
        alert(err.message);
      }
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

export const openNewAddress = (data, isPopState = false, useCustom = false) => {
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
