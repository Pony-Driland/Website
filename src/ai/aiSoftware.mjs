import moment from 'moment';
import { marked } from 'marked';
import clone from 'clone';
import objHash from 'object-hash';
import { saveAs } from 'file-saver';

import { objType, countObj, toTitleCase, isJsonObject } from 'tiny-essentials/basics';
import TinyHtml from 'tiny-essentials/libs/TinyHtml';
import TinyHtmlElems from 'tiny-essentials/libs/TinyHtmlElems';

import {
  isNoNsfw,
  tinyLs,
  tinyNotification,
  appData,
  connStore,
  loaderScreen,
  tinyToast,
} from '../important.mjs';
import tinyLib, { alert } from '../files/tinyLib.mjs';
import aiTemplates from './values/templates.mjs';
import TinyClientIo from './socketClient.mjs';
import RpgData from './software/rpgData.mjs';
import { noOnlineMode, contentEnabler, isOnline } from './software/enablerContent.mjs';
import ficConfigs from './values/ficConfigs.mjs';

import './values/jsonTemplate.mjs';

import { canSandBox, tinyAi, tinyIo } from './software/base.mjs';
import { tinyAiScript } from './software/tinyAiScript.mjs';
import { Tooltip } from '../modules/TinyBootstrap.mjs';
import { clearFicData, urlUpdate } from '../fixStuff/markdown.mjs';
import { body, topPage } from '../html/query.mjs';
import { markdownBase } from '../html/base.mjs';

import {
  officialFileEnd,
  officialFileStart,
  userFileEnd,
  userFileStart,
} from './values/defaults.mjs';

import { userButtonActions } from './buttons/users.mjs';
import { roomSettingsMenu } from './buttons/roomSettings.mjs';
import { openClassicMap } from './buttons/map.mjs';
import { openDiceSpecialModal, openTinyDices } from './buttons/dice.mjs';
import { openDonatePage } from './buttons/donate.mjs';
import { openDownloadsList } from './buttons/downloads.mjs';
import { openCreateAccount } from './buttons/createAccount.mjs';
import { openChangePassword } from './buttons/changePassword.mjs';
import { tinyModalTextarea } from './buttons/modalTextarea.mjs';

const { Icon } = TinyHtmlElems;

