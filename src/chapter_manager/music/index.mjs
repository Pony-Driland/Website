import Pizzicato from 'pizzicato';
import objHash from 'object-hash';
import { shuffleArray, ruleOfThree } from 'tiny-essentials/basics';
import TinyHtml from 'tiny-essentials/libs/TinyHtml';
import TinyHtmlElems from 'tiny-essentials/libs/TinyHtmlElems';

import SeamlessLoop from '../../../build/bundle/SeamlessLoop.mjs';
import BuffAudio from '../../../build/bundle/buffaudio.mjs';
import { yt } from '../../api/youtube.mjs';

import { storyData } from '../../files/chapters.mjs';
import storyCfg from '../../chapters/config.mjs';
import ttsManager from '../tts/tts.mjs';
import { Tooltip } from '../../modules/TinyBootstrap.mjs';
import { musicApp, musicBase } from './html.mjs';

const { Icon } = TinyHtmlElems;

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
      typeof musicApp.now.index === 'number' &&
      !isNaN(musicApp.now.index) &&
      isFinite(musicApp.now.index) &&
      musicApp.now.index > -1 &&
      storyData.readFic
    ) {
      musicApp.now.index++;
      if (!musicApp.playlist[musicApp.now.index]) {
        musicApp.now.index = 0;
      }

      // Play
      const song = musicApp.playlist[musicApp.now.index];
      if (
        song &&
        typeof song.id === 'string' &&
        song.id.length > 0 &&
        typeof song.type === 'string' &&
        song.type.length > 0
      ) {
        // Youtube
        if (song.type === 'youtube') {
          setTimeout(() => yt.play(song.id), 1000);
        }
      }
    }
  },

  disable: (react = true) => {
    if (react) {
      musicApp.disabled = true;
      TinyHtml.query('#music-player')?.addClass('disabled-player');
    } else {
      musicApp.disabled = false;
      TinyHtml.query('#music-player')?.removeClass('disabled-player');
    }
  },

  // Start Base
  startBase: () => {
    // Add Item Base
    if (storyData.nc.base.right.find(':scope > #status #music').length < 1) {
      // Update
      musicApp.songVolumeUpdate();

      // Fix Youtube Player
      //youtubePlayer.removeClass('hidden');

      // Prepare
      if (!storyData.chapter.nav) {
        storyData.chapter.nav = {};
      }

      storyData.chapter.nav.music = TinyHtml.createFrom('div', {
        indexItem: 1,
        class: 'nav-item',
        id: 'music',
      }).append(musicBase);

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
  // View
  TinyHtml.query('#music-player')?.addClass('border').removeClass('d-none').addClass('me-3');

  // Buff
  if (musicApp.buffering || musicApp.loading || !musicApp.usingSystem || !yt.exists) {
    TinyHtml.queryAll('#music-player > a').addClass('disabled');
  } else {
    TinyHtml.queryAll('#music-player > a').removeClass('disabled');
  }

  // Title
  if (typeof musicApp.title === 'string' && musicApp.title.length > 0) {
    const newTitle = `Youtube - ${musicApp.author_name} - ${musicApp.title}`;
    const divBase = new TinyHtml(TinyHtml.queryAll('#music-player > a').has(musicApp.nav.info));

    if (divBase.size > 0 && divBase.data('bs-tooltip-data') !== newTitle) {
      divBase.setData('bs-tooltip-data', newTitle);
      const bsToolTip = divBase.data('BootstrapToolTip');
      if (bsToolTip) bsToolTip.setContent({ '.tooltip-inner': newTitle });
    }
  }

  // Playing
  if (musicApp.playing) {
    musicApp.nav.play.addClass('fa-pause').removeClass('fa-play');
  } else if (musicApp.paused) {
    musicApp.nav.play.addClass('fa-play').removeClass('fa-pause');
  } else if (
    musicApp.stoppabled ||
    typeof musicApp.currentTime !== 'number' ||
    typeof musicApp.duration !== 'number' ||
    musicApp.currentTime === musicApp.duration
  ) {
    musicApp.nav.play.addClass('fa-play').removeClass('fa-pause');
  }

  // Volume
  musicApp.nav.volume.removeClass('fa-volume-mute').removeClass('fa-volume-up');
  if (typeof musicApp.volume === 'number' && musicApp.volume > 0) {
    musicApp.nav.volume.addClass('fa-volume-up');
  } else {
    musicApp.nav.volume.addClass('fa-volume-mute');
  }

  // Tooltip
  TinyHtml.queryAll('#music-player > a[title]').forEach((instance) => Tooltip(instance));
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

      let newVolume = ruleOfThree(tinyValue, 100, musicApp.volume);
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

      let newVolume = ruleOfThree(tinyValue, 100, musicApp.volume);
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

      let newVolume = ruleOfThree(tinyValue, 100, musicApp.volume);
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
  if (musicApp.usingSystem) {
    // Playing Used
    if (musicApp.playing) {
      musicApp.playingUsed = true;
    }

    // Using System
    musicApp.usingSystem = false;

    // Hide Progress
    const hideTimeout = 50;
    let volume = musicApp.volume;
    for (let i = 0; i < 100; i++) {
      if (!musicApp.usingSystem) {
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
  if (storyData.readFic && objHash(musicApp.playlist) !== objHash(musicApp.playlistPlaying)) {
    // Check Status
    if (Array.isArray(musicApp.playlist) && musicApp.playlist.length > 0) {
      // Play Song
      shuffleArray(musicApp.playlist);

      const playSong = () => {
        if (
          typeof musicApp.now.index === 'number' &&
          !isNaN(musicApp.now.index) &&
          isFinite(musicApp.now.index) &&
          musicApp.now.index > -1
        ) {
          // Update Cache
          musicApp.playlistPlaying = musicApp.playlist;

          // Play
          const song = musicApp.playlist[musicApp.now.index];
          if (
            song &&
            typeof song.id === 'string' &&
            song.id.length > 0 &&
            typeof song.type === 'string' &&
            song.type.length > 0
          ) {
            // Youtube
            if (song.type === 'youtube') {
              setTimeout(() => yt.play(song.id), 100);
            }
          }
        }
      };

      // Exist
      if (
        musicApp.now.playlist === null ||
        musicApp.now.index === -1 ||
        musicApp.now.playlist !== musicApp.value
      ) {
        // Fix Index
        if (musicApp.now.index < 0 || musicApp.now.playlist !== musicApp.value) {
          musicApp.now.index = 0;
        }

        // Now
        musicApp.now.playlist = musicApp.value;

        // Play
        playSong();
      }

      // Resume
      else if (musicApp.playingUsed) {
        if (musicApp.playingUsed) {
          playSong();
        }

        musicApp.playingUsed = false;
      }
    }

    // Check Data
    musicApp.usingSystem = true;
  }
};

export default musicManager;
