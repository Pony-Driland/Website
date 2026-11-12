import TinyHtml from 'tiny-essentials/libs/html/TinyHtml';
import TinyHtmlElems from 'tiny-essentials/libs/html/TinyHtmlElems';
import TinyAfterScrollWatcher from 'tiny-essentials/libs/html/scroll/TinyAfterScrollWatcher';

import { tinyLs, gtag } from '../important.mjs';
import tinyLib from '../files/tinyLib.mjs';
import { storyData } from '../files/chapters.mjs';
import storyCfg from '../chapters/config.mjs';
import ttsManager from './tts/tts.mjs';
import musicManager from './music/index.mjs';
import { Tooltip } from '../modules/TinyBootstrap.mjs';
import { body, tinyWin } from '../html/query.mjs';
import { markdownBase } from '../html/base.mjs';
import { musicApp } from './music/html.mjs';

const { Icon } = TinyHtmlElems;

/**
 * Renders the chapter reader: builds the page list, restores the reading
 * position and lazily loads the chapter content while scrolling.
 *
 * @module chapter_manager/updater
 */

/**
 * A single sound effect tracked by the chapter reader.
 *
 * @typedef {Object} SoundCacheEntry
 * @property {boolean} [playing] - Whether the sound is currently playing.
 * @property {boolean} [instant] - Whether the running sound was started in instant mode.
 * @property {ChapterSoundConfig} [value] - The sound configuration attached to the entry.
 */

/**
 * Chapter reader cache and public API.
 *
 * @typedef {Object} ChapterUpdater
 * @property {Record<string, SoundCacheEntry>} soundCache - Sound effects by file name.
 * @property {Record<number, { line: number, file: string, value: ChapterSoundConfig }[]>} [soundTimeline] - `playEffect` entries of each chapter, sorted by line.
 * @property {boolean} [locked] - Prevents re-entrant scroll handling.
 * @property {ReturnType<typeof setTimeout>} [timeoutChecker] - Pending scroll debounce timer.
 * @property {(item: number, scrollIntoView?: boolean) => void} setActiveItem - Selects a line.
 * @property {() => void} scrollData - Applies the state of the current line.
 * @property {(lastPage: number) => void} data - Renders the given line.
 * @property {(line: number) => Record<string, ChapterSoundConfig>} getSoundState - Resolves the sounds of a line.
 * @property {(soundState: Record<string, ChapterSoundConfig>) => void} applySounds - Applies a resolved sound state.
 * @property {() => void} resetSounds - Forgets every tracked sound.
 */

// Prepare Cache
/** @type {ChapterUpdater} */
const cacheChapterUpdater = /** @type {ChapterUpdater} */ ({ soundCache: {}, soundTimeline: {} });

/**
 * @param {number} item - Line to activate.
 * @param {boolean} [scrollIntoView] - Whether to scroll the line into view.
 */
cacheChapterUpdater.setActiveItem = (item, scrollIntoView = false) => {
  if (cacheChapterUpdater.locked) {
    return;
  }

  // Validator
  if (storyData.chapter.selected > 0) {
    let selectedItem = Number(item);
    let currentLine = storyData.chapter.line ?? 0;

    if (currentLine == selectedItem) {
      return;
    }

    let element = document.querySelector(`tr[line="${selectedItem}"]`);
    if (element == null) {
      // Todo: handle correctly
      if (selectedItem > currentLine) {
        /** @type {HTMLElement|null} */
        const nextPage = document.querySelector('a[title="Go to next page"]');
        if (nextPage) nextPage.click();
      } else if (selectedItem < currentLine) {
        /** @type {HTMLElement|null} */
        const prevPage = document.querySelector('a[title="Go to previous page"]');
        if (prevPage) prevPage.click();
      }
      return;
    }

    if (scrollIntoView) {
      cacheChapterUpdater.locked = true;
      winScroller.doAfterScroll(() => {
        cacheChapterUpdater.locked = false;
      });

      /** @type {Element|null} */
      let scrollTarget = document.querySelector(`tr[line="${selectedItem - 1}"]`);
      if (scrollTarget == null) {
        scrollTarget = /** @type {Element} */ (markdownBase.get(0));
      }
      if (scrollTarget) scrollTarget.scrollIntoView();
    }

    // Complete
    cacheChapterUpdater.data(selectedItem);
  }
};

