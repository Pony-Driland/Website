/**
 * SeamlessLoop.js 2.0 - Reproduces seamless loops on HTML5/Javascript
 * https://github.com/Hivenfour/SeamlessLoop
 *
 * Copyright (c) 2012 Main Software,
 * Written by Darío Tejedor Rico. Contact mail: hivenfour@gmail.com
 * The source code is freely distributable under the terms of LGPL license.
 * License details at http://www.gnu.org/licenses/lgpl-3.0.txt
 *
 * USAGE:
 * - Create the Seamlessloop object
 * 		const loop = new SeamlessLoop();
 *
 * - Add as many sounds as you will use, providing duration in miliseconds
 * (sounds must be pre-loaded if you want to update the loop without gaps)
 * 		loop.addUri(uri, length, "sound1");
 * 		loop.addUri(uri, length, "sound2");
 * ...
 *
 * - Establish your callback function that will be called when all sounds are pre-loaded
 * 		loop.callback(soundsLoaded);
 *
 * - Start reproducing the seamless loop:
 * 		function soundsLoaded() {
 * 			const n = 1;
 * 			loop.start("sound" + n);
 * 		};
 *
 * - Update the looping sound, you can do this
 * synchronously (waiting the loop to finish)
 * or asynchronously (change sound immediately):
 * 		n++;
 * 		loop.update("sound" + n, false);
 *
 * - Modify the seamless loop volume:
 * 		loop.volume(0.5);
 * 		loop.volume(loop.volume() + 0.1);
 *
 * - Stop the seamless loop:
 * 		loop.stop();
 */

class ActualArray extends Map {
  _length = -1;
  _1_isLoaded = false;
  _2_isLoaded = false;
  /** @type {HTMLAudioElement|null} */
  _1 = null;
  /** @type {HTMLAudioElement|null} */
  _2 = null;
  constructor() {
    super();
  }
}

class SeamlessLoop {
  /** @type {number} */
  _total = 0;
  /** @type {number} */
  _load = 0;
  /** @type {(() => void)|null} */
  cb_loaded = null;
  cb_loaded_flag = new Boolean();
  /** @type {NodeJS.Timeout|null} */
  timeout = null;
  /** @type {number} */
  playDelay = -30;
  /** @type {number} */
  stopDelay = 30;
  /** @type {boolean} */
  isDebug = false;

  is = {
    ff: Boolean(
      // @ts-ignore
      !(window.mozInnerScreenX == null) && /firefox/.test(navigator.userAgent.toLowerCase()),
    ),
    // @ts-ignore
    ie: Boolean(document.all && !window.opera),
    // @ts-ignore
    opera: Boolean(window.opera),
    // @ts-ignore
    chrome: Boolean(window.chrome),
    safari: Boolean(
      // @ts-ignore
      !window.chrome &&
      /safari/.test(navigator.userAgent.toLowerCase()) &&
      // @ts-ignore
      window.getComputedStyle &&
      // @ts-ignore
      !window.globalStorage &&
      // @ts-ignore
      !window.opera,
    ),
  };

  next = 1;
  audios = new ActualArray();
  actual = new ActualArray();
  dropOld = new Boolean();

  constructor() {
    if (this.is.chrome) this.playDelay = -25;
    if (this.is.chrome) this.stopDelay = 25;
    if (this.is.ff) this.playDelay = -25;
    if (this.is.ff) this.stopDelay = 85;
    if (this.is.opera) this.playDelay = 5;
    if (this.is.opera) this.stopDelay = 0;
    this.old;
    this._volume = 1;
    if (this.isDebug) {
      console.debug(this.playDelay + ', ' + this.stopDelay);
      console.debug('ff: ' + this.is.ff);
      console.debug('ie: ' + this.is.ie);
      console.debug('opera: ' + this.is.opera);
      console.debug('chrome: ' + this.is.chrome);
      console.debug('safari: ' + this.is.safari);
    }
  }

  /** @param {boolean} audBool */
  _eventCanplaythrough(audBool) {
    if (audBool == false) {
      audBool = true;
      this._load++;
      if (this._load == this._total) {
        this.loaded = true;
        if (this.cb_loaded_flag == true) {
          if (typeof this.cb_loaded === 'function') this.cb_loaded();
          this.cb_loaded_flag = false;
        }
      }
    }
  }

