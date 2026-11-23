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

/**
 * Buttons that must be locked while the soundtrack is disabled. The volume and
 * the disable button are not part of the list: the volume also drives the sound
 * effects and the disable button is the only way back.
 *
 * @type {TinyHtmlAny[]}
 */
export const musicButtons = [];

// Items
/** @type {TinyHtmlAny[]} */
export const musicBaseItems = [];

// These never get the `disabled` class: the volume also controls the sound
// effects, and the disable button is the only way back.
const volumeButton = TinyHtml.createFrom('a', {
  href: 'javascript:void(0)',
  class: 'text-white',
  title: 'Volume',
});

const disableButton = TinyHtml.createFrom('a', {
  href: 'javascript:void(0)',
  class: 'text-white',
  title: 'Disable',
});

const alwaysEnabled = [volumeButton, disableButton];

/** Tooltip of the source button while nothing is playing. */
export const DEFAULT_SOURCE_TITLE = 'Source';

/**
 * Human readable name of each provider.
 *
 * @type {Record<string, string>}
 */
const PROVIDER_NAMES = {
  'audio-file': 'Pony Driland',
  youtube: 'YouTube',
};

/**
 * Builds the tooltip of the source button.
 *
 * The button stays enabled while a local song plays on purpose: a disabled
 * element never shows its tooltip, which would hide the only place where the
 * visitor can read where the song comes from.
 *
 * @returns {string} The tooltip text.
 */
const buildSourceTitle = () => {
  const metadata = musicPlayer.getMetadata();
  if (!metadata) return DEFAULT_SOURCE_TITLE;

  const provider = PROVIDER_NAMES[metadata.type] ?? metadata.type;
  const title = metadata.title || DEFAULT_SOURCE_TITLE;

  return `${title} (${provider})`;
};

const sourceButton = TinyHtml.createFrom('a', {
  href: 'javascript:void(0)',
  class: 'disabled text-white',
  title: DEFAULT_SOURCE_TITLE,
})
  .on('click', () => {
    // A file of the website has no external page to open.
    if (musicPlayer.isLocalSource()) return;

    const url = musicPlayer.getSourceUrl();
    if (url) open(url, '_blank');
  })
  .append(musicApp.nav.info);

/**
 * Keeps the source button in sync with the current track.
 *
 * @returns {void}
 */
export const updateSourceButton = () => {
  sourceButton.setAttr('title', buildSourceTitle());
};

musicBaseItems.push(
  // Info
  sourceButton,

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
    .on('click', () => musicPlayer.stop())
    .append(musicApp.nav.stop),

  // Volume. It also drives the sound effects, so it is never locked.
  volumeButton
    .on('click', () => {
      const input = TinyHtml.createFrom('input', {
        class: 'form-control range',
        type: 'range',
        min: 0,
        max: 100,
      });

      // Modal
      tinyLib.modal({
        title: [new Icon('fas fa-volume me-3'), 'Volume'],
        body: TinyHtml.createFrom('center').append(
          TinyHtml.createFrom('p').setText('Change the music and sound effects volume'),
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
    .on('click', () => musicApp.onDisabledChange?.(!musicApp.disabled))
    .append(musicApp.nav.disable),
);

// Everything except the volume and the disable button is locked while the music
// is off: the volume also drives the sound effects, and the disable button is
// the only way back.
musicButtons.push(...musicBaseItems.filter((item) => !alwaysEnabled.includes(item)));

// Insert Items
musicBase.append(...musicBaseItems);
