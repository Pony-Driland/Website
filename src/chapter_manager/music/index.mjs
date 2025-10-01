import Pizzicato from 'pizzicato';
import objHash from 'object-hash';
import { shuffleArray, ruleOfThree } from 'tiny-essentials/basics';
import TinyHtml from 'tiny-essentials/libs/TinyHtml';
import TinyHtmlElems from 'tiny-essentials/libs/TinyHtmlElems';
import { tinyLs, gtag, appData } from '../../important.mjs';
import SeamlessLoop from '../../../build/bundle/SeamlessLoop.mjs';
import BuffAudio from '../../../build/bundle/buffaudio.mjs';

import tinyLib, { alert } from '../../files/tinyLib.mjs';
import { storyData } from '../../files/chapters.mjs';
import storyCfg from '../../chapters/config.mjs';
import ttsManager from '../tts/tts.mjs';
import { Tooltip } from '../../modules/TinyBootstrap.mjs';
import { head } from '../../html/query.mjs';
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

// Youtube Player
storyData.youtube = {
  // Volume
  volume: storyCfg.defaultYoutubeVolume,
  quality: null,
  state: null,
  embed: null,

  // Player
  player: null,
  events: {
    // Ready API
    onReady: (event) => {
      // Get Data
      storyData.youtube.volume = yt.player.getVolume();
      storyData.youtube.quality = yt.player.getPlaybackQuality();
      storyData.youtube.qualityList = yt.player.getAvailableQualityLevels();

      // Storage Volume
      const storageVolume = Number(tinyLs.getItem('storyVolume'));
      if (
        isNaN(storageVolume) ||
        !isFinite(storageVolume) ||
        storageVolume < 0 ||
        storageVolume > 100
      ) {
        if (
          typeof storyData.youtube.volume !== 'number' ||
          isNaN(storyData.youtube.volume) ||
          !isFinite(storyData.youtube.volume)
        ) {
          storyData.youtube.volume = 100;
          yt.player.setVolume(100);
          tinyLs.setItem('storyVolume', 100);
          storyData.music.volume = 100;
        } else {
          tinyLs.setItem('storyVolume', storyData.youtube.volume);
        }
      } else {
        storyData.youtube.volume = storageVolume;
        yt.player.setVolume(storageVolume);
        storyData.music.volume = storageVolume;
      }

      // Play Video
      yt.player.seekTo(0);
      yt.player.setLoop(true);
      yt.player.setShuffle(true);

      if (storyData.youtube.volume > 0) {
        if (yt.player.playVideo) yt.player.playVideo();
      } else {
        if (yt.player.pauseVideo) yt.player.pauseVideo();
      }

      // Send Data
      if (typeof appData.youtube.onReady === 'function') {
        appData.youtube.onReady(event);
      }
    },

    // State Change
    onStateChange: (event) => {
      // Event
      if (event) {
        storyData.youtube.state = event.data;
        storyData.youtube.qualityList = yt.player.getAvailableQualityLevels();
      }

      // Send Data
      if (typeof appData.youtube.onStateChange === 'function') {
        appData.youtube.onStateChange(event);
      }
    },

    // Quality
    onPlaybackQualityChange: (event) => {
      if (event) {
        storyData.youtube.quality = event.data;
      }
      if (typeof appData.youtube.onPlaybackQualityChange === 'function') {
        appData.youtube.onPlaybackQualityChange(event);
      }
      /* player.setPlaybackQuality('default') */
    },

    // Other
    onPlaybackRateChange: (event) => {
      if (typeof appData.youtube.onPlaybackRateChange === 'function') {
        appData.youtube.onPlaybackRateChange(event);
      }
    },

    onError: (event) => {
      console.error(event);
      if (typeof appData.youtube.onError === 'function') {
        appData.youtube.onError(event);
      }
    },

    onApiChange: (event) => {
      if (typeof appData.youtube.onApiChange === 'function') {
        appData.youtube.onApiChange(event);
      }
    },
  },

  // Quality
  setQuality: (value) => {
    if (storyData.youtube.qualityList.indexOf(value) > -1 || value === 'default') {
      storyData.youtube.quality = value;
      yt.player.setPlaybackQuality(value);
      return true;
    } else {
      return false;
    }
  },

  // Volume
  setVolume: (number) => {
    tinyLs.setItem('storyVolume', Number(number));
    storyData.youtube.volume = Number(number);
    yt.player.setVolume(Number(number));
    storyData.music.volume = Number(number);
    storyData.music.songVolumeUpdate();
  },

  // Start Youtube
  play: (videoID) => {
    // Read Data Base
    if (!storyData.youtube.loading && storyData.readFic) {
      storyData.music.loading = true;
      storyData.youtube.loading = true;
      delete storyData.youtube.embed;
      console.log(`Loading youtube video embed...`, videoID);

      // Youtube Player
      if (yt.player && yt.player.setVolume) yt.player.setVolume(storyData.music.volume);

      storyData.music.loading = false;
      storyData.youtube.loading = false;

      // Prepare Video ID
      storyData.youtube.videoID = videoID;
      storyData.youtube.currentTime = 0;
      storyData.youtube.duration = 0;

      // New Player
      if (!yt.player) {
        // 2. This code loads the IFrame Player API code asynchronously.
        console.log(`Starting Youtube API...`, videoID);
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        head.append(tag);

        // Current Time Detector
        setInterval(() => {
          if (yt.exists && yt.player) {
            // Fix
            storyData.music.playing = false;
            storyData.music.paused = false;
            storyData.music.stoppabled = false;
            storyData.music.buffering = false;

            if (yt.exists) {
              // Playing
              if (storyData.youtube.state === YT.PlayerState.PLAYING) {
                // Set Embed
                if (!storyData.youtube.embed) {
                  storyData.youtube.embed = {};
                  fetch(
                    'https://www.youtube.com/oembed?format=json&url=' +
                      encodeURIComponent(
                        `https://www.youtube.com/watch?v=` + storyData.youtube.videoID,
                      ),
                    {
                      method: 'GET',
                      dataType: 'json',
                    },
                  )
                    .then((res) => res.json())
                    .then((jsonVideo) => {
                      console.log(`Youtube video embed loaded!`, storyData.youtube.videoID);
                      storyData.youtube.embed = jsonVideo;

                      if (typeof storyCfg.gtag === 'string' && gtag) {
                        gtag('event', 'chapter', {
                          event_chapter: `Chapter ${storyData.chapter.selected}`,
                          event_category: 'song_playing',
                          song: `${jsonVideo.provider_name} - ${jsonVideo.author_name} - ${jsonVideo.title}`,
                        });
                      }

                      // Info
                      storyData.music.author_name = jsonVideo.author_name;
                      storyData.music.author_url = jsonVideo.author_url;
                      storyData.music.provider_name = jsonVideo.provider_name;
                      storyData.music.thumbnail_url = jsonVideo.thumbnail_url;
                      storyData.music.title = jsonVideo.title;

                      if (storyData.youtube.volume < 1) {
                        if (yt.player.pauseVideo) yt.player.pauseVideo();
                      }
                    })
                    .catch((err) => {
                      console.error(err);
                      alert(err.message);
                    });
                }

                storyData.music.playing = true;
                storyData.youtube.duration = yt.player.getDuration();
                storyData.youtube.currentTime = yt.player.getCurrentTime();
                if (typeof appData.youtube.onPlaying === 'function') {
                  appData.youtube.onPlaying();
                }
              }

              // Ended
              else if (
                storyData.youtube.state === YT.PlayerState.ENDED ||
                storyData.youtube.state === YT.PlayerState.CUED
              ) {
                // Stopping
                if (storyData.music.isStopping) {
                  yt.player.seekTo(0);
                  if (yt.player.pauseVideo) yt.player.pauseVideo();
                  storyData.music.isStopping = false;
                }

                // Next
                else if (
                  !storyData.youtube.loading &&
                  storyData.readFic &&
                  storyData.youtube.embed
                ) {
                  delete storyData.youtube.embed;
                  musicManager.nextMusic();
                }

                // Progress
                storyData.music.stoppabled = true;
                storyData.youtube.currentTime = yt.player.getDuration();
              }

              // Paused
              else if (storyData.youtube.state === YT.PlayerState.PAUSED) {
                storyData.music.paused = true;
              }

              // Buff
              else if (storyData.youtube.state === YT.PlayerState.BUFFERING) {
                storyData.music.buffering = true;
              }
            }
          }
          musicManager.updatePlayer();
        }, 100);
      }

      // Reuse Player
      else {
        if (storyData.youtube && yt.player && yt.player.loadVideoById)
          yt.player.loadVideoById({
            videoId: videoID,
            startSeconds: 0,
          });
      }

      // Prepare Volume
      if (
        typeof storyData.youtube.volume === 'number' &&
        typeof storyData.music.volume === 'number' &&
        storyData.youtube.volume !== storyData.music.volume
      ) {
        if (yt.player) {
          yt.player.setVolume(storyData.youtube.volume);
        }
        storyData.music.volume = Number(storyData.youtube.volume);
      }
    }
  },
};