// Read Data on Scroll
const winScroller = new TinyAfterScrollWatcher(window);
tinyWin.on(['resize', 'scroll'], () => {
  if (ttsManager.enabled) {
    return;
  }
  // Validator
  if (storyData.chapter.selected > 0) {
    // Selected Item
    let selectedItem = 0;

    // Normal Mode
    if (!TinyHtml.isPageBottom()) {
      const mdNavbar = TinyHtml.query('#md-navbar');
      // Detect Selected Item
      for (const item in storyData.chapter.html) {
        const tinyItem = storyData.chapter.html[item];
        if (
          mdNavbar &&
          TinyHtml.isInViewport(tinyItem) &&
          !TinyHtml.isCollWith(tinyItem, mdNavbar)
        ) {
          selectedItem = Number(item);
          break;
        }
      }
    }

    // Bottom Page
    else {
      for (const item in storyData.chapter.html) {
        selectedItem = Number(item);
      }
    }

    // Complete
    cacheChapterUpdater.setActiveItem(selectedItem);
  }
});

cacheChapterUpdater.scrollData = () => {
  // Set Playlist
  if (Array.isArray(musicApp.playlist)) {
    musicManager.disable(false);
  } else {
    musicApp.playlist = [];
  }

  // Exist Playlist
  if (
    !storyData.chapter.blockLineSave &&
    !musicApp.disabled &&
    Array.isArray(musicApp.playlist) &&
    musicApp.playlist.length > 0
  ) {
    musicManager.startPlaylist();
  }

  // Nope
  else {
    musicManager.stopPlaylist();
  }

  // Google
  if (!storyData.chapter.blockLineSave && typeof storyCfg.gtag === 'string' && gtag) {
    gtag('event', 'chapter', {
      event_chapter: `Chapter ${storyData.chapter.selected}`,
      event_category: 'line',
      event_line: storyData.chapter.line,
    });
  }

  // Remove All Weather
  const removeAllWeather = () => {
    storyData.sfx['heavy-rain'].hide();
    storyData.sfx['heavy-rain-little-thunder'].hide();
    body.removeClass('raining-sky', 'thunder-effect');
  };

  // Set Weather
  const oldWeather = storyData.chapter.weather;
  storyData.chapter.weather = storyData.chapter.nextWeather;

  // Change Sound
  if (oldWeather !== storyData.chapter.weather) {
    removeAllWeather();
    if (!storyData.chapter.blockLineSave) {
      if (storyData.chapter.weather === 'heavyrain') {
        storyData.sfx['heavy-rain'].show();
        // body.addClass('raining-sky');
      } else if (storyData.chapter.weather === 'bolt') {
        storyData.sfx['heavy-rain-little-thunder'].show();
        // body.addClass('raining-sky', 'thunder-effect');
      }
    }
  }

  // Manager Other Sounds
  cacheChapterUpdater.applySounds(cacheChapterUpdater.getSoundState(storyData.chapter.line ?? 0));
};

/**
 * Collects every `playEffect` of a chapter, ordered by line.
 *
 * @param {number} chapter - Chapter number.
 * @returns {{ line: number, file: string, value: ChapterSoundConfig }[]} Timeline entries.
 */
const getSoundTimeline = (chapter) => {
  const cached = cacheChapterUpdater.soundTimeline?.[chapter];
  if (cached) return cached;

  /** @type {{ line: number, file: string, value: ChapterSoundConfig }[]} */
  const timeline = [];
  const data = storyData.data[chapter];

  if (data) {
    for (const index in data) {
      const effect = data[index].set?.playEffect;
      if (!effect || typeof effect.file !== 'string' || effect.file.length < 1) continue;
      timeline.push({ line: Number(index) + 1, file: effect.file, value: effect });
    }

    timeline.sort((a, b) => a.line - b.line);
  }

  if (!cacheChapterUpdater.soundTimeline) cacheChapterUpdater.soundTimeline = {};
  cacheChapterUpdater.soundTimeline[chapter] = timeline;
  return timeline;
};

/**
 * Rebuilds the sound state of a line by replaying every `playEffect` from the
 * beginning of the chapter.
 *
 * The state is derived from the reading position instead of being mutated while
 * scrolling, so a sound that has no explicit "off" line in the story is still
 * stopped as soon as the reader goes back before the line that started it.
 *
 * @param {number} line - Last line to consider.
 * @returns {Record<string, ChapterSoundConfig>} Sounds indexed by file name.
 */
