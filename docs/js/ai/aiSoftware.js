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
    if (
      this._selected &&
      (typeof this.storage[this._selected] !== 'string' ||
        this.storage[this._selected].length < 1) &&
      typeof this.storage[this._selected] !== 'number' &&
      !objType(this.storage[this._selected], 'object')
    ) {
      this._selected = null;
      localStorage.removeItem('tiny-ai-storage-selected');
    }
  }

  setSelectedAi(value) {
    this._selected =
      typeof value === 'string' &&
      ((typeof this.storage[value] === 'string' && this.storage[value].length > 0) ||
        typeof this.storage[value] === 'number' ||
        objType(this.storage[value], 'object'))
        ? value
        : null;

    if (this._selected) localStorage.setItem('tiny-ai-storage-selected', this._selected);
    else localStorage.removeItem('tiny-ai-storage-selected');
  }

  selectedAi() {
    return this._selected;
  }

  setApiKey(name, key) {
    if (typeof key === 'string' || typeof key === 'number' || objType(key, 'object')) {
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
    return typeof this.storage[name] === 'string'
      ? { key: this.storage[name] }
      : this.storage[name] || { key: null };
  }
}

const AiScriptStart = (connStore) => {
  const tinyAiScript = {};

  // Read AI Apis
  const tinyIo = { client: null, socket: null, firstTime: true };
  const tinyAi = new TinyAiApi();
  const tinyStorage = new TinyAiStorage();
  let aiLogin = null;
  tinyAiScript.setAiLogin = (newAiLogin) => {
    aiLogin = newAiLogin;
  };

  const canSandBox = (value) => value === 'sandBoxFic' || value === 'noData';

  tinyAiScript.killIo = () => {
    if (tinyIo.client) {
      tinyIo.client.destroy();
      tinyIo.client = null;
      tinyIo.socket = null;
      console.log('[socket-io] Connection destroyed!');
      return true;
    } else return false;
  };

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
    if (typeof selectedAi === 'string' && selectedAi.length > 0 && selectedAi !== 'NONE') {
      // Update html
      aiLogin.button.find('> i').removeClass('text-danger-emphasis');
      aiLogin.title = 'AI/RP Enabled';
      $('body').addClass('can-ai');

      // Update Ai API script
      tinyAiScript.multiplayer = false;
      tinyAiScript.noai = false;

      // Google Generative
      if (selectedAi === 'google-generative')
        setGoogleAi(tinyAi, tinyStorage.getApiKey('google-generative')?.key);

      // Tiny Chat
      if (selectedAi === 'tiny-chat') tinyAiScript.multiplayer = true;

      // No Ai
      if (selectedAi === 'no-ai') tinyAiScript.noai = true;

      // Enabled now
      tinyAiScript.enabled = true;
    } else {
      // Update html
      aiLogin.button.find('> i').addClass('text-danger-emphasis');
      aiLogin.title = 'AI/RP Disabled';
      $('body').removeClass('can-ai');
      tinyAiScript.enabled = false;
    }

    // Update login button
    aiLogin.updateTitle();
  };

  tinyAiScript.isEnabled = () => typeof tinyStorage.selectedAi() === 'string';
  tinyAiScript.enabled = false;

  // Login button
  tinyAiScript.login = () => {
    // Selector
    const selector = $('<select>', { class: 'form-select text-center' });
    selector.append($('<option>', { value: 'NONE' }).text('None'));
    const apiPlace = $('<span>');
    selector.on('change', function () {
      const value = selector.val();
      const html =
        tinyAiHtml[value] && tinyAiHtml[value].inputs ? tinyAiHtml[value].inputs() : null;
      apiPlace.empty();
      if (html) apiPlace.append(html.desc, html.input, html.submit);
      tinyStorage.setSelectedAi(value);
      tinyAiScript.checkTitle();
    });

    selector.prop('disabled', appData.ai.using);
    const tinyAiHtml = {};

    // Server login inputs
    const insertServerLogin = (tinyInput, values) => {
      const indexs = [];
      tinyInput.push(
        $('<input>', {
          type: 'text',
          placeholder: 'Server ip',
          class: 'form-control text-center',
        }),
      );
      indexs.push(tinyInput.length - 1);

      tinyInput.push(
        $('<input>', {
          type: 'text',
          placeholder: 'Username',
          class: 'form-control text-center mt-3',
        }),
      );
      indexs.push(tinyInput.length - 1);

      tinyInput.push(
        $('<input>', {
          type: 'password',
          placeholder: 'Password',
          class: 'form-control text-center mt-2',
        }),
      );
      indexs.push(tinyInput.length - 1);

      tinyInput.push(
        $('<input>', {
          type: 'text',
          placeholder: 'Room Id',
          class: 'form-control text-center mt-3',
        }),
      );
      indexs.push(tinyInput.length - 1);

      tinyInput.push(
        $('<input>', {
          type: 'password',
          placeholder: 'Room password',
          class: 'form-control text-center mt-2',
        }),
      );
      indexs.push(tinyInput.length - 1);

      tinyInput[indexs[0]].val(values.ip).prop('disabled', appData.ai.using);
      tinyInput[indexs[1]].val(values.username).prop('disabled', appData.ai.using);
      tinyInput[indexs[2]].val(values.password).prop('disabled', appData.ai.using);
      tinyInput[indexs[3]].val(values.roomId).prop('disabled', appData.ai.using);
      tinyInput[indexs[4]].val(values.roomPassword).prop('disabled', appData.ai.using);

      return indexs;
    };

    // Save server login
    const insertSaveServerLogin = (inputs, ids) => {
      return {
        ip: inputs[ids[0]].val(),
        username: inputs[ids[1]].val(),
        password: inputs[ids[2]].val(),
        roomId: inputs[ids[3]].val(),
        roomPassword: inputs[ids[4]].val(),
      };
    };

    // Server host about
    const insertServerAbout = () =>
      $('<p>').append(
        $('<span>').text('You can host your server '),
        $('<a>', {
          href: 'https://github.com/Pony-Driland/Website/tree/main/server/tiny-chat',
          target: '_blank',
        }).text('here'),
        $('<span>').text('. Enter the server settings you want to connect to.'),
      );

    const hostButton = (inputs, tinyBig = -1) =>
      $('<div>').append(
        tinyLib.bs
          .button('secondary mb-3')
          .text('Show host settings (Alpha)')
          .on('click', () => {
            for (const index in inputs) {
              if (index > tinyBig) {
                inputs[index].toggleClass('d-none');
              }
            }
          }),
      );

    // No AI
    selector.append($('<option>', { value: 'no-ai' }).text('No AI'));
    tinyAiHtml['no-ai'] = {};
    const noAi = tinyAiHtml['no-ai'];
    noAi.inputs = () => {
      const data = { input: [] };
      data.input.push(hostButton(data.input, 0));
      data.input.push(insertServerAbout());
      const values = tinyStorage.getApiKey('no-ai') || {};
      const ids = insertServerLogin(data.input, values);
      data.input[0].find('> button').trigger('click');

      data.desc = $('<p>').text(
        'No AI will be used in this mode. You will only have access to the simple features.',
      );

      data.submit = tinyLib.bs
        .button('info mx-4 mt-4')
        .text('Set Settings')
        .on('click', () => {
          const result = insertSaveServerLogin(data.input, ids);
          tinyStorage.setApiKey('no-ai', result);
          tinyAiScript.checkTitle();
          $('#ai_connection').modal('hide');
        })
        .prop('disabled', appData.ai.using);

      return data;
    };

    // Separator
    selector.append($('<option>').prop('disabled', true).text('--------------------'));
    selector.append($('<option>').prop('disabled', true).text('AI Models'));

    // Google AI
    selector.append($('<option>', { value: 'google-generative' }).text('Google Studio'));
    tinyAiHtml['google-generative'] = {};
    const googleAi = tinyAiHtml['google-generative'];
    googleAi.inputs = () => {
      const data = { input: [] };

      data.input.push(
        $('<input>', {
          type: 'password',
          class: 'form-control text-center mb-2',
        }),
      );

      data.input.push(hostButton(data.input, 1));
      data.input.push(insertServerAbout());
      const values = tinyStorage.getApiKey('google-generative') || {};
      data.input[0].val(values.key).prop('disabled', appData.ai.using);
      const ids = insertServerLogin(data.input, values);
      data.input[1].find('> button').trigger('click');

      data.desc = $('<p>').append(
        $('<span>').text('You can get your Google API key '),
        $('<a>', {
          href: 'https://aistudio.google.com/apikey',
          target: '_blank',
        }).text('here'),
        $('<span>').text('. Website: aistudio.google.com'),
      );

      data.submit = tinyLib.bs
        .button('info mx-4 mt-4')
        .text('Set API Tokens')
        .on('click', () => {
          const result = insertSaveServerLogin(data.input, ids);
          result.key = data.input[0].val();
          tinyStorage.setApiKey('google-generative', result);
          tinyAiScript.checkTitle();
          $('#ai_connection').modal('hide');
        })
        .prop('disabled', appData.ai.using);

      return data;
    };

    // Separator
    selector.append($('<option>').prop('disabled', true).text('--------------------'));
    selector.append($('<option>').prop('disabled', true).text('Clients'));

    // Tiny chat
    selector.append($('<option>', { value: 'tiny-chat' }).text('Multiplayer'));
    tinyAiHtml['tiny-chat'] = {};
    const tinyChat = tinyAiHtml['tiny-chat'];
    tinyChat.inputs = () => {
      const data = { input: [] };
      const values = tinyStorage.getApiKey('tiny-chat') || {};
      const ids = insertServerLogin(data.input, values);
      data.desc = insertServerAbout();

      data.submit = tinyLib.bs
        .button('info mx-4 mt-4')
        .text('Set connection settings')
        .on('click', () => {
          tinyStorage.setApiKey('tiny-chat', insertSaveServerLogin(data.input, ids));
          tinyAiScript.checkTitle();
          $('#ai_connection').modal('hide');
        })
        .prop('disabled', appData.ai.using);

      return data;
    };

    // Modal
    selector.val(tinyStorage.selectedAi() || 'NONE');
    selector.trigger('change');

    tinyLib.modal({
      id: 'ai_connection',
      title: 'AI/RP Protocol',
      dialog: 'modal-lg',
      body: $('<center>').append(
        $('<p>').text(`You are in an optional setting. You do not need AI to use the website!`),
        $('<p>').text(
          `This website does not belong to any AI company, and all API input is stored locally inside your machine. This website is just a client to run prompts in artificial intelligence, there is no native artificial intelligence installed here.`,
        ),
        $('<p>').text(
          `By activating an artificial intelligence service in your session, you agree to the terms of use and privacy policies of the third party services you are using on this website. You will always be warned when any artificial intelligence service needs to be run on this website.`,
        ),
        selector,
        apiPlace,
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
      // Get RPG Template
      const rpgData = {
        schemaHash: null,
        allowAiUse: { public: false, private: false },
        allowAiSchemaUse: { public: false, private: false },
        setAllowAiUse: (value, type) => {
          if (typeof rpgData.allowAiUse[type] === 'boolean')
            rpgData.allowAiUse[type] = typeof value === 'boolean' ? value : false;
        },
        setAllowAiSchemaUse: (value, type) => {
          if (typeof rpgData.allowAiSchemaUse[type] === 'boolean')
            rpgData.allowAiSchemaUse[type] = typeof value === 'boolean' ? value : false;
        },

        hash: { public: null, private: null },
        oldHash: { public: null, private: null },
        html: { public: null, private: null },
        offcanvas: { public: null, private: null },
        ready: { public: false, private: false },
        data: { public: null, private: null },
        base: {
          public: $('<div>', { id: 'info_box' }),
          private: $('<div>', { id: 'privateInfo' }),
        },
        init: (forceRestart = false) =>
          new Promise((resolve, reject) => {
            // Get template
            rpgData.template = {
              // Seed the form with a starting value
              startval: {},
              // Disable additional properties
              no_additional_properties: false,
              // Require all properties by default
              required_by_default: false,
            };

            // Add custom Schema
            const customSchema = tinyAi.getCustomValue('rpgSchema');
            if (objType(customSchema, 'object')) rpgData.template.schema = customSchema;
            // Default schema
            else {
              rpgData.template.schema = aiTemplates.funcs.jsonTemplate();
              if (ficConfigs.selected)
                tinyAi.setCustomValue('rpgSchema', rpgData.template.schema, 0);
            }

            const schemaHash = tinyAi.getHash('rpgSchema');

            // Start json
            let failed = false;
            let amountStarted = 0;
            const loadData = {};
            const startJsonNow = (where, valueName) => {
              try {
                // The tiny start script
                const executeTinyStart = (isFirstTime = false) => {
                  const rpgEditor = rpgData.data[where];
                  // Remove first time
                  if (isFirstTime) rpgEditor.off('ready', funcExecStart);
                  // Get data
                  loadData[where] = tinyAi.getCustomValue(valueName);
                  if (!objType(loadData[where], 'object')) loadData[where] = {};

                  // Insert data
                  rpgEditor.setValue(rpgData.filter(loadData[where]));
                  rpgEditor.validate();

                  // Change events
                  if (!ficConfigs.selected) rpgEditor.disable();
                  if (isFirstTime) {
                    rpgEditor.on('change', () => {
                      rpgEditor.validate();
                      if (ficConfigs.selected) {
                        try {
                          const tinyData = rpgEditor.getValue();
                          if (tinyData) {
                            tinyAi.setCustomValue(valueName, tinyData);
                            rpgData.hash[where] = tinyAi.getHash(valueName);
                            rpgData.setAllowAiUse(tinyData.allowAiUse, where);
                            rpgData.setAllowAiSchemaUse(tinyData.allowAiSchemaUse, where);
                          }
                        } catch (err) {
                          console.error(err);
                        }
                      }
                    });
                  }

                  // Complete
                  if (!failed) {
                    rpgData.ready[where] = true;
                    amountStarted++;
                    if (amountStarted >= 2) {
                      rpgData.schemaHash = schemaHash;
                      resolve(loadData);
                    }
                  }
                };
                const funcExecStart = () => executeTinyStart(true);

                // Start json data
                if (rpgData.schemaHash !== schemaHash || !rpgData.data[where] || forceRestart) {
                  // Remove Old
                  if (rpgData.data[where]) rpgData.data[where].destroy();
                  // Insert template
                  rpgData.data[where] = new JSONEditor(
                    rpgData.base[where].get(0),
                    rpgData.template,
                  );

                  // Start scripts now
                  rpgData.data[where].on('ready', funcExecStart);
                } else executeTinyStart(false);
              } catch (err) {
                // Error!
                console.error(err);
                if (!failed) {
                  failed = true;
                  reject(
                    new Error(
                      'An error occurred at booting your RPG. Check your console for more details!',
                    ),
                  );
                }
              }
            };

            // Read json now
            startJsonNow('public', 'rpgData');
            startJsonNow('private', 'rpgPrivateData');
          }),
      };

      // Data Filter
      rpgData.filter = function (value) {
        if (typeof value === 'string') {
          try {
            value = JSON.parse(value);
          } catch (err) {
            console.error(err);
            value = null;
          }
        }

        return value;
      };

      // Load Models
      if (!tinyAiScript.noai && !tinyAiScript.multiplayer && tinyAi.getModelsList().length < 1)
        await tinyAi.getModels(100);

      // Sidebar
      const sidebarStyle = {
        class: 'bg-dark text-white p-3 d-none d-md-block',
        style: 'width: 250px; min-width: 250px; overflow-y: auto;',
      };

      // Sidebar Button
      const createButtonSidebar = (icon, text, callback, disabled = false, options = null) => {
        const tinyClass = `link btn-bg text-start w-100${disabled ? ' disabled' : ''}`;
        return tinyLib.bs
          .button(!options ? tinyClass : { class: tinyClass, ...options })
          .text(text)
          .prepend(tinyLib.icon(`${icon} me-2`))
          .on('click', callback)
          .prop('disabled', disabled);
      };

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
        typeof val === 'string' && val.length > 0 ? Number(val) : typeof val === 'number' ? val : 0;

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
            .then(async (ficData) => {
              // Start chatbot script
              if (forceReset) await resetSession(id, true);
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

              // Load rpg data
              await rpgData.init();
              const tinyRpgData = rpgData.data.public.getValue();
              const tinyRpgPrivateData = rpgData.data.private.getValue();
              if (tinyRpgData) {
                rpgData.setAllowAiUse(tinyRpgData.allowAiUse, 'public');
                rpgData.setAllowAiSchemaUse(tinyRpgData.allowAiSchemaUse, 'public');
              }
              if (tinyRpgPrivateData) {
                rpgData.setAllowAiUse(tinyRpgPrivateData.allowAiUse, 'private');
                rpgData.setAllowAiSchemaUse(tinyRpgPrivateData.allowAiSchemaUse, 'private');
              }

              // Add file data
              const fileTokens = tinyAi.getTokens('file');
              const oldFileHash = tinyAi.getHash('file');
              if (ficData) tinyAi.setFileData(ficData.mime, ficData.data);
              else tinyAi.removeFileData();
              const newFileHash = tinyAi.getHash('file');
              if (oldFileHash === newFileHash)
                tinyAi.setFileData(null, null, null, fileTokens || 0);

              // Clear data
              clearMessages();
              enableReadOnly(false);
              enableMessageButtons(true);
              makeTempMessage(introduction, 'Introduction');
              const history = tinyAi.getData();

              // Restore textarea
              if (ficConfigs.selected) {
                let textBackup = localStorage.getItem(`tiny-ai-textarea-${ficConfigs.selected}`);
                if (typeof textBackup !== 'string') textBackup = '';
                msgInput.val(textBackup).trigger('input');
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

      // When sId is used, it means that the request is coming from a session that is not active in the chat
      const insertImportData = (data, tokens, readOnly = false, sId = undefined) => {
        // Insert data
        if (Array.isArray(data)) {
          for (const index in data) {
            const msgId = !readOnly
              ? tinyAi.addData(
                  tinyAi.buildContents(null, data[index], data[index].role),
                  tokens[index],
                  sId,
                )
              : tinyAi.getIdByIndex(index);

            if (!sId) {
              const msg = !readOnly ? tinyAi.getLastIndexData() : data[index];
              if (msg && msg.parts && msg.parts[0] && typeof msg.parts[0].text === 'string') {
                addMessage(
                  makeMessage(
                    {
                      message: msg.parts[0].text,
                      id: msgId,
                    },
                    msg.role === 'user' ? null : tinyLib.toTitleCase(msg.role),
                  ),
                );
              }
            }
          }
        }
      };

      const importFileSession = async (jsonData, forceLoad = false) => {
        if (objType(jsonData, 'object') && jsonData.file && typeof jsonData.id === 'string') {
          const { file } = jsonData;
          let sessionId = jsonData.id;
          // Migration to sandbox mode
          if (!canSandBox(sessionId) && typeof file.systemInstruction === 'string')
            sessionId = 'sandBoxFic';
          if (forceLoad) await resetSession(sessionId, true);

          // Start History
          tinyAi.startDataId(sessionId, true);

          // Open Get Fic Cache
          const index = ficConfigs.data.findIndex((item) => item.id === sessionId);
          const instructionId = index > -1 ? ficConfigs.data[index].template : null;

          // Set custom values
          if (Array.isArray(file.customList)) {
            for (const i in file.customList) {
              if (
                objType(file.customList[i], 'object') &&
                typeof file.customList[i].name === 'string' &&
                typeof file.customList[i].type === 'string'
              ) {
                const { name, type } = file.customList[i];
                if (objType(file[name], type)) {
                  tinyAi.setCustomValue(
                    name,
                    file[name],
                    file.tokens ? file.tokens[name] : 0,
                    sessionId,
                  );
                }
              }
            }
          }

          // Set model
          if (typeof file.model === 'string') {
            modelSelector.val(file.model);
            tinyAi.setModel(file.model, sessionId);
            selectModel(file.model);
          }

          // Set model settings
          if (typeof file.temperature === 'number') tinyAi.setTemperature(file.temperature);
          if (typeof file.maxOutputTokens === 'number')
            tinyAi.setMaxOutputTokens(file.maxOutputTokens);
          if (typeof file.topP === 'number') tinyAi.setTopP(file.topP);
          if (typeof file.topK === 'number') tinyAi.setTopK(file.topK);
          if (typeof file.presencePenalty === 'number')
            tinyAi.setPresencePenalty(file.presencePenalty);
          if (typeof file.frequencyPenalty === 'number')
            tinyAi.setFrequencyPenalty(file.frequencyPenalty);

          // Set Instruction
          if (canSandBox(sessionId))
            tinyAi.setSystemInstruction(
              file.systemInstruction,
              file.tokens ? file.tokens.systemInstruction : 0,
            );
          else if (aiTemplates.instructions[instructionId])
            tinyAi.setSystemInstruction(
              aiTemplates.instructions[instructionId],
              file.tokens ? file.tokens.systemInstruction : 0,
            );

          // Prompt
          if (typeof file.prompt === 'string')
            tinyAi.setPrompt(file.prompt, file.tokens ? file.tokens.prompt : 0);

          // First Dialogue
          if (typeof file.firstDialogue === 'string')
            tinyAi.setFirstDialogue(
              file.firstDialogue,
              file.tokens ? file.tokens.firstDialogue : 0,
            );

          // File
          if (file.tokens && typeof file.tokens.file === 'number')
            tinyAi.setFileData(null, null, null, file.tokens ? file.tokens.file : 0);

          if (forceLoad) {
            // Clear messages
            clearMessages();
            enableReadOnly(false);
            enableMessageButtons(true);
          }

          // Complete
          insertImportData(
            file.data,
            file.tokens && Array.isArray(file.tokens.data) ? file.tokens.data : [],
            false,
            forceLoad ? undefined : sessionId,
          );

          if (file.hash)
            file.hash.model = typeof file.model === 'string' ? objHash(file.model) : null;

          if (forceLoad && index > -1)
            getFicCache(
              ficConfigs.data[index].id,
              instructionId,
              ficConfigs.data[index].prompt,
              ficConfigs.data[index].intro,
              file.hash,
              () => {
                ficConfigs.selected = ficConfigs.data[index].id;
                return ficConfigs.data[index].getData();
              },
            );
          return true;
        }
        return false;
      };

      importButton.on('change', (event) => {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = function (e) {
            try {
              // Read data
              const jsonData = JSON.parse(e.target.result);
              importFileSession(jsonData, true);
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
          {
            title: 'No Data',
            id: 'noData',
            template: null,
            icon: 'fa-solid fa-file',
            intro:
              'You are in a completely clean environment, with no stored data from the fic. You can use all website features without any limitations.',
            getData: async () => null,
          },
        ],
        buttons: [],
        selected: null,
        contentsMd5: null,
      };

      // Reset buttons
      const resetEntireData = (resetAll = false) => {
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
            resetAll,
          ).then(() => resetSettingsButton.trigger('click'));
        }
      };

      const ficResets = [
        // History
        createButtonSidebar('fa-solid fa-arrows-rotate', 'History', () => resetEntireData(true)),
        // Schema
        createButtonSidebar('fa-solid fa-arrows-rotate', 'RPG Schema', () => {
          rpgData.template.schema = aiTemplates.funcs.jsonTemplate();
          if (ficConfigs.selected) {
            tinyAi.setCustomValue('rpgSchema', rpgData.template.schema, 0);
            resetEntireData(false);
          }
        }),
      ];

      // Fic Templates
      const ficTemplates = [];
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
                .trigger('focus');
            }
          });

          // Insert into body
          body.append(textareaAdd);
        }

        // Add textarea
        body.append($('<p>').text(config.info));
        body.append(textarea);

        // Submit
        const submit = tinyLib.bs.button('info m-2 ms-0');
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
      const connectionInfoBar = $('<span>');
      const sidebarLeft = $('<div>', sidebarStyle)
        .removeClass('d-md-block')
        .removeClass('p-3')
        .addClass('d-md-flex')
        .addClass('flex-column')
        .addClass('py-0')
        .append(
          $('<ul>', { class: 'list-unstyled flex-grow-1 overflow-auto mb-0 pt-3 px-3' }).append(
            $('<li>', { id: 'ai-mode-list', class: 'mb-3' }).append(
              // Reset
              $('<h5>').text('Reset'),
              ficResets,

              // Modes
              $('<h5>').text('Modes'),

              // Fic Talk
              ficTemplates,

              // Settings
              $('<h5>').text('Settings'),
              ficPromptItems,

              // RPG
              $('<h5>').text('RPG'),
              // Dice
              createButtonSidebar('fa-solid fa-dice', 'Roll Dice', () => {
                // Root
                const $root = $('<div>');
                const $formRow = $('<div>').addClass('row g-3');

                // Form template
                const configs = {};
                const genLabel = (id, text) =>
                  $('<label>').addClass('form-label').attr('for', id).text(text);

                const genInput = (id, type, value, min) =>
                  $('<input>')
                    .addClass('form-control text-center')
                    .attr({ id, type, min })
                    .attr('placeholder', min)
                    .val(value);

                const genConfig = (id, text, type, value, min) => {
                  configs[id] = genInput(id, type, value, min);
                  return [genLabel(id, text), configs[id]];
                };

                // Form
                const $maxValueCol = $('<div>')
                  .addClass('col-md-4')
                  .append(genConfig('maxValue', 'Max Value', 'number', 6, 1));

                const $diceCountCol = $('<div>')
                  .addClass('col-md-4')
                  .append(genConfig('diceCount', 'Dice Count', 'number', 3, 1));

                const $perDieCol = $('<div>')
                  .addClass('col-md-4')
                  .append(
                    genConfig(
                      'perDieValues',
                      'Per-Die Values (e.g., 6,12,20)',
                      'text',
                      '',
                      'Optional',
                    ),
                  );

                $formRow.append($maxValueCol, $diceCountCol, $perDieCol);

                // Roll button
                const $rollButton = $('<button>')
                  .addClass('btn btn-primary w-100 my-4')
                  .text('Roll Dice');

                // Add container
                const $diceContainer = $('<div>');
                $root.append($('<center>').append($formRow), $rollButton, $diceContainer);

                // TinyDice logic
                const dice = new TinyDice($diceContainer.get(0));
                $rollButton.on('click', function () {
                  const max = parseInt(configs.maxValue.val()) || 6;
                  const count = parseInt(configs.diceCount.val()) || 1;
                  const perDieRaw = configs.perDieValues.val().trim();
                  const perDie = perDieRaw.length > 0 ? perDieRaw : null;

                  dice.roll(max, count, perDie);
                });

                dice.setBgSkin('white');
                dice.setTextSkin('black');
                dice.rollDices(3, 0);

                // Start modal
                tinyLib.modal({
                  title: 'Dice Roll',
                  dialog: 'modal-lg',
                  id: 'dice-roll',
                  body: $root,
                });
              }),
              // RPG Data
              createButtonSidebar('fa-solid fa-note-sticky', 'View Data', null, false, {
                toggle: 'offcanvas',
                target: '#rpg_ai_base_1',
              }),
              // Private RPG Data
              createButtonSidebar('fa-solid fa-book', 'View Private', null, false, {
                toggle: 'offcanvas',
                target: '#rpg_ai_base_2',
              }),
              // Classic Map
              createButtonSidebar('fa-solid fa-map', 'Classic Map', () => {
                const startTinyMap = function (place) {
                  // Get Map Data
                  let maps;
                  let location;
                  try {
                    maps = rpgData.data[place].getEditor('root.settings.maps').getValue();
                    location = rpgData.data[place].getEditor('root.location').getValue();
                  } catch (e) {
                    maps = null;
                  }

                  // Exist Map
                  tinyHtml.empty();
                  try {
                    if (Array.isArray(maps)) {
                      for (const index in maps) {
                        const map = new TinyMap(maps[index]);
                        map.setLocation(location);
                        map.buildMap(true);
                        tinyHtml.append(
                          map.getMapBaseHtml(),
                          $('<center>').append(map.getMapButton()),
                        );
                      }
                    }
                  } catch (e) {
                    // No Map
                    console.error(e);
                    tinyHtml.empty();
                  }
                };

                const tinyHtml = $('<span>');
                const tinyHr = $('<hr>', { class: 'my-5 d-none' });
                tinyLib.modal({
                  title: 'Maps',
                  dialog: 'modal-lg',
                  id: 'tinyMaps',
                  body: [
                    tinyHtml,
                    tinyHr,
                    $('<center>').append(
                      // Public Maps
                      tinyLib.bs
                        .button('secondary m-2')
                        .text('Public')
                        .on('click', () => {
                          tinyHr.removeClass('d-none');
                          startTinyMap('public');
                        }),
                      // Private Maps
                      tinyLib.bs
                        .button('secondary m-2')
                        .text('Private')
                        .on('click', () => {
                          tinyHr.removeClass('d-none');
                          startTinyMap('private');
                        }),
                    ),
                  ],
                });
              }),

              // Import
              $('<h5>').text('Data'),
              importItems,

              // Export
              createButtonSidebar('fa-solid fa-file-export', 'Export', () => {
                const exportData = {
                  file: clone(tinyAi.getData()),
                  id: tinyAi.getId(),
                };

                if (exportData.file) {
                  if (!canSandBox(ficConfigs.selected)) delete exportData.file.systemInstruction;
                  if (exportData.file.file) delete exportData.file.file;
                }

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
                    .prepend(tinyLib.icon('fa-solid fa-download me-3'))
                    .append(
                      tinyLib.bs
                        .button('info btn-sm ms-3')
                        .text('Save As all chapters')
                        .on('click', () => saveRoleplayFormat()),
                    ),
                  $('<h5>')
                    .text(
                      `Here you can download the official content of fic to produce unofficial content dedicated to artificial intelligence.`,
                    )
                    .append(
                      $('<br/>'),
                      $('<small>').text(
                        'Remember that you are downloading the uncensored version.',
                      ),
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
            ),

            // Tiny information
            $('<div>', {
              class: 'small text-grey p-2 bg-dark position-sticky bottom-0 pt-0',
            }).append(
              $('<hr/>', { class: 'border-white mt-0 mb-2' }),
              connectionInfoBar,
              $('<span>').text(
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
            .prepend(tinyLib.icon(`fa-solid fa-atom me-2`)),
        ),

        // Token Counter
        tokenCounter: $('<div>', {
          class: 'mt-3',
          title: 'Counts how many tokens are used for the content generation',
        }).append(
          $('<span>')
            .text('Token count')
            .prepend(tinyLib.icon(`fa-solid fa-magnifying-glass me-2`)),
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
            .prepend(tinyLib.icon(`fa-solid fa-temperature-three-quarters me-2`)),
          temperature.insert(),
        ),

        // Output Length
        outputLength: $('<div>', {
          class: 'mt-3',
          title: 'Maximum number of tokens in response',
        }).append(
          $('<span>', sidebarSettingTemplate.span)
            .text('Output length')
            .prepend(tinyLib.icon(`fa-solid fa-comment me-2`)),
          outputLength,
        ),

        // Top P
        topP: $('<div>', {
          class: 'mt-3',
          title: 'The maximum cumulative probability of tokens to consider when sampling',
        }).append(
          $('<span>', sidebarSettingTemplate.span)
            .text('Top P')
            .prepend(tinyLib.icon(`fa-solid fa-percent me-2`)),
          topP.insert(),
        ),

        // Top K
        topK: $('<div>', {
          class: 'mt-3',
          title: 'The maximum number of tokens to consider when sampling',
        }).append(
          $('<span>', sidebarSettingTemplate.span)
            .text('Top K')
            .prepend(tinyLib.icon(`fa-solid fa-0 me-2`)),
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
            .prepend(tinyLib.icon(`fa-solid fa-hand me-2`)),
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
            .prepend(tinyLib.icon(`fa-solid fa-hand me-2`)),
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
        if (!tinyAiScript.noai && !tinyAiScript.multiplayer) {
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
        if (!tinyAiScript.noai && !tinyAiScript.multiplayer) {
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
        }
      };

      modelSelector.on('change', () => selectModel(modelSelector.val()));

      // Load more models
      const loadMoreModels = createButtonSidebar(
        'fa-solid fa-bars-progress',
        'Load more models',
        async () => {
          if (!tinyAiScript.noai && !tinyAiScript.multiplayer) {
            $.LoadingOverlay('show', { background: 'rgba(0,0,0, 0.5)' });
            await tinyAi.getModels(100);

            if (!tinyAi._nextModelsPageToken) {
              loadMoreModels.addClass('disabled');
              loadMoreModels.prop('disabled', true);
            }

            updateModelList();
            $.LoadingOverlay('hide');
          }
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

        let rpgContentData = null;
        let rpgPrivateContentData = null;
        let rpgSchema = null;

        if (history) {
          // RPG Data
          const canPublicRPG =
            rpgData.allowAiUse.public &&
            objType(history.rpgData, 'object') &&
            countObj(history.rpgData) > 0;

          const canPrivateRPG =
            rpgData.allowAiUse.private &&
            objType(history.rpgPrivateData, 'object') &&
            countObj(history.rpgPrivateData) > 0;

          const existsRpgSchema =
            objType(rpgData.template.schema, 'object') && countObj(rpgData.template.schema) > 0;

          const canPublicSchemaRPG = rpgData.allowAiSchemaUse.public && existsRpgSchema;

          const canPrivateSchemaRPG = rpgData.allowAiSchemaUse.private && existsRpgSchema;

          // System Instruction
          if (
            typeof history.systemInstruction === 'string' &&
            history.systemInstruction.length > 0
          ) {
            let extraInfo = '';
            if (canPublicRPG || canPrivateRPG)
              extraInfo += `\n${aiTemplates.helpers.ficRpgChecker}`;
            systemData = {
              role: 'system',
              parts: [{ text: `${history.systemInstruction}${extraInfo}` }],
            };
            content.push(systemData);
          }

          // File
          if (history.file) {
            fileData = {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mime_type: history.file.mime,
                    data: history.file.base64,
                  },
                },
              ],
            };
            content.push(fileData);
          }

          // RPG Data
          if ((canPublicRPG || canPrivateRPG) && (canPublicSchemaRPG || canPrivateSchemaRPG)) {
            const tinyRpgData = clone(rpgData.template.schema);

            if (typeof tinyRpgData.properties.allowAiUse !== 'undefined')
              delete tinyRpgData.properties.allowAiUse;
            if (typeof tinyRpgData.properties.allowAiSchemaUse !== 'undefined')
              delete tinyRpgData.properties.allowAiSchemaUse;

            let tinyText = '---------- RPG User Official Data ----------\n\n';
            tinyText += JSON.stringify({ schema: tinyRpgData });
            tinyText += '\n\n---------- The User end RPG Official Data ----------';

            rpgSchema = {
              role: 'user',
              parts: [{ text: tinyText }],
            };
            content.push(rpgSchema);
          }

          // Public RPG
          if (canPublicRPG) {
            rpgData.oldHash.public = tinyAi.getHash('rpgData');
            const tinyRpgData = clone(history.rpgData);
            if (typeof tinyRpgData.allowAiUse !== 'undefined') delete tinyRpgData.allowAiUse;
            let tinyText = '---------- RPG User Official Data ----------\n\n';
            tinyText += JSON.stringify({ database: tinyRpgData });
            tinyText += '\n\n---------- The User end RPG Official Data ----------';

            rpgContentData = {
              role: 'user',
              parts: [{ text: tinyText }],
            };
            content.push(rpgContentData);
          }

          // Private RPG
          if (canPrivateRPG) {
            rpgData.oldHash.private = tinyAi.getHash('rpgPrivateData');
            const tinyRpgData = clone(history.rpgPrivateData);
            if (typeof tinyRpgData.allowAiUse !== 'undefined') delete tinyRpgData.allowAiUse;
            let tinyText = '---------- RPG Official Data ----------\n\n';
            tinyText += JSON.stringify({ database: tinyRpgData });
            tinyText += '\n\n---------- The end RPG Official Data ----------';

            rpgPrivateContentData = {
              role: 'user',
              parts: [{ text: tinyText }],
            };
            content.push(rpgPrivateContentData);
          }

          // Prompt
          if (typeof history.prompt === 'string' && history.prompt.length > 0) {
            promptData = {
              role: 'user',
              parts: [{ text: history.prompt }],
            };
            content.push(promptData);
          }

          // History data
          for (const index in history.data) {
            if (addIndexList) indexList.push(history.data[index]);
            content.push(history.data[index]);
          }
        }

        return {
          content,
          indexList,
          systemData,
          promptData,
          fileData,
          rpgContentData,
          rpgPrivateContentData,
          rpgSchema,
        };
      };

      const getAiTokens = (hashItems = { data: [] }, forceUpdate = false) =>
        new Promise(async (resolve, reject) => {
          try {
            const {
              content,
              indexList,
              systemData,
              promptData,
              fileData,
              rpgContentData,
              rpgPrivateContentData,
              rpgSchema,
            } = prepareContentList(true);
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
                if (!tinyAiScript.noai && !tinyAiScript.multiplayer) {
                  if (
                    (forceUpdate && contentToCheck) ||
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
                } else callback(0);
              };

              // RPG
              if (
                (rpgData.allowAiUse.public || rpgData.allowAiUse.private) &&
                (rpgData.allowAiSchemaUse.public || rpgData.allowAiSchemaUse.private)
              )
                await updateTokenData(
                  'rpgSchema',
                  rpgSchema,
                  tinyAi.getHash('rpgSchema'),
                  typeof hashItems.rpgSchema === 'string' ? hashItems.rpgSchema : null,
                  { count: tinyAi.getTokens('rpgSchema') },
                  (newCount) => tinyAi.setCustomValue('rpgSchema', null, newCount),
                );
              else tinyAi.setCustomValue('rpgSchema', null, 0);

              if (rpgData.allowAiUse.public)
                await updateTokenData(
                  'rpgData',
                  rpgContentData,
                  tinyAi.getHash('rpgData'),
                  typeof hashItems.rpgData === 'string' ? hashItems.rpgData : null,
                  { count: tinyAi.getTokens('rpgData') },
                  (newCount) => tinyAi.setCustomValue('rpgData', null, newCount),
                );
              else tinyAi.setCustomValue('rpgData', null, 0);

              if (rpgData.allowAiUse.private)
                await updateTokenData(
                  'rpgPrivateData',
                  rpgPrivateContentData,
                  tinyAi.getHash('rpgPrivateData'),
                  typeof hashItems.rpgPrivateData === 'string' ? hashItems.rpgPrivateData : null,
                  { count: tinyAi.getTokens('rpgPrivateData') },
                  (newCount) => tinyAi.setCustomValue('rpgPrivateData', null, newCount),
                );
              else tinyAi.setCustomValue('rpgPrivateData', null, 0);

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
              if (systemCheck) systemCheck.role = 'user';
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

              resolve(
                !tinyAiScript.noai && !tinyAiScript.multiplayer ? tinyAi.getTotalTokens() : 0,
              );
            } else resolve(0);
          } catch (err) {
            reject(err);
          }
        });

      // Get Ai Tokens
      let usingUpdateToken = false;
      const updateAiTokenCounterData = (hashItems, forceReset = false) => {
        if (!usingUpdateToken) {
          usingUpdateToken = true;
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
              msgInput.trigger('focus');
            };

            getAiTokens(hashItems || undefined, forceReset)
              .then((totalTokens) => {
                if (typeof totalTokens === 'number') tokenCount.updateValue('amount', totalTokens);
                else tokenCount.updateValue('amount', 0);
                stopLoadingMessage();
                usingUpdateToken = false;
              })
              .catch((err) => {
                alert(err.message, 'Error get AI tokens');
                console.error(err);
                stopLoadingMessage();
                usingUpdateToken = false;
              });
          }
        }
      };

      // Execute AI script
      const executeAi = (tinyCache = {}, tinyController = undefined) =>
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
              // The prompt result amount
              if (typeof tokenUsage.count.candidates === 'number')
                amountTokens.data.candidates = tokenUsage.count.candidates;
              if (typeof tokenUsage.count.prompt === 'number')
                amountTokens.data.prompt = tokenUsage.count.prompt;
              if (typeof tokenUsage.count.total === 'number')
                amountTokens.data.total = tokenUsage.count.total;
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
          const insertMessage = (msgData, role, finishReason) => {
            if (!tinyCache.msgBallon) {
              tinyCache.msgBallon = makeMessage(
                {
                  message: msgData,
                  id: tinyCache.msgId,
                },
                role === 'user' ? null : tinyLib.toTitleCase(role),
              );
              addMessage(tinyCache.msgBallon);
            } else {
              tinyCache.msgBallon.find('.ai-msg-ballon').empty().append(makeMsgRenderer(msgData));
              const tinyErrorAlert = tinyCache.msgBallon.data('tiny-ai-error-alert');
              if (tinyErrorAlert) tinyErrorAlert.updateText(finishReason);
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
          const { height, value } = inputResult;
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

          // Value
          localStorage.setItem(
            `tiny-ai-textarea-${ficConfigs.selected}`,
            typeof value === 'string' ? value : '',
          );
        },
      );

      // Submit
      const msgSubmit = tinyLib.bs.button('primary input-group-text-dark').text('Send');

      const cancelSubmit = tinyLib.bs
        .button('primary input-group-text-dark rounded-end')
        .text('Cancel');

      const submitMessage = async () => {
        // Prepare to get data
        msgInput.trigger('blur');
        const msg = msgInput.val();
        msgInput.val('').trigger('input');

        const controller = new AbortController();
        enableReadOnly(true);
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
        const canContinue = await new Promise(async (resolve) => {
          try {
            if (typeof msg === 'string' && msg.length > 0) {
              const newMsg = tinyAi.buildContents(
                null,
                { role: 'user', parts: [{ text: msg }] },
                'user',
              );

              const newTokens =
                !tinyAiScript.noai && !tinyAiScript.multiplayer
                  ? await tinyAi.countTokens([newMsg])
                  : { totalTokens: 0 };
              const newToken =
                newTokens && typeof newTokens.totalTokens === 'number'
                  ? newTokens.totalTokens
                  : null;

              sentId = tinyAi.addData(newMsg, { count: newToken });
              resolve(true);
            } else resolve(false);
          } catch (err) {
            console.error(err);
            alert(err.message);
            resolve(false);
          }
        });
        if (canContinue) {
          enableReadOnly(true, controller);
          addMessage(
            makeMessage({
              message: msg,
              id: sentId,
            }),
          );

          // Execute Ai
          if (!tinyAiScript.noai && !tinyAiScript.multiplayer)
            await executeAi(submitCache, controller).catch((err) => {
              if (submitCache.cancel) submitCache.cancel();
              console.error(err);
              alert(err.message);
            });
        }

        // Complete
        clearInterval(loadingMessage);
        disablePromptButtons(false);
        msgInput.val('');

        enableMessageButtons(true);
        enableReadOnly(false);
        modelChangerReadOnly(false);
        enableModelSelectorReadOnly(false);
        msgInput.trigger('focus');
      };

      const submitCache = {};
      msgSubmit.on('click', async () => {
        if (!msgInput.prop('disabled')) submitMessage();
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

        button: tinyLib.bs
          .button('lg btn-bg d-flex justify-content-center align-items-center')
          .attr('title', 'Insert first dialogue')
          .css({
            'pointer-events': 'all',
            height: 150,
            'font-size': '100px',
            'background-color': 'transparent !important',
          }),
      };

      firstDialogueBase.button.append(tinyLib.icon('fa-solid fa-circle-play'));

      firstDialogueBase.button.on('click', () => {
        enabledFirstDialogue(false);
        const history = tinyAi.getData();

        // Insert first message
        if (history && history.data.length < 1 && typeof history.firstDialogue === 'string') {
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

      const makeTempMessage = (msg, type) => addMessage(makeMessage({ message: msg }, type));

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
        const textBase = $('<span>');
        const result = tinyLib.bs.alert(
          'danger mt-2 mb-0 d-none',
          [tinyLib.icon('fas fa-exclamation-triangle me-2'), textBase],
          true,
        );

        const updateText = (errorCode) => {
          const tinyError = tinyAi.getErrorCode(errorCode);
          if (tinyError && typeof tinyError.text === 'string' && !tinyError.hide) {
            textBase.text(tinyError.text);
            result.removeClass('d-none');
          }
        };

        updateText(finishReason);
        return { textBase, result, updateText };
      };

      const makeMessage = (data = { message: null, id: -1 }, username = null) => {
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
            ? tinyLib.bs
                .button('bg btn-sm')
                .append(tinyLib.icon('fa-solid fa-pen-to-square'))
                .on('click', () => {
                  // Text
                  const textInput = $('<textarea>', { class: 'form-control' });
                  textInput.val(tinyCache.msg);
                  const oldMsg = tinyCache.msg;

                  // Submit
                  const submitButton = tinyLib.bs
                    .button(
                      `${typeof username !== 'string' ? 'secondary d-inline-block' : 'primary'} mt-2 w-100 me-2`,
                    )
                    .text('Submit');

                  const cancelButton = tinyLib.bs
                    .button(
                      `${typeof username !== 'string' ? 'secondary d-inline-block' : 'primary'} mt-2 w-100`,
                    )
                    .text('Cancel');

                  const closeReplace = () => {
                    msgBallon.removeClass('w-100').empty();
                    msgBallon.append(makeMsgRenderer(tinyCache.msg));
                    const msg = tinyAi.getMsgById();
                    tinyErrorAlert.updateText(msg ? msg.finishReason : null);
                  };

                  submitButton.on('click', () => {
                    tinyCache.msg = textInput.val();
                    const newMsg = tinyCache.msg;
                    if (typeof oldMsg !== 'string' || oldMsg !== newMsg) {
                      const newContent = tinyAi.getMsgByIndex(tinyIndex);
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
          tinyLib.bs
            .button('bg btn-sm')
            .append(tinyLib.icon('fa-solid fa-trash-can'))
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

        const msg = tinyAi.getMsgById(data.id);
        const tinyErrorAlert = makeMsgWarning(msg ? msg.finishReason : null);

        // Send message
        const msgContent = msgBase.append(
          editPanel,
          msgBallon.append(makeMsgRenderer(tinyCache.msg)),
          $('<div>', {
            class: `text-muted small mt-1${typeof username !== 'string' ? ' text-end' : ''}`,
            text: typeof username === 'string' ? username : 'User',
          }),
          tinyErrorAlert.result,
        );

        msgContent.data('tiny-ai-error-alert', tinyErrorAlert);
        return msgContent;
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

      // Can use backup
      const rpgCfg = tinyStorage.getApiKey(tinyStorage.selectedAi()) || {};
      const canUsejsStore = typeof rpgCfg.ip !== 'string' || rpgCfg.ip.length < 1;

      // Prepare events
      tinyAi.removeAllListeners('setMaxOutputTokens');
      tinyAi.removeAllListeners('setTemperature');
      tinyAi.removeAllListeners('setTopP');
      tinyAi.removeAllListeners('setTopK');
      tinyAi.removeAllListeners('setPresencePenalty');
      tinyAi.removeAllListeners('setFrequencyPenalty');
      tinyAi.removeAllListeners('setModel');
      tinyAi.removeAllListeners('selectDataId');
      tinyAi.removeAllListeners('deleteIndex');
      tinyAi.removeAllListeners('replaceIndex');
      tinyAi.removeAllListeners('addData');
      tinyAi.removeAllListeners('setPrompt');
      tinyAi.removeAllListeners('setFirstDialogue');
      tinyAi.removeAllListeners('setFileData');
      tinyAi.removeAllListeners('setSystemInstruction');
      tinyAi.removeAllListeners('startDataId');
      tinyAi.removeAllListeners('stopDataId');
      tinyAi.removeAllListeners('setRpgSchema');
      tinyAi.removeAllListeners('setRpgData');
      tinyAi.removeAllListeners('setRpgPrivateData');

      // tinyAi.on('startDataId', () => {});
      // tinyAi.on('setFileData', (value) => {});

      // Insert template
      const tinyInsertDb = (where, fData) =>
        connStore.insert({ into: where, upsert: true, values: [fData] }).catch(console.error);
      const tinyMsgIdDb = (sessionId, id) => `${sessionId}:${id}`;

      // Reset session
      const resetSession = (id, useReadOnly = false) =>
        new Promise((resolve, reject) => {
          if (canUsejsStore) {
            if (useReadOnly) {
              disablePromptButtons(true);
              enableMessageButtons(false);
              enableReadOnly(true);
              modelChangerReadOnly(true);
              enableModelSelectorReadOnly(true);
            }

            const disableReadOnly = () => {
              if (useReadOnly) {
                disablePromptButtons(false);
                enableMessageButtons(true);
                enableReadOnly(false);
                modelChangerReadOnly(false);
                enableModelSelectorReadOnly(false);
              }
            };
            Promise.all([
              connStore.remove({ from: 'aiSessionsRoom', where: { session: id } }),
              connStore.remove({ from: 'aiSessionsHash', where: { session: id } }),
              connStore.remove({ from: 'aiSessionsTokens', where: { session: id } }),
              connStore.remove({ from: 'aiSessionsCustomList', where: { session: id } }),
              connStore.remove({ from: 'aiSessionsData', where: { session: id } }),
            ])
              .then((result) => {
                disableReadOnly();
                resolve(result);
              })
              .catch((err) => {
                disableReadOnly();
                reject(err);
              });
          } else resolve(null);
        });

      // Save backup
      const saveSessionTimeout = {};
      const saveSessionBackup = (sessionSelected) => {
        if (canUsejsStore && sessionSelected) {
          if (saveSessionTimeout[sessionSelected])
            clearTimeout(saveSessionTimeout[sessionSelected]);
          saveSessionTimeout[sessionSelected] = setTimeout(() => {
            // Get session
            const tinyData = tinyAi.getData();
            const customList = tinyData.customList;
            const hash = tinyData.hash;
            const tokens = tinyData.tokens;

            // Room data
            const roomSaveData = {
              model: typeof tinyData.model === 'string' ? tinyData.model : null,
              prompt: typeof tinyData.prompt === 'string' ? tinyData.prompt : null,
              firstDialogue:
                typeof tinyData.firstDialogue === 'string' ? tinyData.firstDialogue : null,
              systemInstruction:
                typeof tinyData.systemInstruction === 'string' ? tinyData.systemInstruction : null,
              rpgSchema: objType(tinyData.rpgSchema, 'object') ? tinyData.rpgSchema : null,
              rpgData: objType(tinyData.rpgData, 'object') ? tinyData.rpgData : null,
              rpgPrivateData: objType(tinyData.rpgPrivateData, 'object')
                ? tinyData.rpgPrivateData
                : null,
              maxOutputTokens:
                typeof tinyData.maxOutputTokens === 'number' ? tinyData.maxOutputTokens : null,
              temperature: typeof tinyData.temperature === 'number' ? tinyData.temperature : null,
              topP: typeof tinyData.topP === 'number' ? tinyData.topP : null,
              topK: typeof tinyData.topK === 'number' ? tinyData.topK : null,
              presencePenalty:
                typeof tinyData.presencePenalty === 'number' ? tinyData.presencePenalty : null,
              frequencyPenalty:
                typeof tinyData.frequencyPenalty === 'number' ? tinyData.frequencyPenalty : null,
            };

            // Hash and tokens data insert
            const hashData = {};
            const tokenData = {};
            for (const item in roomSaveData) {
              hashData[item] = typeof hash[item] === 'string' ? hash[item] : null;
              tokenData[item] = typeof tokens[item] === 'number' ? tokens[item] : null;
            }

            hashData.file = typeof hash.file === 'string' ? hash.file : null;
            tokenData.file = typeof tokens.file === 'number' ? tokens.file : null;

            // Hash
            hashData.session = sessionSelected;
            tinyInsertDb('aiSessionsHash', hashData);

            // Tokens
            tokenData.session = sessionSelected;
            tinyInsertDb('aiSessionsTokens', tokenData);

            // Room
            roomSaveData.session = sessionSelected;
            tinyInsertDb('aiSessionsRoom', roomSaveData);

            // Custom list
            tinyInsertDb('aiSessionsCustomList', {
              session: sessionSelected,
              data: customList,
            });
            saveSessionTimeout[sessionSelected] = null;
          }, 500);
        }
      };

      tinyAi.on('setMaxOutputTokens', (value, id) => {
        outputLength.val(value);
        saveSessionBackup(id);
      });

      tinyAi.on('setTemperature', (value, id) => {
        temperature.val(value);
        saveSessionBackup(id);
      });

      tinyAi.on('setTopP', (value, id) => {
        topP.val(value);
        saveSessionBackup(id);
      });

      tinyAi.on('setTopK', (value, id) => {
        topK.val(value);
        saveSessionBackup(id);
      });

      tinyAi.on('setPresencePenalty', (value, id) => {
        presencePenalty.val(value);
        saveSessionBackup(id);
      });

      tinyAi.on('setFrequencyPenalty', (value, id) => {
        frequencyPenalty.val(value);
        saveSessionBackup(id);
      });

      tinyAi.on('setModel', (data, id) => {
        saveSessionBackup(id);
      });

      tinyAi.on('setPrompt', (data, hash, id) => {
        saveSessionBackup(id);
      });

      tinyAi.on('setFirstDialogue', (data, hash, id) => {
        saveSessionBackup(id);
      });

      tinyAi.on('setSystemInstruction', (data, hash, id) => {
        saveSessionBackup(id);
      });

      tinyAi.on('setRpgSchema', (value, id) => {
        saveSessionBackup(id);
      });

      tinyAi.on('setRpgData', (value, id) => {
        saveSessionBackup(id);
      });

      tinyAi.on('setRpgPrivateData', (value, id) => {
        saveSessionBackup(id);
      });

      // Delete session
      tinyAi.on('stopDataId', (id) => {
        if (canUsejsStore && id) resetSession(id).catch(console.error);
      });

      // Delete message
      tinyAi.on('deleteIndex', (index, id, sId) => {
        if (typeof id === 'number' || typeof id === 'string') {
          if (canUsejsStore)
            connStore
              .remove({
                from: 'aiSessionsData',
                where: { msg_id: tinyMsgIdDb(sId, id) },
              })
              .catch(console.error);
        }
      });

      // Edit message
      tinyAi.on('replaceIndex', (index, ndata, ntokens, nhash, sId) => {
        const id = tinyAi.getIdByIndex(index);
        const data = tinyAi.getMsgByIndex(index);
        const tokens = tinyAi.getMsgTokensByIndex(index);
        const hash = tinyAi.getMsgHashByIndex(index);
        if (typeof id === 'number' || typeof id === 'string') {
          if (canUsejsStore)
            tinyInsertDb('aiSessionsData', {
              session: sId,
              msg_id: tinyMsgIdDb(sId, id),
              data,
              id,
              tokens,
              hash,
            });
        }
      });

      // Add message
      tinyAi.on('addData', (newId, data, tokenData, hash, sId) => {
        if (canUsejsStore)
          tinyInsertDb('aiSessionsData', {
            session: sId,
            msg_id: tinyMsgIdDb(sId, newId),
            data,
            id: newId,
            tokens: tokenData,
            hash,
          });
      });

      // tinyAi.on('selectDataId', () => {});

      // Prepare RPG
      rpgData.html.public = tinyLib.bs.offcanvas(
        'start',
        'rpg_ai_base_1',
        '',
        rpgData.base.public,
        true,
      );
      rpgData.html.private = tinyLib.bs.offcanvas(
        'end',
        'rpg_ai_base_2',
        '',
        rpgData.base.private,
        false,
      );
      container.prepend(rpgData.html.public, rpgData.html.private);
      rpgData.offcanvas.public = new bootstrap.Offcanvas(rpgData.html.public.get(0));
      rpgData.offcanvas.private = new bootstrap.Offcanvas(rpgData.html.private.get(0));

      const completeTheOffCanvasRpg = () => {
        // offCanvas closed
        const onOffCanvasClosed = (where, type) => () => {
          setTimeout(() => {
            const tinyData = rpgData.data[where].getValue();
            if (tinyData) {
              rpgData.setAllowAiUse(tinyData.allowAiUse, where);
              rpgData.setAllowAiSchemaUse(tinyData.allowAiSchemaUse, where);
              if (
                rpgData.data[where].isEnabled() &&
                rpgData.hash[where] !== rpgData.oldHash[where]
              ) {
                rpgData.oldHash[where] = rpgData.hash[where];
                tinyAi.setCustomValue(type, null, 0);
                updateAiTokenCounterData();
              }
            }
          }, 300);
        };
        rpgData.html.public
          .get(0)
          .addEventListener('hide.bs.offcanvas', onOffCanvasClosed('public', 'rpgData'));
        rpgData.html.private
          .get(0)
          .addEventListener('hide.bs.offcanvas', onOffCanvasClosed('private', 'rpgPrivateData'));
      };

      // Enable Read Only
      const validateMultiplayer = (value = null, needAi = true, isInverse = false) =>
        // Normal mode
        !tinyAiScript.multiplayer
          ? // Ai enabled
            !needAi || !tinyAiScript.noai
            ? value
            : // No AI
              !isInverse
              ? true
              : false
          : // Multiplayer
            !isInverse
            ? true
            : false;

      const enableModelSelectorReadOnly = (value = true) => {
        const isEnabled = validateMultiplayer(value);
        modelSelector.prop('disabled', isEnabled);
        if (isEnabled) modelSelector.addClass('disabled');
        else modelSelector.removeClass('disabled');
      };

      const enableModelReadOnly = (value = true) => {
        const isEnabled = validateMultiplayer(value);
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

      const enableMessageButtons = (value = true) => {
        const isEnabled = validateMultiplayer(value, false);
        if (isEnabled) chatContainer.removeClass('hide-msg-buttons');
        else chatContainer.addClass('hide-msg-buttons');
      };

      const readOnlyTemplate = (item, value, needAi = true) => {
        const isEnabled = validateMultiplayer(value, needAi);
        item.prop('disabled', isEnabled);
        if (isEnabled) {
          item.addClass('disabled');
        } else {
          item.removeClass('disabled');
        }
      };

      const enableReadOnly = (isEnabled = true, controller = null) => {
        readOnlyTemplate(msgSubmit, isEnabled, false);
        readOnlyTemplate(msgInput, isEnabled, false);
        readOnlyTemplate(cancelSubmit, !isEnabled || !controller, false);
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
        for (const index in ficResets) readOnlyTemplate(ficResets[index], isEnabled, false);
        for (const index in ficTemplates) readOnlyTemplate(ficTemplates[index], isEnabled, false);
        for (const index in importItems) readOnlyTemplate(importItems[index], isEnabled, false);
      };

      // First Dialogue script
      const enabledFirstDialogue = (value = true) => {
        const isEnabled = validateMultiplayer(value, false, true);
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
            history &&
            history.data.length < 1 &&
            typeof history.firstDialogue === 'string' &&
            history.firstDialogue.length > 0
          )
            insertAddFirstDialogue();
          else removeAddFirstDialogue();
        } else removeAddFirstDialogue();
      };

      // Disable dialogue buttons
      const disablePromptButtons = (value = false) => {
        const isDisabled = validateMultiplayer(value, false);
        // Execute disable script
        for (const item in rpgData.ready) {
          if (rpgData.ready[item]) {
            if (isDisabled) rpgData.data[item].disable();
            else rpgData.data[item].enable();
          }
        }

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

      // Multiplayer disable inputs
      if (tinyAiScript.multiplayer || tinyAiScript.noai) {
        if (tinyAiScript.multiplayer) modelChangerReadOnly();
        enableModelReadOnly();
        enableModelSelectorReadOnly();
      }

      // Welcome
      if (!tinyAiScript.multiplayer) {
        makeTempMessage(
          `Welcome to Pony Driland's chatbot! This is a chatbot developed exclusively to interact with the content of fic`,
          'Website',
        );
        makeTempMessage(
          'This means that whenever the story is updated, I am automatically updated for you to always view the answers of the latest content, because the algorithm of this website converts the content of fic to prompts.' +
            '\n\nChoose something to be done here so we can start our conversation! The chat will not work until you choose an activity to do here',
          'Website',
        );
        updateModelList();
      }

      // Complete
      $('#markdown-read').append(container);
      await rpgData.init().then(completeTheOffCanvasRpg);

      // Rpg mode
      if (!canUsejsStore) {
        tinyIo.client = new TinyClientIo(rpgCfg);
        tinyIo.socket = tinyIo.client.getSocket();
        if (tinyIo.socket)
          makeTempMessage(
            `A server has been detected in your config and we will try to connect to it now!`,
            rpgCfg.ip,
          );

        // Start rpg mode
        //////////////////////////////
        if (tinyAiScript.multiplayer || tinyIo.socket) {
          // Online tab html
          const onlineStatus = {};
          onlineStatus.base = $('<div>').addClass('mb-1 small');
          onlineStatus.wrapper = $('<div>').addClass('d-flex align-items-center gap-1');
          onlineStatus.icon = tinyLib.icon('fas fa-circle text-danger');
          onlineStatus.text = $('<span>').text('Offline');
          onlineStatus.id = $('<span>');
          onlineStatus.wrapper.append(onlineStatus.icon, onlineStatus.text, onlineStatus.id);
          onlineStatus.base.append(onlineStatus.wrapper, onlineStatus.id);
          connectionInfoBar.replaceWith(onlineStatus.base);

          // Socket client
          if (tinyIo.socket) {
            const { client } = tinyIo;
            // Connection

            // Send error message
            const sendSocketError = (result) =>
              makeTempMessage(
                typeof result.msg === 'string'
                  ? `${result.msg} (Code: ${typeof result.code === 'number' ? result.code : 0})`
                  : 'Unknown error!',
                rpgCfg.ip,
              );

            client.install();
            client.onConnect(() => {
              // Online!
              const connectionId = client.getSocket()?.id;
              onlineStatus.icon.removeClass('text-danger').addClass('text-success');
              onlineStatus.text.text('Online');
              onlineStatus.id.empty().text('Id: ').append($('<strong>').text(connectionId));

              // First time message
              client.resetData();
              const firstTime = tinyIo.firstTime;
              if (firstTime) tinyIo.firstTime = false;

              // Message
              makeTempMessage(
                `You are connected! Your connection id is **${connectionId}**. Signing into your account...`,
                rpgCfg.ip,
              );

              // Login
              client.login().then((result) => {
                // Message
                if (!result.error) {
                  makeTempMessage(
                    `Welcome **${result.nickname || result.userId}**! You were successfully logged in! Entering the room...`,
                    rpgCfg.ip,
                  );
                }
                // Error
                if (result.error) {
                  sendSocketError(result);
                  $.LoadingOverlay('hide');
                }
                // Check room
                else {
                  // Insert data
                  client.setUser(result);
                  console.log('[socket-io] [user-data]', client.getUser());
                  console.log('[socket-io] [ratelimit]', client.getRateLimit());
                  client.existsRoom().then((result2) => {
                    // Join room
                    const joinRoom = () =>
                      client.joinRoom().then((result4) => {
                        if (!result4.error) {
                          makeTempMessage(
                            `You successfully entered the room **${result4.roomId}**!`,
                            rpgCfg.ip,
                          );
                        }
                        // Error
                        else sendSocketError(result4);

                        // Complete
                        $.LoadingOverlay('hide');
                      });

                    // Error
                    if (result2.error) sendSocketError(result2);
                    // Exists?
                    else if (result2.exists) joinRoom();
                    else {
                      if (!tinyAiScript.multiplayer)
                        client.createRoom().then((result3) => {
                          if (!result3.error) joinRoom();
                          else sendSocketError(result3);
                        });
                      else makeTempMessage('The room was not found', rpgCfg.ip);
                    }
                  });
                }
              });
            });

            // Disconnected
            client.onDisconnect((reason, details) => {
              // Offline!
              onlineStatus.icon.addClass('text-danger').removeClass('text-success');
              onlineStatus.text.text('Offline');
              onlineStatus.id.empty();

              // Message
              makeTempMessage(`You are disconected! ${details.description}`, rpgCfg.ip);
              if (tinyAiScript.multiplayer)
                $.LoadingOverlay('show', { background: 'rgba(0,0,0, 0.5)' });
            });

            // Enter room
            client.on('roomEntered', (success) => {
              if (!success) makeTempMessage(`Invalid room data detected!`, rpgCfg.ip);
            });

            // New message
            client.on('newMessage', () => {
              if (tinyAiScript.multiplayer) {
              }
            });

            // Dice rool
            client.on('diceRoll', () => {});
          }

          // No server
          if (!tinyIo.socket)
            makeTempMessage('No server has been detected. Your session is cancelled!', rpgCfg.ip);
          else if (!tinyAiScript.multiplayer) return;
        }
      }

      // Load backup
      else {
        const sessionData = {
          rooms: await connStore.select({ from: 'aiSessionsRoom' }),
          hash: await connStore.select({ from: 'aiSessionsHash' }),
          tokens: await connStore.select({ from: 'aiSessionsTokens' }),
          customList: await connStore.select({ from: 'aiSessionsCustomList' }),
          data: await connStore.select({
            from: 'aiSessionsData',
            order: { by: 'id', type: 'asc' },
          }),
        };
        const sessions = {};
        const executeSessionInsert = (where, callback) => {
          for (const index in sessionData[where]) {
            const sessionItem = sessionData[where][index];
            if (!sessions[sessionItem.session])
              sessions[sessionItem.session] = {
                id: sessionItem.session,
                file: { data: [], ids: [] },
              };
            callback(sessionItem, sessions[sessionItem.session].file);
          }
        };

        // Insert rooms
        executeSessionInsert('rooms', (item, file) => {
          for (const name in item) file[name] = item[name];
          if (!canSandBox(item.session) && typeof file.systemInstruction !== 'undefined')
            delete file.systemInstruction;
          delete file.session;
        });

        // Insert hash
        executeSessionInsert('hash', (item, file) => {
          file.hash = { data: [] };
          for (const name in item) if (typeof item[name] === 'string') file.hash[name] = item[name];
          delete file.hash.session;
        });

        // Insert tokens
        executeSessionInsert('tokens', (item, file) => {
          file.tokens = { data: [] };
          for (const name in item)
            if (typeof item[name] === 'number') file.tokens[name] = item[name];
        });

        // Insert custom list
        executeSessionInsert('customList', (item, file) => {
          file.customList = item.data || null;
        });

        // Insert data
        executeSessionInsert('data', (item, file) => {
          // Insert id
          file.ids.push(typeof item.id === 'number' ? item.id : null);
          // Insert hash
          file.hash.data.push(typeof item.hash === 'string' ? item.hash : null);
          // Insert tokens
          const tokens = objType(item.tokens, 'object') ? item.tokens : { count: null };
          if (typeof tokens.count !== 'number') tokens.count = null;
          file.tokens.data.push(tokens);
          // Insert data
          if (objType(item.data, 'object')) file.data.push(item.data);
        });

        // Import data
        for (const item in sessions) await importFileSession(sessions[item]);
      }
    }

    // No AI data
    else {
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