// Music Manager
const musicManager = {
  // Sound Cache
  cache: { blob: {}, buffer: {} },

  // Load Sound
  loadAudio: (url) => {
    return new Promise((resolve, reject) => {
      const vanillaURL = url;
      if (!musicManager.cache.blob[vanillaURL]) {
        fetch(url, { method: 'GET' })
          .then((response) => response.blob())
          .then((blob) => {
            const url = window.URL.createObjectURL(blob);

            let loaded = false;

            const audio = new Audio();
            audio.preload = 'auto';
            audio.onerror = reject;

            audio.addEventListener(
              'canplaythrough',
              () => {
                if (!loaded) {
                  loaded = true;
                  musicManager.cache.blob[vanillaURL] = audio;
                  resolve(audio);
                }
              },
              false,
            );

            audio.src = url;
          })
          .catch(reject);
      } else {
        resolve(musicManager.cache.blob[vanillaURL]);
      }
    });
  },

  loadAudioBuffer: (url) => {
    return new Promise((resolve, reject) => {
      const vanillaURL = url;
      if (!musicManager.cache.buffer[vanillaURL]) {
        fetch(url, { method: 'GET' })
          .then((response) => response.arrayBuffer())
          .then((buffer) => {
            const buffAudio = new BuffAudio(new AudioContext(), new Uint8Array(buffer));
            musicManager.cache.buffer[vanillaURL] = buffAudio;
            resolve(buffAudio);
          })
          .catch(reject);
      } else {
        resolve(musicManager.cache.buffer[vanillaURL]);
      }
    });
  },

  // Next Song
  nextMusic: () => {
    if (
      typeof storyData.music.now.index === 'number' &&
      !isNaN(storyData.music.now.index) &&
      isFinite(storyData.music.now.index) &&
      storyData.music.now.index > -1 &&
      storyData.readFic
    ) {
      storyData.music.now.index++;
      if (!storyData.music.playlist[storyData.music.now.index]) {
        storyData.music.now.index = 0;
      }

      // Play
      const song = storyData.music.playlist[storyData.music.now.index];
      if (
        song &&
        typeof song.id === 'string' &&
        song.id.length > 0 &&
        typeof song.type === 'string' &&
        song.type.length > 0
      ) {
        // Youtube
        if (song.type === 'youtube') {
          setTimeout(() => {
            storyData.youtube.play(song.id);
          }, 1000);
        }
      }
    }
  },

  disable: (react = true) => {
    if (react) {
      storyData.music.disabled = true;
      TinyHtml.query('#music-player')?.addClass('disabled-player');
    } else {
      storyData.music.disabled = false;
      TinyHtml.query('#music-player')?.removeClass('disabled-player');
    }
  },

  // Start Base
  startBase: () => {
    // Add Youtube Playing Detector
    if (appData.youtube && !appData.youtube.onPlaying) {
      appData.youtube.onPlaying = () => {
        storyData.music.currentTime = storyData.youtube.currentTime;
        storyData.music.duration = storyData.youtube.duration;
        musicManager.updatePlayer();
      };
    }

    // Add Item Base
    if (storyData.nc.base.right.find(':scope > #status #music').length < 1) {
      // Update
      storyData.music.songVolumeUpdate();

      // Navbar
      if (!storyData.music.nav) {
        storyData.music.nav = {};
      }

      // Buttons
      storyData.music.nav.info = new Icon('fas fa-info-circle');
      storyData.music.nav.play = new Icon('fas fa-play');
      storyData.music.nav.volume = new Icon('fas fa-volume-mute');
      storyData.music.nav.stop = new Icon('fas fa-stop');
      storyData.music.nav.disable = new Icon('fas fa-ban');

      // Fix Youtube Player
      //youtubePlayer.removeClass('hidden');

      // Prepare
      if (!storyData.chapter.nav) {
        storyData.chapter.nav = {};
      }

      const disableButton = TinyHtml.createFrom('a', {
        href: 'javascript:void(0)',
        class: 'disabled text-white',
        title: 'Disable',
      });

      storyData.chapter.nav.music = TinyHtml.createFrom('div', {
        indexItem: 1,
        class: 'nav-item',
        id: 'music',
      }).append(
        TinyHtml.createFrom('div', { id: 'music-player', class: 'd-none' }).append(
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
                if (storyData.youtube.state === YT.PlayerState.PLAYING) {
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
                      .on('change', () => {
                        storyData.youtube.setVolume(input.val());
                      })
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
        ),
      );

      // Insert
      new TinyHtml(storyData.nc.base.right.find(':scope > #status')).prepend([
        // Music
        storyData.chapter.nav.music,

        // Youtube
        //TinyHtml.createFrom('a', { class: 'nav-item nav-link mx-3 p-0', indexitem: '0', id: 'youtube-thumb' }).append(youtubePlayer),
      ]);
    }
  },
};

// Music Updater
musicManager.updatePlayer = () => {
  if (storyData.music.nav) {
    // View
    TinyHtml.query('#music-player')?.addClass('border').removeClass('d-none').addClass('me-3');

    // Buff
    if (
      storyData.music.buffering ||
      storyData.music.loading ||
      !storyData.music.usingSystem ||
      !yt.exists
    ) {
      TinyHtml.queryAll('#music-player > a').addClass('disabled');
    } else {
      TinyHtml.queryAll('#music-player > a').removeClass('disabled');
    }

    // Title
    if (typeof storyData.music.title === 'string' && storyData.music.title.length > 0) {
      const newTitle = `Youtube - ${storyData.music.author_name} - ${storyData.music.title}`;
      const divBase = new TinyHtml(
        TinyHtml.queryAll('#music-player > a').has(storyData.music.nav.info),
      );

      if (divBase.size > 0 && divBase.data('bs-tooltip-data') !== newTitle) {
        divBase.setData('bs-tooltip-data', newTitle);
        const bsToolTip = divBase.data('BootstrapToolTip');
        if (bsToolTip) bsToolTip.setContent({ '.tooltip-inner': newTitle });
      }
    }

    // Playing
    if (storyData.music.playing) {
      storyData.music.nav.play.addClass('fa-pause').removeClass('fa-play');
    } else if (storyData.music.paused) {
      storyData.music.nav.play.addClass('fa-play').removeClass('fa-pause');
    } else if (
      storyData.music.stoppabled ||
      typeof storyData.music.currentTime !== 'number' ||
      typeof storyData.music.duration !== 'number' ||
      storyData.music.currentTime === storyData.music.duration
    ) {
      storyData.music.nav.play.addClass('fa-play').removeClass('fa-pause');
    }

    // Volume
    storyData.music.nav.volume.removeClass('fa-volume-mute').removeClass('fa-volume-up');
    if (typeof storyData.music.volume === 'number' && storyData.music.volume > 0) {
      storyData.music.nav.volume.addClass('fa-volume-up');
    } else {
      storyData.music.nav.volume.addClass('fa-volume-mute');
    }

    // Tooltip
    TinyHtml.queryAll('#music-player > a[title]').forEach((instance) => Tooltip(instance));
  }
};

// TTS Updater
ttsManager.updatePlayer = () => {
  if (storyData.tts.nav) {
    // View
    TinyHtml.query('#tts-player')?.addClass('border').removeClass('d-none').addClass('me-3');

    // Tooltip
    TinyHtml.queryAll('#tts-player > a[title]').forEach((instance) => Tooltip(instance));
  }
};

musicManager.start = {};

musicManager.start.pizzicato = (item, loop, resolve, url, forcePic = false) => {
  // Pizzicato Space
  const pizzicato = {};

  // Pizzicato File
  pizzicato.playing = false;
  pizzicato.hiding = false;

  const newSound = new Pizzicato.Sound(
    {
      source: 'file',
      options: { path: url, loop: loop },
    },
    () => {
      resolve();
    },
  );

  pizzicato.data = newSound;

  // Data
  pizzicato.volume = newSound.volume * 100;

  // Stop
  pizzicato.stop = () => {
    if (pizzicato.playing) {
      pizzicato.playing = false;
      newSound.stop();
    }
  };

  // Start
  pizzicato.start = () => {
    if (!pizzicato.playing) {
      pizzicato.playing = true;
      newSound.play();
    }
  };

  // Play
  pizzicato.play = (volume = null) => {
    if (pizzicato.hiding) {
      pizzicato.stop();
    }
    pizzicato.hiding = false;
    pizzicato.showing = false;
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          if (typeof volume === 'number') {
            pizzicato.setVolume(volume);
          } else {
            pizzicato.setVolume(pizzicato.volume);
          }

          pizzicato.start();
          resolve();
        } catch (err) {
          reject(err);
        }
      }, 1);
    });
  };

  // Set Volume
  pizzicato.setVolume = (value, notEdit = false) => {
    return new Promise((resolve) => {
      let tinyValue = value;
      if (typeof tinyValue !== 'number') {
        tinyValue = pizzicato.volume;
      }

      if (tinyValue > 100) {
        tinyValue = 100;
      } else if (tinyValue < 0) {
        tinyValue = 0;
      }

      let newVolume = ruleOfThree(tinyValue, 100, storyData.music.volume);
      if (newVolume > 100) {
        newVolume = 100;
      }
      if (newVolume < 0) {
        newVolume = 0;
      }

      if (notEdit && newVolume > tinyValue) {
        newVolume = tinyValue;
      }

      if (pizzicato.playing) {
        newSound.volume = newVolume / 100;
      }

      if (!notEdit) {
        pizzicato.volume = tinyValue;
      }

      resolve();
    });
  };

  // Hide
  pizzicato.hide = async (hideTimeout = 50) => {
    let volume = newSound.volume * 100;

    pizzicato.hiding = true;
    pizzicato.showing = false;

    if (
      typeof hideTimeout === 'number' &&
      !isNaN(hideTimeout) &&
      isFinite(hideTimeout) &&
      hideTimeout > 0
    ) {
      for (let i = 0; i < 100; i++) {
        if (pizzicato.hiding) {
          await new Promise((resolve) => {
            setTimeout(() => {
              if (pizzicato.hiding) {
                volume--;
                pizzicato.setVolume(volume, true);
              }

              resolve();
            }, hideTimeout);
          });
        }
      }
    } else {
      pizzicato.setVolume(0, true);
    }

    if (pizzicato.hiding) {
      pizzicato.stop();
      pizzicato.hiding = false;
      pizzicato.showing = false;
    }
  };

  // Show
  pizzicato.show = async (hideTimeout = 50) => {
    pizzicato.stop();

    pizzicato.hiding = false;
    pizzicato.showing = false;

    const soundVolume = pizzicato.volume;
    let volume = 0;
    pizzicato.showing = true;
    pizzicato.hiding = false;
    pizzicato.setVolume(0, true);

    newSound.volume = 0;
    pizzicato.start();

    if (
      typeof hideTimeout === 'number' &&
      !isNaN(hideTimeout) &&
      isFinite(hideTimeout) &&
      hideTimeout > 0
    ) {
      for (let i = 0; i < 100; i++) {
        if (pizzicato.showing) {
          await new Promise((resolve) => {
            setTimeout(() => {
              if (pizzicato.showing) {
                if (volume < soundVolume) {
                  volume++;
                  pizzicato.setVolume(volume, true);
                } else {
                  pizzicato.setVolume(soundVolume, true);
                }
              }

              resolve();
            }, hideTimeout);
          });
        }
      }
    } else {
      pizzicato.setVolume(soundVolume, true);
    }

    if (pizzicato.showing) {
      pizzicato.hiding = false;
      pizzicato.showing = false;
    }
  };

  // End Sound
  newSound.on('end', () => {
    if (!loop) {
      pizzicato.hide(0);
    }
  });

  // Force Pic
  if (!forcePic) {
    storyData.sfx[item].pizzicato = pizzicato;
  } else {
    for (const item2 in pizzicato) {
      storyData.sfx[item][item2] = pizzicato[item2];
    }
  }
};