cacheChapterUpdater.getSoundState = (line) => {
  /** @type {Record<string, ChapterSoundConfig>} */
  const state = {};
  const timeline = getSoundTimeline(storyData.chapter.selected);

  for (const entry of timeline) {
    if (entry.line > line) break;
    state[entry.file] = entry.value;
  }

  return state;
};

/**
 * Applies a resolved sound state, starting and stopping only the difference.
 *
 * @param {Record<string, ChapterSoundConfig>} state - Desired sound state.
 * @returns {void}
 */
cacheChapterUpdater.applySounds = (state) => {
  // Search results and other temporary renders must not touch the audio
  if (storyData.chapter.blockLineSave) return;

  // Start or keep the sounds of the current state
  for (const file in state) {
    const value = state[file];
    const sound = storyData.sfx[file];
    if (!sound) continue;

    const cache = (cacheChapterUpdater.soundCache[file] ??= { playing: false });
    cache.value = value;

    const shouldPlay = value.enabled === true;
    if (shouldPlay === Boolean(cache.playing)) continue;

    cache.playing = shouldPlay;
    cache.instant = Boolean(value.instant);

    if (shouldPlay) {
      console.log(`[${file}] Playing...`);
      if (value.instant) {
        sound.play();
      } else {
        sound.show();
      }
    } else {
      console.log(`[${file}] Stopping...`);
      if (value.instant) {
        sound.stop();
      } else {
        sound.hide();
      }
    }
  }

  // Stop everything that is not part of the current state anymore
  for (const file in cacheChapterUpdater.soundCache) {
    if (state[file]) continue;

    const cache = cacheChapterUpdater.soundCache[file];
    if (!cache.playing) continue;

    cache.playing = false;

    const sound = storyData.sfx[file];
    if (!sound) continue;

    console.log(`[${file}] Stopping...`);
    if (cache.instant) {
      sound.stop();
    } else {
      sound.hide();
    }
  }
};

/**
 * Forgets every tracked sound. Must be called whenever the audio is stopped
 * behind the reader's back (leaving the chapter, for example), so the next
 * render starts the sounds again from scratch.
 *
 * @returns {void}
 */
cacheChapterUpdater.resetSounds = () => {
  cacheChapterUpdater.soundCache = {};
  cacheChapterUpdater.soundTimeline = {};
};

/**
 * Renders the given line.
 *
 * @param {number} lastPage - Line that must be rendered.
 * @returns {void}
 */
