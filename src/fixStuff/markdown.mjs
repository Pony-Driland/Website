import { marked } from 'marked';
import TinyHtml from 'tiny-essentials/libs/html/TinyHtml';
import TinyHtmlElems from 'tiny-essentials/libs/html/TinyHtmlElems';
import { alert } from 'tiny-essentials/webTemplates/bootstrap/5.3/html/BootstrapDialogs';
import tinyLib from '../files/tinyLib.mjs';

import { storyData } from '../files/chapters.mjs';
import { appData, gtag, loaderScreen } from '../important.mjs';
import { tinyAiScript } from '../ai/software/tinyAiScript.mjs';
import storyCfg from '../chapters/config.mjs';

import { fixFileUrl, fixHref, fixImageSrc, fixSpoilers } from './urls.mjs';
import { body, topPage } from '../html/query.mjs';
import { yt } from '../api/youtube.mjs';
import { markdownBase } from '../html/base.mjs';
import { updateUrl } from '../router/index.mjs';
import { getCharacterByPath } from '../router/pages.mjs';

import '../markdown/dropdown.mjs';
import '../markdown/spoiler.mjs';
import '../markdown/ai-tag.mjs';
import { convertIsoStringsToCalendar } from '../files/utils.mjs';

const { Icon } = TinyHtmlElems;

/**
 * @import { TinyHtmlAny } from 'tiny-essentials/libs/html/TinyHtml';
 */

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

  body
    .removeClass('ficMode')
    .removeClass(`fic-daycicle-morning`)
    .removeClass(`fic-daycicle-evening`)
    .removeClass(`fic-daycicle-night`)
    .removeClass(`fic-daycicle-lateAtNight`);

  new TinyHtml(storyData.nc.base.right.find(':scope > #status')).empty();
  TinyHtml.query('#fic-chapter')?.empty();
  storyData.readFic = false;
  storyData.chapter.html = {};
  storyData.chapter.line = 0;
  storyData.chapter.nav = {};
  storyData.chapter.selected = 0;

  if (yt.exists && yt.state === YT.PlayerState.PLAYING) yt.player.stopVideo();
};

/**
 * URL Update
 *
 * Keeps the browser URL in sync with the page that is currently rendered. The
 * URL itself is built by the router, so the URL format is described in a
 * single place.
 *
 * @param {import('../router/pages.mjs').RouterPage} page - Page being rendered.
 * @param {boolean} [isPopState=false] - Whether this comes from a popstate event.
 * @returns {void}
 */
