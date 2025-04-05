import { objType } from "./lib/objChecker";

class TinySQL {
  #appStorage;
  #settings;
  #conditions;

  constructor() {
    this.debug = false;
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

    this.jsonOp = {
      // WHERE json_extract(data, '$.name') = 'Rainbow Queen' | Search exact value inside json
      extract: (name, where = 'data') => `json_extract(${where}, '$.${name}')`,
      // FROM json_each(json_extract(data, '$.tags')) | Search inside a array
      each: (name, where = 'data') => `json_each(${this.jsonOp.extract(name, where)})`,
      // WHERE CAST(json_extract(data, '$.level') AS INTEGER) > 10 | Filter by a numerical value within JSON
      filterNumber: (name, where = 'data') =>
        `CAST(${this.jsonOp.extract(name, where)} AS INTEGER)`,
    };

    this.#conditions['='] = this.#conditions['==='];
    this.#conditions['!='] = this.#conditions['!=='];
  }

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

  setDebug(isDebug = false) {
    this.debug = typeof isDebug === 'boolean' ? isDebug : false;
  }

  async has(id, subId) {
    const useSub = this.#settings.subId && subId ? true : false;
    const params = [id];
    const query = `SELECT COUNT(*) FROM ${this.#settings.name} WHERE ${this.#settings.id} = ?${useSub ? ` AND ${this.#settings.subId} = ?` : ''}`;
    if (useSub) params.push(subId);

    const result = await this.#appStorage.getSingleData(query, params);
    if (this.debug) console.log('[sql] [has]', query, params, result);
    return result['COUNT(*)'] === 1;
  }

  async set(id, valueObj = {}, extraData = null) {
    const results = [];
    const columns = Object.keys(valueObj);
    const values = Object.values(valueObj).map((v) =>
      typeof v === 'object' ? JSON.stringify(v) : v,
    );
    const placeholders = columns.map(() => '?').join(', ');
    const updateClause = columns.map((col) => `${col} = excluded.${col}`).join(', ');

    const query = `INSERT INTO ${this.#settings.name} (${this.#settings.id}, ${columns.join(', ')}) 
                   VALUES (?, ${placeholders}) 
                   ON CONFLICT(${this.#settings.id}) DO UPDATE SET ${updateClause}`;

    results.push(await this.#appStorage.runQuery(query, [id, ...values]));
    if (this.debug) console.log('[sql] [set]', query, [id, ...values], results[results.length - 1]);

    if (extraData !== null && this.#settings.join) {
      const metaColumns = Object.keys(extraData);
      const metaValues = Object.values(extraData).map((v) =>
        typeof v === 'object' ? JSON.stringify(v) : v,
      );
      const metaPlaceholders = metaColumns.map(() => '?').join(', ');
      const metaUpdateClause = metaColumns.map((col) => `${col} = excluded.${col}`).join(', ');

      const metaQuery = `INSERT INTO ${this.#settings.join} (${this.#settings.id}, ${metaColumns.join(', ')}) 
                           VALUES (?, ${metaPlaceholders}) 
                           ON CONFLICT(${this.#settings.id}) DO UPDATE SET ${metaUpdateClause}`;

      results.push(await this.#appStorage.runQuery(metaQuery, [id, ...metaValues]));
      if (this.debug)
        console.log('[sql] [set]', metaQuery, [id, ...metaValues], results[results.length - 1]);
    }

    return results.length < 2 ? results[0] : results;
  }

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

  async delete(id, subId) {
    const useSub = this.#settings.subId && subId ? true : false;
    const query = `DELETE FROM ${this.#settings.name} WHERE ${this.#settings.id} = ?${useSub ? ` AND ${this.#settings.subId} = ?` : ''}`;
    const params = [id];
    if (useSub) params.push(subId);

    const result = this.#appStorage.runQuery(query, params);
    if (this.debug) console.log('[sql] [delete]', query, params, result);
    return result;
  }

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
