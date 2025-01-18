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

    // Ai Config
    this.config = {};
    this.config.maxOutputTokens = null;
    this.config.temperature = null;
    this.config.topP = null;
    this.config.topK = null;
    this.config.presencePenalty = null;
    this.config.frequencyPenalty = null;
    this.config.enableEnhancedCivicAnswers = false;

    // Build Parts
    this._partTypes = {
      text: (text) => (typeof text === "string" ? text : null),
      inlineData: (data) => {
        if (typeof data.mime_type === "string" && typeof data.data === "string")
          return data;
        return null;
        // mime_type: "text/plain",
        // data: "'$(base64 $B64FLAGS a11.txt)'"
      },
    };
  }

  // Config
  setMaxOutputTokens() {
    if (
      typeof value === "number" &&
      !Number.isNaN(value) &&
      Number.isFinite(value)
    ) {
      this.config.maxOutputTokens = value;
      return;
    }
    throw new Error("Invalid number value!");
  }

  getMaxOutputTokens() {
    return typeof this.config.maxOutputTokens === "number"
      ? this.config.maxOutputTokens
      : null;
  }

  setTemperature() {
    if (
      typeof value === "number" &&
      !Number.isNaN(value) &&
      Number.isFinite(value)
    ) {
      this.config.temperature = value;
      return;
    }
    throw new Error("Invalid number value!");
  }

  getTemperature() {
    return typeof this.config.temperature ? this.config.temperature : null;
  }

  setTopP() {
    if (
      typeof value === "number" &&
      !Number.isNaN(value) &&
      Number.isFinite(value)
    ) {
      this.config.topP = value;
      return;
    }
    throw new Error("Invalid number value!");
  }

  getTopP() {
    return typeof this.config.topP === "number" ? this.config.topP : null;
  }

  setTopK() {
    if (
      typeof value === "number" &&
      !Number.isNaN(value) &&
      Number.isFinite(value)
    ) {
      this.config.topK = value;
      return;
    }
    throw new Error("Invalid number value!");
  }

  getTopK() {
    return typeof this.config.topK === "number" ? this.config.topK : null;
  }

  setPresencePenalty() {
    if (
      typeof value === "number" &&
      !Number.isNaN(value) &&
      Number.isFinite(value)
    ) {
      this.config.presencePenalty = value;
      return;
    }
    throw new Error("Invalid number value!");
  }

  getPresencePenalty() {
    return typeof this.config.presencePenalty === "number"
      ? this.config.presencePenalty
      : null;
  }

  setFrequencyPenalty() {
    if (
      typeof value === "number" &&
      !Number.isNaN(value) &&
      Number.isFinite(value)
    ) {
      this.config.frequencyPenalty = value;
      return;
    }
    throw new Error("Invalid number value!");
  }

  getFrequencyPenalty() {
    return typeof this.config.frequencyPenalty === "number"
      ? this.config.frequencyPenalty
      : null;
  }

  setEnabledEnchancedCivicAnswers() {
    if (typeof value === "boolean") {
      this.config.enableEnhancedCivicAnswers = value;
      return;
    }
    throw new Error("Invalid boolean value!");
  }

  isEnabledEnchancedCivicAnswers() {
    return typeof this.config.enableEnhancedCivicAnswers === "boolean"
      ? this.config.enableEnhancedCivicAnswers
      : null;
  }

  // Builder
  _buildContents(contents, item, role) {
    // Content Data
    const tinyThis = this;
    const contentData = { parts: [] };

    // Role
    if (typeof role === "string") contentData.role = role;

    // Parts
    const insertPart = (content) => {
      const tinyResult = {};
      for (const valName in content) {
        if (typeof tinyThis._partTypes[valName] === "function")
          tinyResult[valName] = tinyThis._partTypes[valName](content[valName]);
      }
      contentData.parts.push(tinyResult);
    };

    if (Array.isArray(item.parts)) {
      for (const index in item.parts) insertPart(item.parts[index]);
    } else if (item.content) insertPart(item.content);

    // Complete
    contents.push(contentData);
  }

  // API Key
  setApiKey(apiKey) {
    this.#_apiKey = typeof apiKey === "string" ? apiKey : null;
  }

  // Models
  _setNextModelsPageToken(nextModelsPageToken) {
    this._nextModelsPageToken =
      typeof nextModelsPageToken === "string" ? nextModelsPageToken : null;
  }

  _setGetModels(getModels) {
    this._getModels = typeof getModels === "function" ? getModels : null;
  }

  getModels(pageSize = 50, pageToken = null) {
    if (typeof this._getModels === "function")
      return this._getModels(
        this.#_apiKey,
        pageSize,
        pageToken || this._nextModelsPageToken,
      );
    throw new Error("No model list api script defined.");
  }

  getModelsList() {
    return this.models;
  }

  _insertNewModel(model) {
    if (this.models.findIndex((item) => item.id === model.id) < 0) {
      const newData = {
        name: typeof model.name === "string" ? model.name : null,
        id: typeof model.id === "string" ? model.id : null,
        displayName:
          typeof model.displayName === "string" ? model.displayName : null,
        version: typeof model.version === "string" ? model.version : null,
        description:
          typeof model.description === "string" ? model.description : null,
        inputTokenLimit:
          typeof model.inputTokenLimit === "number"
            ? model.inputTokenLimit
            : null,
        outputTokenLimit:
          typeof model.outputTokenLimit === "number"
            ? model.outputTokenLimit
            : null,
        temperature:
          typeof model.temperature === "number" ? model.temperature : null,
        maxTemperature:
          typeof model.maxTemperature === "number"
            ? model.maxTemperature
            : null,
        topP: typeof model.topP === "number" ? model.topP : null,
        topK: typeof model.topK === "number" ? model.topK : null,
      };

      if (Array.isArray(model.supportedGenerationMethods)) {
        newData.supportedGenerationMethods = [];
        for (const index in model.supportedGenerationMethods) {
          if (typeof model.supportedGenerationMethods[index] === "string")
            newData.supportedGenerationMethods.push(
              model.supportedGenerationMethods[index],
            );
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

    if (typeof data.createTime === "string")
      newCache.createTime = data.createTime;

    if (typeof data.updateTime === "string")
      newCache.updateTime = data.updateTime;

    if (typeof data.expireTime === "string")
      newCache.expireTime = data.expireTime;

    if (typeof data.ttl === "string") newCache.ttl = data.ttl;

    if (typeof data.name === "string") newCache.name = data.name;

    if (typeof data.displayName === "string")
      newCache.displayName = data.displayName;

    if (typeof data.model === "string") newCache.model = data.model;

    // Content
    for (const index in data.contents) {
      const item = result.contents[index];
      this._buildContents(newCache.contents, item.content, item.content.role);
    }

    // System Instructions
    if (newCache.systemInstruction) {
      if (!Array.isArray(newCache.systemInstruction))
        newCache.systemInstruction = [];
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
    this._insertServerCache = typeof value === "function" ? value : null;
  }

  insertServerCache(name, data) {
    if (typeof this._insertServerCache === "function")
      return this._insertServerCache(this.#_apiKey, name, data);
    throw new Error("No insert cache api script defined.");
  }

  _setGetServerCache(value) {
    this._getServerCache = typeof value === "function" ? value : null;
  }

  // Fetch API
  _setGenContent(callback) {
    this._genContentApi = typeof callback === "function" ? callback : null;
  }

  genContent(data, isStream = false) {
    if (typeof this._genContentApi === "function")
      return this._genContentApi(this.#_apiKey, isStream, data);
    throw new Error("No content generator api script defined.");
  }

  // Model
  setModel(model) {
    if (model) {
      this.modelId = typeof model.id === "string" ? model.id : null;
      this.modelName = typeof model.name === "string" ? model.name : null;
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
    if (history && history[index]) return history[index];
    return null;
  }

  addHistoryData(data, id) {
    const selectedId = id || this._selectedHistory;
    if (this.history[selectedId]) {
      this.history[selectedId].data.push(data);
      return;
    }
    throw new Error("Invalid history id data!");
  }

  setHistorySystemInstruction(data, id) {
    const selectedId = id || this._selectedHistory;
    if (this.history[selectedId] && typeof data === "string") {
      this.history[selectedId].systemInstruction = data;
      return;
    }
    throw new Error("Invalid history id data!");
  }

  setHistoryModel(data, id) {
    const selectedId = id || this._selectedHistory;
    if (this.history[selectedId] && typeof data === "string") {
      this.history[selectedId].model = data;
      return;
    }
    throw new Error("Invalid history id data!");
  }

  startHistory(id, selected = false) {
    this.history[id] = { data: [], systemInstruction: null, model: null };
    if (selected) this.selectHistory(id);
    return this.history[id];
  }
}

// Localstorage Manager
class TinyAiStorage extends EventEmitter {
  constructor() {
    super();

    this._selected = localStorage.getItem("tiny-ai-storage-selected");
    if (typeof this._selected !== "string") this._selected = null;

    this.storage = localStorage.getItem("tiny-ai-storage");
    try {
      this.storage = JSON.parse(this.storage);
      if (!this.storage) this.storage = {};
    } catch {
      this.storage = {};
    }
  }

  _saveApiStorage() {
    localStorage.setItem("tiny-ai-storage", JSON.stringify(this.storage));
    this.emit("saveApiStorage", this.storage);
  }

  _updateExistsAi() {
    for (const item in this.storage) {
      if (
        typeof this.storage[item] === "string" &&
        this.storage[item].length > 0
      ) {
        this._selected = item;
        break;
      }
    }
    localStorage.setItem("tiny-ai-storage-selected", this._selected);
  }

  selectedAi() {
    return this._selected;
  }

  setApiKey(name, key) {
    if (typeof key === "string") {
      this.storage[name] = key;
      this._saveApiStorage();
      this._updateExistsAi();
      this.emit("setApiKey", name, key);
      return;
    }
    throw new Error("Invalid AI api key data type!");
  }

  delApiKey(name) {
    if (this.storage[name]) {
      delete this.storage[name];
      this._saveApiStorage();
      this._updateExistsAi();
      this.emit("delApiKey", name);
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

  // Read AI Apis
  const tinyAi = new TinyAIManager();
  const tinyStorage = new TinyAiStorage();
  let aiLogin = null;
  tinyAiScript.setAiLogin = (newAiLogin) => {
    aiLogin = newAiLogin;
  };

  // Detect Using AI
  appData.emitter.on("isUsingAI", (usingAI) => {
    if (usingAI) {
      $("body").addClass("is-using-ai");
    } else {
      $("body").removeClass("is-using-ai");
    }
  });

  // Test
  appData.ai.api = tinyAi;

  // Checker
  tinyAiScript.checkTitle = () => {
    // Get selected Ai
    const selectedAi = tinyStorage.selectedAi();

    // Exists Google only. Then select google generative
    if (selectedAi === "google-generative") {
      // Update html
      aiLogin.button.find("> i").removeClass("text-danger-emphasis");
      aiLogin.title = "AI Enabled";
      $("body").addClass("can-ai");

      // Update Ai API script
      setGoogleAi(tinyAi, tinyStorage.getApiKey("google-generative"));
    } else {
      // Update html
      aiLogin.button.find("> i").addClass("text-danger-emphasis");
      aiLogin.title = "AI Disabled";
      $("body").removeClass("can-ai");
    }

    // update login button
    aiLogin.button.attr("title", aiLogin.title);
    aiLogin.button.attr("data-bs-original-title", aiLogin.title);
  };

  // Login button
  tinyAiScript.login = () => {
    // Google AI
    const googleAi = {
      input: $("<input>", {
        type: "password",
        class: "form-control text-center",
      }),
      title: $("<h4>").text("Google Studio"),
      desc: $("<p>").append(
        $("<span>").text("You can get your Google API key "),
        $("<a>", {
          href: "https://aistudio.google.com/apikey",
          target: "_blank",
        }).text("here"),
        $("<span>").text(". Website: aistudio.google.com"),
      ),
    };

    googleAi.input.val(tinyStorage.getApiKey("google-generative"));

    // Modal
    tinyLib.modal({
      id: "ai_connection",
      title: "AI Protocol",
      dialog: "modal-lg",
      body: $("<center>").append(
        $("<p>").text(
          `You are in an optional setting. You do not need AI to use the website!`,
        ),
        $("<p>").text(
          `This website does not belong to any AI company, and all API input is stored locally inside your machine. This website is just a client to run prompts in artificial intelligence, there is no native artificial intelligence installed here.`,
        ),
        $("<p>").text(
          `By activating an artificial intelligence service in your session, you agree to the terms of use and privacy policies of the third party services you are using on this website. You will always be warned when any artificial intelligence service needs to be run on this website.`,
        ),

        googleAi.title,
        googleAi.desc,
        googleAi.input,

        $("<button>", { class: "btn btn-info m-4" })
          .text("Set API Tokens")
          .on("click", () => {
            tinyStorage.setApiKey("google-generative", googleAi.input.val());
            tinyAiScript.checkTitle();
            $("#ai_connection").modal("hide");
          }),
      ),
    });
  };

  // Open AI Page
  tinyAiScript.open = () => {
    // Update Url
    urlUpdate("ai");

    // Clear page
    clearFicData();
    $("#markdown-read").empty();
    $("#top_page").addClass("d-none");

    // Sidebar
    const sidebarStyle = {
      class: "bg-dark text-white p-3",
      style: "width: 250px; min-width: 250px;",
    };

    // Sidebar Button
    const createButtonSidebar = (icon, text, callback, disabled = false) =>
      $("<button>", {
        type: "button",
        class: `btn btn-link btn-bg text-start w-100${disabled ? " disabled" : ""}`,
      })
        .text(text)
        .prepend($("<i>", { class: `${icon} me-2` }))
        .on("click", callback)
        .prop("disabled", disabled);

    // Select Model
    const modelSelector = $("<select>", {
      class: "form-select",
      id: "select-ai-model",
    });
    const resetModelSelector = () => {
      modelSelector.empty();
      modelSelector.append($("<option>").text("None"));
    };

    resetModelSelector();

    // Token Count
    const tokenCount = {
      amount: $("<span>").text("0"),
      total: $("<span>").text("0"),
    };

    // Ranger Generator
    const tinyRanger = () => {
      const rangerBase = $("<div>", {
        class: "d-flex flex-row align-items-center",
      });
      const ranger = $("<input>", { type: "range", class: "form-range" });
      const rangerNumber = $("<input>", {
        type: "number",
        class: "form-control ms-2",
        style: "width: 70px; max-width: 70px; min-width: 70px;",
      });

      rangerBase.append(ranger, rangerNumber);
      return [rangerBase, ranger, rangerNumber];
    };

    // Output Length
    const outputLength = $("<input>", {
      type: "number",
      class: "form-control",
    });

    // Temperature
    const temperature = tinyRanger();
    // Top P
    const topP = tinyRanger();
    // Top K
    const topK = tinyRanger();
    // Presence penalty
    const presencePenalty = tinyRanger();
    // Frequency penalty
    const frequencyPenalty = tinyRanger();

    // Left
    const sidebarLeft = $("<div>", sidebarStyle).append(
      $("<ul>", { class: "list-unstyled" }).append(
        $("<li>", { class: "mb-3" }).append(
          // Templates
          $("<h5>").text("Chatbots"),

          createButtonSidebar(
            "fa-solid fa-server",
            "Main",
            () => {
              console.log("test");
            },
            true,
          ),

          // System Instructions
          $("<h5>").text("Settings"),
          createButtonSidebar(
            "fa-solid fa-toolbox",
            "System Instructions",
            () => {
              console.log("test");
            },
            true,
          ),

          // Prompt
          createButtonSidebar(
            "fa-solid fa-terminal",
            "Prompt",
            () => {
              console.log("test");
            },
            true,
          ),

          $("<hr/>", { class: "border-white" }),
          $("<div>", { class: "small text-grey" }).text(
            "AI makes mistakes, so double-check it. AI does not replace the fic literature.",
          ),
        ),
      ),
    );

    // Right
    const sidebarRightBase = {
      // Model Selector
      modelSelector: $("<div>", {
        class: "form-floating",
        title: "The AI model used here",
      }).append(
        modelSelector,
        $("<label>", { for: "select-ai-model" })
          .text("Select AI Model")
          .prepend($("<i>", { class: `fa-solid fa-atom me-2` })),
      ),

      // Token Counter
      tokenCounter: $("<div>", {
        class: "mt-3",
        title: "Counts how many tokens are used for the content generation",
      }).append(
        $("<span>")
          .text("Token count")
          .prepend($("<i>", { class: `fa-solid fa-magnifying-glass me-2` })),
        $("<div>", { class: "mt-1 small" }).append(
          tokenCount.amount,
          $("<span>", { class: "mx-1" }).text("/"),
          tokenCount.total,
        ),
      ),

      // Temperature
      temperature: $("<div>", {
        class: "mt-3",
        title: "Creativity allowed in the responses",
      }).append(
        $("<span>")
          .text("Temperature")
          .prepend(
            $("<i>", { class: `fa-solid fa-temperature-three-quarters me-2` }),
          ),
        temperature[0],
      ),

      // Output Length
      outputLength: $("<div>", {
        class: "mt-3",
        title: "Maximum number of tokens in response",
      }).append(
        $("<span>")
          .text("Output length")
          .prepend($("<i>", { class: `fa-solid fa-comment me-2` })),
        outputLength,
      ),

      // Top P
      topP: $("<div>", {
        class: "mt-3",
        title:
          "The maximum cumulative probability of tokens to consider when sampling",
      }).append(
        $("<span>")
          .text("Top P")
          .prepend($("<i>", { class: `fa-solid fa-percent me-2` })),
        topP[0],
      ),

      // Top K
      topK: $("<div>", {
        class: "mt-3",
        title: "The maximum number of tokens to consider when sampling",
      }).append(
        $("<span>")
          .text("Top K")
          .prepend($("<i>", { class: `fa-solid fa-0 me-2` })),
        topK[0],
      ),

      // Presence penalty
      presencePenalty: $("<div>", {
        class: "mt-3",
        title:
          "Presence penalty applied to the next token's logprobs if the token has already been seen in the response",
      }).append(
        $("<span>")
          .text("Presence penalty")
          .prepend($("<i>", { class: `fa-solid fa-hand me-2` })),
        presencePenalty[0],
      ),

      // Frequency penalty
      frequencyPenalty: $("<div>", {
        class: "mt-3",
        title:
          "Frequency penalty applied to the next token's logprobs, multiplied by the number of times each token has been seen in the respponse so far",
      }).append(
        $("<span>")
          .text("Frequency penalty")
          .prepend($("<i>", { class: `fa-solid fa-hand me-2` })),
        frequencyPenalty[0],
      ),
    };

    sidebarRightBase.tokenCounter.tooltip();
    sidebarRightBase.temperature.tooltip();
    sidebarRightBase.outputLength.tooltip();
    sidebarRightBase.topP.tooltip();
    sidebarRightBase.topK.tooltip();
    sidebarRightBase.presencePenalty.tooltip();
    sidebarRightBase.frequencyPenalty.tooltip();

    const sidebarRight = $("<div>", sidebarStyle).append(
      $("<ul>", { class: "list-unstyled" }).append(
        $("<h5>").text("Run Settings"),
        sidebarRightBase.modelSelector,
        sidebarRightBase.tokenCounter,
        sidebarRightBase.temperature,
        sidebarRightBase.outputLength,
        sidebarRightBase.topP,
        sidebarRightBase.topK,
        sidebarRightBase.presencePenalty,
        sidebarRightBase.frequencyPenalty,

        $("<hr/>"),

        // Reset Settings
        createButtonSidebar(
          "fa-solid fa-rotate-right",
          "Reset default settings",
          () => {
            console.log("test");
          },
        ),
      ),
    );

    // Input
    const msgInput = $("<input>", {
      type: "text",
      class: "form-control border-dark",
      placeholder: "Type your message...",
    });

    // Submit
    const msgSubmit = $("<button>", {
      class: "btn btn-primary input-group-text-dark",
      text: "Send",
    });

    // Message List
    const msgList = $("<div>", {
      class: "p-3",
      style: "margin-bottom: 55px !important;",
    });

    // Message Maker
    const makeMessage = (message = null, username = null) =>
      $("<div>", {
        class: `mb-3${typeof username !== "string" ? " d-flex flex-column align-items-end" : ""}`,
      }).append(
        $("<div>", {
          class: `bg-${typeof username === "string" ? "secondary d-inline-block" : "primary"} text-white p-2 rounded`,
        }).append($("<span>").text(message)),
        $("<div>", {
          class: `text-muted small mt-1${typeof username !== "string" ? " text-end" : ""}`,
          text: typeof username === "string" ? username : "User",
        }),
      );

    // Example test
    const msgExamples = () => {
      // Message from the bot
      msgList.append(makeMessage("Hello! How can I assist you today?", "Bot"));
      // Message from the user
      msgList.append(makeMessage("I have a question about your services."));
    };

    // Container
    const container = $("<div>", { class: "d-flex h-100 y-100" }).append(
      sidebarLeft,
      // Main container
      $("<div>", { class: "flex-grow-1 d-flex flex-column" }).append(
        $("<div>", { class: "justify-content-center h-100" }).append(
          // Chat Messages Area
          $("<div>", {
            class: "h-100 body-background",
            style: "overflow-y: auto; margin-bottom: -54px;",
          }).append(msgList),

          // Input Area
          $("<div>", { class: "px-3 d-inline-block w-100" }).append(
            $("<div>", { class: "input-group pb-3 body-background" }).append(
              msgInput,
              msgSubmit,
            ),
          ),
        ),
      ),
      sidebarRight,
    );

    // Enable Read Only
    const enableReadOnly = (isEnabled = true) => {
      msgSubmit.prop("disabled", isEnabled);
      msgInput.prop("disabled", isEnabled);
      outputLength.prop("disabled", isEnabled);

      temperature[1].prop("disabled", isEnabled);
      temperature[2].prop("disabled", isEnabled);

      topP[1].prop("disabled", isEnabled);
      topP[2].prop("disabled", isEnabled);

      topK[1].prop("disabled", isEnabled);
      topK[2].prop("disabled", isEnabled);

      presencePenalty[1].prop("disabled", isEnabled);
      presencePenalty[2].prop("disabled", isEnabled);

      frequencyPenalty[1].prop("disabled", isEnabled);
      frequencyPenalty[2].prop("disabled", isEnabled);

      if (isEnabled) {
        msgInput.addClass("disabled");
        msgSubmit.addClass("disabled");
        outputLength.addClass("disabled");

        temperature[1].addClass("disabled");
        temperature[2].addClass("disabled");

        topP[1].addClass("disabled");
        topP[2].addClass("disabled");

        topK[1].addClass("disabled");
        topK[2].addClass("disabled");

        presencePenalty[1].addClass("disabled");
        presencePenalty[2].addClass("disabled");

        frequencyPenalty[1].addClass("disabled");
        frequencyPenalty[2].addClass("disabled");
      } else {
        msgInput.removeClass("disabled");
        msgSubmit.removeClass("disabled");
        outputLength.removeClass("disabled");

        temperature[1].removeClass("disabled");
        temperature[2].removeClass("disabled");

        topP[1].removeClass("disabled");
        topP[2].removeClass("disabled");

        topK[1].removeClass("disabled");
        topK[2].removeClass("disabled");

        presencePenalty[1].removeClass("disabled");
        presencePenalty[2].removeClass("disabled");

        frequencyPenalty[1].removeClass("disabled");
        frequencyPenalty[2].removeClass("disabled");
      }
    };

    // Clear Messages
    const clearMessages = () => msgList.empty();

    enableReadOnly();

    // Welcome
    msgList.append(
      makeMessage(`Welcome to Pony Driland's chatbot!`, "Website"),
    );
    msgList.append(
      makeMessage(
        `You need to choose what you would like to do here and let's start the conversation`,
        "Website",
      ),
    );
    msgList.append(
      makeMessage(
        `The chat will not work until you choose an activity to do here`,
        "Website",
      ),
    );

    // Complete
    $("#markdown-read").append(container);
  };

  // Complete
  return tinyAiScript;
};