musicManager.start.seamlessloop = (item, newSound) => {
  // Data
  storyData.sfx[item].data = newSound;
  storyData.sfx[item].volume = newSound._volume * 100;

  // Stop
  storyData.sfx[item].stop = () => {
    if (storyData.sfx[item].playing) {
      storyData.sfx[item].playing = false;
      newSound.stop();
    }
  };

  // Start
  storyData.sfx[item].start = () => {
    if (!storyData.sfx[item].playing) {
      storyData.sfx[item].playing = true;
      newSound.start(item);
    }
  };

  // Play
  storyData.sfx[item].play = (volume = null) => {
    if (storyData.sfx[item].hiding) {
      storyData.sfx[item].stop();
    }
    storyData.sfx[item].hiding = false;
    storyData.sfx[item].showing = false;
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          if (typeof volume === 'number') {
            storyData.sfx[item].setVolume(volume);
          } else {
            storyData.sfx[item].setVolume(storyData.sfx[item].volume);
          }

          storyData.sfx[item].start();
          resolve();
        } catch (err) {
          reject(err);
        }
      }, 1);
    });
  };

  // Set Volume
  storyData.sfx[item].setVolume = (value, notEdit = false) => {
    return new Promise((resolve) => {
      let tinyValue = value;
      if (typeof tinyValue !== 'number') {
        tinyValue = storyData.sfx[item].volume;
      }

      if (tinyValue > 100) {
        tinyValue = 100;
      } else if (tinyValue < 0) {
        tinyValue = 0;
      }

      let newVolume = ruleOfThree(tinyValue, 100, storyData.music.volume);
      if (newVolume > 100) {
        newVolume = 100;
      }
      if (newVolume < 0) {
        newVolume = 0;
      }

      if (notEdit && newVolume > tinyValue) {
        newVolume = tinyValue;
      }

      if (storyData.sfx[item].playing) {
        newSound.volume(newVolume / 100);
      }

      if (!notEdit) {
        storyData.sfx[item].volume = tinyValue;
      }

      resolve();
    });
  };

  // Hide
  storyData.sfx[item].hide = async (hideTimeout = 50) => {
    let volume = newSound._volume * 100;

    storyData.sfx[item].hiding = true;
    storyData.sfx[item].showing = false;

    if (
      typeof hideTimeout === 'number' &&
      !isNaN(hideTimeout) &&
      isFinite(hideTimeout) &&
      hideTimeout > 0
    ) {
      for (let i = 0; i < 100; i++) {
        if (storyData.sfx[item].hiding) {
          await new Promise((resolve) => {
            setTimeout(() => {
              if (storyData.sfx[item].hiding) {
                volume--;
                storyData.sfx[item].setVolume(volume, true);
              }

              resolve();
            }, hideTimeout);
          });
        }
      }
    } else {
      storyData.sfx[item].setVolume(0, true);
    }

    if (storyData.sfx[item].hiding) {
      storyData.sfx[item].stop();
      storyData.sfx[item].hiding = false;
      storyData.sfx[item].showing = false;
    }
  };

  // Show
  storyData.sfx[item].show = async (hideTimeout = 50) => {
    storyData.sfx[item].stop();

    storyData.sfx[item].hiding = false;
    storyData.sfx[item].showing = false;

    const soundVolume = storyData.sfx[item].volume;
    let volume = 0;
    storyData.sfx[item].showing = true;
    storyData.sfx[item].hiding = false;
    storyData.sfx[item].setVolume(0, true);

    if (storyData.sfx[item].playing) {
      newSound.volume(0);
    }

    storyData.sfx[item].start();

    if (
      typeof hideTimeout === 'number' &&
      !isNaN(hideTimeout) &&
      isFinite(hideTimeout) &&
      hideTimeout > 0
    ) {
      for (let i = 0; i < 100; i++) {
        if (storyData.sfx[item].showing) {
          await new Promise((resolve) => {
            setTimeout(() => {
              if (storyData.sfx[item].showing) {
                if (volume < soundVolume) {
                  volume++;
                  storyData.sfx[item].setVolume(volume, true);
                } else {
                  storyData.sfx[item].setVolume(soundVolume, true);
                }
              }

              resolve();
            }, hideTimeout);
          });
        }
      }
    } else {
      storyData.sfx[item].setVolume(soundVolume, true);
    }

    if (storyData.sfx[item].showing) {
      storyData.sfx[item].hiding = false;
      storyData.sfx[item].showing = false;
    }
  };
};

