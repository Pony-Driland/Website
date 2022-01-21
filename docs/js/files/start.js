// Start Load
var appData = { youtube: {} };

// Start Document
$(function() {
    chapters.start(function(fn) {

        console.log(chapters);
        fn();

    });
});

/* 

    Music
    chapters.youtube.player.playVideo()
    chapters.youtube.player.pauseVideo()
    chapters.youtube.player.stopVideo()

    chapters.youtube.player.mute()
    chapters.youtube.player.unMute()
    chapters.youtube.player.isMuted()

    chapters.youtube.player.setVolume(100)

    player.getDuration()
    player.getVideoUrl()

*/