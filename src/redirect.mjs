import { Loader } from 'circle-loader';
import { TinyDomReadyManager, TinyHtml } from 'tiny-essentials';

const readyPage = new TinyDomReadyManager();
readyPage.onReady(() => {
  Loader.start();

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
