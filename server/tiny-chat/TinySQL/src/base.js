import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { Client } from 'pg';
import EventEmitter from 'events';

import { objType } from '../../lib/objChecker';
import TinySqlQuery from './query';

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
  #debugCount = 0;

  constructor() {}

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

  #debugConsoleText(id, debugName, status) {
    const reset = '\x1b[0m';
    const gray = '\x1b[90m';
    const blue = '\x1b[34m';
    const green = '\x1b[32m';
    const cyan = '\x1b[36m';

    const tagSQL = `${gray}[${blue}SQL${gray}]${gray}[${blue}${id}${gray}]`;
    const tagDebug = `${gray}[${green}DEBUG${gray}]`;
    const tagName =
      typeof debugName === 'string' && debugName.length > 0
        ? ` ${gray}[${cyan}${debugName}${gray}]`
        : '';
    const tagStatus = typeof status === 'string' ? ` ${gray}[${status}${gray}]` : '';

    return `${tagSQL} ${tagDebug}${tagName}${tagStatus}${reset}`;
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
      const getId = () => this.#debugCount++;
      const isDebug = () => this.#debug;
      const sendSqlDebug = (id, debugName, query) => {
        if (isDebug()) {
          console.log(this.#debugConsoleText(id, debugName));
          console.log(this.#debugSql(query));
        }
      };
      const sendSqlDebugResult = (id, debugName, type, data) => {
        if (isDebug())
          console.log(
            this.#debugConsoleText(id, debugName, type),
            typeof data !== 'undefined' &&
              data !== null &&
              (!Array.isArray(data) || data.length > 0)
              ? data
              : 'Success!',
          );
      };

      /**
       * Executes a query expected to return multiple rows.
       *
       * @param {string} query - The SQL query to execute.
       * @param {Array} [params=[]] - Optional query parameters.
       * @returns {Promise<Array<Object>|null>} Resolves with an array of result rows or null if invalid.
       */
      this.all = async function (query, params = [], debugName = null) {
        return new Promise((resolve, reject) => {
          const id = getId();
          sendSqlDebug(id, debugName, query);
          db.all(query, params)
            .then((result) => {
              sendSqlDebugResult(id, debugName, null, result);
              resolve(Array.isArray(result) ? result : null);
            })
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
      this.get = async function (query, params = [], debugName = null) {
        return new Promise((resolve, reject) => {
          const id = getId();
          sendSqlDebug(id, debugName, query);
          db.get(query, params)
            .then((result) => {
              sendSqlDebugResult(id, debugName, null, result);
              resolve(objType(result, 'object') ? result : null);
            })
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
      this.run = async function (query, params, debugName = null) {
        return new Promise((resolve, reject) => {
          const id = getId();
          sendSqlDebug(id, debugName, query);
          db.run(query, params)
            .then((result) => {
              sendSqlDebugResult(id, debugName, null, result);
              resolve(objType(result, 'object') ? result : null);
            })
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

      const getId = () => this.#debugCount++;
      const isDebug = () => this.#debug;
      const sendSqlDebug = (id, debugName, query) => {
        if (isDebug()) {
          console.log(this.#debugConsoleText(id, debugName));
          console.log(this.#debugSql(query));
        }
      };
      const sendSqlDebugResult = (id, debugName, type, data) => {
        if (isDebug())
          console.log(
            this.#debugConsoleText(id, debugName, type),
            typeof data !== 'undefined' &&
              data !== null &&
              (!Array.isArray(data) || data.length > 0)
              ? data
              : 'Success!',
          );
      };

      /**
       * Executes a query expected to return multiple rows.
       *
       * @param {string} query - The SQL query to execute.
       * @param {Array} [params=[]] - Optional query parameters.
       * @returns {Promise<Array<Object>|null>} Resolves with an array of result rows or null if invalid.
       */
      this.all = async function (query, params = [], debugName = null) {
        await db.open(); // Ensure the connection is open
        try {
          const id = getId();
          sendSqlDebug(id, debugName, query);
          const res = await db.query(query, params);
          sendSqlDebugResult(id, debugName, null, res);
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
      this.get = async function (query, params = [], debugName = null) {
        await db.open(); // Ensure the connection is open
        try {
          const id = getId();
          sendSqlDebug(id, debugName, query);
          const res = await db.query(query, params);
          sendSqlDebugResult(id, debugName, null, res);
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
      this.run = async function (query, params, debugName = null) {
        await db.open(); // Ensure the connection is open
        try {
          const id = getId();
          sendSqlDebug(id, debugName, query);
          const res = await db.query(query, params);
          sendSqlDebugResult(id, debugName, null, res);
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

export default TinySQL;
