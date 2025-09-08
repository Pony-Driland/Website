import { TinyHtml } from 'tiny-essentials';
import { TinyDomReadyManager } from 'tiny-essentials';
import { loaderScreen } from './important.mjs';

const readyPage = new TinyDomReadyManager();
readyPage.onReady(() => {
  loaderScreen.start();

  const newURL = TinyHtml.query('#newURL').attr('href');
  if (
    typeof newURL === 'string' &&
    newURL.length > 0 &&
    newURL.indexOf('http://') < 0 &&
    newURL.indexOf('https://') < 0 &&
    newURL.startsWith('/')
  ) {
    window.location.href = newURL;
  }
});

readyPage.init();
