// Read Data on Scroll
$(window).on('resize scroll', function() {

    // Is Bottom Page
    if (tinyLib.isPageTop()) {
        alert("Test!");
    }

    // Selected Item
    let selectedItem = 0;

    // Detect Selected Item
    for (const item in storyData.chapter.html) {

        if (storyData.chapter.html[item].visibleOnWindow() === 'full') {
            selectedItem = Number(item);
            break;
        }

    }

    // Complete
    console.log(selectedItem);
    // updateChapterCache();

});

// Update Cache
var updateChapterCache = function(lastPage) {
    storyData.chapter.line = lastPage;
    const data = storyData.data[storyData.chapter.selected];
    for (const i in data) {

        // Get Data
        if (data.set) {
            for (const item in data[i].set) {
                if (typeof chapterSet[item] === 'function') {
                    chapterSet[item](data[i].set[item], (i < lastPage));
                }
            }
        }

    }
};

// Set Actions
var chapterSet = {

    day: function(value, actionFromNow = false) {
        /* console.log(value, actionFromNow); */
    },

    dayNightCycle: function(value, actionFromNow = false) {
        /* console.log(value, actionFromNow); */
    },

    where: function(value, actionFromNow = false) {
        /* console.log(value, actionFromNow); */
    }

};