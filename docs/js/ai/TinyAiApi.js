/**
 * AI Server Communication API
 * -----------------------------
 * This class is responsible for managing AI session data, including models, history, and content generation.
 * The script is designed to interact with the AI API, providing a complete structure for creating user interfaces (UI) or AI-powered chatbots.
 * It implements a session management system to help handle multiple different bots.
 * However, this script is not optimized for efficiently handling multiple AI instances simultaneously, which may be required for high-load scenarios or when running several AI instances at once.
 *
 * **Note**: This script does not automatically manage or track the token count for messages. Developers need to implement their own logic to monitor and manage token usage if necessary.
 *
 * Documentation written with the assistance of OpenAI's ChatGPT.
 *
 * @author JasminDreasond
 * @version 1.0
 * @date 2025-03-24
 *
 * License: AGPL-3.0
 * ----------
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

// import objHash from 'object-hash';
// import EventEmitter from 'events';

class TinyAiApi extends EventEmitter {
  #_apiKey;
  #_getModels;
  #_countTokens;
  #_genContentApi;
  #_historyIds;
  #_selectedHistory;
  #_partTypes;
  #_insertIntoHistory;

  /**
   * Creates an instance of the TinyAiApi class.
   * Initializes internal variables, sets up initial configurations for handling AI models,
   * session history, and content generation, with the option to use a single or multiple instances.
   *
   * @param {boolean} isSingle - If true, configures the instance to handle a single session only.
   */
  constructor(isSingle = false) {
    super();
    // Config
    this.#_apiKey = null;
    this._errorCode = null;
    this._isSingle = isSingle;

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

    // Is single instance
    if (this._isSingle) {
      this.startDataId('main', true);
      this.startDataId = null;
      this.stopDataId = null;
      this.selectDataId = null;
    }
  }

  /**
   * Sets a custom value in the selected session history.
   *
   * @param {string} name - The name of the custom value to set.
   * @param {*} value - The value to be assigned to the custom key.
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @throws {Error} If the custom value name is invalid (not a non-empty string).
   * @returns {void} This method does not return a value.
   */
  setCustomValue(name, value, id) {
    if (typeof name === 'string' && name.length > 0 && name !== 'customList') {
      // Prepare value to send
      const sendValue = {};
      sendValue[name] = value;

      // This value is extremely important for the import process to identify which custom values are being used
      const history = this.getData(id);
      if (!Array.isArray(history.customList)) history.customList = [];

      // Validate the custom value
      const props = history.customList.find((item) => item.name === name);
      if (!props || typeof props.type !== 'string' || typeof props.name !== 'string') {
        if (typeof history[name] === 'undefined')
          history.customList.push({ name, type: objType(value) });
        else throw new Error('This value name is already being used!');
      } else if (props.type !== objType(value)) throw new Error('Invalid custom value type!');

      // Send custom value into the history
      const selectedId = this.getId(id);
      this.#_insertIntoHistory(this.getId(id), sendValue);
      this.history[selectedId].hash[name] = objHash(value);
      this.emit(tinyLib.toTitleCase(name), value, id);
      return;
    }
    throw new Error('Invalid custom value!');
  }

  /**
   * Retrieves a custom value from the selected session history.
   *
   * @param {string} name - The name of the custom value to retrieve.
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @returns {*} The value associated with the specified name, or `null` if it does not exist.
   */
  getCustomValue(name, id) {
    const history = this.getData(id);
    return history && typeof history[name] !== 'undefined' && history[name] !== null
      ? history[name]
      : null;
  }

  /**
   * Retrieves the list of custom values from the selected session history.
   *
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @returns {Array} An array of custom values if available, or an empty array if no custom values exist.
   */
  getCustomValueList(id) {
    const history = this.getData(id);
    return history && Array.isArray(history.customList) ? history.customList : [];
  }

  /**
   * Set the maximum output tokens setting for an AI session.
   *
   * @param {number} value - The maximum number of output tokens to be set.
   * @param {string} [id] - The session ID. If omitted, the currently selected session will be used.
   * @returns {void} This function does not return a value.
   */
  setMaxOutputTokens(value, id) {
    if (typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value)) {
      this.#_insertIntoHistory(this.getId(id), { maxOutputTokens: value });
      this.emit('setMaxOutputTokens', value, id);
      return;
    }
    throw new Error('Invalid number value!');
  }

  /**
   * Get the maximum output tokens setting for an AI session.
   *
   * @param {string} [id] - The session ID. If omitted, the currently selected session will be used.
   * @returns {number | null} The maximum output tokens value, or null if not set.
   */
  getMaxOutputTokens(id) {
    const history = this.getData(id);
    return history && typeof history.maxOutputTokens === 'number' ? history.maxOutputTokens : null;
  }

  /**
   * Set the AI temperature setting for a session.
   *
   * @param {number} value - The temperature value to be set.
   * @param {string} [id] - The session ID. If omitted, the currently selected session will be used.
   * @returns {void} This function does not return a value.
   */
  setTemperature(value, id) {
    if (typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value)) {
      this.#_insertIntoHistory(this.getId(id), { temperature: value });
      this.emit('setTemperature', value, id);
      return;
    }
    throw new Error('Invalid number value!');
  }

  /**
   * Get the AI temperature setting for a session.
   *
   * @param {string} [id] - The session ID. If omitted, the currently selected session will be used.
   * @returns {number | null} The temperature value, or null if not set.
   */
  getTemperature(id) {
    const history = this.getData(id);
    return history && typeof history.temperature ? history.temperature : null;
  }

  /**
   * Set the top-p (nucleus sampling) value in an AI session.
   *
   * @param {number} value - The top-p value to be set.
   * @param {string} [id] - The session ID. If omitted, the currently selected session will be used.
   * @returns {void} This function does not return a value.
   */
  setTopP(value, id) {
    if (typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value)) {
      this.#_insertIntoHistory(this.getId(id), { topP: value });
      this.emit('setTopP', value, id);
      return;
    }
    throw new Error('Invalid number value!');
  }

  /**
   * Get the top-p (nucleus sampling) setting for an AI session.
   *
   * @param {string} [id] - The session ID. If omitted, the currently selected session will be used.
   * @returns {number | null} The top-p value, or null if not set.
   */
  getTopP(id) {
    const history = this.getData(id);
    return history && typeof history.topP === 'number' ? history.topP : null;
  }

  /**
   * Set the top-k setting for an AI session.
   *
   * @param {number} value - The top-k value to be set.
   * @param {string} [id] - The session ID. If omitted, the currently selected session will be used.
   * @returns {void} This function does not return a value.
   */
  setTopK(value, id) {
    if (typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value)) {
      this.#_insertIntoHistory(this.getId(id), { topK: value });
      this.emit('setTopK', value, id);
      return;
    }
    throw new Error('Invalid number value!');
  }

  /**
   * Get the top-k setting for an AI session.
   *
   * @param {string} [id] - The session ID. If omitted, the currently selected session will be used.
   * @returns {number | null} The top-k value, or null if not set.
   */
  getTopK(id) {
    const history = this.getData(id);
    return history && typeof history.topK === 'number' ? history.topK : null;
  }

  /**
   * Set the presence penalty setting for an AI session.
   *
   * @param {number} value - The presence penalty value to be set.
   * @param {string} [id] - The session ID. If omitted, the currently selected session will be used.
   * @returns {void} This function does not return a value.
   */
  setPresencePenalty(value, id) {
    if (typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value)) {
      this.#_insertIntoHistory(this.getId(id), { presencePenalty: value });
      this.emit('setPresencePenalty', value, id);
      return;
    }
    throw new Error('Invalid number value!');
  }

  /**
   * Get the presence penalty setting for an AI session.
   *
   * @param {string} [id] - The session ID. If omitted, the currently selected session will be used.
   * @returns {number | null} The presence penalty value, or null if not set.
   */
  getPresencePenalty(id) {
    const history = this.getData(id);
    return history && typeof history.presencePenalty === 'number' ? history.presencePenalty : null;
  }

  /**
   * Set the frequency penalty setting for an AI session.
   *
   * @param {number} value - The frequency penalty value to be set.
   * @param {string} [id] - The session ID. If omitted, the currently selected session will be used.
   * @returns {void} This function does not return a value.
   */
  setFrequencyPenalty(value, id) {
    if (typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value)) {
      this.#_insertIntoHistory(this.getId(id), { frequencyPenalty: value });
      this.emit('setFrequencyPenalty', value, id);
      return;
    }
    throw new Error('Invalid number value!');
  }

  /**
   * Get the frequency penalty setting for an AI session.
   *
   * @param {string} [id] - The session ID. If omitted, the currently selected session will be used.
   * @returns {number | null} The frequency penalty value, or null if not set.
   */
  getFrequencyPenalty(id) {
    const history = this.getData(id);
    return history && typeof history.frequencyPenalty === 'number'
      ? history.frequencyPenalty
      : null;
  }

  /**
   * Set the setting for enabling enhanced civic answers in an AI session.
   *
   * @param {boolean} value - Whether to enable enhanced civic answers (true or false).
   * @param {string} [id] - The session ID. If omitted, the currently selected session will be used.
   * @returns {void} This function does not return a value.
   */
  setEnabledEnchancedCivicAnswers(value, id) {
    if (typeof value === 'boolean') {
      this.#_insertIntoHistory(this.getId(id), { enableEnhancedCivicAnswers: value });
      this.emit('setEnabledEnchancedCivicAnswers', value, id);
      return;
    }
    throw new Error('Invalid boolean value!');
  }

  /**
   * Get the setting for whether enhanced civic answers are enabled in an AI session.
   *
   * @param {string} [id] - The session ID. If omitted, the currently selected session will be used.
   * @returns {boolean | null} The value indicating whether enhanced civic answers are enabled, or null if not set.
   */
  isEnabledEnchancedCivicAnswers(id) {
    const history = this.getData(id);
    return history && typeof history.enableEnhancedCivicAnswers === 'boolean'
      ? history.enableEnhancedCivicAnswers
      : null;
  }

  /**
   * Set the model for an AI session.
   *
   * @param {string} data - The model to be set (must be a string).
   * @param {string} [id] - The session ID. If omitted, the currently selected session will be used.
   * @returns {void} This function does not return a value.
   */
  setModel(data, id) {
    const model = typeof data === 'string' ? data : null;
    this.#_insertIntoHistory(this.getId(id), { model });
    this.emit('setModel', model, id);
  }

  /**
   * Get the model for an AI session.
   *
   * @param {string} [id] - The session ID. If omitted, the currently selected session will be used.
   * @returns {string | null} The model, or null if not set.
   */
  getModel(id) {
    const history = this.getData(id);
    return history && typeof history.model === 'string' ? history.model : null;
  }

  /**
   * Build content data for an AI session.
   *
   * @param {Array} [contents] - An optional array to which the built content data will be pushed.
   * @param {Object} item - The item containing content parts or a content object.
   * @param {string} [role] - The role to be associated with the content (optional).
   * @param {boolean} [rmFinishReason=false] - If true, removes the `finishReason` property from the content.
   * @returns {Object|undefined} The constructed content data object, or undefined if pushed to an array.
   */
  buildContents(contents, item, role, rmFinishReason = false) {
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

    if (
      !rmFinishReason &&
      (typeof item.finishReason === 'string' || typeof item.finishReason === 'number')
    )
      contentData.finishReason = item.finishReason;

    // Complete
    if (Array.isArray(contents)) return contents.push(contentData);
    return contentData;
  }

  /**
   * Set the API key for the AI session.
   *
   * @param {string} apiKey - The API key to be set.
   * @returns {void} This function does not return a value.
   */
  setApiKey(apiKey) {
    this.#_apiKey = typeof apiKey === 'string' ? apiKey : null;
  }

  /**
   * Set the token for the next page of models in the AI session.
   *
   * @param {string} nextModelsPageToken - The token for the next models page.
   * @returns {void} This function does not return a value.
   */
  _setNextModelsPageToken(nextModelsPageToken) {
    this._nextModelsPageToken =
      typeof nextModelsPageToken === 'string' ? nextModelsPageToken : null;
  }

  /**
   * Set the function to retrieve models for the AI session.
   *
   * @param {Function} getModels - The function to retrieve models.
   * @returns {void} This function does not return a value.
   */
  _setGetModels(getModels) {
    this.#_getModels = typeof getModels === 'function' ? getModels : null;
  }

  /**
   * Get a list of models for the AI session.
   *
   * @param {number} [pageSize=50] - The number of models to retrieve per page. Defaults to 50.
   * @param {string|null} [pageToken=null] - The token for the next page of models, if available. Defaults to null.
   * @returns {Array} The list of models retrieved.
   * @throws {Error} If no model list API function is defined.
   */
  getModels(pageSize = 50, pageToken = null) {
    if (typeof this.#_getModels === 'function')
      return this.#_getModels(this.#_apiKey, pageSize, pageToken || this._nextModelsPageToken);
    throw new Error('No model list api script defined.');
  }

  /**
   * Get the list of models for the AI session.
   *
   * @returns {Array} The list of models.
   */
  getModelsList() {
    return this.models;
  }

  /**
   * Get model data from the list of models.
   *
   * @param {string} id - The model data id to search for in the models list.
   * @returns {Object|null} The model data if found, otherwise null.
   */
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

  /**
   * Check if a model exists in the model list.
   *
   * @param {string} id - The model id to check for in the models list.
   * @returns {boolean} True if the model exists, false otherwise.
   */
  existsModel(id) {
    return this.getModelData(id) ? true : false;
  }

  /**
   * Insert a new model into the AI session's models list.
   * If the model already exists, it will not be inserted again.
   *
   * @param {Object} model - The model to insert.
   * @param {string} model.id - The unique identifier for the model.
   * @param {string} [model.name] - The name of the model.
   * @param {string} [model.displayName] - The display name of the model.
   * @param {string} [model.version] - The version of the model.
   * @param {string} [model.description] - A description of the model.
   * @param {number} [model.inputTokenLimit] - The input token limit for the model.
   * @param {number} [model.outputTokenLimit] - The output token limit for the model.
   * @param {number} [model.temperature] - The temperature setting for the model.
   * @param {number} [model.maxTemperature] - The maximum temperature setting for the model.
   * @param {number} [model.topP] - The top P setting for the model.
   * @param {number} [model.topK] - The top K setting for the model.
   * @param {Array<string>} [model.supportedGenerationMethods] - The generation methods supported by the model.
   * @param {Object} [model.category] - The category of the model.
   * @param {string} model.category.id - The unique identifier for the category.
   * @param {string} model.category.displayName - The display name of the category.
   * @param {number} model.category.index - The index of the category.
   * @returns {Object|null} The inserted model data, or null if the model already exists.
   */
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

  /**
   * Sets a function to handle the count of tokens in the AI session.
   * If a valid function is provided, it will be used to count tokens.
   *
   * @param {Function} countTokens - The function that will handle the token count.
   * @throws {Error} Throws an error if the provided value is not a function.
   * @returns {void}
   */
  _setCountTokens(countTokens) {
    this.#_countTokens = typeof countTokens === 'function' ? countTokens : null;
  }

  /**
   * Counts the tokens based on the provided data and model, using a defined token counting function.
   * If the function to count tokens is not set, an error is thrown.
   *
   * @param {Object} data - The data that needs to be tokenized.
   * @param {string} model - The model to use for counting tokens. If not provided, the default model is used.
   * @param {Object} controller - The controller that manages the process or settings for counting tokens.
   * @throws {Error} Throws an error if no token counting function is defined.
   * @returns {Object} The count of tokens.
   */
  countTokens(data, model, controller) {
    if (typeof this.#_countTokens === 'function')
      return this.#_countTokens(this.#_apiKey, model || this.getModel(), controller, data);
    throw new Error('No count token api script defined.');
  }

  /**
   * Sets the error codes for the current session.
   *
   * @param {Object} errors - The error codes to set, typically an object containing error code definitions.
   * @returns {void}
   */
  _setErrorCodes(errors) {
    this._errorCode = errors;
  }

  /**
   * Get error details based on the provided error code.
   *
   * @param {string|number} code - The error code to look up.
   * @returns {Object|null} An object containing the error message, or null if no error is found.
   */
  getErrorCode(code) {
    if (this._errorCode) {
      const errData = this._errorCode[code];
      if (errData) {
        if (typeof errData === 'string') return { text: errData };
        else if (typeof errData.text === 'string') return errData;
      }
    }
    return null;
  }

  /**
   * Sets the content generation callback function for the AI session.
   *
   * @param {Function} callback - The callback function that handles content generation.
   * @returns {void}
   */
  _setGenContent(callback) {
    this.#_genContentApi = typeof callback === 'function' ? callback : null;
  }

  /**
   * Generates content for the AI session.
   *
   * @param {Object} data - The data for content generation.
   * @param {string} model - The model to be used for content generation. If not provided, the default model is used.
   * @param {Object} controller - The controller managing the content generation process.
   * @param {Function} [streamCallback] - The callback function for streaming content (optional).
   * @returns {Object} The generated content returned by the API.
   * @throws {Error} If no content generator API script is defined.
   */
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

  /**
   * Select a session history ID to set as the active session.
   * If `null` is passed, it deselects the current session ID.
   *
   * @param {string|null} id - The session history ID to select, or `null` to deselect the current session.
   * @returns {boolean} `true` if the session ID was successfully selected or deselected, `false` if the ID does not exist in history.
   */
  selectDataId(id) {
    if (id !== null) {
      if (this.history[id]) {
        this.#_selectedHistory = id;
        this.emit('selectDataId', id);
        return true;
      }
      return false;
    }
    this.#_selectedHistory = null;
    this.emit('selectDataId', null);
    return true;
  }

  /**
   * Get the currently selected session history ID.
   * If no ID is provided, it returns the default selected session history ID.
   *
   * @param {string} [id] - The session history ID to retrieve. If not provided, it uses the default selected ID.
   * @returns {string|null} The selected session history ID, or `null` if no history ID is selected.
   */
  getId(id) {
    return id && !this._isSingle ? id : this.#_selectedHistory;
  }

  /**
   * Get the data associated with a specific session history ID.
   *
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @returns {Object|null} The data associated with the session ID, or `null` if no data exists for that ID.
   */
  getData(id) {
    return this.history[this.getId(id)] || null;
  }

  /**
   * Calculates the total number of tokens used for messages in the session history.
   *
   * This method iterates over the `tokens` array in the session history and sums the `count` of tokens
   * from each message, returning the total sum. If no valid session history is found or if token data is
   * missing, it will return `null`.
   *
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @returns {number|null} The total number of tokens used in the session history, or `null` if no data is available.
   */
  getTotalTokens(id) {
    const history = this.getData(id);
    if (history) {
      let result = 0;
      for (const msgIndex in history.tokens.data) {
        if (typeof history.tokens.data[msgIndex].count === 'number')
          result += history.tokens.data[msgIndex].count;
      }

      const promptInfo = this.getTokens('prompt', id);
      const fileDataInfo = this.getTokens('file', id);
      const systemInstructionInfo = this.getTokens('systemInstruction', id);
      if (typeof promptInfo === 'number') result += promptInfo;
      if (typeof fileDataInfo === 'number') result += fileDataInfo;
      if (typeof systemInstructionInfo === 'number') result += systemInstructionInfo;

      return result;
    }
    return null;
  }

  /**
   * Retrieves the token data for a specific message in the session history by its index.
   *
   * **Note**: This method does not manage the token count automatically. It assumes that token data has been added
   * to the history using the `addData` method.
   *
   * @param {number} msgIndex - The index of the message in the session history.
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @returns {Object|null} The token data associated with the message at the specified index, or `null` if the data is not found.
   */
  getMsgTokensByIndex(msgIndex, id) {
    const history = this.getData(id);
    if (history) {
      const existsIndex = this.indexExists(msgIndex, id);
      if (existsIndex) return history.tokens.data[msgIndex];
    }
    return null;
  }

  /**
   * Retrieves the token data for a specific message in the session history by its message ID.
   *
   * **Note**: This method does not manage the token count automatically. It assumes that token data has been added
   * to the history using the `addData` method.
   *
   * @param {string} msgId - The unique ID of the message in the session history.
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @returns {Object|null} The token data associated with the message with the given ID, or `null` if the message is not found.
   */
  getMsgTokensById(msgId, id) {
    const history = this.getData(id);
    if (history) {
      const msgIndex = this.getIndexOfId(msgId);
      if (msgIndex > -1) return history.tokens.data[msgIndex];
    }
    return null;
  }

  /**
   * Retrieves the hash of a message at a specified index in the selected session history.
   *
   * @param {number} msgIndex - The index of the message whose hash is being retrieved.
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @returns {string|null} The hash value of the message at the specified index, or null if the index is invalid or does not exist.
   */
  getMsgHashByIndex(msgIndex, id) {
    const history = this.getData(id);
    if (history) {
      const existsIndex = this.indexExists(msgIndex, id);
      if (existsIndex) return history.hash.data[msgIndex];
    }
    return null;
  }

  /**
   * Retrieves the hash of a message based on its ID from the selected session history.
   *
   * @param {string} msgId - The ID of the message whose hash is being retrieved.
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @returns {string|null} The hash value of the message with the specified ID, or null if the message ID is invalid or does not exist.
   */
  getMsgHashById(msgId, id) {
    const history = this.getData(id);
    if (history) {
      const msgIndex = this.getIndexOfId(msgId);
      if (msgIndex > -1) return history.hash.data[msgIndex];
    }
    return null;
  }

  /**
   * Checks if a specific index exists in the session history.
   *
   * **Note**: This method assumes that the history data is available and that the `getMsgByIndex` method is used
   * to retrieve the index. If the `getMsgByIndex` method returns a valid index, this method will return `true`.
   *
   * @param {number} index - The index to check for existence in the session history.
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @returns {boolean} `true` if the index exists, otherwise `false`.
   */
  indexExists(index, id) {
    return this.getMsgByIndex(index, id) ? true : false;
  }

  /**
   * Retrieve a specific data entry by its index from the session history.
   *
   * @param {number} index - The index of the data entry to retrieve.
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @returns {Array|null} The data entry at the specified index, or `null` if the index is out of bounds or no data exists for the given session ID.
   */
  getMsgByIndex(index, id) {
    const history = this.getData(id);
    if (history && history.data[index]) return history.data[index];
    return null;
  }

  /**
   * Retrieves a specific message by its ID from the session history.
   *
   * @param {string} msgId - The ID of the message to retrieve.
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @returns {Object|null} The message data associated with the given ID, or `null` if the message ID is invalid or does not exist.
   */
  getMsgById(msgId, id) {
    const history = this.getData(id);
    if (history) {
      const index = this.getIndexOfId(msgId);
      if (history.data[index]) return history.data[index];
    }
    return null;
  }

  /**
   * Retrieve the index of a specific message ID in the session history.
   *
   * @param {string} msgId - The message ID to search for.
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @returns {number} The index of the message ID in the session history, or `-1` if not found.
   */
  getIndexOfId(msgId, id) {
    const history = this.getData(id);
    if (history) return history.ids.indexOf(msgId);
    return -1;
  }

  /**
   * Retrieve the message ID at a specific index in the session history.
   *
   * @param {number} index - The index of the data to retrieve.
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @returns {string|number} The message ID at the specified index, or `-1` if the index is out of bounds or not found.
   */
  getIdByIndex(index, id) {
    const history = this.getData(id);
    if (history) return history.data[index] ? history.ids[index] : -1;
    return -1;
  }

  /**
   * Delete a specific entry from the session history at the given index.
   *
   * @param {number} index - The index of the entry to delete.
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @returns {boolean} `true` if the entry was successfully deleted, `false` if the index is invalid or the entry does not exist.
   */
  deleteIndex(index, id) {
    const history = this.getData(id);
    if (history && history.data[index]) {
      history.data.splice(index, 1);
      history.ids.splice(index, 1);
      history.hash.data.splice(index, 1);
      history.tokens.data.splice(index, 1);
      this.emit('deleteIndex', index, id);
      return true;
    }
    return false;
  }

  /**
   * Replaces an entry at the specified index in the session history with new data.
   *
   * @param {number} index - The index of the entry to replace.
   * @param {Object} [data] - The new data to replace the existing entry (optional).
   * @param {number} [tokens] - The token count associated with the new entry (optional).
   * @param {string} [id] - The session ID (optional). If omitted, the currently selected session history ID will be used.
   * @returns {boolean} `true` if the entry was successfully replaced, `false` if the index is invalid or the entry does not exist.
   */
  replaceIndex(index, data, tokens, id) {
    const history = this.getData(id);
    if (history && history.data[index] && (data || tokens)) {
      let hash = null;
      if (data) {
        hash = objHash(data);
        history.data[index] = data;
        history.hash.data[index] = hash;
      }

      if (tokens) history.tokens.data[index] = tokens;
      this.emit('replaceIndex', index, data, tokens, hash, id);
      return true;
    }
    return false;
  }

  /**
   * Retrieve the index of the last entry in the session history.
   *
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @returns {number} The index of the last entry in the session history, or `-1` if the history is empty or invalid.
   */
  getLastIndex(id) {
    const history = this.getData(id);
    if (history && history.data[history.data.length - 1]) return history.data.length - 1;
    return -1;
  }

  /**
   * Retrieve the data of the last entry in the session history.
   *
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @returns {Object|null} The data of the last entry in the session history, or `null` if the history is empty or invalid.
   */
  getLastIndexData(id) {
    const history = this.getData(id);
    if (history && history.data[history.data.length - 1])
      return history.data[history.data.length - 1];
    return null;
  }

  /**
   * Check if the session history has at least one entry.
   *
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @returns {boolean} `true` if the session history has at least one entry, `false` otherwise.
   */
  existsFirstIndex(id) {
    const history = this.getData(id);
    if (history && history.data[0]) return true;
    return false;
  }

  /**
   * Retrieve the first entry in the session history.
   *
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @returns {Object|null} The first entry of the session history, or `null` if no entry exists.
   */
  getFirstIndexData(id) {
    const history = this.getData(id);
    if (history && history.data[0]) return history.data[0];
    return null;
  }

  /**
   * Adds new data to the selected session history.
   * If no session ID is provided, the currently selected session history ID will be used.
   *
   * **Note**: The `tokenData` parameter is optional and can be used to track token-related data associated with the new entry.
   * This may include token counts, but this script does not manage token counting automatically. Developers must implement token management separately if necessary.
   *
   * @param {Object} data - The data to be added to the session history.
   * @param {Object} [tokenData={count: null}] - Optional token-related data to be associated with the new entry. Defaults to `{count: null}`.
   * @param {string} [id] - The session history ID. If omitted, the currently selected session ID will be used.
   * @returns {number} The new ID of the added data entry.
   * @throws {Error} If the provided session ID is invalid or the session ID does not exist in history.
   */
  addData(data, tokenData = { count: null }, id = undefined) {
    const selectedId = this.getId(id);
    if (this.history[selectedId]) {
      const newId = this.#_historyIds;
      this.#_historyIds++;
      const hash = objHash(data);

      this.history[selectedId].data.push(data);
      this.history[selectedId].tokens.data.push(tokenData);
      this.history[selectedId].ids.push(newId);
      this.history[selectedId].hash.data.push(hash);

      this.emit('addData', newId, data, tokenData, hash, selectedId);
      return newId;
    }
    throw new Error('Invalid history id data!');
  }

  /**
   * Sets a prompt for the selected session history.
   *
   * @param {string} promptData - The prompt to be set for the session.
   * @param {number} [tokenAmount] - The number of tokens associated with the prompt (optional).
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @throws {Error} If the provided session ID is invalid or the prompt data is not a string.
   */
  setPrompt(promptData, tokenAmount, id) {
    const selectedId = this.getId(id);
    if (this.history[selectedId]) {
      let hash;
      if (typeof promptData === 'string') {
        hash = objHash(promptData);
        this.history[selectedId].prompt = promptData;
        this.history[selectedId].hash.prompt = hash;
      }

      if (typeof tokenAmount === 'number') this.history[selectedId].tokens.prompt = tokenAmount;
      this.emit('setPrompt', promptData, hash, selectedId);
      return;
    }
    throw new Error('Invalid history id data!');
  }

  /**
   * Retrieves the prompt of the selected session history.
   *
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @returns {string|null} The prompt for the session if available, otherwise null.
   */
  getPrompt(id) {
    const selectedId = this.getId(id);
    if (
      this.history[selectedId] &&
      typeof this.history[selectedId].prompt === 'string' &&
      this.history[selectedId].prompt.length > 0
    ) {
      return this.history[selectedId].prompt;
    }
    return null;
  }

  /**
   * Sets the first dialogue for the selected session history.
   *
   * @param {string} dialogue - The dialogue to set as the first dialogue.
   * @param {number} [tokenAmount] - The number of tokens associated with the dialogue (optional).
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @throws {Error} Throws an error if the session ID is invalid or the dialogue is not a string.
   * @returns {void}
   */
  setFirstDialogue(dialogue, tokenAmount, id) {
    const selectedId = this.getId(id);
    if (this.history[selectedId]) {
      let hash;
      if (typeof dialogue === 'string') {
        hash = objHash(dialogue);
        this.history[selectedId].firstDialogue = dialogue;
        this.history[selectedId].hash.firstDialogue = hash;
      }

      if (typeof tokenAmount === 'number')
        this.history[selectedId].tokens.firstDialogue = tokenAmount;
      this.emit('setFirstDialogue', dialogue, hash, selectedId);
      return;
    }
    throw new Error('Invalid history id data!');
  }

  /**
   * Retrieves the first dialogue from the selected session history.
   *
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @returns {string|null} The first dialogue if it exists and is a non-empty string, or null if no first dialogue is set.
   */
  getFirstDialogue(id) {
    const selectedId = this.getId(id);
    if (
      this.history[selectedId] &&
      typeof this.history[selectedId].firstDialogue === 'string' &&
      this.history[selectedId].firstDialogue.length > 0
    ) {
      return this.history[selectedId].firstDialogue;
    }
    return null;
  }

  /**
   * Sets file data for the selected session history.
   *
   * @param {string} mime - The MIME type of the file (e.g., 'text/plain', 'application/pdf').
   * @param {string} data - The file content, either as a string or base64-encoded.
   * @param {boolean} [isBase64=false] - A flag indicating whether the `data` is already base64-encoded. Defaults to false.
   * @param {number} [tokenAmount] - The token count associated with the file data (optional).
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @throws {Error} If the session ID is invalid or data/mime is not a string.
   * @returns {void}
   */
  setFileData(mime, data, isBase64 = false, tokenAmount = undefined, id = undefined) {
    const selectedId = this.getId(id);
    if (this.history[selectedId]) {
      let hash;
      if (typeof data === 'string' && typeof mime === 'string') {
        this.history[selectedId].file = {
          mime,
          data: !isBase64 ? Base64.encode(data) : data,
        };
        hash = objHash(this.history[selectedId].file);
        this.history[selectedId].hash.file = hash;
      }

      if (typeof tokenAmount === 'number') this.history[selectedId].tokens.file = tokenAmount;
      this.emit('setFileData', this.history[selectedId].file, hash, selectedId);
      return;
    }
    throw new Error('Invalid history id data!');
  }

  /**
   * Removes file data from the selected session history.
   *
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @throws {Error} If the session history ID is invalid.
   * @returns {void} This method does not return a value.
   */
  removeFileData(id) {
    const selectedId = this.getId(id);
    if (this.history[selectedId]) {
      delete this.history[selectedId].file;
      delete this.history[selectedId].hash.file;
      delete this.history[selectedId].tokens.file;
      this.emit('setFileData', null, null, selectedId);
      return;
    }
    throw new Error('Invalid history id data!');
  }

  /**
   * Retrieves file data from the selected session history.
   *
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @returns {Object|null} The file data, including MIME type and encoded content, or null if no file data is found.
   * @throws {Error} If no valid session history ID is found.
   */
  getFileData(id) {
    const selectedId = this.getId(id);
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

  /**
   * Sets a system instruction for the selected session history.
   *
   * @param {string} data - The system instruction to set.
   * @param {number} [tokenAmount] - The token count associated with the system instruction (optional).
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @throws {Error} If the session history ID is invalid or the provided data is not a string.
   * @returns {void}
   */
  setSystemInstruction(data, tokenAmount, id) {
    const selectedId = this.getId(id);
    if (this.history[selectedId]) {
      let hash;
      if (typeof data === 'string') {
        hash = objHash(data);
        this.history[selectedId].systemInstruction = data;
        this.history[selectedId].hash.systemInstruction = hash;
      }

      if (typeof tokenAmount === 'number')
        this.history[selectedId].tokens.systemInstruction = tokenAmount;
      this.emit('setSystemInstruction', data, hash, selectedId);
      return;
    }
    throw new Error('Invalid history id data!');
  }

  /**
   * Retrieves the system instruction for the selected session history.
   *
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @returns {string|null} The system instruction for the selected session, or `null` if no instruction is set.
   */
  getSystemInstruction(id) {
    const selectedId = this.getId(id);
    if (
      this.history[selectedId] &&
      typeof this.history[selectedId].systemInstruction === 'string'
    ) {
      return this.history[selectedId].systemInstruction;
    }
    return null;
  }

  /**
   * Retrieves the token count for a specific category within the selected session history.
   *
   * @param {string} where - The category from which to retrieve the token count (e.g., 'prompt', 'file', 'systemInstruction').
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @returns {number|null} The token count if available, otherwise null.
   */
  getTokens(where, id) {
    const selectedId = this.getId(id);
    if (this.history[selectedId] && typeof this.history[selectedId].tokens[where] === 'number')
      return this.history[selectedId].tokens[where];
    return null;
  }

  /**
   * Retrieves the hash value for a specific item in the selected session history.
   *
   * @param {string} where - The key representing the item whose hash value is being retrieved (e.g., 'prompt', 'file', 'systemInstruction').
   * @param {string} [id] - The session ID. If omitted, the currently selected session history ID will be used.
   * @returns {string|null} The hash value of the specified item, or null if the item does not exist.
   */
  getHash(where, id) {
    const selectedId = this.getId(id);
    if (this.history[selectedId] && typeof this.history[selectedId].hash[where] === 'string')
      return this.history[selectedId].hash[where];
    return null;
  }

  /**
   * Starts a new data session with the given session ID.
   *
   * @param {string} id - The session ID for the new data session.
   * @param {boolean} [selected=false] - A flag to indicate whether this session should be selected as the active session.
   * @returns {Object} The newly created session data, which includes an empty data array, an empty IDs array, and null values for system instruction and model.
   */
  startDataId(id, selected = false) {
    this.history[id] = {
      data: [],
      ids: [],
      tokens: { data: [] },
      hash: { data: [] },
      systemInstruction: null,
      model: null,
    };
    if (selected) this.selectDataId(id);
    this.emit('startDataId', this.history[id], id, selected ? true : false);
    return this.history[id];
  }

  /**
   * Stop the data session associated with the provided ID.
   * This will remove the session data from history and reset the selected session ID if necessary.
   *
   * @param {string} id - The session history ID to stop and remove from history.
   * @returns {boolean} `true` if the session ID was found and successfully stopped, `false` otherwise.
   */
  stopDataId(id) {
    if (this.history[id]) {
      delete this.history[id];
      if (this.getId() === id) this.selectDataId(null);
      this.emit('stopDataId', id);
      return true;
    }
    return false;
  }
}
