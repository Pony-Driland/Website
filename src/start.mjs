import { installWindowHiddenScript, addAiMarkerShortcut } from 'tiny-essentials/basics';
import TinyHtml from 'tiny-essentials/libs/TinyHtml';
import TinyHtmlElems from 'tiny-essentials/libs/TinyHtmlElems';
import TinyDomReadyManager from 'tiny-essentials/libs/TinyDomReadyManager';
import QRCode from 'qrcode';
import moment from 'moment';
import { saveAs } from 'file-saver';
import { Offcanvas } from 'bootstrap';

import { vanillaPwa } from './pwa/installer.mjs';
import './chapters/sound.mjs';
import './chapters/counter.mjs';
import './chapters/characters.mjs';

import tinyLib, { alert } from './files/tinyLib.mjs';
import { storyData } from './files/chapters.mjs';
import storyCfg from './chapters/config.mjs';
import { openChapterMenu } from './chapter_manager/index.mjs';
import { tinyLs, fa, needsAgeVerification, loaderScreen, tinyNotification } from './important.mjs';

import { Tooltip } from './modules/TinyBootstrap.mjs';
import { AiScriptStart } from './ai/aiSoftware.mjs';
import { tinyAiScript } from './ai/software/tinyAiScript.mjs';
import './api/pony-time.mjs';

import '@cryptofonts/cryptofont/cryptofont.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'tippy.js/dist/tippy.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'photoswipe/dist/photoswipe.css';
import '../node_modules/tiny-dices/dist/TinyDices.min.css';
import 'tiny-essentials/css/aiMarker.min.css';
import 'tiny-essentials/css/TinyLoadingScreen.min.css';
import 'tiny-essentials/css/TinyNotify.min.css';

import './scss/dark.scss';
import './scss/main.scss';
import './scss/carousel.scss';
import './scss/rpg.scss';
import { openMDFile, openNewAddress, clearFicData } from './fixStuff/markdown.mjs';
import { app, body, head, tinyWin, topPage } from './html/query.mjs';
import { markdownBase } from './html/base.mjs';
import { fileEnd, fileStart } from './ai/values/defaults.mjs';

const { Icon } = TinyHtmlElems;
addAiMarkerShortcut();

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

