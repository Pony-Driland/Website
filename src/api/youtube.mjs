import TinyHtml from 'tiny-essentials/libs/TinyHtml';
import { EventEmitter } from 'events';
import { storyData } from '../files/chapters.mjs';
import musicManager from '../chapter_manager/music/index.mjs';
import storyCfg from '../chapters/config.mjs';
import { tinyLs, gtag } from '../important.mjs';
import { head } from '../html/query.mjs';
import { alert } from '../files/tinyLib.mjs';

import { musicApp } from '../chapter_manager/music/html.mjs';

const ytElemId = 'youtubePlayer';

export const ytElem = new TinyHtml(`#${ytElemId}`);

class YoutubeApi extends EventEmitter {
  constructor() {
    super();
  }

  /** @type {any} */
  #player = null;

  /** @returns {any} */
  get player() {
    return this.#player;
  }

  // Check Youtube Values
  get exists() {
    return typeof YT !== 'undefined' && this.#player && YT.PlayerState;
  }

  /** @type {Record<string, any>|null} */
  #embed = null;

  /** @returns {Record<string, any>|null} */
  get embed() {
    return this.#embed;
  }

  /** @type {number} */
  #volume = storyCfg.defaultYoutubeVolume;

  /** @returns {number} */
  get volume() {
    return this.#volume;
  }

  /** @type {string|null} */
  #videoId = null;

  /** @returns {string|null} */
  get videoId() {
    return this.#videoId;
  }

  /** @type {number} */
  #currentTime = 0;

  /** @returns {number} */
  get currentTime() {
    return this.#currentTime;
  }

  /** @type {number} */
  #duration = false;

  /** @returns {number} */
  get duration() {
    return this.#duration;
  }

  /** @type {boolean} */
  #loading = false;

  /** @returns {boolean} */
  get loading() {
    return this.#loading;
  }

  /** @type {string|null} */
  #quality = null;

  /** @returns {string|null} */
  get quality() {
    return this.#quality;
  }

  /** @type {string[]} */
  #qualityList = [];

  /** @returns {string[]} */
  get qualityList() {
    return this.#qualityList;
  }

  /** @type {string|number|null} */
  #state = null;

  /** @returns {string|number|null} */
  get state() {
    return this.#state;
  }

