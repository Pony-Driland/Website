import { objType } from './lib/objChecker';

/**
 * TinySQL is a wrapper for basic SQL operations on a local storage abstraction.
 * It supports inserting, updating, deleting, querying and joining JSON-based structured data.
 */
class TinySQL {
  #appStorage;
  #settings;
  #conditions;

  constructor() {
    this.debug = false;

    // Predefined condition operator mappings used in searches
    this.#conditions = {
      LIKE: (condition) => ({
        operator: 'LIKE',
        value: `${typeof condition.likePosition !== 'string' || condition.likePosition === 'left' ? '%' : ''}${value}${typeof condition.likePosition !== 'string' || condition.likePosition === 'right' ? '%' : ''}`,
      }),
      NOT: () => ({ operator: '!=' }),
      '===': () => ({ operator: '=' }),
      '!==': () => ({ operator: '!=' }),
      '>=': () => ({ operator: '>=' }),
      '<=': () => ({ operator: '<=' }),
      '>': () => ({ operator: '>' }),
      '<': () => ({ operator: '<' }),
    };

    // Helpers for JSON operations within SQL queries
    this.jsonOp = {
      // WHERE json_extract(data, '$.name') = 'Rainbow Queen' | Search exact value inside json
      /**
       * Extracts a JSON key from a field using SQLite's json_extract.
       * @param {string} name - The key to extract.
       * @param {string} [where='data'] - The field to search in.
       */
      extract: (name, where = 'data') => `json_extract(${where}, '$.${name}')`,
      // FROM json_each(json_extract(data, '$.tags')) | Search inside a array
      /**
       * Unrolls a JSON array into multiple rows using json_each.
       * @param {string} name - The key to iterate over.
       * @param {string} [where='data'] - The field to search in.
       */
      each: (name, where = 'data') => `json_each(${this.jsonOp.extract(name, where)})`,
      // WHERE CAST(json_extract(data, '$.level') AS INTEGER) > 10 | Filter by a numerical value within JSON
      /**
       * Extracts a key and casts it to an integer for numeric comparisons.
       * @param {string} name - The key to convert.
       * @param {string} [where='data'] - The field to search in.
       */
      filterNumber: (name, where = 'data') =>
        `CAST(${this.jsonOp.extract(name, where)} AS INTEGER)`,
    };

