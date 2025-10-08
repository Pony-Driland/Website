import { EventEmitter } from 'events';
import * as JsStore from 'jsstore';
import { getAge } from 'tiny-essentials/basics';
import TinyLoadingScreen from 'tiny-essentials/libs/TinyLoadingScreen';
import TinyLocalStorage from 'tiny-essentials/libs/TinyLocalStorage';
import TinyNotifications from 'tiny-essentials/libs/TinyNotifications';
import TinyHtml from 'tiny-essentials/libs/TinyHtml';
import storyCfg from './chapters/config.mjs';
import FirebaseAccount from './account/firebase.mjs';

// Loading
export const loaderScreen = new TinyLoadingScreen();
loaderScreen.defaultMessage = 'Loading...';

// Debug mode
TinyHtml.classCanWhitespace = true;
TinyHtml.elemDebug = true;
TinyHtml.defaultDisplay = '';

// Start jsStore
export const connStore = new JsStore.Connection(new Worker('jsstore.worker.min.js'));

// Localstorage
export const tinyLs = new TinyLocalStorage('pony-driland');

// App Data
export const appData = {
  youtube: {},
  ai: { using: false, interval: null, secondsUsed: 0 },
  emitter: new EventEmitter(),
};

// gtag
// @ts-ignore
window.dataLayer = window.dataLayer || [];
export function gtag() {
  if (location.hostname === 'localhost') return;
  // @ts-ignore
  dataLayer.push(arguments);
}

if (typeof storyCfg.gtag === 'string') {
  gtag('js', new Date());

  gtag('config', storyCfg.gtag);
}

// Notifications
export const tinyNotification = new TinyNotifications({
  audio: '/audio/notification.ogg',
  defaultIcon: '/img/icon/192.png',
});

// Firebase
export const fa = new FirebaseAccount({
  apiKey: 'AIzaSyDl1CEbPJAUj3B1spAT_DiQz4JYZeeXRQU',
  authDomain: 'nyah-club.firebaseapp.com',
  databaseURL: 'https://nyah-club.firebaseio.com',
  projectId: 'nyah-club',
  storageBucket: 'nyah-club.appspot.com',
  messagingSenderId: '1006395655918',
  appId: '1:1006395655918:web:4a8cf2722d68c3ea4a55ff',
});

/** @returns {boolean} */
export function needsAgeVerification() {
  return tinyLs.getString('user-country') &&
    storyCfg.noNsfw.includes(tinyLs.getString('user-country') ?? '')
    ? true
    : false;
}

/**
 * No NSFW Detector
 * @param {number} [biggerAge=18]
 * @returns {boolean}
 */
export function isNoNsfw(biggerAge = 18) {
  /** @type {boolean} */
  let isNoNsfw = needsAgeVerification();

  if (isNoNsfw) {
    const birthday = fa.birthday;
    const date = birthday.find((item) => item.metadata.primary)?.date;
    if (date && date.year) {
      const data = new Date(date.year, date.month - 1, date.day, 0, 0, 0);
      const age = getAge(data.valueOf());
      if (age && age >= biggerAge) return false;
    }
  }
  return isNoNsfw;
}

// Fic Data
export const ficCache = {
  charPrompts: '',
  charListPrompts: [],
};
