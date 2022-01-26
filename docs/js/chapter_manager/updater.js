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
    }
};

// Set Actions
var chapterSet = {

    day: function(value, actionFromNow = false) {
        if (actionFromNow) {
            console.log(value);
        }
    },

    dayNightCycle: function(value, actionFromNow = false) {
        if (actionFromNow) {
            console.log(value);
        }
    },

    where: function(value, actionFromNow = false) {
        if (actionFromNow) {
            console.log(value);
        }
    }

};