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

        // Update Title
        document.title = `${storyData.title} - Chapter ${storyData.chapter.selected} - Line ${storyData.chapter.line}`;

    }
};

// Set Actions
var chapterSet = {

    day: function(value, actionFromNow = false) {
        if (actionFromNow) {

            // Add Item Base
            if ($('#fic-nav #day').length < 1) {
                if (!storyData.chapter.nav) { storyData.chapter.nav = {}; }
                storyData.chapter.nav.day = $('<a>', { class: 'nav-item nav-link', id: 'day' });
                $('#fic-nav').prepend(storyData.chapter.nav.day);
            }

            $('#fic-nav #day').text(`Day: ${value}`);

        }
    },

    dayNightCycle: function(value, actionFromNow = false) {
        if (actionFromNow) {

            // Add Item Base
            if ($('#fic-nav #dayNightCycle').length < 1) {
                if (!storyData.chapter.nav) { storyData.chapter.nav = {}; }
                storyData.chapter.nav.dayNightCycle = $('<a>', { class: 'nav-item nav-link', id: 'dayNightCycle' });
                $('#fic-nav').prepend(storyData.chapter.nav.dayNightCycle);
            }

            $('#fic-nav #dayNightCycle').text(`Night Cicle: ${value}`);

        }
    },

    weather: function(value, actionFromNow = false) {
        if (actionFromNow) {

            // Add Item Base
            if ($('#fic-nav #weather').length < 1) {
                if (!storyData.chapter.nav) { storyData.chapter.nav = {}; }
                storyData.chapter.nav.weather = $('<a>', { class: 'nav-item nav-link', id: 'weather' });
                $('#fic-nav').prepend(storyData.chapter.nav.dayNightCycle);
            }

            $('#fic-nav #weather').text(`Weather: ${value}`);

        }
    },

    where: function(value, actionFromNow = false) {
        if (actionFromNow) {

            // Add Item Base
            if ($('#fic-nav #where').length < 1) {
                if (!storyData.chapter.nav) { storyData.chapter.nav = {}; }
                storyData.chapter.nav.where = $('<a>', { class: 'nav-item nav-link', id: 'where' });
                $('#fic-nav').prepend(storyData.chapter.nav.where);
            }

            $('#fic-nav #where').text(`Location: ${value}`);

        }
    }

};