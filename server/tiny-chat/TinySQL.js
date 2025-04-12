import { objType } from './lib/objChecker';

/**
 * TinySQL is a wrapper for basic SQL operations on a local storage abstraction.
 * It supports inserting, updating, deleting, querying and joining JSON-based structured data.
 */
class TinySQL {
  #conditions;
  #settings = {};
  #table = {};

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

    // Aliases for alternative comparison operators
    this.#conditions['='] = this.#conditions['==='];
    this.#conditions['!='] = this.#conditions['!=='];
  }

  /**
   * Executes a query to get all rows from a database table.
   * @function
   * @async
   * @param {string} query - The SQL query to execute.
   * @param {Array} [params] - The parameters to bind to the query.
   * @returns {Promise<Array>} A promise that resolves to an array of rows.
   * @throws {Error} Throws an error if the query fails.
   */
  getAllData = (query, params) => this.#getAllData(query, params);

  #getAllData = (query, params) => new Promise((resolve) => resolve(null));

  /**
   * Executes a query to get a single row from a database table.
   * @function
   * @async
   * @param {string} query - The SQL query to execute.
   * @param {Array} [params] - The parameters to bind to the query.
   * @returns {Promise<Object>} A promise that resolves to a single row object.
   * @throws {Error} Throws an error if the query fails.
   */
  getSingleData = (query, params) => this.#getSingleData(query, params);

  #getSingleData = (query, params) => new Promise((resolve) => resolve(null));

  /**
   * Executes an SQL statement to modify the database (e.g., INSERT, UPDATE).
   * @function
   * @async
   * @param {string} query - The SQL query to execute.
   * @param {Array} params - The parameters to bind to the query.
   * @returns {Promise<Object>} A promise that resolves to the result of the query execution.
   * @throws {Error} Throws an error if the query fails.
   */
  runQuery = (query, params) => this.#runQuery(query, params);

  #runQuery = (query, params) => new Promise((resolve) => resolve(null));

  setSqlite3(db) {
    this.#getAllData = async function (query, params = []) {
      return db.all(query, params);
    };
    this.#getSingleData = async function (query, params = []) {
      return db.get(query, params);
    };
    this.#runQuery = async function (query, params) {
      return db.run(query, params);
    };
  }

  setPostgre(db) {
    this.#getAllData = async function (query, params = []) {
      await db.open(); // Ensure the connection is open
      try {
        const res = await db.query(query, params);
        return res.rows; // Returning rows similar to db.all
      } catch (err) {
        throw err;
      }
    };
    this.#getSingleData = async function (query, params = []) {
      await db.open(); // Ensure the connection is open
      try {
        const res = await db.query(query, params);
        return res.rows[0]; // Returning the first row, similar to db.get
      } catch (err) {
        throw err;
      }
    };
    this.#runQuery = async function (query, params) {
      await db.open(); // Ensure the connection is open
      try {
        const res = await db.query(query, params);
        return res; // Returns the query result, similar to db.run
      } catch (err) {
        throw err;
      }
    };
  }

  #fixDebugQuery(value) {
    return value.trim().replace(/  |(\r\n|\n|\r)/g, '');
  }

  /**
   * Generates a SELECT clause based on the input, supporting SQL functions, columns, and aliases.
   * Automatically parses input to build valid SQL expressions.
   *
   * @private
   * @param {string|string[]|object|null|undefined} input - Columns, SQL expressions, or objects with column aliases.
   * @returns {string} - A valid SELECT clause.
   *
   * @example
   * this.#selectGenerator(); // returns '*'
   * this.#selectGenerator('COUNT(*) AS total'); // returns 'COUNT(*) AS total'
   * this.#selectGenerator(['id', 'username']); // returns 'id, username'
   * this.#selectGenerator({ id: 'user_id', username: 'user_name' }); // returns 'id AS user_id, username AS user_name'
   */
  #selectGenerator(input) {
    if (!input) return '*';

    // If input is an array, join all columns
    if (Array.isArray(input)) {
      return (
        input
          .map((col) => this.#parseColumn(col))
          .filter(Boolean)
          .join(', ') || '*'
      );
    }

    // If input is an object, handle key-value pairs for aliasing
    if (typeof input === 'object') {
      return (
        Object.entries(input)
          .map(([column, alias]) => {
            return this.#parseColumn(column, alias);
          })
          .join(', ') || '*'
      );
    }

    // If input is a string, treat it as a custom SQL expression
    if (typeof input === 'string') {
      return this.#parseColumn(input);
    }

    return '*';
  }

  /**
   * Helper function to parse individual columns or SQL expressions.
   * Supports aliasing and complex expressions.
   *
   * @private
   * @param {string} column - Column name or SQL expression.
   * @param {string} [alias] - Alias for the column (optional).
   * @returns {string} - A valid SQL expression for SELECT clause.
   */
  #parseColumn(column, alias) {
    // If column is a valid expression (e.g., COUNT(*), MAX(id)), return it as is
    if (/^[A-Za-z0-9_\*().,]+$/.test(column)) {
      if (alias) {
        return `${column} AS ${alias}`;
      }
      return column;
    }

    // If column contains an alias
    if (alias) {
      return `${column} AS ${alias}`;
    }

    return column;
  }

  // Helpers for JSON operations within SQL queries (SQLite-compatible)

  // Example: WHERE json_extract(data, '$.name') = 'Rainbow Queen'
  /**
   * Extracts the value of a key from a JSON object using SQLite's json_extract function.
   * @param {string} where - The JSON column to extract from.
   * @param {string} name - The key or path to extract (dot notation).
   * @returns {string} SQL snippet to extract a value from JSON.
   */
  getJsonExtract = (where = null, name = null) => `json_extract(${where}, '$.${name}')`;

  /**
   * Expands each element in a JSON array or each property in a JSON object into separate rows.
   * Intended for use in the FROM clause.
   * @param {string} source - JSON column or expression to expand.
   * @returns {string} SQL snippet calling json_each.
   */
  getJsonEach = (source = null) => `json_each(${source})`;

  // Example: FROM json_each(json_extract(data, '$.tags'))
  /**
   * Unrolls a JSON array from a specific key inside a JSON column using json_each.
   * Ideal for iterating over array elements in a FROM clause.
   * @param {string} where - The JSON column containing the array.
   * @param {string} name - The key of the JSON array.
   * @returns {string} SQL snippet to extract and expand a JSON array.
   */
  getArrayExtract = (where = null, name = null) =>
    this.getJsonEach(this.getJsonExtract(where, name));

  // Example: WHERE CAST(json_extract(data, '$.level') AS INTEGER) > 10
  /**
   * Extracts a key from a JSON object and casts it to a given SQLite type (INTEGER, TEXT, REAL, etc.).
   * @param {string} where - The JSON column to extract from.
   * @param {string} name - The key or path to extract.
   * @param {string} type - The type to cast to (e.g., 'INTEGER', 'TEXT', 'REAL').
   * @returns {string} SQL snippet with cast applied.
   */
  getJsonCast = (where = null, name = null, type = 'NULL') =>
    `CAST(${this.getJsonExtract(where, name)} AS ${type.toUpperCase()})`;

  /**
   * Updates the table by adding, removing, modifying or renaming columns.
   * @param {Array<Array<string|any>>} changes - An array of changes to be made to the table.
   * Each change is defined by an array, where:
   *   - To add a column: ['ADD', 'columnName', 'columnType', 'columnOptions']
   *   - To remove a column: ['REMOVE', 'columnName']
   *   - To modify a column: ['MODIFY', 'columnName', 'newColumnType', 'newOptions']
   *   - To rename a column: ['RENAME', 'oldColumnName', 'newColumnName']
   * @returns {Promise<void>}
   */
  async updateTable(changes) {
    for (const change of changes) {
      const action = change[0];

      if (action === 'ADD') {
        const query = `ALTER TABLE ${this.#settings.name} ADD COLUMN ${change[1]} ${change[2]} ${change[3] || ''}`;
        try {
          await this.#runQuery(query);
          if (this.debug) console.log('[sql] [updateTable - ADD]', this.#fixDebugQuery(query));
        } catch (error) {
          console.error('[sql] [updateTable - ADD] Error adding column:', error);
        }
      } else if (action === 'REMOVE') {
        const query = `ALTER TABLE ${this.#settings.name} DROP COLUMN IF EXISTS ${change[1]}`;
        try {
          await this.#runQuery(query);
          if (this.debug) console.log('[sql] [updateTable - REMOVE]', this.#fixDebugQuery(query));
        } catch (error) {
          console.error('[sql] [updateTable - REMOVE] Error removing column:', error);
        }
      } else if (action === 'MODIFY') {
        const query = `ALTER TABLE ${this.#settings.name} ALTER COLUMN ${change[1]} TYPE ${change[2]}${
          change[3] ? `, ALTER COLUMN ${change[1]} SET ${change[3]}` : ''
        }`;
        try {
          await this.#runQuery(query);
          if (this.debug) console.log('[sql] [updateTable - MODIFY]', this.#fixDebugQuery(query));
        } catch (error) {
          console.error('[sql] [updateTable - MODIFY] Error modifying column:', error);
        }
      } else if (action === 'RENAME') {
        const query = `ALTER TABLE ${this.#settings.name} RENAME COLUMN ${change[1]} TO ${change[2]}`;
        try {
          await this.#runQuery(query);
          if (this.debug) console.log('[sql] [updateTable - RENAME]', this.#fixDebugQuery(query));
        } catch (error) {
          console.error('[sql] [updateTable - RENAME] Error renaming column:', error);
        }
      } else {
        console.warn(`[sql] [updateTable] Unknown updateTable action: ${action}`);
      }
    }
  }

  /**
   * Creates a table in the database based on provided column definitions.
   * Also stores the column structure in this.#table as an object keyed by column name.
   * @param {Array<Array<string|any>>} columns - An array of column definitions.
   * Each column is defined by an array containing the column name, type, and optional configurations.
   * @returns {Promise<void>}
   */
  async createTable(columns) {
    // Start building the query
    let query = 'CREATE TABLE IF NOT EXISTS ' + this.#settings.name + ' (';

    // Iterate through the columns array to construct column definitions
    const columnDefinitions = columns.map((column) => {
      // If the column definition contains more than two items, it's a full definition
      if (column.length === 3) {
        return `${column[0]} ${column[1]} ${column[2]}`;
      }
      // If only two items are provided, it's just the name and type (no additional configuration)
      else if (column.length === 2) {
        return `${column[0]} ${column[1]}`;
      }
      // If only one item is provided, it's a table setting (e.g., PRIMARY KEY)
      else {
        return column[0];
      }
    });

    // Join all column definitions into a single string
    query += columnDefinitions.join(', ') + ')';

    // Execute the SQL query to create the table using runQuery
    await this.#runQuery(query)
      .catch((err) => {
        console.error(err);
        console.log(`[sql] [createTable] [error] ${this.#fixDebugQuery(query)}`);
        return err;
      })
      .then((result) => {
        if (this.debug) console.log('[sql] [createTable]', this.#fixDebugQuery(query));
        return result;
      });

    // Save the table structure using an object with column names as keys
    this.#table = {};
    for (const column of columns) {
      if (column.length >= 2) {
        const [name, type, options] = column;
        this.#table[name] = {
          type,
          options: options || null,
        };
      }
    }
  }

  /**
   * Parses and validates fields from result rows based on SQL types in this.#table.
   * @private
   * @param {object} result - The result row to check.
   * @returns {object}
   */
  #jsonChecker(result) {
    if (!objType(result, 'object')) return result;

    for (const item in result) {
      const column = this.#table?.[item];
      if (!column || result[item] == null) continue;

      const type = column.type?.toUpperCase?.().trim() || '';
      const raw = result[item];

      try {
        switch (type) {
          case 'BOOLEAN':
          case 'BOOL':
            result[item] = raw === true || raw === 'true' || raw === 1 || raw === '1';
            break;

          case 'BIGINT':
            if (typeof raw === 'bigint') result[item] = raw;
            else {
              try {
                result[item] = BigInt(raw);
              } catch {
                result[item] = null;
              }
            }
            break;

          case 'INTEGER':
          case 'INT':
          case 'SMALLINT':
          case 'TINYINT':
          case 'REAL':
          case 'FLOAT':
          case 'DOUBLE':
          case 'DECIMAL':
          case 'NUMERIC':
            result[item] = typeof raw === 'number' ? raw : parseInt(raw);
            if (Number.isNaN(result[item])) result[item] = null;
            break;

          case 'JSON':
            if (typeof raw === 'string') {
              try {
                result[item] = JSON.parse(raw);
              } catch {
                result[item] = null;
              }
            } else if (objType(raw, 'object') || Array.isArray(raw)) result[item] = raw;
            else result[item] = null;
            break;

          case 'TEXT':
          case 'CHAR':
          case 'VARCHAR':
          case 'CLOB':
            result[item] = typeof raw === 'string' ? raw : null;
            break;

          // Keeps original value
          default:
            result[item] = raw;
            break;
        }
      } catch {
        result[item] = null; // safe fallback
      }
    }

    return result;
  }

  /**
   * Set or update database settings by merging with existing ones.
   * This function ensures safe fallback values and formats the SELECT clause.
   *
   * @param {object} [settings={}] - Partial configuration to apply. Will be merged with current settings.
   * @property {string} [settings.select='*'] - SELECT clause configuration. Can be simplified; complex expressions are auto-formatted.
   * @property {string|null} [settings.join=null] - Optional JOIN table name.
   * @property {string|null} [settings.joinCompare='t.key = j.key'] - Condition used to match JOIN tables.
   * @property {string|null} [settings.order=null] - Optional ORDER BY clause.
   * @property {string} [settings.id='key'] - Primary key column name.
   * @property {string|null} [settings.subId=null] - Optional secondary key column name.
   */
  setDb(settings = {}) {
    const selectValue =
      typeof settings.select === 'string'
        ? this.#selectGenerator(settings.select)
        : this.#settings?.select || '*';

    const newSettings = {
      ...this.#settings,
      ...settings,
    };

    newSettings.select = selectValue;

    if (typeof newSettings.join !== 'string') newSettings.join = null;
    if (typeof newSettings.joinCompare !== 'string' && newSettings.join)
      newSettings.joinCompare = 't.key = j.key';
    if (typeof newSettings.order !== 'string') newSettings.order = null;
    if (typeof newSettings.id !== 'string') newSettings.id = 'key';
    if (typeof newSettings.subId !== 'string') newSettings.subId = null;

    this.#settings = newSettings;
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

    const result = await this.#getSingleData(query, params);
    if (this.debug) console.log('[sql] [has]', this.#fixDebugQuery(query), params, result);
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

    const mainResult = await this.#runQuery(query, params);
    results.push(mainResult);
    if (this.debug) console.log('[sql] [update]', this.#fixDebugQuery(query), params, mainResult);

    if (mainResult?.changes === 0 || mainResult?.rowsAffected === 0) return null; // No record updated
    return results[0] || null;
  }

  /**
   * Insert or update a record with given data.
   * @param {string|number} id - Primary key value.
   * @param {object} valueObj - Data to store.
   * @param {boolean} [onlyIfNew=false] - If true, only insert if the record does not already exist.
   * @returns {Promise<object>}
   */
  async set(id, valueObj = {}, onlyIfNew = false) {
    const results = [];
    const columns = Object.keys(valueObj);
    const values = Object.values(valueObj).map((v) =>
      typeof v === 'object' ? JSON.stringify(v) : v,
    );
    const placeholders = columns.map(() => '?').join(', ');

    let query = `INSERT INTO ${this.#settings.name} (${this.#settings.id}, ${columns.join(', ')}) 
               VALUES (?, ${placeholders})`;

    if (!onlyIfNew) {
      const updateClause = columns.map((col) => `${col} = excluded.${col}`).join(', ');
      query += ` ON CONFLICT(${this.#settings.id}${this.#settings.subId ? `, ${this.#settings.subId}` : ''}) 
               DO UPDATE SET ${updateClause}`;
    } else {
      query += ` ON CONFLICT(${this.#settings.id}${this.#settings.subId ? `, ${this.#settings.subId}` : ''}) DO NOTHING`;
    }

    results.push(await this.#runQuery(query, [id, ...values]));
    if (this.debug) {
      console.log(
        '[sql] [set]',
        this.#fixDebugQuery(query),
        [id, ...values],
        results[results.length - 1],
      );
    }
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
    const result = this.#jsonChecker(await this.#getSingleData(query, params));
    if (this.debug) console.log('[sql] [get]', this.#fixDebugQuery(query), params, result);
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

    const result = this.#runQuery(query, params);
    if (this.debug) console.log('[sql] [delete]', this.#fixDebugQuery(query), params, result);
    return result;
  }

  /**
   * Get a limited number of rows from the database.
   * If an ID is provided, returns only the matching record(s) up to the specified count.
   * @param {number} count - Number of rows to retrieve.
   * @param {string|number|null} [filterId=null] - Optional ID to filter by.
   * @param {string|string[]|object} [selectValue='*'] - Defines which columns or expressions should be selected in the query.
   * @returns {Promise<object[]>}
   */
  async getAmount(count, filterId = null, selectValue = '*') {
    const joinClause = this.#settings.join
      ? `LEFT JOIN ${this.#settings.join} j ON ${this.#settings.joinCompare || ''}`
      : '';
    const orderClause = this.#settings.order ? `ORDER BY ${this.#settings.order}` : '';
    const whereClause = filterId !== null ? `WHERE t.${this.#settings.id} = ?` : '';
    const query = `SELECT ${this.#selectGenerator(selectValue)} FROM ${this.#settings.name} t 
                 ${joinClause} 
                 ${whereClause}
                 ${orderClause} LIMIT ?`.trim();

    const params = filterId !== null ? [filterId, count] : [count];
    const results = await this.#getAllData(query, params);
    for (const index in results) this.#jsonChecker(results[index]);

    if (this.debug) console.log('[sql] [getAmount]', this.#fixDebugQuery(query), params, results);
    return results;
  }

  /**
   * Get all records from the table.
   * If an ID is provided, returns only the matching record(s).
   * @param {string|number|null} [filterId=null] - Optional ID to filter by.
   * @param {string|string[]|object} [selectValue='*'] - Defines which columns or expressions should be selected in the query.
   * @returns {Promise<object[]>}
   */
  async getAll(filterId = null, selectValue = '*') {
    const joinClause = this.#settings.join
      ? `LEFT JOIN ${this.#settings.join} j ON ${this.#settings.joinCompare || ''}`
      : '';
    const orderClause = this.#settings.order ? `ORDER BY ${this.#settings.order}` : '';
    const whereClause = filterId !== null ? `WHERE t.${this.#settings.id} = ?` : '';
    const query = `SELECT ${this.#selectGenerator(selectValue)} FROM ${this.#settings.name} t 
                 ${joinClause} 
                 ${whereClause}
                 ${orderClause}`.trim();

    const results = await this.#getAllData(query, filterId !== null ? [filterId] : []);
    for (const index in results) this.#jsonChecker(results[index]);

    if (this.debug) console.log('[sql] [getAll]', this.#fixDebugQuery(query), filterId, results);
    return results;
  }

  /**
   * Perform a filtered search with nested criteria.
   *
   * Supports complex logical groupings (AND/OR) and flat condition style.
   *
   * @param {object} [criteria={}] - Nested criteria object.
   *        Can be flat object style or grouped with `{ group: 'AND'|'OR', conditions: [...] }`.
   * @param {string|string[]|object} [selectValue='*'] - Defines which columns or expressions should be selected in the query.
   * @returns {Promise<object[]>}
   *
   * @example
   * // Simple search (flat style):
   * await db.search({
   *   status: { value: 'active' },
   *   age: { value: 18, operator: '>=' }
   * });
   *
   * // Grouped search:
   * await db.search({
   *   group: 'AND',
   *   conditions: [
   *     { column: 'status', value: 'active' },
   *     {
   *       group: 'OR',
   *       conditions: [
   *         { column: 'role', value: 'admin' },
   *         { column: 'role', value: 'mod' }
   *       ]
   *     }
   *   ]
   * });
   *
   * // Equivalent SQL:
   * // WHERE (status = ?) AND ((role = ?) OR (role = ?))
   */
  async search(criteria = {}, selectValue = '*') {
    const values = [];

    const parseGroup = (group) => {
      if (!group || typeof group !== 'object') return '';

      if (group.conditions && Array.isArray(group.conditions)) {
        const logic = group.group?.toUpperCase() === 'OR' ? 'OR' : 'AND';
        const innerConditions = group.conditions.map((cond) => {
          return `(${parseGroup(cond)})`;
        });
        return innerConditions.join(` ${logic} `);
      }

      // Flat object fallback for backward compatibility
      if (!group.column && typeof group === 'object') {
        const entries = Object.entries(group);
        const logic = 'AND';
        const innerConditions = entries.map(([col, cond]) => {
          let operator = '=';
          let value = cond.value;

          if (cond.operator) {
            const selected = cond.operator.toUpperCase();
            if (typeof this.#conditions[selected] === 'function') {
              const result = this.#conditions[selected](cond);
              if (typeof result.operator === 'string') operator = result.operator;
              if (typeof result.value !== 'undefined') value = result.value;
            }
          }

          values.push(value);
          return `(${col} ${operator} ?)`;
        });
        return innerConditions.join(` ${logic} `);
      }

      // If it's a single condition
      const col = group.column;
      let operator = '=';
      let value = group.value;

      if (group.operator) {
        const selected = group.operator.toUpperCase();
        if (typeof this.#conditions[selected] === 'function') {
          const result = this.#conditions[selected](group);
          if (typeof result.operator === 'string') operator = result.operator;
          if (typeof result.value !== 'undefined') value = result.value;
        }
      }

      values.push(value);
      return `${col} ${operator} ?`;
    };

    const whereClause = Object.keys(criteria).length ? `WHERE ${parseGroup(criteria)}` : '';

    const joinClause = this.#settings.join
      ? `LEFT JOIN ${this.#settings.join} j ON ${this.#settings.joinCompare || ''}`
      : '';
    const orderClause = this.#settings.order ? `ORDER BY ${this.#settings.order}` : '';

    const query = `SELECT ${this.#selectGenerator(selectValue)} FROM ${this.#settings.name} t 
                     ${joinClause} 
                     ${whereClause} 
                     ${orderClause}`;

    const results = await this.#getAllData(query, values);
    for (const index in results) this.#jsonChecker(results[index]);

    if (this.debug) console.log('[sql] [search]', this.#fixDebugQuery(query), values, results);
    return results;
  }
}

export default TinySQL;