    // Aliases for alternative comparison operators
    this.#conditions['='] = this.#conditions['==='];
    this.#conditions['!='] = this.#conditions['!=='];
  }

  /**
   * Parses JSON fields from result rows if marked in the settings.
   * @private
   * @param {object} result - The result row to check.
   * @returns {object}
   */
  #jsonChecker(result) {
    if (objType(result, 'object')) {
      for (const item in result) {
        if (this.#settings.json.indexOf(item) > -1) {
          try {
            result[item] = JSON.parse(result[item]);
          } catch {
            result[item] = null;
          }
        }
      }
    }
    return result;
  }

  /**
   * Set the storage adapter and database settings.
   * @param {object} appStorage - Object with methods like getSingleData, getAllData, runQuery.
   * @param {object} [settings={}] - Configuration settings for the table and behavior.
   */
  setDb(appStorage, settings = {}) {
    if (typeof settings.select !== 'string') settings.select = '*';
    if (!Array.isArray(settings.json)) settings.json = [];
    if (typeof settings.join !== 'string') settings.join = null;
    if (typeof settings.joinCompare !== 'string' && settings.join)
      settings.joinCompare = 't.key = j.key';
    if (typeof settings.order !== 'string') settings.order = null;
    if (typeof settings.id !== 'string') settings.id = 'key';
    if (typeof settings.subId !== 'string') settings.subId = null;
    this.#appStorage = appStorage;
    this.#settings = settings;
  }

  /**
   * Enables or disables debug output to console.
   * @param {boolean} [isDebug=false]
   */
  setDebug(isDebug = false) {
    this.debug = typeof isDebug === 'boolean' ? isDebug : false;
  }

  /**
   * Check if a row with the given ID (and optional subId) exists.
   * @param {string|number} id - Primary key value.
   * @param {string|number} [subId] - Optional sub-ID for composite key.
   * @returns {Promise<boolean>}
   */
  async has(id, subId) {
    const useSub = this.#settings.subId && subId ? true : false;
    const params = [id];
    const query = `SELECT COUNT(*) FROM ${this.#settings.name} WHERE ${this.#settings.id} = ?${useSub ? ` AND ${this.#settings.subId} = ?` : ''}`;
    if (useSub) params.push(subId);

    const result = await this.#appStorage.getSingleData(query, params);
    if (this.debug) console.log('[sql] [has]', query, params, result);
    return result['COUNT(*)'] === 1;
  }

  /**
   * Update an existing record with given data.
   * Will not insert if the record doesn't exist.
   * @param {string|number} id - Primary key value.
   * @param {object} valueObj - Data to update.
   * @returns {Promise<object|null>} Null if no rows were updated.
   */
  async update(id, valueObj = {}) {
    const results = [];

    const columns = Object.keys(valueObj);
    const values = Object.values(valueObj).map((v) =>
      typeof v === 'object' ? JSON.stringify(v) : v,
    );
    const setClause = columns.map((col) => `${col} = ?`).join(', ');

    const useSub = this.#settings.subId && typeof valueObj[this.#settings.subId] !== 'undefined';
    const query = `UPDATE ${this.#settings.name} SET ${setClause} WHERE ${this.#settings.id} = ?${useSub ? ` AND ${this.#settings.subId} = ?` : ''}`;
    const params = [...values, id];
    if (useSub) params.push(valueObj[this.#settings.subId]);

    const mainResult = await this.#appStorage.runQuery(query, params);
    results.push(mainResult);
    if (this.debug) console.log('[sql] [update]', query, params, mainResult);

    if (mainResult?.changes === 0 || mainResult?.rowsAffected === 0) return null; // No record updated
    return results[0] || null;
  }

  /**
   * Insert or update a record with given data.
   * @param {string|number} id - Primary key value.
   * @param {object} valueObj - Data to store.
   * @returns {Promise<object>}
   */
  async set(id, valueObj = {}) {
    const results = [];
    const columns = Object.keys(valueObj);
    const values = Object.values(valueObj).map((v) =>
      typeof v === 'object' ? JSON.stringify(v) : v,
    );
    const placeholders = columns.map(() => '?').join(', ');
    const updateClause = columns.map((col) => `${col} = excluded.${col}`).join(', ');

    const query = `INSERT INTO ${this.#settings.name} (${this.#settings.id}, ${columns.join(', ')}) 
                   VALUES (?, ${placeholders}) 
                   ON CONFLICT(${this.#settings.id}${this.#settings.subId ? `, ${this.#settings.subId}` : ''}) DO UPDATE SET ${updateClause}`;

    results.push(await this.#appStorage.runQuery(query, [id, ...values]));
    if (this.debug) console.log('[sql] [set]', query, [id, ...values], results[results.length - 1]);
    return results[0] || [];
  }

  /**
   * Get a record by its ID (and optional subId).
   * @param {string|number} id - Primary key value.
   * @param {string|number} [subId] - Optional sub-ID for composite key.
   * @returns {Promise<object|null>}
   */
  async get(id, subId) {
    const useSub = this.#settings.subId && subId ? true : false;
    const params = [id];
    const joinClause = this.#settings.join
      ? `LEFT JOIN ${this.#settings.join} j ON ${this.#settings.joinCompare || ''}`
      : '';
    const query = `SELECT ${this.#settings.select} FROM ${this.#settings.name} t 
                   ${joinClause} WHERE t.${this.#settings.id} = ?${useSub ? ` AND t.${this.#settings.subId} = ?` : ''}`;
    if (useSub) params.push(subId);
    const result = this.#jsonChecker(await this.#appStorage.getSingleData(query, params));
    if (this.debug) console.log('[sql] [get]', query, params, result);
    if (!result) return null;
    return result;
  }

  /**
   * Delete a record by its ID (and optional subId).
   * @param {string|number} id - Primary key value.
   * @param {string|number} [subId] - Optional sub-ID for composite key.
   * @returns {Promise<object>}
   */
  async delete(id, subId) {
    const useSub = this.#settings.subId && subId ? true : false;
    const query = `DELETE FROM ${this.#settings.name} WHERE ${this.#settings.id} = ?${useSub ? ` AND ${this.#settings.subId} = ?` : ''}`;
    const params = [id];
    if (useSub) params.push(subId);

    const result = this.#appStorage.runQuery(query, params);
    if (this.debug) console.log('[sql] [delete]', query, params, result);
    return result;
  }

  /**
   * Get a limited number of rows from the database.
   * @param {number} count - Number of rows to retrieve.
   * @returns {Promise<object[]>}
   */
  async getAmount(count) {
    const joinClause = this.#settings.join
      ? `LEFT JOIN ${this.#settings.join} j ON ${this.#settings.joinCompare || ''}`
      : '';
    const orderClause = this.#settings.order ? `ORDER BY ${this.#settings.order}` : '';
    const query = `SELECT ${this.#settings.select} FROM ${this.#settings.name} t 
                   ${joinClause} 
                   ${orderClause} LIMIT ?`;
    const results = await this.#appStorage.getAllData(query, [count]);
    for (const index in results) this.#jsonChecker(results[index]);

    if (this.debug) console.log('[sql] [getAmount]', query, [id], results);
    return results;
  }

  /**
   * Get all records from the table.
   * @returns {Promise<object[]>}
   */
  async getAll() {
    const joinClause = this.#settings.join
      ? `LEFT JOIN ${this.#settings.join} j ON ${this.#settings.joinCompare || ''}`
      : '';
    const orderClause = this.#settings.order ? `ORDER BY ${this.#settings.order}` : '';
    const query = `SELECT ${this.#settings.select} FROM ${this.#settings.name} t 
                   ${joinClause} 
                   ${orderClause}`;
    const results = await this.#appStorage.getAllData(query);
    for (const index in results) this.#jsonChecker(results[index]);

    if (this.debug) console.log('[sql] [getAll]', query, results);
    return results;
  }

  /**
   * Perform a filtered search with given criteria.
   * @param {object} [criteria={}] - Conditions with optional operators and logical operators.
   * @returns {Promise<object[]>}
   */
  async search(criteria = {}) {
    const conditions = [];
    const values = [];

    for (const col in criteria) {
      const condition = criteria[col];
      let operator = '=';
      let value = condition.value;

      if (condition.operator) {
        const selected = condition.operator.toUpperCase();
        if (typeof this.#conditions[selected] === 'function') {
          const result = this.#conditions[selected](condition);
          if (typeof result.operator === 'string') operator = result.operator;
          if (typeof result.value === 'string') operator = result.value;
        }
      }

      const logicalOp = condition.logicalOperator ? condition.logicalOperator.toUpperCase() : 'AND';
      conditions.push(`${conditions.length ? logicalOp + ' ' : ''}${col} ${operator} ?`);
      values.push(value);
    }

    const joinClause = this.#settings.join
      ? `LEFT JOIN ${this.#settings.join} j ON ${this.#settings.joinCompare || ''}`
      : '';
    const orderClause = this.#settings.order ? `ORDER BY ${this.#settings.order}` : '';
    const whereClause = conditions.length ? `WHERE ${conditions.join(' ')}` : '';

    const query = `SELECT ${this.#settings.select} FROM ${this.#settings.name} t 
                   ${joinClause} 
                   ${whereClause} 
                   ${orderClause}`;

    const results = await this.#appStorage.getAllData(query, values);
    for (const index in results) this.#jsonChecker(results[index]);

    if (this.debug) console.log('[sql] [search]', query, values, results);
    return results;
  }
}

export default TinySQL;
