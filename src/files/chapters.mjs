import objHash from 'object-hash';

import { isJsonObject } from 'tiny-essentials/basics/objChecker';
import { fetchJson, fetchText } from 'tiny-essentials/basics/html';
import { toTitleCase } from 'tiny-essentials/basics/text';
import { alert } from 'tiny-essentials/webTemplates/bootstrap/5.3/html/BootstrapDialogs';

import tinyLib from './tinyLib.mjs';
import storyCfg from '../chapters/config.mjs';
import { connStore, ficCache, loaderScreen, tinyLs } from '../important.mjs';

/**
 * Loads and caches the chapter list, the readme and the per-chapter progress.
 *
 * Every getter is memoized; call `start()` once the DOM is ready to bootstrap
 * the whole structure.
 *
 * @module files/chapters
 */

/**
 * A single character entry collected while loading the chapters.
 *
 * @typedef {Object} StoryCharacterEntry
 * @property {string} value - Display name.
 * @property {string} id - Slug used in the DOM.
 * @property {number} count - Total number of lines.
 * @property {Record<string | number, number>} chapter - Lines per chapter.
 */

/**
 * A single word entry collected while loading the chapters.
 *
 * @typedef {Object} StoryWordEntry
 * @property {string} value - The word.
 * @property {number} count - Number of occurrences.
 */

/**
 * Loaded story data and bootstrap helper.
 *
 * @type {StoryData}
 */
