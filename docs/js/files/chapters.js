// Params
const urlSearchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(urlSearchParams.entries());

// On Off Validator
const plugValue = function (item) {
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
const storyData = {
  // Info
  title: storyCfg.title,
  description: storyCfg.description,

  // Counter
  count: 0,

  // Main Lang
  lang: {
    active: storyCfg.defaultLang,
    default: storyCfg.defaultLang,
    list: storyCfg.lang,
  },

  // Chapters
  readFic: false,
  chapter: {
    amount: storyCfg.chapters,
    selected: null,
    bookmark: {},
  },

  // Chapter Data
  data: {},
  lettersCount: { total: 0 },
  wordsCount: { total: 0 },
  characters: { data: [], total: 0 },
  words: [],

  // Start Load
  start: function (
    startApp,
    failApp = function (err) {
      console.error(err);
      if (typeof err.message === 'string') {
        alert(err.message);
      }
    },
  ) {
    if (localStorage) {
      if (typeof startApp === 'function') {
        // Start App
        const startTinyApp = function () {
          // Read Data Base
          $.ajax({
            url: '/readme.html' + fileVersion,
            type: 'get',
            dataType: 'text',
          })
            .done(function (readme) {
              // Load Data
              storyData.isNew = {};
              for (let i = 0; i < storyData.chapter.amount; i++) {
                // Data
                const chapter = i + 1;
                console.log(`Loading Chapter ${chapter}...`);
                console.log(
                  './chapters/' + storyData.lang.active + '/' + chapter + '.json' + fileVersion,
                );
                $.getJSON(
                  './chapters/' + storyData.lang.active + '/' + chapter + '.json' + fileVersion,
                )

                  // Complete
                  .done(function (data) {
                    // Insert Words Count
                    const wordCache = [];
                    let letters = 0;
                    let words = 0;
                    for (const item in data) {
                      // Character Counter
                      if (
                        typeof data[item].character === 'string' &&
                        data[item].character.length > 0
                      ) {
                        const character = tinyLib.toTitleCase(data[item].character);
                        const characterLower = data[item].character.toLowerCase();

                        let newData = storyData.characters.data.find(
                          (char) => char.value === character,
                        );
                        if (!newData) {
                          newData = {
                            value: character,
                            id: characterLower.replace(/ /g, '-'),
                            count: 0,
                            chapter: {},
                          };
                          storyData.characters.data.push(newData);
                        }

                        if (typeof newData.chapter[chapter] !== 'number') {
                          newData.chapter[chapter] = 0;
                        }
                        newData.chapter[chapter]++;

                        newData.count++;
                        storyData.characters.total++;
                      }

                      // Get Text
                      const text = data[item].value.replace(/(\r\n|\n|\r)/gm, '').trim();
                      const textSplit = text.split(' ');

                      // Check Text
                      for (const item2 in textSplit) {
                        // Filter
                        const text = tinyLib.removeAiTags(
                          tinyLib.toTitleCase(textSplit[item2].replace(/[^a-zA-Z]+/g, '')),
                        );
                        if (isNaN(Number(text)) && text.length > 0) {
                          // Count Data
                          if (!Array.isArray(storyCfg.wordCountBlacklick)) {
                            storyCfg.wordCountBlacklick = [];
                          }
                          if (storyCfg.wordCountBlacklick.indexOf(text) < 0) {
                            let wordData = storyData.words.find((word) => word.value === text);
                            if (!wordData) {
                              wordData = { count: 0, value: text };
                              storyData.words.push(wordData);
                            }
                            wordData.count++;
                          }

                          if (wordCache.indexOf(text) < 0) {
                            wordCache.push(text);
                            words++;
                          }
                        }
                      }

                      letters += text.replace(/ |\<ai\>|\<\/ai\>/gm, '').length;
                    }

                    // Order Words
                    storyData.words.sort(function (a, b) {
                      return b.count - a.count;
                    });

                    storyData.characters.data.sort(function (a, b) {
                      return b.count - a.count;
                    });

                    // Insert Data
                    storyData.data[chapter] = data;
                    storyData.lettersCount[chapter] = letters;
                    storyData.lettersCount.total += letters;
                    storyData.wordsCount[chapter] = words;
                    storyData.wordsCount.total += words;
                    storyData.chapter.bookmark[chapter] = Number(
                      localStorage.getItem('bookmark' + chapter),
                    );
                    if (
                      isNaN(storyData.chapter.bookmark[chapter]) ||
                      !isFinite(storyData.chapter.bookmark[chapter]) ||
                      storyData.chapter.bookmark[chapter] < 1
                    ) {
                      storyData.chapter.bookmark[chapter] = 1;
                    }

                    const isNew = !localStorage.getItem('chapter' + chapter + 'MD5');
                    let isUpdate = false;
                    if (!isNew) {
                      isUpdate =
                        objHash(storyData.data[chapter]) !==
                        localStorage.getItem('chapter' + chapter + 'MD5');
                    }

                    if (isNew) {
                      storyData.isNew[chapter] = 2;
                    } else if (isUpdate) {
                      storyData.isNew[chapter] = 1;
                    } else {
                      storyData.isNew[chapter] = 0;
                    }

                    console.log(`Chapter ${chapter} loaded!`);

                    // Complete
                    storyData.count++;
                    if (storyData.count === storyData.chapter.amount) {
                      // Start jsStore
                      const connStore = new JsStore.Connection(new Worker('jsstore.worker.min.js'));

                      // Ai page database
                      const aiPage = { room: {}, hash: {}, tokens: {}, data: {} };
                      aiPage.room = {
                        prompt: { dataType: 'string' },
                        firstDialogue: { dataType: 'string' },
                        systemInstruction: { dataType: 'string' },
                        rpgSchema: { dataType: 'object' },
                        rpgData: { dataType: 'object' },
                        rpgPrivateData: { dataType: 'object' },
                        maxOutputTokens: { dataType: 'number' },
                        temperature: { dataType: 'number' },
                        topP: { dataType: 'number' },
                        topK: { dataType: 'number' },
                        presencePenalty: { dataType: 'number' },
                        frequencyPenalty: { dataType: 'number' },
                      };

                      for (const item in aiPage.room) {
                        aiPage.hash[item] = { dataType: 'string' };
                        aiPage.tokens[item] = { dataType: 'number' };
                      }

                      aiPage.room.session = { primaryKey: true, dataType: 'string' };
                      aiPage.room.model = { dataType: 'string' };
                      aiPage.hash.session = aiPage.room.session;
                      aiPage.tokens.session = aiPage.room.session;

                      aiPage.data = {
                        session: aiPage.room.session,
                        id: { notNull: true, dataType: 'number' },
                        tokens: { notNull: true, dataType: 'object' },
                        hash: { notNull: true, dataType: 'string' },
                        data: { dataType: 'object' },
                      };

                      aiPage.customList = {
                        session: aiPage.room.session,
                        data: { dataType: 'array' },
                      };

                      connStore
                        .initDb({
                          name: 'pony-driland',
                          tables: [
                            // Ai page
                            {
                              name: 'aiSessionsRoom',
                              columns: aiPage.room,
                            },
                            {
                              name: 'aiSessionsHash',
                              columns: aiPage.hash,
                            },
                            {
                              name: 'aiSessionsTokens',
                              columns: aiPage.tokens,
                            },
                            {
                              name: 'aiSessionsCustomList',
                              columns: aiPage.customList,
                            },
                            {
                              name: 'aiSessionsData',
                              columns: aiPage.data,
                            },
                          ],
                        })
                        .then(() => {
                          // Complete
                          delete storyData.count;
                          delete storyData.start;
                          console.log('App Started!');
                          console.log('Loading UI...');
                          // Start app now
                          startApp(
                            connStore,
                            function () {
                              $.LoadingOverlay('hide');
                              console.log('UI loaded!');
                            },
                            readme,
                          );
                        })
                        // Error
                        .catch((err) => {
                          alert(err.message);
                          console.error(err);
                        });
                    }
                  })

                  // Fail
                  .fail(function (err) {
                    console.log(`Chapter ${chapter} failed during the load!`);
                    $.LoadingOverlay('hide');
                    failApp(err);
                  });
              }
            })
            .fail((err) => {
              console.log(`README.md failed during the load!`);
              $.LoadingOverlay('hide');
              failApp(err);
            });
        };

        // Auto Bookmark
        storyData.autoBookmark = plugValue(localStorage.getItem('autoBookMark'));

        // Start App
        $.LoadingOverlay('show', { background: 'rgba(0,0,0, 0.5)' });
        startTinyApp();
      } else {
        failApp(new Error('Start App not found!'));
      }
    } else {
      failApp(new Error('Local Storage API not found!'));
    }
  },
};
