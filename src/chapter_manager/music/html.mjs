import TinyHtml from 'tiny-essentials/libs/TinyHtml';
import TinyHtmlElems from 'tiny-essentials/libs/TinyHtmlElems';
import { storyData } from '../../files/chapters.mjs';
import tinyLib from '../../files/tinyLib.mjs';
import { yt } from '../../api/youtube.mjs';

const { Icon } = TinyHtmlElems;

// Base
storyData.music = {
  isStopping: false,
  useThis: true,
  value: null,
  now: { playlist: null, index: -1 },
  usingSystem: false,
  disabled: true,
  playing: false,
  paused: false,
  stoppabled: true,
  buffering: false,
  volume: 0,
  playlist: [],
  playlistPlaying: [null],

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

storyData.music.nav = {};

// Buttons
storyData.music.nav.info = new Icon('fas fa-info-circle');
storyData.music.nav.play = new Icon('fas fa-play');
storyData.music.nav.volume = new Icon('fas fa-volume-mute');
storyData.music.nav.stop = new Icon('fas fa-stop');
storyData.music.nav.disable = new Icon('fas fa-ban');

// Base
export const musicBase = TinyHtml.createFrom('div', { id: 'music-player', class: 'd-none' });

// Items
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
      if (!storyData.music.loading) {
        open(yt.player.getVideoUrl(), '_blank');
      }
    })
    .append(storyData.music.nav.info),

  // Play
  TinyHtml.createFrom('a', {
    href: 'javascript:void(0)',
    class: 'disabled text-white',
    title: 'Play/Pause',
  })
    .on('click', () => {
      if (!storyData.music.loading) {
        if (yt.state === YT.PlayerState.PLAYING) {
          if (yt.player.pauseVideo) yt.player.pauseVideo();
        } else {
          if (yt.player.playVideo) yt.player.playVideo();
        }
      }
    })
    .append(storyData.music.nav.play),

  // Stop
  TinyHtml.createFrom('a', {
    href: 'javascript:void(0)',
    class: 'disabled text-white',
    title: 'Stop',
  })
    .on('click', () => {
      if (!storyData.music.loading) {
        storyData.music.isStopping = true;
        yt.player.stopVideo();
      }
    })
    .append(storyData.music.nav.stop),

  // Volume
  TinyHtml.createFrom('a', {
    href: 'javascript:void(0)',
    class: 'disabled text-white',
    title: 'Volume',
  })
    .on('click', () => {
      if (!storyData.music.loading) {
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
              .on('change', () => yt.setVolume(input.val()))
              .setVal(storyData.music.volume ?? null),
          ),
          dialog: 'modal-lg',
        });
      }
    })
    .append(storyData.music.nav.volume),

  // Disable
  disableButton
    .on('click', () => {
      if (!storyData.music.loading) {
        disableButton.removeClass('');
        if (storyData.music.useThis) {
          storyData.music.useThis = false;
          storyData.music.nav.disable.addClass('text-danger');
        } else {
          storyData.music.useThis = true;
          storyData.music.nav.disable.removeClass('text-danger');
        }
      }
    })
    .append(storyData.music.nav.disable),
);

// Insert Items
musicBase.append(...musicBaseItems);
