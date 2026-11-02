import { EventEmitter } from 'events';
import { alert } from 'tiny-essentials/webTemplates/bootstrap/5.3/html/BootstrapDialogs';
import { tinyIo, tinyStorage } from './base.mjs';
import RpgData from './rpgData.mjs';

/**
 * Used to detect if you're online in a server
 * @returns {boolean}
 */
export const isOnline = () => (!noOnlineMode() && tinyIo.client ? true : false);

/**
 * Used to detect if you're in a server
 * @returns {boolean}
 */
export const noOnlineMode = () => {
  return (
    contentEnabler.rpgCfg &&
    (typeof contentEnabler.rpgCfg.ip !== 'string' || contentEnabler.rpgCfg.ip.length < 1)
  );
};

/**
 * Central registry for every interactive control of the AI page.
 *
 * The AI page is built in two steps: `aiSoftware.mjs` creates the DOM nodes and
 * registers them here, then this class toggles their enabled/disabled state as
 * the session changes (loading, streaming, multiplayer read-only mode, ...).
 *
 * @extends EventEmitter
 */
class EnablerAiContent extends EventEmitter {
  #validateMultiplayer;
  #enabledFirstDialogue;

  /** @type {undefined|RpgData} */
  rpgData;

  constructor() {
    super();
  }

  /////////////////////////////////////////////////

  /**
   * Loads the provider config of the selected AI and stores it on the instance.
   *
   * @returns {Object} The provider configuration object.
   */
  setRpgCfg() {
    this.rpgCfg = tinyStorage.getApiKey(tinyStorage.selectedAi()) || {};
    return this.rpgCfg;
  }

  /**
   * @param {*} resetSettingsButton - "Reset default settings" button.
   * @returns {void}
   */
  setResetSettingsButton(resetSettingsButton) {
    this.resetSettingsButton = resetSettingsButton;
  }

  /**
   * @param {*} temperature - Temperature ranger control.
   * @returns {void}
   */
  setTemperature(temperature) {
    this.temperature = temperature;
  }

  /**
   * @param {*} topP - Top-P ranger control.
   * @returns {void}
   */
  setTopP(topP) {
    this.topP = topP;
  }

  /**
   * @param {*} topK - Top-K ranger control.
   * @returns {void}
   */
  setTopK(topK) {
    this.topK = topK;
  }

  /**
   * @param {*} presencePenalty - Presence penalty ranger control.
   * @returns {void}
   */
  setPresencePenalty(presencePenalty) {
    this.presencePenalty = presencePenalty;
  }

  /**
   * @param {*} frequencyPenalty - Frequency penalty ranger control.
   * @returns {void}
   */
  setFrequencyPenalty(frequencyPenalty) {
    this.frequencyPenalty = frequencyPenalty;
  }

  /**
   * @param {*} outputLength - Max output tokens input.
   * @returns {void}
   */
  setOutputLength(outputLength) {
    this.outputLength = outputLength;
  }

  /**
   * @param {RpgData} rpgData - RPG data store bound to the current session.
   * @returns {void}
   */
  setRpgData(rpgData) {
    this.rpgData = rpgData;
  }

  /**
   * @param {Array<*>} ficPromptItems - Prompt editor buttons (instructions, prompt, first dialogue).
   * @returns {void}
   */
  setFicPromptItems(ficPromptItems) {
    this.ficPromptItems = ficPromptItems;
  }

  /**
   * @param {*} chatContainer - Scrollable chat container.
   * @returns {void}
   */
  setChatContainer(chatContainer) {
    this.chatContainer = chatContainer;
  }

  /**
   * @param {*} msgSubmit - Send button.
   * @returns {void}
   */
  setMsgSubmit(msgSubmit) {
    this.msgSubmit = msgSubmit;
  }

  /**
   * @param {*} msgInput - Message textarea.
   * @returns {void}
   */
  setMsgInput(msgInput) {
    this.msgInput = msgInput;
  }

  /**
   * @param {*} cancelSubmit - Cancel generation button.
   * @returns {void}
   */
  setCancelSubmit(cancelSubmit) {
    this.cancelSubmit = cancelSubmit;
  }

  /**
   * @param {*} aiSubmit - AI submit button.
   * @returns {void}
   */
  setAiSubmit(aiSubmit) {
    this.aiSubmit = aiSubmit;
  }

  /**
   * @param {*} submitCache - Cache describing the in-flight submission.
   * @returns {void}
   */
  setSubmitCache(submitCache) {
    this.submitCache = submitCache;
  }

  /**
   * @param {Array<*>} ficResets - Reset buttons of the sidebar.
   * @returns {void}
   */
  setFicResets(ficResets) {
    this.ficResets = ficResets;
  }

  /**
   * @param {Array<*>} ficTemplates - Fic preset buttons.
   * @returns {void}
   */
  setFicTemplates(ficTemplates) {
    this.ficTemplates = ficTemplates;
  }

  /**
   * @param {Array<*>} importItems - Import buttons.
   * @returns {void}
   */
  setImportItems(importItems) {
    this.importItems = importItems;
  }