export const urlUpdate = (page, isPopState = false) => {
  const title =
    typeof page.title === 'string' && page.title.length > 0 ? page.title : storyCfg.title;

  if (page.name === 'ai') {
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

  document.title = title;
  storyData.urlPage = page.path ?? page.name;

  // Google
  if (typeof storyCfg.gtag === 'string') {
    gtag('event', 'url', {
      event_title: title,
      event_category: 'open_url',
      url: storyData.urlPage,
    });
  }

  if (!isPopState) updateUrl({ ...page, title });
};

/**
 * A single entry of the wiki character card table.
 *
 * @typedef {Object} MarkdownCharTableLink
 * @property {string} text - Link label.
 * @property {string} url - Link target.
 * @property {string|null} [isRepUrl] - Repository relative path, when it points to another page.
 */

/**
 * A row of the wiki character card table: `[label, value]`.
 *
 * @typedef {[string, string|MarkdownCharTableLink]} MarkdownCharTableRow
 */

/**
 * A single entry of the markdown content list. Either a plain title or a
 * `[title, ...children]` tuple describing a nested list.
 *
 * @typedef {string|string[]} MarkdownContentListItem
 */

/**
 * Metadata extracted from the markdown front matter.
 *
 * @typedef {Object} MarkdownMetadata
 * @property {MarkdownContentListItem[]} [contentList]
 * @property {MarkdownCharTableRow[]} [charTable]
 * @property {string} [name]
 * @property {string} [cardUrl]
 * @property {string} [subName]
 * @property {string} [mode]
 * @property {string} [title]
 */

/**
 * A single leaf value stored in the markdown front matter metadata.
 *
 * @typedef {string|number|boolean|MarkdownMetadata|MarkdownCharTableLink} MarkdownMetadataLeaf
 */

/**
 * A nested list of markdown metadata values.
 *
 * @typedef {Array<MarkdownMetadataLeaf|MarkdownMetadataValue[]>} MarkdownMetadataValue
 */

/**
 * Front matter metadata indexed by its raw key.
 *
 * @typedef {MarkdownMetadata & Record<string, MarkdownMetadataValue|MarkdownMetadataLeaf>} MarkdownMetadataMap
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

  // Fix Html
  if (!isHTML)
    data = String(marked.parse(text.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, '')));
  else data = text;

  // Fix URLs
  data = data
    .replace(tinyLib.getGitUrlPath(`href\=\"{url}public\\/`), 'href="javascript:void(0)" file="../')
    .replace(tinyLib.getGitUrlPath(`src\=\"{url}public\\/`), 'src="../')
    .replace(
      new RegExp(`src\=\"https\:\/\/ipfs\.io\/ipfs\/`, 'g'),
      'src="https://cloudflare-ipfs.com/ipfs/',
    );

  // Content List
  const canContentList =
    metadata && Array.isArray(metadata.contentList) && metadata.contentList.length > 0;
  if (canContentList)
    data = data.replace('{{content_list}}', '<div class="content-list-data"></div>');
  else data = data.replace('{{content_list}}', '');

  // Markdown page ways
  /** @type {Record<string, () => void>} */
  const pageTypes = {
    // Wiki
    wiki: () => {
      if (!metadata) return;
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
        src: metadata.cardUrl ?? null,
        class: 'card-img-top',
        alt: metadata.name ?? null,
      });

      // Card body
      const cardBody = TinyHtml.createFrom('div', { class: 'card-body' }).append(
        TinyHtml.createFrom('h5', { class: 'card-title' }).setText(metadata.name),
        TinyHtml.createFrom('p', { class: 'card-text text-muted' }).setText(
          `(${metadata.subName})`,
        ),
      );

      // Character table
      const charTable = metadata.charTable;
      if (Array.isArray(charTable) && charTable.length > 0) {
        const cardBodyTable = TinyHtml.createFrom('table', { class: 'table table-hover m-0' });
        const cardBodyTbody = TinyHtml.createFrom('tbody');
        for (const tIndex in charTable) {
          const charTableContent = charTable[tIndex];
          // Value exists
          if (typeof charTableContent[1] !== 'undefined') {
            const td = TinyHtml.createFrom('td', { class: 'bg-transparent' });
            // Is String
            if (typeof charTableContent[1] === 'string')
              td.setText(convertIsoStringsToCalendar(charTableContent[1]));
            // Is Object
            else if (
              typeof charTableContent[1].text === 'string' &&
              typeof charTableContent[1].url === 'string'
            )
              td.append(
                TinyHtml.createFrom('a', {
                  class: 'text-decoration-none',
                  target: '_blank',
                  href: !charTableContent[1].isRepUrl
                    ? charTableContent[1].url
                    : 'javascript:void(0)',
                  file: charTableContent[1].isRepUrl ? `../${charTableContent[1].isRepUrl}` : null,
                }).setText(charTableContent[1].text),
              );

            // Complete
            cardBodyTbody.append(
              TinyHtml.createFrom('tr').append(
                TinyHtml.createFrom('th', { class: 'bg-transparent', scope: 'row' }).setText(
                  charTableContent[0],
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
      markdownBase.append(row);
    },
  };

  // Insert Data
  markdownBase.empty();
  if (
    !metadata ||
    typeof metadata.mode !== 'string' ||
    typeof pageTypes[metadata.mode] !== 'function'
  )
    markdownBase.setHtml(data);
  else pageTypes[metadata.mode]();

  // Top Page
  if (isMainPage) {
    topPage.removeClass('d-none');
  } else {
    topPage.addClass('d-none');
  }

  /** @param {string} text */
  const markdownHid = (text) =>
    `tiny-wiki-${encodeURIComponent(
      text
        .toLowerCase()
        .trim()
        .replace(/ /g, '_')
        .replace(/\(|\)|\?|\!/g, '_'),
    )}`;

  const markdownItems = new TinyHtml(markdownBase.find(`h1,h2,h3,h4,h5`));
  markdownItems.forEach((item) => {
    item.setAttr('id', markdownHid(item.text() ?? ''));
  });

  // Content List
  if (canContentList)
    new TinyHtml(markdownBase.find('.content-list-data')).forEach((item) => {
      const tinyBase = TinyHtml.createFrom('div', {
        class: 'bg-black rounded-top collapse-content d-flex align-items-center',
      });
      // Open Button
      const openButton = TinyHtml.createFrom('h5', { class: 'm-0 p-2 w-100' });
      openButton
        .setText('Contents')
        .prepend(new Icon('d-flex align-items-center fa-solid fa-list me-2 small'));

      const collapseButton = tinyLib.bs
        .button('link btn-bg p-2 d-flex justify-content-center align-items-center me-2')
        .setAttr('data-bs-toggle', 'collapse')
        .setAttr('href', '#content-list-collapse')
        .setStyle({
          height: 30,
          width: 30,
          'font-size': '14px',
        })
        .append(new Icon('fa-solid fa-square-minus'));

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
       * @param {TinyHtmlAny|null} [extraElement=null]
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
      const contentList = metadata.contentList ?? [];
      for (let index = 0; index < contentList.length; index++) {
        const contentItem = contentList[index];
        isLast = index === contentList.length - 1;
        if (typeof contentItem === 'string')
          ul.append(insertLi('list-group-item pt-0', contentItem, isLast, index));
        else if (Array.isArray(contentItem) && contentItem.length > 0) {
          const ul2 = TinyHtml.createFrom('ul', { class: 'my-0' });

          ul.append(insertLi('list-group-item py-0', contentItem[0], false, index, null, ul2));

          for (const index2 in contentItem)
            if (Number(index2) !== 0 && typeof contentItem[index2] === 'string')
              ul2.append(insertLi(`pt-0`, contentItem[index2], isLast, index, index2));
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
  new TinyHtml(markdownBase.find('a[file]')).forEach(
    fixFileUrl((file) => {
      if (typeof file === 'string') openMDFile(file);
    }),
  );

  new TinyHtml(markdownBase.find('a:not([file])')).forEach(fixHref);
  new TinyHtml(markdownBase.find('img')).forEach(fixImageSrc);
  new TinyHtml(markdownBase.find('.book-spoiler')).forEach(fixSpoilers);
};

/**
 * Open MD File
 * @param {string} url
 * @param {boolean} [isMain=false]
 */
export const openMDFile = async (url, isMain = false) => {
  if (typeof url === 'string') {
    // Normalize the path so `pages/x.md` and `/pages/x.md` are the same page.
    const filePath = url.startsWith('/') ? url : `/${url}`;

    // Remove Fic Data
    clearFicData();

    // New page
    if (url !== 'MAIN') {
      // Read Data Base
      console.log(`Opening MD file "${filePath}"...`);
      loaderScreen.start('Loading page...');

      // Load ajax
      const fileData = await fetch(`${filePath}${window.fileVersion ?? ''}`, {
        method: 'GET',
      })
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
        /** @type {MarkdownMetadataMap} */
        const metadata = /** @type {MarkdownMetadataMap} */ ({});
        const githubRegex = tinyLib.getGitUrlPath('{url}public\\/');
        for (const key in md) {
          const match = key.match(/^([^_]+)(?:_(\d+))+/);
          if (match) {
            const name = match[1];
            const indices = match[0].split('_').slice(1).map(Number);

            if (!metadata[name]) {
              metadata[name] = [];
            }

            /** @type {MarkdownMetadataValue} */
            let currentLevel = /** @type {MarkdownMetadataValue} */ (metadata[name]);
            for (let i = 0; i < indices.length - 1; i++) {
              if (!currentLevel[indices[i]]) {
                currentLevel[indices[i]] = [];
              }
              currentLevel = /** @type {MarkdownMetadataValue} */ (currentLevel[indices[i]]);
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

        // Keep the address bar in sync with the page that was just rendered.
        // `updateUrl` is a no-op while the router is the one rendering.
        const character = getCharacterByPath(filePath);
        urlUpdate(
          character
            ? { name: 'character', slug: character.slug, title: character.title ?? title }
            : { name: 'markdown', path: filePath, title },
        );
      } catch (err) {
        // Error!
        loaderScreen.stop();
        console.error(err);
        alert(/** @type {Error} */ (err).message);
      }
    }

    // Main page
    else {
      insertMarkdownFile(storyData.readme ?? '', null, isMain, true);
      urlUpdate({ name: 'home' });
    }
    return;
  }
  throw new Error('Invalid Md File Url!');
};

/**
 * Renders the home page (readme).
 *
 * @returns {void}
 */
export const openHomePage = () => {
  clearFicData();
  insertMarkdownFile(storyData.readme ?? '', null, true, true);
  urlUpdate({ name: 'home' });
};