musicManager.start.vanilla = (item, newSound) => {
  // Values
  storyData.sfx[item].paused = false;
  storyData.sfx[item].volume = newSound.volume * 100;
  storyData.sfx[item].currentTime = 0;
  storyData.sfx[item].duration = newSound.duration;

  // Play
  storyData.sfx[item].play = (inTime = null, volume = null) => {
    if (storyData.sfx[item].hiding) {
      newSound.pause();
    }
    storyData.sfx[item].hiding = false;
    storyData.sfx[item].showing = false;
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          if (typeof volume === 'number') {
            storyData.sfx[item].setVolume(volume);
          } else {
            storyData.sfx[item].setVolume(storyData.sfx[item].volume);
          }

          newSound.currentTime = 0;
          storyData.sfx[item].playing = true;
          storyData.sfx[item].paused = false;
          storyData.sfx[item].currentTime = 0;
          storyData.sfx[item].leftTime = storyData.sfx[item].duration;

          if (typeof inTime === 'number') {
            storyData.sfx[item].currentTime = inTime;
            newSound.currentTime = inTime;
          }

          newSound.play();
          resolve();
        } catch (err) {
          reject(err);
        }
      }, 1);
    });
  };

  // Seek To
  storyData.sfx[item].seekTo = (value) => {
    return new Promise((resolve) => {
      storyData.sfx[item].currentTime = value;
      newSound.currentTime = value;
      resolve();
    });
  };

  // Set Volume
  storyData.sfx[item].setVolume = (value, notEdit = false) => {
    return new Promise((resolve) => {
      let tinyValue = value;
      if (typeof tinyValue !== 'number') {
        tinyValue = storyData.sfx[item].volume;
      }

      if (tinyValue > 100) {
        tinyValue = 100;
      } else if (tinyValue < 0) {
        tinyValue = 0;
      }

      let newVolume = ruleOfThree(tinyValue, 100, storyData.music.volume);
      if (newVolume > 100) {
        newVolume = 100;
      }
      if (newVolume < 0) {
        newVolume = 0;
      }

      if (notEdit && newVolume > tinyValue) {
        newVolume = tinyValue;
      }

      newSound.volume = newVolume / 100;
      if (!notEdit) {
        storyData.sfx[item].volume = tinyValue;
      }

      resolve();
    });
  };

  // Stop
  storyData.sfx[item].stop = () => {
    if (storyData.sfx[item].hiding) {
      newSound.pause();
    }
    storyData.sfx[item].hiding = false;
    storyData.sfx[item].showing = false;
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          storyData.sfx[item].playing = false;
          storyData.sfx[item].paused = false;
          newSound.pause();
          newSound.currentTime = 0;
          storyData.sfx[item].currentTime = 0;
          storyData.sfx[item].leftTime = storyData.sfx[item].duration;
          resolve();
        } catch (err) {
          reject(err);
        }
      }, 1);
    });
  };

  // Pause
  storyData.sfx[item].pause = () => {
    if (storyData.sfx[item].hiding) {
      newSound.pause();
    }
    storyData.sfx[item].hiding = false;
    storyData.sfx[item].showing = false;
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          storyData.sfx[item].playing = false;
          storyData.sfx[item].paused = true;
          newSound.pause();
          resolve();
        } catch (err) {
          reject(err);
        }
      }, 1);
    });
  };

  // Resume
  storyData.sfx[item].resume = () => {
    if (storyData.sfx[item].hiding) {
      newSound.pause();
    }
    storyData.sfx[item].hiding = false;
    storyData.sfx[item].showing = false;
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          storyData.sfx[item].playing = true;
          storyData.sfx[item].paused = false;
          storyData.sfx[item].setVolume(storyData.sfx[item].volume);
          newSound.play();
          resolve();
        } catch (err) {
          reject(err);
        }
      }, 1);
    });
  };

  // Hide
  storyData.sfx[item].hide = async (hideTimeout = 50) => {
    let volume = newSound.volume * 100;

    storyData.sfx[item].playing = true;
    storyData.sfx[item].paused = false;
    storyData.sfx[item].hiding = true;
    storyData.sfx[item].showing = false;

    if (
      typeof hideTimeout === 'number' &&
      !isNaN(hideTimeout) &&
      isFinite(hideTimeout) &&
      hideTimeout > 0
    ) {
      for (let i = 0; i < 100; i++) {
        if (storyData.sfx[item].hiding) {
          await new Promise((resolve) => {
            setTimeout(() => {
              if (storyData.sfx[item].hiding) {
                volume--;
                storyData.sfx[item].setVolume(volume, true);
              }

              resolve();
            }, hideTimeout);
          });
        }
      }
    } else {
      storyData.sfx[item].setVolume(0, true);
    }

    if (storyData.sfx[item].hiding) {
      newSound.pause();
      storyData.sfx[item].playing = false;
      storyData.sfx[item].paused = false;
      storyData.sfx[item].hiding = false;
      storyData.sfx[item].showing = false;
      storyData.sfx[item].currentTime = 0;
      storyData.sfx[item].leftTime = storyData.sfx[item].duration;
    }
  };

  // Show
  storyData.sfx[item].show = async (hideTimeout = 50) => {
    newSound.pause();

    storyData.sfx[item].playing = false;
    storyData.sfx[item].paused = false;
    storyData.sfx[item].hiding = false;
    storyData.sfx[item].showing = false;

    const soundVolume = storyData.sfx[item].volume;
    newSound.currentTime = 0;
    storyData.sfx[item].currentTime = 0;
    storyData.sfx[item].leftTime = storyData.sfx[item].duration;
    let volume = 0;
    newSound.volume = 0;
    storyData.sfx[item].showing = true;
    storyData.sfx[item].hiding = false;
    storyData.sfx[item].setVolume(0, true);
    newSound.play();

    if (
      typeof hideTimeout === 'number' &&
      !isNaN(hideTimeout) &&
      isFinite(hideTimeout) &&
      hideTimeout > 0
    ) {
      for (let i = 0; i < 100; i++) {
        if (storyData.sfx[item].showing) {
          await new Promise((resolve) => {
            setTimeout(() => {
              if (storyData.sfx[item].showing) {
                if (volume < soundVolume) {
                  volume++;
                  storyData.sfx[item].setVolume(volume, true);
                } else {
                  storyData.sfx[item].setVolume(soundVolume, true);
                }
              }

              resolve();
            }, hideTimeout);
          });
        }
      }
    } else {
      storyData.sfx[item].setVolume(soundVolume, true);
    }

    if (storyData.sfx[item].showing) {
      storyData.sfx[item].playing = true;
      storyData.sfx[item].paused = false;
      storyData.sfx[item].hiding = false;
      storyData.sfx[item].showing = false;
    }
  };

  // Audio Action
  newSound.addEventListener(
    'ended',
    () => {
      storyData.sfx[item].stop();
    },
    false,
  );

  newSound.addEventListener(
    'timeupdate',
    () => {
      if (storyData.sfx[item].playing) {
        storyData.sfx[item].currentTime = storyData.sfx[item].file.currentTime;
        storyData.sfx[item].leftTime =
          storyData.sfx[item].duration - storyData.sfx[item].currentTime;
      }
    },
    false,
  );
};

