import TinyHtml from 'tiny-essentials/libs/html/TinyHtml';
import TinyHtmlElems from 'tiny-essentials/libs/html/TinyHtmlElems';
import tinyLib from '../../files/tinyLib.mjs';
import { storyData } from '../../files/chapters.mjs';
import audioUnlock from '../audioUnlock.mjs';
import cacheChapterUpdater from '../updater.mjs';

const { Icon } = TinyHtmlElems;

// Base
storyData.tts = { enabled: false };

/**
 * Thin wrapper around the Web Speech API used to read chapters aloud.
 *
 * @module chapter_manager/tts
 */

/**
 * @typedef {Object} TtsManager
 * @property {boolean} enabled - Whether TTS playback is enabled.
 * @property {string[]} voicePreferenceList - Preferred voice name fragments.
 * @property {SpeechSynthesis} synth - Speech synthesis instance.
 * @property {SpeechSynthesisVoice[]} voices - Available voices.
 * @property {SpeechSynthesisVoice|null} voice - Selected voice.
 * @property {number} lastLine - Last line that was read.
 * @property {ReturnType<typeof setTimeout>|null} ttsTimeout - Pending timeout handle.
 * @property {string[]} queue - Pending utterances.
 * @property {(line: number, dontTryAgain?: boolean) => FicPageEntry|null} findLine - Finds a line entry.
 * @property {() => void} startBase - Builds the player UI.
 * @property {() => void} enable - Enables TTS.
 * @property {() => void} disable - Disables TTS.
 * @property {() => void} init - Loads the available voices.
 * @property {(line: number) => void} readLine - Queues a line to be read.
 * @property {() => void} nextUtterance - Plays the next queued utterance.
 * @property {(line: number) => void} readLineInternal - Builds the utterance queue.
 * @property {() => void} [updatePlayer] - Optional player refresh hook.
 */

