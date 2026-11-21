import TinyDomReadyManager from 'tiny-essentials/libs/html/TinyDomReadyManager';
import { loaderScreen } from './important.mjs';
import { newUrl } from './html/query.mjs';

/**
 * Redirects the visitor to the `#newURL` target once the DOM is ready.
 *
 * Only same-origin absolute paths are followed, which prevents the page from
 * being used as an open redirect.
 *
 * @module redirect
 */

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
