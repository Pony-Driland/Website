musicManager.start.vanilla = function(item, newSound) {

    // Values
    storyData.sfx[item].paused = false;
    storyData.sfx[item].volume = newSound.volume * 100;
    storyData.sfx[item].currentTime = 0;
    storyData.sfx[item].duration = newSound.duration;

    // Play
    storyData.sfx[item].play = function(inTime = null, volume = null) {
        if (storyData.sfx[item].hiding) { newSound.pause(); }
        storyData.sfx[item].hiding = false;
        storyData.sfx[item].showing = false;
        return new Promise(function(resolve, reject) {
            setTimeout(function() {
                try {

                    if (typeof volume === 'number') {
                        storyData.sfx[item].setVolume(volume);
                    } else { storyData.sfx[item].setVolume(storyData.sfx[item].volume); }

                    newSound.currentTime = 0;
                    storyData.sfx[item].playing = true;
                    storyData.sfx[item].paused = false;
                    storyData.sfx[item].currentTime = 0;
                    storyData.sfx[item].leftTime = storyData.sfx[item].duration;

                    if (typeof inTime === 'number') {
                        storyData.sfx[item].currentTime = inTime;
                        newSound.currentTime = inTime;
                    }

                    newSound.play();
                    resolve();

                } catch (err) { reject(err); }
            }, 1);
        });
    };

    // Seek To
    storyData.sfx[item].seekTo = function(value) {
        return new Promise(function(resolve) {
            storyData.sfx[item].currentTime = value;
            newSound.currentTime = value;
            resolve();
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

            newSound.volume = newVolume / 100;
            if (!notEdit) {
                storyData.sfx[item].volume = tinyValue;
            }

            resolve();

        });
    };

    // Stop
    storyData.sfx[item].stop = function() {
        if (storyData.sfx[item].hiding) { newSound.pause(); }
        storyData.sfx[item].hiding = false;
        storyData.sfx[item].showing = false;
        return new Promise(function(resolve, reject) {
            setTimeout(function() {
                try {
                    storyData.sfx[item].playing = false;
                    storyData.sfx[item].paused = false;
                    newSound.pause();
                    newSound.currentTime = 0;
                    storyData.sfx[item].currentTime = 0;
                    storyData.sfx[item].leftTime = storyData.sfx[item].duration;
                    resolve();
                } catch (err) { reject(err); }
            }, 1);
        });
    };

    // Pause
    storyData.sfx[item].pause = function() {
        if (storyData.sfx[item].hiding) { newSound.pause(); }
        storyData.sfx[item].hiding = false;
        storyData.sfx[item].showing = false;
        return new Promise(function(resolve, reject) {
            setTimeout(function() {
                try {
                    storyData.sfx[item].playing = false;
                    storyData.sfx[item].paused = true;
                    newSound.pause();
                    resolve();
                } catch (err) { reject(err); }
            }, 1);
        });
    };

    // Resume
    storyData.sfx[item].resume = function() {
        if (storyData.sfx[item].hiding) { newSound.pause(); }
        storyData.sfx[item].hiding = false;
        storyData.sfx[item].showing = false;
        return new Promise(function(resolve, reject) {
            setTimeout(function() {
                try {
                    storyData.sfx[item].playing = true;
                    storyData.sfx[item].paused = false;
                    storyData.sfx[item].setVolume(storyData.sfx[item].volume);
                    newSound.play();
                    resolve();
                } catch (err) { reject(err); }
            }, 1);
        });
    };

    // Hide
    storyData.sfx[item].hide = async function(hideTimeout = 50) {

        let volume = newSound.volume * 100;

        storyData.sfx[item].playing = true;
        storyData.sfx[item].paused = false;
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
            newSound.pause();
            storyData.sfx[item].playing = false;
            storyData.sfx[item].paused = false;
            storyData.sfx[item].hiding = false;
            storyData.sfx[item].showing = false;
            storyData.sfx[item].currentTime = 0;
            storyData.sfx[item].leftTime = storyData.sfx[item].duration;
        }

    };

    // Show
    storyData.sfx[item].show = async function(hideTimeout = 50) {

        newSound.pause();

        storyData.sfx[item].playing = false;
        storyData.sfx[item].paused = false;
        storyData.sfx[item].hiding = false;
        storyData.sfx[item].showing = false;

        const soundVolume = storyData.sfx[item].volume;
        newSound.currentTime = 0;
        storyData.sfx[item].currentTime = 0;
        storyData.sfx[item].leftTime = storyData.sfx[item].duration;
        let volume = 0;
        newSound.volume = 0;
        storyData.sfx[item].showing = true;
        storyData.sfx[item].hiding = false;
        storyData.sfx[item].setVolume(0, true);
        newSound.play();

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
            storyData.sfx[item].playing = true;
            storyData.sfx[item].paused = false;
            storyData.sfx[item].hiding = false;
            storyData.sfx[item].showing = false;
        }

    };

    // Audio Action
    newSound.addEventListener('ended', function() {
        storyData.sfx[item].stop();
    }, false);

    newSound.addEventListener('timeupdate', function() {

        if (storyData.sfx[item].playing) {
            storyData.sfx[item].currentTime = storyData.sfx[item].file.currentTime;
            storyData.sfx[item].leftTime = storyData.sfx[item].duration - storyData.sfx[item].currentTime;
        }

    }, false);

};