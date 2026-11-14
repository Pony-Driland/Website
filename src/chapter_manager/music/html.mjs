import TinyHtml from 'tiny-essentials/libs/html/TinyHtml';
import TinyHtmlElems from 'tiny-essentials/libs/html/TinyHtmlElems';
import { storyData } from '../../files/chapters.mjs';
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
 * @property {string|null} value
 * @property {{ playlist: string|null, index: number }} now
 * @property {boolean} usingSystem
 * @property {boolean} disabled
 * @property {boolean} playing
 * @property {number} volume
 * @property {StoryTrack[]} playlist
 * @property {StoryTrack[]} playlistPlaying
 * @property {boolean} playingUsed
 * @property {Record<string, TinyHtmlAny>} nav
 * @property {() => void} songVolumeUpdate
 * @property {(disabled: boolean) => void} [onDisabledChange]
 */

/** @type {MusicApp} */
export const musicApp = {
  value: null,
  now: { playlist: null, index: -1 },
  usingSystem: false,
  disabled: true,
  playing: false,
  get volume() {
    return Math.round(musicPlayer.player.volume * 100);
  },
  playlist: [],
  playlistPlaying: [],
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
      if (url) open(url, '_blank');
    })
    .append(musicApp.nav.info),

  // Play
  TinyHtml.createFrom('a', {
    href: 'javascript:void(0)',
    class: 'disabled text-white',
    title: 'Play/Pause',
  })
    .on('click', () => {
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
      musicPlayer.stop();
    })
    .append(musicApp.nav.stop),

  // Volume
  TinyHtml.createFrom('a', {
    href: 'javascript:void(0)',
    class: 'disabled text-white',
    title: 'Volume',
  })
    .on('click', () => {
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
      if (typeof musicApp.onDisabledChange === 'function') {
        musicApp.onDisabledChange(!musicApp.disabled);
      }
    })
    .append(musicApp.nav.disable),
);

// Insert Items
musicBase.append(...musicBaseItems);
