$(window).scroll(function(event) {
    var scroll = $(window).scrollTop();
    // Do something
    // Detectar qual as divs visiveis no momento. Sempre focar na div que está visivel na página atualmente.
    // updateChapterCache();
});

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
        console.log(value, actionFromNow);
    },

    dayNightCycle: function(value, actionFromNow = false) {
        console.log(value, actionFromNow);
    },

    where: function(value, actionFromNow = false) {
        console.log(value, actionFromNow);
    }

};