cacheChapterUpdater.data = (lastPage) => {
  if (storyData.chapter.selected > 0) {
    TinyHtml.queryAll('.selected-tr').removeClass('selected-tr');

    let element = document.querySelector(`tr[line="${lastPage}"]`);
    if (element) {
      element.classList.add('selected-tr');
    }

    // Call text to speech manager - only reads if it's been enabled
    ttsManager.startBase();
    if (storyData.chapter.ficPageData) {
      const tinyData = storyData.chapter.ficPageData.find(
        (ficData) => ficData.line === Number(lastPage),
      );
      const ttsIndex = tinyData ? tinyData.line : -1;
      if (ttsIndex > -1) ttsManager.readLine(ttsIndex);
    }

    // Update Data Cache
    musicManager.startBase();
    storyData.chapter.line = lastPage;
    const data = storyData.data[storyData.chapter.selected];
    if (!storyData.chapter.blockLineSave) {
      for (const i in data) {
        // Get Data
        if (data[i].set) {
          for (const item in data[i].set) {
            const setter = chapterSet[item];
            if (typeof setter === 'function') {
              setter(
                /** @type {Record<string, never>} */ (data[i].set)[item],
                Number(i) < lastPage,
              );
            }
          }
        }
      }
    }

    // Update Checker Data
    if (typeof cacheChapterUpdater.timeoutChecker !== 'undefined') {
      clearTimeout(cacheChapterUpdater.timeoutChecker);
      delete cacheChapterUpdater.timeoutChecker;
    }

    cacheChapterUpdater.timeoutChecker = setTimeout(() => {
      cacheChapterUpdater.scrollData();
    }, 1000);

    // Add Bookmark
    if (storyData.nc.base.right.find(':scope > #status #bookmark').length < 1) {
      // Insert
      if (!storyData.chapter.nav) {
        storyData.chapter.nav = {};
      }
      storyData.chapter.nav.bookmark = TinyHtml.createFrom('a', {
        indexItem: 2,
        class: 'nav-item nav-link',
        id: 'bookmark',
      });
      new TinyHtml(storyData.nc.base.right.find(':scope > #status')).prepend(
        storyData.chapter.nav.bookmark,
      );

      // Icon
      storyData.chapter.nav.bookmark.setStyle({
        cursor: 'pointer',
      });
      storyData.chapter.nav.bookmark
        .setAttr('title', 'Bookmark')
        .append(new Icon('fas fa-bookmark'));
      Tooltip(storyData.chapter.nav.bookmark);

      // Action
      const bookInput = TinyHtml.createFrom('input', {
        type: 'text',
        class: 'form-control text-center',
      });
      storyData.chapter.nav.bookmark.on('click', () => {
        tinyLib.modal({
          title: TinyHtml.createFrom('span').setText('Bookmark'),
          body: TinyHtml.createFrom('center').append(
            TinyHtml.createFrom('h5').setText(
              `Save this URL to your favorites to re-read the story on any device`,
            ),
            bookInput
              .addProp('readonly')
              .setVal(
                `${location.protocol}//${location.host}/?path=read-fic&chapter=${storyData.chapter.selected}&line=${storyData.chapter.line}`,
              )
              .on('click', () => bookInput.select()),
          ),
          dialog: 'modal-lg',
        });
      });
    }

    const bookmark = storyData.chapter.nav.bookmark;
    if (bookmark) {
      if (!storyData.chapter.blockLineSave) {
        bookmark.removeClass('disabled');
        bookmark.removeProp('disabled');
      } else {
        bookmark.addClass('disabled');
        bookmark.addProp('disabled');
      }
    }

    // Sortable  #status
    storyData.nc.base.right.forEach((tinyThis) => {
      new TinyHtml(
        tinyThis.find('#status > a').sort((a, b) => {
          return (
            Number(new TinyHtml(a).attr('indexitem')) - Number(new TinyHtml(b).attr('indexitem'))
          );
        }),
      ).appendTo(tinyThis.find('#status'));
    });

    // Update Title
    if (!storyData.chapter.blockLineSave) {
      tinyLs.setItem('bookmark' + storyData.chapter.selected, storyData.chapter.line);
      storyData.chapter.bookmark[storyData.chapter.selected] = storyData.chapter.line;
    }

    const infoInsert = `Chapter ${storyData.chapter.selected} / Line ${storyData.chapter.line}`;
    TinyHtml.query('#fic-chapter')?.setText(infoInsert);
    document.title = `${storyData.title} - ${infoInsert}`;
  }
};

