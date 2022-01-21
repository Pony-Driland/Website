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

    // Youtube Player
    youtube: {
        player: null,
        events: {
            onReady: null,
            onStateChange: null
        }
    },

    // Start Youtube
    playYoutube: function(videoID) {

        // Youtube Player

        // Prepare Video ID
        chapters.youtube.videoID = videoID;

        // New Player
        if (!chapters.youtube.player) {

            // 2. This code loads the IFrame Player API code asynchronously.
            var tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            $('head').append(tag);

        }

        // Reuse Player
        else { chapters.youtube.player.loadVideoById(videoID); }

    },

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
                    chapters.data[chapter] = data;

                    // Complete
                    chapters.count++;
                    if (chapters.count === chapters.amount) {
                        startApp(function() { $.LoadingOverlay("hide"); });
                    }

                })

                // Fail
                .fail(function(err) {

                    console.error(err);
                    alert(err.status);
                    alert(err.statusText);
                    alert(err.message);
                    $.LoadingOverlay("hide");

                });

            }

        }
    }

};

// Youtube

// 1. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
// https://developers.google.com/youtube/iframe_api_reference?hl=pt-br
function onYouTubeIframeAPIReady() {
    chapters.youtube.player = new YT.Player('youtubePlayer', {
        height: 'auto',
        width: 'auto',
        videoId: chapters.youtube.videoID,
        events: chapters.youtube.events
    });
};