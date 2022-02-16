musicManager.start.pizzicato = function(item, loop, resolve, url) {

    // Pizzicato File
    storyData.sfx[item].pizzicato = {};
    storyData.sfx[item].pizzicato.playing = false;
    storyData.sfx[item].pizzicato.hiding = false;

    const newSound = new Pizzicato.Sound({
        source: 'file',
        options: { path: url, loop: loop }
    }, function() {
        console.log(`[${url}] Loaded!`);
        resolve();
    });

    storyData.sfx[item].pizzicato.file = newSound;

    // Data
    storyData.sfx[item].pizzicato.volume = newSound.volume * 100;

    // Stop
    storyData.sfx[item].pizzicato.stop = function() {
        if (storyData.sfx[item].pizzicato.playing) {
            storyData.sfx[item].pizzicato.playing = false;
            newSound.stop();
        }
    };

    // Start
    storyData.sfx[item].pizzicato.start = function() {
        if (!storyData.sfx[item].pizzicato.playing) {
            storyData.sfx[item].pizzicato.playing = true;
            newSound.play();
        }
    };

    // Play
    storyData.sfx[item].pizzicato.play = function(volume = null) {
        if (storyData.sfx[item].pizzicato.hiding) { storyData.sfx[item].pizzicato.stop(); }
        storyData.sfx[item].pizzicato.hiding = false;
        storyData.sfx[item].pizzicato.showing = false;
        return new Promise(function(resolve, reject) {
            setTimeout(function() {
                try {

                    if (typeof volume === 'number') {
                        storyData.sfx[item].pizzicato.setVolume(volume);
                    } else { storyData.sfx[item].pizzicato.setVolume(storyData.sfx[item].pizzicato.volume); }

                    storyData.sfx[item].pizzicato.start();
                    resolve();

                } catch (err) { reject(err); }
            }, 1);
        });
    };

    // Set Volume
    storyData.sfx[item].pizzicato.setVolume = function(value, notEdit = false) {
        return new Promise(function(resolve) {

            let tinyValue = value;
            if (typeof tinyValue !== 'number') {
                tinyValue = storyData.sfx[item].pizzicato.volume;
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

            if (storyData.sfx[item].pizzicato.playing) {
                newSound.volume = newVolume / 100;
            }

            if (!notEdit) {
                storyData.sfx[item].pizzicato.volume = tinyValue;
            }

            resolve();

        });
    };

    // Hide
    storyData.sfx[item].pizzicato.hide = async function(hideTimeout = 50) {

        let volume = newSound.volume * 100;

        storyData.sfx[item].pizzicato.hiding = true;
        storyData.sfx[item].pizzicato.showing = false;

        if (typeof hideTimeout === 'number' && !isNaN(hideTimeout) && isFinite(hideTimeout) && hideTimeout > 0) {
            for (let i = 0; i < 100; i++) {
                if (storyData.sfx[item].pizzicato.hiding) {
                    await new Promise(function(resolve) {
                        setTimeout(function() {

                            if (storyData.sfx[item].pizzicato.hiding) {
                                volume--;
                                storyData.sfx[item].pizzicato.setVolume(volume, true);
                            }

                            resolve();
                        }, hideTimeout);
                    });
                }
            }
        } else {
            storyData.sfx[item].pizzicato.setVolume(0, true);
        }

        if (storyData.sfx[item].pizzicato.hiding) {
            storyData.sfx[item].pizzicato.stop();
            storyData.sfx[item].pizzicato.hiding = false;
            storyData.sfx[item].pizzicato.showing = false;
        }

    };

    // Show
    storyData.sfx[item].pizzicato.show = async function(hideTimeout = 50) {

        storyData.sfx[item].pizzicato.stop();

        storyData.sfx[item].pizzicato.hiding = false;
        storyData.sfx[item].pizzicato.showing = false;

        const soundVolume = storyData.sfx[item].pizzicato.volume;
        let volume = 0;
        storyData.sfx[item].pizzicato.showing = true;
        storyData.sfx[item].pizzicato.hiding = false;
        storyData.sfx[item].pizzicato.setVolume(0, true);

        newSound.volume = 0;
        storyData.sfx[item].pizzicato.start();

        if (typeof hideTimeout === 'number' && !isNaN(hideTimeout) && isFinite(hideTimeout) && hideTimeout > 0) {
            for (let i = 0; i < 100; i++) {
                if (storyData.sfx[item].pizzicato.showing) {
                    await new Promise(function(resolve) {
                        setTimeout(function() {

                            if (storyData.sfx[item].pizzicato.showing) {
                                if (volume < soundVolume) {
                                    volume++;
                                    storyData.sfx[item].pizzicato.setVolume(volume, true);
                                } else {
                                    storyData.sfx[item].pizzicato.setVolume(soundVolume, true);
                                }
                            }

                            resolve();

                        }, hideTimeout);
                    });
                }
            }
        } else {
            storyData.sfx[item].pizzicato.setVolume(soundVolume, true);
        }

        if (storyData.sfx[item].pizzicato.showing) {
            storyData.sfx[item].pizzicato.hiding = false;
            storyData.sfx[item].pizzicato.showing = false;
        }

    };

};