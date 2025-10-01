import TinyHtml from 'tiny-essentials/libs/TinyHtml';
import { storyData } from '../files/chapters.mjs';

export const ytElem = new TinyHtml('#youtubePlayer');

class YoutubeApi {
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

  install() {
    this.#player = new YT.Player('youtubePlayer', {
      height: 'auto',
      width: 'auto',
      playerVars: { controls: 0 },
      videoId: storyData.youtube.videoID,
      startSeconds: 0,
      events: storyData.youtube.events,
    });
  }
}

export const yt = new YoutubeApi();

// 1. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
// https://developers.google.com/youtube/iframe_api_reference?hl=pt-br
window.onYouTubeIframeAPIReady = function onYouTubeIframeAPIReady() {
  console.log(`Youtube API started!`);
  yt.install();
};
