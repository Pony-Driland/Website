// Start Load
var appData = { youtube: {} };

// Start Document
console.log(`${storyData.title} is being started!`);
console.log(`App Info: ${storyData.description}`);
console.log(`Made by: ${storyData.creator}`);
console.log(`Author Page: ${storyData.creator_url}`);
console.log(`Age Rating: ${storyData.ageRating}`);
console.log(`Github Repository: ${storyData.github_repository}`);
console.log(`App Tags`, storyData.tags);
console.log(`NSFW`, true);

$(function() {
    storyData.start(function(fn) {

        console.log(storyData);
        fn();

    });
});

/* 

    Music
    storyData.youtube.play('vwsRv0Rqncw')
    storyData.youtube.player.playVideo()
    storyData.youtube.player.pauseVideo()
    storyData.youtube.player.stopVideo()

    storyData.youtube.player.mute()
    storyData.youtube.player.unMute()
    storyData.youtube.player.isMuted()

    storyData.youtube.player.setVolume(100)

    player.getDuration()
    player.getVideoUrl()

*/