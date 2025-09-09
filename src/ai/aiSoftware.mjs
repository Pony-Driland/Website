import moment from 'moment';
import { marked } from 'marked';
import clone from 'clone';
import objHash from 'object-hash';
import { saveAs } from 'file-saver';

import { objType, countObj, toTitleCase, TinyTextRangeEditor, TinyHtml } from 'tiny-essentials';
import TinyDices from 'tiny-dices';

import {
  isNoNsfw,
  tinyLs,
  tinyNotification,
  appData,
  connStore,
  loaderScreen,
} from '../important.mjs';
import tinyLib, { alert } from '../files/tinyLib.mjs';
import { saveRoleplayFormat } from '../start.mjs';
import storyCfg from '../chapters/config.mjs';
import TinyMap from './TinyMap.mjs';
import aiTemplates from './values/templates.mjs';
import TinyClientIo from './socketClient.mjs';
import UserRoomManager from './RoomUserManagerUI.mjs';
import RpgData from './software/rpgData.mjs';
import EnablerAiContent from './software/enablerContent.mjs';
import ficConfigs from './values/ficConfigs.mjs';

import './values/jsonTemplate.mjs';

import { canSandBox, tinyAi, tinyIo, tinyStorage } from './software/base.mjs';
import { tinyAiScript } from './software/tinyAiScript.mjs';
import { Tooltip } from '../modules/TinyBootstrap.mjs';
import { clearFicData, urlUpdate } from '../fixStuff/markdown.mjs';
import { storyData } from '../files/chapters.mjs';