export const storyData = {
  // Info
  title: storyCfg.title,
  description: storyCfg.description,

  // Counter
  count: 0,

  // Main Lang
  lang: {
    active: storyCfg.defaultLang,
    default: storyCfg.defaultLang,
    list: storyCfg.lang,
  },

  // Chapters
  readFic: false,
  chapter: {
    amount: storyCfg.chapters ?? 0,
    selected: 0,
    bookmark: {},
    html: {},
    ficPageData: [],
    nav: {},
  },

  // Chapter Data
  data: {},
  lettersCount: { total: 0 },
  wordsCount: { total: 0 },
  characters: { data: [], total: 0 },
  words: [],
  isNew: {},
  globalIsNew: 0,
  nc: /** @type {StoryNavbar} */ ({ base: {}, item: {} }),
  tts: { enabled: false },
  sfx: {},

  /**
   * Boots the whole story: loads every chapter, builds the caches and then
   * invokes `startApp`.
   *
   * @param {(done: () => void, readme: string) => void} startApp - UI bootstrap callback.
   * @param {(err: Error) => void} [failApp] - Error handler.
   * @returns {Promise<void>} Resolves once the bootstrap finishes.
   */
  start: async (
    startApp,
    failApp = (err) => {
      console.error(err);
      if (typeof err.message === 'string') {
        alert(err.message);
      }
    },
  ) => {
    if (!tinyLs.localStorageExists()) return failApp(new Error('Local Storage API not found!'));
    if (typeof startApp !== 'function') return failApp(new Error('Start App not found!'));

    // Start App
    loaderScreen.start('Loading readme...');

    // Read Data Base
    const readme = await fetch('/readme.html' + window.fileVersion, {
      method: 'GET',
    })
      .then((res) => res.text())
      .catch((err) => {
        console.log(`README.md failed during the load!`);
        loaderScreen.stop();
        failApp(err);
      });
    if (!readme) throw new Error('No readme data to start the app.');

    // Load Data
    storyData.isNew = {};
    for (let i = 0; i < storyData.chapter.amount; i++) {
      // Data
      const chapter = i + 1;
      loaderScreen.update(`Loading chapter ${chapter}...`);
      console.log(`Loading Chapter ${chapter}...`);
      const chapterUrl =
        '/chapters/' + storyData.lang.active + '/' + chapter + '.json' + window.fileVersion;
      console.log(chapterUrl);
      const data = await fetchJson(chapterUrl).catch((err) => {
        console.log(`Chapter ${chapter} failed during the load!`);
        loaderScreen.stop();
        failApp(err);
      });
      if (!data) throw new Error('No chapter data found.');

      // Insert Words Count
      const wordCache = [];
      let letters = 0;
      let words = 0;
      for (const item in data) {
        // Character Counter
        if (typeof data[item].character === 'string' && data[item].character.length > 0) {
          const character = toTitleCase(data[item].character);
          const characterLower = data[item].character.toLowerCase();

          let newData = storyData.characters.data.find((char) => char.value === character);
          if (!newData) {
            newData = {
              value: character,
              id: characterLower.replace(/ /g, '-'),
              count: 0,
              chapter: {},
            };
            storyData.characters.data.push(newData);
          }

          if (typeof newData.chapter[chapter] !== 'number') {
            newData.chapter[chapter] = 0;
          }
          newData.chapter[chapter]++;

          newData.count++;
          storyData.characters.total++;
        }

        // Get Text
        const text = data[item].value.replace(/(\r\n|\n|\r)/gm, '').trim();
        const textSplit = text.split(' ');

        // Check Text
        for (const item2 in textSplit) {
          // Filter
          const text = tinyLib.removeAiTags(
            toTitleCase(textSplit[item2].replace(/[^a-zA-Z]+/g, '')),
          );
          if (isNaN(Number(text)) && text.length > 0) {
            // Count Data
            if (!Array.isArray(storyCfg.wordCountBlacklick)) {
              storyCfg.wordCountBlacklick = [];
            }
            if (storyCfg.wordCountBlacklick.indexOf(text) < 0) {
              let wordData = storyData.words.find((word) => word.value === text);
              if (!wordData) {
                wordData = { count: 0, value: text };
                storyData.words.push(wordData);
              }
              wordData.count++;
            }

            if (wordCache.indexOf(text) < 0) {
              wordCache.push(text);
              words++;
            }
          }
        }

        letters += text.replace(/ |\<ai\>|\<\/ai\>/gm, '').length;
      }

      // Order Words
      storyData.words.sort((a, b) => {
        return b.count - a.count;
      });

      storyData.characters.data.sort((a, b) => {
        return b.count - a.count;
      });

      // Insert Data
      storyData.data[chapter] = /** @type {StoryChapterData} */ (data);
      storyData.lettersCount[chapter] = letters;
      storyData.lettersCount.total += letters;
      storyData.wordsCount[chapter] = words;
      storyData.wordsCount.total += words;
      storyData.chapter.bookmark[chapter] = Number(tinyLs.getItem('bookmark' + chapter));
      if (
        isNaN(storyData.chapter.bookmark[chapter]) ||
        !isFinite(storyData.chapter.bookmark[chapter]) ||
        storyData.chapter.bookmark[chapter] < 1
      ) {
        storyData.chapter.bookmark[chapter] = 1;
      }

      const isNew = !tinyLs.getItem('chapter' + chapter + 'MD5');
      let isUpdate = false;
      if (!isNew) {
        isUpdate = objHash(storyData.data[chapter]) !== tinyLs.getItem('chapter' + chapter + 'MD5');
      }

      if (isNew) {
        storyData.isNew[chapter] = 2;
      } else if (isUpdate) {
        storyData.isNew[chapter] = 1;
      } else {
        storyData.isNew[chapter] = 0;
      }

      console.log(`Chapter ${chapter} loaded!`);

      // Complete
      storyData.count = (storyData.count ?? 0) + 1;
    }

    loaderScreen.update(`Loading character content...`);
    ficCache.charListPrompts = /** @type {Record<string, string>[]} */ (
      await fetchJson('/prompts/prompts.json')
    );
    ficCache.charPrompts = await fetchText('/prompts/prompts.txt');

    // Ai page database
    /** @type {{ room: Record<string, import('jsstore').IColumnOption>, hash: Record<string, import('jsstore').IColumnOption>, tokens: Record<string, import('jsstore').IColumnOption>, data: Record<string, import('jsstore').IColumnOption>, customList?: Record<string, import('jsstore').IColumnOption> }} */
    const aiPage = { room: {}, hash: {}, tokens: {}, data: {} };
    aiPage.room = {
      prompt: { dataType: 'string' },
      firstDialogue: { dataType: 'string' },
      systemInstruction: { dataType: 'string' },
      rpgSchema: { dataType: 'object' },
      rpgData: { dataType: 'object' },
      rpgPrivateData: { dataType: 'object' },
      maxOutputTokens: { dataType: 'number' },
      temperature: { dataType: 'number' },
      topP: { dataType: 'number' },
      topK: { dataType: 'number' },
      presencePenalty: { dataType: 'number' },
      frequencyPenalty: { dataType: 'number' },
    };

    for (const item in aiPage.room) {
      aiPage.hash[item] = { dataType: 'string' };
      aiPage.tokens[item] = { dataType: 'number' };
    }

    aiPage.hash.file = { dataType: 'string' };
    aiPage.tokens.file = { dataType: 'number' };

    aiPage.room.session = { primaryKey: true, dataType: 'string' };
    aiPage.room.model = { dataType: 'string' };
    aiPage.hash.session = aiPage.room.session;
    aiPage.tokens.session = aiPage.room.session;

    aiPage.data = {
      session: { notNull: true, dataType: 'string' },
      msg_id: { primaryKey: true, dataType: 'string' },
      id: { notNull: true, dataType: 'number' },
      tokens: { notNull: true, dataType: 'object' },
      hash: { notNull: true, dataType: 'string' },
      data: { dataType: 'object' },
    };

    aiPage.customList = {
      session: aiPage.room.session,
      data: { dataType: 'array' },
    };

    let dbError = false;
    loaderScreen.update('Loading local database...');
    await connStore
      .initDb({
        name: 'pony-driland',
        tables: [
          // Ai page
          {
            name: 'aiSessionsRoom',
            columns: aiPage.room,
          },
          {
            name: 'aiSessionsHash',
            columns: aiPage.hash,
          },
          {
            name: 'aiSessionsTokens',
            columns: aiPage.tokens,
          },
          {
            name: 'aiSessionsCustomList',
            columns: aiPage.customList,
          },
          {
            name: 'aiSessionsData',
            columns: aiPage.data,
          },
        ],
      })
      .catch((err) => {
        dbError = true;
        alert(err.message);
        console.error(err);
      });

    // Complete
    if (dbError) return;
    delete storyData.count;
    delete storyData.start;
    console.log('App Started!');
    console.log('Loading UI...');

    loaderScreen.update('Starting website...');
    if (!tinyLs.getString('user-country')) {
      const userCountry = await fetch('https://api.country.is/')
        .then((res) => res.json())
        .catch(console.error);
      if (isJsonObject(userCountry)) tinyLs.setString('user-country', String(userCountry.country));
    }

    // Start app now
    startApp(() => {
      loaderScreen.stop();
      console.log('UI loaded!');
    }, readme);
  },
};
