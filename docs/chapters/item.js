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
            $.LoadingOverlay("show", { background: "rgba(0,0,0, 0.5)" });
            for (let i = 0; i < chapters.amount; i++) {

                // Data
                const chapter = i + 1;
                $.getJSON('./chapters/' + chapters.lang + '/' + chapter + '.json')

                // Complete
                .done(function(data) {

                    // Insert Data
                    chapters[chapter] = data;

                    // Complete
                    chapters.count++;
                    if (chapters.count === chapters.amount) {
                        startApp(function() { $.LoadingOverlay("hide"); });
                    }

                })

                // Fail
                .fail(function(err) {

                    console.error(err);
                    alert(err.message);
                    $.LoadingOverlay("hide");

                });

            }

        }
    }

};