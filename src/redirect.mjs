import { Loader } from 'circle-loader';
import TinyDomReadyManager from 'tiny-essentials/dist/v1/libs/TinyDomReadyManager.mjs';
import { $ } from './important.mjs';

const readyPage = new TinyDomReadyManager();
readyPage.onReady(() => {
  Loader.start();

  const newURL = $('#newURL').attr('href');
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
