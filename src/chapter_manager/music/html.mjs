import TinyHtml from 'tiny-essentials/libs/html/TinyHtml';
import TinyHtmlElems from 'tiny-essentials/libs/html/TinyHtmlElems';
import { storyData } from '../../files/chapters.mjs';
import storyCfg from '../../chapters/config.mjs';
import tinyLib from '../../files/tinyLib.mjs';
import musicPlayer from './player.mjs';

const { Icon } = TinyHtmlElems;

// Base
/**
 * Pre-built DOM nodes of the floating music player.
 *
 * @module chapter_manager/music/html
 */

/**
 * @typedef {Object} MusicApp
 * @property {boolean} useThis
 * @property {string|null} value
 * @property {{ playlist: string|null, index: number }} now
 * @property {boolean} usingSystem
 * @property {boolean} disabled
 * @property {boolean} playing
 * @property {boolean} paused
 * @property {boolean} buffering
 * @property {number} volume
 * @property {StoryTrack[]} playlist
 * @property {StoryTrack[]} playlistPlaying
 * @property {boolean} loading
 * @property {string} title
 * @property {string} author_name
 * @property {string} provider_name
 * @property {string} thumbnail_url
 * @property {number} currentTime
 * @property {number} duration
 * @property {boolean} playingUsed
 * @property {Record<string, TinyHtmlAny>} nav
 * @property {() => void} songVolumeUpdate
 */

/** @type {MusicApp} */
export const musicApp = {
  useThis: true,
  value: null,
  now: { playlist: null, index: -1 },
  usingSystem: false,
  disabled: true,
  playing: false,
  paused: false,
  buffering: false,
  volume: storyCfg.defaultYoutubeVolume,
  playlist: [],
  playlistPlaying: [],
  loading: false,
  title: '',
  author_name: '',
  provider_name: '',
  thumbnail_url: '',
  currentTime: 0,
  duration: 0,
  playingUsed: false,

  nav: {
    info: new Icon('fas fa-info-circle'),
    play: new Icon('fas fa-play'),
    volume: new Icon('fas fa-volume-mute'),
    stop: new Icon('fas fa-stop'),
    disable: new Icon('fas fa-ban'),
  },

  songVolumeUpdate: () => {
    setTimeout(() => {
      for (const item in storyData.sfx) {
        if (typeof storyData.sfx[item].volume === 'number') {
          storyData.sfx[item].setVolume();
        }
      }
    }, 100);
  },
};

// Base
export const musicBase = TinyHtml.createFrom('div', { id: 'music-player', class: 'd-none' });

// Items
/** @type {TinyHtmlAny[]} */
export const musicBaseItems = [];

const disableButton = TinyHtml.createFrom('a', {
  href: 'javascript:void(0)',
  class: 'disabled text-white',
  title: 'Disable',
});

musicBaseItems.push(
  // Info
  TinyHtml.createFrom('a', {
    href: 'javascript:void(0)',
    class: 'disabled text-white',
    title: 'Source',
  })
    .on('click', () => {
      const url = musicPlayer.getSourceUrl();
      if (!musicApp.loading && url) open(url, '_blank');
    })
    .append(musicApp.nav.info),

  // Play
  TinyHtml.createFrom('a', {
    href: 'javascript:void(0)',
    class: 'disabled text-white',
    title: 'Play/Pause',
  })
    .on('click', () => {
      if (musicApp.loading) return;
      if (musicApp.playing) {
        musicPlayer.pause();
      } else {
        musicPlayer.resume();
      }
    })
    .append(musicApp.nav.play),

  // Stop
  TinyHtml.createFrom('a', {
    href: 'javascript:void(0)',
    class: 'disabled text-white',
    title: 'Stop',
  })
    .on('click', () => {
      if (!musicApp.loading) musicPlayer.stop();
    })
    .append(musicApp.nav.stop),

  // Volume
  TinyHtml.createFrom('a', {
    href: 'javascript:void(0)',
    class: 'disabled text-white',
    title: 'Volume',
  })
    .on('click', () => {
      if (musicApp.loading) return;

      const input = TinyHtml.createFrom('input', {
        class: 'form-control range',
        type: 'range',
        min: 0,
        max: 100,
      });

      // Modal
      tinyLib.modal({
        title: [new Icon('fas fa-volume me-3'), 'Song Volume'],
        body: TinyHtml.createFrom('center').append(
          TinyHtml.createFrom('p').setText('Change the page music volume'),
          input
            .on('change', () => musicPlayer.setVolume(Number(input.val())))
            .setVal(musicApp.volume ?? null),
        ),
        dialog: 'modal-lg',
      });
    })
    .append(musicApp.nav.volume),

  // Disable
  disableButton
    .on('click', () => {
      if (musicApp.loading) return;

      if (musicApp.useThis) {
        musicApp.useThis = false;
        musicApp.nav.disable.addClass('text-danger');
      } else {
        musicApp.useThis = true;
        musicApp.nav.disable.removeClass('text-danger');
      }
    })
    .append(musicApp.nav.disable),
);

// Insert Items
musicBase.append(...musicBaseItems);
