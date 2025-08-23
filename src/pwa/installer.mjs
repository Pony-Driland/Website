import { EventEmitter } from 'events';
import forPromise from 'for-promise';
import { TinyDomReadyManager, TinyHtml } from 'tiny-essentials';

const postMessage = (data) => {
  if (
    ('serviceWorker' in navigator || 'ServiceWorker' in navigator) &&
    navigator.serviceWorker.controller &&
    navigator.serviceWorker.controller.postMessage
  ) {
    return navigator.serviceWorker.controller.postMessage(data);
  }
  return null;
};

let firstTime = true;
let deferredPrompt;
window.matchMedia('(display-mode: standalone)').addEventListener('change', (evt) => {
  const body = TinyHtml.query('body');
  body.removeClass(['window-browser', 'window-standalone']);

  let displayMode = 'browser';
  if (evt.matches) {
    displayMode = 'standalone';
  }

  // Log display mode change to analytics
  console.log(`[PWA] DISPLAY_MODE_CHANGED`, displayMode);
  tinyPwa.emit('displayMode', displayMode);
  body.addClass(`window-${displayMode}`);
});

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  // e.preventDefault();

  // Stash the event so it can be triggered later.
  deferredPrompt = e;

  // Update UI notify the user they can install the PWA
  // showInstallPromotion();

  // Optionally, send analytics event that PWA install promo was shown.
  tinyPwa.emit('deferredPrompt', deferredPrompt);
  console.log(`[PWA] 'beforeinstallprompt' event was fired.`, deferredPrompt);
});

window.addEventListener('appinstalled', () => {
  // Hide the app-provided install promotion
  // hideInstallPromotion();

  // Clear the deferredPrompt so it can be garbage collected
  deferredPrompt = null;

  // Optionally, send analytics event to indicate successful install
  tinyPwa.emit('deferredPrompt', deferredPrompt);
  console.log(`[PWA] PWA was installed`);
});

function getPWADisplayMode() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  if (document.referrer.startsWith('android-app://')) {
    return 'twa';
  }

  if (navigator.standalone || isStandalone) {
    return 'standalone';
  }

  return 'browser';
}

function isUsingPWA() {
  return tinyPwa.enabled;
}

function clearFetchPwaCache() {
  postMessage({
    type: 'CLEAR_FETCH_CACHE',
  });
}

if ('serviceWorker' in navigator || 'ServiceWorker' in navigator) {
  const msgEvents = {};
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && typeof msgEvents[event.data.type] === 'function')
      msgEvents[event.data.type](event);
  });
}