/** @type {Record<string, (value: never, actionFromNow?: boolean) => void>} */
const chapterSet = {
  /**
   * @param {string} value - Playlist key.
   * @param {boolean} [actionFromNow] - Whether the action happens now.
   */
  playlistPlay: (value, actionFromNow = false) => {
    if (actionFromNow) {
      // Set Playlist
      const playlist = storyCfg.playlist?.[value];
      if (Array.isArray(playlist)) {
        musicApp.value = value;
        musicApp.playlist = playlist;
      } else {
        musicApp.value = null;
        musicApp.playlist = [];
      }
    }
  },

  /**
   * @param {number} value - Day number.
   * @param {boolean} [actionFromNow] - Whether the action happens now.
   */
  day: (value, actionFromNow = false) => {
    if (actionFromNow) {
      // Add Item Base
      if (storyData.nc.base.right.find(':scope > #status #day').length < 1) {
        if (!storyData.chapter.nav) {
          storyData.chapter.nav = {};
        }
        storyData.chapter.nav.day = TinyHtml.createFrom('a', {
          indexItem: 5,
          class: 'nav-item nav-link',
          id: 'day',
        });
        new TinyHtml(storyData.nc.base.right.find(':scope > #status')).prepend(
          storyData.chapter.nav.day,
        );
      }

      new TinyHtml(storyData.nc.base.right.find(':scope > #status #day')).setText(`Day: ${value}`);
    }
  },

  /**
   * @param {string} value - Day/night cycle key.
   * @param {boolean} [actionFromNow] - Whether the action happens now.
   */
  dayNightCycle: (value, actionFromNow = false) => {
    if (actionFromNow) {
      body
        ?.removeClass(`fic-daycicle-morning`)
        .removeClass(`fic-daycicle-evening`)
        .removeClass(`fic-daycicle-night`)
        .removeClass(`fic-daycicle-lateAtNight`)
        .addClass(`fic-daycicle-${value}`);

      // Add Item Base
      if (storyData.nc.base.right.find(':scope > #status #dayNightCycle').length < 1) {
        if (!storyData.chapter.nav) {
          storyData.chapter.nav = {};
        }
        storyData.chapter.nav.dayNightCycle = TinyHtml.createFrom('a', {
          indexItem: 4,
          class: 'nav-item nav-link',
          id: 'dayNightCycle',
        });
        new TinyHtml(storyData.nc.base.right.find(':scope > #status')).prepend(
          storyData.chapter.nav.dayNightCycle,
        );
      }

      // Types
      /** @type {Record<string, { icon: string, title: string }>} */
      const types = {
        morning: { icon: 'fas fa-sun', title: 'Morning' },
        evening: { icon: 'fas fa-cloud-sun', title: 'Evening' },
        night: { icon: 'fas fa-moon', title: 'Night' },
        lateAtNight: { icon: 'fas fa-bullseye', title: 'Late at Night' },
      };

      const obj = new TinyHtml(storyData.nc.base.right.find(':scope > #status #dayNightCycle'));
      obj.empty();
      if (types[value]) {
        const newTitle = types[value].title;
        if (!obj.data('bs-tooltip-data')) {
          obj.setAttr('title', newTitle);
          obj.setData('bs-tooltip-data', newTitle);
          Tooltip(obj);
        } else {
          obj
            .setData('bs-tooltip-data', newTitle)
            .data('BootstrapToolTip')
            .setContent({ '.tooltip-inner': newTitle });
        }
        obj.removeAttr('title').append(new Icon(types[value].icon));
      }
    }
  },

  /**
   * @param {string} value - Weather key.
   * @param {boolean} [actionFromNow] - Whether the action happens now.
   */
  weather: (value, actionFromNow = false) => {
    if (actionFromNow) {
      // Add Item Base
      if (storyData.nc.base.right.find(':scope > #status #weather').length < 1) {
        if (!storyData.chapter.nav) {
          storyData.chapter.nav = {};
        }
        storyData.chapter.nav.weather = TinyHtml.createFrom('a', {
          indexItem: 3,
          class: 'nav-item nav-link',
          id: 'weather',
        });
        new TinyHtml(storyData.nc.base.right.find(':scope > #status')).prepend(
          storyData.chapter.nav.weather,
        );
      }

      // Types
      /** @type {Record<string, { icon: string, title: string }>} */
      const types = {
        rain: { icon: 'fas fa-cloud-rain', title: 'Rain' },
        bolt: { icon: 'fas fa-bolt', title: 'Thunderbolt' },
        heavyrain: { icon: 'fas fa-cloud-showers-heavy', title: 'Heavy Rain' },
        snow: { icon: 'fas fa-snowflake', title: 'Snow' },
      };

      storyData.chapter.nextWeather = value;
      const obj = new TinyHtml(storyData.nc.base.right.find(':scope > #status #weather'));
      obj.empty();
      if (types[value]) {
        obj.setAttr('title', types[value].title).append(new Icon(types[value].icon));
        Tooltip(obj);
        obj.removeAttr('title');
      }
    }
  },

  /**
   * @param {string} value - Location name.
   * @param {boolean} [actionFromNow] - Whether the action happens now.
   */
  where: (value, actionFromNow = false) => {
    if (actionFromNow) {
      // Add Item Base
      if (storyData.nc.base.right.find(':scope > #status #where').length < 1) {
        if (!storyData.chapter.nav) {
          storyData.chapter.nav = {};
        }
        storyData.chapter.nav.where = TinyHtml.createFrom('a', {
          indexItem: 6,
          class: 'nav-item nav-link',
          id: 'where',
        });
        new TinyHtml(storyData.nc.base.right.find(':scope > #status')).prepend(
          storyData.chapter.nav.where,
        );
      }

      new TinyHtml(storyData.nc.base.right.find(':scope > #status #where')).setText(
        `Location: ${value}`,
      );
    }
  },
};

export default cacheChapterUpdater;
