import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { Client } from 'pg';
import EventEmitter from 'events';

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
  #event = new EventEmitter();

  constructor() {}

  /**
   * Registers an event listener for the specified event.
   *
   * @param {string} name - Name of the event.
   * @param {Function} callback - Function to call when the event is triggered.
   */
  on = (name, callback) => this.#event.on(name, callback);

  /**
   * Unregisters an event listener from the specified event.
   *
   * @param {string} name - Name of the event.
   * @param {Function} callback - Function that was previously registered.
   */
  off = (name, callback) => this.#event.off(name, callback);

  /**
   * Alias for `on()`. Registers an event listener.
   *
   * @param {string} name - Name of the event.
   * @param {Function} callback - Listener function.
   */
  addListener = (name, callback) => this.#event.addListener(name, callback);

  /**
   * Alias for `off()`. Removes a specific listener.
   *
   * @param {string} name - Name of the event.
   * @param {Function} callback - Listener function to remove.
   */
  removeListener = (name, callback) => this.#event.removeListener(name, callback);

  /**
   * Removes all listeners for a specific event.
   *
   * @param {string} name - Name of the event.
   */
  removeAllListeners = (name) => this.#event.removeAllListeners(name);

  /**
   * Sets the maximum number of listeners for the event emitter.
   *
   * @param {number} count - The new maximum number of listeners.
   */
  setMaxListeners = (count) => this.#event.setMaxListeners(count);

  /**
   * Emits an event, triggering all listeners registered for the specified event name.
   *
   * @param {string} name - The name of the event to emit.
   * @param {...any} args - Arguments to pass to the listener functions.
   * @returns {boolean} Returns `true` if the event had listeners, `false` otherwise.
   */
  emit = (name, ...args) => this.#event.emit(name, ...args);

  /**
   * Checks if the given error message indicates a connection error based on the SQL engine in use.
   *
   * This method evaluates if the provided error message contains any known connection error codes
   * for the current SQL engine (PostgreSQL or SQLite3).
   *
   * @param {string} msg - The error message to check.
   * @returns {boolean} True if the error message matches any known connection error codes; otherwise, false.
   */
  isConnectionError(err) {
    const sqlEngine = this.getSqlEngine();
    if (typeof sqlEngine === 'string') {
      // PostgreSQL
      if (sqlEngine === 'postgre') {
        const codes = [
          'ECONNREFUSED',
          'ENOTFOUND',
          'EHOSTUNREACH',
          'ETIMEDOUT',
          'EPIPE',
          '28P01',
          '3D000',
          '08006',
          '08001',
          '08004',
          '53300',
          '57P01',
        ];
        for (const code of codes) if (err.code === code) return true;
      }

      // Sqlite3
      if (sqlEngine === 'sqlite3' && typeof err.message === 'string')
        return err.message.includes('SQLITE_CANTOPEN');
    }
    return false;
  }

  /**
   * Enables or disables debug mode.
   *
   * When debug mode is enabled, SQL queries and additional debug info will be logged to the console.
   *
   * @param {boolean} isDebug - If true, debug mode is enabled; otherwise, it's disabled.
   */
  setIsDebug(isDebug) {
    this.#debug = typeof isDebug === 'boolean' ? isDebug : false;
  }

  /**
   * Checks whether debug mode is currently enabled.
   *
   * @returns {boolean} True if debug mode is enabled; otherwise, false.
   */
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
      const isConnectionError = (err) => this.isConnectionError(err);

      // Event error detector
      const rejectConnection = (reject, err) => {
        if (isConnectionError(err)) event.emit('connection-error', err);
        reject(err);
      };
      const event = this.#event;

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
            .catch((err) => rejectConnection(reject, err));
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
            .catch((err) => rejectConnection(reject, err));
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
            .catch((err) => rejectConnection(reject, err));
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
      const isConnectionError = (err) => this.isConnectionError(err);

      // Event error detector
      const rejectConnection = (err) => {
        if (isConnectionError(err)) event.emit('connection-error', err);
      };
      const event = this.#event;
      db.on('error', rejectConnection);

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
          rejectConnection(err);
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
          rejectConnection(err);
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
          rejectConnection(err);
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

  /**
   * Formats SQL for clean and readable debug in terminal.
   * Adds line breaks and indentation to major SQL clauses,
   * and wraps the query with visual markers, without outer newlines.
   *
   * @private
   * @param {string} value - Raw SQL query string.
   * @returns {string} Formatted SQL string for terminal output.
   */
  #debugSqlClassic(value) {
    const formatted = value
      .trim()
      .replace(/\s+/g, ' ') // collapse multiple spaces
      .replace(
        /\s*(WITH|SELECT|FROM|LEFT JOIN|RIGHT JOIN|FULL JOIN|INNER JOIN|CROSS JOIN|JOIN|ON|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET)\s+/gi,
        '\n$1 ',
      )
      .replace(/,\s*/g, ', ') // clean comma spacing
      .replace(/\n/g, '\n  '); // indent each line

    const result =
      '┌─[DEBUG SQL]───────────────────────────────────────────────\n' +
      '  ' +
      formatted.trim() +
      '\n' +
      '└────────────────────────────────────────────────────────────';
    return result;
  }

  /**
   * Formats SQL for colorful and readable debug in terminal.
   * Adds indentation, line breaks, and ANSI colors to major SQL clauses.
   *
   * @private
   * @param {string} value - Raw SQL query string.
   * @returns {string} Colorized and formatted SQL string for terminal.
   */
  #debugSql(value) {
    const RESET = '\x1b[0m';
    const WHITE = '\x1b[37m';
    const BLUE = '\x1b[34m';
    const MAGENTA = '\x1b[35m';
    const YELLOW = '\x1b[33m';

    // SQL keywords to highlight
    const keywords = [
      'WITH',
      'SELECT',
      'FROM',
      'LEFT JOIN',
      'RIGHT JOIN',
      'FULL JOIN',
      'INNER JOIN',
      'CROSS JOIN',
      'JOIN',
      'ON',
      'WHERE',
      'GROUP BY',
      'ORDER BY',
      'HAVING',
      'LIMIT',
      'OFFSET',
      'INSERT INTO',
      'VALUES',
      'UPDATE',
      'SET',
      'DELETE FROM',
      'DELETE',
      'CREATE TABLE',
      'CREATE',
      'DROP TABLE',
      'DROP',
      'ALTER TABLE',
      'ALTER',
      'UNION',
      'EXCEPT',
      'INTERSECT',
      'DISTINCT',
    ];

    // Sort to prevent short words from replacing the long ones first (e.g. DROP before DROP TABLE)
    keywords.sort((a, b) => b.length - a.length);

    // Line breaks before key keywords
    let formatted = value
      .trim()
      .replace(/\s+/g, ' ') // collapses multiple spaces
      .replace(new RegExp(`\\s*(${keywords.join('|')})\\s+`, 'gi'), '\n$1 ') // quebra antes das keywords
      .replace(/,\s*/g, ', ') // well formatted commas
      .replace(/\n/g, '\n  '); // indentation

    // Color all keywords
    for (const word of keywords) {
      const regex = new RegExp(`(\\b${word.replace(/\s+/g, '\\s+')}\\b)`, 'gi');
      formatted = formatted.replace(regex, `${YELLOW}$1${WHITE}`);
    }

    // Remove external breaks and apply colored edge
    return (
      `${BLUE}┌─[${MAGENTA}DEBUG SQL${BLUE}]───────────────────────────────────────────────${RESET}\n` +
      `  ${WHITE}${formatted.trim()}\n` +
      `${BLUE}└────────────────────────────────────────────────────────────${RESET}`
    );
  }

  /**
   * Public wrapper for #debugSql().
   * Formats a SQL query using styled indentation and ANSI colors for terminal output.
   *
   * @param {string} value - The raw SQL query string to be formatted.
   * @returns {string} Formatted and colorized SQL for terminal display.
   */
  debugSql(value) {
    return this.#debugSql(value);
  }

  /**
   * Public wrapper for #debugSqlClassic().
   * Formats a SQL query using minimal spacing (no colors or indentation).
   * Good for compact, single-line SQL logging.
   *
   * @param {string} value - The raw SQL query string to be compressed.
   * @returns {string} Compact single-line SQL string.
   */
  debugSqlClassic(value) {
    return this.#debugSqlClassic(value);
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
    if (objType(input, 'object')) {
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
          if (this.debug) {
            console.log('[sql] [updateTable - ADD]');
            console.log(this.#debugSql(query));
          }
        } catch (error) {
          console.error('[sql] [updateTable - ADD] Error adding column:', error);
        }
      } else if (action === 'REMOVE') {
        const query = `ALTER TABLE ${this.#settings.name} DROP COLUMN IF EXISTS ${change[1]}`;
        try {
          await this.#db.run(query);
          if (this.debug) {
            console.log('[sql] [updateTable - REMOVE]');
            console.log(this.#debugSql(query));
          }
        } catch (error) {
          console.error('[sql] [updateTable - REMOVE] Error removing column:', error);
        }
      } else if (action === 'MODIFY') {
        const query = `ALTER TABLE ${this.#settings.name} ALTER COLUMN ${change[1]} TYPE ${change[2]}${
          change[3] ? `, ALTER COLUMN ${change[1]} SET ${change[3]}` : ''
        }`;
        try {
          await this.#db.run(query);
          if (this.debug) {
            console.log('[sql] [updateTable - MODIFY]');
            console.log(this.#debugSql(query));
          }
        } catch (error) {
          console.error('[sql] [updateTable - MODIFY] Error modifying column:', error);
        }
      } else if (action === 'RENAME') {
        const query = `ALTER TABLE ${this.#settings.name} RENAME COLUMN ${change[1]} TO ${change[2]}`;
        try {
          await this.#db.run(query);
          if (this.debug) {
            console.log('[sql] [updateTable - RENAME]');
            console.log(this.#debugSql(query));
          }
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
    const isConnectionError = (err) => this.isConnectionError(err);
    return new Promise((resolve, reject) => {
      const query = `DROP TABLE ${this.#settings.name};`;
      db.run(query)
        .then(() => {
          if (this.debug) {
            console.log('[sql] [dropTable]');
            console.log(this.#debugSql(query));
          }
          resolve(true);
        })
        .catch((err) => {
          if (isConnectionError(err))
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
        console.log(`[sql] [createTable] [error]`);
        console.log(this.#debugSql(query));
        return err;
      })
      .then((result) => {
        if (this.debug) {
          console.log('[sql] [createTable]');
          console.log(this.#debugSql(query));
        }
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
   * Converts known SQL types to native JS types.
   *
   * Supported types: BOOLEAN, INTEGER, BIGINT, FLOAT, TEXT, JSON, DATE, TIMESTAMP, etc.
   *
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
          case 'DECIMAL':
          case 'NUMERIC':
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
            result[item] = typeof raw === 'number' ? Math.trunc(raw) : parseInt(raw);
            if (Number.isNaN(result[item])) result[item] = null;
            break;

          case 'REAL':
          case 'FLOAT':
          case 'DOUBLE':
            result[item] = typeof raw === 'number' ? raw : parseFloat(raw);
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

          case 'DATE':
          case 'DATETIME':
          case 'TIMESTAMP':
          case 'TIME':
            if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
              result[item] = raw; // Valid date
            } else {
              const parsedDate = new Date(raw);
              result[item] = Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
            }
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
   * @param {string} [settings.select='*'] - SELECT clause configuration. Can be simplified; complex expressions are auto-formatted.
   * @param {string|null} [settings.join=null] - Optional JOIN table name.
   * @param {string|null} [settings.joinCompare='t.key = j.key'] - Condition used to match JOIN tables.
   * @param {string|null} [settings.order=null] - Optional ORDER BY clause.
   * @param {string} [settings.id='key'] - Primary key column name.
   * @param {string|null} [settings.subId=null] - Optional secondary key column name.
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
   * Maps database engines to the corresponding property used
   * to check the number of affected rows after a write operation.
   *
   * This is used to abstract the difference between drivers like:
   * - SQLite (uses `changes`)
   * - PostgreSQL (uses `rowCount`)
   *
   * @private
   * @type {Object.<string>}
   */
  #resultCounts = {
    sqlite3: 'changes',
    postgre: 'rowCount',
  };

  /**
   * Retrieves the number of affected rows from a database operation result.
   *
   * This method abstracts differences between database engines, such as:
   * - SQLite: returns `result.changes`
   * - PostgreSQL: returns `result.rowCount`
   * - Fallback: `result.rowsAffected`, if defined
   *
   * @private
   * @param {Object} result - The result object returned by the database driver.
   * @returns {number|null} The number of affected rows, or null if it can't be determined.
   */
  #getResultCount(result) {
    const sqlEngine = this.#db.getSqlEngine();
    if (objType(result, 'object'))
      return typeof sqlEngine === 'string' &&
        typeof result[this.#resultCounts[sqlEngine]] === 'number'
        ? result[this.#resultCounts[sqlEngine]]
        : typeof result.rowsAffected === 'number'
          ? result.rowsAffected
          : null;
    return null;
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
    const query = `SELECT COUNT(*) FROM ${this.#settings.name} WHERE ${this.#settings.id} = $1${useSub ? ` AND ${this.#settings.subId} = $2` : ''} LIMIT 1`;
    if (useSub) params.push(subId);

    const result = await this.#db.get(query, params);
    if (this.debug) {
      console.log('[sql] [has]', params, result);
      console.log(this.#debugSql(query));
    }
    return objType(result, 'object') && result['COUNT(*)'] === 1 ? true : false;
  }

  /**
   * Updates records based on a complex WHERE clause defined by a filter object.
   * Instead of relying solely on an ID (or subId), this method uses #parseWhere to
   * generate the conditions, and updates the given fields in valueObj.
   *
   * @param {object} valueObj - An object representing the columns and new values for the update.
   * @param {object} filter - An object containing the conditions for the WHERE clause.
   * @returns {Promise<number>} - Count of rows that were updated.
   */
  async advancedUpdate(valueObj = {}, filter = {}) {
    // Validate parameters
    if (!objType(filter, 'object')) {
      throw new Error('Invalid filter object for advancedUpdate');
    }
    if (!objType(valueObj, 'object') || Object.keys(valueObj).length === 0) {
      throw new Error('No update values provided for advancedUpdate');
    }

    // Set the SET clause and its parameters
    const columns = Object.keys(valueObj);
    const updateValues = Object.values(valueObj).map((v) =>
      objType(v, 'object') || Array.isArray(v) ? JSON.stringify(v) : v,
    );
    const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');

    // Creates a parameter cache for WHERE.
    // The initial index should be equal to updateValues.length + 1 to maintain the correct sequence.
    const whereCache = { index: updateValues.length + 1, values: [] };
    const whereClause = this.#parseWhere(whereCache, filter);
    if (!whereClause) {
      throw new Error('Empty WHERE clause — update aborted for safety');
    }

    // Build the complete query
    const query = `UPDATE ${this.#settings.name} SET ${setClause} WHERE ${whereClause}`;
    const params = [...updateValues, ...whereCache.values];

    const result = await this.#db.run(query, params);
    if (this.debug) {
      console.log('[sql] [advancedUpdate]', params, result);
      console.log(this.#debugSql(query));
    }
    return this.#getResultCount(result);
  }

  /**
   * Update an existing record with given data.
   * Will not insert if the record doesn't exist.
   * @param {string|number} id - Primary key value.
   * @param {object} valueObj - Data to update.
   * @returns {Promise<number>} Count of rows were updated.
   */
  async update(id, valueObj = {}) {
    const columns = Object.keys(valueObj);
    const values = Object.values(valueObj).map((v) =>
      objType(v, 'object') || Array.isArray(v) ? JSON.stringify(v) : v,
    );

    const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');

    const useSub = this.#settings.subId && typeof valueObj[this.#settings.subId] !== 'undefined';
    const query = `UPDATE ${this.#settings.name} SET ${setClause} WHERE ${this.#settings.id} = $${columns.length + 1}${useSub ? ` AND ${this.#settings.subId} = $${columns.length + 2}` : ''}`;

    const params = [...values, id];
    if (useSub) params.push(valueObj[this.#settings.subId]);

    const result = await this.#db.run(query, params);
    if (this.debug) {
      console.log('[sql] [update]', params, result);
      console.log(this.#debugSql(query));
    }
    return this.#getResultCount(result);
  }

  /**
   * Insert or update a record with given data.
   * @param {string|number} id - Primary key value.
   * @param {object} valueObj - Data to store.
   * @param {boolean} [onlyIfNew=false] - If true, only insert if the record does not already exist.
   * @returns {Promise<object|null>} - Generated values will be returned.
   */
  async set(id, valueObj = {}, onlyIfNew = false) {
    const columns = Object.keys(valueObj);
    const values = Object.values(valueObj).map((v) =>
      objType(v, 'object') || Array.isArray(v) ? JSON.stringify(v) : v,
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

    const result = await this.#db.get(query, allParams);
    if (this.debug) {
      console.log('[sql] [set]', allParams, result);
      console.log(this.#debugSql(query));
    }
    return result || null;
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
    const query = `SELECT ${this.#settings.select} FROM ${this.#settings.name} t 
                   ${this.#insertJoin()} WHERE t.${this.#settings.id} = $1${useSub ? ` AND t.${this.#settings.subId} = $2` : ''}`;
    if (useSub) params.push(subId);
    const result = this.#jsonChecker(await this.#db.get(query, params));
    if (this.debug) {
      console.log('[sql] [get]', params, result);
      console.log(this.#debugSql(query));
    }
    if (!result) return null;
    return result;
  }

  /**
   * Delete records based on a complex WHERE clause using a filter object.
   *
   * Uses the internal #parseWhere method to build a flexible condition set.
   *
   * @param {object} filter - An object containing the WHERE condition(s).
   * @returns {Promise<number>} - Number of rows deleted.
   */
  async advancedDelete(filter = {}) {
    if (!filter || typeof filter !== 'object') {
      throw new Error('Invalid filter object for advancedDelete');
    }

    const pCache = { index: 1, values: [] };
    const whereClause = this.#parseWhere(pCache, filter);
    if (!whereClause) throw new Error('Empty WHERE clause — deletion aborted for safety');

    const query = `DELETE FROM ${this.#settings.name} WHERE ${whereClause}`;
    const result = await this.#db.run(query, pCache.values);

    if (this.debug) {
      console.log('[sql] [advancedDelete]', pCache.values, result);
      console.log(this.#debugSql(query));
    }

    return this.#getResultCount(result);
  }

  /**
   * Delete a record by its ID (and optional subId).
   * @param {string|number} id - Primary key value.
   * @param {string|number} [subId] - Optional sub-ID for composite key.
   * @returns {Promise<number>} - Count of rows were updated.
   */
  async delete(id, subId) {
    const useSub = this.#settings.subId && subId ? true : false;
    const query = `DELETE FROM ${this.#settings.name} WHERE ${this.#settings.id} = $1${useSub ? ` AND ${this.#settings.subId} = $2` : ''}`;
    const params = [id];
    if (useSub) params.push(subId);

    const result = await this.#db.run(query, params);
    if (this.debug) {
      console.log('[sql] [delete]', params, result);
      console.log(this.#debugSql(query));
    }
    return this.#getResultCount(result);
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
    const orderClause = this.#settings.order ? `ORDER BY ${this.#settings.order}` : '';
    const whereClause = filterId !== null ? `WHERE t.${this.#settings.id} = $1` : '';
    const limitClause = `LIMIT $${filterId !== null ? 2 : 1}`;
    const query = `SELECT ${this.#selectGenerator(selectValue)} FROM ${this.#settings.name} t 
                 ${this.#insertJoin()} 
                 ${whereClause}
                 ${orderClause} ${limitClause}`.trim();

    const params = filterId !== null ? [filterId, count] : [count];
    const results = await this.#db.all(query, params);
    for (const index in results) this.#jsonChecker(results[index]);

    if (this.debug) {
      console.log('[sql] [getAmount]', params, results);
      console.log(this.#debugSql(query));
    }
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
    const orderClause = this.#settings.order ? `ORDER BY ${this.#settings.order}` : '';
    const whereClause = filterId !== null ? `WHERE t.${this.#settings.id} = $1` : '';
    const query = `SELECT ${this.#selectGenerator(selectValue)} FROM ${this.#settings.name} t 
                 ${this.#insertJoin()} 
                 ${whereClause}
                 ${orderClause}`.trim();

    const results = await this.#db.all(query, filterId !== null ? [filterId] : []);
    for (const index in results) this.#jsonChecker(results[index]);

    if (this.debug) {
      console.log('[sql] [getAll]', filterId, results);
      console.log(this.#debugSql(query));
    }
    return results;
  }

  /**
   * Executes a paginated query and returns results, total pages, and total item count.
   *
   * @param {string} query - The base SQL query (should not include LIMIT or OFFSET).
   * @param {Array<any>} params - The parameters for the SQL query.
   * @param {number} perPage - The number of items per page.
   * @param {number} page - The current page number (starting from 1).
   * @returns {Promise<{ items: any[], totalPages: number, totalItems: number }>}
   */
  async #pagination(query, params, perPage, page) {
    const offset = (page - 1) * perPage;
    const isZero = perPage < 1;

    // Count total items
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) AS count_wrapper`;
    const { total } = !isZero ? await this.#db.get(countQuery, params) : { total: 0 };

    // Fetch paginated items
    const paginatedQuery = `${query} LIMIT ? OFFSET ?`;
    const items = !isZero ? await this.#db.all(paginatedQuery, [...params, perPage, offset]) : [];

    const totalPages = !isZero ? Math.ceil(total / perPage) : 0;

    return {
      items,
      totalPages,
      totalItems: total,
    };
  }

  /**
   * Builds a SQL WHERE clause from a nested or flat condition structure.
   *
   * This internal helper method parses logical groupings (AND/OR) and formats the conditions into
   * SQL syntax, while managing parameter placeholders and values.
   *
   * It supports:
   * - Nested condition groups via `group` and `conditions`.
   * - Flat object-based filtering (legacy/fallback support).
   * - Single-condition objects.
   * - Dynamic operators through the internal `#conditions` handler.
   *
   * @param {object} [pCache={}] - Placeholder cache object.
   * @param {number} [pCache.index=1] - Index for SQL placeholders (e.g., $1, $2).
   * @param {any[]} [pCache.values=[]] - Array to store values corresponding to placeholders.
   * @param {object} [group={}] - Grouped or single filter condition.
   * @returns {string} SQL-formatted WHERE clause (without the "WHERE" keyword).
   *
   * @example
   * const pCache = { index: 1, values: [] };
   * const clause = this.#parseWhere(pCache, {
   *   group: 'OR',
   *   conditions: [
   *     { column: 'status', value: 'active' },
   *     { column: 'role', value: 'admin', operator: '=' }
   *   ]
   * });
   * // clause: "(status = $1) OR (role = $2)"
   * // pCache.values: ['active', 'admin']
   */
  #parseWhere(pCache = {}, group = {}) {
    if (!objType(pCache, 'object') || !group || typeof group !== 'object') return '';
    if (typeof pCache.index !== 'number') pCache.index = 1;
    if (!Array.isArray(pCache.values)) pCache.values = [];

    if (group.conditions && Array.isArray(group.conditions)) {
      const logic = group.group?.toUpperCase() === 'OR' ? 'OR' : 'AND';
      const innerConditions = group.conditions.map((cond) => {
        return `(${this.#parseWhere(pCache, cond)})`;
      });
      return innerConditions.join(` ${logic} `);
    }

    // Flat object fallback for backward compatibility
    if (objType(group, 'object') && !group.column) {
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

        pCache.values.push(value);
        return `(${col} ${operator} $${pCache.index++})`;
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

    pCache.values.push(value);
    return `${col} ${operator} $${pCache.index++}`;
  }

  /**
   * Generates a default LEFT JOIN clause based on internal settings.
   *
   * This method is used as a fallback when no custom join is provided.
   * It expects `this.#settings.join` to be a string containing the table name,
   * and `this.#settings.joinCompare` to be the ON condition.
   *
   * @private
   * @returns {string} The default LEFT JOIN SQL snippet, or an empty string if no join is configured.
   */
  #insertJoin() {
    return typeof this.#settings.join === 'string'
      ? `LEFT JOIN ${this.#settings.join} j ON ${this.#settings.joinCompare || ''}`
      : '';
  }

  /**
   * An object containing standard SQL JOIN types.
   * Each property represents a commonly used SQL JOIN keyword.
   * These JOINs define how to combine rows from two or more tables.
   */
  #joinTypes = {
    /**
     * INNER JOIN:
     * Returns only the rows where there is a match in both tables.
     * This is the most commonly used JOIN.
     *
     * Example:
     * SELECT * FROM table1
     * INNER JOIN table2 ON table1.id = table2.fk_id;
     */
    inner: 'INNER JOIN',

    /**
     * LEFT JOIN (or LEFT OUTER JOIN):
     * Returns all rows from the left table, and matched rows from the right table.
     * If there is no match, the result will contain NULLs for the right table.
     *
     * Example:
     * SELECT * FROM table1
     * LEFT JOIN table2 ON table1.id = table2.fk_id;
     */
    left: 'LEFT JOIN',

    /**
     * RIGHT JOIN (or RIGHT OUTER JOIN):
     * Returns all rows from the right table, and matched rows from the left table.
     * If there is no match, the result will contain NULLs for the left table.
     *
     * Example:
     * SELECT * FROM table1
     * RIGHT JOIN table2 ON table1.id = table2.fk_id;
     */
    right: 'RIGHT JOIN',

    /**
     * FULL JOIN (or FULL OUTER JOIN):
     * Returns all rows from both tables.
     * If there is no match, NULLs will be returned for the missing side.
     *
     * Example:
     * SELECT * FROM table1
     * FULL OUTER JOIN table2 ON table1.id = table2.fk_id;
     */
    full: 'FULL JOIN',

    /**
     * CROSS JOIN:
     * Returns the Cartesian product of both tables.
     * Every row from the first table is combined with every row from the second table.
     *
     * Example:
     * SELECT * FROM table1
     * CROSS JOIN table2;
     */
    cross: 'CROSS JOIN',

    /**
     * JOIN (default syntax, behaves like INNER JOIN):
     * Equivalent to INNER JOIN when used without LEFT/RIGHT/FULL keywords.
     * This is just a shorthand and often used in quick queries.
     *
     * Example:
     * SELECT * FROM table1
     * JOIN table2 ON table1.id = table2.fk_id;
     */
    join: 'JOIN',
  };

  /**
   * Parses and generates JOIN clauses based on the provided configuration.
   *
   * Supports multiple formats:
   * - If `join` is a single object: returns a single JOIN clause.
   * - If `join` is an array of objects: generates multiple JOINs with aliases (`j1`, `j2`, ...).
   * - If `join` is invalid or empty: falls back to `#insertJoin()` using internal settings.
   *
   * Each join object must contain:
   * - `table`: The name of the table to join.
   * - `compare`: The ON clause condition.
   * - `type` (optional): One of the supported JOIN types (e.g., 'left', 'inner'). Defaults to 'left'.
   *
   * @private
   * @param {object|object[]} join - The join configuration(s).
   * @returns {string} One or more JOIN SQL snippets.
   */
  #parseJoin(join) {
    const insertJoin = (j, idx) => {
      const alias = `j${idx + 1}`;
      const typeKey = typeof j.type === 'string' ? j.type.toLowerCase() : 'left';
      const joinType = this.#joinTypes[typeKey];

      if (!joinType) {
        throw new Error(
          `Invalid JOIN type: '${j.type}'. Supported types: ${Object.keys(this.#joinTypes).join(', ')}`,
        );
      }

      return `${joinType} ${j.table} ${alias} ON ${j.compare}`;
    };

    return objType(join, 'object')
      ? [join].map(insertJoin).join(' ')
      : Array.isArray(join)
        ? join.map(insertJoin).join(' ')
        : this.#insertJoin();
  }

  /**
   * Finds the first item matching the filter, along with its position, page, and total info.
   * Uses a single SQL query to calculate everything efficiently.
   *
   * If selectValue is null, it only returns the pagination/position data, not the item itself.
   *
   * @param {object} [searchData={}] - Main search configuration.
   * @param {object} [searchData.q={}] - Nested criteria object.
   * @param {number} [searchData.perPage] - Number of items per page.
   * @param {string|string[]|object|null} [searchData.select='*'] - Which columns to select. Set to null to skip item data.
   * @param {string} [searchData.order] - SQL ORDER BY clause. Defaults to configured order.
   * @param {object|object[]} [searchData.join] - JOIN definitions with table, compare, and optional type.
   * @returns {Promise<{ page: number, pages: number, total: number, position: number, item?: object } | null>}
   */
  async find(searchData = {}) {
    const filter = searchData.q || {};
    const selectValue = searchData.select || '*';
    const perPage = searchData.perPage || null;
    const order = searchData.order || this.#settings.order;
    const joinConfig = searchData.join || null;

    if (!filter || typeof filter !== 'object') return null;
    if (typeof perPage !== 'number' || perPage < 1) throw new Error('Invalid perPage value');

    const pCache = { index: 1, values: [] };
    const whereClause = this.#parseWhere(pCache, filter);
    const orderClause = order ? `ORDER BY ${order}` : '';

    // Avoid selecting data if selectValue is null
    const selectedColumns = selectValue === null ? '' : `${this.#selectGenerator(selectValue)},`;

    const query = `
    WITH matched AS (
      SELECT ${selectedColumns}
             ROW_NUMBER() OVER (${orderClause || 'ORDER BY (SELECT 1)'}) AS rn,
             COUNT(*) OVER () AS total
      FROM ${this.#settings.name} t
      ${this.#parseJoin(joinConfig)}
      ${whereClause ? `WHERE ${whereClause}` : ''}
    )
    SELECT *, rn AS position, CEIL(CAST(total AS FLOAT) / ${perPage}) AS pages
    FROM matched
    WHERE rn = 1
  `.trim();

    const row = await this.#db.get(query, pCache.values);
    if (!row) return null;

    const total = parseInt(row.total);
    const pages = parseInt(row.pages);
    const position = parseInt(row.position);
    const page = Math.floor((position - 1) / perPage) + 1;

    const response = {
      page,
      pages,
      total,
      position,
    };

    // If selectValue is NOT null, return the item
    if (selectValue !== null) {
      delete row.rn;
      delete row.total;
      delete row.pages;
      delete row.position;

      this.#jsonChecker(row);
      response.item = row;
    }

    if (this.debug) {
      console.log('[sql] [find]', pCache.values, response);
      console.log(this.#debugSql(query));
    }
    return response;
  }

  /**
   * Perform a filtered search with advanced nested criteria, pagination, and customizable settings.
   *
   * Supports complex logical groupings (AND/OR), flat condition style, custom ordering, and single or multiple joins.
   * Pagination can be enabled using `perPage`, and additional settings like `order`, `join`, and `limit` can be passed inside `searchData`.
   *
   * @param {object} [searchData={}] - Main search configuration.
   * @param {object} [searchData.q={}] - Nested criteria object.
   *        Can be a flat object style or grouped with `{ group: 'AND'|'OR', conditions: [...] }`.
   * @param {string|string[]|object} [searchData.select='*'] - Defines which columns or expressions should be selected in the query.
   * @param {number|null} [searchData.perPage=null] - Number of results per page. If set, pagination is applied.
   * @param {number} [searchData.page=1] - Page number to retrieve when `perPage` is used.
   * @param {string} [searchData.order] - Custom `ORDER BY` clause (e.g. `'created_at DESC'`).
   * @param {string|object[]} [searchData.join] - A string for single join or array of objects for multiple joins.
   *        Each object should contain `{ table: 'name', compare: 'ON clause' }`.
   * @param {number} [searchData.limit] - Max number of results to return (ignored when `perPage` is used).
   * @returns {Promise<object[]>} - Result rows matching the query.
   *
   * @example
   * // Flat search:
   * await db.search({ q: { status: { value: 'active' } } });
   *
   * // Grouped search:
   * await db.search({
   *   q: {
   *     group: 'AND',
   *     conditions: [
   *       { column: 'status', value: 'active' },
   *       {
   *         group: 'OR',
   *         conditions: [
   *           { column: 'role', value: 'admin' },
   *           { column: 'role', value: 'mod' }
   *         ]
   *       }
   *     ]
   *   }
   * });
   *
   * // With pagination and custom joins:
   * await db.search({
   *   q: { status: { value: 'active' } },
   *   select: '*',
   *   perPage: 10,
   *   page: 2,
   *   join: [
   *     { type: 'left', table: 'profiles', compare: 't.profile_id = j1.id' },
   *     { type: 'left', table: 'roles', compare: 'j1.role_id = j2.id' }
   *   ],
   *   order: 'created_at DESC'
   * });
   */

  async search(searchData = {}) {
    const order = searchData.order || this.#settings.order;
    const join = searchData.join || this.#settings.join;
    const limit = searchData.limit || null;
    const criteria = searchData.q || {};
    const selectValue = searchData.select || '*';
    const perPage = searchData.perPage || null;
    const page = searchData.page || 1;

    // Where
    const pCache = { index: 1, values: [] };
    const whereClause = Object.keys(criteria).length
      ? `WHERE ${this.#parseWhere(pCache, criteria)}`
      : '';

    const { values } = pCache;

    // Order by
    const orderClause = order ? `ORDER BY ${order}` : '';

    // Limit
    const limitClause =
      typeof perPage === 'number' ? '' : typeof limit === 'number' ? `LIMIT ${limit}` : '';

    // Query
    const query = `SELECT ${this.#selectGenerator(selectValue)} FROM ${this.#settings.name} t 
                     ${this.#parseJoin(join)} 
                     ${whereClause} 
                     ${orderClause} 
                     ${limitClause}`.trim();

    // Results
    let results;

    // Pagination
    if (typeof perPage === 'number' && perPage > -1) {
      results = await this.#pagination(query, values, perPage, page);
      if (this.debug) {
        console.log('[sql] [search:paginated]', values, results);
        console.log(this.#debugSql(query));
      }
    }

    // Normal
    else {
      results = await this.#db.all(query, values);
      for (const index in results) this.#jsonChecker(results[index]);
      if (this.debug) {
        console.log('[sql] [search]', values, results);
        console.log(this.#debugSql(query));
      }
    }

    // Complete
    return results;
  }
}

export { TinySqlQuery };
export default TinySQL;