function installPWA() {
  if ('serviceWorker' in navigator || 'ServiceWorker' in navigator) {
    // Check registration
    const tinyCheck = (event) => {
      if (event) {
        console.log(`[PWA State] ${event.state}`);
        if (event.state === 'installed') {
          tinyPwa._setNeedRefresh(true);
          location.reload();
        } else if (event.state === 'activated' && !tinyPwa.needRefresh)
          if (firstTime) firstTime = false;
      }
    };

    navigator.serviceWorker.ready.then((a) => tinyCheck(a.active));
    const tinyRegistrationChecker = (registration) => {
      // updatefound is also fired for the very first install. ¯\_(ツ)_/¯
      registration.addEventListener('updatefound', (event) => {
        tinyCheck(event.target.active);
        registration.installing.addEventListener('statechange', (event2) =>
          tinyCheck(event2.target),
        );
      });
    };

    // Get Items
    const cacheChecker = { count: 0, removed: false, keep: false };
    navigator.serviceWorker
      .getRegistrations()
      .then((items) => {
        // Register new Service Worker
        const registerNewService = () =>
          navigator.serviceWorker
            .register('./service-worker.js', { scope: './' })
            // Complete
            .then((registration) => {
              console.log('[PWA] Service Worker Registered.');
              tinyPwa._setIsEnabled(true);
              tinyRegistrationChecker(registration);
            })
            // Error
            .catch((err) => {
              console.log('[PWA] Service Worker Failed to Register.');
              console.error(err);
              tinyPwa._init();
            });

        if (items.length > 0) {
          forPromise({ data: items }, async (item, fn, fnErr) => {
            // Get Url data
            const tinyUrl =
              items[item].active &&
              typeof items[item].active.scriptURL === 'string' &&
              items[item].active.scriptURL.length > 0
                ? new URL(items[item].active.scriptURL)
                : {};

            // Remove old stuff
            if (
              cacheChecker.count > 0 ||
              !items[item].active ||
              (items[item].active.state !== 'activated' &&
                items[item].active.state !== 'activating') ||
              tinyUrl.pathname !== '/service-worker.js'
            ) {
              items[item]
                .unregister()
                .then((success) => {
                  if (!success)
                    console.error(`[PWA] Fail to remove the Service Worker ${items[item].scope}`);
                  else cacheChecker.removed = true;
                  fn();
                })
                .catch(fnErr);
            }

            // Update tiny stuff
            else if (tinyUrl.pathname === '/service-worker.js') {
              tinyRegistrationChecker(items[item]);
              if (
                items[item].active &&
                (items[item].active.state === 'activated' ||
                  items[item].active.state === 'activating')
              ) {
                items[item]
                  .update()
                  .then((success) => {
                    if (!success)
                      console.error(`[PWA] Fail to update the Service Worker ${items[item].scope}`);
                    else {
                      console.log('[PWA] Service Worker Updated.');
                      cacheChecker.keep = true;
                      tinyPwa._setIsEnabled(true);
                    }
                    fn();
                  })
                  .catch(fnErr);
              }
            }

            // Add count
            cacheChecker.count++;
          })
            // Remove progress complete
            .then(() => {
              if (cacheChecker.removed && !cacheChecker.keep) registerNewService();
            })
            // Error
            .catch((err) => {
              console.log('[PWA] Service Worker Failed to Unregister.');
              console.error(err);
              tinyPwa._init();
            });
        } else registerNewService();
      })
      // Error
      .catch((err) => {
        console.log('[PWA] Service Worker Failed to get Register list.');
        console.error(err);
        tinyPwa._init();
      });
  } else tinyPwa._init();
}

class TinyPwa extends EventEmitter {
  constructor() {
    super();
    this.tabs = [];
    this.tabId = null;
    this.enabled = false;
    this.initialized = false;
    this.needRefresh = false;
  }

  _init() {
    if (!this.initialized) {
      this.initialized = true;
      this.emit('ready');
    }
  }

  _addTab(item) {
    this.tabs.push(item);
    this.emit('tabAdded', item);
  }

  _removeTab(id) {
    const index = this.tabs.findIndex((tab) => tab.id === id);
    if (index > -1) {
      const item = this.tabs.splice(index, 1);
      this.emit('tabRemoved', item);
    }
  }

  _setTabId(id) {
    if (typeof id === 'string') {
      this.tabId = id;
      this.emit('tabIdUpdated', id);
    } else this.tabId = null;
  }

  _setIsEnabled(enabled) {
    if (typeof enabled === 'boolean') {
      this.enabled = enabled;
      this.emit('isEnabled', enabled);
    }
  }

  _setNeedRefresh(enabled) {
    if (typeof enabled === 'boolean') {
      this.needRefresh = enabled;
      this.emit('needRefresh', enabled);
    }
  }

  waitInit() {
    const tinyThis = this;
    return new Promise((resolve, reject) => {
      if (this.initialized) resolve(true);
      else setTimeout(() => tinyThis.waitInit().then(resolve).catch(reject), 100);
    });
  }

  getTabs() {
    return this.tabs;
  }

  getTab(id) {
    return this.tabs.find((item) => item.id === id);
  }

  getTabId() {
    this.tabId;
  }

  isEnabled() {
    return this.enabled;
  }

  getDisplayMode() {
    return getPWADisplayMode();
  }

  clearFetchCache() {
    return clearFetchPwaCache();
  }
}

const initDom = new TinyDomReadyManager();

export const tinyPwa = new TinyPwa();
initDom.onReady(() => {
  if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log(`[PWA] This is running as standalone.`);
    TinyHtml.query('body').addClass(`window-standalone`);
    tinyPwa.emit('displayMode', 'standalone');
  } else {
    console.log(`[PWA] This is running as browser.`);
    TinyHtml.query('body').addClass(`window-browser`);
    tinyPwa.emit('displayMode', 'browser');
  }
});

export const vanillaPwa = {
  postMessage,
  getDisplayMode: getPWADisplayMode,
  isUsing: isUsingPWA,
  clearFetch: clearFetchPwaCache,
  install: installPWA,
};

initDom.init();
