// Prepare Data
var chapters = {

    // Counter
    count: 0,

    // Main Lang
    lang: 'en',

    // Amount Chapters
    amount: 1,

    // Chapter Data
    data: {},

    // Start Load
    start: function(startApp) {
        if (typeof startApp === 'function') {

            // Load Data
            for (let i = 0; i < chapters.amount; i++) {
                const chapter = i + 1;
                $.getJSON('/chapters/' + chapters.lang + '/' + chapter + '.json',
                    function(data) {

                        // Insert Data
                        chapters[chapter] = data;

                        // Complete
                        chapters.count++;
                        if (chapters.count === chapters.amount) {
                            startApp();
                        }

                    }
                );
            }

        }
    }

};