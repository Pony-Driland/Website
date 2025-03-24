class TinyAiApi extends EventEmitter {
  #_apiKey;
  #_getModels;
  #_countTokens;
  #_genContentApi;
  #_historyIds;
  #_selectedHistory;
  #_partTypes;
  #_insertIntoHistory;

  constructor() {
    super();
    // Config
    this.#_apiKey = null;
    this._errorCode = null;

    // History
    this.#_selectedHistory = null;
    this.history = {};
    this.#_historyIds = 0;

    // Models
    this.models = [];
    this._nextModelsPageToken = null;

    // Functions
    this.#_genContentApi = null;
    this.#_getModels = null;

    this.#_insertIntoHistory = function (id, data) {
      if (typeof id === 'string' && this.history[id]) {
        for (const where in data) {
          this.history[id][where] = data[where];
        }
        return true;
      }
      return false;
    };

    // Build Parts
    this.#_partTypes = {
      text: (text) => (typeof text === 'string' ? text : null),
      inlineData: (data) => {
        if (typeof data.mime_type === 'string' && typeof data.data === 'string') return data;
        return null;
      },
    };
  }

  // Config
  setMaxOutputTokens(value, id) {
    if (typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value)) {
      this.#_insertIntoHistory(id || this.getId(), { maxOutputTokens: value });
      this.emit('setMaxOutputTokens', value, id);
      return;
    }
    throw new Error('Invalid number value!');
  }

  getMaxOutputTokens(id) {
    const history = this.getData(id);
    return history && typeof history.maxOutputTokens === 'number' ? history.maxOutputTokens : null;
  }

  setTemperature(value, id) {
    if (typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value)) {
      this.#_insertIntoHistory(id || this.getId(), { temperature: value });
      this.emit('setTemperature', value, id);
      return;
    }
    throw new Error('Invalid number value!');
  }

  getTemperature(id) {
    const history = this.getData(id);
    return history && typeof history.temperature ? history.temperature : null;
  }

  setTopP(value, id) {
    if (typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value)) {
      this.#_insertIntoHistory(id || this.getId(), { topP: value });
      this.emit('setTopP', value, id);
      return;
    }
    throw new Error('Invalid number value!');
  }

  getTopP(id) {
    const history = this.getData(id);
    return history && typeof history.topP === 'number' ? history.topP : null;
  }

  setTopK(value, id) {
    if (typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value)) {
      this.#_insertIntoHistory(id || this.getId(), { topK: value });
      this.emit('setTopK', value, id);
      return;
    }
    throw new Error('Invalid number value!');
  }

  getTopK(id) {
    const history = this.getData(id);
    return history && typeof history.topK === 'number' ? history.topK : null;
  }

  setPresencePenalty(value, id) {
    if (typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value)) {
      this.#_insertIntoHistory(id || this.getId(), { presencePenalty: value });
      this.emit('setPresencePenalty', value, id);
      return;
    }
    throw new Error('Invalid number value!');
  }

  getPresencePenalty(id) {
    const history = this.getData(id);
    return history && typeof history.presencePenalty === 'number' ? history.presencePenalty : null;
  }

  setFrequencyPenalty(value, id) {
    if (typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value)) {
      this.#_insertIntoHistory(id || this.getId(), { frequencyPenalty: value });
      this.emit('setFrequencyPenalty', value, id);
      return;
    }
    throw new Error('Invalid number value!');
  }

  getFrequencyPenalty(id) {
    const history = this.getData(id);
    return history && typeof history.frequencyPenalty === 'number'
      ? history.frequencyPenalty
      : null;
  }

  setEnabledEnchancedCivicAnswers(value, id) {
    if (typeof value === 'boolean') {
      this.#_insertIntoHistory(id || this.getId(), { enableEnhancedCivicAnswers: value });
      this.emit('setEnabledEnchancedCivicAnswers', value, id);
      return;
    }
    throw new Error('Invalid boolean value!');
  }

  isEnabledEnchancedCivicAnswers(id) {
    const history = this.getData(id);
    return history && typeof history.enableEnhancedCivicAnswers === 'boolean'
      ? history.enableEnhancedCivicAnswers
      : null;
  }

  // Model
  setModel(data, id) {
    const model = typeof data === 'string' ? data : null;
    this.#_insertIntoHistory(id || this.getId(), { model });
    this.emit('setModel', model, id);
  }

  getModel(id) {
    const history = this.getData(id);
    return history && typeof history.model === 'string' ? history.model : null;
  }

  // Builder
  buildContents(contents, item, role) {
    // Content Data
    const tinyThis = this;
    const contentData = { parts: [] };

    // Role
    if (typeof role === 'string') contentData.role = role;

    // Parts
    const insertPart = (content) => {
      const tinyResult = {};
      for (const valName in content) {
        if (typeof tinyThis.#_partTypes[valName] === 'function')
          tinyResult[valName] = tinyThis.#_partTypes[valName](content[valName]);
      }
      contentData.parts.push(tinyResult);
    };

    if (Array.isArray(item.parts)) {
      for (const index in item.parts) insertPart(item.parts[index]);
    } else if (item.content) insertPart(item.content);

    // Complete
    if (contents) return contents.push(contentData);
    return contentData;
  }

  // API Key
  setApiKey(apiKey) {
    this.#_apiKey = typeof apiKey === 'string' ? apiKey : null;
  }

  // Models
  _setNextModelsPageToken(nextModelsPageToken) {
    this._nextModelsPageToken =
      typeof nextModelsPageToken === 'string' ? nextModelsPageToken : null;
  }

  _setGetModels(getModels) {
    this.#_getModels = typeof getModels === 'function' ? getModels : null;
  }

  getModels(pageSize = 50, pageToken = null) {
    if (typeof this.#_getModels === 'function')
      return this.#_getModels(this.#_apiKey, pageSize, pageToken || this._nextModelsPageToken);
    throw new Error('No model list api script defined.');
  }

  getModelsList() {
    return this.models;
  }

  getModelData(id) {
    const model = this.models.find((item) => item.id === id);
    if (model) return model;
    else {
      for (const index in this.models) {
        if (this.models[index].category) {
          const modelCategory = this.models[index].data.find((item) => item.id === id);
          if (modelCategory) return modelCategory;
        }
      }
    }
    return null;
  }

  existsModel(id) {
    return this.getModelData(id) ? true : false;
  }

  // Insert model
  _insertNewModel(model) {
    if (this.models.findIndex((item) => item.id === model.id) < 0) {
      // Model data
      const newData = {
        _response: model._response,
        index: typeof model.index === 'number' ? model.index : 9999999,
        name: typeof model.name === 'string' ? model.name : null,
        id: typeof model.id === 'string' ? model.id : null,
        displayName: typeof model.displayName === 'string' ? model.displayName : null,
        version: typeof model.version === 'string' ? model.version : null,
        description: typeof model.description === 'string' ? model.description : null,
        inputTokenLimit: typeof model.inputTokenLimit === 'number' ? model.inputTokenLimit : null,
        outputTokenLimit:
          typeof model.outputTokenLimit === 'number' ? model.outputTokenLimit : null,
        temperature: typeof model.temperature === 'number' ? model.temperature : null,
        maxTemperature: typeof model.maxTemperature === 'number' ? model.maxTemperature : null,
        topP: typeof model.topP === 'number' ? model.topP : null,
        topK: typeof model.topK === 'number' ? model.topK : null,
      };

      // Supported generation methods
      if (Array.isArray(model.supportedGenerationMethods)) {
        newData.supportedGenerationMethods = [];
        for (const index in model.supportedGenerationMethods) {
          if (typeof model.supportedGenerationMethods[index] === 'string')
            newData.supportedGenerationMethods.push(model.supportedGenerationMethods[index]);
        }
      }

      // Is category
      if (
        model.category &&
        typeof model.category.id === 'string' &&
        typeof model.category.displayName === 'string' &&
        typeof model.category.index === 'number'
      ) {
        // Check category
        let category = this.models.find((item) => item.category === model.category.id);
        // Insert new category
        if (!category) {
          category = {
            category: model.category.id,
            displayName: model.category.displayName,
            index: model.category.index,
            data: [],
          };
          this.models.push(category);
        }

        // Complete and sort data
        category.data.push(newData);
        category.data.sort((a, b) => a.index - b.index);
      }

      // Normal mode
      else this.models.push(newData);

      // Sort data
      this.models.sort((a, b) => a.index - b.index);
      return newData;
    }
    return null;
  }

  // Count Token
  _setCountTokens(countTokens) {
    this.#_countTokens = typeof countTokens === 'function' ? countTokens : null;
  }

  countTokens(data, model, controller) {
    if (typeof this.#_countTokens === 'function')
      return this.#_countTokens(this.#_apiKey, model || this.getModel(), controller, data);
    throw new Error('No count token api script defined.');
  }

  // Error codes
  _setErrorCodes(errors) {
    this._errorCode = errors;
  }

  // Fetch API
  _setGenContent(callback) {
    this.#_genContentApi = typeof callback === 'function' ? callback : null;
  }

  genContent(data, model, controller, streamCallback) {
    if (typeof this.#_genContentApi === 'function')
      return this.#_genContentApi(
        this.#_apiKey,
        typeof streamCallback === 'function' ? true : false,
        data,
        model || this.getModel(),
        streamCallback,
        controller,
      );
    throw new Error('No content generator api script defined.');
  }

  // History
  selectDataId(id) {
    if (this.history[id]) {
      this.#_selectedHistory = id;
      this.emit('selectDataId', id);
      return true;
    }
    return false;
  }

  getId() {
    return this.#_selectedHistory;
  }

  getData(id) {
    return this.history[id || this.#_selectedHistory] || null;
  }

  getIndex(index, id) {
    const history = this.getData(id);
    if (history && history.data[index]) return history.data[index];
    return null;
  }

  getIndexById(msgId, id) {
    const history = this.getData(id);
    if (history) return history.ids.indexOf(msgId);
    return -1;
  }

  getDataIdByIndex(index, id) {
    const history = this.getData(id);
    if (history) return history.data[index] ? history.ids[index] : -1;
    return -1;
  }

  deleteIndex(index, id) {
    const history = this.getData(id);
    if (history && history.data[index]) {
      history.data.splice(index, 1);
      history.ids.splice(index, 1);
      this.emit('deleteIndex', index, id);
      return true;
    }
    return false;
  }

  replaceIndex(index, data, id) {
    const history = this.getData(id);
    if (history && history.data[index]) {
      history.data[index] = data;
      this.emit('replaceIndex', index, data, id);
      return true;
    }
    return false;
  }

  getLastIndex(id) {
    const history = this.getData(id);
    if (history && history.data[history.data.length - 1]) return history.data.length - 1;
    return -1;
  }

  getLastIndexData(id) {
    const history = this.getData(id);
    if (history && history.data[history.data.length - 1])
      return history.data[history.data.length - 1];
    return null;
  }

  existsFirstIndex(id) {
    const history = this.getData(id);
    if (history && history.data[0]) return true;
    return false;
  }

  getFirstIndexData(id) {
    const history = this.getData(id);
    if (history && history.data[0]) return history.data[0];
    return null;
  }

  addData(data, id) {
    const selectedId = id || this.#_selectedHistory;
    if (this.history[selectedId]) {
      const newId = this.#_historyIds;
      this.#_historyIds++;
      this.history[selectedId].data.push(data);
      this.history[selectedId].ids.push(newId);
      this.emit('addData', newId, data, selectedId);
      return newId;
    }
    throw new Error('Invalid history id data!');
  }

  setPrompt(promptData, id) {
    const selectedId = id || this.#_selectedHistory;
    if (this.history[selectedId] && typeof promptData === 'string') {
      this.history[selectedId].prompt = promptData;
      this.emit('setPrompt', promptData, selectedId);
      return;
    }
    throw new Error('Invalid history id data!');
  }

  getPrompt(id) {
    const selectedId = id || this.#_selectedHistory;
    if (
      this.history[selectedId] &&
      typeof this.history[selectedId].prompt === 'string' &&
      this.history[selectedId].prompt.length > 0
    ) {
      return this.history[selectedId].prompt;
    }
    return null;
  }

  setFirstDialogue(dialogue, id) {
    const selectedId = id || this.#_selectedHistory;
    if (this.history[selectedId] && typeof dialogue === 'string') {
      this.history[selectedId].firstDialogue = dialogue;
      this.emit('setFirstDialogue', dialogue, selectedId);
      return;
    }
    throw new Error('Invalid history id data!');
  }

  getFirstDialogue(id) {
    const selectedId = id || this.#_selectedHistory;
    if (
      this.history[selectedId] &&
      typeof this.history[selectedId].firstDialogue === 'string' &&
      this.history[selectedId].firstDialogue.length > 0
    ) {
      return this.history[selectedId].firstDialogue;
    }
    return null;
  }

  setFileData(mime, data, isBase64 = false, id) {
    const selectedId = id || this.#_selectedHistory;
    if (this.history[selectedId] && typeof data === 'string' && typeof mime === 'string') {
      this.history[selectedId].file = {
        mime,
        data: !isBase64 ? Base64.encode(data) : data,
      };
      this.emit('setFileData', this.history[selectedId].file, selectedId);
      return;
    }
    throw new Error('Invalid history id data!');
  }

  getFileData(id) {
    const selectedId = id || this.#_selectedHistory;
    if (
      this.history[selectedId] &&
      this.history[selectedId].file &&
      typeof this.history[selectedId].file.data === 'string' &&
      typeof this.history[selectedId].file.mime === 'string'
    ) {
      return this.history[selectedId].file;
    }
    return null;
  }

  setSystemInstruction(data, id) {
    const selectedId = id || this.#_selectedHistory;
    if (this.history[selectedId] && typeof data === 'string') {
      this.history[selectedId].systemInstruction = data;
      this.emit('setSystemInstruction', data, selectedId);
      return;
    }
    throw new Error('Invalid history id data!');
  }

  getSystemInstruction(id) {
    const selectedId = id || this.#_selectedHistory;
    if (
      this.history[selectedId] &&
      typeof this.history[selectedId].systemInstruction === 'string'
    ) {
      return this.history[selectedId].systemInstruction;
    }
    return null;
  }

  startDataId(id, selected = false) {
    this.history[id] = {
      data: [],
      ids: [],
      systemInstruction: null,
      model: null,
    };
    if (selected) this.selectDataId(id);
    this.emit('startDataId', this.history[id], id, selected ? true : false);
    return this.history[id];
  }
}
