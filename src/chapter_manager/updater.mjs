import { TinyHtml, TinyAfterScrollWatcher } from 'tiny-essentials';

import { tinyLs, gtag } from '../important.mjs';
import tinyLib from '../files/tinyLib.mjs';
import { storyData } from '../files/chapters.mjs';
import storyCfg from '../chapters/config.mjs';
import ttsManager from './tts/tts.mjs';
import musicManager from './music/index.mjs';
import { Tooltip } from '../modules/TinyBootstrap.mjs';

// Prepare Cache
const cacheChapterUpdater = { soundCache: {} };

cacheChapterUpdater.setActiveItem = (item, scrollIntoView = false) => {
  if (cacheChapterUpdater.locked) {
    return;
  }

  // Validator
  if (storyData.chapter.selected > 0) {
    let selectedItem = Number(item);
    let currentLine = storyData.chapter.line;

    if (currentLine == selectedItem) {
      return;
    }

    let element = document.querySelector(`tr[line="${selectedItem}"]`);
    if (element == null) {
      // Todo: handle correctly
      if (selectedItem > currentLine) {
        document.querySelector('a[title="Go to next page"]').click();
      } else if (selectedItem < currentLine) {
        document.querySelector('a[title="Go to previous page"]').click();
      }
      return;
    }

    if (scrollIntoView) {
      cacheChapterUpdater.locked = true;
      winScroller.doAfterScroll(() => {
        cacheChapterUpdater.locked = false;
      });

      let scrollTarget = document.querySelector(`tr[line="${selectedItem - 1}"]`);
      if (scrollTarget == null) {
        scrollTarget = document.getElementById('markdown-read');
      }
      scrollTarget.scrollIntoView();
    }

    // Complete
    cacheChapterUpdater.data(selectedItem);
  }
};

// Read Data on Scroll
const winScroller = new TinyAfterScrollWatcher(window);
new TinyHtml(window).on(['resize', 'scroll'], () => {
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
        if (TinyHtml.isInViewport(tinyItem) && !TinyHtml.isCollWith(tinyItem, mdNavbar)) {
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
  if (Array.isArray(storyData.music.playlist)) {
    musicManager.disable(false);
  } else {
    storyData.music.playlist = [];
  }

  // Exist Playlist
  if (
    !storyData.chapter.blockLineSave &&
    !storyData.music.disabled &&
    Array.isArray(storyData.music.playlist) &&
    storyData.music.playlist.length > 0
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
      } else if (storyData.chapter.weather === 'bolt') {
        storyData.sfx['heavy-rain-little-thunder'].show();
      }
    }
  }

  // Manager Other Sounds
  for (const file in cacheChapterUpdater.soundCache) {
    // Value Data
    const value = cacheChapterUpdater.soundCache[file].value;

    if (cacheChapterUpdater.soundCache[value.file].waiting) {
      // Progress
      cacheChapterUpdater.soundCache[value.file].waiting = false;

      // Play
      if (
        !storyData.chapter.blockLineSave &&
        value.enabled &&
        !cacheChapterUpdater.soundCache[value.file].playing
      ) {
        console.log(`[${value.file}] Playing...`);
        cacheChapterUpdater.soundCache[value.file].playing = true;

        if (!value.instant) {
          storyData.sfx[value.file].show();
        } else {
          storyData.sfx[value.file].play();
        }
      }

      // Stop
      else if (!value.enabled && cacheChapterUpdater.soundCache[value.file].playing) {
        console.log(`[${value.file}] Stopping...`);
        cacheChapterUpdater.soundCache[value.file].playing = false;

        if (!value.instant) {
          storyData.sfx[value.file].hide();
        } else {
          storyData.sfx[value.file].stop();
        }
      }
    }
  }
};

// Update Cache
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
      const ttsIndex = tinyData.line || -1;
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
            if (typeof chapterSet[item] === 'function') {
              chapterSet[item](data[i].set[item], i < lastPage);
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
        .append(tinyLib.icon('fas fa-bookmark'));
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

    if (!storyData.chapter.blockLineSave) {
      storyData.chapter.nav.bookmark.removeClass('disabled');
      storyData.chapter.nav.bookmark.removeProp('disabled');
    } else {
      storyData.chapter.nav.bookmark.addClass('disabled');
      storyData.chapter.nav.bookmark.addProp('disabled');
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
    TinyHtml.query('#fic-chapter').setText(infoInsert);
    document.title = `${storyData.title} - ${infoInsert}`;
  }
};

// Set Actions
const chapterSet = {
  playEffect: (value, actionFromNow = false) => {
    if (actionFromNow && value && value.file && storyData.sfx[value.file]) {
      if (!cacheChapterUpdater.soundCache[value.file]) {
        cacheChapterUpdater.soundCache[value.file] = { playing: false };
      }

      cacheChapterUpdater.soundCache[value.file].waiting = true;
      cacheChapterUpdater.soundCache[value.file].value = value;
    }
  },

  playlistPlay: (value, actionFromNow = false) => {
    if (actionFromNow) {
      // Set Playlist
      const playlist = storyCfg.playlist[value];
      if (Array.isArray(playlist)) {
        storyData.music.value = value;
        storyData.music.playlist = playlist;
      } else {
        storyData.music.value = null;
        storyData.music.playlist = [];
      }
    }
  },

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

  dayNightCycle: (value, actionFromNow = false) => {
    if (actionFromNow) {
      TinyHtml.query('body')
        .removeClass(`fic-daycicle-morning`)
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
        obj.removeAttr('title').append(tinyLib.icon(types[value].icon));
      }
    }
  },

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
        obj.setAttr('title', types[value].title).append(tinyLib.icon(types[value].icon));
        Tooltip(obj);
        obj.removeAttr('title');
      }
    }
  },

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