/** @type {TtsManager} */
const ttsManager = {
  enabled: false,
  voicePreferenceList: ['Zira - English', 'English (USA,l03)', 'DEFAULT'],
  synth: window.speechSynthesis,
  voices: [],
  voice: null,
  lastLine: 0,

  ttsTimeout: null,
  queue: [],

  // Find Line
  /**
   * @param {number} line
   * @param {boolean} dontTryAgain
   */
  findLine: (line, dontTryAgain = false) => {
    let index = storyData.chapter.ficPageData.findIndex((item) => line === item.line);
    const ficData = storyData.chapter.ficPageData[index];

    // Complete 1
    if (ficData || dontTryAgain || !Array.isArray(storyData.chapter.ficPageData)) return ficData;

    // Try loop
    while (index < storyData.chapter.ficPageData.length) {
      // Read data
      if (storyData.chapter.ficPageData[index]) {
        const fcData = storyData.chapter.ficPageData[index];
        // Check line and use it
        if (fcData.line >= line) return fcData;
      }

      // Next
      index++;
    }

    // Complete 2
    return null;
  },

  // Start tts base
  startBase: () => {
    if (storyData.nc.base.right.find(':scope > #status #tts').length < 1) {
      // Buttons
      if (!storyData.tts.nav) {
        storyData.tts.nav = {};
      }
      storyData.tts.nav.play = new Icon('fas fa-play');
      storyData.tts.nav.stop = new Icon('fas fa-stop');

      // Prepare
      if (!storyData.chapter.nav) {
        storyData.chapter.nav = {};
      }
      storyData.chapter.nav.tts = TinyHtml.createFrom('div', {
        indexItem: 1,
        class: 'nav-item',
        id: 'tts',
      }).append(
        TinyHtml.createFrom('div', { id: 'tts-player' }).append(
          // Play
          TinyHtml.createFrom('a', {
            href: 'javascript:void(0)',
            class: 'text-white',
            title: 'Start TTS',
          })
            .on('click', () => ttsManager.enable())
            .append(storyData.tts.nav.play),
          // Stop
          TinyHtml.createFrom('a', {
            href: 'javascript:void(0)',
            class: 'text-white',
            title: 'Stop TTS',
          })
            .on('click', () => ttsManager.disable())
            .append(storyData.tts.nav.stop),
        ),
      );

      // Insert
      new TinyHtml(storyData.nc.base.right.find(':scope > #status')).prepend([
        // TTS
        storyData.chapter.nav.tts,
      ]);
    }
    if (typeof ttsManager.updatePlayer === 'function') {
      ttsManager.updatePlayer();
    }
    setInterval(() => {
      if (typeof ttsManager.updatePlayer === 'function') {
        ttsManager.updatePlayer();
      }
    }, 100);
  },

  // Enable and disable
  enable: () => {
    ttsManager.enabled = true;
    cacheChapterUpdater.data(storyData.chapter.line ?? 0);
  },
  disable: () => {
    ttsManager.enabled = false;
    audioUnlock.cancel('tts');
    ttsManager.synth.cancel();
  },

  // Init data
  init: () => {
    // Get voices
    ttsManager.voices = ttsManager.synth.getVoices();
    if (ttsManager.voices.length === 0) {
      ttsManager.synth.onvoiceschanged = ttsManager.init;
      return;
    }

    for (const preferenceString of ttsManager.voicePreferenceList) {
      for (const voice of ttsManager.voices) {
        const voiceName = voice.name.toLowerCase();
        const preference = preferenceString.toLowerCase();
        if (voiceName.indexOf(preference) !== -1) {
          // console.log("Found preferred voice " + voiceName);
          ttsManager.voice = voice;
          break;
        }
      }
      if (ttsManager.voice !== null) {
        break;
      }
    }

    if (ttsManager.voice === null) {
      // console.log("No preferred voice found, using first");
      ttsManager.voice = ttsManager.voices[0];
    }
  },

  // Read line
  /** @param {number} line */
  readLine(line) {
    // Nothing here
    if (!ttsManager.enabled) {
      return;
    }

    // Read line
    if (typeof line === 'number') {
      const ficData = ttsManager.findLine(line);
      if (ficData) {
        ttsManager.lastLine = ficData?.line || -1;
        ttsManager.lastLine++;
      } else {
        console.error('non-number passed to ttsManager.readLine in the new fic data');
        return;
      }
    } else {
      console.error('non-number passed to ttsManager.readLine');
      return;
    }
    ttsManager.synth.cancel();

    // Clear timeout
    if (ttsManager.ttsTimeout !== null) {
      clearTimeout(ttsManager.ttsTimeout);
      ttsManager.ttsTimeout = null;
    }

    // The browser blocks the speech until the visitor interacts with the page,
    // so the line is only scheduled once the audio is unlocked. The key makes
    // every new line replace the previous pending one.
    audioUnlock.whenReady(() => {
      // TTS was disabled while waiting for the interaction
      if (!ttsManager.enabled) return;

      // And add new timeout
      if (ttsManager.voice == null) {
        ttsManager.ttsTimeout = setTimeout(() => {
          ttsManager.readLine(line);
        }, 500);
        return;
      }

      ttsManager.ttsTimeout = setTimeout(() => {
        ttsManager.readLineInternal(line);
      }, 500);
    }, 'tts');
  },

  // Next Utterance
  nextUtterance() {
    if (ttsManager.queue.length == 0) {
      const ficData = ttsManager.findLine(ttsManager.lastLine);
      if (ficData) cacheChapterUpdater.setActiveItem(ficData.line, true);
      return;
    }
    let text = ttsManager.queue.shift() ?? '';
    let utterance = new SpeechSynthesisUtterance();
    utterance.voice = ttsManager.voice;
    utterance.text = text;
    utterance.onend = ttsManager.nextUtterance;
    ttsManager.synth.speak(utterance);
  },

  // Read line internal
  /** @param {number} line */
  readLineInternal(line) {
    // Get data
    const data = ttsManager.findLine(line)?.content || {};
    ttsManager.queue = [];

    // Read info
    if (data.info) {
      for (let key of Object.keys(data.info)) {
        const infoValue = data.info[key];
        if (typeof infoValue !== 'undefined') {
          ttsManager.queue.push('Info ' + key + ': ' + tinyLib.removeAiTags(infoValue));
        }
      }
    }

    // Add action
    let actionString = data.type ?? '';
    if (data.flashback) actionString += ' flashback';
    if (data.character) actionString += `: ${data.character}`;

    ttsManager.queue.push(actionString);
    ttsManager.queue.push(tinyLib.removeAiTags(data.value ?? ''));

    // Execute voice
    ttsManager.nextUtterance();
  },
};

ttsManager.init();

export default ttsManager;
