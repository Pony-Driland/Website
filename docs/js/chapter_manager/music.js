// Music Manager
var musicManager = {

    disable: function(react = true) {
        if (react) {
            storyData.music.disabled = true;
            $('#music-player').addClass('disabled-player');
        } else {
            storyData.music.disabled = false;
            $('#music-player').removeClass('disabled-player');
        }
    },

    // Update Player
    updatePlayer: function() {

        if (storyData.music.nav) {

            // View
            $('#music-player').addClass('border').removeClass('d-none').addClass('mr-3');

            // Buff
            if (storyData.music.buffering) {
                $('#music-player > a').addClass('disabled');
            } else {
                $('#music-player > a').removeClass('disabled');
            }

            // Title
            if (typeof storyData.music.title === 'string' && storyData.music.title.length > 0) {
                $('#music-player > a').has(storyData.music.nav.info).attr('data-original-title', `Youtube - ${storyData.music.author_name} - ${storyData.music.title}`);
            }

            // Playing
            if (storyData.music.playing) {
                storyData.music.nav.play.addClass('fa-pause').removeClass('fa-play');
            } else if (storyData.music.paused) {
                storyData.music.nav.play.addClass('fa-play').removeClass('fa-pause');
            } else if (
                storyData.music.stoppabled ||
                typeof storyData.music.currentTime !== 'number' || typeof storyData.music.duration !== 'number' ||
                storyData.music.currentTime === storyData.music.duration
            ) {
                storyData.music.nav.play.addClass('fa-play').removeClass('fa-pause');
            }

            // Volume
            storyData.music.nav.volume.removeClass('fa-volume-mute').removeClass('fa-volume-up');
            if (typeof storyData.music.volume === 'number' && storyData.music.volume > 0) {
                storyData.music.nav.volume.addClass('fa-volume-up');
            } else {
                storyData.music.nav.volume.addClass('fas fa-volume-mute');
            }

            // Tooltip
            $('#music-player > a[title]').each(function() {
                $(this).tooltip();
            });

        }

    },

    // Start Base
    startBase: function() {

        // Add Youtube Playing Detector
        if (appData.youtube && !appData.youtube.onPlaying) {
            appData.youtube.onPlaying = function() {
                storyData.music.currentTime = storyData.youtube.currentTime;
                storyData.music.duration = storyData.youtube.duration;
                musicManager.updatePlayer();
            };
        }

        // Add Item Base
        if ($('#fic-nav > #status #music').length < 1) {

            // Navbar
            if (!storyData.music.nav) { storyData.music.nav = {}; }

            // Buttons
            storyData.music.nav.info = $('<i>', { class: 'fas fa-info-circle' });
            storyData.music.nav.play = $('<i>', { class: 'fas fa-play' });
            storyData.music.nav.volume = $('<i>', { class: 'fas fa-volume-mute' });
            storyData.music.nav.stop = $('<i>', { class: 'fas fa-stop' });

            // Prepare
            if (!storyData.chapter.nav) { storyData.chapter.nav = {}; }
            storyData.chapter.nav.music = $('<div>', { indexItem: 0, class: 'nav-item', id: 'music' }).append(
                $('<div>', { id: 'music-player', class: 'd-none' }).append(

                    // Info
                    $('<a>', { href: 'javascript:void(0)', title: 'Source' }).click(function() {
                        open(storyData.youtube.player.getVideoUrl(), '_blank')
                    }).append(storyData.music.nav.info),

                    // Play
                    $('<a>', { href: 'javascript:void(0)', title: 'Play/Pause' }).click(function() {

                        if (storyData.youtube.state === YT.PlayerState.PLAYING) {
                            storyData.youtube.player.pauseVideo();
                        } else {
                            storyData.youtube.player.playVideo();
                        }

                    }).append(storyData.music.nav.play),

                    // Stop
                    $('<a>', { href: 'javascript:void(0)', title: 'Stop' }).click(function() {
                        storyData.youtube.player.stopVideo();
                    }).append(storyData.music.nav.stop),

                    // Volume
                    $('<a>', { href: 'javascript:void(0)', title: 'Volume' }).click(function() {

                        // Modal
                        tinyLib.modal({
                            title: [$('<i>', { class: 'fas fa-volume mr-3' }), 'Song Volume'],
                            body: $('<center>').append(
                                $('<p>').text('Change the page music volume'),
                                $('<input>', { class: 'form-control range', type: 'range', min: 0, max: 100 }).change(function() {
                                    storyData.youtube.setVolume($(this).val());
                                }).val(storyData.music.volume)
                            ),
                            dialog: 'modal-lg'
                        });

                    }).append(storyData.music.nav.volume)

                )
            );

            // Insert
            $('#fic-nav > #status').prepend(storyData.chapter.nav.music);

        }

    }

};

/* 

    Music
    storyData.youtube.play('vwsRv0Rqncw')

*/