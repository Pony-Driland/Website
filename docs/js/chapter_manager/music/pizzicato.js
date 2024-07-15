musicManager.start.pizzicato = function (
  item,
  loop,
  resolve,
  url,
  forcePic = false,
) {
  // Pizzicato Space
  const pizzicato = {};

  // Pizzicato File
  pizzicato.playing = false;
  pizzicato.hiding = false;

  const newSound = new Pizzicato.Sound(
    {
      source: "file",
      options: { path: url, loop: loop },
    },
    function () {
      resolve();
    },
  );

  pizzicato.data = newSound;

  // Data
  pizzicato.volume = newSound.volume * 100;

  // Stop
  pizzicato.stop = function () {
    if (pizzicato.playing) {
      pizzicato.playing = false;
      newSound.stop();
    }
  };

  // Start
  pizzicato.start = function () {
    if (!pizzicato.playing) {
      pizzicato.playing = true;
      newSound.play();
    }
  };

  // Play
  pizzicato.play = function (volume = null) {
    if (pizzicato.hiding) {
      pizzicato.stop();
    }
    pizzicato.hiding = false;
    pizzicato.showing = false;
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        try {
          if (typeof volume === "number") {
            pizzicato.setVolume(volume);
          } else {
            pizzicato.setVolume(pizzicato.volume);
          }

          pizzicato.start();
          resolve();
        } catch (err) {
          reject(err);
        }
      }, 1);
    });
  };

  // Set Volume
  pizzicato.setVolume = function (value, notEdit = false) {
    return new Promise(function (resolve) {
      let tinyValue = value;
      if (typeof tinyValue !== "number") {
        tinyValue = pizzicato.volume;
      }

      if (tinyValue > 100) {
        tinyValue = 100;
      } else if (tinyValue < 0) {
        tinyValue = 0;
      }

      let newVolume = tinyLib.rule3(tinyValue, 100, storyData.music.volume);
      if (newVolume > 100) {
        newVolume = 100;
      }
      if (newVolume < 0) {
        newVolume = 0;
      }

      if (notEdit && newVolume > tinyValue) {
        newVolume = tinyValue;
      }

      if (pizzicato.playing) {
        newSound.volume = newVolume / 100;
      }

      if (!notEdit) {
        pizzicato.volume = tinyValue;
      }

      resolve();
    });
  };

  // Hide
  pizzicato.hide = async function (hideTimeout = 50) {
    let volume = newSound.volume * 100;

    pizzicato.hiding = true;
    pizzicato.showing = false;

    if (
      typeof hideTimeout === "number" &&
      !isNaN(hideTimeout) &&
      isFinite(hideTimeout) &&
      hideTimeout > 0
    ) {
      for (let i = 0; i < 100; i++) {
        if (pizzicato.hiding) {
          await new Promise(function (resolve) {
            setTimeout(function () {
              if (pizzicato.hiding) {
                volume--;
                pizzicato.setVolume(volume, true);
              }

              resolve();
            }, hideTimeout);
          });
        }
      }
    } else {
      pizzicato.setVolume(0, true);
    }

    if (pizzicato.hiding) {
      pizzicato.stop();
      pizzicato.hiding = false;
      pizzicato.showing = false;
    }
  };

  // Show
  pizzicato.show = async function (hideTimeout = 50) {
    pizzicato.stop();

    pizzicato.hiding = false;
    pizzicato.showing = false;

    const soundVolume = pizzicato.volume;
    let volume = 0;
    pizzicato.showing = true;
    pizzicato.hiding = false;
    pizzicato.setVolume(0, true);

    newSound.volume = 0;
    pizzicato.start();

    if (
      typeof hideTimeout === "number" &&
      !isNaN(hideTimeout) &&
      isFinite(hideTimeout) &&
      hideTimeout > 0
    ) {
      for (let i = 0; i < 100; i++) {
        if (pizzicato.showing) {
          await new Promise(function (resolve) {
            setTimeout(function () {
              if (pizzicato.showing) {
                if (volume < soundVolume) {
                  volume++;
                  pizzicato.setVolume(volume, true);
                } else {
                  pizzicato.setVolume(soundVolume, true);
                }
              }

              resolve();
            }, hideTimeout);
          });
        }
      }
    } else {
      pizzicato.setVolume(soundVolume, true);
    }

    if (pizzicato.showing) {
      pizzicato.hiding = false;
      pizzicato.showing = false;
    }
  };

  // End Sound
  newSound.on("end", function () {
    if (!loop) {
      pizzicato.hide(0);
    }
  });

  // Force Pic
  if (!forcePic) {
    storyData.sfx[item].pizzicato = pizzicato;
  } else {
    for (const item2 in pizzicato) {
      storyData.sfx[item][item2] = pizzicato[item2];
    }
  }
};
