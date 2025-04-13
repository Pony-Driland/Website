import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { Client } from 'pg';

import { objType } from './lib/objChecker';

/**
 * TinySQL is a wrapper for basic SQL operations on a local storage abstraction.
 * It supports inserting, updating, deleting, querying and joining JSON-based structured data.
 *
 * @author JasminDreasond
 * @version 1.0
 * @date 2025-03-24
 *
 * Documentation written with the assistance of OpenAI's ChatGPT.
 *
 * License: AGPL-3.0
 * ----------
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
 */
class TinySQL {
  #sqlEngine;
  #db;
  #tables = {};
  #debug = false;

  constructor() {}

  setIsDebug(isDebug) {
    this.#debug = typeof isDebug === 'boolean' ? isDebug : false;
  }

  isDebug() {
    return this.#debug;
  }

  /**
   * Initializes a new table.
   *
   * This method checks if a table with the provided name already exists in the internal `#tables` object.
   * If the table doesn't exist, it creates a new instance of the `TinySqlQuery` submodule, sets the database
   * and settings, and creates the table using the provided column data. The table is then stored in the
   * `#tables` object for future reference.
   *
   * The table name and column data are passed into the `TinySqlQuery` submodule to construct the table schema.
   * Additional settings can be provided to customize the behavior of the table (e.g., `select`, `order`, `id`).
   *
   * @param {Object} [settings={}] - Optional settings to customize the table creation. This can include properties like `select`, `join`, `order`, `id`, etc.
   * @param {Array<Array<string>>} [tableData=[]] - An array of columns and their definitions to create the table. Each column is defined by an array, which can include column name, type, and additional settings.
   * @returns {Promise<TinySqlQuery>} Resolves to the `TinySqlQuery` instance associated with the created or existing table.
   * @throws {Error} If the table has already been initialized.
   */
  async initTable(settings = {}, tableData = []) {
    if (!this.#tables[settings.name]) {
      const newTable = new TinySqlQuery();
      newTable.setDb(settings, this);
      await newTable.createTable(tableData);
      newTable.setDebug(this.isDebug());

      this.#tables[settings.name] = newTable;
      return this.#tables[settings.name];
    }
    throw new Error('This table has already been initialized');
  }