  /** @param {HTMLAudioElement} audMute */
  _eventPlaying(audMute) {
    setTimeout(() => {
      audMute.pause();
      try {
        audMute.currentTime = 0;
      } catch (e) {
        console.error(e);
      }
    }, this.stopDelay);

    if (this.dropOld == true) {
      setTimeout(() => {
        if (this.old?.paused == false) {
          this.old.pause();
          try {
            this.old.currentTime = 0;
          } catch (e) {
            console.error(e);
          }
        }
      }, this.stopDelay);
      this.dropOld = false;
    }
  }

  /** @param {HTMLAudioElement} aud */
  _eventEnded(aud) {
    aud.volume = this._volume;
  }

  doLoop() {
    /** @type {'_1'|'_2'} */
    const key = this.next == 1 ? '_1' : '_2';
    /** @type {'_1'|'_2'} */
    const antikey = this.next == 1 ? '_2' : '_1';

    this.timeout = setTimeout(() => {
      this.doLoop();
    }, this.actual._length + this.playDelay);

    if (this.is.opera) this.actual[antikey]?.pause();

    this.actual[key]?.play();
    this.next *= -1;
  }

  isLoaded() {
    return Boolean(this._load == this._total);
  }

  /** @param {string} id */
  start(id) {
    if (id != '') {
      this.actual = this.audios.get(id);
    }
    this.doLoop();
  }

  /** @param {number} [vol] */
  volume(vol) {
    if (typeof vol != 'undefined' && this.actual._1 && this.actual._2) {
      this.actual._1.volume = vol;
      this.actual._2.volume = vol;
      this._volume = vol;
    }

    return vol;
  }

  stop() {
    if (!this.actual._1 || !this.actual._2) return;
    if (this.timeout !== null) clearTimeout(this.timeout);
    this.timeout = null;
    this.actual._1.currentTime = 0;
    this.actual._1.pause();
    this.actual._2.currentTime = 0;
    this.actual._2.pause();
  }

  /** @param {() => void} cb_loaded */
  callback(cb_loaded) {
    this.cb_loaded = cb_loaded;
    if (this.isLoaded() == true) cb_loaded();
    else this.cb_loaded_flag = true;
  }

  /**
   * @param {string} id
   * @param {boolean} sync
   */
  update(id, sync) {
    //const key = (this.next == 1 ? "_1" : "_2");
    /** @type {'_2'|'_1'} */
    const antikey = this.next == 1 ? '_2' : '_1';

    this.old = this.actual[antikey];
    this.actual = this.audios.get(id);
    if (sync == false) {
      if (this.old?.paused == false) {
        this.dropOld = true;
        if (this.is.opera) this.old.pause();
      }
      if (this.timeout !== null) clearTimeout(this.timeout);
      this.timeout = null;
      this.doLoop();
    }
  }

  /**
   * @param {string} uri
   * @param {number} length
   * @param {string} id
   */
  addUri(uri, length, id) {
    const audio = new ActualArray();
    this.audios.set(id, audio);
    audio._length = length;
    audio._1 = new Audio(uri);
    audio._2 = new Audio(uri);
    this._total++;
    audio._1.addEventListener('canplaythrough', () => {
      this._eventCanplaythrough(audio._1_isLoaded);
    });
    audio._2.addEventListener('canplaythrough', () => {
      this._eventCanplaythrough(audio._2_isLoaded);
    });
    audio._1.addEventListener('playing', () => {
      if (!audio._2) {
        console.warn('No audio_2');
        return;
      }
      this._eventPlaying(audio._2);
    });
    audio._2.addEventListener('playing', () => {
      if (!audio._1) {
        console.warn('No audio_1');
        return;
      }
      this._eventPlaying(audio._1);
    });
    audio._1.addEventListener('ended', () => {
      if (!audio._1) {
        console.warn('No audio_1');
        return;
      }
      this._eventEnded(audio._1);
    });
    audio._2.addEventListener('ended', () => {
      if (!audio._2) {
        console.warn('No audio_2');
        return;
      }
      this._eventEnded(audio._2);
    });
    audio._1.load();
    audio._2.load();
    audio._1.volume = this._volume;
    audio._2.volume = this._volume;
  }
}

export default SeamlessLoop;
