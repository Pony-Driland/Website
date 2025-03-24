class TinyAiApi {
  #_apiKey;

  constructor() {
    // Cache
    this.cache = {};
    this._insertServerCache = null;
    this._getServerCache = null;
  }

  // Content
  _createContentData(data) {
    const newCache = { contents: [] };

    if (typeof data.createTime === 'string') newCache.createTime = data.createTime;

    if (typeof data.updateTime === 'string') newCache.updateTime = data.updateTime;

    if (typeof data.expireTime === 'string') newCache.expireTime = data.expireTime;

    if (typeof data.ttl === 'string') newCache.ttl = data.ttl;

    if (typeof data.name === 'string') newCache.name = data.name;

    if (typeof data.displayName === 'string') newCache.displayName = data.displayName;

    if (typeof data.model === 'string') newCache.model = data.model;

    // Content
    for (const index in data.contents) {
      const item = result.contents[index];
      this.buildContents(newCache.contents, item.content, item.content.role);
    }

    // System Instructions
    if (newCache.systemInstruction) {
      if (!Array.isArray(newCache.systemInstruction)) newCache.systemInstruction = [];
      this.buildContents(newCache.systemInstruction, data.systemInstruction);
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
      return this._insertServerCache(this.#_apiKey, name, data);
    throw new Error('No insert cache api script defined.');
  }

  _setGetServerCache(value) {
    this._getServerCache = typeof value === 'function' ? value : null;
  }
}

// Get fic cache
const getFicCache = (id, instructionId, newContent) => {
  // Final Result
  $.LoadingOverlay('show', { background: 'rgba(0,0,0, 0.5)' });
  const finalResolve = (cacheContent) => {
    console.log(cacheContent);
    $.LoadingOverlay('hide');
  };

  // Get Data
  const oldCache = tinyAi.getCache(id);
  if (!oldCache) {
    newContent()
      .then((ficData) =>
        tinyAi
          .insertServerCache(id, [
            {
              role: 'system',
              parts: [{ text: aiTemplates.instructions[instructionId] }],
            },
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mime_type: ficData.mime,
                    data: Base64.encode(ficData.data),
                  },
                },
              ],
            },
          ])
          .then((result) => {
            if (result.data) finalResolve(result.data);
            else if (result.error) {
              console.error(result.error);
              alert(result.error.message);
              $.LoadingOverlay('hide');
            }
          }),
      )
      .catch((err) => {
        console.error(err);
        alert(err.message);
        $.LoadingOverlay('hide');
      });
  }
  // Use cache data
  else finalResolve(result.data);
};