  /**
   * Retrieves the `TinySqlQuery` instance for the given table name.
   *
   * This method checks the internal `#tables` object and returns the corresponding `TinySqlQuery`
   * instance associated with the table name. If the table does not exist, it returns `null`.
   *
   * @param {string} tableName - The name of the table to retrieve.
   * @returns {TinySqlQuery|null} The `TinySqlQuery` instance associated with the table, or `null` if the table does not exist.
   */
  getTable(tableName) {
    if (this.#tables[tableName]) return this.#tables[tableName];
    return null;
  }

  /**
   * Checks if a table with the given name exists.
   *
   * This method checks if the table with the specified name has been initialized in the internal
   * `#tables` object and returns a boolean value indicating its existence.
   *
   * @param {string} tableName - The name of the table to check.
   * @returns {boolean} `true` if the table exists, `false` if it does not.
   */
  hasTable(tableName) {
    return this.getTable(tableName) ? true : false;
  }

  /**
   * Removes the table with the given name from the internal table collection.
   *
   * This method deletes the table instance from the `#tables` object, effectively removing it from
   * the internal management of tables. It returns `true` if the table was successfully removed,
   * or `false` if the table does not exist.
   *
   * @param {string} tableName - The name of the table to remove.
   * @returns {boolean} `true` if the table was removed, `false` if the table does not exist.
   */
  removeTable(tableName) {
    if (this.#tables[tableName]) {
      delete this.#tables[tableName];
      return true;
    }
    return false;
  }

  /**
   * Drops and removes the table with the given name.
   *
   * This method calls the `dropTable()` method on the corresponding `TinySqlQuery` instance,
   * removing the table schema from the database. After successfully dropping the table, it removes
   * the table from the internal `#tables` object.
   *
   * @param {string} tableName - The name of the table to drop.
   * @returns {Promise<boolean>} Resolves to `true` if the table was dropped and removed successfully, or `false` if the table does not exist.
   */
  async dropTable(tableName) {
    if (this.#tables[tableName]) {
      const result = await this.#tables[tableName].dropTable();
      this.removeTable(tableName);
      return result;
    }
    return false;
  }

  /**
   * Returns the raw database instance currently in use.
   *
   * This gives direct access to the internal database connection (PostgreSQL `Client` or SQLite3 `Database`),
   * which can be useful for advanced queries or database-specific operations not covered by this wrapper.
   *
   * @returns {Object|null} The internal database instance, or `null` if not initialized.
   */
  getDb() {
    return this.#db;
  }

  /**
   * A method to check if the database connection is open.
   *
   * This method attempts to run a simple query on the database to determine if the
   * connection is open or closed. It returns `true` if the database is open and
   * `false` if the database is closed.
   *
   * @function
   * @returns {Promise<boolean>} A promise that resolves to `true` if the database is open, `false` otherwise.
   */
  async isDbOpen() {
    try {
      await this.get('SELECT 1');
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Returns the current SQL engine identifier used by this instance.
   *
   * Possible return values:
   * - `'sqlite3'` if using SQLite3
   * - `'postgre'` if using PostgreSQL
   * - `null` if no engine has been initialized yet
   *
   * @returns {string|null} The name of the current SQL engine or `null` if none is set.
   */
  getSqlEngine() {
    return this.#sqlEngine || null;
  }

  /**
   * Initializes an SQLite3 >= 3.35.0 database connection and sets up the SQL engine for this instance.
   *
   * This method creates a new SQLite3 database using the specified file path (or in-memory by default),
   * assigns the SQL engine behavior using `setSqlite3()`, and sets up a `SIGINT` listener to ensure
   * the database is properly closed when the process is interrupted.
   *
   * @param {string} [filePath=':memory:'] - Path to the SQLite3 database file. Defaults to in-memory.
   * @returns {Promise<void>} Resolves when the database is ready and the engine is set.
   * @throws {Error} If a SQL engine has already been initialized for this instance.
   */
  async initSqlite3(filePath = ':memory:') {
    if (!this.#sqlEngine) {
      // Open SQLite3 database using the provided file path
      this.#db = await open({
        filename: filePath,
        driver: sqlite3.Database,
      });

      // Set SQL methods (all, get, run)
      this.setSqlite3(this.#db);

      // Graceful shutdown on process termination
      process.on('SIGINT', async () => {
        await this.#db.close().catch(() => {});
      });
    } else throw new Error('SQL has already been initialized in this instance!');
  }

  /**
   * Initializes SQLite3-specific SQL methods on this instance using the provided database wrapper.
   *
   * This method sets the SQL engine to "sqlite3" and defines the `all`, `get`, and `run` methods.
   * These methods internally wrap around the provided `db` object's asynchronous methods (`all`, `get`, `run`),
   * returning promises that resolve with the expected results or `null` on invalid data.
   *
   * @param {Object} db - A SQLite3 database wrapper that exposes `all`, `get`, and `run` methods returning Promises.
   * @throws {Error} If a SQL engine has already been set for this instance.
   */
  setSqlite3(db) {
    if (!this.#sqlEngine) {
      this.#sqlEngine = 'sqlite3';

      /**
       * Executes a query expected to return multiple rows.
       *
       * @param {string} query - The SQL query to execute.
       * @param {Array} [params=[]] - Optional query parameters.
       * @returns {Promise<Array<Object>|null>} Resolves with an array of result rows or null if invalid.
       */
      this.all = async function (query, params = []) {
        return new Promise((resolve, reject) => {
          db.all(query, params)
            .then((result) => resolve(Array.isArray(result) ? result : null))
            .catch(reject);
        });
      };

      /**
       * Executes a query expected to return a single row.
       *
       * @param {string} query - The SQL query to execute.
       * @param {Array} [params=[]] - Optional query parameters.
       * @returns {Promise<Object|null>} Resolves with the result row or null if not a valid object.
       */
      this.get = async function (query, params = []) {
        return new Promise((resolve, reject) => {
          db.get(query, params)
            .then((result) => resolve(objType(result, 'object') ? result : null))
            .catch(reject);
        });
      };

      /**
       * Executes a query that modifies the database (e.g., INSERT, UPDATE, DELETE).
       *
       * @param {string} query - The SQL query to execute.
       * @param {Array} params - Query parameters.
       * @returns {Promise<Object|null>} Resolves with the result object or null if invalid.
       */
      this.run = async function (query, params) {
        return new Promise((resolve, reject) => {
          db.run(query, params)
            .then((result) => resolve(objType(result, 'object') ? result : null))
            .catch(reject);
        });
      };
    } else throw new Error('SQL has already been initialized in this instance!');
  }

  /**
   * Initializes a PostgreSQL client and sets up the SQL engine for this instance.
   *
   * This method creates a new PostgreSQL `Client` using the given configuration,
   * connects to the database, and assigns the SQL engine behavior using `setPostgre()`.
   * It also attaches a `SIGINT` listener to gracefully close the database connection
   * when the process is terminated.
   *
   * @param {Object} config - PostgreSQL client configuration object.
   *                          Must be compatible with the `pg` Client constructor.
   * @throws {Error} If a SQL engine is already initialized for this instance.
   */
  async initPostgre(config) {
    if (!this.#sqlEngine) {
      // Create a new pg Client instance using provided config
      this.#db = new Client(config);

      // Set up the SQL methods (all, get, run)
      this.setPostgre(this.#db);

      // Attach handler to close DB on process termination
      process.on('SIGINT', async () => {
        await this.#db.end().catch(() => {});
      });

      // Connect to the PostgreSQL database
      await this.#db.connect();
    } else throw new Error('SQL has already been initialized in this instance!');
  }

  /**
   * Initializes PostgreSQL-specific SQL methods on this instance using the provided database wrapper.
   *
   * This method sets the engine to "postgre" and defines the `all`, `get`, and `run` methods,
   * wrapping around the provided `db` interface.
   *
   * @param {Object} db - A PostgreSQL database instance that exposes `open()` and `query()` methods.
   * @throws {Error} If a SQL engine is already set for this instance.
   */
  setPostgre(db) {
    if (!this.#sqlEngine) {
      this.#sqlEngine = 'postgre';

      /**
       * Executes a query expected to return multiple rows.
       *
       * @param {string} query - The SQL query to execute.
       * @param {Array} [params=[]] - Optional query parameters.
       * @returns {Promise<Array<Object>|null>} Resolves with an array of result rows or null if invalid.
       */
      this.all = async function (query, params = []) {
        await db.open(); // Ensure the connection is open
        try {
          const res = await db.query(query, params);
          return objType(res, 'object') && Array.isArray(res.rows) ? res.rows : null;
        } catch (err) {
          throw err;
        }
      };

      /**
       * Executes a query expected to return a single row.
       *
       * @param {string} query - The SQL query to execute.
       * @param {Array} [params=[]] - Optional query parameters.
       * @returns {Promise<Object|null>} Resolves with the first row of the result or null if not found.
       */
      this.get = async function (query, params = []) {
        await db.open(); // Ensure the connection is open
        try {
          const res = await db.query(query, params);
          return objType(res, 'object') && Array.isArray(res.rows) && objType(res.rows[0], 'object')
            ? res.rows[0]
            : null;
        } catch (err) {
          throw err;
        }
      };

      /**
       * Executes a query without expecting a specific row result.
       *
       * @param {string} query - The SQL query to execute.
       * @param {Array} params - Query parameters.
       * @returns {Promise<Object|null>} Resolves with the result object or null if invalid.
       */
      this.run = async function (query, params) {
        await db.open(); // Ensure the connection is open
        try {
          const res = await db.query(query, params);
          return objType(res, 'object') ? res : null;
        } catch (err) {
          throw err;
        }
      };
    } else {
      throw new Error('SQL has already been initialized in this instance!');
    }
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
  all = (query, params) => new Promise((resolve) => resolve(null));

  /**
   * Executes a query to get a single row from a database table.
   * @function
   * @async
   * @param {string} query - The SQL query to execute.
   * @param {Array} [params] - The parameters to bind to the query.
   * @returns {Promise<Object>} A promise that resolves to a single row object.
   * @throws {Error} Throws an error if the query fails.
   */
  get = (query, params) => new Promise((resolve) => resolve(null));

  /**
   * Executes an SQL statement to modify the database (e.g., INSERT, UPDATE).
   * @function
   * @async
   * @param {string} query - The SQL query to execute.
   * @param {Array} params - The parameters to bind to the query.
   * @returns {Promise<Object>} A promise that resolves to the result of the query execution.
   * @throws {Error} Throws an error if the query fails.
   */
  run = (query, params) => new Promise((resolve) => resolve(null));
}

/**
 * TinySQL is a wrapper for basic SQL operations on a local storage abstraction.
 * It supports inserting, updating, deleting, querying and joining JSON-based structured data.
 */
class TinySqlQuery {
  #conditions;
  #db;
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
          await this.#db.run(query);
          if (this.debug) console.log('[sql] [updateTable - ADD]', this.#fixDebugQuery(query));
        } catch (error) {
          console.error('[sql] [updateTable - ADD] Error adding column:', error);
        }
      } else if (action === 'REMOVE') {
        const query = `ALTER TABLE ${this.#settings.name} DROP COLUMN IF EXISTS ${change[1]}`;
        try {
          await this.#db.run(query);
          if (this.debug) console.log('[sql] [updateTable - REMOVE]', this.#fixDebugQuery(query));
        } catch (error) {
          console.error('[sql] [updateTable - REMOVE] Error removing column:', error);
        }
      } else if (action === 'MODIFY') {
        const query = `ALTER TABLE ${this.#settings.name} ALTER COLUMN ${change[1]} TYPE ${change[2]}${
          change[3] ? `, ALTER COLUMN ${change[1]} SET ${change[3]}` : ''
        }`;
        try {
          await this.#db.run(query);
          if (this.debug) console.log('[sql] [updateTable - MODIFY]', this.#fixDebugQuery(query));
        } catch (error) {
          console.error('[sql] [updateTable - MODIFY] Error modifying column:', error);
        }
      } else if (action === 'RENAME') {
        const query = `ALTER TABLE ${this.#settings.name} RENAME COLUMN ${change[1]} TO ${change[2]}`;
        try {
          await this.#db.run(query);
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
   * Drops the current table if it exists.
   *
   * This method executes a `DROP TABLE` query using the table name defined in `this.#settings.name`.
   * It's useful for resetting or cleaning up the database schema dynamically.
   * If the query fails due to connection issues (like `SQLITE_CANTOPEN` or `ECONNREFUSED`),
   * it rejects with the error; otherwise, it resolves with `false` to indicate failure.
   * On success, it resolves with `true`.
   *
   * @returns {Promise<boolean>} Resolves with `true` if the table was dropped, or `false` if there was an issue (other than connection errors).
   * @throws {Error} If there is an issue with the database or settings, or if the table can't be dropped.
   */
  async dropTable() {
    const db = this.#db;
    return new Promise((resolve, reject) => {
      db.run(`DROP TABLE ${this.#settings.name};`)
        .then(() => resolve(true))
        .catch((err) => {
          if (err.message.includes('SQLITE_CANTOPEN') || err.message.includes('ECONNREFUSED'))
            reject(err); // Rejects on connection-related errors
          else resolve(false); // Resolves with false on other errors
        });
    });
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

    // Execute the SQL query to create the table using db.run
    await this.#db
      .run(query)
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
          type: typeof type === 'string' ? type.toUpperCase().trim() : null,
          options: typeof options === 'string' ? options.toUpperCase().trim() : null,
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

      const type = column.type || '';
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
   * @param {object} - TinySQL Instance.
   */
  setDb(settings = {}, db = null) {
    if (db) this.#db = db;
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
    const query = `SELECT COUNT(*) FROM ${this.#settings.name} WHERE ${this.#settings.id} = $1${useSub ? ` AND ${this.#settings.subId} = $2` : ''}`;
    if (useSub) params.push(subId);

    const result = await this.#db.get(query, params);
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

    const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');

    const useSub = this.#settings.subId && typeof valueObj[this.#settings.subId] !== 'undefined';
    const query = `UPDATE ${this.#settings.name} SET ${setClause} WHERE ${this.#settings.id} = $${columns.length + 1}${useSub ? ` AND ${this.#settings.subId} = $${columns.length + 2}` : ''}`;

    const params = [...values, id];
    if (useSub) params.push(valueObj[this.#settings.subId]);

    const mainResult = await this.#db.run(query, params);
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
   * @returns {Promise<object|null>} - Generated values will be returned.
   */
  async set(id, valueObj = {}, onlyIfNew = false) {
    const results = [];
    const columns = Object.keys(valueObj);
    const values = Object.values(valueObj).map((v) =>
      typeof v === 'object' ? JSON.stringify(v) : v,
    );

    const allParams = [id, ...values];
    const placeholders = allParams.map((_, index) => `$${index + 1}`).join(', ');

    let query = `INSERT INTO ${this.#settings.name} (${this.#settings.id}, ${columns.join(', ')}) 
                 VALUES (${placeholders})`;

    if (!onlyIfNew) {
      const updateClause = columns.map((col) => `${col} = excluded.${col}`).join(', ');
      query += ` ON CONFLICT(${this.#settings.id}${this.#settings.subId ? `, ${this.#settings.subId}` : ''}) 
                 DO UPDATE SET ${updateClause}`;
    } else {
      query += ` ON CONFLICT(${this.#settings.id}${this.#settings.subId ? `, ${this.#settings.subId}` : ''}) DO NOTHING`;
    }

    const ids = [];
    let returnIds = '';
    for (const item in this.#table) {
      const column = this.#table?.[item];
      if (typeof valueObj[item] !== 'undefined') continue;
      const options = column.options || '';
      if (
        options.includes('PRIMARY KEY') ||
        options.includes('GENERATED ') ||
        options.includes('DEFAULT ')
      ) {
        if (returnIds.length > 0) returnIds += ', ';
        returnIds += item;
        ids.push(item);
      }
    }
    if (ids.length > 0) query += ` RETURNING ${returnIds}`;

    results.push(await this.#db.get(query, allParams));
    if (this.debug) {
      console.log(
        '[sql] [set]',
        this.#fixDebugQuery(query),
        allParams,
        results[results.length - 1],
      );
    }
    return results[0] || null;
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
                   ${joinClause} WHERE t.${this.#settings.id} = $1${useSub ? ` AND t.${this.#settings.subId} = $2` : ''}`;
    if (useSub) params.push(subId);
    const result = this.#jsonChecker(await this.#db.get(query, params));
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
    const query = `DELETE FROM ${this.#settings.name} WHERE ${this.#settings.id} = $1${useSub ? ` AND ${this.#settings.subId} = $2` : ''}`;
    const params = [id];
    if (useSub) params.push(subId);

    const result = await this.#db.run(query, params);
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
    const whereClause = filterId !== null ? `WHERE t.${this.#settings.id} = $1` : '';
    const limitClause = `LIMIT $${filterId !== null ? 2 : 1}`;
    const query = `SELECT ${this.#selectGenerator(selectValue)} FROM ${this.#settings.name} t 
                 ${joinClause} 
                 ${whereClause}
                 ${orderClause} ${limitClause}`.trim();

    const params = filterId !== null ? [filterId, count] : [count];
    const results = await this.#db.all(query, params);
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
    const whereClause = filterId !== null ? `WHERE t.${this.#settings.id} = $1` : '';
    const query = `SELECT ${this.#selectGenerator(selectValue)} FROM ${this.#settings.name} t 
                 ${joinClause} 
                 ${whereClause}
                 ${orderClause}`.trim();

    const results = await this.#db.all(query, filterId !== null ? [filterId] : []);
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
    let placeholderIndex = 1;

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
          return `(${col} ${operator} $${placeholderIndex++})`;
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
      return `${col} ${operator} $${placeholderIndex++}`;
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

    const results = await this.#db.all(query, values);
    for (const index in results) this.#jsonChecker(results[index]);

    if (this.debug) console.log('[sql] [search]', this.#fixDebugQuery(query), values, results);
    return results;
  }
}

export { TinySqlQuery };
export default TinySQL;
