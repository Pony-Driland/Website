const setGoogleAi = (
  tinyGoogleAI,
  GEMINI_API_KEY,
  MODEL_DATA = {
    id: "gemini-1.5-flash",
    name: "models/gemini-1.5-flash-001",
  },
) => {
  const apiUrl = "https://generativelanguage.googleapis.com/v1beta";
  tinyGoogleAI.setApiKey(GEMINI_API_KEY);
  tinyGoogleAI.setModel(MODEL_DATA);

  // Build Error
  const buildErrorData = (result, finalData) => {
    finalData.error = {
      code: typeof result.error.code === "number" ? result.error.code : null,
      message:
        typeof result.error.message === "string" ? result.error.message : null,
      status:
        typeof result.error.status === "string" ? result.error.status : null,
    };

    if (result.error.details) finalData.error.details = result.error.details;
  };

  // Build Request
  const requestBuilder = (data, config = {}, cache = null) => {
    const requestBody = { safetySettings: [] };

    // Model
    if (typeof config.model === "string") requestBody.model = config.model;

    // Expiration
    if (typeof config.ttl === "string") requestBody.ttl = config.ttl;

    // Expiration
    if (typeof config.name === "string") requestBody.name = config.name;

    // Execute builder
    for (const index in data) {
      const item = data[index];

      if (item.role !== "system") {
        if (!Array.isArray(requestBody.contents)) requestBody.contents = [];
        tinyGoogleAI._buildContents(requestBody.contents, item, item.role);
      } else {
        if (!Array.isArray(requestBody.systemInstruction))
          requestBody.systemInstruction = [];
        tinyGoogleAI._buildContents(requestBody.systemInstruction, item);
        requestBody.systemInstruction = requestBody.systemInstruction[0];
      }
    }

    // Config
    requestBody.generationConfig = {};
    if (typeof tinyGoogleAI.getMaxOutputTokens() === "number")
      requestBody.generationConfig.maxOutputTokens =
        tinyGoogleAI.getMaxOutputTokens();

    if (typeof tinyGoogleAI.getTemperature() === "number")
      requestBody.generationConfig.temperature = tinyGoogleAI.getTemperature();

    if (typeof tinyGoogleAI.getTopP() === "number")
      requestBody.generationConfig.topP = tinyGoogleAI.getTopP();

    if (typeof tinyGoogleAI.getTopK() === "number")
      requestBody.generationConfig.topK = tinyGoogleAI.getTopK();

    if (typeof tinyGoogleAI.getPresencePenalty() === "number")
      requestBody.generationConfig.presencePenalty =
        tinyGoogleAI.getPresencePenalty();

    if (typeof tinyGoogleAI.getFrequencyPenalty() === "number")
      requestBody.generationConfig.frequencyPenalty =
        tinyGoogleAI.getFrequencyPenalty();

    if (typeof tinyGoogleAI.isEnabledEnchancedCivicAnswers() === "boolean")
      requestBody.generationConfig.enableEnhancedCivicAnswers =
        tinyGoogleAI.isEnabledEnchancedCivicAnswers();

    // Cache
    if (cache) requestBody.cachedContent = cache;

    // Complete
    return requestBody;
  };

  // The Fetch API
  // https://ai.google.dev/api/generate-content?hl=pt-br#method:-models.generatecontent
  tinyGoogleAI._setGenContent(
    (apiKey, isStream, data) =>
      new Promise((resolve, reject) =>
        fetch(
          `${apiUrl}/models/${tinyGoogleAI.getModel().id}:${!isStream ? "generateContent" : "streamGenerateContent"}?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBuilder(data)),
          },
        )
          // Request
          .then((res) => res.json())
          .then((result) => {
            // Prepare final data
            const finalData = { _response: result };
            if (!result.error) {
              // Content
              finalData.contents = [];

              // Model Version
              finalData.modelVersion =
                typeof result.modelVersion === "string"
                  ? result.modelVersion
                  : null;

              // Token Usage
              finalData.tokenUsage = {
                count: {
                  candidates: null,
                  prompt: null,
                  total: null,
                },
              };

              // Token Usage
              let needShowMetadataError = false;
              if (result.usageMetadata) {
                // Candidates
                if (
                  typeof result.usageMetadata.candidatesTokenCount === "number"
                )
                  finalData.tokenUsage.count.candidates =
                    result.usageMetadata.candidatesTokenCount;
                else needShowMetadataError = true;

                // Prompt
                if (typeof result.usageMetadata.promptTokenCount === "number")
                  finalData.tokenUsage.count.prompt =
                    result.usageMetadata.promptTokenCount;
                else needShowMetadataError = true;

                // Total
                if (typeof result.usageMetadata.totalTokenCount === "number")
                  finalData.tokenUsage.count.total =
                    result.usageMetadata.totalTokenCount;
                else needShowMetadataError = true;
              }
              // Error
              else needShowMetadataError = true;
              if (needShowMetadataError) {
                console.error(
                  "Usage Metadata not found in the Google AI result.",
                );
                console.log(result);
              }

              // Build content
              if (Array.isArray(result.candidates)) {
                for (const index in result.candidates) {
                  const item = result.candidates[index];
                  if (item.content) {
                    // Finished reason
                    let finishReason = null;
                    if (typeof item.finishReason === "string")
                      finishReason = item.finishReason.toUpperCase();

                    // Build content
                    tinyGoogleAI._buildContents(
                      finalData.contents,
                      item.content,
                      item.content.role,
                    );
                    finalData.contents[
                      finalData.contents.length - 1
                    ].finishReason = finishReason;
                  }
                }
              }
            }

            // Error result
            else buildErrorData(result, finalData);

            // Complete
            resolve(finalData);
          })
          // Error
          .catch(reject),
      ),
  );

  // Model Cache creator
  // https://ai.google.dev/api/caching?hl=pt-br#method:-cachedcontents.create
  tinyGoogleAI._setInsertServerCache(
    (apiKey, cacheName, data) =>
      new Promise((resolve, reject) =>
        fetch(`${apiUrl}/cachedContents?key=${encodeURIComponent(apiKey)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            requestBuilder(data, {
              model: tinyGoogleAI.getModel().name,
              name: cacheName,
            }),
          ),
        })
          // Request
          .then((res) => res.json())
          .then((result) => {
            // Prepare final data
            const finalData = { _response: result };
            if (!result.error)
              finalData.data = tinyGoogleAI._insertCache(cacheName, result);
            // Error result
            else buildErrorData(result, finalData);

            // Complete
            resolve(finalData);
          })
          // Error
          .catch(reject),
      ),
  );

  // https://ai.google.dev/api/caching?hl=pt-br#method:-cachedcontents.get
  tinyGoogleAI._setGetServerCache(
    (apiKey, cacheName) =>
      new Promise((resolve, reject) =>
        fetch(
          `${apiUrl}/cachedContents/${cacheName}?key=${encodeURIComponent(apiKey)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        )
          // Request
          .then((res) => res.json())
          .then((result) => {
            // Prepare final data
            const finalData = { _response: result };
            if (!result.error)
              finalData.data = tinyGoogleAI._insertCache(cacheName, result);
            // Error result
            else buildErrorData(result, finalData);

            // Complete
            resolve(finalData);
          })
          // Error
          .catch(reject),
      ),
  );

  // Models
  // https://ai.google.dev/api/models?hl=pt_br#method:-models.list
  tinyGoogleAI._setGetModels(
    (apiKey, pageSize, pageToken) =>
      new Promise((resolve, reject) =>
        fetch(
          `${apiUrl}/models?key=${encodeURIComponent(apiKey)}&pageSize=${encodeURIComponent(pageSize)}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        )
          // Request
          .then((res) => res.json())
          .then((result) => {
            // Prepare final data
            const finalData = { _response: result };
            if (!result.error) {
              finalData.newData = [];

              // Update Token
              tinyGoogleAI._setNextModelsPageToken(result.nextPageToken);

              for (const index in result.models) {
                const newModel = {
                  name: result.models[index].name,
                  id: result.models[index].baseModelId,
                  displayName: result.models[index].displayName,
                  version: result.models[index].version,
                  description: result.models[index].description,
                  inputTokenLimit: result.models[index].inputTokenLimit,
                  outputTokenLimit: result.models[index].outputTokenLimit,
                  temperature: result.models[index].temperature,
                  maxTemperature: result.models[index].maxTemperature,
                  topP: result.models[index].topP,
                  topK: result.models[index].topK,
                  supportedGenerationMethods:
                    result.models[index].supportedGenerationMethods,
                };

                if (!newModel.id) {
                  newModel.id = newModel.name;
                  if (!newModel.id.endsWith(`-${newModel.version}`))
                    newModel.id += `-${newModel.version}`;
                }

                const inserted = tinyGoogleAI._insertNewModel(newModel);
                if (inserted) finalData.newData.push(inserted);
              }
            }

            // Error result
            else buildErrorData(result, finalData);

            // Complete
            resolve(finalData);
          })
          // Error
          .catch(reject),
      ),
  );
};
