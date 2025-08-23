import { TinyLocalStorage, TinyNotifications } from 'tiny-essentials';
import storyCfg from './chapters/config.mjs';
import FirebaseAccount from './account/firebase.mjs';

// Localstorage
export const tinyLs = new TinyLocalStorage('pony-driland');

// gtag
// @ts-ignore
window.dataLayer = window.dataLayer || [];
export function gtag() {
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
