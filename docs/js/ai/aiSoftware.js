// Localstorage Manager
class TinyAiStorage extends EventEmitter {
  constructor() {
    super();

    this._selected = localStorage.getItem('tiny-ai-storage-selected');
    if (typeof this._selected !== 'string') this._selected = null;

    this.storage = localStorage.getItem('tiny-ai-storage');
    try {
      this.storage = JSON.parse(this.storage);
      if (!this.storage) this.storage = {};
    } catch {
      this.storage = {};
    }
  }

  _saveApiStorage() {
    localStorage.setItem('tiny-ai-storage', JSON.stringify(this.storage));
    this.emit('saveApiStorage', this.storage);
  }

  _updateExistsAi() {
    for (const item in this.storage) {
      if (typeof this.storage[item] === 'string' && this.storage[item].length > 0) {
        this._selected = item;
        break;
      }
    }
    localStorage.setItem('tiny-ai-storage-selected', this._selected);
  }

  selectedAi() {
    return this._selected;
  }

  setApiKey(name, key) {
    if (typeof key === 'string') {
      this.storage[name] = key;
      this._saveApiStorage();
      this._updateExistsAi();
      this.emit('setApiKey', name, key);
      return;
    }
    throw new Error('Invalid AI api key data type!');
  }

  delApiKey(name) {
    if (this.storage[name]) {
      delete this.storage[name];
      this._saveApiStorage();
      this._updateExistsAi();
      this.emit('delApiKey', name);
      return true;
    }
    return false;
  }

  getApiKey(name) {
    return this.storage[name] || null;
  }
}

window.addEventListener('beforeunload', function (e) {
  if (appData.ai.using) {
    const message =
      'You have unsaved changes in your AI session. If you leave, the changes will be lost.';
    e.returnValue = message;
    return message;
  }
});