export const AiScriptStart = async () => {
  let sessionEnabled = true;
  // Update Url
  urlUpdate('ai', 'AI Page');

  // Clear page
  clearFicData();
  TinyHtml.query('#markdown-read')?.empty();
  TinyHtml.query('#top_page')?.addClass('d-none');

  // Can use backup
  const rpgCfg = tinyStorage.getApiKey(tinyStorage.selectedAi()) || {};
  const canUsejsStore = typeof rpgCfg.ip !== 'string' || rpgCfg.ip.length < 1;

  // Try to prevent user browser from deactivating the page accidentally in browsers that have tab auto deactivator
  const aiTimeScriptUpdate = () => {
    try {
      // Get data
      const now = moment();
      const totalTime = JSON.parse(tinyLs.getItem('total-time-using-ai') || '{}');

      if (typeof totalTime.now !== 'number') totalTime.now = now.valueOf();
      if (typeof totalTime.secondsUsed !== 'number') totalTime.secondsUsed = 0;
      const past = moment(totalTime.now);

      // Diff
      const diff = Math.abs(now - past);
      if (diff >= 999) totalTime.secondsUsed++;

      // Complete
      totalTime.now = now.valueOf();
      tinyLs.setItem('total-time-using-ai', JSON.stringify(totalTime));
      tinyAiScript.aiLogin.secondsUsed = totalTime.secondsUsed;
      tinyAiScript.aiLogin.updateTitle();
    } catch (err) {
      console.error(err);
    }
    appData.ai.secondsUsed++;
  };

  appData.ai.interval = setInterval(aiTimeScriptUpdate, 1000);
  aiTimeScriptUpdate();

  // Start loading page
  let isFirstTime = true;
  if (!tinyAiScript.isEnabled()) {
    alert(
      'AI mode is currently disabled for your session. Please click the robot icon to activate it, then come back here.',
      'AI Page',
    );
    return;
  }

  // Check if mature content is allowed
  if (isNoNsfw()) {
    alert(
      'Access to this content is restricted in your region or settings. You will need to verify your age to continue. The "Sign in with Google" button is located at the top right of the page.',
      'Age Verification Required',
    );
    return;
  }

  loaderScreen.start();
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

  /**
   * Sidebar Button
   * @returns {TinyHtml<HTMLElement>}
   */
  const createButtonSidebar = (icon, text, callback, disabled = false, options = null) => {
    const tinyClass = `link btn-bg text-start w-100${disabled ? ' disabled' : ''}`;
    return tinyLib.bs
      .button(!options ? tinyClass : { class: tinyClass, ...options })
      .setText(text)
      .prepend(tinyLib.icon(`${icon} me-2`))
      .on('click', callback)
      .toggleProp('disabled', disabled);
  };

  // Select Model
  const modelSelector = TinyHtml.createFrom('select', {
    class: 'form-select',
    id: 'select-ai-model',
  });
  contentEnabler.setModelSelector(modelSelector);
  const resetModelSelector = () => {
    modelSelector.empty();
    modelSelector.append(TinyHtml.createFrom('option').setText('None'));
  };

  resetModelSelector();

  // To Number
  const convertToNumber = (val) =>
    typeof val === 'string' && val.length > 0 ? Number(val) : typeof val === 'number' ? val : 0;

  // Token Count
  const tokenCount = {
    amount: TinyHtml.createFrom('span').setData('token-count', 0).setText('0'),
    total: TinyHtml.createFrom('span').setText('0'),
    updateValue: (where, value) => {
      if (typeof value === 'number') {
        if (!Number.isNaN(value) && Number.isFinite(value)) {
          if (tokenCount[where] && where !== 'updateValue' && where !== 'getValue')
            return tokenCount[where]
              .setData('token-count', value)
              .setText(value.toLocaleString(navigator.language || 'en-US'));
        }
      } else return tokenCount[where].setData('token-count', 0).setText(0);
    },

    getValue: (where) => {
      if (tokenCount[where] && where !== 'updateValue' && where !== 'getValue')
        return tokenCount[where].data('token-count') || 0;
    },
  };

  // Ranger Generator
  const tinyRanger = () => {
    const rangerBase = TinyHtml.createFrom('div', {
      class: 'd-flex flex-row align-items-center',
    });
    const ranger = TinyHtml.createFrom('input', { type: 'range', class: 'form-range' });
    const rangerNumber = TinyHtml.createFrom('input', {
      type: 'number',
      class: 'form-control ms-2',
      style: 'width: 70px; max-width: 70px; min-width: 70px;',
    });

    ranger.on('wheel', (event) => {
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
      if (event.deltaY < 0) {
        // Up
        currentValue += step;
      } else {
        // Down
        currentValue -= step;
      }

      // Update value
      if (currentValue < min) ranger.setVal(min).trigger('input');
      else if (currentValue > max) ranger.setVal(max).trigger('input');
      else ranger.setVal(currentValue).trigger('input');
    });

    ranger.on('input', () => rangerNumber.setVal(ranger.val()));
    rangerNumber.on('input', () => ranger.setVal(rangerNumber.val()));

    rangerNumber.on('change', () => {
      let value = parseInt(rangerNumber.val());
      let min = parseInt(rangerNumber.attr('min'));
      let max = parseInt(rangerNumber.attr('max'));
      if (value < min) {
        rangerNumber.setVal(min);
      } else if (value > max) {
        rangerNumber.setVal(max);
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
        ranger.setAttr('min', value);
        rangerNumber.setAttr('min', value);
        return this;
      },
      setMax: function (value) {
        ranger.setAttr('max', value);
        rangerNumber.setAttr('max', value);
        return this;
      },
      setStep: function (value) {
        ranger.setAttr('step', value);
        rangerNumber.setAttr('step', value);
        return this;
      },

      disable: function () {
        ranger.addClass('disabled');
        ranger.addProp('disabled');
        rangerNumber.addClass('disabled');
        rangerNumber.addProp('disabled');
        return this;
      },
      enable: function () {
        ranger.removeClass('disabled');
        ranger.removeProp('disabled');
        rangerNumber.removeClass('disabled');
        rangerNumber.removeProp('disabled');
        return this;
      },

      insert: () => rangerBase,
      val: function (value) {
        if (typeof value !== 'undefined') {
          ranger.setVal(value);
          rangerNumber.setVal(value);
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
  const outputLength = TinyHtml.createFrom('input', {
    type: 'number',
    class: 'form-control',
  });
  contentEnabler.setOutputLength(outputLength);

  outputLength.on('input', () => tinyAi.setMaxOutputTokens(convertToNumber(outputLength.val())));

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
          if (oldFileHash === newFileHash) tinyAi.setFileData(null, null, null, fileTokens || 0);

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
            let textBackup = tinyLs.getItem(`tiny-ai-textarea-${ficConfigs.selected}`);
            if (typeof textBackup !== 'string') textBackup = '';
            msgInput.setVal(textBackup).trigger('input');
          }

          // Set Model config
          const aiCfg = {
            outputTokens: tinyAi.getMaxOutputTokens(),
            temperature: tinyAi.getTemperature(),
            topP: tinyAi.getTopP(),
            topK: tinyAi.getTopK(),
            presencePenalty: tinyAi.getPresencePenalty(),
            frequencyPenalty: tinyAi.getFrequencyPenalty(),
          };

          if (aiCfg.outputTokens !== null) outputLength.setVal(aiCfg.outputTokens);
          if (aiCfg.temperature !== null) temperature.val(aiCfg.temperature);
          if (aiCfg.topP !== null) topP.val(aiCfg.topP);
          if (aiCfg.topK !== null) topK.val(aiCfg.topK);
          if (aiCfg.presencePenalty !== null) presencePenalty.val(aiCfg.presencePenalty);
          if (aiCfg.frequencyPenalty !== null) frequencyPenalty.val(aiCfg.frequencyPenalty);

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
          loaderScreen.stop();
          reject(err);
        });
    });

  /**
   * When sId is used, it means that the request is coming from a session that is not active in the chat
   * @param {{
   *  parts: Array<Record<"text" | "inlineData", string | {
   *     mime_type: string;
   *     data: string;
   *  } | null>>;
   *  role?: string | undefined;
   *  finishReason?: string | number | undefined;
   * }[]} data
   *
   * @param {{
   * [key: string]: any;
   * data: Array<{
   *     count: number | null;
   *     hide?: boolean;
   * }>;
   * }} tokens
   *
   * @param {boolean} [readOnly=false]
   * @param {string} [sId=undefined]
   *
   */
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
                msg.role === 'user' ? null : toTitleCase(msg.role),
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
        modelSelector.setVal(file.model);
        tinyAi.setModel(file.model, sessionId);
        selectModel(file.model);
      }

      // Set model settings
      if (typeof file.temperature === 'number') tinyAi.setTemperature(file.temperature);
      if (typeof file.maxOutputTokens === 'number') tinyAi.setMaxOutputTokens(file.maxOutputTokens);
      if (typeof file.topP === 'number') tinyAi.setTopP(file.topP);
      if (typeof file.topK === 'number') tinyAi.setTopK(file.topK);
      if (typeof file.presencePenalty === 'number') tinyAi.setPresencePenalty(file.presencePenalty);
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
        tinyAi.setFirstDialogue(file.firstDialogue, file.tokens ? file.tokens.firstDialogue : 0);

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

      if (file.hash) file.hash.model = typeof file.model === 'string' ? objHash(file.model) : null;

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
    const body = TinyHtml.createFrom('div');
    const textarea = TinyHtml.createFrom('textarea', {
      class: 'form-control',
      style: `height: ${String(config.size)}px;`,
    });
    textarea.setVal(config.textarea);
    if (config.readOnly) textarea.addProp('readOnly');
    const textEditor = new TinyTextRangeEditor(textarea.get(0));

    // Templates list
    if (
      config.addTemplates &&
      Array.isArray(config.addTemplates.data) &&
      config.addTemplates.data.length > 0
    ) {
      const templateList = config.addTemplates.data;
      // Select
      const textareaAdd = TinyHtml.createFrom('select', { class: 'form-control' });
      textareaAdd.append(
        TinyHtml.createFrom('option', { value: 'DEFAULT' }).setText(config.addTemplates.title),
      );

      // Separator
      const addSeparator = () =>
        textareaAdd.append(
          TinyHtml.createFrom('option').addProp('disabled').setText('----------------------'),
        );

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
            typeof templateItem[tinyTxtValName] === 'string' ? templateItem[tinyTxtValName] : null;

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
                TinyHtml.createFrom('option', {
                  value: templateItem.value,
                })
                  // Data item
                  .setData('TinyAI-select-text', getTypeValue())
                  .setData(
                    'TinyAI-temperature',
                    typeof templateItem.temperature === 'number' &&
                      !Number.isNaN(templateItem.temperature) &&
                      templateItem.temperature >= 0
                      ? templateItem.temperature
                      : null,
                  )
                  .setData(
                    'TinyAI-max-output-tokens',
                    typeof templateItem.maxOutputTokens === 'number' &&
                      !Number.isNaN(templateItem.maxOutputTokens) &&
                      templateItem.maxOutputTokens >= 0
                      ? templateItem.maxOutputTokens
                      : null,
                  )
                  .setData(
                    'TinyAI-topP',
                    typeof templateItem.topP === 'number' &&
                      !Number.isNaN(templateItem.topP) &&
                      templateItem.topP >= 0
                      ? templateItem.topP
                      : null,
                  )
                  .setData(
                    'TinyAI-topK',
                    typeof templateItem.topK === 'number' &&
                      !Number.isNaN(templateItem.topK) &&
                      templateItem.topK >= 0
                      ? templateItem.topK
                      : null,
                  )
                  .setData(
                    'TinyAI-presence-penalty',
                    typeof templateItem.presencePenalty === 'number' &&
                      !Number.isNaN(templateItem.presencePenalty) &&
                      templateItem.presencePenalty >= 0
                      ? templateItem.presencePenalty
                      : null,
                  )
                  .setData(
                    'TinyAI-frequency-penalty',
                    typeof templateItem.frequencyPenalty === 'number' &&
                      !Number.isNaN(templateItem.frequencyPenalty) &&
                      templateItem.frequencyPenalty >= 0
                      ? templateItem.frequencyPenalty
                      : null,
                  )
                  // Option name
                  .setText(templateItem.name)

                  // Option is disabled?
                  .toggleProp(
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
        const option = new TinyHtml(textareaAdd.find(`[value="${textareaAdd.val()}"]`));
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

        textareaAdd.setVal('DEFAULT');

        // Insert text
        if (typeof text === 'string' && text.length > 0)
          textEditor.insertText(text, { autoSpacing: true }).focus();
      });

      // Insert into body
      body.append(textareaAdd);
    }

    // Add textarea
    body.append(TinyHtml.createFrom('p').setText(config.info));
    body.append(textarea);

    // Submit
    const submit = tinyLib.bs.button('info m-2 ms-0');
    submit.setText(config.submitName);

    submit.on('click', () => {
      config.submitCall(textarea.val());
      TinyHtml.query(`#${config.id}`)?.data('BootstrapModal').hide();
    });

    if (config.readOnly) submit.addProp('disabled').addClass('disabled');

    body.append(TinyHtml.createFrom('div', { class: 'd-grid gap-2 col-6 mx-auto' }).append(submit));

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
    leftMenu.push(TinyHtml.createFrom('h5').setText('Reset'));
    leftMenu.push(...ficResets);

    // Modes
    leftMenu.push(TinyHtml.createFrom('h5').setText('Modes'));

    // Fic Talk
    leftMenu.push(...ficTemplates);
  }

  // Settings
  leftMenu.push(TinyHtml.createFrom('h5').setText('Settings'));
  leftMenu.push(...ficPromptItems);

  // RPG
  leftMenu.push(TinyHtml.createFrom('h5').setText('RPG'));
  // Dice
  leftMenu.push(
    createButtonSidebar('fa-solid fa-dice', 'Roll Dice', () => {
      // Root
      const $root = TinyHtml.createFrom('div');
      const $formRow = TinyHtml.createFrom('div').addClass('row g-3');
      const $totalBase = TinyHtml.createFrom('center', { class: 'fw-bold mt-3' }).setText(0);

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
        tinyCfg.data.img = tinyLs.getItem(`tiny-dice-img`) || undefined;
        tinyCfg.data.bg = tinyLs.getItem(`tiny-dice-bg`) || 'white';
        tinyCfg.data.text = tinyLs.getItem(`tiny-dice-text`) || 'black';
        tinyCfg.data.border = tinyLs.getItem(`tiny-dice-border`) || '2px solid rgba(0, 0, 0, 0.05)';
        tinyCfg.data.selectionBg = tinyLs.getItem(`tiny-dice-selection-bg`) || 'black';
        tinyCfg.data.selectionText = tinyLs.getItem(`tiny-dice-selection-text`) || 'white';
      }

      // Form template
      const configs = {};
      const genLabel = (id, text) =>
        TinyHtml.createFrom('label')
          .addClass('form-label')
          .setAttr('for', `tiny-dice_${id}`)
          .setText(text);

      const genInput = (id, type, value, min) =>
        TinyHtml.createFrom('input')
          .addClass('form-control text-center')
          .setAttr({ id: `tiny-dice_${id}`, type, min })
          .setAttr('placeholder', min)
          .setVal(value);

      const genConfig = (id, text, type, value, min) => {
        configs[id] = genInput(id, type, value, min);
        return [genLabel(id, text), configs[id]];
      };

      // Form
      const $perDieCol = TinyHtml.createFrom('div')
        .addClass('col-md-12')
        .append(genConfig('perDieValues', 'Per-Die Values', 'text', '6', 'e.g., 6,12,20'));

      const $allow0input = TinyHtml.createFrom('input')
        .addClass('form-check-input')
        .setAttr({ type: 'checkbox', id: 'tiny-dice_allow0' });
      const $allow0Col = TinyHtml.createFrom('div')
        .addClass('d-flex justify-content-center align-items-center mt-2')
        .append(
          TinyHtml.createFrom('div')
            .addClass('form-check')
            .append(
              $allow0input,
              TinyHtml.createFrom('label')
                .addClass('form-check-label')
                .setAttr('for', 'tiny-dice_allow0')
                .setText('Allow zero values'),
            ),
        );

      $formRow.append($perDieCol);

      // Roll button
      const $rollButton = tinyLib.bs.button('primary w-100 mb-4 mt-2').setText('Roll Dice');

      // Add container
      const $diceContainer = TinyHtml.createFrom('div');
      const $diceError = TinyHtml.createFrom('div');
      /** @type {Array<[string, string]>} */
      const readSkinValues = [
        ['bgSkin', 'bg'],
        ['textSkin', 'text'],
        ['borderSkin', 'border'],
        ['bgImg', 'img'],
        ['selectionBgSkin', 'selectionBg'],
        ['selectionTextSkin', 'selectionText'],
      ];

      // TinyDices logic
      const dice = new TinyDices($diceContainer.get(0));
      let updateTotalBase = null;
      $rollButton.on('click', async () => {
        // Get values
        const perDieRaw = configs.perDieValues.val().trim();
        const perDie = perDieRaw.length > 0 ? perDieRaw : null;
        const canZero = $allow0input.is(':checked');
        $totalBase.setText(0);
        if (updateTotalBase) {
          clearTimeout(updateTotalBase);
          updateTotalBase = null;
        }

        // Offline
        if (!tinyCfg.isOnline) {
          const result = dice.roll(perDie, canZero);
          let total = 0;
          for (const item of result) total += item.result;
          updateTotalBase = setTimeout(() => {
            $totalBase.setText(total);
            updateTotalBase = null;
          }, 2000);
        }
        // Online
        else {
          // Prepare data
          const diceParse = dice.parseRollConfig(perDie);
          const sides = [];
          for (const index in diceParse) sides.push(diceParse[index]);

          // Get result
          $rollButton.addProp('disabled').addClass('disabled');
          const result = await tinyIo.client.rollDice(sides, canZero);
          $rollButton.removeProp('disabled').removeClass('disabled');

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
                $totalBase.setText(result.total);
                updateTotalBase = null;
              }, 2000);
            }
          } else $totalBase.addClass('text-danger').setText(result.msg);
        }
      });

      // Skin form
      const createInputField = (label, id, placeholder, value) => {
        configs[id] = TinyHtml.createFrom('input')
          .addClass('form-control text-center')
          .setAttr({ type: 'text', placeholder })
          .setVal(value);

        return TinyHtml.createFrom('div')
          .addClass('col-md-4 text-center')
          .append(
            TinyHtml.createFrom('label').addClass('form-label').setAttr('for', id).setText(label),
            configs[id],
          );
      };

      configs.bgImg = TinyHtml.createFrom('input')
        .addClass('form-control')
        .addClass('d-none')
        .setAttr('type', 'text')
        .setVal(tinyCfg.data.img);
      const bgImgUploadButton = tinyLib.bs.button('info w-100');
      const uploadImgButton = tinyLib.upload.img(
        bgImgUploadButton.setText('Select Image').on('contextmenu', (e) => {
          e.preventDefault();
          configs.bgImg.setVal('').removeClass('text-danger').trigger('change');
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
          configs.bgImg.setVal(dataUrl).removeClass('text-danger').trigger('change');
        },
      );

      const importDiceButton = tinyLib.upload.json(
        tinyLib.bs.button('info w-100').setText('Import'),
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
                configs[readSkinData[0]].setVal(newValue).trigger('change');
              }
            }
          }
        },
      );

      const $formRow2 = TinyHtml.createFrom('div', { class: 'd-none' })
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
          TinyHtml.createFrom('div', { class: 'col-md-4 text-center' }).append(
            TinyHtml.createFrom('label').addClass('form-label').setText('Custom Image'),
            uploadImgButton,
          ),
          // Export
          TinyHtml.createFrom('div', { class: 'col-md-6' }).append(
            tinyLib.bs
              .button('info w-100')
              .setText('Export')
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
          TinyHtml.createFrom('div', { class: 'col-md-6' }).append(importDiceButton),
        );

      const updateDiceData = (where, dataName, value) => {
        dice[where] = value;
        if (!tinyIo.client) {
          if (value) tinyLs.setItem(`tiny-dice-${dataName}`, value);
          else tinyLs.removeItem(`tiny-dice-${dataName}`);
        }
        dice.updateDicesSkin();
      };

      for (const index in readSkinValues) {
        const tinySkin = configs[readSkinValues[index][0]];
        tinySkin.on('change', () => {
          updateDiceData(
            readSkinValues[index][0],
            readSkinValues[index][1],
            tinySkin.val().trim() || null,
          );
        });
      }

      const updateAllSkins = () => {
        for (const index in readSkinValues) configs[readSkinValues[index][0]].trigger('change');
      };

      // Root insert
      $root.append(TinyHtml.createFrom('center').append($formRow), $allow0Col, $formRow2);

      // Main button of the skin editor
      const $applyBtn = tinyLib.bs.button('success w-100').setText('Edit Skin Data');
      $applyBtn.on('click', async () => {
        // Show content
        if ($formRow2.hasClass('d-none')) {
          $applyBtn.setText(tinyIo.client ? 'Apply Dice Skins' : 'Hide Skin Data');
        }
        // Hide Content
        else {
          $applyBtn.setText('Edit Skin Data');
          if (tinyCfg.isOnline) {
            updateAllSkins();

            // Disable buttons
            $applyBtn.addProp('disabled').addClass('disabled');
            const diceSkin = {};
            importDiceButton.addProp('disabled').addClass('disabled');
            uploadImgButton.addProp('disabled').addClass('disabled');

            // Send dice data
            for (const index in readSkinValues)
              diceSkin[readSkinValues[index][1]] = configs[readSkinValues[index][0]]
                .addProp('disabled')
                .addClass('disabled')
                .val()
                .trim();

            const result = await tinyIo.client.setAccountDice(diceSkin);
            if (result.error) $totalBase.addClass('text-danger').setText(result.msg);
            else {
              $totalBase.removeClass('text-danger').setText(0);
              tinyIo.client.setDice(diceSkin);
            }

            // Enable buttons again
            for (const index in readSkinValues)
              configs[readSkinValues[index][0]].removeProp('disabled').removeClass('disabled');
            uploadImgButton.removeProp('disabled').removeClass('disabled');
            importDiceButton.removeProp('disabled').removeClass('disabled');
            $applyBtn.removeProp('disabled').removeClass('disabled');
          }
        }
        // Change class mode
        $formRow2.toggleClass('d-none');
      });

      $root.append($applyBtn, $rollButton, $diceError, $diceContainer, $totalBase);
      updateAllSkins();
      dice.roll([0, 0, 0]);

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
      const startTinyMap = (place) => {
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
                TinyHtml.createFrom('center').append(map.getMapButton()),
              );
            }
          }
        } catch (e) {
          // No Map
          console.error(e);
          tinyHtml.empty();
        }
      };

      const tinyHtml = TinyHtml.createFrom('span');
      const tinyHr = TinyHtml.createFrom('hr', { class: 'my-5 d-none' });
      tinyLib.modal({
        title: 'Maps',
        dialog: 'modal-lg',
        id: 'tinyMaps',
        body: [
          tinyHtml,
          tinyHr,
          TinyHtml.createFrom('center').append(
            // Public Maps
            tinyLib.bs
              .button('secondary m-2')
              .setText('Public')
              .on('click', () => {
                tinyHr.removeClass('d-none');
                startTinyMap('public');
              }),
            // Private Maps
            tinyLib.bs
              .button('secondary m-2')
              .setText('Private')
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
    leftMenu.push(TinyHtml.createFrom('h5').setText('Online'));

    leftMenu.push(
      createButtonSidebar('fas fa-users', 'Room settings', () => {
        if (tinyIo.client) {
          const room = tinyIo.client.getRoom() || {};
          const ratelimit = tinyIo.client.getRateLimit() || { size: {}, limit: {} };
          const user = tinyIo.client.getUser() || {};
          const cantEdit = room.ownerId !== tinyIo.client.getUserId() && !user.isOwner;

          const $root = TinyHtml.createFrom('div');

          const $formContainer = TinyHtml.createFrom('div').addClass('mb-4');
          const $editError = TinyHtml.createFrom('div').addClass('text-danger small mt-2');
          const $deleteError = TinyHtml.createFrom('div').addClass('text-danger small mt-2');

          // ─── Edit room ───────────────────────────────
          const $editForm = TinyHtml.createFrom('form').addClass('mb-4');
          $editForm.append(TinyHtml.createFrom('h5').setText('Edit Room Info'));

          const $roomId = TinyHtml.createFrom('input')
            .setAttr({
              type: 'text',
              id: 'roomId',
              placeholder: 'Enter new room title',
              maxLength: ratelimit.size.roomId,
            })
            .addProp('disabled')
            .addClass('form-control')
            .addClass('form-control')
            .setVal(tinyIo.client.getRoomId());

          const $roomTitle = TinyHtml.createFrom('input')
            .setAttr({
              type: 'text',
              id: 'roomTitle',
              placeholder: 'Enter new room title',
              maxLength: ratelimit.size.roomTitle,
            })
            .addClass('form-control')
            .setVal(room.title)
            .toggleProp('disabled', cantEdit);

          $editForm.append(
            TinyHtml.createFrom('div')
              .addClass('row mb-3')
              .append(
                TinyHtml.createFrom('div')
                  .addClass('col-md-6')
                  .append(
                    TinyHtml.createFrom('label')
                      .setAttr('for', 'roomId')
                      .addClass('form-label')
                      .setText('Room ID'),
                    $roomId,
                  ),
                TinyHtml.createFrom('div')
                  .addClass('col-md-6')
                  .append(
                    TinyHtml.createFrom('label')
                      .setAttr('for', 'roomTitle')
                      .addClass('form-label')
                      .setText('Room Title'),
                    $roomTitle,
                  ),
              ),
          );

          // Max users
          $editForm.append(
            TinyHtml.createFrom('div')
              .addClass('mb-3')
              .append(
                TinyHtml.createFrom('label')
                  .setAttr('for', 'maxUsers')
                  .addClass('form-label')
                  .setText('Max Users'),
                TinyHtml.createFrom('input')
                  .setAttr({
                    type: 'number',
                    id: 'maxUsers',
                    min: 1,
                    max: ratelimit.limit.roomUsers,
                    placeholder: 'Maximum number of users',
                  })
                  .addClass('form-control')
                  .setVal(room.maxUsers)
                  .toggleProp('disabled', cantEdit),
              ),
          );

          // New password
          $editForm.append(
            TinyHtml.createFrom('div')
              .addClass('mb-3')
              .append(
                TinyHtml.createFrom('label')
                  .setAttr('for', 'roomPassword')
                  .addClass('form-label')
                  .setText('New Room Password'),
                TinyHtml.createFrom('input')
                  .setAttr({
                    type: 'password',
                    id: 'roomPassword',
                    placeholder: 'Leave empty to keep current password',
                    maxLength: ratelimit.size.password,
                  })
                  .addClass('form-control')
                  .toggleProp('disabled', cantEdit),
              ),
          );

          // Submit
          $editForm.append(
            TinyHtml.createFrom('button')
              .setAttr('type', 'submit')
              .addClass('btn btn-primary')
              .setText('Save Changes')
              .toggleProp('disabled', cantEdit),
          );

          // ─── Delete room ─────────────────────────────
          const $deleteSection = TinyHtml.createFrom('div').addClass('border-top pt-4');

          $deleteSection.append(
            TinyHtml.createFrom('h5').addClass('text-danger').setText('Delete Room'),
            TinyHtml.createFrom('p')
              .addClass('text-muted mb-2')
              .setHtml(
                'This action <strong>cannot be undone</strong>. Deleting this room will remove all its data permanently.',
              ),
          );

          const $deleteForm = TinyHtml.createFrom('form').addClass('d-flex flex-column gap-2');

          // Your password
          $deleteForm.append(
            TinyHtml.createFrom('div').append(
              TinyHtml.createFrom('label')
                .setAttr('for', 'ownerPassword')
                .addClass('form-label')
                .setText('Enter your current password to confirm:'),
              TinyHtml.createFrom('input')
                .setAttr({
                  type: 'password',
                  id: 'ownerPassword',
                  placeholder: 'Current account password',
                  maxLength: ratelimit.size.password,
                })
                .addClass('form-control')
                .toggleProp('disabled', cantEdit),
            ),
          );

          // Delete now
          $deleteForm.append(
            TinyHtml.createFrom('button')
              .setAttr('type', 'submit')
              .addClass('btn btn-danger mt-2')
              .setText('Delete Room Permanently')
              .toggleProp('disabled', cantEdit),
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
              const maxUsers = parseInt(new TinyHtml($editForm.find('#maxUsers')).val(), 10);
              const password = new TinyHtml($editForm.find('#roomPassword')).val().trim();

              if (Number.isNaN(maxUsers) || maxUsers <= 0) {
                $editError.setText('Max users must be a positive number.');
                return;
              }

              if (maxUsers > 50) {
                $editError.setText('Max users cannot exceed 50.');
                return;
              }

              const newSettings = { title, maxUsers };
              if (typeof password === 'string' && password.length > 0)
                newSettings.password = password;

              modal.hide();
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

              const password = new TinyHtml($deleteForm.find('#ownerPassword')).val().trim();

              if (!password) {
                $deleteError.setText('Please enter your current password.');
                return;
              }

              if (!confirm('Are you absolutely sure? This cannot be undone.')) return;

              modal.hide();
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
          const $root = TinyHtml.createFrom('div');

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
          const $root = TinyHtml.createFrom('div');

          const $card = TinyHtml.createFrom('div').addClass('card shadow rounded-4');
          const $cardBody = TinyHtml.createFrom('div').addClass('card-body');

          const $inputGroup = TinyHtml.createFrom('div').addClass('mb-3');
          const $label = TinyHtml.createFrom('label')
            .addClass('form-label')
            .setAttr('for', 'on_edit_tinyinfo')
            .setText(labelName);

          const $input = TinyHtml.createFrom('input')
            .addClass('form-control')
            .addClass('text-center')
            .setAttr({
              type: 'text',
              id: 'on_edit_tinyinfo',
              placeholder: placeHolder,
            });

          // Page information
          const { ratelimit, userData } = getInfo();
          $input
            .setAttr('maxLength', ratelimit.size[infoName])
            .setVal(typeof userData[infoName] === 'string' ? userData[infoName] : '')
            .on('keydown', (e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                $saveBtn.trigger('click');
              }
            });

          const $saveBtn = tinyLib.bs.button('primary w-100').setText('Save');

          // Build elements
          $inputGroup.addClass('text-center').append($label, $input);
          $cardBody.append($inputGroup, $saveBtn);
          $card.append($cardBody);
          $root.append($card);

          // Click button event
          $saveBtn.on('click', () => {
            callback($input.val().trim());
            modal.hide();
          });

          // Start modal
          const modal = tinyLib.modal({
            title: title,
            dialog: 'modal-lg',
            id,
            body: $root,
          });

          modal.on('shown.bs.modal', () => $input.trigger('focus'));
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
        const $root = TinyHtml.createFrom('div');

        // Error place
        const $errorBox = tinyLib.bs.alert('danger', '', false).addClass('d-none');

        // Create label and input
        const createInputGroup = (labelText, inputId, type = 'password') => {
          const $group = TinyHtml.createFrom('div').addClass('mb-3');
          const $label = TinyHtml.createFrom('label')
            .addClass('form-label')
            .setAttr('for', inputId)
            .setText(labelText);
          const $input = TinyHtml.createFrom('input').addClass('form-control').setAttr({
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
        const $button = tinyLib.bs.button('primary').addClass('w-100').setText('Change Password');

        // Build all
        $root.append($errorBox, current.group, newPass.group, confirmPass.group, $button);

        // show error
        const showError = (msg) => {
          $errorBox.setHtml(msg).removeClass('d-none');
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
            showError(`New password must be at least ${ratelimit.size.minPassword} characters.`);
            return;
          }

          // Tiny okay!
          $errorBox.addClass('d-none');
          modal.hide();
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
          const $root = TinyHtml.createFrom('div');

          // Error alert box (initially hidden)
          const $errorBox = tinyLib.bs.alert('danger', '', false).addClass('d-none');

          // Helper to build input fields
          const createInputGroup = (labelText, inputId, maxLength = null, type = 'text') => {
            const $group = TinyHtml.createFrom('div').addClass('mb-3');
            const $label = TinyHtml.createFrom('label')
              .addClass('form-label')
              .setAttr('for', inputId)
              .setText(labelText);
            const $input = TinyHtml.createFrom('input')
              .addClass('form-control')
              .setAttr({ maxLength, type, id: inputId, placeholder: labelText });
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
          const $button = tinyLib.bs.button('success').addClass('w-100').setText('Create Account');

          // Build the form
          $root.append($errorBox, user.group, pass.group, confirm.group, nick.group, $button);

          // Show error message
          const showError = (msg) => {
            $errorBox.setHtml(msg).removeClass('d-none');
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
              showError(`Password must be at least ${ratelimit.size.minPassword} characters long.`);
              return;
            }

            if (password !== confirmPassword) {
              showError('Passwords do not match.');
              return;
            }

            // Tiny okay!
            $errorBox.addClass('d-none');
            modal.hide();
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
            body: TinyHtml.createFrom('center').setText('You are not allowed to do this.'),
          });
      }),
    );
  }

  // Import
  leftMenu.push(TinyHtml.createFrom('h5').setText('Data'));
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
      const body = TinyHtml.createFrom('div');
      body.append(
        TinyHtml.createFrom('h3')
          .setText(`Download Content`)
          .prepend(tinyLib.icon('fa-solid fa-download me-3'))
          .append(
            tinyLib.bs
              .button('info btn-sm ms-3')
              .setText('Save As all chapters')
              .on('click', () => saveRoleplayFormat()),
          ),
        TinyHtml.createFrom('h5')
          .setText(
            `Here you can download the official content of fic to produce unofficial content dedicated to artificial intelligence.`,
          )
          .append(
            TinyHtml.createFrom('br'),
            TinyHtml.createFrom('small').setText(
              'Remember that you are downloading the uncensored version.',
            ),
          ),
      );

      for (let i = 0; i < storyData.chapter.amount; i++) {
        // Chapter Number
        const chapter = String(i + 1);
        const tinyClick = TinyHtml.createFrom('a', {
          class: 'btn btn-primary m-2 me-0 btn-sm',
          href: `/chapter/${chapter}.html`,
          chapter: chapter,
        });

        // Add Chapter
        body.append(
          TinyHtml.createFrom('div', { class: 'card' }).append(
            TinyHtml.createFrom('div', { class: 'card-body' }).append(
              TinyHtml.createFrom('h5', { class: 'card-title m-0' })
                .setText(`Chapter ${chapter} - `)
                .append(
                  TinyHtml.createFrom('small').setText(storyCfg.chapterName[chapter].title),

                  tinyClick
                    .on('click', (e) => {
                      e.preventDefault();
                      // Save Chapter
                      saveRoleplayFormat(Number(tinyClick.attr('chapter')));
                    })
                    .setText('Save as'),
                ),
            ),
          ),
        );
      }

      body.append(
        TinyHtml.createFrom('p', { class: 'm-0' }).setText(
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
  leftMenu.push(TinyHtml.createFrom('h5').setText('Donate'));
  leftMenu.push(
    createButtonSidebar('fas fa-donate', 'Donate <3', () => {
      const $container = TinyHtml.createFrom('div').addClass('text-center');
      $container.append(
        TinyHtml.createFrom('p', { class: 'made-by-ai' }).setHtml(
          'This project took <strong>months of dedication</strong> and many <em>sleepless nights</em>.',
        ),
      );

      $container.append(
        TinyHtml.createFrom('p', { class: 'made-by-ai m-0' }).setHtml(
          'If you enjoyed all the love and effort I put into this <strong>super AI roleplay project</strong>,',
        ),
      );

      $container.append(
        TinyHtml.createFrom('p', { class: 'made-by-ai' }).setHtml(
          'I warmly invite you to support it with a <strong>voluntary donation</strong>',
        ),
      );

      $container.append(
        TinyHtml.createFrom('p', { class: 'made-by-ai m-0' }).setHtml(
          'I accept both <strong>traditional currencies</strong> and <strong>cryptocurrencies</strong> as donation methods',
        ),
      );

      $container.append(
        TinyHtml.createFrom('p', { class: 'made-by-ai' }).setHtml(
          'Thank you for helping this tiny magical project grow! 🎁💕',
        ),
      );

      const patreonNames = ['Jimm'];

      const $thankYouBox = TinyHtml.createFrom('div').addClass('patreon-thankyou');

      const $thankYouText = TinyHtml.createFrom('p').setText(
        'Tiny magic moment to thank these magical patreons which supports the tiny fic:',
      );
      const $ul = TinyHtml.createFrom('ul', { class: 'list-unstyled' });

      patreonNames.forEach((name) => {
        const $nameSpan = TinyHtml.createFrom('span').addClass('magic-name').setText(name);
        const $li = TinyHtml.createFrom('li').append($nameSpan);
        $ul.append($li);
      });

      $thankYouBox.append($thankYouText, $ul);
      $container.append($thankYouBox);

      tinyLib.modal({
        title: 'Tiny Donations!',
        dialog: 'modal-lg',
        id: 'modal-donate',
        body: $container.append(
          TinyHtml.createFrom('div', { class: 'donation-highlight' }).append(
            TinyHtml.createFrom('img', {
              class: 'd-block w-100',
              src: '/img/ai-example/2025-04-09_06-48.jpg',
            }),
          ),
        ),
      });
    }),
  );

  // Left
  const connectionInfoBar = TinyHtml.createFrom('span');
  const sidebarLeft = TinyHtml.createFrom('div', sidebarStyle)
    .removeClass('d-md-block')
    .removeClass('p-3')
    .addClass('d-md-flex')
    .addClass('flex-column')
    .addClass('py-0')
    .append(
      TinyHtml.createFrom('ul', {
        class: 'list-unstyled flex-grow-1 overflow-auto mb-0 pt-3 px-3',
      }).append(
        TinyHtml.createFrom('li', { id: 'ai-mode-list', class: 'mb-3' }).append(leftMenu),

        // Tiny information
        TinyHtml.createFrom('div', {
          class: 'small text-grey p-2 bg-dark position-sticky bottom-0 pt-0',
        }).append(
          TinyHtml.createFrom('hr', { class: 'border-white mt-0 mb-2' }),
          connectionInfoBar,
          TinyHtml.createFrom('span').setText(
            'AI makes mistakes, so double-check it. AI does not replace the fic literature (Careful! AI can type spoilers!).',
          ),
        ),
      ),
    );

  // Right
  const sidebarSettingTemplate = { span: { class: 'pb-2 d-inline-block' } };
  const sidebarRightBase = {
    // Model Selector
    modelSelector: TinyHtml.createFrom('div', {
      class: 'form-floating',
      title: 'The AI model used here',
    }).append(
      modelSelector,
      TinyHtml.createFrom('label', { for: 'select-ai-model' })
        .setText('Select AI Model')
        .prepend(tinyLib.icon(`fa-solid fa-atom me-2`)),
    ),

    // Token Counter
    tokenCounter: TinyHtml.createFrom('div', {
      class: 'mt-3',
      title: 'Counts how many tokens are used for the content generation',
    }).append(
      TinyHtml.createFrom('span')
        .setText('Token count')
        .prepend(tinyLib.icon(`fa-solid fa-magnifying-glass me-2`)),
      TinyHtml.createFrom('div', { class: 'mt-1 small' }).append(
        tokenCount.amount,
        TinyHtml.createFrom('span', { class: 'mx-1' }).setText('/'),
        tokenCount.total,
      ),
    ),

    // Temperature
    temperature: TinyHtml.createFrom('div', {
      class: 'mt-3',
      title: 'Creativity allowed in the responses',
    }).append(
      TinyHtml.createFrom('span', sidebarSettingTemplate.span)
        .setText('Temperature')
        .prepend(tinyLib.icon(`fa-solid fa-temperature-three-quarters me-2`)),
      temperature.insert(),
    ),

    // Output Length
    outputLength: TinyHtml.createFrom('div', {
      class: 'mt-3',
      title: 'Maximum number of tokens in response',
    }).append(
      TinyHtml.createFrom('span', sidebarSettingTemplate.span)
        .setText('Output length')
        .prepend(tinyLib.icon(`fa-solid fa-comment me-2`)),
      outputLength,
    ),

    // Top P
    topP: TinyHtml.createFrom('div', {
      class: 'mt-3',
      title: 'The maximum cumulative probability of tokens to consider when sampling',
    }).append(
      TinyHtml.createFrom('span', sidebarSettingTemplate.span)
        .setText('Top P')
        .prepend(tinyLib.icon(`fa-solid fa-percent me-2`)),
      topP.insert(),
    ),

    // Top K
    topK: TinyHtml.createFrom('div', {
      class: 'mt-3',
      title: 'The maximum number of tokens to consider when sampling',
    }).append(
      TinyHtml.createFrom('span', sidebarSettingTemplate.span)
        .setText('Top K')
        .prepend(tinyLib.icon(`fa-solid fa-0 me-2`)),
      topK.insert(),
    ),

    // Presence penalty
    presencePenalty: TinyHtml.createFrom('div', {
      class: 'mt-3',
      title:
        "Presence penalty applied to the next token's logprobs if the token has already been seen in the response",
    }).append(
      TinyHtml.createFrom('span', sidebarSettingTemplate.span)
        .setText('Presence penalty')
        .prepend(tinyLib.icon(`fa-solid fa-hand me-2`)),
      presencePenalty.insert(),
    ),

    // Frequency penalty
    frequencyPenalty: TinyHtml.createFrom('div', {
      class: 'mt-3',
      title:
        "Frequency penalty applied to the next token's logprobs, multiplied by the number of times each token has been seen in the respponse so far",
    }).append(
      TinyHtml.createFrom('span', sidebarSettingTemplate.span)
        .setText('Frequency penalty')
        .prepend(tinyLib.icon(`fa-solid fa-hand me-2`)),
      frequencyPenalty.insert(),
    ),
  };

  // Active tooltip
  Tooltip(sidebarRightBase.tokenCounter);
  Tooltip(sidebarRightBase.temperature);
  Tooltip(sidebarRightBase.outputLength);
  Tooltip(sidebarRightBase.topP);
  Tooltip(sidebarRightBase.topK);
  Tooltip(sidebarRightBase.presencePenalty);
  Tooltip(sidebarRightBase.frequencyPenalty);

  // Models list
  const updateModelList = () => {
    if (!tinyAiScript.noai && !tinyAiScript.mpClient) {
      const models = tinyAi.getModelsList();
      resetModelSelector();
      if (models.length > 0) {
        // Insert model
        const insertItem = (id, displayName, disabled = false) =>
          modelSelector.append(
            TinyHtml.createFrom('option', { value: id })
              .toggleProp('disabled', disabled)
              .setText(displayName),
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
        modelSelector.setVal(
          tinyLs.getItem('tiny-ai-storage-model-selected') || tinyAi.getModel() || '',
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
      .setVal(model.outputTokenLimit)
      .removeProp('disabled')
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
        tinyLs.setItem('tiny-ai-storage-model-selected', newModel);
        if (tinyAi.getData()) tinyAi.setModel(newModel, ficConfigs.selected);
      } else {
        tokenCount.total.setText(0);
        temperature.reset().disable();
        outputLength.setVal(0).addProp('disabled').addClass('disabled');
        topP.reset().disable();
        topK.reset().disable();
        presencePenalty.reset().disable();
        frequencyPenalty.reset().disable();
        tinyLs.removeItem('tiny-ai-storage-model-selected');
      }

      if (!isFirstTime && !ignoreTokenUpdater && !modelSelector.hasProp('disabled'))
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
        loaderScreen.start();
        await tinyAi.getModels(100);

        if (!tinyAi._nextModelsPageToken) {
          loadMoreModels.addClass('disabled');
          loadMoreModels.addProp('disabled');
        }

        updateModelList();
        loaderScreen.stop();
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

  const sidebarRight = TinyHtml.createFrom('div', sidebarStyle).append(
    TinyHtml.createFrom('ul', { class: 'list-unstyled' }).append(
      TinyHtml.createFrom('h5').setText('Run Settings'),
      sidebarRightBase.modelSelector,
      sidebarRightBase.tokenCounter,
      sidebarRightBase.temperature,
      sidebarRightBase.outputLength,
      sidebarRightBase.topP,
      sidebarRightBase.topK,
      sidebarRightBase.presencePenalty,
      sidebarRightBase.frequencyPenalty,

      TinyHtml.createFrom('hr', { class: 'm-2' }),

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
      if (typeof history.systemInstruction === 'string' && history.systemInstruction.length > 0) {
        let extraInfo = '';
        if (canPublicRPG || canPrivateRPG) extraInfo += `\n${aiTemplates.helpers.ficRpgChecker}`;
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
            typeof hashItems.systemInstruction === 'string' ? hashItems.systemInstruction : null,
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
          msgInput.setVal(`(${secondsWaiting}s) Loading model data${points}`);
        };
        const loadingMessage = setInterval(loadingMoment, 1000);
        loadingMoment();

        const stopLoadingMessage = () => {
          clearInterval(loadingMessage);
          msgInput.setVal(oldMsgInput);
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
            alert(err.message, 'Error: AI tokens getter');
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
            role === 'user' ? null : toTitleCase(role),
          );
          addMessage(tinyCache.msgBallon);
        } else {
          new TinyHtml(tinyCache.msgBallon.find('.ai-msg-ballon'))
            .empty()
            .append(TinyHtml.createFromHtml(makeMsgRenderer(msgData)));
          const tinyErrorAlert = tinyCache.msgBallon.data('tiny-ai-error-alert');
          if (tinyErrorAlert) tinyErrorAlert.updateText(finishReason);
          chatContainer.setScrollTop(999999999);
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
                tinyAi.replaceIndex(tinyAi.getIndexOfId(tinyCache.msgId), chuck.contents[index], {
                  count: promptTokens || null,
                });

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
              tinyCache.msgBallon.setData('tiny-ai-cache', oldBallonCache);

              // Add class
              tinyCache.msgBallon.addClass('entering-ai-message');
            }
          }

          // Remove class
          if (isComplete) {
            const notificationError = () =>
              tinyNotification.send('System', { body: 'Your message was not processed.' });

            if (tinyCache.msgBallon) {
              tinyCache.msgBallon.removeClass('entering-ai-message');
              const ballonCache = tinyCache.msgBallon.data('tiny-ai-cache');
              if (TinyHtml.query('body')?.hasClass('windowHidden')) {
                if (ballonCache) tinyNotification.send(ballonCache.role, { body: ballonCache.msg });
                else notificationError();
              }
            } else if (TinyHtml.query('body')?.hasClass('windowHidden')) notificationError();
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
                tinyCache.msgBallon.setData('tiny-ai-cache', oldBallonCache);
              }
            }
          }

          // Error
          else {
            console.log(`AI Generator Error`, result.error);
            alert(result.error.message);
            if (typeof result.error.message === 'string' && result.error.message.length > 0)
              tinyNotification.send('Ai Error', { body: result.error.message });
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
    const textarea = TinyHtml.createFrom('textarea', {
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
      textarea.setStyle('height', 'auto');

      // Get scrollHeight via jQuery
      const newHeight = textarea.prop('scrollHeight');
      const height = lines > 1 ? Math.min(newHeight, maxHeight) : minHeight;

      // Defines height, but respects the maximum limit
      textarea.setStyle('height', `${String(height)}px`);
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
      chatContainer.setStyle('padding-bottom', `${String(tinyFinalValue)}px`);

      textInputContainer.setStyle({
        position: 'relative',
        top: `-${String(tinyFinalValue)}px`,
      });

      // Get the new scroll height after adding content
      const heightAfter = chatContainer.prop('scrollHeight');
      const heightDiff = heightAfter - heightBefore;

      // Adjust the scroll position to maintain the user's view
      chatContainer.scrollTop(scrollBefore + heightDiff);

      // Value
      tinyLs.setItem(
        `tiny-ai-textarea-${ficConfigs.selected}`,
        typeof value === 'string' ? value : '',
      );
    },
  );
  contentEnabler.setMsgInput(msgInput);

  // Submit
  const msgSubmit = tinyLib.bs.button('primary input-group-text-dark').setText('Send');
  contentEnabler.setMsgSubmit(msgSubmit);

  const cancelSubmit = tinyLib.bs
    .button('primary input-group-text-dark rounded-end')
    .setText('Cancel');
  contentEnabler.setCancelSubmit(cancelSubmit);

  const submitMessage = async () => {
    // Prepare to get data
    msgInput.trigger('blur');
    const msg = msgInput.val();
    msgInput.setVal('').trigger('input');

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
      msgInput.setVal(`(${secondsWaiting}s) Waiting response${points}`);
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
            newTokens && typeof newTokens.totalTokens === 'number' ? newTokens.totalTokens : null;

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
    msgInput.setVal('');

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
    if (!msgInput.hasProp('disabled')) submitMessage();
  });

  msgInput.on('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      msgSubmit.trigger('click');
    }
  });

  // First Dialogue button
  const firstDialogueBase = {
    base: TinyHtml.createFrom('div', {
      class: 'first-dialogue-base position-absolute  top-50 start-50 translate-middle',
      style: 'pointer-events: none;',
    }),

    button: tinyLib.bs
      .button('lg btn-bg d-flex justify-content-center align-items-center')
      .setAttr('title', 'Insert first dialogue')
      .setStyle({
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
  const msgList = TinyHtml.createFrom('div', {
    class: 'p-3',
    style: 'margin-bottom: 55px !important;',
  });

  const addMessage = (item) => {
    msgList.append(item);
    chatContainer.setScrollTop(999999999);
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
    const textBase = TinyHtml.createFrom('span');
    const result = tinyLib.bs.alert(
      'danger mt-2 mb-0 d-none',
      [tinyLib.icon('fas fa-exclamation-triangle me-2'), textBase],
      true,
    );

    const updateText = (errorCode) => {
      const tinyError = tinyAi.getErrorCode(errorCode);
      if (tinyError && typeof tinyError.text === 'string' && !tinyError.hide) {
        textBase.setText(tinyError.text);
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
      role: username ? toTitleCase(username) : 'User',
    };

    const msgBase = TinyHtml.createFrom('div', {
      class: `p-3${typeof username !== 'string' ? ' d-flex flex-column align-items-end' : ''} ai-chat-data`,
    });

    const msgBallon = TinyHtml.createFrom('div', {
      class: `bg-${typeof username === 'string' ? 'secondary d-inline-block' : 'primary'} text-white p-2 rounded ai-msg-ballon`,
    });

    msgBase.setData('tiny-ai-cache', tinyCache);
    const isIgnore = typeof data.id !== 'number' || data.id < 0;
    const tinyIndex = tinyAi.getIndexOfId(data.id);

    // Edit message panel
    const editPanel = TinyHtml.createFrom('div', { class: 'ai-text-editor' });
    editPanel.append(
      // Edit button
      !isIgnore && tinyIndex > -1
        ? tinyLib.bs
            .button('bg btn-sm')
            .append(tinyLib.icon('fa-solid fa-pen-to-square'))
            .on('click', () => {
              // Text
              const textInput = TinyHtml.createFrom('textarea', { class: 'form-control' });
              textInput.setVal(tinyCache.msg ?? null);
              const oldMsg = tinyCache.msg;

              // Submit
              const submitButton = tinyLib.bs
                .button(
                  `${typeof username !== 'string' ? 'secondary d-inline-block' : 'primary'} mt-2 w-100 me-2`,
                )
                .setText('Submit');

              const cancelButton = tinyLib.bs
                .button(
                  `${typeof username !== 'string' ? 'secondary d-inline-block' : 'primary'} mt-2 w-100`,
                )
                .setText('Cancel');

              const closeReplace = () => {
                msgBallon.removeClass('w-100').empty();
                msgBallon.append(TinyHtml.createFromHtml(makeMsgRenderer(tinyCache.msg)));
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
                  TinyHtml.createFrom('div', { class: 'd-flex mx-5' }).append(
                    submitButton,
                    cancelButton,
                  ),
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
      msgBallon.append(TinyHtml.createFromHtml(makeMsgRenderer(tinyCache.msg))),
      TinyHtml.createFrom('div', {
        class: `text-muted small mt-1${typeof username !== 'string' ? ' text-end' : ''}`,
        text: typeof username === 'string' ? username : 'User',
      }),
      tinyErrorAlert.result,
    );

    msgContent.setData('tiny-ai-error-alert', tinyErrorAlert);
    return msgContent;
  };

  // Container
  const chatContainer = TinyHtml.createFrom('div', {
    id: 'ai-chatbox',
    class: 'h-100 body-background',
    style: 'overflow-y: auto; margin-bottom: -54px;',
  });

  contentEnabler.setChatContainer(chatContainer);

  const textInputContainer = TinyHtml.createFrom('div', {
    class: 'input-group pb-3 body-background',
  }).append(msgInput, cancelSubmit, msgSubmit);

  const container = TinyHtml.createFrom('div', {
    class: 'd-flex h-100 y-100',
    id: 'ai-element-root',
  }).append(
    sidebarLeft,
    // Main container
    TinyHtml.createFrom('div', { class: 'flex-grow-1 d-flex flex-column' }).append(
      firstDialogueBase.base,
      TinyHtml.createFrom('div', { class: 'justify-content-center h-100' }).append(
        // Chat Messages Area
        chatContainer.append(msgList),

        // Input Area
        TinyHtml.createFrom('div', { class: 'px-3 d-inline-block w-100' }).append(
          textInputContainer,
        ),
      ),
    ),
    sidebarRight,
  );

  Tooltip(firstDialogueBase.button);

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
          firstDialogue: typeof tinyData.firstDialogue === 'string' ? tinyData.firstDialogue : null,
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
              : typeof model.maxTemperature === 'number' || typeof model.temperature === 'number'
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
        if (saveSessionTimeout[sessionSelected]) clearTimeout(saveSessionTimeout[sessionSelected]);
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
          tinyIo.client.updateRoomSettings(newSettings).then((result) => {
            if (result.error)
              alert(
                `⚠️ Your data was not saved! Please try again.\nError Message:${result.msg}\nCode: ${result.code}`,
              );
          });

          // Complete
          saveSessionTimeout[timeoutId] = null;
        }, 1000);
      }
    }
  };

  const tinyAiSocketTemplate = (where, where2, el) =>
    tinyAi.on(where, (value, id) => {
      if (el) {
        if (el instanceof TinyHtml) el.setVal(value);
        else el.val(value);
      }
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
      firstDialogueBase.button.removeProp('disabled').removeClass('disabled');
    };

    // Remove First Dialogue
    const removeAddFirstDialogue = () => {
      firstDialogueBase.base.addClass('d-none');
      firstDialogueBase.button.addProp('disabled').addClass('disabled');
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
  TinyHtml.query('#markdown-read')?.append(container);
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
      onlineStatus.base = TinyHtml.createFrom('div').addClass('mb-1 small');
      onlineStatus.wrapper = TinyHtml.createFrom('div').addClass('d-flex align-items-center gap-1');
      onlineStatus.icon = tinyLib.icon('fas fa-circle text-danger');
      onlineStatus.text = TinyHtml.createFrom('span').setText('Offline');
      onlineStatus.id = TinyHtml.createFrom('span');
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
          onlineStatus.text.setText('Online');
          onlineStatus.id
            .empty()
            .setText('Id: ')
            .append(TinyHtml.createFrom('strong').setText(connectionId));

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
            loaderScreen.stop();
          }
        });

        client.on('roomError', (result) => {
          sendSocketError(result);
          loaderScreen.stop();
        });

        client.on('roomNotFound', () => {
          makeTempMessage('The room was not found', rpgCfg.ip);
          loaderScreen.stop();
        });

        client.on('roomJoinned', (result) => {
          makeTempMessage(`You successfully entered the room **${result.roomId}**!`, rpgCfg.ip);
          loaderScreen.stop();
        });

        // Disconnected
        client.on('disconnect', (reason, details) => {
          // Offline!
          onlineStatus.icon.addClass('text-danger').removeClass('text-success');
          onlineStatus.text.setText('Offline');
          onlineStatus.id.empty();

          // Message
          makeTempMessage(
            `You are disconected${objType(details, 'object') && typeof details.description === 'string' ? ` (${details.description})` : ''}${typeof reason === 'string' ? `: ${reason}` : ''}`,
            rpgCfg.ip,
          );

          // Prepare disconnect progress
          if (tinyAiScript.mpClient) {
            // Is active
            if (client.isActive()) loaderScreen.start();
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
      for (const name in item) if (typeof item[name] === 'number') file.tokens[name] = item[name];
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

  // Finished
  await tinyNotification.requestPerm();
  loaderScreen.stop();
};