export const saveRoleplayFormat = (chapter, saveAsFile = true, tinyCfg = {}) => {
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
  const finalData = `${fileStart}\n\n${info}\n\n${file}\n\n${fileEnd}`;

  // Save file
  if (saveAsFile)
    saveAs(
      new Blob([finalData], {
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

// Get Params
const getParams = () => {
  const urlSearchParams = new URLSearchParams(document.location.search);
  return Object.fromEntries(urlSearchParams.entries());
};

// Pop State
tinyWin.on('popstate', () => {
  // Remove Fic Data
  clearFicData();

  // Get Params
  const params = getParams();

  // Load Page
  const loadPage = () => {
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

// Start App
export const rootApp = new TinyDomReadyManager();
rootApp.onReady(() => {
  if (typeof window.ethereum !== 'undefined') document.body.classList.add('browser-with-web3');
  installWindowHiddenScript();
  vanillaPwa.install();

  const startApp = () => {
    console.log('Starting App...');
    storyData.start(
      /**
       * @param {Function} fn
       * @param {string} readme
       */
      async (fn, readme) => {
        // Custom Colors
        head.append(
          TinyHtml.createFrom('style', { id: 'custom_color' }).setText(`

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
            isNewValue = TinyHtml.createFrom('span', { class: 'badge badge-primary ms-2' }).setText(
              'NEW',
            );
          } else if (
            storyData.isNew[chapter] === 1 &&
            storyData.isNew[chapter] > storyData.globalIsNew
          ) {
            storyData.globalIsNew = 1;
            isNewValue = TinyHtml.createFrom('span', {
              class: 'badge badge-secondary ms-2',
            }).setText('UPDATE');
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
              const aItem = TinyHtml.createFrom('a', {
                class: 'dropdown-item',
                id: item.id ?? null,
                href: item.href ?? null,
              });
              li.append(aItem);

              // Add text
              aItem.setText(item.text);
              if (item.icon) aItem.prepend(new Icon(`${item.icon} me-2`));

              // File
              if (typeof item.file === 'string') {
                aItem.setAttr('href', 'javascript:void(0)');
                aItem.setAttr('file', item.file ?? null);
              }

              // Target
              if (item.href && item.href !== 'javascript:void(0)')
                aItem.setAttr('target', '_blank');

              // Is web3
              if (item.web3Element) li.addClass('web3-element');

              // Click
              if (typeof item.file === 'string')
                li.on('click', () => openMDFile(aItem.attr('file')));
              if (item.click) li.on('click', item.click);
              li.on('click', () => {
                element.hide();
                offCanvasNavCfg.hide();
              });
            });
          }
        };

        // Insert Navbars
        const navbarItems = () => {
          // Base Crypto Modal
          let offCanvasEl = null;
          const baseCryptoModal = (crypto_value, title) => {
            return /** @param {Event} e */ (e) => {
              e.preventDefault();
              const qrcodeCanvas = TinyHtml.createFrom('canvas');
              QRCode.toCanvas(qrcodeCanvas.get(0), storyCfg[crypto_value].address, (error) => {
                if (error) {
                  alert(error);
                } else {
                  // Prepare Text
                  tinyLib.modal({
                    title: title + ' Network Donation',

                    id: 'busd_request',
                    dialog: 'modal-lg',

                    body: TinyHtml.createFrom('center').append(
                      TinyHtml.createFrom('h4', { class: 'mb-5' }).setText(
                        'Please enter the address correctly! Any type issue will be permanent loss of your funds!',
                      ),
                      TinyHtml.createFrom('a', {
                        target: '_blank',
                        href: storyCfg[crypto_value].explorer + storyCfg[crypto_value].address,
                      }).setText('Blockchain Explorer'),
                      TinyHtml.createFrom('br'),
                      TinyHtml.createFrom('span').setText(storyCfg[crypto_value].address),
                      TinyHtml.createFrom('div', { class: 'mt-3' }).append(qrcodeCanvas),
                    ),

                    footer: [],
                  });
                }
              });
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
            file: '/data/characters/ivy/README.md',
            text: 'Ivy (Character WIP)',
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

          newItem.dbBase.characters.push({
            file: '/data/characters/yasmin/README.md',
            text: 'Yasmin (Character WIP)',
          });

          tinyAiScript.checkTitle();
          tinyAiScript.aiLogin.base.prepend(tinyAiScript.aiLogin.button);
          tinyAiScript.aiLogin.button.on('click', (e) => {
            e.preventDefault();
            tinyAiScript.login();
          });

          // Login Account
          const loginAccount = {};
          if (needsAgeVerification()) {
            loginAccount.base = TinyHtml.createFrom('li', {
              className: 'nav-item font-weight-bold',
            });
            loginAccount.link = new TinyHtmlElems.Button({
              label: '',
              tags: 'disabled',
              mainClass: 'nav-link',
            })
              .setAttr('id', 'login-start')
              .setAttr('title', 'Sign in with Google');
            loginAccount.icon = new TinyHtmlElems.Icon(['fa-solid', 'fa-right-to-bracket']);

            const tool = Tooltip(loginAccount.link);
            loginAccount.base.append(loginAccount.link);
            loginAccount.link.append(loginAccount.icon);

            loginAccount.link.on('click', async () => {
              if (fa.currentUser) {
                loaderScreen.start(`Logging out...`);
                await fa.logout();
                tool.hide();
              } else {
                loaderScreen.start(`Signing in...`);
                await fa.login();
                tool.hide();
              }
              loaderScreen.stop();
            });

            const checkStatus = /** @type {import('./account/firebase.mjs').OnAuthStateChanged} */ (
              user,
            ) => {
              loginAccount.link.removeClass('disabled');
              if (user) {
                loginAccount.link.setAttr('data-bs-original-title', 'Logout');
                loginAccount.icon.iconTags = ['fa-solid', 'fa-right-to-bracket'];
              } else {
                loginAccount.link.setAttr('data-bs-original-title', 'Sign in with Google');
                loginAccount.icon.iconTags = ['fa-solid', 'fa-right-from-bracket'];
              }
            };

            fa.on('logout', () => checkStatus(null));
            fa.on('login', checkStatus);
            fa.on('authStateChanged', checkStatus);
            fa.init();
          }

          // Nav Items
          newItem.dropdowns = {};

          newItem.dropdowns.information = TinyHtml.createFrom('li', {
            class: 'nav-item dropdown',
            id: 'information-menu',
          }).prepend(
            tinyLib.bs
              .button({ dsBtn: true, class: 'nav-link dropdown-toggle' })
              .setText('Information'),
          );
          // Donations Button
          newItem.dropdowns.donations = TinyHtml.createFrom('li', {
            class: 'nav-item dropdown',
            id: 'donations-menu',
          }).prepend(
            tinyLib.bs
              .button({ dsBtn: true, class: 'nav-link dropdown-toggle' })
              .setText('Donations'),
          );
          // Characters
          newItem.dropdowns.characters = TinyHtml.createFrom('li', {
            class: 'nav-item dropdown',
            id: 'characters-menu',
          }).prepend(
            tinyLib.bs
              .button({ dsBtn: true, class: 'nav-link dropdown-toggle' })
              .setText('Characters'),
          );
          newItem.left = [
            // Homepage
            TinyHtml.createFrom('li', { class: 'nav-item' }).prepend(
              TinyHtml.createFrom('a', { class: 'nav-link', href: '/', id: 'homepage' })
                .setText('Home')
                .prepend(new Icon('fas fa-home me-2'))
                .on('click', (e) => {
                  e.preventDefault();
                  openMDFile('MAIN', true);
                  if (offCanvasEl) offCanvasEl.hide();
                }),
            ),

            // Discord Server
            TinyHtml.createFrom('li', { class: 'nav-item' }).prepend(
              TinyHtml.createFrom('a', {
                class: 'nav-link',
                target: '_blank',
                href: `https://discord.gg/${storyCfg.discordInvite}`,
                id: 'discord-server',
              })
                .setText('Discord')
                .prepend(new Icon('fab fa-discord me-2'))
                .on('click', () => {
                  if (offCanvasEl) offCanvasEl.hide();
                }),
            ),

            // Blog
            TinyHtml.createFrom('li', { class: 'nav-item' }).prepend(
              TinyHtml.createFrom('a', {
                class: 'nav-link',
                target: '_blank',
                href: storyCfg.blog_url,
                id: 'blog-url',
              })
                .setText('Blog')
                .prepend(new Icon('fa-solid fa-rss me-2'))
                .on('click', () => {
                  if (offCanvasEl) offCanvasEl.hide();
                }),
            ),

            // AI
            TinyHtml.createFrom('li', { class: 'nav-item nav-ai' }).prepend(
              TinyHtml.createFrom('a', {
                class: 'nav-link',
                href: '/?path=ai',
                id: 'ai-access-page',
              })
                .setText('AI Page')
                .prepend(new Icon('fa-solid fa-server me-2'))
                .on('click', async (e) => {
                  e.preventDefault();
                  loaderScreen.start();
                  await tinyNotification.requestPerm();
                  loaderScreen.stop();
                  AiScriptStart();
                  if (offCanvasEl) offCanvasEl.hide();
                }),
            ),

            newItem.dropdowns.information,
            newItem.dropdowns.donations,
            newItem.dropdowns.characters,
          ];
          newItem.right = [
            // Status Place
            TinyHtml.createFrom('span', { id: 'status' }),

            // Chapter Name
            TinyHtml.createFrom('li', { id: 'fic-chapter', class: 'nav-item nav-link' }),

            // Login
            tinyAiScript.aiLogin.base,

            // Login
            loginAccount.base ? loginAccount.base : null,

            // Read Fic
            TinyHtml.createFrom('li', {
              class: 'nav-item font-weight-bold',
            })
              .prepend(
                TinyHtml.createFrom('a', {
                  id: 'fic-start',
                  class: 'nav-link',
                  href: '/?path=read-fic',
                })
                  .setText('Read Fic')
                  .append(isNewValue)
                  .prepend(new Icon('fab fa-readme me-2')),
              )
              .on('click', (e) => {
                e.preventDefault();
                topPage.addClass('d-none');
                openChapterMenu();
                if (offCanvasEl) offCanvasEl.hide();
              }),
          ];

          Tooltip(tinyAiScript.aiLogin.button);
          return newItem;
        };

        // Navbar items
        const navbarData = navbarItems();
        const offCanvasBase = TinyHtml.createFrom('ul', { class: 'list-group list-group-flush' });
        const navbarOffCanvas = tinyLib.bs.offcanvas(
          'end d-lg-none',
          'offcanvasNavbar',
          'Pony Driland',
          offCanvasBase,
        );

        const tinyCollapse1 = tinyLib.bs.navbar.collapse('left', 'small mdMenu', null);
        const tinyCollapse2 = tinyLib.bs.navbar.collapse('right', 'small mdMenu', 'fic-nav');

        // Insert Navbar
        body.prepend(
          // Navbar
          navbarOffCanvas,
          tinyLib.bs.navbar.root('md-navbar', 'dark', true).append(
            // Title
            tinyLib.bs.navbar.title(storyCfg.title, '/').on('click', (e) => {
              e.preventDefault();
              openMDFile('MAIN', true);
            }),

            // Offcanvas button
            tinyLib.bs
              .button({
                dsBtn: true,
                class: 'navbar-toggler',
                toggle: 'offcanvas',
                target: '#offcanvasNavbar',
              })
              .append(TinyHtml.createFrom('span', { class: 'navbar-toggler-icon' })),

            // Collapse
            tinyCollapse1,
            tinyCollapse2,
          ),
        );

        storyData.nc = { base: {}, item: {} };
        storyData.nc.item.left = new TinyHtml(tinyCollapse1.find(':scope > ul'));
        storyData.nc.item.right = new TinyHtml(tinyCollapse2.find(':scope > ul'));
        const offCanvasNavCfg = new Offcanvas(navbarOffCanvas.get(0));
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
        app.append(markdownBase);

        // Footer Base
        const tinyFooter = { 1: [], 2: [] };

        // Footer 1

        // OpenSea
        if (storyCfg.opensea) {
          tinyFooter[1].push(
            TinyHtml.createFrom('li').append(
              TinyHtml.createFrom('a', {
                target: '_blank',
                href: `https://opensea.io/collection/${storyCfg.opensea}`,
              })
                .setText('OpenSea')
                .prepend(new Icon('fab fa-ethereum me-2')),
            ),
          );
        }

        // CID32
        if (storyData.cid32) {
          tinyFooter[1].push(
            TinyHtml.createFrom('li').append(
              TinyHtml.createFrom('a', { href: `https://${storyData.cid32}.ipfs.dweb.link/` })
                .setText('IPFS ' + storyCfg.nftDomain.name)
                .prepend(new Icon('fas fa-wifi me-2')),
            ),
          );
        }

        // Mastodon
        if (storyCfg.mastodon) {
          tinyFooter[1].push(
            TinyHtml.createFrom('li').prepend(
              TinyHtml.createFrom('a', {
                rel: 'me',
                target: '_blank',
                href: `https://${storyCfg.mastodon.domain}/@${storyCfg.mastodon.username}`,
              })
                .setText('Mastodon')
                .prepend(new Icon('fa-brands fa-mastodon me-2')),
            ),
          );
        }

        // Discord Invite
        if (storyCfg.discordInvite) {
          tinyFooter[1].push(
            TinyHtml.createFrom('li').append(
              TinyHtml.createFrom('a', {
                target: '_blank',
                href: `https://discord.gg/${storyCfg.discordInvite}`,
              })
                .setText('Discord Server')
                .prepend(new Icon('fab fa-discord me-2')),
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
            TinyHtml.createFrom('li').append(
              TinyHtml.createFrom('a', { target: '_blank', href: `https://${storyCfg.domain}` })
                .setText('Website')
                .prepend(new Icon('fa-solid fa-pager me-2')),
            ),
          );
        } else {
          tinyFooter[1].push(
            TinyHtml.createFrom('li').append(
              TinyHtml.createFrom('a', {
                target: '_blank',
                href: `https://${storyCfg.mirror[Math.floor(Math.random() * storyCfg?.mirror.length)]}`,
              })
                .setText('Mirror')
                .prepend(new Icon('fa-solid fa-pager me-2')),
            ),
          );
        }

        // Footer 2
        if (storyCfg.nftDomain) {
          tinyFooter[2].push(
            TinyHtml.createFrom('li').append(
              TinyHtml.createFrom('a', {
                target: '_blank',
                href: storyCfg.nftDomain.url.replace('{domain}', storyCfg.nftDomain.valueURL),
              })
                .setText(storyCfg.nftDomain.name)
                .prepend(new Icon('fas fa-marker me-2')),
            ),
          );
        }

        if (storyCfg.github) {
          tinyFooter[2].push(
            TinyHtml.createFrom('li').append(
              TinyHtml.createFrom('a', {
                target: '_blank',
                href: `https://github.com/${storyCfg.github.account}/${storyCfg.github.repository}`,
              })
                .setText('Github')
                .prepend(new Icon('fab fa-github me-2')),
            ),
          );
        }

        tinyFooter[2].push(
          TinyHtml.createFrom('li').append(
            TinyHtml.createFrom('a', { target: '_blank', href: 'mailto:' + storyCfg.contact })
              .setText('Contact')
              .prepend(new Icon('fas fa-envelope me-2')),
          ),
        );

        tinyFooter[2].push(
          TinyHtml.createFrom('li')
            .prepend(
              TinyHtml.createFrom('a', {
                href: '/?path=%2FLICENSE.md',
                id: 'license',
              })
                .setText('License')
                .prepend(new Icon('fas fa-copyright me-2')),
            )
            .on('click', (e) => {
              e.preventDefault();
              openMDFile('/LICENSE.md');
            }),
        );

        tinyFooter[2].push(
          TinyHtml.createFrom('li')
            .prepend(
              TinyHtml.createFrom('a', {
                href: '/?path=%2FPRIVACY.md',
                id: 'privacy-policy',
              })
                .setText('Privacy Policy')
                .prepend(new Icon('fas fa-user-shield me-2')),
            )
            .on('click', (e) => {
              e.preventDefault();
              openMDFile('/PRIVACY.md');
            }),
        );

        // Insert Footer
        body.append(
          TinyHtml.createFrom('footer', { class: 'page-footer font-small pt-4 clearfix' }).append(
            // Base
            TinyHtml.createFrom('div', {
              class: 'container-fluid text-center text-md-left',
            }).append(
              TinyHtml.createFrom('div', { class: 'row' }).append(
                // Logo
                TinyHtml.createFrom('div', { class: 'col-md-6 mt-md-0 mt-3' }).append(
                  TinyHtml.createFrom('center').append(
                    TinyHtml.createFrom('img', { class: 'img-fluid', src: '/img/logo.png' }),
                    TinyHtml.createFrom('br'),
                  ),
                ),

                // Links 1
                TinyHtml.createFrom('div', { class: 'col-md-3 mb-md-0 mb-3' }).append(
                  TinyHtml.createFrom('h5').setText('Links'),
                  TinyHtml.createFrom('ul', { class: 'list-unstyled' }).append(tinyFooter[1]),
                ),

                // Links 2
                TinyHtml.createFrom('div', { class: 'col-md-3 mb-md-0 mb-3' }).append(
                  TinyHtml.createFrom('h5').setText('Links'),
                  TinyHtml.createFrom('ul', { class: 'list-unstyled' }).append(tinyFooter[2]),
                ),
              ),
            ),

            // Copyright
            TinyHtml.createFrom('div', {
              id: 'footer2',
              class: 'footer-copyright text-center py-3 bg-secondary text-white',
            })
              .setText(copyrightText)
              .append(
                TinyHtml.createFrom('a', { target: '_blank', href: storyCfg.creator_url }).setText(
                  storyCfg.creator,
                ),
                '.',
              ),
          ),
        );

        // Carousel
        const indicators = TinyHtml.queryAll('body > #root #carouselHomepage .carousel-indicators');
        const inner = TinyHtml.queryAll('body > #root #carouselHomepage .carousel-inner');

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
          TinyHtml.createFrom('li', {
            'data-bs-target': '#carouselHomepage',
            'data-bs-slide-to': index,
            class: index === 0 ? 'active' : '',
          }).appendTo(indicators);

          const item = TinyHtml.createFrom('div', {
            class: 'carousel-item' + (index === 0 ? ' active' : ''),
          }).appendTo(inner);

          // Image
          TinyHtml.createFrom('div', {
            class: 'img',
          })
            .setStyle({ 'background-image': 'url(' + slide.img + ')' })
            .appendTo(item);

          // Text
          const caption = TinyHtml.createFrom('div', { class: 'carousel-caption' }).appendTo(item);
          TinyHtml.createFrom('h5', { class: 'px-5', text: slide.title ?? null }).appendTo(caption);
          TinyHtml.createFrom('p', { class: 'px-5' }).setHtml(slide.text).appendTo(caption);
        });

        // Start Readme
        const params = getParams();
        if (params.path === 'read-fic') openChapterMenu(params);
        else if (params.path === 'ai') {
          loaderScreen.start();
          await tinyNotification.requestPerm();
          loaderScreen.stop();
          AiScriptStart();
        } else openNewAddress(params, true, true);

        // Final part
        fn();

        // First Time
        if (!tinyLs.getItem('firstTime')) {
          tinyLs.setItem('firstTime', true);
          alert(
            `If this is your first time visiting the website, remember that you can navigate using the navbar at the top of the page. ` +
              `To read the fic, just click on the "Read Fic" link located in the top-right corner of the navbar. ` +
              `The same navbar also gives you access to fic-related tools like bookmarks and story progress tracking.` +
              `\n\nDue to restrictions from some countries, the website is required to track your country of origin to restrict some resources.`,
            'Welcome to Pony Driland!',
          );
        }
      },
    );
  };

  startApp();
});

rootApp.init();