// Insert SFX
musicManager.insertSFX = (item, loop = true, type = 'all') => {
  if (typeof loop !== 'boolean') {
    loop = true;
  }
  return new Promise(async (resolve, reject) => {
    if (!storyData.sfx[item]) {
      // Prepare
      storyData.sfx[item] = {};

      // Try
      try {
        // File URL
        let url = null;

        // IPFS
        if (storyCfg.sfx[item].type === 'ipfs') {
          url = storyCfg.ipfs.host.replace('{cid}', storyCfg.sfx[item].value);
        }

        // Normal
        else {
          url = storyCfg.sfx[item].value;
        }

        // Exist URL
        if (url) {
          // Resolve
          const tinyResolve = (data) => {
            console.log(`[${url}] Loaded!`);
            resolve(data);
          };

          // Values
          storyData.sfx[item].playing = false;
          storyData.sfx[item].hiding = false;
          storyData.sfx[item].loop = loop;

          // Log
          console.log(`[${url}] Loading...`);

          const file = await musicManager.loadAudio(url);
          storyData.sfx[item].file = file;

          // Start Pizzicato
          const startPizzicato = (forcePic = false) => {
            return musicManager.start.pizzicato(item, loop, tinyResolve, file.currentSrc, forcePic);
          };

          // Loop Audio
          if (loop) {
            // All Modules
            if (type === 'all') {
              const newSound = new SeamlessLoop();
              newSound.addUri(file.currentSrc, file.duration * 1000, item);
              newSound.callback(() => {
                musicManager.start.seamlessloop(item, newSound);
                startPizzicato();
              });
            } else if (type === 'pizzicato') {
              startPizzicato(true);
            } else if (type === 'main') {
              const newSound = new SeamlessLoop();
              newSound.addUri(file.currentSrc, file.duration * 1000, item);
              newSound.callback(() => {
                musicManager.start.seamlessloop(item, newSound);
                tinyResolve();
              });
            } else {
              reject(new Error('Invalid Module Type!'));
            }
          }

          // Nope
          else {
            // All Modules
            if (type === 'all') {
              // Start
              musicManager.start.vanilla(item, file);
              startPizzicato();
            } else if (type === 'pizzicato') {
              startPizzicato(true);
            } else if (type === 'main') {
              musicManager.start.vanilla(item, file);
              tinyResolve();
            } else {
              reject(new Error('Invalid Module Type!'));
            }
          }
        } else {
          reject(new Error('Invalid SFX File! ' + item));
        }
      } catch (err) {
        // Fail
        delete storyData.sfx[item];
        reject(err);
      }
    } else {
      resolve();
    }

    // Complete
    return;
  });
};

