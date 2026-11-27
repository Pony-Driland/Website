import { EventEmitter } from 'events';
import * as JsStore from 'jsstore';
import { getAge } from 'tiny-essentials/basics/simpleMath';
import TinyLoadingScreen from 'tiny-essentials/libs/html/templates/TinyLoadingScreen';
import TinyLocalStorage from 'tiny-essentials/libs/storage/TinyLocalStorage';
import TinyNotifications from 'tiny-essentials/libs/html/notification/TinyNotifications';
import TinyToastNotify from 'tiny-essentials/libs/html/notification/TinyToastNotify';
import TinyUserActivationDetector from 'tiny-essentials/libs/utils/TinyUserActivationDetector';

import TinyHtml from 'tiny-essentials/libs/html/TinyHtml';
import { isDev } from './dev.mjs';
import storyCfg from './chapters/config.mjs';
import FirebaseAccount from './account/firebase.mjs';
import { initAnalytics } from './analytics.mjs';

/**
 * Browsers only allow audio to start after the visitor interacts with the page
 * (autoplay policy). Every sound of the reader is requested by the scroll
 * position, not by the visitor, so the very first playback would be silently
 * dropped by the browser.
 *
 * This module holds those requests until the browser reports a user activation
 * and then runs them in order.
 *
 * Instead of listening to the gesture events, the activation is read from
 * `navigator.userActivation.hasBeenActive`. It is sticky, so a single
 * interaction is enough for the whole session and an interaction that happens
 * before the first sound is requested is not lost.
 */
export const audioUnlock = new TinyUserActivationDetector({ debugMode: isDev });

// Loading
export const loaderScreen = new TinyLoadingScreen();
loaderScreen.defaultMessage = 'Loading...';

/**
 * Locks the loading screen until the page is reloaded.
 *
 * Used by the refresh script: once the page is about to be reloaded, the
 * overlay must survive the `loaderScreen.stop()` calls of the page being torn
 * down, otherwise the reader sees the old page flash before the reload.
 *
 * @param {string} [message] - Message shown while the page is locked.
 * @returns {void}
 */
export const lockLoaderScreen = (message = 'Loading page...') => {
  // The overlay is re-created on every `start()`, so `stop()` is the only
  // method that has to be neutralized. The page is going away, so the original
  // method is never restored.
  loaderScreen.stop = () => false;
  loaderScreen.start(message);
};

// Debug mode
TinyHtml.classCanWhitespace = true;
TinyHtml.elemDebug = true;
TinyHtml.defaultDisplay = '';

// Start jsStore
export const connStore = new JsStore.Connection(new Worker('/jsstore.worker.min.js'));

// Localstorage
export const tinyLs = new TinyLocalStorage('pony-driland');

// App Data
export const appData = {
  youtube: {},
  /** @type {{ using: boolean, interval: ReturnType<typeof setInterval>|null, secondsUsed: number }} */
  ai: { using: false, interval: null, secondsUsed: 0 },
};

export const globalEmitter = new EventEmitter();

// Google Analytics
initAnalytics();

// Notifications
export const tinyNotification = new TinyNotifications({
  audio: '/audio/notification.ogg',
  defaultIcon: '/img/icon/192.png',
});

export const tinyToast = new TinyToastNotify('bottom', 'right', 3000, 60);

// Firebase
/**
 * Shared Firebase account manager instance (Google sign-in + People API).
 * @type {FirebaseAccount}
 */
export const fa = new FirebaseAccount({
  apiKey: 'AIzaSyDl1CEbPJAUj3B1spAT_DiQz4JYZeeXRQU',
  authDomain: 'nyah-club.firebaseapp.com',
  databaseURL: 'https://nyah-club.firebaseio.com',
  projectId: 'nyah-club',
  storageBucket: 'nyah-club.appspot.com',
  messagingSenderId: '1006395655918',
  appId: '1:1006395655918:web:4a8cf2722d68c3ea4a55ff',
});

/**
 * Checks whether the current visitor must pass the age verification gate.
 *
 * The check is driven by the `user-country` entry in local storage and by the
 * `noNsfw` list in the story config. When the list contains `ALL`, every
 * visitor is gated; otherwise only the countries listed are gated.
 *
 * @returns {boolean} `true` when the visitor must verify their age.
 */
export function needsAgeVerification() {
  return tinyLs.getString('user-country') &&
    (storyCfg.noNsfw.includes('ALL') ||
      storyCfg.noNsfw.includes(tinyLs.getString('user-country') ?? ''))
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

/** Cached character prompts, loaded once during the bootstrap. */
export const ficCache = {
  /** Raw prompt template. */
  charPrompts: '',
  /** Parsed list of character prompts. */
  charListPrompts: /** @type {Record<string, string>[]} */ ([]),
};
