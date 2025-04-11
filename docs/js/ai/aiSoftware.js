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
  const tinyIo = { client: null, firstTime: true };
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
      tinyAiScript.mpClient = false;
      tinyAiScript.noai = false;

      // Google Generative
      if (selectedAi === 'google-generative')
        setGoogleAi(tinyAi, tinyStorage.getApiKey('google-generative')?.key);

      // Tiny Chat --> this is a multiplayer client session
      if (selectedAi === 'tiny-chat') tinyAiScript.mpClient = true;

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
    let sessionEnabled = true;
    tinyNotification.requestPerm();
    // Update Url
    urlUpdate('ai', 'AI Page');

    // Clear page
    clearFicData();
    $('#markdown-read').empty();
    $('#top_page').addClass('d-none');

    // Can use backup
    const rpgCfg = tinyStorage.getApiKey(tinyStorage.selectedAi()) || {};
    const canUsejsStore = typeof rpgCfg.ip !== 'string' || rpgCfg.ip.length < 1;

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
      const contentEnabler = new EnablerAiContent();
      const rpgData = new RpgData();

      // Get RPG Template
      rpgData.setTinyAi(tinyAi);
      contentEnabler.setRpgData(rpgData);

      // Load Models
      if (!tinyAiScript.noai && !tinyAiScript.mpClient && tinyAi.getModelsList().length < 1)
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
      contentEnabler.setModelSelector(modelSelector);
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
          valString: function () {
            return String(ranger.val());
          },
          valString2: function () {
            return String(rangerNumber.val());
          },
        };
      };

      // Output Length
      const outputLength = $('<input>', {
        type: 'number',
        class: 'form-control',
      });
      contentEnabler.setOutputLength(outputLength);

      outputLength.on('input', () =>
        tinyAi.setMaxOutputTokens(convertToNumber(outputLength.val())),
      );

      // Temperature
      const temperature = tinyRanger();
      contentEnabler.setTemperature(temperature);
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
      contentEnabler.setTopP(topP);
      topP.getBase().on('input', () => tinyAi.setTopP(convertToNumber(topP.val())));
      topP.getBase2().on('change', () => tinyAi.setTopP(convertToNumber(topP.val())));

      // Top K
      const topK = tinyRanger();
      contentEnabler.setTopK(topK);
      topK.getBase().on('input', () => tinyAi.setTopK(convertToNumber(topK.val())));
      topK.getBase2().on('change', () => tinyAi.setTopK(convertToNumber(topK.val())));

      // Presence penalty
      const presencePenalty = tinyRanger();
      contentEnabler.setPresencePenalty(presencePenalty);
      presencePenalty
        .getBase()
        .on('input', () => tinyAi.setPresencePenalty(convertToNumber(presencePenalty.val())));
      presencePenalty
        .getBase2()
        .on('change', () => tinyAi.setPresencePenalty(convertToNumber(presencePenalty.val())));

      // Frequency penalty
      const frequencyPenalty = tinyRanger();
      contentEnabler.setFrequencyPenalty(frequencyPenalty);
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
              if (sessionEnabled) {
                contentEnabler.enBase();
                contentEnabler.enMessageButtons();
              }
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
              if (sessionEnabled) contentEnabler.enPromptButtons();
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
            contentEnabler.enBase();
            contentEnabler.enMessageButtons();
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
      rpgData.setFicConfigs(ficConfigs);

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
      contentEnabler.setFicResets(ficResets);

      // Fic Templates
      const ficTemplates = [];
      contentEnabler.setFicTemplates(ficTemplates);
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
        tinyLib.upload.json(
          createButtonSidebar('fa-solid fa-file-import', 'Import'),
          (err, jsonData) => {
            if (err) {
              console.error(err);
              alert(err.message);
              return;
            }
            importFileSession(jsonData, true);
          },
        ),
      ];
      contentEnabler.setImportItems(importItems);

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
      contentEnabler.setFicPromptItems(ficPromptItems);

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

      const isOnline = () => (!canUsejsStore && tinyIo.client ? true : false);
      const leftMenu = [];

      if (!tinyAiScript.mpClient) {
        // Reset
        leftMenu.push($('<h5>').text('Reset'));
        leftMenu.push(...ficResets);

        // Modes
        leftMenu.push($('<h5>').text('Modes'));

        // Fic Talk
        leftMenu.push(...ficTemplates);
      }

      // Settings
      leftMenu.push($('<h5>').text('Settings'));
      leftMenu.push(...ficPromptItems);

      // RPG
      leftMenu.push($('<h5>').text('RPG'));
      // Dice
      leftMenu.push(
        createButtonSidebar('fa-solid fa-dice', 'Roll Dice', () => {
          // Root
          const $root = $('<div>');
          const $formRow = $('<div>').addClass('row g-3');
          const $totalBase = $('<center>', { class: 'fw-bold mt-3' }).text(0);

          // Config
          const tinyCfg = {
            isOnline: isOnline(),
            data: {},
            rateLimit: {},
          };

          if (tinyCfg.isOnline) {
            tinyCfg.data = tinyIo.client.getDice() || {};
            const ratelimit = tinyIo.client.getRateLimit() || { dice: {}, size: {} };
            if (objType(ratelimit.dice, 'object')) tinyCfg.rateLimit = ratelimit.dice;
          } else {
            tinyCfg.data.img = localStorage.getItem(`tiny-dice-img`) || undefined;
            tinyCfg.data.bg = localStorage.getItem(`tiny-dice-bg`) || 'white';
            tinyCfg.data.text = localStorage.getItem(`tiny-dice-text`) || 'black';
            tinyCfg.data.border =
              localStorage.getItem(`tiny-dice-border`) || '2px solid rgba(0, 0, 0, 0.05)';
            tinyCfg.data.selectionBg = localStorage.getItem(`tiny-dice-selection-bg`) || 'black';
            tinyCfg.data.selectionText =
              localStorage.getItem(`tiny-dice-selection-text`) || 'white';
          }

          // Form template
          const configs = {};
          const genLabel = (id, text) =>
            $('<label>').addClass('form-label').attr('for', `tiny-dice_${id}`).text(text);

          const genInput = (id, type, value, min) =>
            $('<input>')
              .addClass('form-control text-center')
              .attr({ id: `tiny-dice_${id}`, type, min })
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
              genConfig('perDieValues', 'Per-Die Values (e.g., 6,12,20)', 'text', '', 'Optional'),
            );

          const $allow0input = $('<input>')
            .addClass('form-check-input')
            .attr({ type: 'checkbox', id: 'tiny-dice_allow0' });
          const $allow0Col = $('<div>')
            .addClass('d-flex justify-content-center align-items-center mt-2')
            .append(
              $('<div>')
                .addClass('form-check')
                .append(
                  $allow0input,
                  $('<label>')
                    .addClass('form-check-label')
                    .attr('for', 'tiny-dice_allow0')
                    .text('Allow zero values'),
                ),
            );

          $formRow.append($maxValueCol, $diceCountCol, $perDieCol);

          // Roll button
          const $rollButton = tinyLib.bs.button('primary w-100 mb-4 mt-2').text('Roll Dice');

          // Add container
          const $diceContainer = $('<div>');
          const $diceError = $('<div>');
          const readSkinValues = [
            ['bgSkin', 'bg', 'setBgSkin'],
            ['textSkin', 'text', 'setTextSkin'],
            ['borderSkin', 'border', 'setBorderSkin'],
            ['bgImg', 'img', 'setBgImg'],
            ['selectionBgSkin', 'selectionBg', 'setSelectionBgSkin'],
            ['selectionTextSkin', 'selectionText', 'setSelectionTextSkin'],
          ];

          // TinyDice logic
          const dice = new TinyDice($diceContainer.get(0));
          let updateTotalBase = null;
          $rollButton.on('click', async function () {
            // Get values
            const max = parseInt(configs.maxValue.val()) || 6;
            const count = parseInt(configs.diceCount.val()) || 1;
            const perDieRaw = configs.perDieValues.val().trim();
            const perDie = perDieRaw.length > 0 ? perDieRaw : null;
            const canZero = $allow0input.is(':checked');
            $totalBase.text(0);
            if (updateTotalBase) {
              clearTimeout(updateTotalBase);
              updateTotalBase = null;
            }

            // Offline
            if (!tinyCfg.isOnline) {
              const result = dice.roll(max, count, perDie, canZero);
              let total = 0;
              for (const item of result) total += item.result;
              updateTotalBase = setTimeout(() => {
                $totalBase.text(total);
                updateTotalBase = null;
              }, 2000);
            }
            // Online
            else {
              // Prepare data
              const diceParse = dice.getRollConfig(max, count, perDie);
              const sameSides = diceParse.perDieData.length < 1 ? true : false;
              const sides = [];
              if (sameSides)
                for (let i = 0; i < diceParse.count; i++) sides.push(diceParse.maxGlobal);
              else
                for (const index in diceParse.perDieData) sides.push(diceParse.perDieData[index]);

              // Get result
              $(this).attr('disabled', true).addClass('disabled');
              const result = await tinyIo.client.rollDice(sides, sameSides, canZero);
              $(this).attr('disabled', false).removeClass('disabled');

              // Proccess Results
              if (!result.error) {
                dice.clearDiceArea();
                $totalBase.removeClass('text-danger');
                if (Array.isArray(result.results) && typeof result.total === 'number') {
                  for (const index in result.results) {
                    if (
                      typeof result.results[index].sides === 'number' &&
                      typeof result.results[index].roll === 'number'
                    )
                      dice.insertDiceElement(
                        result.results[index].roll,
                        result.results[index].sides,
                        canZero,
                      );
                  }
                  updateTotalBase = setTimeout(() => {
                    $totalBase.text(result.total);
                    updateTotalBase = null;
                  }, 2000);
                }
              } else $totalBase.addClass('text-danger').text(result.msg);
            }
          });

          // Skin form
          const createInputField = (label, id, placeholder, value) => {
            configs[id] = $('<input>')
              .addClass('form-control text-center')
              .attr({ type: 'text', placeholder })
              .val(value);

            return $('<div>')
              .addClass('col-md-4 text-center')
              .append($('<label>').addClass('form-label').attr('for', id).text(label), configs[id]);
          };

          configs.bgImg = $('<input>')
            .addClass('form-control')
            .addClass('d-none')
            .attr('type', 'text')
            .val(tinyCfg.data.img);
          const bgImgUploadButton = tinyLib.bs.button('info w-100');
          const uploadImgButton = tinyLib.upload.img(
            bgImgUploadButton.text('Select Image').on('contextmenu', (e) => {
              e.preventDefault();
              configs.bgImg.val('').removeClass('text-danger').trigger('change');
            }),
            (err, dataUrl) => {
              console.log(`[dice-file] [upload] Image length: ${dataUrl.length}`);

              // Error
              bgImgUploadButton.removeClass('text-danger');
              if (err) {
                console.error(err);
                bgImgUploadButton.addClass('text-danger');
                return;
              }

              const maxSize = tinyCfg.rateLimit.img || 0;
              const base64String = dataUrl.split(',')[1];
              const padding = (base64String.match(/=+$/) || [''])[0].length;
              const sizeInBytes = (base64String.length * 3) / 4 - padding;

              const convertToMb = (tinyBytes) => `${(tinyBytes / (1024 * 1024)).toFixed(2)} MB`;
              console.log(`[dice-file] [upload] Image size: ${convertToMb(sizeInBytes)}`);
              console.log(`[dice-file] [upload] Upload limit: ${convertToMb(maxSize)}`);

              // Big Image
              $diceError.empty();
              if (maxSize > 0 && sizeInBytes > maxSize) {
                bgImgUploadButton.addClass('text-danger');
                tinyLib.alert(
                  $diceError,
                  'danger',
                  'bi bi-exclamation-triangle-fill',
                  `Image is too large: ${convertToMb(sizeInBytes)} (max allowed: ${convertToMb(maxSize)})`,
                );
                return;
              }

              // OK
              configs.bgImg.val(dataUrl).removeClass('text-danger').trigger('change');
            },
          );

          const importDiceButton = tinyLib.upload.json(
            tinyLib.bs.button('info w-100').text('Import'),
            (err, jsonData) => {
              // Error
              if (err) {
                console.error(err);
                alert(err.message);
                return;
              }

              // Insert data
              if (objType(jsonData, 'object') && objType(jsonData.data, 'object')) {
                for (const index in readSkinValues) {
                  const readSkinData = readSkinValues[index];
                  const name = readSkinData[1];
                  const item = jsonData.data[name];
                  if (typeof item === 'string' || typeof item === 'number') {
                    const newValue =
                      typeof tinyCfg.rateLimit[name] !== 'number' ||
                      item.length <= tinyCfg.rateLimit[name]
                        ? item
                        : null;
                    configs[readSkinData[0]].val(newValue).trigger('change');
                  }
                }
              }
            },
          );

          const $formRow2 = $('<div>', { class: 'd-none' })
            .addClass('row g-3 mb-4')
            .append(
              // Background skin
              createInputField(
                'Background Skin',
                'bgSkin',
                'e.g. red or rgb(200,0,0)',
                tinyCfg.data.bg,
              ),
              // Text skin
              createInputField('Text Skin', 'textSkin', 'e.g. white or #fff', tinyCfg.data.text),
              // Border skin
              createInputField(
                'Border Skin',
                'borderSkin',
                'e.g. 2px solid rgba(255, 255, 255, 0.2)',
                tinyCfg.data.border,
              ),
              // Bg skin
              createInputField(
                'Select Bg Skin',
                'selectionBgSkin',
                'e.g. black or #000',
                tinyCfg.data.selectionBg,
              ),
              // Text skin
              createInputField(
                'Select Text Skin',
                'selectionTextSkin',
                'e.g. white or #fff',
                tinyCfg.data.selectionText,
              ),
              // Image upload
              configs.bgImg,
              $('<div>', { class: 'col-md-4 text-center' }).append(
                $('<label>').addClass('form-label').text('Custom Image'),
                uploadImgButton,
              ),
              // Export
              $('<div>', { class: 'col-md-6' }).append(
                tinyLib.bs
                  .button('info w-100')
                  .text('Export')
                  .on('click', () => {
                    // Data base
                    const fileData = { data: {} };
                    for (const index in readSkinValues) {
                      const readSkinData = readSkinValues[index];
                      fileData.data[readSkinData[1]] = configs[readSkinData[0]].val().trim();
                    }

                    // Date
                    fileData.date = Date.now();
                    // Save
                    saveAs(
                      new Blob([JSON.stringify(fileData)], { type: 'text/plain' }),
                      `tiny_dice_skin_ponydriland.json`,
                    );
                  }),
              ),
              // Import
              $('<div>', { class: 'col-md-6' }).append(importDiceButton),
            );

          const updateDiceData = (where, dataName, value) => {
            dice[where](value);
            if (!tinyIo.client) {
              if (value) localStorage.setItem(`tiny-dice-${dataName}`, value);
              else localStorage.removeItem(`tiny-dice-${dataName}`);
            }
            dice.updateDicesSkin();
          };

          for (const index in readSkinValues) {
            configs[readSkinValues[index][0]].on('change', function () {
              updateDiceData(
                readSkinValues[index][2],
                readSkinValues[index][1],
                $(this).val().trim() || null,
              );
            });
          }

          const updateAllSkins = () => {
            for (const index in readSkinValues) configs[readSkinValues[index][0]].trigger('change');
          };

          // Root insert
          $root.append($('<center>').append($formRow), $allow0Col, $formRow2);

          // Main button of the skin editor
          const $applyBtn = tinyLib.bs.button('success w-100').text('Edit Skin Data');
          $applyBtn.on('click', async function () {
            // Show content
            if ($formRow2.hasClass('d-none')) {
              $applyBtn.text(tinyIo.client ? 'Apply Dice Skins' : 'Hide Skin Data');
            }
            // Hide Content
            else {
              $applyBtn.text('Edit Skin Data');
              if (tinyCfg.isOnline) {
                updateAllSkins();

                // Disable buttons
                $applyBtn.attr('disabled', true).addClass('disabled');
                const diceSkin = {};
                importDiceButton.attr('disabled', true).addClass('disabled');
                uploadImgButton.attr('disabled', true).addClass('disabled');

                // Send dice data
                for (const index in readSkinValues)
                  diceSkin[readSkinValues[index][1]] = configs[readSkinValues[index][0]]
                    .attr('disabled', true)
                    .addClass('disabled')
                    .val()
                    .trim();

                const result = await tinyIo.client.setAccountDice(diceSkin);
                if (result.error) $totalBase.addClass('text-danger').text(result.msg);
                else {
                  $totalBase.removeClass('text-danger').text(0);
                  tinyIo.client.setDice(diceSkin);
                }

                // Enable buttons again
                for (const index in readSkinValues)
                  configs[readSkinValues[index][0]].attr('disabled', false).removeClass('disabled');
                uploadImgButton.attr('disabled', false).removeClass('disabled');
                importDiceButton.attr('disabled', false).removeClass('disabled');
                $applyBtn.attr('disabled', false).removeClass('disabled');
              }
            }
            // Change class mode
            $formRow2.toggleClass('d-none');
          });

          $root.append($applyBtn, $rollButton, $diceError, $diceContainer, $totalBase);
          updateAllSkins();
          dice.roll(0, 3);

          // Start modal
          tinyLib.modal({
            title: 'Dice Roll',
            dialog: 'modal-lg',
            id: 'dice-roll',
            body: $root,
          });
        }),
      );

      // RPG Data
      leftMenu.push(
        createButtonSidebar('fa-solid fa-note-sticky', 'View Data', null, false, {
          toggle: 'offcanvas',
          target: '#rpg_ai_base_1',
        }),
      );

      // Private RPG Data
      leftMenu.push(
        createButtonSidebar('fa-solid fa-book', 'View Private', null, false, {
          toggle: 'offcanvas',
          target: '#rpg_ai_base_2',
        }),
      );

      // Classic Map
      leftMenu.push(
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
                  tinyHtml.append(map.getMapBaseHtml(), $('<center>').append(map.getMapButton()));
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
      );

      // Online Mode options
      if (!canUsejsStore) {
        leftMenu.push($('<h5>').text('Online'));

        leftMenu.push(
          createButtonSidebar('fas fa-users', 'Room settings', () => {
            if (tinyIo.client) {
              const room = tinyIo.client.getRoom() || {};
              const ratelimit = tinyIo.client.getRateLimit() || { size: {}, limit: {} };
              const user = tinyIo.client.getUser() || {};
              const cantEdit = room.ownerId !== tinyIo.client.getUserId() && !user.isOwner;

              const $root = $('<div>');

              const $formContainer = $('<div>').addClass('mb-4');
              const $editError = $('<div>').addClass('text-danger small mt-2');
              const $deleteError = $('<div>').addClass('text-danger small mt-2');

              // ─── Edit room ───────────────────────────────
              const $editForm = $('<form>').addClass('mb-4');
              $editForm.append($('<h5>').text('Edit Room Info'));

              const $roomId = $('<input>')
                .attr({
                  type: 'text',
                  id: 'roomId',
                  placeholder: 'Enter new room title',
                  maxLength: ratelimit.size.roomId,
                })
                .prop('disabled', true)
                .addClass('form-control')
                .addClass('form-control')
                .val(tinyIo.client.getRoomId());

              const $roomTitle = $('<input>')
                .attr({
                  type: 'text',
                  id: 'roomTitle',
                  placeholder: 'Enter new room title',
                  maxLength: ratelimit.size.roomTitle,
                })
                .addClass('form-control')
                .val(room.title)
                .prop('disabled', cantEdit);

              $editForm.append(
                $('<div>')
                  .addClass('row mb-3')
                  .append(
                    $('<div>')
                      .addClass('col-md-6')
                      .append(
                        $('<label>').attr('for', 'roomId').addClass('form-label').text('Room ID'),
                        $roomId,
                      ),
                    $('<div>')
                      .addClass('col-md-6')
                      .append(
                        $('<label>')
                          .attr('for', 'roomTitle')
                          .addClass('form-label')
                          .text('Room Title'),
                        $roomTitle,
                      ),
                  ),
              );

              // Max users
              $editForm.append(
                $('<div>')
                  .addClass('mb-3')
                  .append(
                    $('<label>').attr('for', 'maxUsers').addClass('form-label').text('Max Users'),
                    $('<input>')
                      .attr({
                        type: 'number',
                        id: 'maxUsers',
                        min: 1,
                        max: ratelimit.limit.roomUsers,
                        placeholder: 'Maximum number of users',
                      })
                      .addClass('form-control')
                      .val(room.maxUsers)
                      .prop('disabled', cantEdit),
                  ),
              );

              // New password
              $editForm.append(
                $('<div>')
                  .addClass('mb-3')
                  .append(
                    $('<label>')
                      .attr('for', 'roomPassword')
                      .addClass('form-label')
                      .text('New Room Password'),
                    $('<input>')
                      .attr({
                        type: 'password',
                        id: 'roomPassword',
                        placeholder: 'Leave empty to keep current password',
                        maxLength: ratelimit.size.password,
                      })
                      .addClass('form-control')
                      .prop('disabled', cantEdit),
                  ),
              );

              // Submit
              $editForm.append(
                $('<button>')
                  .attr('type', 'submit')
                  .addClass('btn btn-primary')
                  .text('Save Changes')
                  .prop('disabled', cantEdit),
              );

              // ─── Delete room ─────────────────────────────
              const $deleteSection = $('<div>').addClass('border-top pt-4');

              $deleteSection.append(
                $('<h5>').addClass('text-danger').text('Delete Room'),
                $('<p>')
                  .addClass('text-muted mb-2')
                  .html(
                    'This action <strong>cannot be undone</strong>. Deleting this room will remove all its data permanently.',
                  ),
              );

              const $deleteForm = $('<form>').addClass('d-flex flex-column gap-2');

              // Your password
              $deleteForm.append(
                $('<div>').append(
                  $('<label>')
                    .attr('for', 'ownerPassword')
                    .addClass('form-label')
                    .text('Enter your current password to confirm:'),
                  $('<input>')
                    .attr({
                      type: 'password',
                      id: 'ownerPassword',
                      placeholder: 'Current account password',
                      maxLength: ratelimit.size.password,
                    })
                    .addClass('form-control')
                    .prop('disabled', cantEdit),
                ),
              );

              // Delete now
              $deleteForm.append(
                $('<button>')
                  .attr('type', 'submit')
                  .addClass('btn btn-danger mt-2')
                  .text('Delete Room Permanently')
                  .prop('disabled', cantEdit),
              );

              $deleteSection.append($deleteForm);

              // ─── Container time ───────────────────────────────
              $formContainer.append($editForm, $deleteSection);

              // ─── Add into the DOM ───
              $root.append($formContainer);

              $editForm.append($editError);
              $deleteForm.append($deleteError);

              // Start modal
              const modal = tinyLib.modal({
                title: 'Room Settings',
                dialog: 'modal-lg',
                id: 'user-manager',
                body: $root,
              });

              $editForm.on('submit', (e) => {
                e.preventDefault();
                if (!cantEdit) {
                  $editError.empty(); // limpa erros anteriores

                  const title = $roomTitle.val().trim();
                  const maxUsers = parseInt($editForm.find('#maxUsers').val(), 10);
                  const password = $editForm.find('#roomPassword').val().trim();

                  if (Number.isNaN(maxUsers) || maxUsers <= 0) {
                    $editError.text('Max users must be a positive number.');
                    return;
                  }

                  if (maxUsers > 50) {
                    $editError.text('Max users cannot exceed 50.');
                    return;
                  }

                  const newSettings = { title, maxUsers };
                  if (typeof password === 'string' && password.length > 0)
                    newSettings.password = password;

                  modal.modal('hide');
                  tinyIo.client.updateRoomSettings(newSettings).then((result) => {
                    if (result.error) alert(`${result.msg}\nCode ${result.code}`);
                    else alert('Your room settings has been changed successfully!');
                  });
                }
              });

              $deleteForm.on('submit', (e) => {
                e.preventDefault();
                if (!cantEdit) {
                  $deleteError.empty(); // limpa erros anteriores

                  const password = $deleteForm.find('#ownerPassword').val().trim();

                  if (!password) {
                    $deleteError.text('Please enter your current password.');
                    return;
                  }

                  if (!confirm('Are you absolutely sure? This cannot be undone.')) return;

                  modal.modal('hide');
                  tinyIo.client.deleteRoom(password).then((result) => {
                    if (result.error) alert(`${result.msg}\nCode ${result.code}`);
                    else alert('Your room has been deleted successfully!');
                  });
                }
              });
            }
          }),
        );

        leftMenu.push(
          createButtonSidebar('fas fa-users', 'User manager', () => {
            if (tinyIo.client) {
              const $root = $('<div>');

              // Start modal
              const modal = tinyLib.modal({
                title: 'User manager',
                dialog: 'modal-lg',
                id: 'user-manager',
                body: $root,
              });

              // Start user room data
              const user = tinyIo.client.getUser() || {};
              const room = tinyIo.client.getRoom() || {};
              const userManager = new UserRoomManager({
                client: tinyIo.client,
                currentUserId: user.userId,
                isOwner: user.userId === room.ownerId,
                root: $root,
                users: clone(tinyIo.client.getUsers()),
                moderators: [],
              });

              const mods = tinyIo.client.getMods() || [];
              for (userId of mods) userManager.promoteModerator(userId);

              userManager.setRoomStatus(!room.disabled);

              // Add events
              const usersAdded = (data) => userManager.addUser(data.userId, clone(data.data));
              const usersRemoved = (userId) => userManager.removeUser(userId);
              const userModUpdated = (type, userId) => {
                if (type === 'add') userManager.promoteModerator(userId);
                if (type === 'remove') userManager.demoteModerator(userId);
              };
              const roomStatusUpdate = (roomData) => {
                userManager.setRoomStatus(!roomData.disabled);
              };

              tinyIo.client.on('userPing', usersAdded);
              tinyIo.client.on('userJoined', usersAdded);
              tinyIo.client.on('userLeft', usersRemoved);
              tinyIo.client.on('userKicked', usersRemoved);
              tinyIo.client.on('userBanned', usersRemoved);
              tinyIo.client.on('roomModChange', userModUpdated);
              tinyIo.client.on('roomUpdates', roomStatusUpdate);

              // Close modal
              modal.on('hidden.bs.modal', () => {
                tinyIo.client.off('userPing', usersAdded);
                tinyIo.client.off('userJoined', usersAdded);
                tinyIo.client.off('userLeft', usersRemoved);
                tinyIo.client.off('userKicked', usersRemoved);
                tinyIo.client.off('userBanned', usersRemoved);
                tinyIo.client.off('roomModChange', userModUpdated);
                tinyIo.client.off('roomUpdates', roomStatusUpdate);
                userManager.destroy();
              });
            }
          }),
        );

        const templateChangeInfo = (
          id,
          icon,
          buttonName,
          title,
          labelName,
          placeHolder,
          infoName,
          getInfo,
          callback,
        ) => {
          leftMenu.push(
            createButtonSidebar(icon, buttonName, () => {
              // Prepare root
              const $root = $('<div>');

              const $card = $('<div>').addClass('card shadow rounded-4');
              const $cardBody = $('<div>').addClass('card-body');

              const $inputGroup = $('<div>').addClass('mb-3');
              const $label = $('<label>')
                .addClass('form-label')
                .attr('for', 'on_edit_tinyinfo')
                .text(labelName);

              const $input = $('<input>').addClass('form-control').addClass('text-center').attr({
                type: 'text',
                id: 'on_edit_tinyinfo',
                placeholder: placeHolder,
              });

              // Page information
              const { ratelimit, userData } = getInfo();
              $input
                .attr('maxLength', ratelimit.size[infoName])
                .val(typeof userData[infoName] === 'string' ? userData[infoName] : '')
                .on('keydown', function (e) {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    $saveBtn.trigger('click');
                  }
                });

              const $saveBtn = tinyLib.bs.button('primary w-100').text('Save');

              // Build elements
              $inputGroup.addClass('text-center').append($label, $input);
              $cardBody.append($inputGroup, $saveBtn);
              $card.append($cardBody);
              $root.append($card);

              // Click button event
              $saveBtn.on('click', function () {
                callback($input.val().trim());
                modal.modal('hide');
              });

              // Start modal
              const modal = tinyLib.modal({
                title: title,
                dialog: 'modal-lg',
                id,
                body: $root,
              });

              modal.on('shown.bs.modal', () => {
                $input.trigger('focus');
              });
            }),
          );
        };

        // Edit nickname
        templateChangeInfo(
          'edit-nickname', // Id
          'fa-solid fa-id-card', // Icon
          'Edit nickname', // Button name
          'Edit your Nickname', // Title
          'Nickname', // Label name
          'Enter your nickname', // Place Holder
          'nickname', // Object Name
          () => {
            const ratelimit = tinyIo.client.getRateLimit() || { size: {} };
            const userData = tinyIo.client.getUser() || {};
            return { ratelimit, userData };
          },
          (value) => {
            tinyIo.client.changeNickname(value).then((result) => {
              if (result.error) alert(`${result.msg}\nCode ${result.code}`);
              else alert('Your nickname has been changed successfully!');
            });
          },
        );

        leftMenu.push(
          createButtonSidebar('fas fa-key', 'Change password', () => {
            // Root
            const ratelimit = tinyIo.client.getRateLimit() || { size: {} };
            const $root = $('<div>');

            // Error place
            const $errorBox = tinyLib.bs.alert('danger', '', false).addClass('d-none');

            // Create label and input
            const createInputGroup = (labelText, inputId, type = 'password') => {
              const $group = $('<div>').addClass('mb-3');
              const $label = $('<label>')
                .addClass('form-label')
                .attr('for', inputId)
                .text(labelText);
              const $input = $('<input>').addClass('form-control').attr({
                type,
                id: inputId,
                placeholder: labelText,
                maxLength: ratelimit.size.password,
              });
              $group.append($label, $input);
              return { group: $group, input: $input };
            };

            const current = createInputGroup('Current Password', 'current-password');
            const newPass = createInputGroup('New Password', 'new-password');
            const confirmPass = createInputGroup('Confirm New Password', 'confirm-password');

            // Change password button
            const $button = tinyLib.bs.button('primary').addClass('w-100').text('Change Password');

            // Build all
            $root.append($errorBox, current.group, newPass.group, confirmPass.group, $button);

            // show error
            const showError = (msg) => {
              $errorBox.html(msg).removeClass('d-none');
            };

            // Hide the error when the user starts to type
            [current.input, newPass.input, confirmPass.input].forEach(($input) => {
              $input.on('input', () => $errorBox.addClass('d-none'));
            });

            // Enter button
            [current.input, newPass.input, confirmPass.input].forEach(($input) => {
              $input.on('keydown', (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  $button.trigger('click');
                }
              });
            });

            // Button click
            $button.on('click', () => {
              const currentVal = current.input.val().trim();
              const newVal = newPass.input.val().trim();
              const confirmVal = confirmPass.input.val().trim();

              if (!currentVal || !newVal || !confirmVal) {
                showError('Please fill in all fields.');
                return;
              }

              if (newVal !== confirmVal) {
                showError('New passwords do not match.');
                return;
              }

              if (newVal.length < ratelimit.size.minPassword) {
                showError(
                  `New password must be at least ${ratelimit.size.minPassword} characters.`,
                );
                return;
              }

              // Tiny okay!
              $errorBox.addClass('d-none');
              modal.modal('hide');
              tinyIo.client.changePassword(currentVal, newVal).then((result) => {
                if (result.error) alert(`${result.msg}\nCode ${result.code}`);
                else alert('Your password has been changed successfully!');
              });
            });

            // Create modal
            const modal = tinyLib.modal({
              title: 'Change Password',
              dialog: 'modal-lg',
              id: 'modal-password-change',
              body: $root,
            });

            modal.on('shown.bs.modal', () => {
              current.input.trigger('focus');
            });
          }),
        );

        leftMenu.push(
          createButtonSidebar('fas fa-user-plus', 'Create account', () => {
            // Get data
            const ratelimit = tinyIo.client.getRateLimit() || { size: {} };
            const userData = tinyIo.client.getUser() || {};
            if (ratelimit.openRegistration || userData.isAdmin) {
              // Root container
              const $root = $('<div>');

              // Error alert box (initially hidden)
              const $errorBox = tinyLib.bs.alert('danger', '', false).addClass('d-none');

              // Helper to build input fields
              const createInputGroup = (labelText, inputId, maxLength = null, type = 'text') => {
                const $group = $('<div>').addClass('mb-3');
                const $label = $('<label>')
                  .addClass('form-label')
                  .attr('for', inputId)
                  .text(labelText);
                const $input = $('<input>')
                  .addClass('form-control')
                  .attr({ maxLength, type, id: inputId, placeholder: labelText });
                $group.append($label, $input);
                return { group: $group, input: $input };
              };

              // Input fields
              const user = createInputGroup(
                'User ID (no spaces)',
                'register-user-id',
                ratelimit.size.userId,
              );
              const pass = createInputGroup(
                'Password',
                'register-password',
                ratelimit.size.password,
                'password',
              );
              const confirm = createInputGroup(
                'Confirm Password',
                'register-confirm-password',
                ratelimit.size.password,
                'password',
              );
              const nick = createInputGroup(
                'Nickname (optional)',
                'register-nickname',
                ratelimit.size.nickname,
              );

              // Submit button
              const $button = tinyLib.bs.button('success').addClass('w-100').text('Create Account');

              // Build the form
              $root.append($errorBox, user.group, pass.group, confirm.group, nick.group, $button);

              // Show error message
              const showError = (msg) => {
                $errorBox.html(msg).removeClass('d-none');
              };

              // Clear error when typing
              [user.input, pass.input, confirm.input, nick.input].forEach(($input) => {
                $input.on('input', () => $errorBox.addClass('d-none'));
              });

              // Handle Enter key
              [user.input, pass.input, confirm.input, nick.input].forEach(($input) => {
                $input.on('keydown', (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    $button.trigger('click');
                  }
                });
              });

              // Submit action
              $button.on('click', () => {
                const userId = user.input.val().trim();
                const password = pass.input.val().trim();
                const confirmPassword = confirm.input.val().trim();
                const nickname = nick.input.val().trim();

                if (!userId || !password || !confirmPassword) {
                  showError('User ID and both password fields are required.');
                  return;
                }

                if (/\s/.test(userId)) {
                  showError('User ID must not contain spaces.');
                  return;
                }

                if (password.length < ratelimit.size.minPassword) {
                  showError(
                    `Password must be at least ${ratelimit.size.minPassword} characters long.`,
                  );
                  return;
                }

                if (password !== confirmPassword) {
                  showError('Passwords do not match.');
                  return;
                }

                // Tiny okay!
                $errorBox.addClass('d-none');
                modal.modal('hide');
                tinyIo.client.register(userId, password, nickname).then((result) => {
                  if (result.error) alert(`${result.msg}\nCode ${result.code}`);
                  else alert(`The new account was successfully created!`);
                });
              });

              // Launch modal with focus on first input
              const modal = tinyLib.modal({
                title: 'Create Account',
                dialog: 'modal-lg',
                id: 'modal-create-account',
                body: $root,
              });

              modal.on('shown.bs.modal', () => {
                user.input.trigger('focus');
              });
            }

            // No Perm
            else
              tinyLib.modal({
                title: 'Create Account',
                dialog: 'modal-lg',
                id: 'modal-create-account',
                body: $('<center>').text('You are not allowed to do this.'),
              });
          }),
        );
      }

      // Import
      leftMenu.push($('<h5>').text('Data'));
      leftMenu.push(...importItems);

      // Export
      leftMenu.push(
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
      );

      // Downloads
      leftMenu.push(
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
      );

      // Donate
      leftMenu.push($('<h5>').text('Donate'));
      leftMenu.push(
        createButtonSidebar('fas fa-donate', 'Donate <3', () => {
          const $container = $('<div>').addClass('text-center');
          $container.append(
            $('<p>', { class: 'made-by-ai' }).html(
              'This project took <strong>months of dedication</strong> and many <em>sleepless nights</em>.',
            ),
          );

          $container.append(
            $('<p>', { class: 'made-by-ai m-0' }).html(
              'If you enjoyed all the love and effort I put into this <strong>super AI roleplay project</strong>,',
            ),
          );

          $container.append(
            $('<p>', { class: 'made-by-ai' }).html(
              'I warmly invite you to support it with a <strong>voluntary donation</strong>',
            ),
          );

          $container.append(
            $('<p>', { class: 'made-by-ai m-0' }).html(
              'I accept both <strong>traditional currencies</strong> and <strong>cryptocurrencies</strong> as donation methods',
            ),
          );

          $container.append(
            $('<p>', { class: 'made-by-ai' }).html(
              'Thank you for helping this tiny magical project grow! 🎁💕',
            ),
          );

          const patreonNames = ['Jimm'];

          const $thankYouBox = $('<div>').addClass('patreon-thankyou');

          const $thankYouText = $('<p>').text(
            'Tiny magic moment to thank these magical patreons which supports the tiny fic:',
          );
          const $ul = $('<ul>', { class: 'list-unstyled' });

          patreonNames.forEach((name) => {
            const $nameSpan = $('<span>').addClass('magic-name').text(name);
            const $li = $('<li>').append($nameSpan);
            $ul.append($li);
          });

          $thankYouBox.append($thankYouText, $ul);
          $container.append($thankYouBox);

          tinyLib.modal({
            title: 'Tiny Donations!',
            dialog: 'modal-lg',
            id: 'modal-donate',
            body: $container.append(
              $('<div>', { class: 'donation-highlight' }).append(
                $('<img>', {
                  class: 'd-block w-100',
                  src: '/img/ai-example/2025-04-09_06-48.jpg',
                }),
              ),
            ),
          });
        }),
      );

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
            $('<li>', { id: 'ai-mode-list', class: 'mb-3' }).append(leftMenu),

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
        if (!tinyAiScript.noai && !tinyAiScript.mpClient) {
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

        const maxTemperature = typeof model.maxTemperature === 'number' ? model.maxTemperature : 2;
        temperature.setMin(0).setStep(0.05).setMax(maxTemperature).enable();
        if (temperature.val() > maxTemperature) temperature.val(maxTemperature);
        temperature.trigger('input');

        if (typeof model.topP === 'number')
          topP.val(model.topP).setMax(1).setMin(0).setStep(0.05).enable().trigger('input');
        else topP.reset().disable();

        if (typeof model.topK === 'number')
          topK.val(model.topK).setMax(100).setMin(0).setStep(1).enable().trigger('input');
        else topK.reset().disable();
      };

      const selectModel = (newModel, ignoreTokenUpdater = false) => {
        if (!tinyAiScript.noai && !tinyAiScript.mpClient) {
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
          if (!tinyAiScript.noai && !tinyAiScript.mpClient) {
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
      contentEnabler.setResetSettingsButton(resetSettingsButton);

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
                if (!tinyAiScript.noai && !tinyAiScript.mpClient) {
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

              resolve(!tinyAiScript.noai && !tinyAiScript.mpClient ? tinyAi.getTotalTokens() : 0);
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
            contentEnabler.deBase();
            contentEnabler.deModelChanger();
            contentEnabler.dePromptButtons();
            contentEnabler.deModel();
            contentEnabler.deMessageButtons();
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
              if (sessionEnabled) {
                contentEnabler.enBase();
                contentEnabler.enModelChanger();
                contentEnabler.enPromptButtons();
                contentEnabler.enModel();
                contentEnabler.enMessageButtons();
              }
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
      contentEnabler.setMsgInput(msgInput);

      // Submit
      const msgSubmit = tinyLib.bs.button('primary input-group-text-dark').text('Send');
      contentEnabler.setMsgSubmit(msgSubmit);

      const cancelSubmit = tinyLib.bs
        .button('primary input-group-text-dark rounded-end')
        .text('Cancel');
      contentEnabler.setCancelSubmit(cancelSubmit);

      const submitMessage = async () => {
        // Prepare to get data
        msgInput.trigger('blur');
        const msg = msgInput.val();
        msgInput.val('').trigger('input');

        const controller = new AbortController();
        contentEnabler.deBase();
        contentEnabler.deMessageButtons();
        contentEnabler.deModelChanger();
        contentEnabler.dePromptButtons();
        contentEnabler.deModelSelector();

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
                !tinyAiScript.noai && !tinyAiScript.mpClient
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
          contentEnabler.deBase(controller);
          addMessage(
            makeMessage({
              message: msg,
              id: sentId,
            }),
          );

          // Execute Ai
          if (!tinyAiScript.noai && !tinyAiScript.mpClient && sessionEnabled)
            await executeAi(submitCache, controller).catch((err) => {
              if (submitCache.cancel) submitCache.cancel();
              console.error(err);
              alert(err.message);
            });
        }

        // Complete
        clearInterval(loadingMessage);
        if (sessionEnabled) contentEnabler.enPromptButtons();
        msgInput.val('');

        if (sessionEnabled) {
          contentEnabler.enMessageButtons();
          contentEnabler.enBase();
          contentEnabler.enModelChanger();
          contentEnabler.enModelSelector();
        }
        msgInput.trigger('focus');
      };

      const submitCache = {};
      contentEnabler.setSubmitCache(submitCache);
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

      contentEnabler.setChatContainer(chatContainer);

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
              contentEnabler.dePromptButtons();
              contentEnabler.deMessageButtons();
              contentEnabler.deBase();
              contentEnabler.deModelChanger();
              contentEnabler.deModelSelector();
            }

            const disableReadOnly = () => {
              if (useReadOnly && sessionEnabled) {
                contentEnabler.enPromptButtons();
                contentEnabler.enMessageButtons();
                contentEnabler.enBase();
                contentEnabler.enModelChanger();
                contentEnabler.enModelSelector();
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
      const saveSessionBackup = (sessionSelected, where) => {
        if (sessionSelected) {
          const getSessionData = () => {
            // Get session
            const tinyData = tinyAi.getData();
            const customList = tinyData.customList;
            const hash = tinyData.hash;
            const tokens = tinyData.tokens;
            const model = tinyAi.getModelData(modelSelector.val()) || {};

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
                typeof tinyData.maxOutputTokens === 'number'
                  ? tinyData.maxOutputTokens
                  : typeof model.outputTokenLimit === 'number'
                    ? model.outputTokenLimit
                    : null,
              temperature:
                typeof tinyData.temperature === 'number'
                  ? tinyData.temperature
                  : typeof model.maxTemperature === 'number' ||
                      typeof model.temperature === 'number'
                    ? typeof model.temperature === 'number'
                      ? model.temperature
                      : 1
                    : null,
              topP:
                typeof tinyData.topP === 'number'
                  ? tinyData.topP
                  : typeof model.topP === 'number'
                    ? model.topP
                    : null,
              topK:
                typeof tinyData.topK === 'number'
                  ? tinyData.topK
                  : typeof model.topK === 'number'
                    ? model.topK
                    : null,
              presencePenalty:
                typeof tinyData.presencePenalty === 'number'
                  ? tinyData.presencePenalty
                  : typeof model.presencePenalty === 'number'
                    ? model.presencePenalty
                    : null,
              frequencyPenalty:
                typeof tinyData.frequencyPenalty === 'number'
                  ? tinyData.frequencyPenalty
                  : typeof model.frequencyPenalty === 'number'
                    ? model.frequencyPenalty
                    : null,
            };

            return { roomSaveData, model, tokens, hash, customList };
          };

          // jsStore (offline)
          if (canUsejsStore) {
            if (saveSessionTimeout[sessionSelected])
              clearTimeout(saveSessionTimeout[sessionSelected]);
            saveSessionTimeout[sessionSelected] = setTimeout(() => {
              const { roomSaveData, tokens, hash, customList } = getSessionData();
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

              // Complete
              saveSessionTimeout[sessionSelected] = null;
            }, 1000);
          }

          // Database (online)
          else if (typeof where === 'string' && !tinyAiScript.mpClient) {
            const timeoutId = `${sessionSelected}_${where}`;
            if (saveSessionTimeout[timeoutId]) clearTimeout(saveSessionTimeout[timeoutId]);
            saveSessionTimeout[timeoutId] = setTimeout(() => {
              const { roomSaveData } = getSessionData();

              // Send data
              const newSettings = {};
              if (roomSaveData[where] !== null) newSettings[where] = roomSaveData[where];
              tinyIo.client.updateRoomSettings(newSettings);

              // Complete
              saveSessionTimeout[timeoutId] = null;
            });
          }
        }
      };

      const tinyAiSocketTemplate = (where, where2, el) =>
        tinyAi.on(where, (value, id) => {
          if (el) el.val(value);
          saveSessionBackup(id, where2);
        });

      tinyAiSocketTemplate('setMaxOutputTokens', 'maxOutputTokens', outputLength);
      tinyAiSocketTemplate('setTemperature', 'temperature', temperature);
      tinyAiSocketTemplate('setTopP', 'topP', topP);
      tinyAiSocketTemplate('setTopK', 'topK', topK);
      tinyAiSocketTemplate('setPresencePenalty', 'presencePenalty', presencePenalty);
      tinyAiSocketTemplate('setFrequencyPenalty', 'frequencyPenalty', frequencyPenalty);
      tinyAiSocketTemplate('setModel', 'model');

      tinyAiSocketTemplate('setPrompt', 'prompt');
      tinyAiSocketTemplate('setFirstDialogue', 'firstDialogue');
      tinyAiSocketTemplate('setSystemInstruction', 'systemInstruction');

      tinyAiSocketTemplate('setRpgSchema');
      tinyAiSocketTemplate('setRpgData');
      tinyAiSocketTemplate('setRpgPrivateData');

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
      rpgData.initOffCanvas(container);

      // Enable Read Only
      const validateMultiplayer = (value = null, needAi = true, isInverse = false) =>
        // Normal mode
        !tinyAiScript.mpClient
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

      contentEnabler.setValidateMultiplayer(validateMultiplayer);

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
      contentEnabler.setEnabledFirstDialogue(enabledFirstDialogue);

      // Clear Messages
      const clearMessages = () => msgList.empty();
      contentEnabler.deBase();
      contentEnabler.deMessageButtons();
      contentEnabler.dePromptButtons();

      // Multiplayer disable inputs
      if (tinyAiScript.mpClient || tinyAiScript.noai) {
        if (tinyAiScript.mpClient) contentEnabler.deModelChanger();
        contentEnabler.deModel();
        contentEnabler.deModelSelector();
      }

      // Welcome
      if (!tinyAiScript.mpClient) {
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
      await rpgData.init().then(() => rpgData.finishOffCanvas(updateAiTokenCounterData));

      // Rpg mode
      if (!canUsejsStore) {
        tinyIo.client = new TinyClientIo(rpgCfg);
        const socket = tinyIo.client.getSocket();
        if (socket)
          makeTempMessage(
            `A server has been detected in your config and we will try to connect to it now!`,
            rpgCfg.ip,
          );

        // Start rpg mode
        //////////////////////////////
        if (tinyAiScript.mpClient || socket) {
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
          if (socket) {
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

            // Install scripts
            client.install(tinyAiScript);

            // Connected
            client.on('connect', (connectionId) => {
              // Prepare online status
              onlineStatus.icon.removeClass('text-danger').addClass('text-success');
              onlineStatus.text.text('Online');
              onlineStatus.id.empty().text('Id: ').append($('<strong>').text(connectionId));

              // First time message
              const firstTime = tinyIo.firstTime;
              if (firstTime) tinyIo.firstTime = false;

              // Message
              makeTempMessage(
                `You are connected! Your connection id is **${connectionId}**. Signing into your account...`,
                rpgCfg.ip,
              );
            });

            client.on('login', (result) => {
              // Message
              if (!result.error) {
                makeTempMessage(
                  `Welcome **${result.nickname || result.userId}**! You were successfully logged in! Entering the room...`,
                  rpgCfg.ip,
                );
              }
              // Error
              else {
                sendSocketError(result);
                $.LoadingOverlay('hide');
              }
            });

            client.on('roomError', (result) => {
              sendSocketError(result);
              $.LoadingOverlay('hide');
            });

            client.on('roomNotFound', () => {
              makeTempMessage('The room was not found', rpgCfg.ip);
              $.LoadingOverlay('hide');
            });

            client.on('roomJoinned', (result) => {
              makeTempMessage(`You successfully entered the room **${result.roomId}**!`, rpgCfg.ip);
              $.LoadingOverlay('hide');
            });

            // Disconnected
            client.on('disconnect', (reason, details) => {
              // Offline!
              onlineStatus.icon.addClass('text-danger').removeClass('text-success');
              onlineStatus.text.text('Offline');
              onlineStatus.id.empty();

              // Message
              makeTempMessage(
                `You are disconected${objType(details, 'object') && typeof details.description === 'string' ? ` (${details.description})` : ''}${typeof reason === 'string' ? `: ${reason}` : ''}`,
                rpgCfg.ip,
              );

              // Prepare disconnect progress
              if (tinyAiScript.mpClient) {
                // Is active
                if (client.isActive()) $.LoadingOverlay('show', { background: 'rgba(0,0,0, 0.5)' });
                // Disable page
                else {
                  contentEnabler.deBase();
                  contentEnabler.deModelChanger();
                  contentEnabler.dePromptButtons();
                  contentEnabler.deModel();
                  contentEnabler.deMessageButtons();
                  sessionEnabled = false;
                }
              }
            });

            // Enter room
            client.on('roomEntered', (success) => {
              if (!success) makeTempMessage(`Invalid room data detected!`, rpgCfg.ip);
            });

            // New message
            client.on('newMessage', () => {
              if (tinyAiScript.mpClient) {
              }
            });

            // You was kicked
            client.on('userLeft', (userId) => {
              if (userId === client.getUserId()) client.disconnect();
            });

            // Dice rool
            client.on('diceRoll', () => {});
          }

          // No server
          if (!socket)
            makeTempMessage('No server has been detected. Your session is cancelled!', rpgCfg.ip);
          else if (!tinyAiScript.mpClient) return;
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