  /**
   * @param {*} modelSelector - AI model `<select>` element.
   * @returns {void}
   */
  setModelSelector(modelSelector) {
    this.modelSelector = modelSelector;
  }

  /**
   * @param {Function} validateMultiplayer - Predicate telling whether the control must be locked.
   * @returns {void}
   */
  setValidateMultiplayer(validateMultiplayer) {
    this.#validateMultiplayer = validateMultiplayer;
  }

  /**
   * @param {Function} enabledFirstDialogue - Toggles the "First Dialogue" button.
   * @returns {void}
   */
  setEnabledFirstDialogue(enabledFirstDialogue) {
    this.#enabledFirstDialogue = enabledFirstDialogue;
  }

  /**
   * @param {Array<*>} rpgContentButtons - "View Data" / "View Private" buttons.
   * @returns {void}
   */
  setRpgContentButton(rpgContentButtons) {
    this.rpgContentButtons = rpgContentButtons;
  }

  ////////////////////////////////////////////////////////////

  /**
   * Applies the read-only state to a single control.
   *
   * @param {Object} item - Control to update.
   * @param {*} value - Value forwarded to the multiplayer validator.
   * @param {boolean} [needAi=true] - Whether the control requires an AI provider.
   * @param {boolean} [allowMulti=false] - Whether the control stays enabled in multiplayer.
   * @returns {void}
   */
  #readOnlyTemplate(item, value, needAi = true, allowMulti = false) {
    const isEnabled = this.#validateMultiplayer(value, needAi, allowMulti);
    item.toggleProp('disabled', isEnabled);
    if (isEnabled) {
      item.addClass('disabled');
    } else {
      item.removeClass('disabled');
    }
  }

  //////////////////////////////////////////////////////////

  /**
   * Initializes the RPG data store and syncs the AI usage flags from it.
   *
   * @returns {Promise<void>}
   */
  async initRpgData() {
    await this.rpgData.init();
    const tinyRpgData = this.rpgData.data.public.getValue();
    const tinyRpgPrivateData = this.rpgData.data.private.getValue();
    if (tinyRpgData) {
      this.rpgData.setAllowAiUse(tinyRpgData.allowAiUse, 'public');
      this.rpgData.setAllowAiSchemaUse(tinyRpgData.allowAiSchemaUse, 'public');
    }
    if (tinyRpgPrivateData) {
      this.rpgData.setAllowAiUse(tinyRpgPrivateData.allowAiUse, 'private');
      this.rpgData.setAllowAiSchemaUse(tinyRpgPrivateData.allowAiSchemaUse, 'private');
    }
  }

  //////////////////////////////////////////////////////////

  /**
   * Disables the RPG data viewer buttons.
   *
   * @returns {void}
   */
  deRpgContent() {
    this.rpgContentButtons.forEach((item) => {
      item.addClass('disabled').addProp('disabled');
    });
  }

  /**
   * Enables the RPG data viewer buttons.
   *
   * @returns {void}
   */
  enRpgContent() {
    this.rpgContentButtons.forEach((item) => {
      item.removeClass('disabled').removeProp('disabled');
    });
  }

  //////////////////////////////////////////////////////////

  /**
   * Locks or unlocks every model setting control.
   *
   * @param {boolean} [value=true] - `true` to lock the controls.
   * @returns {void}
   */
  #enableModelReadOnly(value = true) {
    const isEnabled = this.#validateMultiplayer(value);
    this.outputLength.toggleProp('disabled', isEnabled);
    this.#enableModelSelectorReadOnly(isEnabled);

    const validateChange = (where) =>
      this[where][isEnabled || this[where].valString2().trim().length < 1 ? 'disable' : 'enable']();

    validateChange('temperature');
    validateChange('topP');
    validateChange('topK');
    validateChange('presencePenalty');
    validateChange('frequencyPenalty');

    if (isEnabled) {
      this.outputLength.addClass('disabled');
      this.resetSettingsButton.addClass('disabled');
    } else {
      this.outputLength.removeClass('disabled');
      this.resetSettingsButton.removeClass('disabled');
    }
  }

  /**
   * Unlocks the model settings controls.
   *
   * @returns {void}
   */
  enModel() {
    this.#enableModelReadOnly(false);
  }

  /**
   * Locks the model settings controls.
   *
   * @returns {void}
   */
  deModel() {
    this.#enableModelReadOnly(true);
  }

  //////////////////////////////////////////////

  /**
   * Locks or unlocks the prompt editors and the RPG data editors.
   *
   * @param {boolean} [value=false] - `true` to lock the controls.
   * @returns {void}
   */
  #disablePromptButtons(value = false) {
    const isDisabled = this.#validateMultiplayer(value, false);
    // Execute disable script
    for (const item in this.rpgData.ready) {
      if (this.rpgData.ready[item]) {
        if (isDisabled) this.rpgData.data[item].disable();
        else this.rpgData.data[item].enable();
      }
    }

    for (const index in this.ficPromptItems) {
      this.ficPromptItems[index].toggleProp('disabled', value);
      if (value) this.ficPromptItems[index].addClass('disabled');
      else this.ficPromptItems[index].removeClass('disabled');
    }
    // First dialogue script
    this.#enabledFirstDialogue(!isDisabled);
  }

  /**
   * Unlocks the prompt editors.
   *
   * @returns {void}
   */
  enPromptButtons() {
    this.#disablePromptButtons(false);
  }

  /**
   * Locks the prompt editors.
   *
   * @returns {void}
   */
  dePromptButtons() {
    this.#disablePromptButtons(true);
  }

  //////////////////////////////////////////////

  /**
   * Shows or hides the per-message action buttons.
   *
   * @param {boolean} [value=true] - `true` to show the buttons.
   * @returns {void}
   */
  #enableMessageButtons(value = true) {
    const isEnabled = this.#validateMultiplayer(value, false);
    if (isEnabled) this.chatContainer.removeClass('hide-msg-buttons');
    else this.chatContainer.addClass('hide-msg-buttons');
  }

  /**
   * Shows the per-message action buttons.
   *
   * @returns {void}
   */
  enMessageButtons() {
    this.#enableMessageButtons(true);
  }

  /**
   * Hides the per-message action buttons.
   *
   * @returns {void}
   */
  deMessageButtons() {
    this.#enableMessageButtons(false);
  }

  ////////////////////////////////////////////////////////////

  /**
   * Locks or unlocks the message composer.
   *
   * @param {boolean} [isEnabled=true] - `true` to lock the composer.
   * @param {AbortController|null} [controller=null] - Controller used to cancel the running request.
   * @returns {void}
   */
  #enableReadOnly(isEnabled = true, controller = null) {
    this.#readOnlyTemplate(this.msgSubmit, isEnabled, false, true);
    this.#readOnlyTemplate(this.msgInput, isEnabled, false, true);
    this.#readOnlyTemplate(this.aiSubmit, isEnabled, false, true);
    this.#readOnlyTemplate(this.cancelSubmit, !isEnabled || !controller, false);
    if (controller) {
      this.msgSubmit.addClass('d-none');
      this.aiSubmit.addClass('d-none');
      this.cancelSubmit.removeClass('d-none');
      this.cancelSubmit.on('click', () => {
        enableReadOnly(false);
        enableMessageButtons(true);
        try {
          if (this.submitCache.cancel) this.submitCache.cancel();
          controller.abort();
        } catch (err) {
          console.error(err);
          alert(err.message);
        }
      });
    } else {
      this.msgSubmit.removeClass('d-none');
      this.aiSubmit.removeClass('d-none');
      this.cancelSubmit.addClass('d-none');
      this.cancelSubmit.off('click');
    }
  }

  /**
   * Unlocks the message composer.
   *
   * @param {AbortController} [controller] - Controller bound to the running request.
   * @returns {void}
   */
  enBase(controller) {
    this.#enableReadOnly(false, controller);
  }

  /**
   * Locks the message composer.
   *
   * @param {AbortController} [controller] - Controller bound to the running request.
   * @returns {void}
   */
  deBase(controller) {
    this.#enableReadOnly(true, controller);
  }

  ///////////////////////////////////////////////////////

  /**
   * Locks or unlocks the sidebar buttons that swap the active session.
   *
   * @param {boolean} [isEnabled=true] - `true` to lock the buttons.
   * @returns {void}
   */
  #modelChangerReadOnly(isEnabled = true) {
    for (const index in this.ficResets)
      this.#readOnlyTemplate(this.ficResets[index], isEnabled, false);
    for (const index in this.ficTemplates)
      this.#readOnlyTemplate(this.ficTemplates[index], isEnabled, false);
    for (const index in this.importItems)
      this.#readOnlyTemplate(this.importItems[index], isEnabled, false);
  }

  /**
   * Unlocks the session switcher buttons.
   *
   * @returns {void}
   */
  enModelChanger() {
    this.#modelChangerReadOnly(false);
  }

  /**
   * Locks the session switcher buttons.
   *
   * @returns {void}
   */
  deModelChanger() {
    this.#modelChangerReadOnly(true);
  }

  ///////////////////////////////////////////////////////

  /**
   * Locks or unlocks the model `<select>`.
   *
   * @param {boolean} [value=true] - `true` to lock the selector.
   * @returns {void}
   */
  #enableModelSelectorReadOnly(value = true) {
    const isEnabled = this.#validateMultiplayer(value);
    this.modelSelector.toggleProp('disabled', isEnabled);
    if (isEnabled) this.modelSelector.addClass('disabled');
    else this.modelSelector.removeClass('disabled');
  }

  /**
   * Unlocks the model selector.
   *
   * @returns {void}
   */
  enModelSelector() {
    this.#enableModelSelectorReadOnly(false);
  }

  /**
   * Locks the model selector.
   *
   * @returns {void}
   */
  deModelSelector() {
    this.#enableModelSelectorReadOnly(true);
  }
}

/**
 * Singleton used across the AI page to toggle the enabled state of the UI.
 */
export const contentEnabler = new EnablerAiContent();
