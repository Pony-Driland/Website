const setGoogleAi = (
  tinyGoogleAI,
  GEMINI_API_KEY,
  MODEL_DATA = "gemini-1.5-flash",
) => {
  const apiUrl = "https://generativelanguage.googleapis.com/v1beta";
  tinyGoogleAI.setApiKey(GEMINI_API_KEY);
  tinyGoogleAI.setModel(MODEL_DATA);

  // Error codes
  const errorCodes = {
    100: "Continue",
    101: "Switching Protocols",
    102: "Processing",
    103: "Early Hints",
    200: "OK",
    201: "Created",
    202: "Accepted",
    203: "Non-Authoritative Information",
    204: "No Content",
    205: "Reset Content",
    206: "Partial Content",
    207: "Multi-Status",
    208: "Already Reported",
    226: "IM Used",
    300: "Multiple Choices",
    301: "Moved Permanently",
    302: "Found",
    303: "See Other",
    304: "Not Modified",
    305: "Use Proxy",
    306: "Switch Proxy",
    307: "Temporary Redirect",
    308: "Permanent Redirect",
    400: "Bad Request",
    401: "Unauthorized",
    402: "Payment Required",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    406: "Not Acceptable",
    407: "Proxy Authentication Required",
    408: "Request Timeout",
    409: "Conflict",
    410: "Gone",
    411: "Length Required",
    412: "Precondition Failed",
    413: "Payload Too Large",
    414: "URI Too Long",
    415: "Unsupported Media Type",
    416: "Range Not Satisfiable",
    417: "Expectation Failed",
    418: "I'm a teapot",
    421: "Misdirected Request",
    422: "Unprocessable Entity",
    423: "Locked",
    424: "Failed Dependency",
    425: "Too Early",
    426: "Upgrade Required",
    428: "Precondition Required",
    429: "Too Many Requests",
    431: "Request Header Fields Too Large",
    451: "Unavailable For Legal Reasons",
    500: "Internal Server Error",
    501: "Not Implemented",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
    505: "HTTP Version Not Supported",
    506: "Variant Also Negotiates",
    507: "Insufficient Storage",
    508: "Loop Detected",
    510: "Not Extended",
    511: "Network Authentication Required",
    520: "Web Server Returned an Unknown Error",
    521: "Web Server Is Down",
    522: "Connection Timed Out",
    523: "Origin Is Unreachable",
    524: "A Timeout Occurred",
    525: "SSL Handshake Failed",
    526: "Invalid SSL Certificate",
    527: "Railgun Error",
    530: "Site Frozen",
    598: "Network Read Timeout Error",
    599: "Network Connect Timeout Error",

    // Nginx
    444: "No Response",
    494: "Request Header Too Large",
    495: "SSL Certificate Error",
    496: "SSL Certificate Required",
    497: "HTTP Request Sent to HTTPS Port",
    499: "Client Closed Request",
  };

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
  const requestBuilder = (
    data,
    config = {},
    cache = null,
    cacheMode = false,
  ) => {
    const requestBody = {};
    if (!cacheMode) requestBody.safetySettings = [];

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
    if (!cacheMode) {
      requestBody.generationConfig = {};
      if (typeof tinyGoogleAI.getMaxOutputTokens() === "number")
        requestBody.generationConfig.maxOutputTokens =
          tinyGoogleAI.getMaxOutputTokens();

      if (typeof tinyGoogleAI.getTemperature() === "number")
        requestBody.generationConfig.temperature =
          tinyGoogleAI.getTemperature();

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
    }

    // Cache
    if (cache) requestBody.cachedContent = cache;

    // Complete
    return requestBody;
  };

  // The Fetch API
  // https://ai.google.dev/api/generate-content?hl=pt-br#method:-models.generatecontent
  tinyGoogleAI._setGenContent(
    (apiKey, isStream, data, streamingCallback, controller) =>
      new Promise((resolve, reject) => {
        // Usage metadata
        const buildUsageMetada = (result) => {
          const usageMetadata = {
            count: {
              candidates: null,
              prompt: null,
              total: null,
            },
          };

          let needShowMetadataError;
          if (result.usageMetadata) {
            // Candidates
            if (typeof result.usageMetadata.candidatesTokenCount === "number")
              usageMetadata.count.candidates =
                result.usageMetadata.candidatesTokenCount;
            else needShowMetadataError = true;

            // Prompt
            if (typeof result.usageMetadata.promptTokenCount === "number")
              usageMetadata.count.prompt =
                result.usageMetadata.promptTokenCount;
            else needShowMetadataError = true;

            // Total
            if (typeof result.usageMetadata.totalTokenCount === "number")
              usageMetadata.count.total = result.usageMetadata.totalTokenCount;
            else needShowMetadataError = true;
          }
          // Error
          else needShowMetadataError = true;

          return [usageMetadata, needShowMetadataError];
        };

        // Build content
        const buildContent = (result, finalData) => {
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
                finalData.contents[finalData.contents.length - 1].finishReason =
                  finishReason;
              }
            }
          }
        };

        const finalPromise = (result) => {
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
            const [tokenUsage, needShowMetadataError] =
              buildUsageMetada(result);
            finalData.tokenUsage = tokenUsage;
            if (needShowMetadataError) {
              console.error(
                "Usage Metadata not found in the Google AI result.",
              );
              console.log(result);
            }

            // Build content
            buildContent(result, finalData);
          }

          // Error result
          else buildErrorData(result, finalData);

          // Complete
          return finalData;
        };

        // Streaming response
        const streamingResponse = async (stream) => {
          try {
            const reader = stream.getReader();
            const decoder = new TextDecoder("utf-8");
            let done = false;
            let countData = 0;
            let streamResult = {};
            const streamCache = [];

            // Read streaming
            while (!done) {
              if (reader && typeof reader.read === "function") {
                const { value, done: streamDone } = await reader.read();
                done = streamDone;
                if (value) {
                  const chunk = decoder.decode(value, { stream: true });
                  if (!done) {
                    try {
                      const jsonChunk = JSON.parse(
                        `${countData > 0 ? `[${chunk.substring(1)}` : chunk}]`,
                      );

                      // Send temp data
                      const result = jsonChunk[0];
                      if (result) {
                        const tinyData = { contents: [] };
                        buildContent(result, tinyData);

                        const tinyResult = {
                          tokenUsage: buildUsageMetada(result)[0],
                        };

                        for (const index in tinyData.contents) {
                          if (!Array.isArray(streamCache[index]))
                            streamCache[index] = [];
                          for (const index2 in tinyData.contents[index].parts) {
                            const item = tinyData.contents[index].parts[index2];
                            if (typeof item.text === "string") {
                              if (!streamCache[index][index2])
                                streamCache[index][index2] = {};

                              if (
                                typeof streamCache[index][index2].text !==
                                "string"
                              )
                                streamCache[index][index2].text = "";

                              streamCache[index][index2].text += item.text;
                              item.text = streamCache[index][index2].text;

                              if (
                                typeof tinyData.contents[index].role ===
                                "string"
                              )
                                streamCache[index][index2].role =
                                  tinyData.contents[index].role;
                            }
                          }
                        }

                        // Complete
                        streamResult = result;
                        tinyResult.contents = tinyData.contents;
                        tinyResult.done = false;
                        streamingCallback(tinyResult);
                      }
                    } catch {}
                  }
                }
                countData++;
              } else done = true;
            }

            // Complete
            streamingCallback({ done: true });
            const finalData = finalPromise(streamResult);
            for (const index in finalData.contents) {
              for (const index2 in finalData.contents[index].parts) {
                if (
                  typeof finalData.contents[index].parts[index2].text ===
                  "string"
                )
                  finalData.contents[index].parts[index2].text =
                    streamCache[index][index2];
              }
            }
            resolve(finalData);
          } catch (err) {
            reject(err);
          }
        };

        // Request
        const fetchRequest = fetch(
          `${apiUrl}/models/${tinyGoogleAI.getModel()}:${!isStream ? "generateContent" : "streamGenerateContent"}?key=${encodeURIComponent(apiKey)}`,
          {
            signal: controller ? controller.signal : undefined,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBuilder(data)),
          },
        );

        // Normal

        // Request
        fetchRequest
          .then((res) => {
            // Normal
            if (!isStream)
              res
                .json()
                .then((result) => resolve(finalPromise(result)))
                .catch(reject);
            else {
              // Error Streaming
              if (!res.body) reject(new Error("No AI streaming value found."));
              else if (!res.ok)
                reject(
                  new Error(
                    `Error ${typeof res.status === "number" ? `HTTP ${res.status}` : "UNKNOWN ERROR"}: ${
                      typeof res.statusText === "string"
                        ? res.statusText.length > 0
                          ? res.statusText
                          : typeof errorCodes[Number(res.status)] === "string"
                            ? errorCodes[Number(res.status)]
                            : "???"
                        : "Unknown"
                    }`,
                  ),
                );
              // Streaming
              else streamingResponse(res.body);
            }
          })
          // Error
          .catch(reject);
      }),
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

              // Categories
              const newModels = [
                {
                  category: "main",
                  index: 0,
                  displayName: "--> Main models",
                  data: [],
                },
                {
                  category: "exp",
                  index: 1,
                  displayName: "--> Experimental models",
                  data: [],
                },
                {
                  category: "others",
                  index: 2,
                  displayName: "--> Other models",
                  data: [],
                },
              ];
              const modelOrder = {
                "gemini-2.0-flash": { index: 0, category: "main" },
                "gemini-1.5-flash": { index: 1, category: "main" },
                "gemini-1.5-pro": { index: 2, category: "main" },
                "gemini-1.0-pro": { index: 3, category: "main" },
                "gemini-2.0-flash-exp": { index: 0, category: "exp" },
              };

              // Read models
              console.log("[Google Generative] Models list", result.models);
              for (const index in result.models) {
                const id = result.models[index].name.substring(7);
                let allowed = false;
                for (const id2 in modelOrder) {
                  if (id.startsWith(id2) || id === id2) allowed = true;
                }

                // Allow add the model
                if (allowed) {
                  // Add custom order
                  if (
                    modelOrder[id] &&
                    typeof modelOrder[id].index === "number"
                  )
                    result.models[index]._NEW_ORDER = modelOrder[id].index;
                  else result.models[index]._NEW_ORDER = 999999;

                  // Add Category
                  if (
                    modelOrder[id] &&
                    typeof modelOrder[id].category === "string"
                  ) {
                    const category = newModels.find(
                      (item) => item.category === modelOrder[id].category,
                    );
                    if (category) category.data.push(result.models[index]);
                    // Nope
                    else
                      newModels[newModels.length - 1].data.push(
                        result.models[index],
                      );
                  } else
                    newModels[newModels.length - 1].data.push(
                      result.models[index],
                    );
                }
              }

              // Send data
              for (const index in newModels) {
                for (const index2 in newModels[index].data) {
                  const newModel = {
                    _response: newModels[index].data[index2],
                    category: {
                      displayName: newModels[index].displayName,
                      id: newModels[index].category,
                      index: newModels[index].index,
                    },
                    index: newModels[index].data[index2]._NEW_ORDER,
                    name: newModels[index].data[index2].name,
                    id: newModels[index].data[index2].name.substring(7),
                    displayName: newModels[index].data[index2].displayName,
                    version: newModels[index].data[index2].version,
                    description: newModels[index].data[index2].description,
                    inputTokenLimit:
                      newModels[index].data[index2].inputTokenLimit,
                    outputTokenLimit:
                      newModels[index].data[index2].outputTokenLimit,
                    temperature: newModels[index].data[index2].temperature,
                    maxTemperature:
                      newModels[index].data[index2].maxTemperature,
                    topP: newModels[index].data[index2].topP,
                    topK: newModels[index].data[index2].topK,
                    supportedGenerationMethods:
                      newModels[index].data[index2].supportedGenerationMethods,
                  };

                  const inserted = tinyGoogleAI._insertNewModel(newModel);
                  if (inserted) finalData.newData.push(inserted);
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
};
