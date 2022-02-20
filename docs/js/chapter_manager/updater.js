// Prepare Cache
var cacheChapterUpdater = {};

// Read Data on Scroll
$(window).on('resize scroll', function() {

    // Validator
    if (storyData.chapter.selected > 0) {

        // Selected Item
        let selectedItem = 0;

        // Normal Mode
        if (!tinyLib.isPageBottom()) {

            // Detect Selected Item
            for (const item in storyData.chapter.html) {

                if (storyData.chapter.html[item].visibleOnWindow() === 'full') {
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
        cacheChapterUpdater.data(selectedItem);

    }

});

cacheChapterUpdater.scrollData = function() {

    // Set Playlist
    if (Array.isArray(storyData.music.playlist)) {
        musicManager.disable(false);
    } else {
        storyData.music.playlist = [];
    }

    // Exist Playlist
    if (!storyData.music.disabled && Array.isArray(storyData.music.playlist) && storyData.music.playlist.length > 0) {
        musicManager.startPlaylist();
    }

    // Nope
    else {
        musicManager.stopPlaylist();
    }

    // Google
    if (typeof storyCfg.gtag === 'string' && gtag) {
        gtag('event', 'chapter', {
            event_chapter: `Chapter ${storyData.chapter.selected}`,
            event_category: 'line',
            event_line: storyData.chapter.line
        });
    }

};

// Update Cache
cacheChapterUpdater.data = function(lastPage) {
    if (storyData.chapter.selected > 0) {

        // Update Data Cache
        musicManager.startBase();
        storyData.chapter.line = lastPage;
        const data = storyData.data[storyData.chapter.selected];
        for (const i in data) {

            // Get Data
            if (data[i].set) {
                for (const item in data[i].set) {
                    if (typeof chapterSet[item] === 'function') {
                        chapterSet[item](data[i].set[item], (i < lastPage));
                    }
                }
            }

        }

        // Update Checker Data
        if (typeof cacheChapterUpdater.timeoutChecker !== 'undefined') {
            clearTimeout(cacheChapterUpdater.timeoutChecker);
            delete cacheChapterUpdater.timeoutChecker;
        }

        cacheChapterUpdater.timeoutChecker = setTimeout(function() {
            cacheChapterUpdater.scrollData();
        }, 1000);

        // Add Bookmark
        if ($('#fic-nav > #status #bookmark').length < 1) {

            // Insert
            if (!storyData.chapter.nav) { storyData.chapter.nav = {}; }
            storyData.chapter.nav.bookmark = $('<a>', { indexItem: 2, class: 'nav-item nav-link', id: 'bookmark' });
            $('#fic-nav > #status').prepend(storyData.chapter.nav.bookmark);

            // Icon
            storyData.chapter.nav.bookmark.css({ 'font-size': '17pt', cursor: 'pointer' });
            storyData.chapter.nav.bookmark.attr('title', 'Bookmark').append($('<i>', { class: 'fas fa-bookmark' }));
            storyData.chapter.nav.bookmark.tooltip();

            // Action
            storyData.chapter.nav.bookmark.click(function() {

                tinyLib.modal({
                    title: $('<span>').text('Bookmark'),
                    body: $('<center>').append(
                        $('<h5>').text(`Save this URL to your favorites to re-read the story on any device`),
                        $('<input>', { type: 'text', class: 'form-control text-center' }).prop('readonly', true).val(
                            `${location.protocol}//${location.host}/?path=read-fic&title=${encodeURIComponent(storyCfg.title)}&chapter=${storyData.chapter.selected}&line=${storyData.chapter.line}`
                        ).click(function() { $(this).select(); })
                    ),
                    dialog: 'modal-lg'
                });

            });

        }

        // Sortable
        $('#fic-nav #status > a').sort(function(a, b) {
            return Number($(a).attr('indexitem')) - Number($(b).attr('indexitem'));
        }).appendTo($('#fic-nav #status'));

        // Update Title
        localStorage.setItem('bookmark' + storyData.chapter.selected, storyData.chapter.line);
        storyData.chapter.bookmark[storyData.chapter.selected] = storyData.chapter.line;
        const infoInsert = `Chapter ${storyData.chapter.selected} / Line ${storyData.chapter.line}`;
        $('#fic-chapter').text(infoInsert);
        document.title = `${storyData.title} - ${infoInsert}`;

    }
};

// Set Actions
var chapterSet = {

    playEffect: function(value, actionFromNow = false) {
        if (actionFromNow) {

        }
    },

    playlistPlay: function(value, actionFromNow = false) {
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

    day: function(value, actionFromNow = false) {
        if (actionFromNow) {

            // Add Item Base
            if ($('#fic-nav > #status #day').length < 1) {
                if (!storyData.chapter.nav) { storyData.chapter.nav = {}; }
                storyData.chapter.nav.day = $('<a>', { indexItem: 5, class: 'nav-item nav-link', id: 'day' });
                $('#fic-nav > #status').prepend(storyData.chapter.nav.day);
            }

            $('#fic-nav > #status #day').text(`Day: ${value}`);

        }
    },

    dayNightCycle: function(value, actionFromNow = false) {
        if (actionFromNow) {

            $('body')
                .removeClass(`fic-daycicle-morning`)
                .removeClass(`fic-daycicle-evening`)
                .removeClass(`fic-daycicle-night`)
                .removeClass(`fic-daycicle-lateAtNight`)
                .addClass(`fic-daycicle-${value}`);

            // Add Item Base
            if ($('#fic-nav > #status #dayNightCycle').length < 1) {
                if (!storyData.chapter.nav) { storyData.chapter.nav = {}; }
                storyData.chapter.nav.dayNightCycle = $('<a>', { indexItem: 4, class: 'nav-item nav-link', id: 'dayNightCycle' });
                $('#fic-nav > #status').prepend(storyData.chapter.nav.dayNightCycle);
            }

            // Types
            const types = {
                morning: { icon: 'fas fa-sun', title: 'Morning' },
                evening: { icon: 'fas fa-cloud-sun', title: 'Evening' },
                night: { icon: 'fas fa-moon', title: 'Night' },
                lateAtNight: { icon: 'fas fa-bullseye', title: 'Late at Nigh' }
            };

            const obj = $('#fic-nav > #status #dayNightCycle').css('font-size', '17pt');
            obj.empty();
            if (types[value]) {
                if (!obj.attr('data-original-title')) {
                    obj.attr('title', types[value].title);
                    obj.tooltip();
                } else {
                    obj.attr('data-original-title', types[value].title);
                }
                obj.removeAttr('title').append($('<i>', { class: types[value].icon }));
            }

        }
    },

    weather: function(value, actionFromNow = false) {
        if (actionFromNow) {

            // Add Item Base
            if ($('#fic-nav > #status #weather').length < 1) {
                if (!storyData.chapter.nav) { storyData.chapter.nav = {}; }
                storyData.chapter.nav.weather = $('<a>', { indexItem: 3, class: 'nav-item nav-link', id: 'weather' });
                $('#fic-nav > #status').prepend(storyData.chapter.nav.weather);
            }

            // Types
            const types = {
                rain: { icon: 'fas fa-cloud-rain', title: 'Rain' },
                bolt: { icon: 'fas fa-bolt', title: 'Thunderbolt' },
                heavyrain: { icon: 'fas fa-cloud-showers-heavy', title: 'Heavy Rain' },
                snow: { icon: 'fas fa-snowflake', title: 'Snow' }
            };

            const obj = $('#fic-nav > #status #weather').css('font-size', '17pt');
            obj.empty();
            if (types[value]) {
                obj.attr('title', types[value].title).append($('<i>', { class: types[value].icon }));
                obj.tooltip();
                obj.removeAttr('title');
            }

        }
    },

    where: function(value, actionFromNow = false) {
        if (actionFromNow) {

            // Add Item Base
            if ($('#fic-nav > #status #where').length < 1) {
                if (!storyData.chapter.nav) { storyData.chapter.nav = {}; }
                storyData.chapter.nav.where = $('<a>', { indexItem: 6, class: 'nav-item nav-link', id: 'where' });
                $('#fic-nav > #status').prepend(storyData.chapter.nav.where);
            }

            $('#fic-nav > #status #where').text(`Location: ${value}`);

        }
    }

};