  install() {
    this.#player = new YT.Player(ytElemId, {
      height: 'auto',
      width: 'auto',
      playerVars: { controls: 0 },
      videoId: this.#videoId,
      startSeconds: 0,
      events: this.#events,
    });
  }

  /**
   * Quality
   * @param {string} value
   */
  setQuality(value) {
    if (this.#qualityList.indexOf(value) > -1 || value === 'default') {
      this.#quality = value;
      this.player.setPlaybackQuality(value);
      return true;
    } else {
      return false;
    }
  }

  /**
   * Volume
   * @param {string|number} value
   */
  setVolume(number) {
    tinyLs.setItem('storyVolume', Number(number));
    this.#volume = Number(number);
    this.player.setVolume(Number(number));
    musicApp.volume = Number(number);
    musicApp.songVolumeUpdate();
  }

  #usingAnimation = false;

  #animationFrame() {
    if (this.exists && storyData.readFic) {
      // Fix
      musicApp.playing = false;
      musicApp.paused = false;
      musicApp.stoppabled = false;
      musicApp.buffering = false;

      // Playing
      if (this.#state === YT.PlayerState.PLAYING) {
        // Set Embed
        if (!this.#embed) {
          this.#embed = {};
          fetch(
            'https://www.youtube.com/oembed?format=json&url=' +
              encodeURIComponent(`https://www.youtube.com/watch?v=` + this.#videoId),
            {
              method: 'GET',
              dataType: 'json',
            },
          )
            .then((res) => res.json())
            .then((jsonVideo) => {
              console.log(`Youtube video embed loaded!`, this.#videoId);
              this.#embed = jsonVideo;

              if (typeof storyCfg.gtag === 'string' && gtag) {
                gtag('event', 'chapter', {
                  event_chapter: `Chapter ${storyData.chapter.selected}`,
                  event_category: 'song_playing',
                  song: `${jsonVideo.provider_name} - ${jsonVideo.author_name} - ${jsonVideo.title}`,
                });
              }

              // Info
              musicApp.author_name = jsonVideo.author_name;
              musicApp.author_url = jsonVideo.author_url;
              musicApp.provider_name = jsonVideo.provider_name;
              musicApp.thumbnail_url = jsonVideo.thumbnail_url;
              musicApp.title = jsonVideo.title;

              if (this.#volume < 1) {
                if (this.player.pauseVideo) this.player.pauseVideo();
              }
            })
            .catch((err) => {
              console.error(err);
              alert(err.message);
            });
        }

        musicApp.playing = true;
        this.#duration = this.player.getDuration();
        this.#currentTime = this.player.getCurrentTime();
        this.#onPlaying();
      }

      // Ended
      else if (this.#state === YT.PlayerState.ENDED || this.#state === YT.PlayerState.CUED) {
        // Stopping
        if (musicApp.isStopping) {
          this.player.seekTo(0);
          if (this.player.pauseVideo) this.player.pauseVideo();
          musicApp.isStopping = false;
        }

        // Next
        else if (!this.#loading && storyData.readFic && this.#embed) {
          this.#embed = null;
          musicManager.nextMusic();
        }

        // Progress
        musicApp.stoppabled = true;
        this.#currentTime = this.player.getDuration();
      }

      // Paused
      else if (this.#state === YT.PlayerState.PAUSED) {
        musicApp.paused = true;
      }

      // Buff
      else if (this.#state === YT.PlayerState.BUFFERING) {
        musicApp.buffering = true;
      }
    }
    musicManager.updatePlayer();
    requestAnimationFrame(() => this.#animationFrame());
  }

  /**
   * Start Youtube
   * @param {string} videoID
   */
  play(videoID) {
    // Read Data Base
    if (!this.#loading && storyData.readFic) {
      musicApp.loading = true;
      this.#loading = true;
      this.#embed = null;
      console.log(`Loading youtube video embed...`, videoID);

      // Youtube Player
      if (this.player && this.player.setVolume) this.player.setVolume(musicApp.volume);

      musicApp.loading = false;
      this.#loading = false;

      // Prepare Video ID
      this.#videoId = videoID;
      this.#currentTime = 0;
      this.#duration = 0;

      // New Player
      if (!this.player) {
        // 2. This code loads the IFrame Player API code asynchronously.
        console.log(`Starting Youtube API...`, videoID);
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        head.append(tag);

        // Current Time Detector
        if (!this.#usingAnimation) {
          this.#usingAnimation = true;
          requestAnimationFrame(() => this.#animationFrame());
        }
      }

      // Reuse Player
      else if (this.player && this.player.loadVideoById)
        this.player.loadVideoById({
          videoId: videoID,
          startSeconds: 0,
        });

      // Prepare Volume
      if (typeof musicApp.volume === 'number' && this.#volume !== musicApp.volume) {
        if (this.player) {
          this.player.setVolume(this.#volume);
        }
        musicApp.volume = this.#volume;
      }
    }
  }

  // Add Youtube Playing Detector
  #onPlaying() {
    musicApp.currentTime = this.#currentTime;
    musicApp.duration = this.#duration;
    musicManager.updatePlayer();
    this.emit('onPlaying');
  }

  #events = {
    // Ready API
    onReady: (event) => {
      // Get Data
      this.#volume = this.player.getVolume();
      this.#quality = this.player.getPlaybackQuality();
      this.#qualityList = this.player.getAvailableQualityLevels();

      // Storage Volume
      const storageVolume = Number(tinyLs.getItem('storyVolume'));
      if (
        Number.isNaN(storageVolume) ||
        !Number.isFinite(storageVolume) ||
        storageVolume < 0 ||
        storageVolume > 100
      ) {
        if (Number.isNaN(this.#volume) || !Number.isFinite(this.#volume)) {
          this.#volume = 100;
          this.player.setVolume(100);
          tinyLs.setItem('storyVolume', 100);
          musicApp.volume = 100;
        } else {
          tinyLs.setItem('storyVolume', this.#volume);
        }
      } else {
        this.#volume = storageVolume;
        this.player.setVolume(storageVolume);
        musicApp.volume = storageVolume;
      }

      // Play Video
      this.player.seekTo(0);
      this.player.setLoop(true);
      this.player.setShuffle(true);

      if (this.#volume > 0) {
        if (this.player.playVideo) this.player.playVideo();
      } else {
        if (this.player.pauseVideo) this.player.pauseVideo();
      }

      this.emit('onReady', event);
    },

    // State Change
    onStateChange: (event) => {
      // Event
      if (event) {
        this.#state = event.data;
        this.#qualityList = this.player.getAvailableQualityLevels();
      }
      this.emit('onStateChange', event);
    },

    // Quality
    onPlaybackQualityChange: (event) => {
      if (event) this.#quality = event.data;
      this.emit('onPlaybackQualityChange', event);
      /* player.setPlaybackQuality('default') */
    },

    // Other
    onPlaybackRateChange: (event) => {
      this.emit('onPlaybackRateChange', event);
    },
    onError: (event) => {
      console.error(event);
      this.emit('onError', event);
    },
    onApiChange: (event) => {
      this.emit('onApiChange', event);
    },
  };
}

export const yt = new YoutubeApi();

// 1. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
// https://developers.google.com/youtube/iframe_api_reference?hl=pt-br
window.onYouTubeIframeAPIReady = function onYouTubeIframeAPIReady() {
  console.log(`Youtube API started!`);
  yt.install();
};
