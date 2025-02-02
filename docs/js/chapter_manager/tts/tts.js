// Base
storyData.tts = {};

const ttsManager = {
  startBase: function () {
    if ($("#fic-nav > #status #tts").length < 1) {
      // Buttons
      if (!storyData.tts.nav) {
        storyData.tts.nav = {};
      }
      storyData.tts.nav.play = $("<i>", { class: "fas fa-play" });
      storyData.tts.nav.stop = $("<i>", { class: "fas fa-stop" });

      // Prepare
      if (!storyData.chapter.nav) {
        storyData.chapter.nav = {};
      }
      storyData.chapter.nav.tts = $("<div>", {
        indexItem: 1,
        class: "nav-item",
        id: "tts",
      }).append(
        $("<div>", { id: "tts-player" }).append(
          // Play
          $("<a>", {
            href: "javascript:void(0)",
            class: "text-white",
            title: "Start TTS",
          })
            .on("click", () => ttsManager.enable())
            .append(storyData.tts.nav.play),
          // Stop
          $("<a>", {
            href: "javascript:void(0)",
            class: "text-white",
            title: "Stop TTS",
          })
            .on("click", () => ttsManager.disable())
            .append(storyData.tts.nav.stop),
        ),
      );

      // Insert
      $("#fic-nav > #status").prepend([
        // TTS
        storyData.chapter.nav.tts,
      ]);
    }
    if (ttsManager.updatePlayer) {
      ttsManager.updatePlayer();
    }
    setInterval(ttsManager.updatePlayer, 100);
  },

  enabled: false,
  voicePreferenceList: ["Zira - English", "English (USA,l03)", "DEFAULT"],
  synth: window.speechSynthesis,
  voices: [],
  voice: null,
  lastLine: 0,

  enable: function () {
    ttsManager.enabled = true;
    cacheChapterUpdater.data(storyData.chapter.line);
  },
  disable: function () {
    ttsManager.enabled = false;
    ttsManager.synth.cancel();
  },

  init: function () {
    ttsManager.voices = ttsManager.synth.getVoices();
    if (ttsManager.voices.length === 0) {
      ttsManager.synth.onvoiceschanged = ttsManager.init;
      return;
    }
    for (const preferenceString of ttsManager.voicePreferenceList) {
      for (const voice of ttsManager.voices) {
        const voiceName = voice.name.toLowerCase();
        const preference = preferenceString.toLowerCase();
        if (voiceName.indexOf(preference) !== -1) {
          // console.log("Found preferred voice " + voiceName);
          ttsManager.voice = voice;
          break;
        }
      }
      if (ttsManager.voice !== null) {
        break;
      }
    }
    if (ttsManager.voice === null) {
      // console.log("No preferred voice found, using first");
      ttsManager.voice = ttsManager.voices[0];
    }
  },
  ttsTimeout: null,
  readLine(line) {
    if (!ttsManager.enabled) {
      return;
    }

    if (typeof line === "number") {
      ttsManager.lastLine = line;
    } else {
      console.error("non-number passed to ttsManager.readLine");
      return;
    }
    ttsManager.synth.cancel();

    if (ttsManager.ttsTimeout !== null) {
      clearTimeout(ttsManager.ttsTimeout);
      ttsManager.ttsTimeout = null;
    }

    if (ttsManager.voice == null) {
      ttsManager.ttsTimeout = setTimeout(() => {
        ttsManager.readLine(line);
      }, 500);
      return;
    }

    ttsManager.ttsTimeout = setTimeout(() => {
      ttsManager.readLineInternal(line);
    }, 500);
  },
  queue: [],
  nextUtterance() {
    if (ttsManager.queue.length == 0) {
      cacheChapterUpdater.setActiveItem(ttsManager.lastLine + 1, true);
      return;
    }
    let text = ttsManager.queue.shift();
    let utterance = new SpeechSynthesisUtterance();
    utterance.voice = ttsManager.voice;
    utterance.text = text;
    utterance.onend = ttsManager.nextUtterance;
    ttsManager.synth.speak(utterance);
  },
  readLineInternal(line) {
    const data = storyData.chapter.ficPageData[line - 1];
    ttsManager.queue = [];
    if (data.info) {
      for (let key of Object.keys(data.info)) {
        if (typeof cumulativeData.info[key] === "undefined") {
          ttsManager.queue.push("Info " + key + ": " + data.info[key]);
        }
      }
    }

    let actionString = data.type;
    if (data.character) {
      actionString += ": " + data.character;
    }
    ttsManager.queue.push(actionString);

    ttsManager.queue.push(data.value);

    ttsManager.nextUtterance();
  },
};

ttsManager.init();
