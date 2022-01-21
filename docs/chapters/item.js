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

        // Volume
        volume: 100,
        quality: null,
        state: null,

        // Player
        player: null,
        events: {

            // Ready API
            onReady: function() {

                // Get Data
                chapters.youtube.volume = chapters.youtube.player.getVolume();
                chapters.youtube.quality = chapters.youtube.player.getPlaybackQuality();

                // Storage Volume
                const storageVolume = localStorage.getItem('storyVolume');
                if (typeof storageVolume !== 'number') {
                    if (chapters.youtube.volume < 1) {
                        chapters.youtube.volume = 100;
                        chapters.youtube.player.setVolume(100);
                    }
                } else {
                    chapters.youtube.volume = storageVolume;
                    chapters.youtube.player.setVolume(storageVolume);
                }

                // Play Video
                chapters.youtube.player.setLoop(true);
                chapters.youtube.player.playVideo();

            },

            // State Change
            onStateChange: function(event) {
                if (event) { chapters.youtube.state = event.data; }
                /* 
                                
                    chapters.youtube.player.getPlayerState()
                    -1 – não iniciado
                    0 – encerrado
                    1 – em reprodução
                    2 – em pausa
                    3 – armazenando em buffer
                    5 – vídeo indicado

                    YT.PlayerState.ENDED
                    YT.PlayerState.PLAYING
                    YT.PlayerState.PAUSED
                    YT.PlayerState.BUFFERING
                    YT.PlayerState.CUED
                
                */
            },

            // Quality
            onPlaybackQualityChange: function(event) {
                if (event) { chapters.youtube.quality = event.data; }
                /* 

                    small, medium, large, hd720,hd1080,highres
                    player.setPlaybackQuality('default')
                    player.getAvailableQualityLevels()

                 */
            },

            // Other
            onPlaybackRateChange: null,

            onError: null,
            onApiChange: null

        },

        // Volume
        setVolume: function(number) {
            localStorage.setItem('storyVolume', number);
            chapters.youtube.volume = number;
            chapters.youtube.player.setVolume(number);
        },

        // Start Youtube
        play: function(videoID) {

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

        }

    },

    // Start Load
    start: function(startApp, failApp = function(err) {
        console.error(err);
        if (typeof err.message === 'string') { alert(err.message); }
    }) {
        if (localStorage) {
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
                        $.LoadingOverlay("hide");
                        failApp(err);
                    });

                }

            } else { failApp(new Error('Start App not found!')); }
        } else { failApp(new Error('Local Storage API not found!')); }
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