export const AiScriptStart = async () => {
  let sessionEnabled = true;
  // Update Url
  urlUpdate('ai', 'AI Page');

  // Clear page
  clearFicData();
  markdownBase.empty();
  topPage.addClass('d-none');

  // Can use backup
  const rpgCfg = contentEnabler.setRpgCfg();
  const isOfflineMode = noOnlineMode();

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

  // TITLE: Start loading page
  let isFirstTime = true;
  if (!tinyAiScript.isEnabled()) {
    alert(
      'AI mode is currently disabled for your session. Please click the robot icon to activate it, then come back here.',
      'AI Page',
    );
    return;
  }

  // TITLE: Check if mature content is allowed
  if (isNoNsfw()) {
    alert(
      'Access to this content is restricted in your region or settings. You will need to verify your age to continue. The "Sign in with Google" button is located at the top right of the page.',
      'Age Verification Required',
    );
    return;
  }

  // TITLE: Start page loading...

  loaderScreen.start();

  const rpgData = new RpgData();

  // Get RPG Template
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
      .prepend(new Icon(`${icon} me-2`))
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

  // TITLE: Get fic cache
  let isFirstFicCache = true;
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
          if (isOfflineMode) clearMessages();
          if (sessionEnabled) {
            contentEnabler.enBase();
            contentEnabler.enMessageButtons();
            contentEnabler.enRpgContent();
          }
          if (isOfflineMode) makeTempMessage(introduction, 'Introduction');
          const history = tinyAi.getData();

          // Restore textarea
          if (ficConfigs.selected) {
            let textBackup = tinyLs.getItem(`tiny-ai-textarea-${ficConfigs.selected}`);
            if (typeof textBackup !== 'string') textBackup = '';
            msgInput.setVal(textBackup).trigger('input');
          }

          // Set Model config
          if (id) {
            const aiCfg = {
              outputTokens: tinyAi.getMaxOutputTokens(id),
              temperature: tinyAi.getTemperature(id),
              topP: tinyAi.getTopP(id),
              topK: tinyAi.getTopK(id),
              presencePenalty: tinyAi.getPresencePenalty(id),
              frequencyPenalty: tinyAi.getFrequencyPenalty(id),
            };

            if (aiCfg.outputTokens !== null) outputLength.setVal(aiCfg.outputTokens);
            if (aiCfg.temperature !== null) temperature.val(aiCfg.temperature);
            if (aiCfg.topP !== null) topP.val(aiCfg.topP);
            if (aiCfg.topK !== null) topK.val(aiCfg.topK);
            if (aiCfg.presencePenalty !== null) presencePenalty.val(aiCfg.presencePenalty);
            if (aiCfg.frequencyPenalty !== null) frequencyPenalty.val(aiCfg.frequencyPenalty);
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
          contentEnabler.emit('ficCacheLoaded', isFirstFicCache);
          isFirstFicCache = false;
          resolve();
        })
        .catch((err) => {
          alert(err.message);
          loaderScreen.stop();
          reject(err);
        });
    });

  // TITLE: Import Data

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
    if (isJsonObject(jsonData) && jsonData.file && typeof jsonData.id === 'string') {
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
            isJsonObject(file.customList[i]) &&
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
      if (typeof file.temperature === 'number') {
        tinyAi.setTemperature(file.temperature);
        if (tinyAi.getId() === sessionId) temperature.val(file.temperature);
      }

      if (typeof file.maxOutputTokens === 'number') {
        tinyAi.setMaxOutputTokens(file.maxOutputTokens);
        if (tinyAi.getId() === sessionId) outputLength.setVal(file.maxOutputTokens);
      }

      if (typeof file.topP === 'number') {
        tinyAi.setTopP(file.topP);
        if (tinyAi.getId() === sessionId) topP.val(file.topP);
      }

      if (typeof file.topK === 'number') {
        tinyAi.setTopK(file.topK);
        if (tinyAi.getId() === sessionId) topK.val(file.topK);
      }

      if (typeof file.presencePenalty === 'number') {
        tinyAi.setPresencePenalty(file.presencePenalty);
        if (tinyAi.getId() === sessionId) presencePenalty.val(file.presencePenalty);
      }

      if (typeof file.frequencyPenalty === 'number') {
        tinyAi.setFrequencyPenalty(file.frequencyPenalty);
        if (tinyAi.getId() === sessionId) frequencyPenalty.val(file.frequencyPenalty);
      }

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
        if (isOfflineMode) clearMessages();
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

  // TITLE: Reset buttons
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

  // TITLE: Fic Templates
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
    newButton.setData('tiny-fic-id', ficConfigs.data[index].id);
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

  // TITLE: Prompt Buttons
  const ficPromptItems = [
    // System Instructions
    createButtonSidebar('fa-solid fa-toolbox', 'System Instructions', () => {
      const tinyModalData = {
        id: 'ai_instructions',
        info: 'System Instructions:',
        size: 400,
        textarea: tinyAi.getSystemInstruction(),
        submitName: 'Set Instructions',
        readOnly: tinyAiScript.mpClient,
        submitCall: (value) => {
          const oldValue = tinyAi.getSystemInstruction();
          if (typeof oldValue !== 'string' || oldValue !== value) {
            tinyAi.setSystemInstruction(value, 0);
            updateAiTokenCounterData();
          }
        },
      };

      if (canSandBox(ficConfigs.selected)) {
        tinyModalData.addTemplates = isOfflineMode
          ? {
              data: aiTemplates.prompts,
              title: 'Select a prompt to be added',
            }
          : undefined;
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
          addTemplates: isOfflineMode
            ? {
                data: aiTemplates.prompts,
                title: 'Select a prompt to be added',
              }
            : undefined,
          readOnly: tinyAiScript.mpClient,
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
          addTemplates: isOfflineMode
            ? {
                data: aiTemplates.prompts,
                title: 'Select a prompt to be added',
              }
            : undefined,
          readOnly: tinyAiScript.mpClient,
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

  const leftMenu = [];

  /** @type {null|import('tiny-essentials/libs/TinyHtml').TinyHtmlAny} */
  let autoSelectChatMode = null;

  // Insert menu
  if (isOfflineMode) {
    // Reset
    leftMenu.push(TinyHtml.createFrom('h5').setText('Reset'));
    leftMenu.push(...ficResets);

    // Modes
    leftMenu.push(TinyHtml.createFrom('h5').setText('Modes'));

    // Fic Talk
    leftMenu.push(...ficTemplates);
  } else
    autoSelectChatMode = ficTemplates.find((item) => item.data('tiny-fic-id') === 'noData') ?? null;

  // Settings
  if (!tinyAiScript.noai) leftMenu.push(TinyHtml.createFrom('h5').setText('Settings'));
  leftMenu.push(...ficPromptItems);

  // TITLE: RPG
  leftMenu.push(TinyHtml.createFrom('h5').setText('RPG'));
  // Dice
  leftMenu.push(createButtonSidebar('fa-solid fa-dice', 'Roll Dice', openTinyDices));

  const rpgContentButtons = [];

  // RPG Data
  const rpgPublicButton = createButtonSidebar('fa-solid fa-note-sticky', 'View Data', null, false, {
    toggle: 'offcanvas',
    target: '#rpg_ai_base_1',
  });
  rpgContentButtons.push(rpgPublicButton);

  // Private RPG Data
  const rpgPrivateButton = createButtonSidebar('fa-solid fa-book', 'View Private', null, false, {
    toggle: 'offcanvas',
    target: '#rpg_ai_base_2',
  });
  rpgPrivateButton.addClass('d-hide');
  rpgContentButtons.push(rpgPrivateButton);

  // Insert RPG Data
  leftMenu.push(...rpgContentButtons);
  contentEnabler.setRpgContentButton(rpgContentButtons);
  contentEnabler.deRpgContent();

  // Classic Map
  leftMenu.push(createButtonSidebar('fa-solid fa-map', 'Classic Map', openClassicMap));

  /** @type {null|import('tiny-essentials/libs/TinyHtml').TinyHtmlAny} */
  let createAccountButton = null;

  // TITLE: Online Mode options
  if (!isOfflineMode) {
    leftMenu.push(TinyHtml.createFrom('h5').setText('Online'));
    leftMenu.push(createButtonSidebar('fas fa-users', 'Room settings', roomSettingsMenu));
    leftMenu.push(createButtonSidebar('fas fa-users', 'User manager', userButtonActions));

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
          const { html, modal } = tinyLib.modal({
            title: title,
            dialog: 'modal-lg',
            id,
            body: $root,
          });

          html.on('shown.bs.modal', () => $input.focus());
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

    leftMenu.push(createButtonSidebar('fas fa-key', 'Change password', openChangePassword));
    createAccountButton = createButtonSidebar(
      'fas fa-user-plus',
      'Create account',
      openCreateAccount,
    );
    createAccountButton.addClass('d-hide');
    leftMenu.push(createAccountButton);
  }

  // Import
  if (isOfflineMode) {
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
    leftMenu.push(createButtonSidebar('fa-solid fa-download', 'Downloads', openDownloadsList));
  }

  // TITLE: Donate
  leftMenu.push(TinyHtml.createFrom('h5').setText('Donate'));
  leftMenu.push(createButtonSidebar('fas fa-donate', 'Donate <3', openDonatePage));

  // TITLE: Left Side
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
            !tinyAi.noai
              ? 'AI makes mistakes, so double-check it. AI does not replace the fic literature (Careful! AI can type spoilers!).'
              : '',
          ),
        ),
      ),
    );

  // TITLE: Right Side
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
        .prepend(new Icon(`fa-solid fa-atom me-2`)),
    ),

    // Token Counter
    tokenCounter: TinyHtml.createFrom('div', {
      class: 'mt-3',
      title: 'Counts how many tokens are used for the content generation',
    }).append(
      TinyHtml.createFrom('span')
        .setText('Token count')
        .prepend(new Icon(`fa-solid fa-magnifying-glass me-2`)),
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
        .prepend(new Icon(`fa-solid fa-temperature-three-quarters me-2`)),
      temperature.insert(),
    ),

    // Output Length
    outputLength: TinyHtml.createFrom('div', {
      class: 'mt-3',
      title: 'Maximum number of tokens in response',
    }).append(
      TinyHtml.createFrom('span', sidebarSettingTemplate.span)
        .setText('Output length')
        .prepend(new Icon(`fa-solid fa-comment me-2`)),
      outputLength,
    ),

    // Top P
    topP: TinyHtml.createFrom('div', {
      class: 'mt-3',
      title: 'The maximum cumulative probability of tokens to consider when sampling',
    }).append(
      TinyHtml.createFrom('span', sidebarSettingTemplate.span)
        .setText('Top P')
        .prepend(new Icon(`fa-solid fa-percent me-2`)),
      topP.insert(),
    ),

    // Top K
    topK: TinyHtml.createFrom('div', {
      class: 'mt-3',
      title: 'The maximum number of tokens to consider when sampling',
    }).append(
      TinyHtml.createFrom('span', sidebarSettingTemplate.span)
        .setText('Top K')
        .prepend(new Icon(`fa-solid fa-0 me-2`)),
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
        .prepend(new Icon(`fa-solid fa-hand me-2`)),
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
        .prepend(new Icon(`fa-solid fa-hand me-2`)),
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

  // TITLE: Models list
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

  // TITLE: Execute messages
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
        rpgData.allowAiUse.public && isJsonObject(history.rpgData) && countObj(history.rpgData) > 0;

      const canPrivateRPG =
        rpgData.allowAiUse.private &&
        isJsonObject(history.rpgPrivateData) &&
        countObj(history.rpgPrivateData) > 0;

      const existsRpgSchema =
        isJsonObject(rpgData.template.schema) && countObj(rpgData.template.schema) > 0;

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

        let tinyText = `${userFileStart}\n\n`;
        tinyText += JSON.stringify({ schema: tinyRpgData });
        tinyText += `\n\n${userFileEnd}`;

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
        let tinyText = `${userFileStart}\n\n`;
        tinyText += JSON.stringify({ database: tinyRpgData });
        tinyText += `\n\n${userFileEnd}`;

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
        let tinyText = `${officialFileStart}\n\n`;
        tinyText += JSON.stringify({ database: tinyRpgData });
        tinyText += `\n\n${officialFileEnd}`;

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
              (newCount) => {
                const tokenData = tinyAi.getMsgTokensByIndex(index);
                tinyAi.replaceIndex(index, null, { count: newCount, msgId: tokenData.msgId });
                if (isOnline()) {
                  const hash = tinyAi.getMsgHashByIndex(index);
                  const message = tinyAi.getMsgByIndex(index);
                  tinyIo.client
                    .editMessage(
                      { message: message.parts[0].text, hash, tokens: newCount },
                      tokenData.msgId,
                    )
                    .then((result) => {
                      if (result.error) alert(result.msg, 'ERROR!');
                    })
                    .catch((err) => {
                      alert(err.message, 'ERROR!');
                      console.error(err);
                    });
                }
              },
            );
          }

          resolve(!tinyAiScript.noai && !tinyAiScript.mpClient ? tinyAi.getTotalTokens() : 0);
        } else resolve(0);
      } catch (err) {
        reject(err);
      }
    });

  // TITLE: Get Ai Tokens
  let usingUpdateToken = false;
  const updateAiTokenCounterData = (hashItems, forceReset = false) => {
    if (tinyAiScript.mpClient) return;
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
          msgInput.focus();
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

  // TITLE: Execute AI script
  const executeAi = (tinyCache = {}, tinyController = undefined) =>
    new Promise((resolve, reject) => {
      const ballon = {};
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
          ballon.msgBallon = tinyCache.msgBallon;
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
              if (typeof tinyCache.msgId === 'undefined') {
                tinyCache.msgId = tinyAi.addData(chuck.contents[index], {
                  count: promptTokens || null,
                });
                ballon.msgId = tinyCache.msgId;
              } else
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
              ballon.cache = oldBallonCache;

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
              if (body.hasClass('windowHidden')) {
                if (ballonCache) tinyNotification.send(ballonCache.role, { body: ballonCache.msg });
                else notificationError();
              }
            } else if (body.hasClass('windowHidden')) notificationError();
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
                if (typeof tinyCache.msgId === 'undefined') {
                  tinyCache.msgId = tinyAi.addData(msg, { count: promptTokens || null });
                  ballon.msgId = tinyCache.msgId;
                } else
                  tinyAi.replaceIndex(tinyAi.getIndexOfId(tinyCache.msgId), msg, {
                    count: promptTokens || null,
                  });

                // Send message request
                insertMessage(msg.parts[0].text, msg.role, msg.finishReason);

                // Update message data
                const oldBallonCache = tinyCache.msgBallon.data('tiny-ai-cache');
                oldBallonCache.msg = msg.parts[0].text;
                tinyCache.msgBallon.setData('tiny-ai-cache', oldBallonCache);
                ballon.cache = oldBallonCache;
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
          resolve({ result, ballon });
        })
        .catch(reject);
    });

  // TITLE: Textarea input edition
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
  const aiSubmit = tinyLib.bs.button('primary input-group-text-dark').setText('AI');
  contentEnabler.setMsgSubmit(msgSubmit);

  const cancelSubmit = tinyLib.bs
    .button('primary input-group-text-dark rounded-end')
    .setText('Cancel');
  contentEnabler.setCancelSubmit(cancelSubmit);
  contentEnabler.setAiSubmit(aiSubmit);

  // TITLE: Send message
  const submitMessage = async () => {
    // Prepare to get data
    msgInput.blur();
    const msg = msgInput.val();
    msgInput.setVal('').trigger('input');

    // Disable stuff
    const controller = new AbortController();
    contentEnabler.deBase();
    contentEnabler.deMessageButtons();
    contentEnabler.deModelChanger();
    contentEnabler.dePromptButtons();
    contentEnabler.deModelSelector();

    // Start loading
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
        // Exist message
        if (typeof msg === 'string' && msg.length > 0) {
          const newMsg = tinyAi.buildContents(
            null,
            { role: 'user', parts: [{ text: msg }] },
            'user',
          );

          // Get tokens
          const newTokens =
            !tinyAiScript.noai && !tinyAiScript.mpClient
              ? await tinyAi.countTokens([newMsg])
              : { totalTokens: 0 };
          const newToken =
            newTokens && typeof newTokens.totalTokens === 'number' ? newTokens.totalTokens : null;

          // Get id
          sentId = tinyAi.addData(newMsg, { count: newToken });
          // Complete
          resolve(true);
        } else resolve(false);
      } catch (err) {
        // Delete error message
        tinyAi.deleteIndex(tinyAi.getIndexOfId(sentId));

        // Send error log
        console.error(err);
        alert(err.message);

        // Complete
        sentId = null;
        resolve(false);
      }
    });

    // Result is error?
    let isError = false;

    // Offline mode
    if (canContinue) {
      if (isOfflineMode) {
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

      // Online mode
      else {
        const isNoAi = tinyAiScript.noai || tinyAiScript.mpClient;
        const sendData = {
          model: (!isNoAi ? tinyAi.getModel() : '') ?? '',
          tokens: (!isNoAi ? tinyAi.getMsgTokensById(sentId).count : 0) ?? 0,
          hash: (!isNoAi ? tinyAi.getMsgHashById(sentId) : '') ?? '',
        };

        const msgData = await tinyIo.client.sendMessage(msg, sendData).catch((err) => {
          alert(err.message, 'ERROR!');
          console.error(err);
        });

        if (!msgData.error) {
          tinyAi.replaceIndex(tinyAi.getIndexOfId(sentId), null, {
            count: sendData.tokens,
            msgId: msgData.id,
          });
          addMessage(
            makeMessage(
              {
                message: msg,
                date: msgData.date,
                id: sentId,
                msgId: msgData.id,
                chapter: msgData.chapter,
                edited: 0,
              },
              tinyIo.client.getUserId(),
            ),
          );
        } else {
          isError = true;
          alert(msgData.msg, 'ERROR!');
        }
      }
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
    msgInput.focus();

    // Error
    if (isError) {
      msgInput.setVal(msg).trigger('input');
      tinyAi.deleteIndex(tinyAi.getIndexOfId(sentId));
    }
  };

  const submitCache = {};
  contentEnabler.setSubmitCache(submitCache);

  // Submit Button
  msgSubmit.on('click', async () => {
    if (!msgInput.hasProp('disabled')) submitMessage();
  });

  // AI moment
  aiSubmit.on('click', async () => {
    if (
      !msgInput.hasProp('disabled') &&
      !tinyAiScript.noai &&
      !tinyAiScript.mpClient &&
      sessionEnabled
    ) {
      // Disable stuff
      const controller = new AbortController();
      contentEnabler.deBase();
      contentEnabler.deMessageButtons();
      contentEnabler.deModelChanger();
      contentEnabler.dePromptButtons();
      contentEnabler.deModelSelector();

      const yourMsg = msgInput.val();

      // Start loading
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

      // Execute Ai
      contentEnabler.deBase(controller);
      await executeAi(submitCache, controller)
        .catch((err) => {
          if (submitCache.cancel) submitCache.cancel();
          console.error(err);
          alert(err.message);
        })
        .then(async (data) => {
          // Online
          if (isOnline()) {
            let isError = false;
            const sendData = {
              model: tinyAi.getModel() ?? '',
              tokens: tinyAi.getMsgTokensById(data.ballon.msgId).count ?? 0,
              hash: tinyAi.getMsgHashById(data.ballon.msgId) ?? '',
              isModel: true,
            };

            const theMsg = tinyAi.getMsgById(data.ballon.msgId);
            await tinyIo.client
              .sendMessage(theMsg.parts[0].text, sendData)
              .then((result) => {
                if (result.error) {
                  alert(result.msg, 'ERROR!');
                  isError = true;
                }

                data.ballon.cache.msgId = result.id;
                data.ballon.cache.date = result.date;
                data.ballon.cache.chapter = result.chapter;
                data.ballon.cache.edited = 0;
                data.ballon.cache.update();
                tinyAi.replaceIndex(tinyAi.getIndexOfId(data.ballon.msgId), null, {
                  count: sendData.tokens,
                  msgId: result.id,
                });
              })
              .catch((err) => {
                alert(err.message, 'ERROR!');
                console.error(err);
                isError = true;
              });
          }
        });

      // Complete
      clearInterval(loadingMessage);
      if (sessionEnabled) contentEnabler.enPromptButtons();
      msgInput.setVal(yourMsg);

      if (sessionEnabled) {
        contentEnabler.enMessageButtons();
        contentEnabler.enBase();
        contentEnabler.enModelChanger();
        contentEnabler.enModelSelector();
      }
      msgInput.focus();
    }
  });

  window.tinyIo = tinyIo;
  window.tinyAi = tinyAi;

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

  firstDialogueBase.button.append(new Icon('fa-solid fa-circle-play'));

  firstDialogueBase.button.on('click', async () => {
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

      let isError = false;
      const msgData = {};
      if (isOnline()) {
        const isNoAi = tinyAiScript.noai || tinyAiScript.mpClient;
        const sendData = {
          model: (!isNoAi ? tinyAi.getModel() : '') ?? '',
          tokens: (!isNoAi ? tinyAi.getMsgTokensById(msgId).count : 0) ?? 0,
          hash: (!isNoAi ? tinyAi.getMsgHashById(msgId) : '') ?? '',
          isModel: true,
        };

        loaderScreen.start();
        await tinyIo.client
          .sendMessage(history.firstDialogue, sendData)
          .then((result) => {
            if (result.error) {
              alert(result.msg, 'ERROR!');
              isError = true;
            }

            msgData.id = result.id;
            msgData.date = result.date;
            msgData.chapter = result.chapter;
            tinyAi.replaceIndex(tinyAi.getIndexOfId(msgId), null, {
              count: sendData.tokens,
              msgId: result.id,
            });
          })
          .catch((err) => {
            alert(err.message, 'ERROR!');
            console.error(err);
            isError = true;
          });
        loaderScreen.stop();
      }

      if (isError) {
        tinyAi.deleteIndex(tinyAi.getIndexOfId(msgId));
        enabledFirstDialogue(true);
        return;
      }

      addMessage(
        makeMessage(
          {
            message: history.firstDialogue,
            date: msgData.date,
            id: msgId,
            msgId: msgData.id,
            chapter: msgData.chapter,
            edited: 0,
          },
          'Model',
        ),
      );

      updateAiTokenCounterData();
    }
  });

  firstDialogueBase.base.append(firstDialogueBase.button);

  // TITLE: Message List
  const msgList = TinyHtml.createFrom('div', {
    class: 'p-3',
    style: 'margin-bottom: 55px !important;',
  });

  const addMessage = (item) => {
    msgList.append(item);
    if (isOnline()) {
      const ratelimit = tinyIo.client.getRateLimit();
      if (ratelimit.size) {
        const limit = ratelimit.size.history ?? null;
        if (typeof limit === 'number') {
          const msgs = new TinyHtml(msgList.find(':scope > .ai-chat-data[msgid]'));
          if (msgs.size > limit) new TinyHtml(msgs.get(0)).remove();
        }
      }
    }

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
      [new Icon('fas fa-exclamation-triangle me-2'), textBase],
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

  // TITLE : Message Maker
  const makeMessage = (
    data = {
      message: null,
      id: -1,
      date: null,
      msgId: null,
      chapter: null,
      edited: null,
    },
    username = null,
  ) => {
    // Prepare renderer
    const tinyCache = {
      chapter: data.chapter,
      msgId: data.msgId,
      edited: data.edited,
      date: data.date,
      msg: data.message,
      role: username ? toTitleCase(username) : 'User',
      dataid: data.id,
      updateText: (text = tinyCache.msg ?? '') =>
        msgBallon.empty().append(TinyHtml.createFromHtml(makeMsgRenderer(text))),
      delete: () => deleteButton.trigger('click'),
      remove: () => {
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
      },
      update: () => {
        msgBase.setAttr('msgid', tinyCache.msgId ?? null);
        msgBase.setAttr('edited', tinyCache.edited ?? null);
        msgBase.setAttr('date', tinyCache.date ?? null);
        msgBase.setAttr('chapter', tinyCache.chapter ?? null);
        msgBase.setAttr('dataid', tinyCache.dataid ?? null);
        msgBase.setAttr('role', tinyCache.role ?? null);

        /**
         * @param {import('tiny-essentials/libs/TinyHtml').TinyHtmlAny} base
         * @param {number|null} value
         * @param {() => (string|null|undefined)} result
         */
        const numberInsert = (base, value, result) => {
          base.removeClass('ms-2').removeClass('me-2').empty();
          if (
            typeof value === 'number' &&
            !Number.isNaN(value) &&
            Number.isFinite(value) &&
            value > 0
          ) {
            const text = result();
            if (typeof text === 'string') base.setText(text);
          }
        };

        numberInsert(dateBase, tinyCache.date, () => {
          const time = moment(tinyCache.date);
          if (time.isValid()) {
            dateBase.addClass('me-2');
            return time.calendar();
          }
        });

        numberInsert(chapterBase, tinyCache.chapter, () => {
          chapterBase.addClass('ms-2');
          return `Chapter ${tinyCache.chapter}`;
        });
      },
    };

    const isNotYou = !isOnline() || tinyIo.client.getUserId() !== username;

    const msgBase = TinyHtml.createFrom('div', {
      class: `p-3${typeof username !== 'string' || !isNotYou ? ' d-flex flex-column align-items-end' : ''} ai-chat-data`,
    });

    const msgBallon = TinyHtml.createFrom('div', {
      class: `bg-${typeof username === 'string' && isNotYou ? 'secondary d-inline-block' : 'primary'} text-white p-2 rounded ai-msg-ballon`,
    });

    const dateBase = TinyHtml.createFrom('span');
    const chapterBase = TinyHtml.createFrom('span');

    msgBase.setData('tiny-ai-cache', tinyCache);
    tinyCache.update();
    const isIgnore = typeof data.id !== 'number' || data.id < 0;
    const tinyIndex = tinyAi.getIndexOfId(data.id);

    const deleteButton = tinyLib.bs
      .button('bg btn-sm')
      .append(new Icon('fa-solid fa-trash-can'))
      .addClass('delete-button');
    const editButton = tinyLib.bs
      .button('bg btn-sm')
      .append(new Icon('fa-solid fa-pen-to-square'))
      .addClass('edit-button');
    const infoButton = tinyLib.bs
      .button('bg btn-sm')
      .append(new Icon('fa-solid fa-circle-info'))
      .addClass('info-button');

    const createTableContent = (title, value) =>
      value !== null
        ? TinyHtml.createFrom('tr').append(
            TinyHtml.createFrom('td').setText(title),
            TinyHtml.createFrom('td').setText(value),
          )
        : null;

    // Edit message panel
    const editPanel = TinyHtml.createFrom('div', { class: 'ai-text-editor' });

    editPanel.append(
      infoButton.on('click', () => {
        const date = moment(tinyCache.date);
        const edited = moment(tinyCache.edited);
        tinyLib.modal({
          title: 'Message Data',
          dialog: 'modal-lg',
          id: `msg-rpg-info`,
          body: TinyHtml.createFrom('table', {
            class: 'table table-striped table-bordered',
          }).append(
            TinyHtml.createFrom('thead').append(
              TinyHtml.createFrom('tr').append(
                TinyHtml.createFrom('th', { scope: 'col' }).setText('Title'),
                TinyHtml.createFrom('th', { scope: 'col' }).setText('Value'),
              ),
            ),
            TinyHtml.createFrom('tbody').append(
              createTableContent('msgid', tinyCache.msgId ?? null),
              createTableContent(
                'edited',
                edited.isValid() ? `${edited.calendar()} (${edited.valueOf()})` : null,
              ),
              createTableContent(
                'date',
                date.isValid() ? `${date.calendar()} (${date.valueOf()})` : null,
              ),
              createTableContent('chapter', tinyCache.chapter ?? null),
              createTableContent('dataid', tinyCache.dataid ?? null),
              createTableContent('role', tinyCache.role ?? null),
            ),
          ),
        });
      }),
      // Edit button
      !isIgnore && tinyIndex > -1
        ? editButton.on('click', () => {
            // Text
            const textInput = TinyHtml.createFrom('textarea', { class: 'form-control' });
            textInput.setVal(tinyCache.msg ?? null);
            const oldMsg = tinyCache.msg;

            // Submit
            const submitButton = tinyLib.bs
              .button(
                `${typeof username !== 'string' || !isNotYou ? 'secondary d-inline-block' : 'primary'} mt-2 w-100 me-2`,
              )
              .setText('Submit');

            // Cancel
            const cancelButton = tinyLib.bs
              .button(
                `${typeof username !== 'string' || !isNotYou ? 'secondary d-inline-block' : 'primary'} mt-2 w-100`,
              )
              .setText('Cancel');

            // Close Replace
            const closeReplace = () => {
              msgBallon.removeClass('w-100').empty();
              tinyCache.updateText();
              const msg = tinyAi.getMsgById();
              tinyErrorAlert.updateText(msg ? msg.finishReason : null);
            };

            // Submit
            submitButton.on('click', async () => {
              submitButton.addClass('disabled').addProp('disabled');
              cancelButton.addClass('disabled').addProp('disabled');

              // New message
              tinyCache.msg = textInput.val();
              textInput.addClass('disabled').addProp('disabled');

              const newMsg = tinyCache.msg;
              // Check message
              if (typeof oldMsg !== 'string' || oldMsg !== newMsg) {
                // New content and insert
                const oldTokens = tinyAi.getMsgTokensByIndex(tinyIndex)?.count ?? 0;
                const newContent = tinyAi.getMsgByIndex(tinyIndex);
                newContent.parts[0].text = tinyCache.msg;

                // Replace content
                tinyAi.replaceIndex(tinyIndex, newContent, { count: null, msgId: tinyCache.msgId });
                let isError = false;
                if (isOnline()) {
                  const isNoAi = tinyAiScript.noai || tinyAiScript.mpClient;
                  const sendData = {
                    message: newMsg,
                    model: (!isNoAi ? tinyAi.getModel() : '') ?? '',
                  };

                  await tinyIo.client
                    .editMessage(sendData, tinyCache.msgId)
                    .then((result) => {
                      if (result.error) {
                        alert(result.msg, 'ERROR!');
                        isError = true;
                      } else {
                        tinyCache.edited = result.edited;
                      }
                    })
                    .catch((err) => {
                      alert(err.message, 'ERROR!');
                      console.error(err);
                      isError = true;
                    });
                }

                if (isError) {
                  submitButton.removeClass('disabled').removeProp('disabled');
                  cancelButton.removeClass('disabled').removeProp('disabled');
                  textInput.removeClass('disabled').removeProp('disabled');
                  newContent.parts[0].text = oldMsg;
                  tinyCache.msg = oldMsg;
                  tinyAi.replaceIndex(tinyIndex, newContent, {
                    count: oldTokens,
                    msgId: tinyCache.msgId,
                  });
                  return;
                }

                // Complete
                closeReplace();
                updateAiTokenCounterData();
              } else closeReplace();
            });

            // On click cancel
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
      deleteButton.on('click', async () => {
        deleteButton.addClass('disabled').addProp('disabled');
        editButton.addClass('disabled').addProp('disabled');
        let isError = false;

        if (isOnline()) {
          await tinyIo.client
            .deleteMessage(tinyCache.msgId)
            .then((result) => {
              if (result.error) {
                alert(result.msg, 'ERROR!');
                isError = true;
              }
            })
            .catch((err) => {
              alert(err.message, 'ERROR!');
              console.error(err);
              isError = true;
            });
        }

        if (isError) {
          deleteButton.removeClass('disabled').removeProp('disabled');
          editButton.removeClass('disabled').removeProp('disabled');
          return;
        }

        tinyCache.remove();
      }),
    );

    const msg = tinyAi.getMsgById(data.id);
    const tinyErrorAlert = makeMsgWarning(msg ? msg.finishReason : null);

    const usernameBase = TinyHtml.createFrom('div', {
      class: `text-muted small mt-1${typeof username !== 'string' || !isNotYou ? ' text-end' : ''}`,
    });

    // Send message
    const msgContent = msgBase.append(
      editPanel,
      msgBallon,
      usernameBase
        .setText(typeof username === 'string' ? username : 'User')
        .append(chapterBase)
        .prepend(dateBase),
      tinyErrorAlert.result,
    );

    tinyCache.updateText();
    msgContent.setData('tiny-ai-error-alert', tinyErrorAlert);
    return msgContent;
  };

  // TITLE: Container
  const chatContainer = TinyHtml.createFrom('div', {
    id: 'ai-chatbox',
    class: 'h-100 body-background',
    style: 'overflow-y: auto; margin-bottom: -54px;',
  });

  contentEnabler.setChatContainer(chatContainer);

  const textInputContainer = TinyHtml.createFrom('div', {
    class: 'input-group pb-3 body-background',
  }).append(
    msgInput,
    cancelSubmit,
    !tinyAiScript.noai && !tinyAiScript.mpClient ? aiSubmit : null,
    msgSubmit,
  );

  const textInputWrapper = TinyHtml.createFrom('div', {
    class: 'px-3 d-inline-block w-100',
  }).append(textInputContainer);

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
        textInputWrapper,
      ),
    ),
    sidebarRight,
  );

  Tooltip(firstDialogueBase.button);

  // TITLE: Prepare events
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
      if (isOfflineMode) {
        if (useReadOnly) {
          contentEnabler.dePromptButtons();
          contentEnabler.deMessageButtons();
          contentEnabler.deBase();
          contentEnabler.deModelChanger();
          contentEnabler.deModelSelector();
          contentEnabler.deRpgContent();
        }

        const disableReadOnly = () => {
          if (useReadOnly && sessionEnabled) {
            contentEnabler.enPromptButtons();
            contentEnabler.enMessageButtons();
            contentEnabler.enBase();
            contentEnabler.enModelChanger();
            contentEnabler.enModelSelector();
            contentEnabler.enRpgContent();
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

  // TITLE: Save backup
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
          rpgSchema: isJsonObject(tinyData.rpgSchema) ? tinyData.rpgSchema : null,
          rpgData: isJsonObject(tinyData.rpgData) ? tinyData.rpgData : null,
          rpgPrivateData: isJsonObject(tinyData.rpgPrivateData) ? tinyData.rpgPrivateData : null,
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

      // TITLE: jsStore (offline)
      if (isOfflineMode) {
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

      // TITLE: Database (online)
      else if (typeof where === 'string' && !tinyAiScript.mpClient) {
        const timeoutId = `${sessionSelected}_${where}`;
        if (saveSessionTimeout[timeoutId]) clearTimeout(saveSessionTimeout[timeoutId]);
        saveSessionTimeout[timeoutId] = setTimeout(() => {
          const { roomSaveData } = getSessionData();

          // Prepare data
          const newSettings = {};
          if (roomSaveData[where] !== null) newSettings[where] = roomSaveData[where];
          let canSave = false;

          // Detect Diff
          const oldData = tinyIo.client.getRoom();
          for (const name in newSettings) if (newSettings[name] !== oldData[name]) canSave = true;

          // Send data
          if (canSave)
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
    if (isOfflineMode && id) resetSession(id).catch(console.error);
  });

  // Delete message
  tinyAi.on('deleteIndex', (index, id, sId) => {
    if (typeof id === 'number' || typeof id === 'string') {
      if (isOfflineMode)
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
      if (isOfflineMode)
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
    if (isOfflineMode)
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
  const validateMultiplayer = (
    value = null,
    needAi = true,
    allowMulti = false,
    isInverse = false,
  ) =>
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
        !allowMulti && !isInverse
        ? true
        : false;

  contentEnabler.setValidateMultiplayer(validateMultiplayer);

  // First Dialogue script
  const enabledFirstDialogue = (value = true) => {
    const isEnabled = validateMultiplayer(value, false, false, true);
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

  if (tinyAiScript.noai) {
    sidebarRight.removeClass('d-md-block').addClass('d-none');
    ficPromptItems.forEach((button) => button.addClass('d-none'));
  }

  // Welcome
  if (!tinyAiScript.mpClient) {
    if (isOfflineMode) {
      makeTempMessage(
        `Welcome to Pony Driland's chatbot! This is a chatbot developed exclusively to interact with the content of fic`,
        'Website',
      );
      makeTempMessage(
        'This means that whenever the story is updated, I am automatically updated for you to always view the answers of the latest content, because the algorithm of this website converts the content of fic to prompts.' +
          '\n\nChoose something to be done here so we can start our conversation! The chat will not work until you choose an activity to do here',
        'Website',
      );
    }
    updateModelList();
  }

  // Complete
  markdownBase.append(container);
  await rpgData.init().then(() => rpgData.finishOffCanvas(updateAiTokenCounterData));

  // TITLE: Rpg mode
  if (!isOfflineMode) {
    if (autoSelectChatMode) autoSelectChatMode.trigger('click');
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
      onlineStatus.icon = new Icon('fas fa-circle text-danger');
      onlineStatus.text = TinyHtml.createFrom('span').setText('Offline');
      onlineStatus.id = TinyHtml.createFrom('span');
      onlineStatus.wrapper.append(onlineStatus.icon, onlineStatus.text, onlineStatus.id);
      onlineStatus.base.append(onlineStatus.wrapper, onlineStatus.id);
      connectionInfoBar.replaceWith(onlineStatus.base);
      chatContainer.addClass('is-online');

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

        let isLoadingMsgs = false;
        const clearIsLoadingMsgs = () => {
          isLoadingMsgs = false;
        };

        const userStatus = {
          isMod: false,
          isAdmin: false,
          room: {
            isAdmin: false,
            isMod: false,
          },
          server: {
            isAdmin: false,
            isMod: false,
          },
        };

        // Read Only Mode
        const updateReadOnlyMode = (roomData) => {
          const isReadOnly =
            !client.getUsers()[client.getRoom().ownerId] ||
            (roomData.readOnly && !userStatus.isAdmin && !userStatus.isMod)
              ? true
              : false;

          container.toggleClass('read-only', isReadOnly);
          textInputWrapper.blur().toggleClass('d-none', isReadOnly);
        };

        // Install prompts
        const onlineRoomUpdates = (allowEdit, roomData, updateTokens = true) => {
          if (!allowEdit) return;

          // First dialogue
          if (
            roomData.firstDialogue !== null &&
            roomData.firstDialogue !== tinyAi.getFirstDialogue()
          )
            tinyAi.setFirstDialogue(roomData.firstDialogue);

          // Prompt
          if (roomData.prompt !== null && roomData.prompt !== tinyAi.getPrompt())
            tinyAi.setPrompt(roomData.prompt, 0);

          // System Instruction
          if (
            roomData.systemInstruction !== null &&
            roomData.systemInstruction !== tinyAi.getSystemInstruction()
          )
            tinyAi.setSystemInstruction(roomData.systemInstruction, 0);

          // Ai Config
          if (
            roomData.frequencyPenalty !== null &&
            roomData.frequencyPenalty !== tinyAi.getFrequencyPenalty()
          )
            tinyAi.setFrequencyPenalty(roomData.frequencyPenalty);
          if (
            roomData.presencePenalty !== null &&
            roomData.presencePenalty !== tinyAi.getPresencePenalty()
          )
            tinyAi.setPresencePenalty(roomData.presencePenalty);

          if (
            roomData.maxOutputTokens !== null &&
            roomData.maxOutputTokens !== tinyAi.getMaxOutputTokens()
          )
            tinyAi.setMaxOutputTokens(roomData.maxOutputTokens);
          if (roomData.model !== null && roomData.model !== tinyAi.getModel())
            tinyAi.setModel(roomData.model);

          if (roomData.temperature !== null && roomData.temperature !== tinyAi.getTemperature())
            tinyAi.setTemperature(roomData.temperature);
          if (roomData.topK !== null && roomData.topK !== tinyAi.getTopK())
            tinyAi.setTopK(roomData.topK);
          if (roomData.topP !== null && roomData.topP !== tinyAi.getTopP())
            tinyAi.setTopP(roomData.topP);

          if (roomData.model === null) modelSelector.setVal('');

          // Update tokens
          updateReadOnlyMode(roomData);
          if (updateTokens) updateAiTokenCounterData();
        };

        // Install Room data
        const onlineRoomDataUpdates = (allowEdit, roomData, updateTokens = true) => {
          if (!allowEdit) return;
          const { public: tinyRpgData, private: tinyRpgPrivateData } = roomData;

          // RPG Data
          if (isJsonObject(tinyRpgData)) {
            rpgData.data.public.setValue(rpgData.filter(tinyRpgData));
            rpgData.setAllowAiUse(tinyRpgData.allowAiUse, 'public');
            rpgData.setAllowAiSchemaUse(tinyRpgData.allowAiSchemaUse, 'public');
          }

          // Private Rpg Data
          if (isJsonObject(tinyRpgPrivateData)) {
            rpgData.data.private.setValue(rpgData.filter(tinyRpgPrivateData));
            rpgData.setAllowAiUse(tinyRpgPrivateData.allowAiUse, 'private');
            rpgData.setAllowAiSchemaUse(tinyRpgPrivateData.allowAiSchemaUse, 'private');
          }

          // Update tokens
          if (updateTokens) updateAiTokenCounterData();
        };

        rpgData.on('save', (result) => {
          const resultHash = objHash(result.data);

          if (
            (result.type === 'public' && resultHash !== objHash(tinyIo.client.getRoomData())) ||
            (result.type === 'private' &&
              resultHash !== objHash(tinyIo.client.getRoomPrivateData()))
          ) {
            tinyIo.client.updateRoomData(result.data, result.type === 'private');
          }
        });

        client.on('roomUpdates', (roomData) => onlineRoomUpdates(true, roomData));
        client.on('roomDataUpdates', (roomData) => {
          const finalData = {};
          if (roomData.isPrivate) finalData.private = roomData.values;
          else finalData.public = roomData.values;
          onlineRoomDataUpdates(true, finalData);
        });

        // User Update
        const updateIsMod = (isMod, isAdmin = false) => {
          userStatus.room.isAdmin = isAdmin;
          userStatus.room.isMod = isMod;
          container.toggleClass('is-room-admin', isAdmin);
          container.toggleClass('is-room-mod', isMod);

          userStatus.isMod = userStatus.room.isMod || userStatus.server.isMod;
          userStatus.isAdmin = userStatus.room.isAdmin || userStatus.server.isAdmin;

          rpgPrivateButton.toggleClass('d-none', !userStatus.isAdmin);

          createAccountButton?.toggleClass(
            'd-none',
            !userStatus.server.isAdmin && !client.getRateLimit()?.openRegistration,
          );

          if (!tinyAiScript.noai) {
            sidebarRight.toggleClass('d-none', !userStatus.isAdmin);
            sidebarRight.toggleClass('d-md-block', userStatus.isAdmin);
          }
          updateReadOnlyMode(tinyIo.client.getRoom());
        };

        client.on('roomModChange', (type, userId) => {
          if (userId === client.getUserId() && (type === 'add' || type === 'remove')) {
            updateIsMod(type === 'add');
          }
        });

        client.on('roomEnter', () => {
          clearIsLoadingMsgs();
          const user = client.getUser();
          const room = client.getRoom();
          const userId = client.getUserId();

          userStatus.server.isAdmin = user.isAdmin;
          userStatus.server.isMod = user.isMod;

          container.toggleClass('is-admin', user.isAdmin);
          container.toggleClass('is-mod', user.isMod);
          updateIsMod(client.getMods().indexOf(userId) > -1, room.ownerId === userId);
        });

        // Connected
        let msgChecker = null;

        // Connection
        client.on('connect', (connectionId) => {
          clearIsLoadingMsgs();
          msgChecker = setInterval(() => {
            const msgs = new TinyHtml(chatContainer.find('.ai-chat-data'));
            msgs.forEach((elem) => elem.data('tiny-ai-cache')?.update());
          }, 1000);

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

        // Login progress
        client.on('login', (result) => {
          clearIsLoadingMsgs();
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

        // Error
        client.on('roomError', (result) => {
          clearIsLoadingMsgs();
          sendSocketError(result);
          loaderScreen.stop();
        });

        // Not found
        client.on('roomNotFound', () => {
          clearIsLoadingMsgs();
          makeTempMessage('The room was not found', rpgCfg.ip);
          loaderScreen.stop();
        });

        // Room Loaded
        client.on('roomJoinned', (result) => {
          clearIsLoadingMsgs();
          // Update Fic Cache
          if (isFirstFicCache)
            contentEnabler.once('ficCacheLoaded', (isFirstFicCache) => {
              onlineRoomUpdates(isFirstFicCache, tinyIo.client.getRoom(), false);
              onlineRoomDataUpdates(
                isFirstFicCache,
                {
                  public: tinyIo.client.getRoomData(),
                  private: tinyIo.client.getRoomPrivateData(),
                },
                false,
              );
              updateAiTokenCounterData();
            });
          else {
            onlineRoomUpdates(true, tinyIo.client.getRoom(), false);
            onlineRoomDataUpdates(
              true,
              {
                public: tinyIo.client.getRoomData(),
                private: tinyIo.client.getRoomPrivateData(),
              },
              false,
            );
            updateAiTokenCounterData();
          }

          makeTempMessage(`You successfully entered the room **${result.roomId}**!`, rpgCfg.ip);
          loaderScreen.stop();
          isLoadingMsgs = true;
          const startMsgSystem = async () => {
            let msgCount = 0;
            let isError = false;
            const loadCfg = { page: 1 };
            if (!tinyAiScript.mpClient || client.getRateLimit().loadAllHistory)
              loadCfg.perPage = null;

            await client
              .loadMessages(loadCfg)
              .then((result) => {
                if (!isLoadingMsgs) {
                  isError = true;
                  return;
                }
                isLoadingMsgs = false;
                if (result.error) {
                  alert(result.msg, 'ERROR!');
                  isError = true;
                  return;
                }

                tinyAi.resetContentData();
                clearMessages();
                msgCount = result.messages.length;
                for (const msg of result.messages) addNewMsg(msg, msg.historyId);
              })
              .catch((err) => {
                isError = true;
                if (!isLoadingMsgs) return;
                isLoadingMsgs = false;
                alert(err.message, 'ERROR!');
                console.error(err);
              });

            if (isError) return;
            enabledFirstDialogue(msgCount < 1);
            updateAiTokenCounterData();
          };
          startMsgSystem();
        });

        // Disconnected
        client.on('disconnect', (reason, details) => {
          if (msgChecker) {
            clearInterval(msgChecker);
            msgChecker = null;
          }

          // Offline!
          onlineStatus.icon.addClass('text-danger').removeClass('text-success');
          onlineStatus.text.setText('Offline');
          onlineStatus.id.empty();

          // Message
          makeTempMessage(
            `You are disconected${isJsonObject(details) && typeof details.description === 'string' ? ` (${details.description})` : ''}${typeof reason === 'string' ? `: ${reason}` : ''}`,
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
        const addNewMsg = (msgData, msgId) => {
          const role = msgData.isModel ? 'model' : 'user';
          const sentId = tinyAi.addData(
            tinyAi.buildContents(null, { role, parts: [{ text: msgData.text }] }, role),
            { count: msgData.tokens, msgId },
          );

          addMessage(
            makeMessage(
              {
                message: msgData.text,
                date: msgData.date,
                id: sentId,
                msgId,
                chapter: msgData.chapter,
                edited: msgData.edited,
              },
              !msgData.isModel ? msgData.userId : 'Model',
            ),
          );
        };

        client.on('newMessage', (msgData) => {
          addNewMsg(msgData, msgData.id);
          updateAiTokenCounterData();
        });

        client.on('messageDelete', (msgData) => {
          const html = new TinyHtml(
            `#ai-element-root #ai-chatbox .ai-chat-data[msgid="${msgData.id}"]`,
          );
          if (html.size < 1) return;
          const cfg = html.data('tiny-ai-cache');
          if (cfg) cfg.remove();
        });

        client.on('messageEdit', (msgData) => {
          const html = new TinyHtml(
            `#ai-element-root #ai-chatbox .ai-chat-data[msgid="${msgData.id}"]`,
          );
          if (html.size < 1) return;
          const cfg = html.data('tiny-ai-cache');
          if (!cfg) return;
          cfg.edited = msgData.edited;
          cfg.date = msgData.date;
          cfg.msg = msgData.text;

          const newContent = tinyAi.getMsgById(cfg.dataid);
          newContent.parts[0].text = msgData.text;

          tinyAi.replaceIndex(tinyAi.getIndexOfId(cfg.dataid), newContent, {
            count: msgData.tokens,
            msgId: msgData.id,
          });

          cfg.update();
          cfg.updateText();
        });

        // User Status
        client.on('userLeft', (data) => {
          const isYou = data.userId === client.getUserId();
          // You was kicked
          if (isYou) return client.disconnect();
          updateReadOnlyMode(tinyIo.client.getRoom());

          const text = `${!isYou ? (data?.data.nickname ?? data.userId) : 'You'} left the room.`;

          if (body.hasClass('windowVisible')) tinyToast.show(text);
          if (body.hasClass('windowHidden')) tinyNotification.send('User', { body: text });
        });

        client.on('userJoined', (data) => {
          const isYou = data.userId === client.getUserId();
          updateReadOnlyMode(tinyIo.client.getRoom());

          const text = `${!isYou ? (data?.data.nickname ?? data.userId) : 'You'} joined the room.`;

          if (body.hasClass('windowVisible')) tinyToast.show(text);
          if (body.hasClass('windowHidden')) tinyNotification.send('User', { body: text });
        });

        // Dice roll
        client.on('diceRoll', (data) => openDiceSpecialModal(data));
      }

      // No server
      if (!socket)
        makeTempMessage('No server has been detected. Your session is cancelled!', rpgCfg.ip);
      else if (!tinyAiScript.mpClient) return;
    }
  }

  // TITLE: Load backup
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
      const tokens = isJsonObject(item.tokens) ? item.tokens : { count: null };
      if (typeof tokens.count !== 'number') tokens.count = null;
      file.tokens.data.push(tokens);
      // Insert data
      if (isJsonObject(item.data)) file.data.push(item.data);
    });

    // Import data
    for (const item in sessions) await importFileSession(sessions[item]);
  }

  // Finished
  await tinyNotification.requestPerm();
  loaderScreen.stop();
};
