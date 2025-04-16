import { objType } from '../../lib/objChecker';

/**
 * @class TinySqlTags
 * @description A powerful utility class for building advanced SQL WHERE clauses with support for tag-based filtering,
 * custom boolean logic, wildcard parsing, and special query handlers.
 *
 * TinySqlTags provides a structured way to interpret and transform flexible user search input into robust SQL conditions,
 * including support for parentheses grouping, AND/OR logic, special colon-based filters, and customizable weight systems
 * using symbolic operators. Designed with modularity and extensibility in mind, it also prevents unwanted repetitions and
 * allows precise control over column names, aliases, and JSON handling through `json_each`.
 *
 * The class includes:
 * - Methods to parse complex string-based filters (`parseString`, `safeParseString`)
 * - Smart logic to detect and manage tag groups, boolean relationships, and custom operators
 * - Support for boost values, exclusions, and other modifiers via symbols (e.g., `-`, `!`)
 * - An internal engine to dynamically build `EXISTS`-based SQL conditions compatible with JSON arrays
 * - Integration-ready output for SQLite3, Postgre or similar relational databases
 *
 * @author JasminDreasond
 * @version 1.0
 * @date 2025-03-24
 *
 * Documentation written with the assistance of OpenAI's ChatGPT.
 *
 * License: AGPL-3.0
 * ----------
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty
 * of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * ----------
 * 💖 Special Thanks 💖
 * Deep gratitude to the Derpibooru project for the inspiration, structure, and creativity
 * that influenced this tool. A tiny heartfelt thank you to **Nighty**. :3
 */
class TinySqlTags {
  /**
   * Creates an instance of the TinySqlTags class.
   * @param {string} defaultColumn - The default column name to use in queries (default is 'tags').
   */
  constructor(defaultColumn = 'tags') {
    this.defaultValueName = null;
    this.useJsonEach = true;
    this.noRepeat = false;
    this.parseLimit = -1;

    // json_each
    this.jsonEach = 'json_array_elements_text';
    this.specialQueries = [];

    this.wildcardA = '*';
    this.wildcardB = '?';

    this.setColumnName(defaultColumn);
  }

