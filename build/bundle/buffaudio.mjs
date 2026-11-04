import { EventEmitter } from 'events';

/**
 * BuffAudio.js - http://github.com/eipark/buffaudio
 * A wrapper around the HTML5 Web Audio API to easily play, pause,
 * and skip around an AudioBuffer.
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer
 * https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2013 Ernie Park
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

class BuffAudio extends EventEmitter {
  /** @type {boolean} */
  _isPlaying = false;
  /** @type {null|AudioBufferSourceNode} */
  _source = null;
  /** @type {number} - time of the audio playback, seconds */
  _playbackTime = 0;
  /** @type {number} - timestamp of last playback start, milliseconds */ 
  _startTimestamp = 0;
  /** @type {number} - seconds */
  _bufferDuration = 0;
  /** @type {AudioBuffer} */
  _buffer;
  /** @type {AudioContext} */
  _audioContext;

  /**
   * @param {AudioContext} audioContext
   * @param {AudioBuffer} buffer
   */
  constructor(audioContext, buffer) {
    super();
    this._audioContext = audioContext;
    this._buffer = buffer;
  }

  /**
   * Whenever we get a new AudioBuffer, we create a new AudioBufferSourceNode and reset
   * the playback time. Make sure any existing audio is stopped beforehand.
   * @param {AudioBuffer} buffer
   */
  initNewBuffer(buffer) {
    this.stop();
    this._buffer = buffer;
    this._playbackTime = 0;
  }

  /**
   * Create a new AudioBufferSourceNode
   */
  initSource() {
    this._source = this._audioContext.createBufferSource();
    this._source.buffer = this._buffer;
    this._source.connect(this._audioContext.destination);
    // Bind the callback to this
    const endOfPlayback = this.endOfPlayback.bind(this);
    this._source.onended = endOfPlayback;
  }

  /**
   * Play the currently loaded buffer
   */
  play() {
    if (this._isPlaying || !this._source) return;
    this.initSource();
    this._source.start(0, this._playbackTime);
    this._startTimestamp = Date.now();
    this._isPlaying = true;
    this.emit('play');
  }

  /**
   * Seek to a specific playbackTime (seconds) in the audio buffer. Do not change
   * playback state.
   * @param {number} playbackTime
   *
   */
  seek(playbackTime) {
    if (playbackTime === undefined) return;
    if (playbackTime > this._buffer.duration) {
      console.warn('[ERROR] Seek time is greater than duration of audio buffer.');
      return;
    }

    if (this._isPlaying) {
      this.stop(); // Stop any existing playback if there is any
      this._playbackTime = playbackTime;
      this.play(); // Resume playback at new time
    } else {
      this._playbackTime = playbackTime;
    }
    this.emit('seek', playbackTime);
  }

  /**
   * Pause playback, keep track of where playback stopped
   */
  pause() {
    this.emit('pause');
    this.stop(true);
  }

  /**
   * Stops or pauses playback and sets playbackTime accordingly
   * @param {boolean} [pause]
   */
  stop(pause) {
    if (!this._isPlaying) return;
    this._isPlaying = false; // Set to flag to endOfPlayback callback that this was set manually
    this._source?.stop(0);
    // If paused, calculate time where we stopped. Otherwise go back to beginning of playback (0).
    this._playbackTime = pause
      ? (Date.now() - this._startTimestamp) / 1000 + this._playbackTime
      : 0;
    this.emit('stop', pause);
  }

  /**
   * Callback for any time playback stops/pauses
   */
  endOfPlayback() {
    // If playback stopped because end of buffer was reached
    if (this._isPlaying) this._playbackTime = 0;
    this._isPlaying = false;
    this.emit('endOfPlayback');
  }

  init() {
    this.initNewBuffer(this._buffer);
  }
}

// Set BuffAudio on the global window object
export default BuffAudio;
