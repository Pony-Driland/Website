class EnablerAiContent {
  #validateMultiplayer;
  #enabledFirstDialogue;
  constructor() {}

  setResetSettingsButton(resetSettingsButton) {
    this.resetSettingsButton = resetSettingsButton;
  }

  setTemperature(temperature) {
    this.temperature = temperature;
  }

  setTopP(topP) {
    this.topP = topP;
  }

  setTopK(topK) {
    this.topK = topK;
  }

  setPresencePenalty(presencePenalty) {
    this.presencePenalty = presencePenalty;
  }

  setFrequencyPenalty(frequencyPenalty) {
    this.frequencyPenalty = frequencyPenalty;
  }

  setOutputLength(outputLength) {
    this.outputLength = outputLength;
  }

  setRpgData(rpgData) {
    this.rpgData = rpgData;
  }

  setFicPromptItems(ficPromptItems) {
    this.ficPromptItems = ficPromptItems;
  }

  setChatContainer(chatContainer) {
    this.chatContainer = chatContainer;
  }

  setMsgSubmit(msgSubmit) {
    this.msgSubmit = msgSubmit;
  }

  setMsgInput(msgInput) {
    this.msgInput = msgInput;
  }

  setCancelSubmit(cancelSubmit) {
    this.cancelSubmit = cancelSubmit;
  }

  setSubmitCache(submitCache) {
    this.submitCache = submitCache;
  }

  setFicResets(ficResets) {
    this.ficResets = ficResets;
  }

  setFicTemplates(ficTemplates) {
    this.ficTemplates = ficTemplates;
  }

  setImportItems(importItems) {
    this.importItems = importItems;
  }

  setModelSelector(modelSelector) {
    this.modelSelector = modelSelector;
  }

  setValidateMultiplayer(validateMultiplayer) {
    this.#validateMultiplayer = validateMultiplayer;
  }

  setEnabledFirstDialogue(enabledFirstDialogue) {
    this.#enabledFirstDialogue = enabledFirstDialogue;
  }

  #readOnlyTemplate(item, value, needAi = true) {
    const isEnabled = this.#validateMultiplayer(value, needAi);
    item.prop('disabled', isEnabled);
    if (isEnabled) {
      item.addClass('disabled');
    } else {
      item.removeClass('disabled');
    }
  }

  #enableModelReadOnly(value = true) {
    const isEnabled = this.#validateMultiplayer(value);
    this.outputLength.prop('disabled', isEnabled);
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

  enModel() {
    this.#enableModelReadOnly(false);
  }

  deModel() {
    this.#enableModelReadOnly(true);
  }

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
      this.ficPromptItems[index].prop('disabled', isDisabled);
      if (isDisabled) this.ficPromptItems[index].addClass('disabled');
      else this.ficPromptItems[index].removeClass('disabled');
    }
    // First dialogue script
    this.#enabledFirstDialogue(!isDisabled);
  }

  enPromptButtons() {
    this.#disablePromptButtons(false);
  }

  dePromptButtons() {
    this.#disablePromptButtons(true);
  }

  #enableMessageButtons(value = true) {
    const isEnabled = this.#validateMultiplayer(value, false);
    if (isEnabled) this.chatContainer.removeClass('hide-msg-buttons');
    else this.chatContainer.addClass('hide-msg-buttons');
  }

  enMessageButtons() {
    this.#enableMessageButtons(true);
  }

  deMessageButtons() {
    this.#enableMessageButtons(false);
  }

  #enableReadOnly(isEnabled = true, controller = null) {
    this.#readOnlyTemplate(this.msgSubmit, isEnabled, false);
    this.#readOnlyTemplate(this.msgInput, isEnabled, false);
    this.#readOnlyTemplate(this.cancelSubmit, !isEnabled || !controller, false);
    if (controller) {
      this.msgSubmit.addClass('d-none');
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
      this.cancelSubmit.addClass('d-none');
      this.cancelSubmit.off('click');
    }
  }

  enBase(controller) {
    this.#enableReadOnly(false, controller);
  }

  deBase(controller) {
    this.#enableReadOnly(true, controller);
  }

  #modelChangerReadOnly(isEnabled = true) {
    for (const index in this.ficResets)
      this.#readOnlyTemplate(this.ficResets[index], isEnabled, false);
    for (const index in this.ficTemplates)
      this.#readOnlyTemplate(this.ficTemplates[index], isEnabled, false);
    for (const index in this.importItems)
      this.#readOnlyTemplate(this.importItems[index], isEnabled, false);
  }

  enModelChanger() {
    this.#modelChangerReadOnly(false);
  }

  deModelChanger() {
    this.#modelChangerReadOnly(true);
  }

  #enableModelSelectorReadOnly(value = true) {
    const isEnabled = this.#validateMultiplayer(value);
    this.modelSelector.prop('disabled', isEnabled);
    if (isEnabled) this.modelSelector.addClass('disabled');
    else this.modelSelector.removeClass('disabled');
  }

  enModelSelector() {
    this.#enableModelSelectorReadOnly(false);
  }

  deModelSelector() {
    this.#enableModelSelectorReadOnly(true);
  }
}