  /**
   * #tagInputs is a private property that holds predefined mappings for special symbols
   * used to categorize and assign values to specific tag lists. These mappings help in organizing
   * tags based on their associated symbols and their corresponding value keys.
   *
   * - `'^'`: Maps to the 'boosts' list, with the associated value key being 'boost'.
   * - `'~'`: Maps to the 'fuzzies' list, with the associated value key being 'fuzzy'.
   *
   * These mappings enable flexible handling of tags, where the symbols (`^`, `~`, etc.) can be used
   * to categorize tags dynamically and assign values to them based on their symbol.
   *
   * @private
   * @type {Object<string, { list: string, valueKey: string }>}
   * @example
   * // Example usage:
   * const symbolMapping = this.#tagInputs['^'];
   * // symbolMapping will be { list: 'boosts', valueKey: 'boost' }
   */
  #tagInputs = {
    '^': { list: 'boosts', valueKey: 'boost' },
    '~': { list: 'fuzzies', valueKey: 'fuzzy' },
  };

  /**
   * Adds a new tag input mapping to the #tagInputs property.
   *
   * This method allows dynamic addition of new tag input mappings by providing a `key`,
   * `list`, and `valueKey`. It validates the types of `list` and `valueKey`, and
   * prevents adding a tag with the list name "include" and "column" as it is restricted.
   *
   * @param {string} key - The key (symbol) to associate with the tag input.
   * @param {string} list - The list name where the tag will be added.
   * @param {string} valueKey - The key for the value associated with the tag input.
   * @throws {Error} Throws an error if `list` or `valueKey` are not strings,
   * or if the `list` name is "include" or "column".
   */
  addTagInput(key, list, valueKey) {
    // Validation to ensure 'list' and 'valueKey' are strings
    if (typeof list !== 'string' || typeof valueKey !== 'string') {
      throw new Error('Both list and valueKey must be strings');
    }

    // Prevents adding a tag with the list name "include"
    if (list === 'include') {
      throw new Error('Cannot add a tag with the list name "include"');
    }

    // Prevents adding a tag with the list name "column"
    if (list === 'column') {
      throw new Error('Cannot add a tag with the list name "column"');
    }

    // Adds the new tag input to #tagInputs
    this.#tagInputs[key] = { list, valueKey };
  }

  /**
   * Removes a tag input mapping from the #tagInputs property.
   *
   * This method removes the tag input associated with the specified `key`.
   * It checks if the key exists in the `#tagInputs` object, and if so,
   * deletes the corresponding entry and returns `true`. If the key does not
   * exist, it returns `false`.
   *
   * @param {string} key - The key of the tag input to be removed.
   * @returns {boolean} Returns true if the tag input was successfully removed,
   * false if the key was not found.
   */
  removeTagInput(key) {
    // Check if the key exists in the #tagInputs object
    if (this.#tagInputs.hasOwnProperty(key)) {
      // Delete the tag input if it exists
      delete this.#tagInputs[key];
      return true;
    }
    // Return false if the key was not found
    return false;
  }

  /**
   * Sets whether repeated tags are allowed.
   * Internally sets `this.noRepeat` to the inverse of the boolean value provided.
   * If value is not a boolean, resets `noRepeat` to null.
   *
   * @param {boolean|null} [value=null] - True to allow repeated tags, false to prevent them.
   */
  setCanRepeat(value = null) {
    this.noRepeat = typeof value === 'boolean' ? !value : null;
  }

  /**
   * Sets the wildcard symbol used in the search expression.
   * Only updates if the value is a string.
   *
   * @param {'wildcardA'|'wildcardB'|null} [where=null] - Which wildcard to set.
   * @param {string|null} [value=null] - The wildcard symbol (e.g. '*', '%').
   */
  setWildcard(where = null, value = null) {
    if (where === 'wildcardA') this.wildcardA = typeof value === 'string' ? value : null;
    if (where === 'wildcardB') this.wildcardB = typeof value === 'string' ? value : null;
  }

  /**
   * Adds a new custom special query to the internal list.
   * Special queries can affect how tags are interpreted or matched.
   *
   * @param {Object} config - The special query object to be added.
   * @param {string} config.title - The unique title identifier of the special query.
   */
  addSpecialQuery(config) {
    if (objType(config, 'object') && typeof config.title === 'string')
      this.specialQueries.push(config);
  }

  /**
   * Removes a special query by its title.
   * If the query is found in the internal array, it is removed.
   *
   * @param {string} title - The title of the special query to be removed.
   */
  removeSpecialQuery(title) {
    const index = this.specialQueries.findIndex((item) => item.title === title);
    if (index > -1) this.specialQueries.splice(index, 1);
  }

  /**
   * Sets the name of the default SQL column used when building tag-based conditions.
   *
   * @param {string} value - Column name to be used as default (e.g. 'tags').
   */
  setColumnName(value) {
    this.defaultColumn = typeof value === 'string' ? value : '';
  }

  /**
   * Gets the current default SQL column name used for tag conditions.
   *
   * @returns {string} The name of the default column.
   */
  getColumnName() {
    return this.defaultColumn;
  }

  /**
   * Sets a limit on the number of items parsed from the search string.
   * Used to avoid overloading the engine with too many conditions.
   *
   * @param {number} value - Maximum number of items to parse (use -1 for no limit).
   */
  setParseLimit(value) {
    this.parseLimit = typeof value === 'number' ? value : -1;
  }

  /**
   * Gets the current limit on how many tags are parsed from a search string.
   *
   * @returns {number} The current parse limit.
   */
  getParseLimit() {
    return this.parseLimit;
  }

  /**
   * Enables or disables the use of `json_each()` in SQL statements.
   * This affects how JSON-based columns are traversed.
   *
   * @param {boolean} value - Whether to use `json_each()` in tag conditions.
   */
  setUseJsonEach(value) {
    this.useJsonEach = typeof value === 'boolean' ? value : 'null';
  }

  /**
   * Sets the alias name used in `EXISTS` subqueries, typically referencing `value`.
   *
   * @param {string|null} value - The alias to use in SQL subqueries (e.g. 'value').
   */
  setValueName(value) {
    this.defaultValueName = typeof value === 'string' ? value : null;
  }

  /**
   * Sets the raw SQL string used for the `json_each()` expression.
   * This is used for custom SQL generation.
   *
   * @param {string|null} value - The SQL snippet (e.g. "json_each(tags)").
   */
  setJsonEach(value) {
    this.jsonEach = typeof value === 'string' ? value : null;
  }

  /**
   * Builds an SQL WHERE clause from a structured tag group definition.
   *
   * This method supports both direct equality and wildcard matching using custom
   * wildcard symbols (`wildcardA`, `wildcardB`). Tags can be negated with a leading `!`.
   * It generates nested `EXISTS` or `NOT EXISTS` subqueries depending on the `useJsonEach` flag.
   *
   * The method returns a string representing the SQL WHERE clause, and updates `pCache.values`
   * with the filtered values in proper order for parameterized queries.
   *
   * @private
   * @param {Object} [pCache={ index: 1, values: [] }] - Parameter cache used to build the WHERE clause.
   * @param {number} [pCache.index=1] - Starting parameter index for SQL placeholders (e.g., `$1`, `$2`...).
   * @param {Array<any>} [pCache.values=[]] - Collected values for SQL query binding.
   *
   * @param {Object} [group={}] - Tag group definition to build the clause from.
   * @param {string} [group.column] - SQL column name for tag data (defaults to `this.getColumnName()`).
   * @param {string} [group.valueName] - Alias used for JSON values (defaults to `this.defaultValueName`).
   * @param {boolean} [group.allowWildcards=false] - Whether wildcards are allowed in matching.
   * @param {Array<string|string[]>} [group.include=[]] - Tag values or grouped OR conditions to include.
   *
   * @returns {string} The generated SQL condition string (e.g., `(EXISTS (...)) AND (NOT EXISTS (...))`).
   */
  #parseWhere(pCache = { index: 1, values: [] }, group = {}) {
    if (!objType(pCache, 'object') || !group || typeof group !== 'object') return '';
    if (typeof pCache.index !== 'number') pCache.index = 1;
    if (!Array.isArray(pCache.values)) pCache.values = [];

    const where = [];
    const tagsColumn = group.column || this.getColumnName();
    const tagsValue = group.valueName || this.defaultValueName;
    const allowWildcards = typeof group.allowWildcards === 'boolean' ? group.allowWildcards : false;
    const include = group.include || [];

    const createQuery = (funcName, param, useLike = false) =>
      `${funcName} (SELECT 1 FROM ${
        this.useJsonEach
          ? `${this.jsonEach}(${tagsColumn}) WHERE value ${useLike ? 'LIKE' : '='} ${param}`
          : `${tagsColumn} WHERE ${tagsColumn}.${tagsValue} ${useLike ? 'LIKE' : '='} ${param}`
      })`;

    const filterTag = (tag) => {
      const not = tag.startsWith('!');
      const cleanTag = not ? tag.slice(1) : tag;
      const param = `$${pCache.index++}`;

      const usesWildcard =
        allowWildcards && (cleanTag.includes(this.wildcardA) || cleanTag.includes(this.wildcardB));
      const filteredTag = usesWildcard
        ? cleanTag
            .replace(/([%_])/g, '\\$1')
            .replaceAll(this.wildcardA, '%')
            .replaceAll(this.wildcardB, '_')
        : cleanTag;

      pCache.values.push(filteredTag);
      return { param, usesWildcard, not };
    };

    for (const clause of include) {
      if (Array.isArray(clause)) {
        const ors = clause.map((tag) => {
          const { param, usesWildcard, not } = filterTag(tag);
          return createQuery(`${not ? 'NOT ' : ''}EXISTS`, param, usesWildcard);
        });
        if (ors.length) where.push(`(${ors.join(' OR ')})`);
      } else {
        const { param, usesWildcard, not } = filterTag(clause);
        where.push(createQuery(`${not ? 'NOT ' : ''}EXISTS`, param, usesWildcard));
      }
    }

    // Only AND between the conditions generated
    return where.length ? `(${where.join(' AND ')})` : '1';
  }

  /**
   * Public wrapper for building an SQL WHERE clause based on tag filters.
   *
   * This method delegates to the internal `#parseWhere` method, allowing external
   * access while maintaining control over the formatting and value extraction for
   * SQL parameter binding.
   *
   * Useful when you want to pass dynamic filters into SQL queries using prepared statements.
   *
   * @param {Object} [group={}] - Tag group configuration used to generate WHERE clause logic.
   * @param {Array<string|string[]>} [group.include] - List of tag strings or OR-groups to include.
   * @param {string} [group.column] - Column name to search (defaults to internal config).
   * @param {string} [group.valueName] - Alias name for JSON values (defaults to internal config).
   * @param {boolean} [group.allowWildcards=false] - Whether to interpret wildcard symbols.
   *
   * @param {Object} [pCache={ index: 1, values: [] }] - Cache object for parameter bindings.
   * @param {number} [pCache.index=1] - Initial parameter index (e.g., `$1`, `$2`, ...).
   * @param {Array<any>} [pCache.values=[]] - Values that will be used in the SQL query.
   *
   * @returns {string} SQL WHERE clause constructed from the group definition.
   */
  parseWhere(group, pCache) {
    return this.#parseWhere(pCache, group);
  }

  /**
   * Extracts special query elements and custom tag input groups from parsed search chunks.
   *
   * This method processes a list of parsed string chunks (which may contain modifiers, values,
   * or special keywords) and extracts custom input values and predefined special queries.
   *
   * It uses the configured `#tagInputs` to detect symbol-based values (e.g. score+3, weight*2),
   * and `specialQueries` to detect and parse keys like `source:ponybooru`.
   *
   * It also updates the input chunks to remove already-processed terms and eliminate repetitions
   * when `noRepeat` mode is enabled.
   *
   * @private
   * @param {Array<string|string[]>} chunks - A list of search terms or OR-groups (e.g., ['pony', ['red', 'blue']]).
   *
   * @returns {Object} An object with:
   *   - `specials`: An array of extracted special queries `{ key, value }`.
   *   - one property for each defined group in `#tagInputs`, each holding an array of objects with extracted values.
   *     Example: `{ boosts: [{ term: "pony", boost: 2 }], specials: [...] }`
   */
  #extractSpecialsFromChunks(chunks) {
    const specials = [];
    const outputGroups = {}; // Will store the dynamic groups
    const uniqueMap = {}; // Will store the dynamic sets

    // Initiating sets for each group set in #tagInputs
    for (const symbol in this.#tagInputs) {
      const { list } = this.#tagInputs[symbol];
      outputGroups[list] = [];
      uniqueMap[list] = new Set();
    }

    const uniqueTags = new Set();

    for (let i = chunks.length - 1; i >= 0; i--) {
      const group = chunks[i];
      const terms = Array.isArray(group) ? group : [group];
      const remainingTerms = [];

      for (const term of terms) {
        let matched = false;

        // Checking if the term contains any of the symbols set in #tagInputs
        for (const symbol in this.#tagInputs) {
          if (term.includes(symbol)) {
            const { list, valueKey } = this.#tagInputs[symbol];
            const [termValue, rawValue] = term.split(symbol);
            let value = parseFloat(rawValue.replace(/\!/g, '-'));
            if (Number.isNaN(value)) value = 1;

            // Adds the value to the respective group if it has not yet been processed
            if (!uniqueMap[list].has(termValue.trim())) {
              outputGroups[list].push({ term: termValue.trim(), [valueKey]: value });
              uniqueMap[list].add(termValue.trim());
            }

            // Checking if the term has already been added in the unique tag set
            if (!this.noRepeat || Array.isArray(group) || !uniqueTags.has(termValue.trim())) {
              remainingTerms.push(termValue.trim());
              if (!Array.isArray(group)) uniqueTags.add(termValue.trim());
            }

            matched = true;
            break; // For verification after the first corresponding symbol
          }
        }

        if (matched) continue;

        // Specials with ":"
        if (term.includes(':')) {
          const [key, ...rest] = term.split(':');
          const value = rest.join(':');
          const found = this.specialQueries.find((q) => q.title === key);

          if (found && value !== undefined) {
            let parsedValue = value;
            if (typeof found.parser === 'function') parsedValue = found.parser(value);
            specials.push({ key, value: parsedValue });
          } else {
            remainingTerms.push(term);
          }
        } else {
          // If it is not a special term, it usually treats or allows repetition within groups
          if (!this.noRepeat || Array.isArray(group) || !uniqueTags.has(term)) {
            remainingTerms.push(term);
            if (!Array.isArray(group)) uniqueTags.add(term);
          }
        }
      }

      // If no terms remain, remove the group
      if (remainingTerms.length === 0) {
        chunks.splice(i, 1);
      } else {
        chunks[i] = Array.isArray(group) ? remainingTerms : remainingTerms[0];
      }
    }

    // Returns all dynamically generated groups
    return {
      specials,
      ...outputGroups,
    };
  }

  /**
   * Parses a search input string into structured query components.
   *
   * This method tokenizes the input string based on grouping (parentheses), logical
   * operators (`AND`, `OR`), and quoting (single or double). It supports optional
   * repetition control (`noRepeat`) and a configurable tag limit (`parseLimit`).
   *
   * The output is normalized into an `include` list of tags or OR-groups (arrays),
   * as well as dynamic sets of extracted metadata like `boosts`, `specials`, etc.
   *
   * This parser supports expressions like:
   *   `applejack^2, "rainbow dash", (solo OR duo), pudding AND source:ponybooru`
   *
   * @param {string} input - The user input string to parse.
   *
   * @returns {Object} An object containing:
   *   - `column`: The column name from `this.getColumnName()`.
   *   - `include`: Array of tags and OR-groups to include in the query.
   *   - Additional properties (e.g., `boosts`, `specials`) depending on matches in `#tagInputs` or `specialQueries`.
   *
   * Example return:
   * ```js
   * {
   *   column: 'tags',
   *   include: ['applejack', ['solo', 'duo'], 'pudding'],
   *   boosts: [{ term: 'applejack', boost: 2 }],
   *   specials: [{ key: 'source', value: 'ponybooru' }]
   * }
   * ```
   */
  parseString(input) {
    const chunks = [];
    let buffer = '';
    let currentGroup = [];
    let inQuotes = false;
    let quoteChar = '';
    const uniqueTags = new Set(); // Para garantir que não existam tags duplicadas
    let inGroup = false;

    const flushBuffer = () => {
      const value = buffer.trim();
      if (!value) return;
      if (this.parseLimit < 0 || tagCount < this.parseLimit) {
        if (!this.noRepeat || inGroup || !uniqueTags.has(value)) {
          currentGroup.push(value);
          if (!inGroup) uniqueTags.add(value);
          tagCount++;
        }
      }
      buffer = '';
    };

    const flushGroup = () => {
      if (currentGroup.length === 1) {
        chunks.push(currentGroup[0]);
      } else if (currentGroup.length > 1) {
        chunks.push([...currentGroup]);
      }
      currentGroup = [];
    };

    input = input.replace(/\s+/g, ' ').trim();
    let tagCount = 0;

    for (let i = 0; i < input.length; i++) {
      const c = input[i];
      const next4 = input.slice(i, i + 4).toUpperCase();
      const next3 = input.slice(i, i + 3).toUpperCase();

      if (inQuotes) {
        if (c === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        } else {
          buffer += c;
        }
        continue;
      }

      if (c === '"' || c === "'") {
        inQuotes = true;
        quoteChar = c;
        continue;
      }

      if (c === '(') {
        flushBuffer();
        currentGroup = [];
        inGroup = true;
        continue;
      }

      if (c === ')') {
        flushBuffer();
        flushGroup();
        inGroup = false;
        continue;
      }

      if (next4 === ' AND') {
        flushBuffer();
        flushGroup();
        i += 3;
        continue;
      }

      if (next3 === 'OR ') {
        flushBuffer();
        i += 2;
        continue;
      }

      buffer += c;
    }

    flushBuffer();
    flushGroup();

    const outputGroups = this.#extractSpecialsFromChunks(chunks);
    return { column: this.getColumnName(), include: chunks, ...outputGroups };
  }

  /**
   * Sanitizes and normalizes a raw input string before parsing.
   *
   * This method prepares user input for parsing by replacing common symbolic
   * boolean operators (`&&`, `||`, `-`, `NOT`) with their textual equivalents
   * (`AND`, `OR`, `!`). It also trims whitespace and replaces commas with `AND`
   * to enforce consistent logical separation.
   *
   * This is useful when parsing user input that might come from flexible or
   * user-friendly interfaces where symbols are more commonly used than
   * structured boolean expressions.
   *
   * @param {string} input - The raw user input string.
   *
   * @returns {Object} A structured result object returned by `parseString()`,
   *   containing keys like `column`, `include`, `specials`, `boosts`, etc., depending on
   *   the tags and expressions detected.
   *
   * @example
   * safeParseString("applejack, -source, rarity || twilight")
   * // → equivalent to: parseString("applejack AND !source AND rarity OR twilight")
   */
  safeParseString(input) {
    return this.parseString(
      input
        .split(',')
        .map((item) => item.trim())
        .join(' AND ')
        .replace(/\-|\s?NOT$/g, '!')
        .replace(/\&\&/g, 'AND')
        .replace(/\|\|/g, 'OR'),
    );
  }
}

export default TinySqlTags;
