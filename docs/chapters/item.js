// On Off Validator
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

    // Youtube Player
    youtube: {

        // Volume
        volume: storyCfg.defaultYoutubeVolume,
        quality: null,
        state: null,

        // Player
        player: null,
        events: {

            // Ready API
            onReady: function(event) {

                // Get Data
                storyData.youtube.volume = storyData.youtube.player.getVolume();
                storyData.youtube.quality = storyData.youtube.player.getPlaybackQuality();
                storyData.youtube.qualityList = storyData.youtube.player.getAvailableQualityLevels();

                // Storage Volume
                const storageVolume = Number(localStorage.getItem('storyVolume'));
                if (isNaN(storageVolume) || !isFinite(storageVolume) || storageVolume < 0 || storageVolume > 100) {
                    if (storyData.youtube.volume < 1) {
                        storyData.youtube.volume = 100;
                        storyData.youtube.player.setVolume(100);
                        localStorage.setItem('storyVolume', 100);
                    } else { localStorage.setItem('storyVolume', storyData.youtube.volume); }
                } else {
                    storyData.youtube.volume = storageVolume;
                    storyData.youtube.player.setVolume(storageVolume);
                }

                // Play Video
                storyData.youtube.player.setLoop(true);
                storyData.youtube.player.playVideo();

                // Send Data
                if (typeof appData.youtube.onReady === 'function') { appData.youtube.onReady(event); }

            },

            // State Change
            onStateChange: function(event) {

                // Event
                if (event) {
                    storyData.youtube.state = event.data;
                    storyData.youtube.qualityList = storyData.youtube.player.getAvailableQualityLevels();
                }

                // Send Data
                if (typeof appData.youtube.onStateChange === 'function') { appData.youtube.onStateChange(event); }

                /* 
                                
                    storyData.youtube.player.getPlayerState()
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
                if (event) { storyData.youtube.quality = event.data; }
                if (typeof appData.youtube.onPlaybackQualityChange === 'function') { appData.youtube.onPlaybackQualityChange(event); }
                /* player.setPlaybackQuality('default') */
            },

            // Other
            onPlaybackRateChange: function(event) {
                if (typeof appData.youtube.onPlaybackRateChange === 'function') { appData.youtube.onPlaybackRateChange(event); }
            },

            onError: function(event) {
                console.error(event);
                if (typeof appData.youtube.onError === 'function') { appData.youtube.onError(event); }
            },

            onApiChange: function(event) {
                if (typeof appData.youtube.onApiChange === 'function') { appData.youtube.onApiChange(event); }
            }

        },

        // Quality
        setQuality: function(value) {
            if (storyData.youtube.qualityList.indexOf(value) > -1 || value === 'default') {
                storyData.youtube.quality = value;
                storyData.youtube.player.setPlaybackQuality(value);
                return true;
            } else { return false; }
        },

        // Volume
        setVolume: function(number) {
            localStorage.setItem('storyVolume', number);
            storyData.youtube.volume = number;
            storyData.youtube.player.setVolume(number);
        },

        // Start Youtube
        play: function(videoID) {

            // Youtube Player

            // Prepare Video ID
            storyData.youtube.videoID = videoID;

            // New Player
            if (!storyData.youtube.player) {

                // 2. This code loads the IFrame Player API code asynchronously.
                var tag = document.createElement('script');
                tag.src = "https://www.youtube.com/iframe_api";
                $('head').append(tag);

            }

            // Reuse Player
            else { storyData.youtube.player.loadVideoById(videoID); }

        }

    },

    // Start Load
    start: function(startApp, failApp = function(err) {
        console.error(err);
        if (typeof err.message === 'string') { alert(err.message); }
    }) {
        if (localStorage) {
            if (typeof startApp === 'function') {

                // Auto Bookmark
                storyData.autoBookmark = plugValue(localStorage.getItem('autoBookMark'));

                // Load Data
                $.LoadingOverlay("show", { background: "rgba(0,0,0, 0.5)" });
                for (let i = 0; i < storyData.chapter.amount; i++) {

                    // Data
                    const chapter = i + 1;
                    $.getJSON('./chapters/' + storyData.lang + '/' + chapter + '.json')

                    // Complete
                    .done(function(data) {

                        // Insert Data
                        storyData.data[chapter] = data;
                        storyData.chapter.bookmark[chapter] = localStorage.getItem('bookmark' + chapter);

                        // Complete
                        storyData.count++;
                        if (storyData.count === storyData.chapter.amount) {
                            delete storyData.count;
                            delete storyData.start;
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
    storyData.youtube.player = new YT.Player('youtubePlayer', {
        height: 'auto',
        width: 'auto',
        videoId: storyData.youtube.videoID,
        events: storyData.youtube.events
    });
};