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
        updateChapterCache(selectedItem);

    }

});

// Update Cache
var updateChapterCache = function(lastPage) {
    if (storyData.chapter.selected > 0) {

        // Update Data Cache        
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

        // Add Bookmark
        if ($('#fic-nav > #status #bookmark').length < 1) {

            if (!storyData.chapter.nav) { storyData.chapter.nav = {}; }
            storyData.chapter.nav.bookmark = $('<a>', { index: 0, class: 'nav-item nav-link', id: 'bookmark' });
            $('#fic-nav > #status').prepend(storyData.chapter.nav.bookmark);

            storyData.chapter.nav.bookmark.css('font-size', '17pt');
            storyData.chapter.nav.bookmark.attr('title', 'Bookmark').append($('<i>', { class: 'fas fa-bookmark' }));
            storyData.chapter.nav.bookmark.tooltip();

        }

        // Update Title
        localStorage.setItem('bookmark' + storyData.chapter.selected, storyData.chapter.line);
        storyData.chapter.bookmark[storyData.chapter.selected] = storyData.chapter.line;
        const infoInsert = `Chapter ${storyData.chapter.selected} - Line ${storyData.chapter.line}`;
        $('#fic-chapter').text(infoInsert);
        document.title = `${storyData.title} - ${infoInsert}`;

    }
};



// Set Actions
var chapterSet = {

    day: function(value, actionFromNow = false) {
        if (actionFromNow) {

            // Add Item Base
            if ($('#fic-nav > #status #day').length < 1) {
                if (!storyData.chapter.nav) { storyData.chapter.nav = {}; }
                storyData.chapter.nav.day = $('<a>', { index: 3, class: 'nav-item nav-link', id: 'day' });
                $('#fic-nav > #status').prepend(storyData.chapter.nav.day);
            }

            $('#fic-nav > #status #day').text(`Day: ${value}`);

        }
    },

    dayNightCycle: function(value, actionFromNow = false) {
        if (actionFromNow) {

            // Add Item Base
            if ($('#fic-nav > #status #dayNightCycle').length < 1) {
                if (!storyData.chapter.nav) { storyData.chapter.nav = {}; }
                storyData.chapter.nav.dayNightCycle = $('<a>', { indexItem: 2, class: 'nav-item nav-link', id: 'dayNightCycle' });
                $('#fic-nav > #status').prepend(storyData.chapter.nav.dayNightCycle);
            }

            // Types
            const types = {
                morning: { icon: 'fas fa-sun', title: 'Morning' },
                evening: { icon: 'cloud-sun', title: 'Evening' },
                night: { icon: 'fas fa-moon', title: 'Night' },
                lateAtNigh: { icon: 'fas fa-bullseye', title: 'Late at Nigh' }
            };

            const obj = $('#fic-nav > #status #dayNightCycle').css('font-size', '17pt');
            obj.empty();
            if (types[value]) {
                obj.attr('title', types[value].title).append($('<i>', { class: types[value].icon }));
                obj.tooltip();
            }

        }
    },

    weather: function(value, actionFromNow = false) {
        if (actionFromNow) {

            // Add Item Base
            if ($('#fic-nav > #status #weather').length < 1) {
                if (!storyData.chapter.nav) { storyData.chapter.nav = {}; }
                storyData.chapter.nav.weather = $('<a>', { indexItem: 1, class: 'nav-item nav-link', id: 'weather' });
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
            }

        }
    },

    where: function(value, actionFromNow = false) {
        if (actionFromNow) {

            // Add Item Base
            if ($('#fic-nav > #status #where').length < 1) {
                if (!storyData.chapter.nav) { storyData.chapter.nav = {}; }
                storyData.chapter.nav.where = $('<a>', { indexItem: 4, class: 'nav-item nav-link', id: 'where' });
                $('#fic-nav > #status').prepend(storyData.chapter.nav.where);
            }

            $('#fic-nav > #status #where').text(`Location: ${value}`);

        }
    }

};