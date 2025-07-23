// Prepare Cache
const cacheChapterUpdater = { soundCache: {} };

cacheChapterUpdater.setActiveItem = function (item, scrollIntoView = false) {
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
$(window).on('resize scroll', function () {
  if (ttsManager.enabled) {
    return;
  }
  // Validator
  if (storyData.chapter.selected > 0) {
    // Selected Item
    let selectedItem = 0;

    // Normal Mode
    if (!TinyHtml.isPageBottom()) {
      const mdNavbar = $('#md-navbar').get(0);
      // Detect Selected Item
      for (const item in storyData.chapter.html) {
        const tinyItem = storyData.chapter.html[item].get(0);
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

cacheChapterUpdater.scrollData = function () {
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
  const removeAllWeather = function () {
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
cacheChapterUpdater.data = function (lastPage) {
  if (storyData.chapter.selected > 0) {
    $('.selected-tr').removeClass('selected-tr');

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

    cacheChapterUpdater.timeoutChecker = setTimeout(function () {
      cacheChapterUpdater.scrollData();
    }, 1000);

    // Add Bookmark
    if (storyData.nc.base.right.find('> #status #bookmark').length < 1) {
      // Insert
      if (!storyData.chapter.nav) {
        storyData.chapter.nav = {};
      }
      storyData.chapter.nav.bookmark = $('<a>', {
        indexItem: 2,
        class: 'nav-item nav-link',
        id: 'bookmark',
      });
      storyData.nc.base.right.find('> #status').prepend(storyData.chapter.nav.bookmark);

      // Icon
      storyData.chapter.nav.bookmark.css({
        cursor: 'pointer',
      });
      storyData.chapter.nav.bookmark
        .attr('title', 'Bookmark')
        .append(tinyLib.icon('fas fa-bookmark'));
      storyData.chapter.nav.bookmark.tooltip();

      // Action
      storyData.chapter.nav.bookmark.on('click', () => {
        tinyLib.modal({
          title: $('<span>').text('Bookmark'),
          body: $('<center>').append(
            $('<h5>').text(`Save this URL to your favorites to re-read the story on any device`),
            $('<input>', { type: 'text', class: 'form-control text-center' })
              .prop('readonly', true)
              .val(
                `${location.protocol}//${location.host}/?path=read-fic&chapter=${storyData.chapter.selected}&line=${storyData.chapter.line}`,
              )
              .on('click', function () {
                $(this).select();
              }),
          ),
          dialog: 'modal-lg',
        });
      });
    }

    if (!storyData.chapter.blockLineSave) {
      storyData.chapter.nav.bookmark.removeClass('disabled');
      storyData.chapter.nav.bookmark.prop('disabled', false);
    } else {
      storyData.chapter.nav.bookmark.addClass('disabled');
      storyData.chapter.nav.bookmark.prop('disabled', true);
    }

    // Sortable  #status
    storyData.nc.base.right.each(function () {
      $(this)
        .find('#status > a')
        .sort(function (a, b) {
          return Number($(a).attr('indexitem')) - Number($(b).attr('indexitem'));
        })
        .appendTo($(this).find('#status'));
    });

    // Update Title
    if (!storyData.chapter.blockLineSave) {
      tinyLocalStorage.setItem('bookmark' + storyData.chapter.selected, storyData.chapter.line);
      storyData.chapter.bookmark[storyData.chapter.selected] = storyData.chapter.line;
    }

    const infoInsert = `Chapter ${storyData.chapter.selected} / Line ${storyData.chapter.line}`;
    $('#fic-chapter').text(infoInsert);
    document.title = `${storyData.title} - ${infoInsert}`;
  }
};

// Set Actions
const chapterSet = {
  playEffect: function (value, actionFromNow = false) {
    if (actionFromNow && value && value.file && storyData.sfx[value.file]) {
      if (!cacheChapterUpdater.soundCache[value.file]) {
        cacheChapterUpdater.soundCache[value.file] = { playing: false };
      }

      cacheChapterUpdater.soundCache[value.file].waiting = true;
      cacheChapterUpdater.soundCache[value.file].value = value;
    }
  },

  playlistPlay: function (value, actionFromNow = false) {
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

  day: function (value, actionFromNow = false) {
    if (actionFromNow) {
      // Add Item Base
      if (storyData.nc.base.right.find('> #status #day').length < 1) {
        if (!storyData.chapter.nav) {
          storyData.chapter.nav = {};
        }
        storyData.chapter.nav.day = $('<a>', {
          indexItem: 5,
          class: 'nav-item nav-link',
          id: 'day',
        });
        storyData.nc.base.right.find('> #status').prepend(storyData.chapter.nav.day);
      }

      storyData.nc.base.right.find('> #status #day').text(`Day: ${value}`);
    }
  },

  dayNightCycle: function (value, actionFromNow = false) {
    if (actionFromNow) {
      $('body')
        .removeClass(`fic-daycicle-morning`)
        .removeClass(`fic-daycicle-evening`)
        .removeClass(`fic-daycicle-night`)
        .removeClass(`fic-daycicle-lateAtNight`)
        .addClass(`fic-daycicle-${value}`);

      // Add Item Base
      if (storyData.nc.base.right.find('> #status #dayNightCycle').length < 1) {
        if (!storyData.chapter.nav) {
          storyData.chapter.nav = {};
        }
        storyData.chapter.nav.dayNightCycle = $('<a>', {
          indexItem: 4,
          class: 'nav-item nav-link',
          id: 'dayNightCycle',
        });
        storyData.nc.base.right.find('> #status').prepend(storyData.chapter.nav.dayNightCycle);
      }

      // Types
      const types = {
        morning: { icon: 'fas fa-sun', title: 'Morning' },
        evening: { icon: 'fas fa-cloud-sun', title: 'Evening' },
        night: { icon: 'fas fa-moon', title: 'Night' },
        lateAtNight: { icon: 'fas fa-bullseye', title: 'Late at Night' },
      };

      const obj = storyData.nc.base.right.find('> #status #dayNightCycle');
      obj.empty();
      if (types[value]) {
        const newTitle = types[value].title;
        if (!obj.data('bs-tooltip-data')) {
          obj.attr('title', newTitle);
          obj.data('bs-tooltip-data', newTitle);
          obj.tooltip();
        } else {
          obj
            .data('bs-tooltip-data', newTitle)
            .data('bs-tooltip')
            .setContent({ '.tooltip-inner': newTitle });
        }
        obj.removeAttr('title').append(tinyLib.icon(types[value].icon));
      }
    }
  },

  weather: function (value, actionFromNow = false) {
    if (actionFromNow) {
      // Add Item Base
      if (storyData.nc.base.right.find('> #status #weather').length < 1) {
        if (!storyData.chapter.nav) {
          storyData.chapter.nav = {};
        }
        storyData.chapter.nav.weather = $('<a>', {
          indexItem: 3,
          class: 'nav-item nav-link',
          id: 'weather',
        });
        storyData.nc.base.right.find('> #status').prepend(storyData.chapter.nav.weather);
      }

      // Types
      const types = {
        rain: { icon: 'fas fa-cloud-rain', title: 'Rain' },
        bolt: { icon: 'fas fa-bolt', title: 'Thunderbolt' },
        heavyrain: { icon: 'fas fa-cloud-showers-heavy', title: 'Heavy Rain' },
        snow: { icon: 'fas fa-snowflake', title: 'Snow' },
      };

      storyData.chapter.nextWeather = value;
      const obj = storyData.nc.base.right.find('> #status #weather');
      obj.empty();
      if (types[value]) {
        obj.attr('title', types[value].title).append(tinyLib.icon(types[value].icon));
        obj.tooltip();
        obj.removeAttr('title');
      }
    }
  },

  where: function (value, actionFromNow = false) {
    if (actionFromNow) {
      // Add Item Base
      if (storyData.nc.base.right.find('> #status #where').length < 1) {
        if (!storyData.chapter.nav) {
          storyData.chapter.nav = {};
        }
        storyData.chapter.nav.where = $('<a>', {
          indexItem: 6,
          class: 'nav-item nav-link',
          id: 'where',
        });
        storyData.nc.base.right.find('> #status').prepend(storyData.chapter.nav.where);
      }

      storyData.nc.base.right.find('> #status #where').text(`Location: ${value}`);
    }
  },
};
