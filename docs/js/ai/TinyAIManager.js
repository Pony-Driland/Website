class TinyAIManager {

    #_apiKey;

    constructor() {
        // Config
        this.modelId = null;
        this.modelName = null;
        this.#_apiKey = null;

        // History
        this._selectedHistory = null;
        this.history = {};

        // Cache
        this.cache = {};

        // Models
        this.models = [];
        this._nextModelsPageToken = null;

        // Functions
        this._genContentApi = null;
        this._insertServerCache = null;
        this._getServerCache = null;
        this._getModels = null;

        // Build Parts
        this._partTypes = {
            text: (text) => typeof text === 'string' ? text : null,
            inlineData: (data) => {
                if (typeof data.mime_type === 'string' && typeof data.data === 'string')
                    return data;
                return null;
                // mime_type: "text/plain",
                // data: "'$(base64 $B64FLAGS a11.txt)'"
            },
        };
    }

    // Builder
    _buildContents(contents, item, role) {
        // Content Data
        const tinyThis = this;
        const contentData = { parts: [] };

        // Role
        if (typeof role === 'string')
            contentData.role = role;

        // Parts
        const insertPart = (content) => {
            const tinyResult = {};
            for (const valName in content) {
                if (typeof tinyThis._partTypes[valName] === 'function')
                    tinyResult[valName] = tinyThis._partTypes[valName](content[valName]);
            }
            contentData.parts.push(tinyResult);
        };

        if (Array.isArray(item.parts)) {
            for (const index in item.parts)
                insertPart(item.parts[index]);
        } else if (item.content)
            insertPart(item.content);

        // Complete
        contents.push(contentData);
    }

    // API Key
    setApiKey(apiKey) {
        this.#_apiKey = typeof apiKey === 'string' ? apiKey : null;
    }

    // Models
    _setNextModelsPageToken(nextModelsPageToken) {
        this._nextModelsPageToken = typeof nextModelsPageToken === 'string' ? nextModelsPageToken : null;
    }

    _setGetModels(getModels) {
        this._getModels = typeof getModels === 'function' ? getModels : null;
    }

    getModels(pageSize = 50, pageToken = null) {
        if (typeof this._getModels === 'function')
            return this._getModels(this.#_apiKey, pageSize, pageToken || this._nextModelsPageToken);
        throw new Error('No model list api script defined.');
    }

    getModelsList() {
        return this.models;
    }

    _insertNewModel(model) {
        if (this.models.findIndex(item => item.id === model.id) < 0) {
            const newData = {
                name: typeof model.name === 'string' ? model.name : null,
                id: typeof model.id === 'string' ? model.id : null,
                displayName: typeof model.displayName === 'string' ? model.displayName : null,
                version: typeof model.version === 'string' ? model.version : null,
                description: typeof model.description === 'string' ? model.description : null,
                inputTokenLimit: typeof model.inputTokenLimit === 'number' ? model.inputTokenLimit : null,
                outputTokenLimit: typeof model.outputTokenLimit === 'number' ? model.outputTokenLimit : null,
                temperature: typeof model.temperature === 'number' ? model.temperature : null,
                maxTemperature: typeof model.maxTemperature === 'number' ? model.maxTemperature : null,
                topP: typeof model.topP === 'number' ? model.topP : null,
                topK: typeof model.topK === 'number' ? model.topK : null,
            };

            if (Array.isArray(model.supportedGenerationMethods)) {
                newData.supportedGenerationMethods = [];
                for (const index in model.supportedGenerationMethods) {
                    if (typeof model.supportedGenerationMethods[index] === 'string')
                        newData.supportedGenerationMethods.push(model.supportedGenerationMethods[index]);
                }
            }

            this.models.push(newData);
            return newData;
        }
        return null;
    }

    // Content
    _createContentData(data) {
        const newCache = { contents: [] };

        if (typeof data.createTime === 'string')
            newCache.createTime = data.createTime;

        if (typeof data.updateTime === 'string')
            newCache.updateTime = data.updateTime;

        if (typeof data.expireTime === 'string')
            newCache.expireTime = data.expireTime;

        if (typeof data.ttl === 'string')
            newCache.ttl = data.ttl;

        if (typeof data.name === 'string')
            newCache.name = data.name;

        if (typeof data.displayName === 'string')
            newCache.displayName = data.displayName;

        if (typeof data.model === 'string')
            newCache.model = data.model;

        // Content
        for (const index in data.contents) {
            const item = result.contents[index];
            this._buildContents(newCache.contents, item.content, item.content.role);
        }

        // System Instructions
        if (newCache.systemInstruction) {
            if (!Array.isArray(newCache.systemInstruction)) newCache.systemInstruction = [];
            this._buildContents(newCache.systemInstruction, data.systemInstruction);
            newCache.systemInstruction = newCache.systemInstruction[0];
        }

        return newCache;
    }

    // Server Cache
    _insertCache(name, data) {
        this.cache[name] = this._createContentData(data);
        return this.cache[name];
    }

    getCache(name) {
        return this.cache[name] || null;
    }

    _setInsertServerCache(value) {
        this._insertServerCache = typeof value === 'function' ? value : null;
    }

    insertServerCache(name, data) {
        if (typeof this._insertServerCache === 'function')
            return this._insertServerCache(this.#_apiKey, this.modelName, name, data);
        throw new Error('No insert cache api script defined.');
    }

    _setGetServerCache(value) {
        this._getServerCache = typeof value === 'function' ? value : null;
    }

    // Fetch API
    _setGenContent(callback) {
        this._genContentApi = typeof callback === 'function' ? callback : null;
    }

    genContent(data, isStream = false) {
        if (typeof this._genContentApi === 'function')
            return this._genContentApi(this.#_apiKey, this.modelId, isStream, data);
        throw new Error('No content generator api script defined.');
    }

    // Model
    setModel(model) {
        if (model) {
            this.modelId = typeof model.id === 'string' ? model.id : null;
            this.modelName = typeof model.name === 'string' ? model.name : null;
        } else {
            this.modelId = null;
            this.modelName = null;
        }
    }

    getModel() {
        return { id: this.modelId, name: this.modelName };
    }

    // History
    selectHistory(id) {
        if (this.history[id]) {
            this._selectedHistory = id;
            return true;
        }
        return false;
    }

    getHistory(id) {
        return this.history[id || this._selectedHistory] || null;
    }

    getHistoryIndex(index, id) {
        const history = this.getHistory(id);
        if (history && history[index])
            return history[index];
        return null;
    }

    _startHistory(id) {
        this.history[id] = [];
    }

}

// Localstorage Manager
class TinyAiStorage extends EventEmitter {

    constructor() {
        super();

        this._selected = localStorage.getItem('tiny-ai-storage-selected');
        if (typeof this._selected !== 'string')
            this._selected = null;

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

const AiScriptStart = () => {
    const tinyAiScript = {};

    // appData.ai.using

    // Read AI Apis
    const tinyAi = new TinyAIManager();
    const tinyStorage = new TinyAiStorage();
    let aiLogin = null;
    tinyAiScript.setAiLogin = (newAiLogin) => {
        aiLogin = newAiLogin;
    };

    // Test
    appData.ai.api = tinyAi;

    // Checker
    tinyAiScript.checkTitle = () => {
        // Get selected Ai
        const selectedAi = tinyStorage.selectedAi();

        // Exists Google only. Then select google generative
        if (selectedAi === 'google-generative') {
            // Update html
            aiLogin.button.find('> i').removeClass('text-danger-emphasis');
            aiLogin.title = 'AI Enabled';

            // Update Ai API script
            setGoogleAi(tinyAi, tinyStorage.getApiKey('google-generative'));
        } else {
            // Update html
            aiLogin.button.find('> i').addClass('text-danger-emphasis');
            aiLogin.title = 'AI Disabled';
        }

        // update login button
        aiLogin.button.attr("title", aiLogin.title);
        aiLogin.button.attr("data-bs-original-title", aiLogin.title);
    };

    // Login button
    tinyAiScript.login = () => {
        // Google AI
        const googleAi = {
            input: $("<input>", { type: "password", class: "form-control text-center" }),
            title: $('<h4>').text('Google Studio'),
            desc: $('<p>').append(
                $('<span>').text('You can get your Google API key '),
                $('<a>', { href: 'https://aistudio.google.com/apikey', target: '_blank' }).text('here'),
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
                $('<p>').text(`This website does not belong to any AI company, and all API input is stored locally inside your machine. This website is just a client to run prompts in artificial intelligence, there is no native artificial intelligence installed here.`),
                $('<p>').text(`By activating an artificial intelligence service in your session, you agree to the terms of use and privacy policies of the third party services you are using on this website. You will always be warned when any artificial intelligence service needs to be run on this website.`),

                googleAi.title,
                googleAi.desc,
                googleAi.input,

                $('<button>', { class: 'btn btn-info m-4' }).text('Set API Tokens').on('click', () => {
                    tinyStorage.setApiKey('google-generative', googleAi.input.val());
                    tinyAiScript.checkTitle();
                    $('#ai_connection').modal('hide');
                })
            )
        });
    };

    // Complete
    return tinyAiScript;
};