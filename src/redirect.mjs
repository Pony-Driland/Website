import TinyDomReadyManager from 'tiny-essentials/libs/TinyDomReadyManager';
import { loaderScreen } from './important.mjs';
import { newUrl } from './html/query.mjs';

const readyPage = new TinyDomReadyManager();
readyPage.onReady(() => {
  loaderScreen.start();

  const newURL = newUrl.attr('href');
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
