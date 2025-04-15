import { Client } from 'pg';
import { objType } from '../../lib/objChecker';

const clientBase = new Client();

/**
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
class TinySqlQuery {
  #conditions = {};
  #customValFunc = {};
  #db;
  #settings = {};
  #table = {};

  constructor() {
    this.debug = false;

    // Predefined condition operator mappings used in searches
    this.addCondition('LIKE', (condition) => ({
      operator: 'LIKE',
      value:
        `${typeof condition.lPos !== 'string' || condition.lPos === 'left' ? '%' : ''}` +
        `${condition.value}` +
        `${typeof condition.lPos !== 'string' || condition.lPos === 'right' ? '%' : ''}`,
    }));

    this.addCondition('NOT', '!=');
    this.addCondition('=', '=');
    this.addCondition('!=', '!=');
    this.addCondition('>=', '>=');
    this.addCondition('<=', '<=');
    this.addCondition('>', '>');
    this.addCondition('<', '<');

    // Soundex with custom value handler
    this.addConditionV2('SOUNDEX', true); // Performs phonetic comparison based on how words sound. Example: SOUNDEX(name) = SOUNDEX('rainbow')

    // Case conversion
    this.addConditionV2('LOWER'); // Converts all characters in the column to lowercase. Example: LOWER(username) = 'fluttershy'
    this.addConditionV2('UPPER'); // Converts all characters in the column to uppercase. Example: UPPER(username) = 'FLUTTERSHY'

    // Trimming whitespace
    this.addConditionV2('TRIM'); // Removes leading and trailing whitespace. Example: TRIM(title) = 'pony party'
    this.addConditionV2('LTRIM'); // Removes leading whitespace only. Example: LTRIM(title) = 'pony party'
    this.addConditionV2('RTRIM'); // Removes trailing whitespace only. Example: RTRIM(title) = 'pony party'

    // String and value length
    this.addConditionV2('LENGTH'); // Returns the number of characters in the column. Example: LENGTH(comment) > 100

    // Mathematical operations
    this.addConditionV2('ABS'); // Compares the absolute value of a column. Example: ABS(score) = 10
    this.addConditionV2('ROUND'); // Rounds the numeric value of the column. Example: ROUND(rating) = 4
    this.addConditionV2('CEIL', false, '>='); // Rounds the value up before comparison. Example: CEIL(price) >= 50
    this.addConditionV2('FLOOR', false, '<='); // Rounds the value down before comparison. Example: FLOOR(price) <= 49

    // Null and fallback handling
    this.addConditionV2('COALESCE'); // Uses a fallback value if the column is NULL. Example: COALESCE(nickname) = 'anonymous'

    // String formatting
    this.addConditionV2('HEX'); // Converts value to hexadecimal string. Example: HEX(id) = '1A3F'
    this.addConditionV2('QUOTE'); // Returns the string quoted. Example: QUOTE(title) = "'hello world'"

    // Character and Unicode
    this.addConditionV2('UNICODE'); // Gets the Unicode of the first character. Example: UNICODE(letter) = 9731
    this.addConditionV2('CHAR'); // Converts a code point to its character. Example: CHAR(letter_code) = 'A'

    // Type inspection
    this.addConditionV2('TYPEOF'); // Returns the data type of the value. Example: TYPEOF(data_field) = 'text'

    // Date and time extraction
    this.addConditionV2('DATE'); // Extracts the date part. Example: DATE(timestamp) = '2025-04-15'
    this.addConditionV2('TIME'); // Extracts the time part. Example: TIME(timestamp) = '15:30:00'
    this.addConditionV2('DATETIME'); // Converts to full datetime. Example: DATETIME(created_at) = '2025-04-15 14:20:00'
    this.addConditionV2('JULIANDAY'); // Converts to Julian day number. Example: JULIANDAY(date_column) = 2460085.5
  }

  /**
   * Returns the condition key if it exists in the internal condition map.
   *
   * This method is useful for checking the existence of a condition without exposing its implementation.
   *
   * @param {string} key - The condition identifier to look up.
   * @returns {string|null} The key if it exists, otherwise null.
   */
  getCondition(key) {
    if (typeof key !== 'string' || !this.#conditions[key]) return null;
    return key;
  }

  /**
   * Retrieves a list of all registered condition keys.
   *
   * This method returns only the list of identifiers without exposing the associated condition logic.
   *
   * @returns {string[]} Array of all registered condition keys.
   */
  getConditions() {
    return Object.keys(this.#conditions);
  }

  /**
   * Registers a new condition under a unique key to be used in query generation.
   *
   * The `conditionHandler` determines how the condition will behave. It can be:
   * - A **string**, representing a SQL operator (e.g., '=', '!=', 'LIKE');
   * - An **object**, which must include an `operator` key (e.g., { operator: '>=' });
   * - A **function**, which receives a `condition` object and returns a full condition definition.
   *
   * If a `valueHandler` is provided, it must be a function that handles value transformation,
   * and will be stored under the same key in the internal value function map.
   *
   * This method does not allow overwriting an existing key in either condition or value handlers.
   *
   * @param {string} key - Unique identifier for the new condition type.
   * @param {string|object|function} conditionHandler - Defines the logic or operator of the condition.
   * @param {function|null} [valueHandler=null] - Optional custom function for value transformation (e.g., for SOUNDEX).
   *
   * @throws {Error} If the key is not a non-empty string.
   * @throws {Error} If the key already exists in either conditions or value handlers.
   * @throws {Error} If conditionHandler is not a string, object with `operator`, or function.
   * @throws {Error} If valueHandler is provided but is not a function.
   */
  addCondition(key, conditionHandler, valueHandler = null) {
    if (typeof key !== 'string' || key.trim() === '') {
      throw new Error(`Condition key must be a non-empty string.`);
    }

    if (this.#conditions[key] || this.#customValFunc[key]) {
      throw new Error(`Condition key "${key}" already exists.`);
    }

    const isFunc = typeof conditionHandler === 'function';
    const isStr = typeof conditionHandler === 'string';
    const isObj = objType(conditionHandler, 'object');

    if (!isFunc && !isStr && !isObj) {
      throw new Error(
        `Condition handler must be a string (operator), an object with an "operator", or a function.`,
      );
    }

    if (isObj) {
      if (typeof conditionHandler.operator !== 'string' || !conditionHandler.operator.trim()) {
        throw new Error(
          `When using an object as condition handler, it must contain a non-empty string "operator" field.`,
        );
      }
    }

    if (valueHandler !== null && typeof valueHandler !== 'function') {
      throw new Error(`Custom value handler must be a function if provided.`);
    }

    // Add condition
    this.#conditions[key] = isStr
      ? () => ({ operator: conditionHandler })
      : isObj
        ? () => ({ ...conditionHandler }) // Clone the object
        : conditionHandler; // function

    // Add value handler if provided
    if (valueHandler) this.#customValFunc[key] = valueHandler;
  }

  /**
   * Registers a SQL function-based condition with optional operator and value transformation.
   *
   * This helper wraps a SQL column in a function (e.g., `LOWER(column)`) and optionally
   * transforms the parameter using the same function (e.g., `LOWER($1)`), depending on config.
   *
   * It integrates with the dynamic condition system that uses:
   *   - `#conditions[name]` for SQL structure generation
   *   - `#customValFunc[valType]` for optional value transformations
   *
   * @param {string} funcName - SQL function name to wrap around the column (e.g., `LOWER`, `SOUNDEX`).
   * @param {boolean} [editParamByDefault=false] - If true, also applies the SQL function to the parameter by default.
   * @param {string} [operator='='] - Default SQL comparison operator (e.g., `=`, `!=`, `>`, `<`).
   *
   * -----------------------------------------------------
   *
   * Runtime Behavior:
   * - Uses `group.newOp` (if provided) to override the default operator.
   * - Uses `group.funcName` (if string) to override the default function name used in `valType`.
   * - If `funcName !== null` and `editParamByDefault === true`, the function will also apply to the param.
   * - The final SQL looks like: FUNC(column) OP FUNC($n), if both sides use the same function.
   *
   *
   * The `group` object passed at runtime may include:
   * @param {Object} group
   * @param {string} group.column - The column name to apply the function on.
   * @param {string} [group.newOp] - Optional override for the comparison operator.
   * @param {string|null} [group.funcName] - Optional override for the SQL function name
   *                                             (affects both SQL column and valType used in `#customValFunc`).
   *
   * --------------------------------------------------------------------------------
   * How it's used in the system:
   *
   * ```js
   * const result = this.#conditions[group.operator](group);
   * const param = typeof this.#customValFunc[result.valType] === 'function'
   *   ? this.#customValFunc[result.valType](`$1`)
   *   : `$1`;
   * const sql = `${result.column} ${result.operator} ${param}`;
   * ```
   *
   * -----------------------------------------------------
   * @example
   * // Registers a ROUND() comparison with "!="
   * addConditionV2('ROUND', false, '!=');
   *
   * -----------------------------------------------------
   * @example
   * // Registers LOWER() with editParamByDefault
   * addConditionV2('LOWER', true);
   *
   * // Parses as: LOWER(username) = LOWER($1)
   * parse({ column: 'username', value: 'fluttershy', operator: 'LOWER' });
   *
   *  -----------------------------------------------------
   * @example
   * // Registers UPPER() = ? without editParamByDefault
   * addConditionV2('UPPER');
   *
   * // Parses as: UPPER(username) = $1
   * parse({ column: 'username', value: 'rarity', operator: 'UPPER' });
   *
   *  -----------------------------------------------------
   * @example
   * // Can be overridden at runtime:
   * addConditionV2('CEIL', true);
   *
   * parse({
   *  column: 'price',
   *  value: 3,
   *  newOp: '>',
   *  operator: 'CEIL',
   *  funcName: null
   * });
   *
   * // Result: CEIL(price) > 3
   */
  addConditionV2 = (funcName, editParamByDefault = false, operator = '=') =>
    this.addCondition(
      funcName,
      (condition) => ({
        operator: typeof condition.newOp === 'string' ? condition.newOp : operator,
        valType:
          typeof condition.funcName === 'string'
            ? condition.funcName
            : editParamByDefault && condition.funcName !== null
              ? funcName
              : null,
        column: `${funcName}(${condition.column})`,
      }),
      (param) => `${funcName}(${param})`,
    );

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
   * Generates a SELECT clause based on the input, supporting SQL expressions, aliases,
   * and boosts using CASE statements.
   *
   * This method supports the following input formats:
   *
   * - `null` or `undefined`: returns '*'
   * - `string`: returns the parsed column/expression (with optional aliasing if `AS` is present)
   * - `string[]`: returns a comma-separated list of parsed columns
   * - `object`: supports structured input with:
   *   - `aliases`: key-value pairs of column names and aliases
   *   - `values`: array of column names or expressions
   *   - `boost`: object describing a weighted relevance score using CASE statements
   *     - Must include `alias` (string) and `value` (array of boost rules)
   *     - Each boost rule supports:
   *       - `columns` (string|string[]): target columns to apply the condition on (optional)
   *       - `value` (string|array): value(s) to compare, or a raw SQL condition if `columns` is omitted
   *       - `operator` (string): SQL comparison operator (default: 'LIKE', supports 'IN', '=', etc.)
   *       - `weight` (number): numeric weight applied when condition matches (default: 1)
   *     - If `columns` is omitted, the `value` is treated as a raw SQL condition inserted directly into the CASE.
   *
   * Escaping of all values is handled by `Client.escapeLiteral()` for SQL safety (PostgreSQL).
   *
   * @private
   * @param {string|string[]|object|null|undefined} input - Select clause definition.
   * @returns {string} - A valid SQL SELECT clause string.
   *
   * @example
   * this.#selectGenerator();
   * // returns '*'
   *
   * this.#selectGenerator('COUNT(*) AS total');
   * // returns 'COUNT(*) AS total'
   *
   * this.#selectGenerator(['id', 'username']);
   * // returns 'id, username'
   *
   * this.#selectGenerator({
   *   aliases: {
   *     id: 'image_id',
   *     uploader: 'user_name'
   *   },
   *   values: ['created_at', 'score']
   * });
   * // returns 'id AS image_id, uploader AS user_name, created_at, score'
   *
   * this.#selectGenerator({
   *   aliases: {
   *     id: 'image_id',
   *     uploader: 'user_name'
   *   },
   *   values: ['created_at'],
   *   boost: {
   *     alias: 'relevance',
   *     value: [
   *       {
   *         columns: ['tags', 'description'],
   *         value: 'fluttershy',
   *         weight: 2
   *       },
   *       {
   *         columns: 'tags',
   *         value: 'pinkie pie',
   *         operator: 'LIKE',
   *         weight: 1.5
   *       },
   *       {
   *         columns: 'tags',
   *         value: 'oc',
   *         weight: -1
   *       },
   *       {
   *         value: "score > 100 AND views < 1000",
   *         weight: 5
   *       }
   *     ]
   *   }
   * });
   * // returns something like:
   * // CASE
   * //   WHEN tags LIKE '%fluttershy%' OR description LIKE '%fluttershy%' THEN 2
   * //   WHEN tags LIKE '%pinkie pie%' THEN 1.5
   * //   WHEN tags LIKE '%oc%' THEN -1
   * //   WHEN score > 100 AND views < 1000 THEN 5
   * //   ELSE 0
   * // END AS relevance, id AS image_id, uploader AS user_name, created_at
   */
  #selectGenerator(input) {
    if (!input) return '*';

    // Boost parser helper
    const parseAdvancedBoosts = (boostArray, alias) => {
      const cases = [];

      for (const boost of boostArray) {
        const { columns, operator = 'LIKE', value, weight = 1 } = boost;

        const opValue = operator.toUpperCase();

        if (!columns) {
          // No columns: treat value as raw condition
          cases.push(`WHEN ${value} THEN ${weight}`);
          continue;
        }

        if (opValue === 'IN') {
          const conditions = columns.map((col) => {
            if (Array.isArray(value)) {
              const inList = value.map((v) => clientBase.escapeLiteral(v)).join(', ');
              return `${col} IN (${inList})`;
            } else {
              console.warn(`IN operator expected array, got`, value);
              return 'FALSE';
            }
          });
          cases.push(`WHEN ${conditions.join(' OR ')} THEN ${weight}`);
        } else {
          const safeVal = clientBase.escapeLiteral(
            ['LIKE', 'ILIKE'].includes(opValue) ? `%${value}%` : value,
          );
          const conditions = columns.map((col) => `${col} ${operator} ${safeVal}`);
          cases.push(`WHEN ${conditions.join(' OR ')} THEN ${weight}`);
        }
      }

      return `CASE ${cases.join(' ')} ELSE 0 END AS ${alias}`;
    };

    // If input is an array, join all columns
    if (Array.isArray(input)) {
      return (
        input
          .map((col) => this.#parseColumn(col))
          .filter(Boolean)
          .join(', ') || '*'
      );
    }

    // If input is an object, handle key-value pairs for aliasing (with boosts support)
    if (objType(input, 'object')) {
      let result = [];
      // Processing aliases
      if (input.aliases)
        result = result.concat(
          Object.entries(input.aliases).map(([col, alias]) => this.#parseColumn(col, alias)),
        );

      // If input is an array, join all columns
      if (Array.isArray(input.values))
        result.push(...input.values.map((col) => this.#parseColumn(col)));

      // Processing boosts
      if (objType(input.boost, 'object')) {
        if (typeof input.boost.alias !== 'string')
          throw new Error('Missing or invalid boost.alias in #selectGenerator');
        if (Array.isArray(input.boost.value))
          result.push(parseAdvancedBoosts(input.boost.value, input.boost.alias));
      }

      // Complete
      return result.join(', ') || '*';
    }

    // If input is a string, treat it as a custom SQL expression
    if (typeof input === 'string') {
      return this.#parseColumn(input);
    }

    return '*';
  }

  /**
   * Public wrapper for the internal #selectGenerator method.
   *
   * This method builds a full SQL SELECT clause based on the input format,
   * supporting SQL-safe expressions, aliases, simple column lists, and
   * relevance-based boosting logic with CASE statements.
   *
   * It accepts the same inputs as `#selectGenerator`, allowing:
   * - Simple string expressions
   * - Arrays of column names
   * - Objects with `values`, `aliases`, and `boost` definitions
   *
   * The `boost` logic allows for custom relevance boosting with `CASE` statements.
   * If a `columns` value is not provided, `value` will be treated as a raw SQL condition.
   *
   * See `#selectGenerator` for detailed internal logic and examples.
   *
   * @param {string|string[]|object|null|undefined} input - Input for SELECT clause generation.
   * @returns {string} - A properly formatted SQL SELECT clause.
   *
   * @example
   * sql.selectGenerator('COUNT(*) AS total');
   * // => 'COUNT(*) AS total'
   *
   * sql.selectGenerator(['id', 'name']);
   * // => 'id, name'
   *
   * sql.selectGenerator({
   *   aliases: { id: 'image_id' },
   *   values: ['created_at']
   * });
   * // => 'id AS image_id, created_at'
   *
   * sql.selectGenerator({
   *   boost: {
   *     alias: 'relevance',
   *     value: [
   *       {
   *         columns: ['title', 'description'],
   *         value: 'fluttershy',
   *         weight: 2
   *       },
   *       {
   *         columns: 'tags',
   *         value: 'pinkie pie',
   *         operator: 'LIKE',
   *         weight: 1.5
   *       },
   *       {
   *         columns: 'tags',
   *         value: 'oc',
   *         weight: -1
   *       },
   *       {
   *         value: "score > 100 AND views < 1000",
   *         weight: 5
   *       }
   *     ]
   *   }
   * });
   * // => CASE
   * //   WHEN title LIKE '%fluttershy%' OR description LIKE '%fluttershy%' THEN 2
   * //   WHEN tags LIKE '%pinkie pie%' THEN 1.5
   * //   WHEN tags LIKE '%oc%' THEN -1
   * //   WHEN score > 100 AND views < 1000 THEN 5
   * //   ELSE 0
   * // END AS relevance
   */
  selectGenerator(input) {
    return this.#selectGenerator(input);
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
   * Utility functions to sanitize and convert raw database values
   * into proper JavaScript types for JSON compatibility and safe parsing.
   */
  #jsonEscape = {
    /**
     * Converts truthy values to boolean `true`.
     * Accepts: true, "true", 1, "1"
     */
    boolean: (raw) => raw === true || raw === 'true' || raw === 1 || raw === '1',
    /**
     * Converts values into BigInt.
     * Returns `null` if parsing fails or value is invalid.
     */
    bigInt: (raw) => {
      if (typeof raw === 'bigint') return raw;
      else {
        try {
          return BigInt(raw);
        } catch {
          return null;
        }
      }
    },
    /**
     * Converts values to integers using `parseInt`.
     * Floats are truncated if given as numbers.
     * Returns `null` on NaN.
     */
    int: (raw) => {
      const result = typeof raw === 'number' ? Math.trunc(raw) : parseInt(raw);
      if (Number.isNaN(result)) return null;
      return result;
    },
    /**
     * Parses values as floating-point numbers.
     * Returns `null` if value is not a valid float.
     */
    float: (raw) => {
      const result = typeof raw === 'number' ? raw : parseFloat(raw);
      if (Number.isNaN(result)) return null;
      return result;
    },
    /**
     * Attempts to parse a string as JSON.
     * If already an object or array, returns the value as-is.
     * Otherwise returns `null` on failure.
     */
    json: (raw) => {
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      } else if (objType(raw, 'object') || Array.isArray(raw)) return raw;
      return null;
    },
    /**
     * Validates that the value is a string, otherwise returns `null`.
     */
    text: (raw) => (typeof raw === 'string' ? raw : null),
    /**
     * Converts the value into a valid Date object.
     * Returns the original date if already valid,
     * or a new Date instance if parsable.
     * Returns `null` if parsing fails.
     */
    date: (raw) => {
      if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
        return raw; // Valid date
      } else {
        const parsedDate = new Date(raw);
        return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
      }
    },
  };

  /**
   * Maps SQL data types (as returned from metadata or schema)
   * to the appropriate conversion function from #jsonEscape.
   */
  #jsonEscapeAlias = {
    // Boolean aliases
    BOOLEAN: (raw) => this.#jsonEscape.boolean(raw),
    BOOL: (raw) => this.#jsonEscape.boolean(raw),

    // BigInt-compatible numeric types
    BIGINT: (raw) => this.#jsonEscape.bigInt(raw),
    DECIMAL: (raw) => this.#jsonEscape.bigInt(raw),
    NUMERIC: (raw) => this.#jsonEscape.bigInt(raw),

    // Integer aliases
    INTEGER: (raw) => this.#jsonEscape.int(raw),
    INT: (raw) => this.#jsonEscape.int(raw),
    SMALLINT: (raw) => this.#jsonEscape.int(raw),
    TINYINT: (raw) => this.#jsonEscape.int(raw),

    // Floating-point types
    REAL: (raw) => this.#jsonEscape.float(raw),
    FLOAT: (raw) => this.#jsonEscape.float(raw),
    DOUBLE: (raw) => this.#jsonEscape.float(raw),

    // JSON-compatible field
    JSON: (raw) => this.#jsonEscape.json(raw),

    // Textual representations
    TEXT: (raw) => this.#jsonEscape.text(raw),
    CHAR: (raw) => this.#jsonEscape.text(raw),
    VARCHAR: (raw) => this.#jsonEscape.text(raw),
    CLOB: (raw) => this.#jsonEscape.text(raw),

    // Date/time types
    DATE: (raw) => this.#jsonEscape.date(raw),
    DATETIME: (raw) => this.#jsonEscape.date(raw),
    TIMESTAMP: (raw) => this.#jsonEscape.date(raw),
    TIME: (raw) => this.#jsonEscape.date(raw),
  };

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
      if (typeof this.#jsonEscapeAlias[type] === 'function')
        result[item] = this.#jsonEscapeAlias[type](raw);
    }

    return result;
  }

  /**
   * Escapes values inside the valueObj using type definitions from this.#table.
   * Only modifies the values that have a matching column in the table.
   * Uses the appropriate parser from #jsonEscapeAlias.
   * @param {object} valueObj - The object containing values to be escaped.
   * @returns {object} The same valueObj with its values escaped according to table definitions.
   */
  #escapeValues(valueObj = {}) {
    for (const key in valueObj) {
      if (!valueObj.hasOwnProperty(key)) continue;

      const columnDef = this.#table[key];
      if (columnDef && columnDef.type) {
        const type = columnDef.type.toUpperCase();
        const escapeFn = this.#jsonEscapeAlias[type];

        if (typeof escapeFn === 'function') {
          valueObj[key] = escapeFn.call(this, valueObj[key]);
        }
      }
    }

    return valueObj;
  }

  /**
   * Wrapper function to escape values in valueObj using #escapeValues.
   * @param {object} valueObj - The object containing values to be escaped.
   * @returns {object} The same valueObj with its values escaped according to table definitions.
   */
  escapeValues(valueObj = {}) {
    return this.#escapeValues(valueObj);
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
   * Type-specific value transformers for preparing data before insertion or update.
   * This object maps column types to functions that transform values accordingly.
   * Used internally by #escapeValuesFix.
   */
  #jsonEscapeFix = {
    // Serializes any value into a JSON string.
    JSON: (raw) => JSON.stringify(raw),
  };

  /**
   * Applies type-specific escaping to a single value based on the table's column definition.
   * @param {any} v - The raw value to be escaped.
   * @param {string} name - The column name associated with the value.
   * @returns {any} The escaped value if a valid type and handler exist; otherwise, the original value.
   */
  #escapeValuesFix(v, name) {
    const column = this.#table?.[name];
    const type = column.type || '';
    if (typeof this.#jsonEscapeFix[type] !== 'function') return v;
    else return this.#jsonEscapeFix[type](v);
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
    const updateValues = Object.values(valueObj).map((v, index) =>
      this.#escapeValuesFix(v, columns[index]),
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
    const values = Object.values(valueObj).map((v, index) =>
      this.#escapeValuesFix(v, columns[index]),
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
    const values = Object.values(valueObj).map((v, index) =>
      this.#escapeValuesFix(v, columns[index]),
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

    const getParamResult = (valType) => {
      const newIndex = pCache.index++;
      return typeof this.#customValFunc[valType] === 'function'
        ? this.#customValFunc[valType](`$${newIndex}`)
        : `$${newIndex}`;
    };

    // Flat object fallback for backward compatibility
    if (objType(group, 'object') && !group.column) {
      const entries = Object.entries(group);
      const logic = 'AND';
      const innerConditions = entries.map(([newCol, cond]) => {
        let col = newCol;
        let operator = '=';
        let value = cond.value;
        let valType = cond.valType;

        if (cond.operator) {
          const selected = cond.operator.toUpperCase();
          if (typeof this.#conditions[selected] === 'function') {
            const result = this.#conditions[selected](cond);
            if (typeof result.operator === 'string') operator = result.operator;
            if (typeof result.value !== 'undefined') value = result.value;
            if (typeof result.column === 'string') col = result.column;
            if (typeof result.valType === 'string') valType = result.valType;
          }
        }

        pCache.values.push(value);
        return `(${col} ${operator} $${getParamResult(valType)})`;
      });
      return innerConditions.join(` ${logic} `);
    }

    // If it's a single condition
    let col = group.column;
    let operator = '=';
    let value = group.value;
    let valType = group.valType;

    if (group.operator) {
      const selected = group.operator.toUpperCase();
      if (typeof this.#conditions[selected] === 'function') {
        const result = this.#conditions[selected](group);
        if (typeof result.operator === 'string') operator = result.operator;
        if (typeof result.column === 'string') col = result.column;
        if (typeof result.valType === 'string') valType = result.valType;
        if (typeof result.value !== 'undefined') value = result.value;
      }
    }

    pCache.values.push(value);
    return `${col} ${operator} ${getParamResult(valType)}`;
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
   * await table.search({ q: { status: { value: 'active' } } });
   *
   * // Grouped search:
   * await table.search({
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
   * await table.search({
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

export default TinySqlQuery;
