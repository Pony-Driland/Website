$(window).scroll(function(event) {
    var scroll = $(window).scrollTop();
    // Do something
    // Detectar qual as divs visiveis no momento. Sempre focar na div que está visivel na página atualmente.
});

var updateChapterCache = function(lastPage) {
    storyData.chapter.line = lastPage;
    for (let i = 0; i < lastPage; i++) {

        // Get Data
        const data = storyData.data[storyData.chapter.selected][i];
        if (data.set) {
            for (const item in data.set) {
                if (typeof chapterSet[item] === 'function') {
                    chapterSet[item](data.set[item]);
                }
            }
        }

    }
};

// Set Actions
var chapterSet = {

    day: function(value) {
        console.log(value);
    },

    dayNightCycle: function(value) {
        console.log(value);
    },

    where: function(value) {
        console.log(value);
    }

};