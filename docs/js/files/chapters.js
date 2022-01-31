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

    // Music
    music: {

        playing: false,
        paused: false,
        stoppabled: true,
        buffering: false,
        volume: 0

    },

    // Youtube Player
    youtube: {

        // Volume
        volume: storyCfg.defaultYoutubeVolume,
        quality: null,
        state: null,
        embed: null,

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
                        storyData.music.volume = 100;
                    } else { localStorage.setItem('storyVolume', storyData.youtube.volume); }
                } else {
                    storyData.youtube.volume = storageVolume;
                    storyData.youtube.player.setVolume(storageVolume);
                    storyData.music.volume = storageVolume;
                }

                // Play Video
                storyData.youtube.player.setLoop(true);
                storyData.youtube.player.setShuffle(true);
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
            storyData.music.volume = number;
        },

        // Start Youtube
        play: function(videoID) {

            // Read Data Base
            console.log(`Loading youtube video embed...`);
            $.ajax({
                url: 'https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(`https://www.youtube.com/watch?v=` + videoID),
                type: 'get',
                dataType: 'json'
            }).done(function(jsonVideo) {

                // Youtube Player
                console.log(`Youtube video embed loaded!`);
                storyData.youtube.embed = jsonVideo;

                // Info
                storyData.music.author_name = jsonVideo.author_name;
                storyData.music.author_url = jsonVideo.author_url;
                storyData.music.provider_name = jsonVideo.provider_name;
                storyData.music.thumbnail_url = jsonVideo.thumbnail_url;
                storyData.music.title = jsonVideo.title;

                // Prepare Video ID
                storyData.youtube.videoID = videoID;
                storyData.youtube.currentTime = 0;
                storyData.youtube.duration = 0;

                // New Player
                if (!storyData.youtube.player) {

                    // 2. This code loads the IFrame Player API code asynchronously.
                    console.log(`Starting Youtube API...`);
                    var tag = document.createElement('script');
                    tag.src = "https://www.youtube.com/iframe_api";
                    $('head').append(tag);

                    // Current Time Detector
                    setInterval(function() {
                        if (YT && YT.PlayerState && storyData.youtube.player) {

                            // Fix
                            storyData.music.playing = false;
                            storyData.music.paused = false;
                            storyData.music.stoppabled = false;
                            storyData.music.buffering = false;

                            // Playing
                            if (storyData.youtube.state === YT.PlayerState.PLAYING) {
                                storyData.music.playing = true;
                                storyData.youtube.duration = storyData.youtube.player.getDuration();
                                storyData.youtube.currentTime = storyData.youtube.player.getCurrentTime();
                                if (typeof appData.youtube.onPlaying === 'function') { appData.youtube.onPlaying(); }
                            }

                            // Ended
                            else if (storyData.youtube.state === YT.PlayerState.ENDED || storyData.youtube.state === YT.PlayerState.CUED) {
                                storyData.music.stoppabled = true;
                                storyData.youtube.currentTime = storyData.youtube.player.getDuration();
                            }

                            // Paused
                            else if (storyData.youtube.state === YT.PlayerState.PAUSED) {
                                storyData.music.paused = true;
                            }

                            // Buff
                            else if (storyData.youtube.state === YT.PlayerState.BUFFERING) {
                                storyData.music.buffering = true;
                            }

                        }
                        musicManager.updatePlayer();
                    }, 100);

                }

                // Reuse Player
                else { storyData.youtube.player.loadVideoById(videoID); }

                // Prepare Volume
                if (typeof storyData.youtube.volume === 'number' && typeof storyData.music.volume === 'number' && storyData.youtube.volume !== storyData.music.volume) {
                    storyData.youtube.player.setVolume(storyData.youtube.volume);
                    storyData.music.volume = storyData.youtube.volume;
                }

            }).fail(err => {
                console.error(err);
                alert(err.message);
            });

        }

    },

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

// Youtube

// 1. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
// https://developers.google.com/youtube/iframe_api_reference?hl=pt-br
function onYouTubeIframeAPIReady() {
    console.log(`Youtube API started!`);
    storyData.youtube.player = new YT.Player('youtubePlayer', {
        height: 'auto',
        width: 'auto',
        playerVars: { controls: 0 },
        videoId: storyData.youtube.videoID,
        events: storyData.youtube.events
    });
};