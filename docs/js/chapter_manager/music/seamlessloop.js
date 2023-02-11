musicManager.start.seamlessloop = function(item, newSound) {

    // Data
    storyData.sfx[item].data = newSound;
    storyData.sfx[item].volume = newSound._volume * 100;

    // Stop
    storyData.sfx[item].stop = function() {
        if (storyData.sfx[item].playing) {
            storyData.sfx[item].playing = false;
            newSound.stop();
        }
    };

    // Start
    storyData.sfx[item].start = function() {
        if (!storyData.sfx[item].playing) {
            storyData.sfx[item].playing = true;
            newSound.start(item);
        }
    };

    // Play
    storyData.sfx[item].play = function(volume = null) {
        if (storyData.sfx[item].hiding) { storyData.sfx[item].stop(); }
        storyData.sfx[item].hiding = false;
        storyData.sfx[item].showing = false;
        return new Promise(function(resolve, reject) {
            setTimeout(function() {
                try {

                    if (typeof volume === 'number') {
                        storyData.sfx[item].setVolume(volume);
                    } else { storyData.sfx[item].setVolume(storyData.sfx[item].volume); }

                    storyData.sfx[item].start();
                    resolve();

                } catch (err) { reject(err); }
            }, 1);
        });
    };

    // Set Volume
    storyData.sfx[item].setVolume = function(value, notEdit = false) {
        return new Promise(function(resolve) {

            let tinyValue = value;
            if (typeof tinyValue !== 'number') {
                tinyValue = storyData.sfx[item].volume;
            }

            if (tinyValue > 100) {
                tinyValue = 100;
            } else if (tinyValue < 0) {
                tinyValue = 0;
            }

            let newVolume = tinyLib.rule3(tinyValue, 100, storyData.music.volume);
            if (newVolume > 100) { newVolume = 100; }
            if (newVolume < 0) { newVolume = 0; }

            if (notEdit && newVolume > tinyValue) {
                newVolume = tinyValue;
            }

            if (storyData.sfx[item].playing) {
                newSound.volume(newVolume / 100);
            }

            if (!notEdit) {
                storyData.sfx[item].volume = tinyValue;
            }

            resolve();

        });
    };

    // Hide
    storyData.sfx[item].hide = async function(hideTimeout = 50) {

        let volume = newSound._volume * 100;

        storyData.sfx[item].hiding = true;
        storyData.sfx[item].showing = false;

        if (typeof hideTimeout === 'number' && !isNaN(hideTimeout) && isFinite(hideTimeout) && hideTimeout > 0) {
            for (let i = 0; i < 100; i++) {
                if (storyData.sfx[item].hiding) {
                    await new Promise(function(resolve) {
                        setTimeout(function() {

                            if (storyData.sfx[item].hiding) {
                                volume--;
                                storyData.sfx[item].setVolume(volume, true);
                            }

                            resolve();

                        }, hideTimeout);
                    });
                }
            }
        } else {
            storyData.sfx[item].setVolume(0, true);
        }

        if (storyData.sfx[item].hiding) {
            storyData.sfx[item].stop();
            storyData.sfx[item].hiding = false;
            storyData.sfx[item].showing = false;
        }

    };

    // Show
    storyData.sfx[item].show = async function(hideTimeout = 50) {

        storyData.sfx[item].stop();

        storyData.sfx[item].hiding = false;
        storyData.sfx[item].showing = false;

        const soundVolume = storyData.sfx[item].volume;
        let volume = 0;
        storyData.sfx[item].showing = true;
        storyData.sfx[item].hiding = false;
        storyData.sfx[item].setVolume(0, true);

        if (storyData.sfx[item].playing) {
            newSound.volume(0);
        }

        storyData.sfx[item].start();

        if (typeof hideTimeout === 'number' && !isNaN(hideTimeout) && isFinite(hideTimeout) && hideTimeout > 0) {
            for (let i = 0; i < 100; i++) {
                if (storyData.sfx[item].showing) {
                    await new Promise(function(resolve) {
                        setTimeout(function() {

                            if (storyData.sfx[item].showing) {
                                if (volume < soundVolume) {
                                    volume++;
                                    storyData.sfx[item].setVolume(volume, true);
                                } else {
                                    storyData.sfx[item].setVolume(soundVolume, true);
                                }
                            }

                            resolve();

                        }, hideTimeout);
                    });
                }
            }
        } else {
            storyData.sfx[item].setVolume(soundVolume, true);
        }

        if (storyData.sfx[item].showing) {
            storyData.sfx[item].hiding = false;
            storyData.sfx[item].showing = false;
        }

    };

};