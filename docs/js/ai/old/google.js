// Model Cache creator
// https://ai.google.dev/api/caching?hl=pt-br#method:-cachedcontents.create
tinyGoogleAI._setInsertServerCache(
  (apiKey, cacheName, data) =>
    new Promise((resolve, reject) => {
      let model = `models/${tinyGoogleAI.getModel()}`;
      const modelData = tinyGoogleAI
        .getModelsList()
        .find((tModel) => tModel.id === tinyGoogleAI.getModel());
      if (modelData) {
        model = modelData.name;
        if (!model.endsWith(`-${modelData.version}`))
          model += `-${modelData.version}`;
      }

      fetch(`${apiUrl}/cachedContents?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          requestBuilder(
            data,
            {
              model,
              // name: cacheName,
            },
            null,
            true,
          ),
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
        .catch(reject);
    }),
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