const AiScriptStart = () => {
  const tinyAiScript = {};

  // Read AI Apis
  const tinyAi = new TinyAiApi();
  const tinyStorage = new TinyAiStorage();
  let aiLogin = null;
  tinyAiScript.setAiLogin = (newAiLogin) => {
    aiLogin = newAiLogin;
  };

  const canSandBox = (value) => value === 'sandBoxFic';

  // Detect Using AI
  appData.emitter.on('isUsingAI', (usingAI) => {
    if (usingAI) {
      $('body').addClass('is-using-ai');
    } else {
      $('body').removeClass('is-using-ai');
    }
  });

  // Checker
  tinyAiScript.checkTitle = () => {
    // Get selected Ai
    const selectedAi = tinyStorage.selectedAi();

    // Exists Google only. Then select google generative
    if (selectedAi === 'google-generative') {
      // Update html
      aiLogin.button.find('> i').removeClass('text-danger-emphasis');
      aiLogin.title = 'AI Enabled';
      $('body').addClass('can-ai');

      // Update Ai API script
      setGoogleAi(tinyAi, tinyStorage.getApiKey('google-generative'));
      tinyAiScript.enabled = true;
    } else {
      // Update html
      aiLogin.button.find('> i').addClass('text-danger-emphasis');
      aiLogin.title = 'AI Disabled';
      $('body').removeClass('can-ai');
      tinyAiScript.enabled = false;
    }

    // Update login button
    aiLogin.updateTitle();
  };

  tinyAiScript.isEnabled = () => {
    // Get selected Ai
    const selectedAi = tinyStorage.selectedAi();

    // Exists Google only. Then select google generative
    if (selectedAi === 'google-generative') {
      tinyAiScript.enabled = true;
      return true;
    } else {
      tinyAiScript.enabled = false;
      return false;
    }
  };
  tinyAiScript.enabled = false;

  // Login button
  tinyAiScript.login = () => {
    // Google AI
    const googleAi = {
      input: $('<input>', {
        type: 'password',
        class: 'form-control text-center',
      }),
      title: $('<h4>').text('Google Studio'),
      desc: $('<p>').append(
        $('<span>').text('You can get your Google API key '),
        $('<a>', {
          href: 'https://aistudio.google.com/apikey',
          target: '_blank',
        }).text('here'),
        $('<span>').text('. Website: aistudio.google.com'),
      ),
    };

    googleAi.input.val(tinyStorage.getApiKey('google-generative'));

    // Modal
    tinyLib.modal({
      id: 'ai_connection',
      title: 'AI Protocol',
      dialog: 'modal-lg',
      body: $('<center>').append(
        $('<p>').text(`You are in an optional setting. You do not need AI to use the website!`),
        $('<p>').text(
          `This website does not belong to any AI company, and all API input is stored locally inside your machine. This website is just a client to run prompts in artificial intelligence, there is no native artificial intelligence installed here.`,
        ),
        $('<p>').text(
          `By activating an artificial intelligence service in your session, you agree to the terms of use and privacy policies of the third party services you are using on this website. You will always be warned when any artificial intelligence service needs to be run on this website.`,
        ),

        googleAi.title,
        googleAi.desc,
        googleAi.input,

        $('<button>', { class: 'btn btn-info mx-4 mt-4' })
          .text('Set API Tokens')
          .on('click', () => {
            tinyStorage.setApiKey('google-generative', googleAi.input.val());
            tinyAiScript.checkTitle();
            $('#ai_connection').modal('hide');
          }),
      ),
    });
  };

  // Open AI Page
  tinyAiScript.open = async () => {
    tinyNotification.requestPerm();
    // Update Url
    urlUpdate('ai', 'AI Page');

    // Clear page
    clearFicData();
    $('#markdown-read').empty();
    $('#top_page').addClass('d-none');

    // Try to prevent user browser from deactivating the page accidentally in browsers that have tab auto deactivator
    const aiTimeScriptUpdate = () => {
      try {
        // Get data
        const now = moment();
        const totalTime = JSON.parse(localStorage.getItem('total-time-using-ai') || '{}');

        if (typeof totalTime.now !== 'number') totalTime.now = now.valueOf();
        if (typeof totalTime.secondsUsed !== 'number') totalTime.secondsUsed = 0;
        const past = moment(totalTime.now);

        // Diff
        const diff = Math.abs(now - past);
        if (diff >= 999) totalTime.secondsUsed++;

        // Complete
        totalTime.now = now.valueOf();
        localStorage.setItem('total-time-using-ai', JSON.stringify(totalTime));
        if (aiLogin) {
          aiLogin.secondsUsed = totalTime.secondsUsed;
          aiLogin.updateTitle();
        }
      } catch (err) {
        console.error(err);
      }
      appData.ai.secondsUsed++;
    };

    appData.ai.interval = setInterval(aiTimeScriptUpdate, 1000);
    aiTimeScriptUpdate();

    // Start loading page
    let isFirstTime = true;
    $.LoadingOverlay('show', { background: 'rgba(0,0,0, 0.5)' });
    if (tinyAiScript.isEnabled()) {
      // Load Models
      if (tinyAi.getModelsList().length < 1) await tinyAi.getModels(100);

      // Sidebar
      const sidebarStyle = {
        class: 'bg-dark text-white p-3 d-none d-md-block',
        style: 'width: 250px; min-width: 250px; overflow-y: auto;',
      };

      // Sidebar Button
      const createButtonSidebar = (icon, text, callback, disabled = false) =>
        $('<button>', {
          type: 'button',
          class: `btn btn-link btn-bg text-start w-100${disabled ? ' disabled' : ''}`,
        })
          .text(text)
          .prepend($('<i>', { class: `${icon} me-2` }))
          .on('click', callback)
          .prop('disabled', disabled);

      // Select Model
      const modelSelector = $('<select>', {
        class: 'form-select',
        id: 'select-ai-model',
      });
      const resetModelSelector = () => {
        modelSelector.empty();
        modelSelector.append($('<option>').text('None'));
      };

      resetModelSelector();

      // To Number
      const convertToNumber = (val) =>
        typeof val === 'string' && val.length > 0
          ? Number(val)
          : typeof val === 'number'
            ? val
            : null;

      // Token Count
      const tokenCount = {
        amount: $('<span>').data('token-count', 0).text('0'),
        total: $('<span>').text('0'),
        updateValue: (where, value) => {
          if (typeof value === 'number') {
            if (!Number.isNaN(value) && Number.isFinite(value)) {
              if (tokenCount[where] && where !== 'updateValue' && where !== 'getValue')
                return tokenCount[where]
                  .data('token-count', value)
                  .text(value.toLocaleString(navigator.language || 'en-US'));
            }
          } else return tokenCount[where].data('token-count', 0).text(0);
        },

        getValue: (where) => {
          if (tokenCount[where] && where !== 'updateValue' && where !== 'getValue')
            return tokenCount[where].data('token-count') || 0;
        },
      };

      // Ranger Generator
      const tinyRanger = () => {
        const rangerBase = $('<div>', {
          class: 'd-flex flex-row align-items-center',
        });
        const ranger = $('<input>', { type: 'range', class: 'form-range' });
        const rangerNumber = $('<input>', {
          type: 'number',
          class: 'form-control ms-2',
          style: 'width: 70px; max-width: 70px; min-width: 70px;',
        });

        ranger.on('wheel', function (event) {
          event.preventDefault();
          let currentValue = Number(ranger.val());

          const getValue = (where, defaultValue) => {
            let newValue = ranger.attr(where);
            if (typeof newValue === 'string' && newValue.length > 0) newValue = Number(newValue);
            else newValue = defaultValue;
            return newValue;
          };

          const step = getValue('step', 1);
          const min = getValue('min', 0);
          const max = getValue('max', 0);

          // Detect scroll position
          if (event.originalEvent.deltaY < 0) {
            // Up
            currentValue += step;
          } else {
            // Down
            currentValue -= step;
          }

          // Update value
          if (currentValue < min) ranger.val(min).trigger('input');
          else if (currentValue > max) ranger.val(max).trigger('input');
          else ranger.val(currentValue).trigger('input');
        });

        ranger.on('input', function () {
          rangerNumber.val(ranger.val());
        });

        rangerNumber.on('input', function () {
          ranger.val(rangerNumber.val());
        });

        rangerNumber.on('change', function () {
          let value = parseInt(rangerNumber.val());
          let min = parseInt(rangerNumber.attr('min'));
          let max = parseInt(rangerNumber.attr('max'));
          if (value < min) {
            rangerNumber.val(min);
          } else if (value > max) {
            rangerNumber.val(max);
          }
        });

        rangerBase.append(ranger, rangerNumber);
        return {
          getBase: () => ranger,
          getBase2: () => rangerNumber,
          trigger: function (value) {
            return ranger.trigger(value);
          },
          reset: function () {
            this.setMin(0);
            this.setMax(0);
            this.setStep(0);
            this.val(0);
            return this;
          },
          setMin: function (value) {
            ranger.attr('min', value);
            rangerNumber.attr('min', value);
            return this;
          },
          setMax: function (value) {
            ranger.attr('max', value);
            rangerNumber.attr('max', value);
            return this;
          },
          setStep: function (value) {
            ranger.attr('step', value);
            rangerNumber.attr('step', value);
            return this;
          },

          disable: function () {
            ranger.addClass('disabled');
            ranger.prop('disabled', true);
            rangerNumber.addClass('disabled');
            rangerNumber.prop('disabled', true);
            return this;
          },
          enable: function () {
            ranger.removeClass('disabled');
            ranger.prop('disabled', false);
            rangerNumber.removeClass('disabled');
            rangerNumber.prop('disabled', false);
            return this;
          },

          insert: () => rangerBase,
          val: function (value) {
            if (typeof value !== 'undefined') {
              ranger.val(value);
              rangerNumber.val(value);
              return this;
            }
            return convertToNumber(ranger.val());
          },
        };
      };

      // Output Length
      const outputLength = $('<input>', {
        type: 'number',
        class: 'form-control',
      });

      outputLength.on('input', () =>
        tinyAi.setMaxOutputTokens(convertToNumber(outputLength.val())),
      );

      // Temperature
      const temperature = tinyRanger();
      temperature
        .getBase()
        .on('input', () => tinyAi.setTemperature(convertToNumber(temperature.val())));
      temperature
        .getBase2()
        .on('change', () => tinyAi.setTemperature(convertToNumber(temperature.val())));
      temperature.val(1);
      tinyAi.setTemperature(1);

      // Top P
      const topP = tinyRanger();
      topP.getBase().on('input', () => tinyAi.setTopP(convertToNumber(topP.val())));
      topP.getBase2().on('change', () => tinyAi.setTopP(convertToNumber(topP.val())));

      // Top K
      const topK = tinyRanger();
      topK.getBase().on('input', () => tinyAi.setTopK(convertToNumber(topK.val())));
      topK.getBase2().on('change', () => tinyAi.setTopK(convertToNumber(topK.val())));

      // Presence penalty
      const presencePenalty = tinyRanger();
      presencePenalty
        .getBase()
        .on('input', () => tinyAi.setPresencePenalty(convertToNumber(presencePenalty.val())));
      presencePenalty
        .getBase2()
        .on('change', () => tinyAi.setPresencePenalty(convertToNumber(presencePenalty.val())));

      // Frequency penalty
      const frequencyPenalty = tinyRanger();
      frequencyPenalty
        .getBase()
        .on('input', () => tinyAi.setFrequencyPenalty(convertToNumber(frequencyPenalty.val())));
      frequencyPenalty
        .getBase2()
        .on('change', () => tinyAi.setFrequencyPenalty(convertToNumber(frequencyPenalty.val())));

      // Get fic cache
      const getFicCache = (
        id,
        instructionId,
        prompts,
        introduction,
        hashItems,
        newContent,
        forceReset = false,
      ) =>
        new Promise((resolve, reject) => {
          isFirstTime = false;
          // Reset token count
          tokenCount.updateValue('amount', 0);
          newContent()
            .then((ficData) => {
              // Start chatbot script
              if (forceReset || !tinyAi.selectDataId(id)) {
                // Start History
                tinyAi.startDataId(id, true);
                tinyAi.setModel(modelSelector.val());

                // Set Instruction
                tinyAi.setSystemInstruction(aiTemplates.instructions[instructionId], 0);

                // Set Prompts
                try {
                  if (typeof prompts === 'string') tinyAi.setPrompt(prompts, 0);
                  if (Array.isArray(prompts)) tinyAi.setPrompt(prompts.join('\n'), 0);
                } catch {
                  tinyAi.setPrompt('', 0);
                }
              }

              // Exists data
              else {
                // Get first history data
                const tinyData = tinyAi.getFirstIndexData();
                // Delete old file version
                if (tinyData && tinyData.parts && tinyData.parts[0] && tinyData.parts[0].inlineData)
                  tinyAi.deleteIndex(0);
              }

              // Add file data
              const fileTokens = tinyAi.getTokens('file');
              const oldFileHash = tinyAi.getHash('file');
              tinyAi.setFileData(ficData.mime, ficData.data);
              const newFileHash = tinyAi.getHash('file');
              if (oldFileHash === newFileHash)
                tinyAi.setFileData(null, null, null, fileTokens || 0);

              // Clear data
              clearMessages();
              enableReadOnly(false);
              enableMessageButtons(true);
              addMessage(makeMessage({ message: introduction }, 'Introduction'));

              const history = tinyAi.getData();

              // Insert first message
              if (history.data.length < 1 && typeof history.firstDialogue === 'string') {
                history.data.push(
                  tinyAi.buildContents(
                    null,
                    {
                      role: 'model',
                      parts: [{ text: history.firstDialogue }],
                    },
                    'model',
                  ),
                );
              }

              // Start system
              insertImportData(
                history.data,
                history.tokens && Array.isArray(history.tokens.data) ? history.tokens.data : [],
                true,
              );
              disablePromptButtons(false);
              updateAiTokenCounterData(hashItems, forceReset);

              // Update button list
              for (const index in ficConfigs.buttons) {
                // Nope
                if (ficConfigs.data[index].id !== ficConfigs.selected)
                  ficConfigs.buttons[index].removeClass('selected');
                else ficConfigs.buttons[index].addClass('selected');
              }
              resolve();
            })
            .catch((err) => {
              alert(err.message);
              $.LoadingOverlay('hide');
              reject(err);
            });
        });

      // Import button
      const importButton = $('<input>', {
        type: 'file',
        accept: '.json',
        style: 'display: none;',
      });

      const insertImportData = (data, tokens, readOnly = false) => {
        // Insert data
        if (Array.isArray(data)) {
          for (const index in data) {
            const msgId = !readOnly
              ? tinyAi.addData(
                  tinyAi.buildContents(null, data[index], data[index].role),
                  tokens[index],
                )
              : tinyAi.getIdByIndex(index);

            const msg = !readOnly ? tinyAi.getLastIndexData() : data[index];
            if (msg && msg.parts && msg.parts[0] && typeof msg.parts[0].text === 'string') {
              addMessage(
                makeMessage(
                  {
                    message: msg.parts[0].text,
                    finishReason: msg.finishReason,
                    id: msgId,
                  },
                  msg.role === 'user' ? null : tinyLib.toTitleCase(msg.role),
                ),
              );
            }
          }
        }
      };

      importButton.on('change', (event) => {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = function (e) {
            try {
              // Read data
              const jsonData = JSON.parse(e.target.result);
              if (jsonData.file && typeof jsonData.id === 'string') {
                // Migration to sandbox mode
                if (!canSandBox(jsonData.id) && typeof jsonData.file.systemInstruction === 'string')
                  jsonData.id = 'sandBoxFic';

                // Start History
                tinyAi.startDataId(jsonData.id, true);

                // Open Get Fic Cache
                const index = ficConfigs.data.findIndex((item) => item.id === jsonData.id);

                const instructionId = index > -1 ? ficConfigs.data[index].template : null;

                // Set model
                if (typeof jsonData.file.model === 'string') {
                  modelSelector.val(jsonData.file.model);
                  tinyAi.setModel(jsonData.file.model, jsonData.id);
                  selectModel(jsonData.file.model);
                }

                // Set model settings
                if (typeof jsonData.file.temperature === 'number')
                  tinyAi.setTemperature(jsonData.file.temperature);
                if (typeof jsonData.file.maxOutputTokens === 'number')
                  tinyAi.setMaxOutputTokens(jsonData.file.maxOutputTokens);
                if (typeof jsonData.file.topP === 'number') tinyAi.setTopP(jsonData.file.topP);
                if (typeof jsonData.file.topK === 'number') tinyAi.setTopK(jsonData.file.topK);
                if (typeof jsonData.file.presencePenalty === 'number')
                  tinyAi.setPresencePenalty(jsonData.file.presencePenalty);
                if (typeof jsonData.file.frequencyPenalty === 'number')
                  tinyAi.setFrequencyPenalty(jsonData.file.frequencyPenalty);

                // Set Instruction
                if (canSandBox(jsonData.id))
                  tinyAi.setSystemInstruction(
                    jsonData.file.systemInstruction,
                    jsonData.file.tokens ? jsonData.file.tokens.systemInstruction : 0,
                  );
                else if (aiTemplates.instructions[instructionId])
                  tinyAi.setSystemInstruction(
                    aiTemplates.instructions[instructionId],
                    jsonData.file.tokens ? jsonData.file.tokens.systemInstruction : 0,
                  );

                // Prompt
                if (typeof jsonData.file.prompt === 'string')
                  tinyAi.setPrompt(
                    jsonData.file.prompt,
                    jsonData.file.tokens ? jsonData.file.tokens.prompt : 0,
                  );

                // First Dialogue
                if (typeof jsonData.file.firstDialogue === 'string')
                  tinyAi.setFirstDialogue(
                    jsonData.file.firstDialogue,
                    jsonData.file.tokens ? jsonData.file.tokens.firstDialogue : 0,
                  );

                // File
                if (jsonData.file.tokens && typeof jsonData.file.tokens.file === 'number')
                  tinyAi.setFileData(
                    null,
                    null,
                    null,
                    jsonData.file.tokens ? jsonData.file.tokens.file : 0,
                  );

                // Clear messages
                clearMessages();
                enableReadOnly(false);
                enableMessageButtons(true);

                // Insert first message
                if (
                  jsonData.file.data.length < 1 &&
                  typeof jsonData.file.firstDialogue === 'string'
                ) {
                  jsonData.file.data.push(
                    tinyAi.buildContents(
                      null,
                      {
                        role: 'model',
                        parts: [{ text: jsonData.file.firstDialogue }],
                      },
                      'model',
                    ),
                  );
                }

                // Complete
                insertImportData(
                  jsonData.file.data,
                  jsonData.file.tokens && Array.isArray(jsonData.file.tokens.data)
                    ? jsonData.file.tokens.data
                    : [],
                );

                if (jsonData.file.hash)
                  jsonData.file.hash.model =
                    typeof jsonData.file.model === 'string' ? objHash(jsonData.file.model) : null;

                if (index > -1)
                  getFicCache(
                    ficConfigs.data[index].id,
                    instructionId,
                    ficConfigs.data[index].prompt,
                    ficConfigs.data[index].intro,
                    jsonData.file.hash,
                    () => {
                      ficConfigs.selected = ficConfigs.data[index].id;
                      return ficConfigs.data[index].getData();
                    },
                  );
              }
            } catch (err) {
              console.error(err);
              alert(err.message);
            }
          };

          reader.readAsText(file);
        }
      });

      const ficConfigs = {
        data: [
          {
            title: 'Safe Talk',
            id: 'ficTalkSfw',
            template: 'talkToFicSfw',
            icon: 'fa-solid fa-book-open',
            isSafe: true,
            intro:
              'Welcome to talk about the fic Pony Driland! I will answer all your questions related to fic in your native language (if i can support to do this). I will try to hide some explicit details from fic, but if you insist, I will try to say in a few details.',
            getData: async () => saveRoleplayFormat(null, false),
          },
          {
            title: 'Full Talk',
            id: 'ficTalk',
            template: 'talkToFic',
            icon: 'fa-solid fa-book-open-reader',
            intro:
              'Welcome to talk about the fic Pony Driland! I will answer all your questions related to fic in your native language (if i can support to do this), but be careful, because I will answer questions related to literally anything that happened in fic, including censored scenes (but i will do this respecting the limitations of my selected model).',
            getData: async () => saveRoleplayFormat(null, false),
          },
          {
            title: 'Sandbox',
            id: 'sandBoxFic',
            template: 'sandBoxToFic',
            icon: 'fa-solid fa-fill-drip',
            intro:
              'Welcome to sandbox of the fic Pony Driland! This is my purely sandbox version, that means I have no special configuration, allowing you to do whatever you want within the limits of your selected model.',
            getData: async () =>
              saveRoleplayFormat(null, false, {
                ficLine: false,
                dayNumber: false,
              }),
          },
        ],
        buttons: [],
        selected: null,
        contentsMd5: null,
      };

      const ficTemplates = [
        createButtonSidebar('fa-solid fa-arrows-rotate', 'Reset History', () => {
          const index = ficConfigs.data.findIndex((item) => item.id === ficConfigs.selected);
          if (index > -1) {
            getFicCache(
              ficConfigs.data[index].id,
              ficConfigs.data[index].template,
              ficConfigs.data[index].prompt,
              ficConfigs.data[index].intro,
              null,
              () => {
                ficConfigs.selected = ficConfigs.data[index].id;
                return ficConfigs.data[index].getData();
              },
              true,
            ).then(() => resetSettingsButton.trigger('click'));
          }
        }),
      ];

      for (const index in ficConfigs.data) {
        const newButton = createButtonSidebar(
          ficConfigs.data[index].icon,
          ficConfigs.data[index].title,
          () =>
            getFicCache(
              ficConfigs.data[index].id,
              ficConfigs.data[index].template,
              ficConfigs.data[index].prompt,
              ficConfigs.data[index].intro,
              null,
              () => {
                ficConfigs.selected = ficConfigs.data[index].id;
                return ficConfigs.data[index].getData();
              },
            ),
        );
        ficConfigs.buttons.push(newButton);
        ficTemplates.push(newButton);
      }

      const importItems = [
        // Import
        createButtonSidebar('fa-solid fa-file-import', 'Import', () =>
          importButton.trigger('click'),
        ),

        importButton,
      ];

      const ficPromptItems = [
        // System Instructions
        createButtonSidebar('fa-solid fa-toolbox', 'System Instructions', () => {
          const tinyModalData = {
            id: 'ai_instructions',
            info: 'System Instructions:',
            size: 400,
            textarea: tinyAi.getSystemInstruction(),
            submitName: 'Set Instructions',
            submitCall: (value) => {
              const oldValue = tinyAi.getSystemInstruction();
              if (typeof oldValue !== 'string' || oldValue !== value) {
                tinyAi.setSystemInstruction(value, 0);
                updateAiTokenCounterData();
              }
            },
          };

          if (canSandBox(ficConfigs.selected)) {
            tinyModalData.addTemplates = {
              data: aiTemplates.prompts,
              title: 'Select a prompt to be added',
            };
          } else tinyModalData.readOnly = true;

          tinyModalTextarea(tinyModalData, ['instructionText', 'text']);
        }),

        // Prompt
        createButtonSidebar('fa-solid fa-terminal', 'Prompt', () =>
          tinyModalTextarea(
            {
              id: 'ai_prompt',
              info: 'This prompt will always be inserted at the beginning of all your requests:',
              size: 200,
              textarea: tinyAi.getPrompt(),
              submitName: 'Set Prompt',
              addTemplates: {
                data: aiTemplates.prompts,
                title: 'Select a prompt to be added',
              },
              submitCall: (value) => {
                const oldValue = tinyAi.getPrompt();
                if (typeof oldValue !== 'string' || oldValue !== value) {
                  tinyAi.setPrompt(value, 0);
                  updateAiTokenCounterData();
                }
              },
            },
            !canSandBox(ficConfigs.selected) ? 'text' : ['sandBoxText', 'text'],
          ),
        ),

        // First Dialogue
        createButtonSidebar('fa-solid fa-comment-dots', 'First Dialogue', () =>
          tinyModalTextarea(
            {
              id: 'ai_first_dialogue',
              info: 'This is the initial dialogue that can be inserted as a model message:',
              size: 200,
              textarea: tinyAi.getFirstDialogue(),
              submitName: 'Set First Message',
              addTemplates: {
                data: aiTemplates.prompts,
                title: 'Select a prompt to be added',
              },
              submitCall: (value) => {
                const oldValue = tinyAi.getFirstDialogue();
                if (typeof oldValue !== 'string' || oldValue !== value) {
                  tinyAi.setFirstDialogue(value);
                  enabledFirstDialogue(typeof value === 'string' && value.length > 0);
                }
              },
            },
            'firstDialogue',
          ),
        ),
      ];

      // Textarea Template
      const tinyModalTextarea = (
        config = {
          info: '???',
          size: 200,
          submitName: 'Submit',
          addTemplates: null,
          submitCall: null,
          id: null,
          textarea: null,
          readOnly: false,
        },
        textValueName = 'text',
      ) => {
        // Body
        const body = $('<div>');
        const textarea = $('<textarea>', {
          class: 'form-control',
          style: `height: ${String(config.size)}px;`,
        });
        textarea.val(config.textarea);
        if (config.readOnly) textarea.prop('readOnly', true);

        // Templates list
        if (
          config.addTemplates &&
          Array.isArray(config.addTemplates.data) &&
          config.addTemplates.data.length > 0
        ) {
          const templateList = config.addTemplates.data;
          // Select
          const textareaAdd = $('<select>', { class: 'form-control' });
          textareaAdd.append($('<option>', { value: 'DEFAULT' }).text(config.addTemplates.title));

          // Separator
          const addSeparator = () =>
            textareaAdd.append($('<option>').prop('disabled', true).text('----------------------'));

          addSeparator();

          // Add options
          for (const index in templateList) {
            const templateItem = templateList[index];
            // Validator
            const valueTypeValidator = () => {
              // Tiny code
              const tinyTypeValidator = (tinyTxtValName) =>
                typeof templateItem[tinyTxtValName] === 'string' ||
                templateItem.type === tinyTxtValName;

              // String
              if (typeof textValueName === 'string') return tinyTypeValidator(textValueName);

              // Array
              if (Array.isArray(textValueName)) {
                for (const index in textValueName) {
                  if (tinyTypeValidator(textValueName[index])) return true;
                }
              }

              // Nothing
              return false;
            };

            // Get data
            const getTypeValue = () => {
              // Tiny code
              const tinyTypeValidator = (tinyTxtValName) =>
                typeof templateItem[tinyTxtValName] === 'string'
                  ? templateItem[tinyTxtValName]
                  : null;

              // String
              if (typeof textValueName === 'string') {
                const value = tinyTypeValidator(textValueName);
                if (value) return value;
              }

              // Array
              if (Array.isArray(textValueName)) {
                for (const index in textValueName) {
                  const value = tinyTypeValidator(textValueName[index]);
                  if (value) return value;
                }
              }

              // Nothing
              return null;
            };

            const ficOptionData = ficConfigs.data.find((item) => item.id === ficConfigs.selected);

            if (
              ficOptionData &&
              // Sandbox
              (typeof templateItem.sandboxOnly !== 'boolean' ||
                !templateItem.sandboxOnly ||
                canSandBox(ficConfigs.selected)) &&
              // Safe mode
              (typeof ficOptionData.isSafe !== 'boolean' ||
                !ficOptionData.isSafe ||
                (ficOptionData.isSafe && !templateItem.isNotSafe))
            ) {
              // Normal way
              if (!templateItem.hr) {
                // Validator
                if (
                  valueTypeValidator() &&
                  (typeof templateItem.value === 'string' || templateItem.disabled)
                )
                  textareaAdd.append(
                    $('<option>', {
                      value: templateItem.value,
                    })
                      // Data item
                      .data('TinyAI-select-text', getTypeValue())
                      .data(
                        'TinyAI-temperature',
                        typeof templateItem.temperature === 'number' &&
                          !Number.isNaN(templateItem.temperature) &&
                          templateItem.temperature >= 0
                          ? templateItem.temperature
                          : null,
                      )
                      .data(
                        'TinyAI-max-output-tokens',
                        typeof templateItem.maxOutputTokens === 'number' &&
                          !Number.isNaN(templateItem.maxOutputTokens) &&
                          templateItem.maxOutputTokens >= 0
                          ? templateItem.maxOutputTokens
                          : null,
                      )
                      .data(
                        'TinyAI-topP',
                        typeof templateItem.topP === 'number' &&
                          !Number.isNaN(templateItem.topP) &&
                          templateItem.topP >= 0
                          ? templateItem.topP
                          : null,
                      )
                      .data(
                        'TinyAI-topK',
                        typeof templateItem.topK === 'number' &&
                          !Number.isNaN(templateItem.topK) &&
                          templateItem.topK >= 0
                          ? templateItem.topK
                          : null,
                      )
                      .data(
                        'TinyAI-presence-penalty',
                        typeof templateItem.presencePenalty === 'number' &&
                          !Number.isNaN(templateItem.presencePenalty) &&
                          templateItem.presencePenalty >= 0
                          ? templateItem.presencePenalty
                          : null,
                      )
                      .data(
                        'TinyAI-frequency-penalty',
                        typeof templateItem.frequencyPenalty === 'number' &&
                          !Number.isNaN(templateItem.frequencyPenalty) &&
                          templateItem.frequencyPenalty >= 0
                          ? templateItem.frequencyPenalty
                          : null,
                      )
                      // Option name
                      .text(templateItem.name)

                      // Option is disabled?
                      .prop(
                        'disabled',
                        typeof templateItem.disabled === 'boolean' ? templateItem.disabled : false,
                      ),
                  );
              }
              // Separator
              else if (valueTypeValidator()) addSeparator();
            }
          }

          // Option selected
          textareaAdd.on('change', () => {
            // Get value
            const option = textareaAdd.find(`[value="${textareaAdd.val()}"]`);
            const text = option ? option.data('TinyAI-select-text') : null || null;

            const tempValue = option.data('TinyAI-temperature') || null;
            const maxOutputTokensValue = option.data('TinyAI-max-output-tokens') || null;

            const topPValue = option.data('TinyAI-topP') || null;
            const topKValue = option.data('TinyAI-topK') || null;
            const presencePenaltyValue = option.data('TinyAI-presence-penalty') || null;
            const frequencyPenaltyValue = option.data('TinyAI-frequency-penalty') || null;

            if (typeof tempValue === 'number') tinyAi.setTemperature(tempValue);
            if (typeof maxOutputTokensValue === 'number')
              tinyAi.setMaxOutputTokens(maxOutputTokensValue);
            if (typeof topPValue === 'number') tinyAi.setTopP(topPValue);
            if (typeof topKValue === 'number') tinyAi.setTopK(topKValue);
            if (typeof presencePenaltyValue === 'number')
              tinyAi.setPresencePenalty(presencePenaltyValue);
            if (typeof frequencyPenaltyValue === 'number')
              tinyAi.setFrequencyPenalty(frequencyPenaltyValue);

            textareaAdd.val('DEFAULT');

            // Insert text
            if (typeof text === 'string' && text.length > 0) {
              // Cursor position
              const start = textarea.prop('selectionStart');
              const end = textarea.prop('selectionEnd');

              // Textarea content
              const content = textarea.val();

              // Insert new text
              textarea.val(content.substring(0, start) + text + content.substring(end));

              // New cursor position
              const newCursorPosition = start + text.length;
              textarea
                .prop('selectionStart', newCursorPosition)
                .prop('selectionEnd', newCursorPosition)
                .focus();
            }
          });

          // Insert into body
          body.append(textareaAdd);
        }

        // Add textarea
        body.append($('<p>').text(config.info));
        body.append(textarea);

        // Submit
        const submit = $('<button>', { class: 'btn btn-info m-2 ms-0' });
        submit.text(config.submitName);

        submit.on('click', () => {
          config.submitCall(textarea.val());
          $(`#${config.id}`).modal('hide');
        });

        if (config.readOnly) submit.prop('disabled', true).addClass('disabled');

        body.append($('<div>', { class: 'd-grid gap-2 col-6 mx-auto' }).append(submit));

        // Start modal
        tinyLib.modal({
          id: config.id,
          title: 'AI Prompt',
          dialog: 'modal-lg',
          body,
        });
      };

      // Left
      const sidebarLeft = $('<div>', sidebarStyle).append(
        $('<ul>', { class: 'list-unstyled' }).append(
          $('<li>', { id: 'ai-mode-list', class: 'mb-3' }).append(
            // Modes
            $('<h5>').text('Modes'),

            // Fic Talk
            ficTemplates,

            // Settings
            $('<h5>').text('Settings'),
            ficPromptItems,

            // Import
            $('<h5>').text('Data'),
            importItems,

            // Export
            createButtonSidebar('fa-solid fa-file-export', 'Export', () => {
              const exportData = {
                file: clone(tinyAi.getData()),
                id: tinyAi.getId(),
              };

              if (!canSandBox(ficConfigs.selected)) delete exportData.file.systemInstruction;

              if (exportData.file.file) delete exportData.file.file;

              saveAs(
                new Blob([JSON.stringify(exportData)], { type: 'text/plain' }),
                `Pony Driland - ${tinyAi.getId()} - AI Export.json`,
              );
            }),

            // Downloads
            createButtonSidebar('fa-solid fa-download', 'Downloads', () => {
              const body = $('<div>');
              body.append(
                $('<h3>')
                  .text(`Download Content`)
                  .prepend($('<i>', { class: 'fa-solid fa-download me-3' }))
                  .append(
                    $('<button>', { class: 'ms-3 btn btn-info btn-sm' })
                      .text('Save As all chapters')
                      .on('click', () => saveRoleplayFormat()),
                  ),
                $('<h5>')
                  .text(
                    `Here you can download the official content of fic to produce unofficial content dedicated to artificial intelligence.`,
                  )
                  .append(
                    $('<br/>'),
                    $('<small>').text('Remember that you are downloading the uncensored version.'),
                  ),
              );

              for (let i = 0; i < storyData.chapter.amount; i++) {
                // Chapter Number
                const chapter = String(i + 1);

                // Add Chapter
                body.append(
                  $('<div>', { class: 'card' }).append(
                    $('<div>', { class: 'card-body' }).append(
                      $('<h5>', { class: 'card-title m-0' })
                        .text(`Chapter ${chapter} - `)
                        .append(
                          $('<small>').text(storyCfg.chapterName[chapter].title),
                          $('<a>', {
                            class: 'btn btn-primary m-2 me-0 btn-sm',
                            href: `/chapter/${chapter}.html`,
                            chapter: chapter,
                          })
                            .on('click', function () {
                              // Save Chapter
                              saveRoleplayFormat(Number($(this).attr('chapter')));

                              // Complete
                              return false;
                            })
                            .text('Save as'),
                        ),
                    ),
                  ),
                );
              }

              body.append(
                $('<p>', { class: 'm-0' }).text(
                  `This content is ready for AI to know which lines of text, chapters, day number, weather, location on any part of the fic you ask. The website script will convert all content to be easily understood by AI languages.`,
                ),
              );

              tinyLib.modal({
                id: 'ai_downloads',
                title: 'AI Downloads',
                dialog: 'modal-lg',
                body,
              });
            }),

            // Tiny information
            $('<hr/>', { class: 'border-white' }),
            $('<div>', { class: 'small text-grey' }).text(
              'AI makes mistakes, so double-check it. AI does not replace the fic literature (Careful! AI can type spoilers!).',
            ),
          ),
        ),
      );

      // Right
      const sidebarSettingTemplate = { span: { class: 'pb-2 d-inline-block' } };
      const sidebarRightBase = {
        // Model Selector
        modelSelector: $('<div>', {
          class: 'form-floating',
          title: 'The AI model used here',
        }).append(
          modelSelector,
          $('<label>', { for: 'select-ai-model' })
            .text('Select AI Model')
            .prepend($('<i>', { class: `fa-solid fa-atom me-2` })),
        ),

        // Token Counter
        tokenCounter: $('<div>', {
          class: 'mt-3',
          title: 'Counts how many tokens are used for the content generation',
        }).append(
          $('<span>')
            .text('Token count')
            .prepend($('<i>', { class: `fa-solid fa-magnifying-glass me-2` })),
          $('<div>', { class: 'mt-1 small' }).append(
            tokenCount.amount,
            $('<span>', { class: 'mx-1' }).text('/'),
            tokenCount.total,
          ),
        ),

        // Temperature
        temperature: $('<div>', {
          class: 'mt-3',
          title: 'Creativity allowed in the responses',
        }).append(
          $('<span>', sidebarSettingTemplate.span)
            .text('Temperature')
            .prepend(
              $('<i>', {
                class: `fa-solid fa-temperature-three-quarters me-2`,
              }),
            ),
          temperature.insert(),
        ),

        // Output Length
        outputLength: $('<div>', {
          class: 'mt-3',
          title: 'Maximum number of tokens in response',
        }).append(
          $('<span>', sidebarSettingTemplate.span)
            .text('Output length')
            .prepend($('<i>', { class: `fa-solid fa-comment me-2` })),
          outputLength,
        ),

        // Top P
        topP: $('<div>', {
          class: 'mt-3',
          title: 'The maximum cumulative probability of tokens to consider when sampling',
        }).append(
          $('<span>', sidebarSettingTemplate.span)
            .text('Top P')
            .prepend($('<i>', { class: `fa-solid fa-percent me-2` })),
          topP.insert(),
        ),

        // Top K
        topK: $('<div>', {
          class: 'mt-3',
          title: 'The maximum number of tokens to consider when sampling',
        }).append(
          $('<span>', sidebarSettingTemplate.span)
            .text('Top K')
            .prepend($('<i>', { class: `fa-solid fa-0 me-2` })),
          topK.insert(),
        ),

        // Presence penalty
        presencePenalty: $('<div>', {
          class: 'mt-3',
          title:
            "Presence penalty applied to the next token's logprobs if the token has already been seen in the response",
        }).append(
          $('<span>', sidebarSettingTemplate.span)
            .text('Presence penalty')
            .prepend($('<i>', { class: `fa-solid fa-hand me-2` })),
          presencePenalty.insert(),
        ),

        // Frequency penalty
        frequencyPenalty: $('<div>', {
          class: 'mt-3',
          title:
            "Frequency penalty applied to the next token's logprobs, multiplied by the number of times each token has been seen in the respponse so far",
        }).append(
          $('<span>', sidebarSettingTemplate.span)
            .text('Frequency penalty')
            .prepend($('<i>', { class: `fa-solid fa-hand me-2` })),
          frequencyPenalty.insert(),
        ),
      };

      // Active tooltip
      sidebarRightBase.tokenCounter.tooltip();
      sidebarRightBase.temperature.tooltip();
      sidebarRightBase.outputLength.tooltip();
      sidebarRightBase.topP.tooltip();
      sidebarRightBase.topK.tooltip();
      sidebarRightBase.presencePenalty.tooltip();
      sidebarRightBase.frequencyPenalty.tooltip();

      // Models list
      const updateModelList = () => {
        const models = tinyAi.getModelsList();
        resetModelSelector();
        if (models.length > 0) {
          // Insert model
          const insertItem = (id, displayName, disabled = false) =>
            modelSelector.append(
              $('<option>', { value: id }).prop('disabled', disabled).text(displayName),
            );

          // Get models
          for (const index in models) {
            // Normal insert
            if (!models[index].category && !Array.isArray(models[index].data))
              insertItem(models[index].id, models[index].displayName);
            // Category insert
            else {
              // Category
              insertItem(
                models[index].category,
                models[index].displayName || models[index].category,
                true,
              );

              // Category items
              for (const index2 in models[index].data) {
                insertItem(models[index].data[index2].id, models[index].data[index2].displayName);
              }
            }
          }

          // New model value
          modelSelector.val(
            localStorage.getItem('tiny-ai-storage-model-selected') || tinyAi.getModel(),
          );
          modelSelector.trigger('change');
        }
      };

      const insertDefaultSettings = (model, newModel) => {
        tinyAi.setModel(newModel, ficConfigs.selected);
        presencePenalty.disable();
        frequencyPenalty.disable();

        tokenCount.updateValue('total', model.inputTokenLimit);

        outputLength
          .val(model.outputTokenLimit)
          .prop('disabled', false)
          .removeClass('disabled')
          .trigger('input');

        temperature.setMin(0).setStep(0.1).setMax(model.maxTemperature).enable();
        if (temperature.val() > model.maxTemperature) temperature.val(model.maxTemperature);
        temperature.trigger('input');

        if (typeof model.topP === 'number')
          topP.val(model.topP).setMax(1).setMin(0).setStep(0.1).enable().trigger('input');
        else topP.reset().disable();

        if (typeof model.topK === 'number')
          topK.val(model.topK).setMax(100).setMin(0).setStep(1).enable().trigger('input');
        else topK.reset().disable();
      };

      const selectModel = (newModel, ignoreTokenUpdater = false) => {
        const model = tinyAi.getModelData(newModel);
        if (model) {
          insertDefaultSettings(model, newModel);
          localStorage.setItem('tiny-ai-storage-model-selected', newModel);
          if (tinyAi.getData()) tinyAi.setModel(newModel, ficConfigs.selected);
        } else {
          tokenCount.total.text(0);
          temperature.reset().disable();
          outputLength.val(0).prop('disabled', true).addClass('disabled');
          topP.reset().disable();
          topK.reset().disable();
          presencePenalty.reset().disable();
          frequencyPenalty.reset().disable();
          localStorage.removeItem('tiny-ai-storage-model-selected');
        }

        if (!isFirstTime && !ignoreTokenUpdater && !modelSelector.prop('disabled'))
          updateAiTokenCounterData(undefined, true);
      };

      modelSelector.on('change', () => selectModel(modelSelector.val()));

      // Load more models
      const loadMoreModels = createButtonSidebar(
        'fa-solid fa-bars-progress',
        'Load more models',
        async () => {
          $.LoadingOverlay('show', { background: 'rgba(0,0,0, 0.5)' });
          await tinyAi.getModels(100);

          if (!tinyAi._nextModelsPageToken) {
            loadMoreModels.addClass('disabled');
            loadMoreModels.prop('disabled', true);
          }

          updateModelList();
          $.LoadingOverlay('hide');
        },
        !tinyAi._nextModelsPageToken,
      );

      const resetSettingsButton = createButtonSidebar(
        'fa-solid fa-rotate-right',
        'Reset default settings',
        () => {
          const model = tinyAi.getModelData(modelSelector.val());
          if (model) {
            temperature.val(1);
            insertDefaultSettings(model, modelSelector.val());
          }
        },
      );

      const sidebarRight = $('<div>', sidebarStyle).append(
        $('<ul>', { class: 'list-unstyled' }).append(
          $('<h5>').text('Run Settings'),
          sidebarRightBase.modelSelector,
          sidebarRightBase.tokenCounter,
          sidebarRightBase.temperature,
          sidebarRightBase.outputLength,
          sidebarRightBase.topP,
          sidebarRightBase.topK,
          sidebarRightBase.presencePenalty,
          sidebarRightBase.frequencyPenalty,

          $('<hr/>', { class: 'm-2' }),

          // Load more models
          loadMoreModels,

          // Reset Settings
          resetSettingsButton,
        ),
      );

      // Execute messages
      const prepareContentList = (addIndexList = false) => {
        // Prepare history
        const history = tinyAi.getData();
        const content = [];
        const indexList = [];

        let systemData = null;
        let fileData = null;
        let promptData = null;

        if (history) {
          if (
            typeof history.systemInstruction === 'string' &&
            history.systemInstruction.length > 0
          ) {
            systemData = {
              role: 'system',
              parts: [{ text: history.systemInstruction }],
            };
            content.push(systemData);
          }

          if (history.file) {
            fileData = {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mime_type: history.file.mime,
                    data: history.file.data,
                  },
                },
              ],
            };
            content.push(fileData);
          }

          if (typeof history.prompt === 'string' && history.prompt.length > 0) {
            promptData = {
              role: 'user',
              parts: [{ text: history.prompt }],
            };
            content.push(promptData);
          }

          for (const index in history.data) {
            if (addIndexList) indexList.push(history.data[index]);
            content.push(history.data[index]);
          }
        }

        return { content, indexList, systemData, promptData, fileData };
      };

      const getAiTokens = (hashItems = { data: [] }, forceUpdate = false) =>
        new Promise(async (resolve, reject) => {
          try {
            const { content, indexList, systemData, promptData, fileData } =
              prepareContentList(true);
            if (content.length > 0) {
              // Get tokens data
              const updateTokenData = async (
                name,
                contentToCheck,
                hash = null,
                oldHash = null,
                tinyTokens = { count: null },
                callback,
              ) => {
                if (
                  forceUpdate ||
                  // Exist content to check tokens
                  (hash &&
                    contentToCheck && // Model
                    ((typeof hashItems.model === 'string' &&
                      hashItems.model !== objHash(tinyAi.getModel())) ||
                      // Hash
                      (typeof oldHash === 'string' && oldHash !== hash) ||
                      // Token Count
                      typeof tinyTokens.count !== 'number' ||
                      Number.isNaN(tinyTokens.count) ||
                      !Number.isFinite(tinyTokens.count) ||
                      tinyTokens.count < 1) &&
                    // Callback
                    typeof callback === 'function')
                ) {
                  console.log(`[tiny-ai] Executing token counter in "${name}".`);
                  const newTokens = await tinyAi.countTokens(
                    Array.isArray(contentToCheck) ? contentToCheck : [contentToCheck],
                  );

                  const newToken =
                    newTokens && typeof newTokens.totalTokens === 'number'
                      ? newTokens.totalTokens
                      : null;
                  if (typeof newToken === 'number') callback(newToken);
                }
              };

              // Prompt
              await updateTokenData(
                'prompt',
                promptData,
                tinyAi.getHash('prompt'),
                typeof hashItems.prompt === 'string' ? hashItems.prompt : null,
                { count: tinyAi.getTokens('prompt') },
                (newCount) => tinyAi.setPrompt(null, newCount),
              );

              // File
              await updateTokenData(
                'file',
                fileData,
                tinyAi.getHash('file'),
                typeof hashItems.file === 'string' ? hashItems.file : null,
                { count: tinyAi.getTokens('file') },
                (newCount) => tinyAi.setFileData(null, null, false, newCount),
              );

              // System Instruction
              const systemCheck = clone(systemData);
              systemCheck.role = 'user';
              await updateTokenData(
                'systemInstruction',
                systemCheck,
                tinyAi.getHash('systemInstruction'),
                typeof hashItems.systemInstruction === 'string'
                  ? hashItems.systemInstruction
                  : null,
                { count: tinyAi.getTokens('systemInstruction') },
                (newCount) => tinyAi.setSystemInstruction(null, newCount),
              );

              // Read messages
              for (const index in indexList) {
                await updateTokenData(
                  'message',
                  indexList[index],
                  tinyAi.getMsgHashByIndex(index),
                  typeof hashItems.data[index] === 'string' ? hashItems.data[index] : null,
                  tinyAi.getMsgTokensByIndex(index) || { count: null },
                  (newCount) => tinyAi.replaceIndex(index, null, { count: newCount }),
                );
              }

              resolve(tinyAi.getTotalTokens());
            } else resolve(0);
          } catch (err) {
            reject(err);
          }
        });

      // Get Ai Tokens
      const updateAiTokenCounterData = (hashItems, forceReset = false) => {
        const history = tinyAi.getData();
        if (history) {
          enableReadOnly(true);
          modelChangerReadOnly();
          disablePromptButtons(true);
          enableModelReadOnly();
          enableMessageButtons(false);
          const oldMsgInput = msgInput.val();

          let points = '.';
          let secondsWaiting = -1;
          const loadingMoment = () => {
            points += '.';
            if (points === '....') points = '.';

            secondsWaiting++;
            msgInput.val(`(${secondsWaiting}s) Loading model data${points}`);
          };
          const loadingMessage = setInterval(loadingMoment, 1000);
          loadingMoment();

          const stopLoadingMessage = () => {
            clearInterval(loadingMessage);
            msgInput.val(oldMsgInput);
            enableReadOnly(false);
            modelChangerReadOnly(false);
            disablePromptButtons(false);
            enableModelReadOnly(false);
            enableMessageButtons(true);
            msgInput.focus();
          };

          getAiTokens(hashItems || undefined, forceReset)
            .then((totalTokens) => {
              if (typeof totalTokens === 'number') tokenCount.updateValue('amount', totalTokens);
              else tokenCount.updateValue('amount', 0);
              stopLoadingMessage();
            })
            .catch((err) => {
              alert(err.message, 'Error get AI tokens');
              console.error(err);
              stopLoadingMessage();
            });
        }
      };

      // Execute AI script
      const executeAi = (tinyCache = {}, sentId = null, tinyController = undefined) =>
        new Promise((resolve, reject) => {
          const { content } = prepareContentList();

          // Insert tokens
          const amountTokens = {
            total: null,
            data: { candidates: null, prompt: null, total: null },
          };

          const buildAmountTokens = (tokenUsage) => {
            // Build amount tokens
            if (tokenUsage) {
              // Preparing entire amount
              if (!tokenUsage.isResult) amountTokens.total = tokenUsage.count.prompt;
              // The prompt result amount
              else {
                amountTokens.data.candidates = tokenUsage.count.candidates;
                amountTokens.data.prompt = tokenUsage.count.prompt;
                amountTokens.data.total = tokenUsage.count.total;
                // Add the value of the user prompt
                if (typeof sentId === 'number')
                  tinyAi.replaceIndex(tinyAi.getIndexOfId(sentId), null, {
                    count: amountTokens.data.prompt || null,
                  });
              }
            }

            // Fix total tokens
            if (typeof amountTokens.total === 'number')
              tokenCount.updateValue('amount', amountTokens.total);
            const totalAmountToken = tinyAi.getTotalTokens();
            if (totalAmountToken > amountTokens.total)
              tokenCount.updateValue('amount', totalAmountToken);
          };

          // Insert message
          let isComplete = false;
          const insertMessage = (msgData, role, finishReason = null) => {
            if (!tinyCache.msgBallon) {
              tinyCache.msgBallon = makeMessage(
                {
                  message: msgData,
                  finishReason,
                  id: tinyCache.msgId,
                },
                role === 'user' ? null : tinyLib.toTitleCase(role),
              );
              addMessage(tinyCache.msgBallon);
            } else {
              tinyCache.msgBallon.find('.ai-msg-ballon').empty().append(makeMsgRenderer(msgData));
              scrollChatContainerToTop();
            }
          };

          // Cancel task
          let isCanceled = false;
          tinyCache.cancel = () => {
            if (!isCanceled) {
              if (tinyCache.msgBallon) tinyCache.msgBallon.remove();
              if (typeof tinyCache.msgId === 'number' || typeof tinyCache.msgId === 'string')
                tinyAi.deleteIndex(tinyAi.getIndexOfId(tinyCache.msgId));
              completeTask();
              isCanceled = true;
            }
          };

          // Task complete!
          const completeTask = () => {
            if (typeof tinyCache.msgId !== 'undefined') delete tinyCache.msgId;
            if (typeof tinyCache.msgBallon !== 'undefined') delete tinyCache.msgBallon;
            if (typeof tinyCache.cancel !== 'undefined') delete tinyCache.cancel;
          };

          // Content Generator
          tinyAi
            .genContent(content, tinyAi.getModel(), tinyController, (chuck) => {
              isComplete = chuck.done;
              // Update tokens
              buildAmountTokens(chuck.tokenUsage);
              const promptTokens = amountTokens.data.candidates || 0;

              // Read contents
              if (chuck.contents) {
                for (const index in chuck.contents) {
                  // Update history
                  if (typeof tinyCache.msgId === 'undefined')
                    tinyCache.msgId = tinyAi.addData(chuck.contents[index], {
                      count: promptTokens || null,
                    });
                  else
                    tinyAi.replaceIndex(
                      tinyAi.getIndexOfId(tinyCache.msgId),
                      chuck.contents[index],
                      { count: promptTokens || null },
                    );

                  // Send insert request
                  if (typeof chuck.contents[index].parts[0].text === 'string')
                    insertMessage(
                      chuck.contents[index].parts[0].text,
                      chuck.contents[index].role,
                      chuck.contents[index].finishReason,
                    );

                  // Update message cache
                  const oldBallonCache = tinyCache.msgBallon.data('tiny-ai-cache');
                  oldBallonCache.msg = chuck.contents[index].parts[0].text;
                  tinyCache.msgBallon.data('tiny-ai-cache', oldBallonCache);

                  // Add class
                  tinyCache.msgBallon.addClass('entering-ai-message');
                }
              }

              // Remove class
              if (isComplete) {
                const notificationError = () =>
                  tinyNotification.send('System', 'Your message was not processed.');

                if (tinyCache.msgBallon) {
                  tinyCache.msgBallon.removeClass('entering-ai-message');
                  const ballonCache = tinyCache.msgBallon.data('tiny-ai-cache');
                  if ($('body').hasClass('windowHidden')) {
                    if (ballonCache) tinyNotification.send(ballonCache.role, ballonCache.msg);
                    else notificationError();
                  }
                } else if ($('body').hasClass('windowHidden')) notificationError();
                completeTask();
              }
            })
            .then((result) => {
              if (!result.error) {
                // Insert tokens
                buildAmountTokens(result.tokenUsage);
                const promptTokens = amountTokens.data.candidates || 0;

                // Insert content
                for (const index in result.contents) {
                  const msg = result.contents[index];
                  if (
                    msg &&
                    msg.parts &&
                    msg.parts[0] &&
                    typeof msg.parts[0].text === 'string' &&
                    msg.parts[0].text.length > 0
                  ) {
                    // Update history
                    if (typeof tinyCache.msgId === 'undefined')
                      tinyCache.msgId = tinyAi.addData(msg, { count: promptTokens || null });
                    else
                      tinyAi.replaceIndex(tinyAi.getIndexOfId(tinyCache.msgId), msg, {
                        count: promptTokens || null,
                      });

                    // Send message request
                    insertMessage(msg.parts[0].text, msg.role, msg.finishReason);

                    // Update message data
                    const oldBallonCache = tinyCache.msgBallon.data('tiny-ai-cache');
                    oldBallonCache.msg = msg.parts[0].text;
                    tinyCache.msgBallon.data('tiny-ai-cache', oldBallonCache);
                  }
                }
              }

              // Error
              else {
                console.log(`AI Generator Error`, result.error);
                alert(result.error.message);
                if (typeof result.error.message === 'string' && result.error.message.length > 0)
                  tinyNotification.send('Ai Error', result.error.message);
              }

              // Complete
              completeTask();
              resolve(result);
            })
            .catch(reject);
        });

      // Textarea input edition
      const createTextareaInputExition = (
        minHeight = 38,
        maxHeight = 150,
        moreConfig = {},
        callback = null,
      ) => {
        // Create textarea
        const textarea = $('<textarea>', {
          style: [
            `min-height: ${minHeight}px`,
            `height: ${minHeight}px`,
            `max-height: ${maxHeight}px` /* Max lines (5 lines = 150px.) */,
            'resize: none',
          ].join('; '),
          ...moreConfig,
        });

        textarea.on('input', () => {
          // Reset for minimum height before recalculating
          const value = textarea.val();
          const lines = value.split('\n').length;
          textarea.css('height', 'auto');

          // Get scrollHeight via jQuery
          const newHeight = textarea.prop('scrollHeight');
          const height = lines > 1 ? Math.min(newHeight, maxHeight) : minHeight;

          // Defines height, but respects the maximum limit
          textarea.css('height', `${String(height)}px`);
          if (typeof callback === 'function') callback({ height, newHeight, lines, value });
        });

        // Complete
        return textarea;
      };

      // Input
      const msgInputValues = { minHeight: 38, maxHeight: 150 };
      const msgInput = createTextareaInputExition(
        msgInputValues.minHeight,
        msgInputValues.maxHeight,
        {
          class: 'form-control border-dark',
          placeholder: 'Type your message...',
        },
        (inputResult) => {
          const { height } = inputResult;
          const { minHeight } = msgInputValues;

          // Subtract the new height by the min size to get the exact amount of height created
          const tinyFinalValue = height - minHeight;

          // Get the current scroll position before adding new content
          const scrollBefore = chatContainer.scrollTop();
          const heightBefore = chatContainer.prop('scrollHeight');

          // And use this to correct the size of other elements
          chatContainer.css('padding-bottom', `${String(tinyFinalValue)}px`);

          textInputContainer.css({
            position: 'relative',
            top: `-${String(tinyFinalValue)}px`,
          });

          // Get the new scroll height after adding content
          const heightAfter = chatContainer.prop('scrollHeight');
          const heightDiff = heightAfter - heightBefore;

          // Adjust the scroll position to maintain the user's view
          chatContainer.scrollTop(scrollBefore + heightDiff);
        },
      );

      // Submit
      const msgSubmit = $('<button>', {
        class: 'btn btn-primary input-group-text-dark',
        text: 'Send',
      });

      const cancelSubmit = $('<button>', {
        class: 'btn btn-primary input-group-text-dark rounded-end',
        text: 'Cancel',
      });

      const submitCache = {};
      msgSubmit.on('click', async () => {
        if (!msgInput.prop('disabled')) {
          // Prepare to get data
          msgInput.blur();
          const msg = msgInput.val();
          msgInput.val('').trigger('input');

          const controller = new AbortController();
          enableReadOnly(true, controller);
          enableMessageButtons(false);
          modelChangerReadOnly();
          disablePromptButtons(true);
          enableModelSelectorReadOnly(true);

          let points = '.';
          let secondsWaiting = -1;
          const loadingMoment = () => {
            points += '.';
            if (points === '....') points = '.';

            secondsWaiting++;
            msgInput.val(`(${secondsWaiting}s) Waiting response${points}`);
          };
          const loadingMessage = setInterval(loadingMoment, 1000);
          loadingMoment();

          // Add new message
          let sentId = null;
          if (typeof msg === 'string' && msg.length > 0) {
            sentId = tinyAi.addData(
              tinyAi.buildContents(
                null,
                {
                  role: 'user',
                  parts: [{ text: msg }],
                },
                'user',
              ),
            );
            addMessage(
              makeMessage({
                message: msg,
                id: sentId,
              }),
            );
          }

          // Execute Ai
          await executeAi(submitCache, sentId, controller).catch((err) => {
            if (submitCache.cancel) submitCache.cancel();
            console.error(err);
            alert(err.message);
          });

          // Complete
          clearInterval(loadingMessage);
          disablePromptButtons(false);
          msgInput.val('');

          enableMessageButtons(true);
          enableReadOnly(false);
          modelChangerReadOnly(false);
          enableModelSelectorReadOnly(false);
          msgInput.focus();
        }
      });

      msgInput.on('keydown', function (event) {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          msgSubmit.trigger('click');
        }
      });

      // First Dialogue button
      const firstDialogueBase = {
        base: $('<div>', {
          class: 'first-dialogue-base position-absolute  top-50 start-50 translate-middle',
          style: 'pointer-events: none;',
        }),

        button: $('<button>', {
          title: 'Insert first dialogue',
          class: 'btn btn-lg btn-bg d-flex justify-content-center align-items-center',
          style: [
            'pointer-events: all',
            'height: 150px',
            'font-size: 100px',
            'background-color: transparent !important',
          ].join('; '),
        }),
      };

      firstDialogueBase.button.append($('<i>', { class: 'fa-solid fa-circle-play' }));

      firstDialogueBase.button.on('click', () => {
        enabledFirstDialogue(false);
        const history = tinyAi.getData();

        // Insert first message
        if (history.data.length < 1 && typeof history.firstDialogue === 'string') {
          const msgId = tinyAi.addData(
            tinyAi.buildContents(
              null,
              {
                role: 'model',
                parts: [{ text: history.firstDialogue }],
              },
              'model',
            ),
          );

          addMessage(
            makeMessage(
              {
                message: history.firstDialogue,
                id: msgId,
              },
              'Model',
            ),
          );

          updateAiTokenCounterData();
        }
      });

      firstDialogueBase.base.append(firstDialogueBase.button);

      // Message List
      const msgList = $('<div>', {
        class: 'p-3',
        style: 'margin-bottom: 55px !important;',
      });

      const scrollChatContainerToTop = (speed = 0) =>
        chatContainer.animate(
          {
            scrollTop: chatContainer.prop('scrollHeight'),
          },
          speed,
        );

      const addMessage = (item) => {
        msgList.append(item);
        scrollChatContainerToTop();
      };

      // Message Maker
      const makeMsgRenderer = (msg) => {
        const renderer = new marked.Renderer();
        const final = '<span class="final-ai-icon">';
        // | █ ▌▐ _

        // Remove links and html
        renderer.link = (href, title, text) => `<span>${text}</span>`;
        renderer.image = () => ``;
        renderer.html = (data) => {
          if (data.raw !== final || data.text !== final) return ``;
          else return `${final}█</span>`;
        };

        // Fix del
        renderer.del = function (data) {
          if (data.raw.startsWith('~') && data.raw.endsWith('~') && !data.raw.startsWith('~~')) {
            return data.raw;
          }
          return `<del>${data.text}</del>`;
        };

        // Complete
        let newMsg = `${msg}`;
        while (newMsg.endsWith('\n')) {
          newMsg = newMsg.slice(0, -1);
        }

        while (newMsg.startsWith('\n')) {
          newMsg = newMsg.slice(1);
        }

        return marked.parse(
          `${newMsg}${final}`.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, ''),
          {
            renderer: renderer,
            breaks: true,
          },
        );
      };

      const makeMsgWarning = (finishReason) => {
        const tinyError = tinyAi.getErrorCode(finishReason);
        if (tinyError && typeof tinyError.text === 'string' && !tinyError.hide)
          return $('<div>')
            .addClass('mt-2 mb-0 alert alert-danger alert-dismissible fade show')
            .attr('role', 'alert')
            .text(tinyError.text)
            .prepend($('<i>').addClass('fas fa-exclamation-triangle me-2'))
            .append(
              $('<button>').addClass('btn-close').attr({
                type: 'button',
                'data-bs-dismiss': 'alert',
              }),
            );
        return null;
      };

      const makeMessage = (
        data = { message: null, finishReason: null, id: -1 },
        username = null,
      ) => {
        // Prepare renderer
        const tinyCache = {
          msg: data.message,
          role: username ? tinyLib.toTitleCase(username) : 'User',
        };

        const msgBase = $('<div>', {
          class: `p-3${typeof username !== 'string' ? ' d-flex flex-column align-items-end' : ''} ai-chat-data`,
        });

        const msgBallon = $('<div>', {
          class: `bg-${typeof username === 'string' ? 'secondary d-inline-block' : 'primary'} text-white p-2 rounded ai-msg-ballon`,
        });

        msgBase.data('tiny-ai-cache', tinyCache);
        const isIgnore = typeof data.id !== 'number' || data.id < 0;
        const tinyIndex = tinyAi.getIndexOfId(data.id);

        // Edit message panel
        const editPanel = $('<div>', { class: 'ai-text-editor' });
        editPanel.append(
          // Edit button
          !isIgnore && tinyIndex > -1
            ? $('<button>', { class: 'btn btn-sm btn-bg' })
                .append($('<i>', { class: 'fa-solid fa-pen-to-square' }))
                .on('click', () => {
                  // Text
                  const textInput = $('<textarea>', { class: 'form-control' });
                  textInput.val(tinyCache.msg);
                  const oldMsg = tinyCache.msg;

                  // Submit
                  const submitButton = $('<button>', {
                    class: `w-100 me-2 btn btn-${typeof username !== 'string' ? 'secondary d-inline-block' : 'primary'} mt-2`,
                    text: 'Submit',
                  });

                  const cancelButton = $('<button>', {
                    class: `w-100 btn btn-${typeof username !== 'string' ? 'secondary d-inline-block' : 'primary'} mt-2`,
                    text: 'Cancel',
                  });

                  const closeReplace = () => {
                    msgBallon.removeClass('w-100').empty();
                    msgBallon.append(makeMsgRenderer(tinyCache.msg));
                  };

                  submitButton.on('click', () => {
                    tinyCache.msg = textInput.val();
                    const newMsg = tinyCache.msg;
                    if (typeof oldMsg !== 'string' || oldMsg !== newMsg) {
                      const newContent = tinyAi.getIndex(tinyIndex);
                      newContent.parts[0].text = tinyCache.msg;
                      tinyAi.replaceIndex(tinyIndex, newContent, { count: null });
                      closeReplace();
                      updateAiTokenCounterData();
                    } else closeReplace();
                  });

                  cancelButton.on('click', () => closeReplace());

                  // Complete
                  msgBallon
                    .empty()
                    .addClass('w-100')
                    .append(
                      textInput,
                      $('<div>', { class: 'd-flex mx-5' }).append(submitButton, cancelButton),
                    );
                })
            : null,

          // Delete button
          $('<button>', { class: 'btn btn-sm btn-bg' })
            .append($('<i>', { class: 'fa-solid fa-trash-can' }))
            .on('click', () => {
              const tinyIndex = tinyAi.getIndexOfId(data.id);
              if (!isIgnore && tinyIndex > -1) {
                const tinyTokens = tinyAi.getMsgTokensByIndex(tinyIndex);
                tinyAi.deleteIndex(tinyIndex);
                const amount = tokenCount.getValue('amount');
                tokenCount.updateValue(
                  'amount',
                  amount - Number(tinyTokens && tinyTokens.count ? tinyTokens.count : 0),
                );
              }

              msgBase.remove();
              enabledFirstDialogue();
            }),
        );

        // Send message
        return msgBase.append(
          editPanel,
          msgBallon.append(makeMsgRenderer(tinyCache.msg)),
          $('<div>', {
            class: `text-muted small mt-1${typeof username !== 'string' ? ' text-end' : ''}`,
            text: typeof username === 'string' ? username : 'User',
          }),
          makeMsgWarning(data.finishReason),
        );
      };

      // Container
      const chatContainer = $('<div>', {
        id: 'ai-chatbox',
        class: 'h-100 body-background',
        style: 'overflow-y: auto; margin-bottom: -54px;',
      });

      const textInputContainer = $('<div>', {
        class: 'input-group pb-3 body-background',
      }).append(msgInput, cancelSubmit, msgSubmit);

      const container = $('<div>', {
        class: 'd-flex h-100 y-100',
        id: 'ai-element-root',
      }).append(
        sidebarLeft,
        // Main container
        $('<div>', { class: 'flex-grow-1 d-flex flex-column' }).append(
          firstDialogueBase.base,
          $('<div>', { class: 'justify-content-center h-100' }).append(
            // Chat Messages Area
            chatContainer.append(msgList),

            // Input Area
            $('<div>', { class: 'px-3 d-inline-block w-100' }).append(textInputContainer),
          ),
        ),
        sidebarRight,
      );

      firstDialogueBase.button.tooltip();

      // Prepare events
      tinyAi.removeAllListeners('setMaxOutputTokens');
      tinyAi.removeAllListeners('setTemperature');
      tinyAi.removeAllListeners('setTopP');
      tinyAi.removeAllListeners('setTopK');
      tinyAi.removeAllListeners('setPresencePenalty');
      tinyAi.removeAllListeners('setFrequencyPenalty');

      tinyAi.on('setMaxOutputTokens', (value) => outputLength.val(value));
      tinyAi.on('setTemperature', (value) => temperature.val(value));
      tinyAi.on('setTopP', (value) => topP.val(value));
      tinyAi.on('setTopK', (value) => topK.val(value));
      tinyAi.on('setPresencePenalty', (value) => presencePenalty.val(value));
      tinyAi.on('setFrequencyPenalty', (value) => frequencyPenalty.val(value));

      // Enable Read Only
      const enableModelSelectorReadOnly = (isEnabled = true) => {
        modelSelector.prop('disabled', isEnabled);
        if (isEnabled) modelSelector.addClass('disabled');
        else modelSelector.removeClass('disabled');
      };

      const enableModelReadOnly = (isEnabled = true) => {
        outputLength.prop('disabled', isEnabled);
        enableModelSelectorReadOnly(isEnabled);

        temperature[isEnabled ? 'disable' : 'enable']();
        topP[isEnabled ? 'disable' : 'enable']();
        topK[isEnabled ? 'disable' : 'enable']();
        presencePenalty[isEnabled ? 'disable' : 'enable']();
        frequencyPenalty[isEnabled ? 'disable' : 'enable']();

        if (isEnabled) outputLength.addClass('disabled');
        else outputLength.removeClass('disabled');
      };

      const enableMessageButtons = (isEnabled = true) => {
        if (isEnabled) chatContainer.removeClass('hide-msg-buttons');
        else chatContainer.addClass('hide-msg-buttons');
      };

      const readOnlyTemplate = (item, isEnabled) => {
        item.prop('disabled', isEnabled);
        if (isEnabled) {
          item.addClass('disabled');
        } else {
          item.removeClass('disabled');
        }
      };

      const enableReadOnly = (isEnabled = true, controller = null) => {
        readOnlyTemplate(msgSubmit, isEnabled);
        readOnlyTemplate(msgInput, isEnabled);
        readOnlyTemplate(cancelSubmit, !isEnabled || !controller);
        if (controller) {
          msgSubmit.addClass('d-none');
          cancelSubmit.removeClass('d-none');
          cancelSubmit.on('click', () => {
            enableReadOnly(false);
            enableMessageButtons(true);
            try {
              if (submitCache.cancel) submitCache.cancel();
              controller.abort();
            } catch (err) {
              console.error(err);
              alert(err.message);
            }
          });
        } else {
          msgSubmit.removeClass('d-none');
          cancelSubmit.addClass('d-none');
          cancelSubmit.off('click');
        }
      };

      const modelChangerReadOnly = (isEnabled = true) => {
        for (const index in ficTemplates) readOnlyTemplate(ficTemplates[index], isEnabled);
        for (const index in importItems) readOnlyTemplate(importItems[index], isEnabled);
      };

      // First Dialogue script
      const enabledFirstDialogue = (isEnabled = true) => {
        // Insert First Dialogue
        const insertAddFirstDialogue = () => {
          firstDialogueBase.base.removeClass('d-none');
          firstDialogueBase.button.prop('disabled', false).removeClass('disabled');
        };

        // Remove First Dialogue
        const removeAddFirstDialogue = () => {
          firstDialogueBase.base.addClass('d-none');
          firstDialogueBase.button.prop('disabled', true).addClass('disabled');
        };

        // Check need first dialogue
        if (isEnabled) {
          const history = tinyAi.getData();
          if (
            history.data.length < 1 &&
            typeof history.firstDialogue === 'string' &&
            history.firstDialogue.length > 0
          )
            insertAddFirstDialogue();
          else removeAddFirstDialogue();
        } else removeAddFirstDialogue();
      };

      // Disable dialogue buttons
      const disablePromptButtons = (isDisabled = false) => {
        // Execute disable script
        for (const index in ficPromptItems) {
          ficPromptItems[index].prop('disabled', isDisabled);
          if (isDisabled) ficPromptItems[index].addClass('disabled');
          else ficPromptItems[index].removeClass('disabled');
        }
        // First dialogue script
        enabledFirstDialogue(!isDisabled);
      };

      // Clear Messages
      const clearMessages = () => msgList.empty();
      enableReadOnly();
      enableMessageButtons(false);
      disablePromptButtons(true);

      // Welcome
      addMessage(
        makeMessage(
          {
            message: `Welcome to Pony Driland's chatbot! This is a chatbot developed exclusively to interact with the content of fic`,
          },
          'Website',
        ),
      );
      addMessage(
        makeMessage(
          {
            message:
              'This means that whenever the story is updated, I am automatically updated for you to always view the answers of the latest content, because the algorithm of this website converts the content of fic to prompts.' +
              '\n\nChoose something to be done here so we can start our conversation! The chat will not work until you choose an activity to do here',
          },
          'Website',
        ),
      );

      // Complete
      updateModelList();
      $('#markdown-read').append(container);
    } else {
      alert(
        'You did not activate AI mode in your session. Please click the robot icon and activate and then come back here again.',
        'AI Page',
      );
    }

    // Finished
    $.LoadingOverlay('hide');
  };

  // Complete
  return tinyAiScript;
};
