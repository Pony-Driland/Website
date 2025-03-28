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

  songVolumeUpdate: function () {
    setTimeout(function () {
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
  // Check Youtube Values
  checkYT: function () {
    return typeof YT !== 'undefined' && YT.PlayerState;
  },

  // Volume
  volume: storyCfg.defaultYoutubeVolume,
  quality: null,
  state: null,
  embed: null,

  // Player
  player: null,
  events: {
    // Ready API
    onReady: function (event) {
      // Get Data
      storyData.youtube.volume = storyData.youtube.player.getVolume();
      storyData.youtube.quality = storyData.youtube.player.getPlaybackQuality();
      storyData.youtube.qualityList = storyData.youtube.player.getAvailableQualityLevels();

      // Storage Volume
      const storageVolume = Number(localStorage.getItem('storyVolume'));
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
          storyData.youtube.player.setVolume(100);
          localStorage.setItem('storyVolume', 100);
          storyData.music.volume = 100;
        } else {
          localStorage.setItem('storyVolume', storyData.youtube.volume);
        }
      } else {
        storyData.youtube.volume = storageVolume;
        storyData.youtube.player.setVolume(storageVolume);
        storyData.music.volume = storageVolume;
      }

      // Play Video
      storyData.youtube.player.seekTo(0);
      storyData.youtube.player.setLoop(true);
      storyData.youtube.player.setShuffle(true);

      if (storyData.youtube.volume > 0) {
        if (storyData.youtube.player.playVideo) storyData.youtube.player.playVideo();
      } else {
        if (storyData.youtube.player.pauseVideo) storyData.youtube.player.pauseVideo();
      }

      // Send Data
      if (typeof appData.youtube.onReady === 'function') {
        appData.youtube.onReady(event);
      }
    },

    // State Change
    onStateChange: function (event) {
      // Event
      if (event) {
        storyData.youtube.state = event.data;
        storyData.youtube.qualityList = storyData.youtube.player.getAvailableQualityLevels();
      }

      // Send Data
      if (typeof appData.youtube.onStateChange === 'function') {
        appData.youtube.onStateChange(event);
      }
    },

    // Quality
    onPlaybackQualityChange: function (event) {
      if (event) {
        storyData.youtube.quality = event.data;
      }
      if (typeof appData.youtube.onPlaybackQualityChange === 'function') {
        appData.youtube.onPlaybackQualityChange(event);
      }
      /* player.setPlaybackQuality('default') */
    },

    // Other
    onPlaybackRateChange: function (event) {
      if (typeof appData.youtube.onPlaybackRateChange === 'function') {
        appData.youtube.onPlaybackRateChange(event);
      }
    },

    onError: function (event) {
      console.error(event);
      if (typeof appData.youtube.onError === 'function') {
        appData.youtube.onError(event);
      }
    },

    onApiChange: function (event) {
      if (typeof appData.youtube.onApiChange === 'function') {
        appData.youtube.onApiChange(event);
      }
    },
  },

  // Quality
  setQuality: function (value) {
    if (storyData.youtube.qualityList.indexOf(value) > -1 || value === 'default') {
      storyData.youtube.quality = value;
      storyData.youtube.player.setPlaybackQuality(value);
      return true;
    } else {
      return false;
    }
  },

  // Volume
  setVolume: function (number) {
    localStorage.setItem('storyVolume', Number(number));
    storyData.youtube.volume = Number(number);
    storyData.youtube.player.setVolume(Number(number));
    storyData.music.volume = Number(number);
    storyData.music.songVolumeUpdate();
  },

  // Start Youtube
  play: function (videoID) {
    // Read Data Base
    if (!storyData.youtube.loading && storyData.readFic) {
      storyData.music.loading = true;
      storyData.youtube.loading = true;
      delete storyData.youtube.embed;
      console.log(`Loading youtube video embed...`, videoID);

      // Youtube Player
      if (storyData.youtube.player && storyData.youtube.player.setVolume)
        storyData.youtube.player.setVolume(storyData.music.volume);

      storyData.music.loading = false;
      storyData.youtube.loading = false;

      // Prepare Video ID
      storyData.youtube.videoID = videoID;
      storyData.youtube.currentTime = 0;
      storyData.youtube.duration = 0;

      // New Player
      if (!storyData.youtube.player) {
        // 2. This code loads the IFrame Player API code asynchronously.
        console.log(`Starting Youtube API...`, videoID);
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        $('head').append(tag);

        // Current Time Detector
        setInterval(function () {
          if (storyData.youtube.checkYT() && storyData.youtube.player) {
            // Fix
            storyData.music.playing = false;
            storyData.music.paused = false;
            storyData.music.stoppabled = false;
            storyData.music.buffering = false;

            if (storyData.youtube.checkYT()) {
              // Playing
              if (storyData.youtube.state === YT.PlayerState.PLAYING) {
                // Set Embed
                if (!storyData.youtube.embed) {
                  storyData.youtube.embed = {};
                  $.ajax({
                    url:
                      'https://www.youtube.com/oembed?format=json&url=' +
                      encodeURIComponent(
                        `https://www.youtube.com/watch?v=` + storyData.youtube.videoID,
                      ),
                    type: 'get',
                    dataType: 'json',
                  })
                    .done(function (jsonVideo) {
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
                        if (storyData.youtube.player.pauseVideo)
                          storyData.youtube.player.pauseVideo();
                      }
                    })
                    .fail((err) => {
                      console.error(err);
                      alert(err.message);
                    });
                }

                storyData.music.playing = true;
                storyData.youtube.duration = storyData.youtube.player.getDuration();
                storyData.youtube.currentTime = storyData.youtube.player.getCurrentTime();
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
                  storyData.youtube.player.seekTo(0);
                  if (storyData.youtube.player.pauseVideo) storyData.youtube.player.pauseVideo();
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
                storyData.youtube.currentTime = storyData.youtube.player.getDuration();
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
        if (storyData.youtube && storyData.youtube.player && storyData.youtube.player.loadVideoById)
          storyData.youtube.player.loadVideoById({
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
        if (storyData.youtube.player) {
          storyData.youtube.player.setVolume(storyData.youtube.volume);
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
  loadAudio: function (url) {
    return new Promise(function (resolve, reject) {
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
              function () {
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

  loadAudioBuffer: function (url) {
    return new Promise(function (resolve, reject) {
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
  nextMusic: function () {
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
          setTimeout(function () {
            storyData.youtube.play(song.id);
          }, 1000);
        }
      }
    }
  },

  disable: function (react = true) {
    if (react) {
      storyData.music.disabled = true;
      $('#music-player').addClass('disabled-player');
    } else {
      storyData.music.disabled = false;
      $('#music-player').removeClass('disabled-player');
    }
  },

  // Start Base
  startBase: function () {
    // Add Youtube Playing Detector
    if (appData.youtube && !appData.youtube.onPlaying) {
      appData.youtube.onPlaying = function () {
        storyData.music.currentTime = storyData.youtube.currentTime;
        storyData.music.duration = storyData.youtube.duration;
        musicManager.updatePlayer();
      };
    }

    // Add Item Base
    if ($('#fic-nav > #status #music').length < 1) {
      // Update
      storyData.music.songVolumeUpdate();

      // Navbar
      if (!storyData.music.nav) {
        storyData.music.nav = {};
      }

      // Buttons
      storyData.music.nav.youtube = $('#youtubePlayer');
      storyData.music.nav.info = tinyLib.icon('fas fa-info-circle');
      storyData.music.nav.play = tinyLib.icon('fas fa-play');
      storyData.music.nav.volume = tinyLib.icon('fas fa-volume-mute');
      storyData.music.nav.stop = tinyLib.icon('fas fa-stop');
      storyData.music.nav.disable = tinyLib.icon('fas fa-ban');

      // Fix Youtube Player
      //storyData.music.nav.youtube.removeClass('hidden');

      // Prepare
      if (!storyData.chapter.nav) {
        storyData.chapter.nav = {};
      }
      storyData.chapter.nav.music = $('<div>', {
        indexItem: 1,
        class: 'nav-item',
        id: 'music',
      }).append(
        $('<div>', { id: 'music-player', class: 'd-none' }).append(
          // Info
          $('<a>', {
            href: 'javascript:void(0)',
            class: 'disabled text-white',
            title: 'Source',
          })
            .on('click', () => {
              if (!storyData.music.loading) {
                open(storyData.youtube.player.getVideoUrl(), '_blank');
              }
            })
            .append(storyData.music.nav.info),

          // Play
          $('<a>', {
            href: 'javascript:void(0)',
            class: 'disabled text-white',
            title: 'Play/Pause',
          })
            .on('click', () => {
              if (!storyData.music.loading) {
                if (storyData.youtube.state === YT.PlayerState.PLAYING) {
                  if (storyData.youtube.player.pauseVideo) storyData.youtube.player.pauseVideo();
                } else {
                  if (storyData.youtube.player.playVideo) storyData.youtube.player.playVideo();
                }
              }
            })
            .append(storyData.music.nav.play),

          // Stop
          $('<a>', {
            href: 'javascript:void(0)',
            class: 'disabled text-white',
            title: 'Stop',
          })
            .on('click', () => {
              if (!storyData.music.loading) {
                storyData.music.isStopping = true;
                storyData.youtube.player.stopVideo();
              }
            })
            .append(storyData.music.nav.stop),

          // Volume
          $('<a>', {
            href: 'javascript:void(0)',
            class: 'disabled text-white',
            title: 'Volume',
          })
            .on('click', () => {
              if (!storyData.music.loading) {
                // Modal
                tinyLib.modal({
                  title: [tinyLib.icon('fas fa-volume me-3'), 'Song Volume'],
                  body: $('<center>').append(
                    $('<p>').text('Change the page music volume'),
                    $('<input>', {
                      class: 'form-control range',
                      type: 'range',
                      min: 0,
                      max: 100,
                    })
                      .change(function () {
                        storyData.youtube.setVolume($(this).val());
                      })
                      .val(storyData.music.volume),
                  ),
                  dialog: 'modal-lg',
                });
              }
            })
            .append(storyData.music.nav.volume),

          // Disable
          $('<a>', {
            href: 'javascript:void(0)',
            class: 'disabled text-white',
            title: 'Disable',
          })
            .on('click', function () {
              if (!storyData.music.loading) {
                $(this).removeClass('');
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
      $('#fic-nav > #status').prepend([
        // Music
        storyData.chapter.nav.music,

        // Youtube
        //$('<a>', { class: 'nav-item nav-link mx-3 p-0', indexitem: '0', id: 'youtube-thumb' }).append(storyData.music.nav.youtube),
      ]);
    }
  },
};

// Youtube

// 1. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
// https://developers.google.com/youtube/iframe_api_reference?hl=pt-br
function onYouTubeIframeAPIReady() {
  console.log(`Youtube API started!`);
  storyData.youtube.player = new YT.Player('youtubePlayer', {
    height: 'auto',
    width: 'auto',
    playerVars: { controls: 0 },
    videoId: storyData.youtube.videoID,
    startSeconds: 0,
    events: storyData.youtube.events,
  });
}

// Music Updater
musicManager.updatePlayer = function () {
  if (storyData.music.nav) {
    // View
    $('#music-player').addClass('border').removeClass('d-none').addClass('me-3');

    // Buff
    if (
      storyData.music.buffering ||
      storyData.music.loading ||
      !storyData.music.usingSystem ||
      !storyData.youtube.checkYT()
    ) {
      $('#music-player > a').addClass('disabled');
    } else {
      $('#music-player > a').removeClass('disabled');
    }

    // Title
    if (typeof storyData.music.title === 'string' && storyData.music.title.length > 0) {
      const newTitle = `Youtube - ${storyData.music.author_name} - ${storyData.music.title}`;
      const divBase = $('#music-player > a').has(storyData.music.nav.info);

      if (divBase && divBase.data('bs-tooltip-data') !== newTitle) {
        divBase.data('bs-tooltip-data', newTitle);
        const bsToolTip = divBase.data('bs-tooltip');
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
      storyData.music.nav.volume.addClass('fas fa-volume-mute');
    }

    // Tooltip
    $('#music-player > a[title]').each(function () {
      $(this).tooltip();
    });
  }
};

// TTS Updater
ttsManager.updatePlayer = function () {
  if (storyData.tts.nav) {
    // View
    $('#tts-player').addClass('border').removeClass('d-none').addClass('me-3');

    // Tooltip
    $('#tts-player > a[title]').each(function () {
      $(this).tooltip();
    });
  }
};

// Insert SFX
musicManager.start = {};
musicManager.insertSFX = function (item, loop = true, type = 'all') {
  if (typeof loop !== 'boolean') {
    loop = true;
  }
  return new Promise(async function (resolve, reject) {
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
          const tinyResolve = function (data) {
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
          const startPizzicato = function (forcePic = false) {
            return musicManager.start.pizzicato(item, loop, tinyResolve, file.currentSrc, forcePic);
          };

          // Loop Audio
          if (loop) {
            // All Modules
            if (type === 'all') {
              const newSound = new SeamlessLoop();
              newSound.addUri(file.currentSrc, file.duration * 1000, item);
              newSound.callback(function () {
                musicManager.start.seamlessloop(item, newSound);
                startPizzicato();
              });
            } else if (type === 'pizzicato') {
              startPizzicato(true);
            } else if (type === 'main') {
              const newSound = new SeamlessLoop();
              newSound.addUri(file.currentSrc, file.duration * 1000, item);
              newSound.callback(function () {
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
musicManager.stopPlaylist = async function () {
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
        await new Promise(function (resolve) {
          setTimeout(function () {
            // Volume
            volume--;

            // Youtube Player
            if (
              storyData.youtube.player &&
              typeof storyData.youtube.player.setVolume === 'function'
            ) {
              storyData.youtube.player.setVolume(volume);
            }

            if (i === 100) {
              // Youtube Player
              if (storyData.youtube.player) {
                storyData.youtube.player.stopVideo();
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
musicManager.startPlaylist = function () {
  if (
    storyData.readFic &&
    objHash(storyData.music.playlist) !== objHash(storyData.music.playlistPlaying)
  ) {
    // Check Status
    if (Array.isArray(storyData.music.playlist) && storyData.music.playlist.length > 0) {
      // Play Song
      tinyLib.shuffle(storyData.music.playlist);

      const playSong = function () {
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
              setTimeout(function () {
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