// Stop Playlist
musicManager.stopPlaylist = async () => {
  if (storyData.music.usingSystem) {
    // Playing Used
    if (storyData.music.playing) {
      storyData.music.playingUsed = true;
    }

    // Using System
    storyData.music.usingSystem = false;

    // Hide Progress
    const hideTimeout = 50;
    let volume = storyData.music.volume;
    for (let i = 0; i < 100; i++) {
      if (!storyData.music.usingSystem) {
        await new Promise((resolve) => {
          setTimeout(() => {
            // Volume
            volume--;

            // Youtube Player
            if (yt.player && typeof yt.player.setVolume === 'function') {
              yt.player.setVolume(volume);
            }

            if (i === 100) {
              // Youtube Player
              if (yt.player) {
                yt.player.stopVideo();
              }
            }

            resolve();
          }, hideTimeout);
        });
      }
    }
  }
  return;
};

// Start Playlist
musicManager.startPlaylist = () => {
  if (
    storyData.readFic &&
    objHash(storyData.music.playlist) !== objHash(storyData.music.playlistPlaying)
  ) {
    // Check Status
    if (Array.isArray(storyData.music.playlist) && storyData.music.playlist.length > 0) {
      // Play Song
      shuffleArray(storyData.music.playlist);

      const playSong = () => {
        if (
          typeof storyData.music.now.index === 'number' &&
          !isNaN(storyData.music.now.index) &&
          isFinite(storyData.music.now.index) &&
          storyData.music.now.index > -1
        ) {
          // Update Cache
          storyData.music.playlistPlaying = storyData.music.playlist;

          // Play
          const song = storyData.music.playlist[storyData.music.now.index];
          if (
            song &&
            typeof song.id === 'string' &&
            song.id.length > 0 &&
            typeof song.type === 'string' &&
            song.type.length > 0
          ) {
            // Youtube
            if (song.type === 'youtube') {
              setTimeout(() => {
                storyData.youtube.play(song.id);
              }, 100);
            }
          }
        }
      };

      // Exist
      if (
        storyData.music.now.playlist === null ||
        storyData.music.now.index === -1 ||
        storyData.music.now.playlist !== storyData.music.value
      ) {
        // Fix Index
        if (
          storyData.music.now.index < 0 ||
          storyData.music.now.playlist !== storyData.music.value
        ) {
          storyData.music.now.index = 0;
        }

        // Now
        storyData.music.now.playlist = storyData.music.value;

        // Play
        playSong();
      }

      // Resume
      else if (storyData.music.playingUsed) {
        if (storyData.music.playingUsed) {
          playSong();
        }

        storyData.music.playingUsed = false;
      }
    }

    // Check Data
    storyData.music.usingSystem = true;
  }
};

export default musicManager;
