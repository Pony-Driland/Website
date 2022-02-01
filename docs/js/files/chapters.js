// Params
const urlSearchParams = new URLSearchParams(window.location.search);
var params = Object.fromEntries(urlSearchParams.entries());

// On Off Validator
var resolution = new unstoppabledomains.Resolution();
var plugValue = function(item) {
    if (
        (typeof item === 'string' && (item === 'true' || item === 'on' || item === '1')) ||
        ((typeof item === 'boolean' || typeof item === 'number') && item)
    ) {
        return true;
    } else {
        return false;
    }
};

// Prepare Data
var storyData = {

    // Info
    title: storyCfg.title,
    description: storyCfg.description,

    // Counter
    count: 0,

    // Main Lang
    lang: {
        active: storyCfg.defaultLang,
        default: storyCfg.defaultLang,
        list: storyCfg.lang
    },

    // Chapters
    chapter: {
        amount: storyCfg.chapters,
        selected: null,
        bookmark: {},
    },

    // Chapter Data
    data: {},

    // Start Load
    start: function(startApp, failApp = function(err) {
        console.error(err);
        if (typeof err.message === 'string') { alert(err.message); }
    }) {
        if (localStorage) {
            if (typeof startApp === 'function') {

                // Start App
                const startTinyApp = function() {

                    // Read Data Base
                    $.ajax({
                        url: '/README.md' + fileVersion,
                        type: 'get',
                        dataType: 'text'
                    }).done(function(readme) {

                        // Load Data
                        for (let i = 0; i < storyData.chapter.amount; i++) {

                            // Data
                            const chapter = i + 1;
                            console.log(`Loading Chapter ${chapter}...`);
                            $.getJSON('./chapters/' + storyData.lang.active + '/' + chapter + '.json')

                            // Complete
                            .done(function(data) {

                                // Insert Data
                                storyData.data[chapter] = data;
                                storyData.chapter.bookmark[chapter] = Number(localStorage.getItem('bookmark' + chapter));
                                if (
                                    isNaN(storyData.chapter.bookmark[chapter]) ||
                                    !isFinite(storyData.chapter.bookmark[chapter]) ||
                                    storyData.chapter.bookmark[chapter] < 1
                                ) {
                                    storyData.chapter.bookmark[chapter] = 1;
                                }

                                console.log(`Chapter ${chapter} loaded!`);

                                // Complete
                                storyData.count++;
                                if (storyData.count === storyData.chapter.amount) {
                                    delete storyData.count;
                                    delete storyData.start;
                                    console.log('App Started!');
                                    console.log('Loading UI...');
                                    startApp(function() { $.LoadingOverlay("hide"); }, readme);
                                }

                            })

                            // Fail
                            .fail(function(err) {
                                console.log(`Chapter ${chapter} failed during the load!`);
                                $.LoadingOverlay("hide");
                                failApp(err);
                            });

                        }

                    }).fail(err => {
                        console.log(`README.md failed during the load!`);
                        $.LoadingOverlay("hide");
                        failApp(err);
                    });

                };

                // Auto Bookmark
                storyData.autoBookmark = plugValue(localStorage.getItem('autoBookMark'));

                // Start App
                $.LoadingOverlay("show", { background: "rgba(0,0,0, 0.5)" });
                if (storyCfg.nftDomain && typeof storyCfg.nftDomain.value === 'string' && storyCfg.nftDomain.value.length > 0) {
                    resolution.ipfsHash(storyCfg.nftDomain.value).then((cid) => {
                        storyData.cid = cid;
                        storyData.cid32 = CIDTool.base32(cid);
                        startTinyApp();
                    }).catch((err) => {
                        failApp(err);
                        startTinyApp();
                    });
                } else { startTinyApp(); }

            } else { failApp(new Error('Start App not found!')); }
        } else { failApp(new Error('Local Storage API not found!')); }
    }

};