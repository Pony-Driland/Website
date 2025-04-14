import { objType } from '../../lib/objChecker';

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
class TinySqlTags {
  constructor(defaultColumn = 'tags') {
    this.defaultValueName = null;
    this.useJsonEach = true;
    this.parseLimit = -1;
    // json_each
    this.jsonEach = 'json_array_elements_text';
    this.specialQueries = [];
    this.setColumnName(defaultColumn);
  }

  addSpecialQuery(config) {
    if (objType(config, 'object') && typeof config.title === 'string')
      this.specialQueries.push(config);
  }

  removeSpecialQuery(title) {
    const index = this.specialQueries.findIndex((item) => item.title === title);
    if (index > -1) this.specialQueries.splice(index, 1);
  }

  setColumnName(value) {
    this.defaultColumn = typeof value === 'string' ? value : '';
  }

  getColumnName() {
    return this.defaultColumn;
  }

  setParseLimit(value) {
    this.parseLimit = typeof value === 'number' ? value : -1;
  }

  getParseLimit() {
    return this.parseLimit;
  }

  setUseJsonEach(value) {
    this.useJsonEach = typeof value === 'boolean' ? value : 'null';
  }

  setValueName(value) {
    this.defaultValueName = typeof value === 'string' ? value : null;
  }

  setJsonEach(value) {
    this.jsonEach = typeof value === 'string' ? value : null;
  }

  #parseWhere(pCache = { index: 1, values: [] }, group = {}) {
    if (!objType(pCache, 'object') || !group || typeof group !== 'object') return '';
    if (typeof pCache.index !== 'number') pCache.index = 1;
    if (!Array.isArray(pCache.values)) pCache.values = [];

    const where = [];
    const tagsColumn = group.column || this.defaultColumn;
    const tagsValue = group.valueName || this.defaultValueName;
    const include = group.include || [];

    const createQuery = (funcName, param) =>
      `${funcName} (SELECT 1 FROM ${
        this.useJsonEach
          ? `${this.jsonEach}(${tagsColumn}) WHERE value = ${param}`
          : `${tagsColumn} WHERE ${tagsColumn}.${tagsValue} = ${param}`
      })`;

    for (const clause of include) {
      if (Array.isArray(clause)) {
        const ors = clause.map((tag) => {
          const not = tag.startsWith('!');
          const cleanTag = not ? tag.slice(1) : tag;
          const param = `$${pCache.index++}`;
          pCache.values.push(cleanTag);
          return createQuery(`${not ? 'NOT ' : ''}EXISTS`, param);
        });

        if (ors.length) {
          where.push(`(${ors.join(' OR ')})`);
        }
      } else {
        const not = clause.startsWith('!');
        const cleanTag = not ? clause.slice(1) : clause;
        const param = `$${pCache.index++}`;
        pCache.values.push(cleanTag);
        where.push(createQuery(`${not ? 'NOT ' : ''}EXISTS`, param));
      }
    }

    // Apenas AND entre as condições geradas
    return where.length ? `(${where.join(' AND ')})` : '1';
  }

  parseWhere(group, pCache) {
    return this.#parseWhere(pCache, group);
  }

  #extractSpecialsFromChunks(chunks) {
    const specials = [];

    for (let i = chunks.length - 1; i >= 0; i--) {
      const group = chunks[i];

      const terms = Array.isArray(group) ? group : [group];
      const remainingTerms = [];

      for (const term of terms) {
        if (!term.includes(':')) {
          remainingTerms.push(term);
          continue;
        }

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
      }

      // Atualiza o chunk original
      if (remainingTerms.length === 0) {
        chunks.splice(i, 1);
      } else {
        chunks[i] = Array.isArray(group) ? remainingTerms : remainingTerms[0];
      }
    }

    return specials;
  }

  parseString(input) {
    const chunks = [];
    let buffer = '';
    let currentGroup = [];
    let inQuotes = false;
    let quoteChar = '';

    const flushBuffer = () => {
      const value = buffer.trim();
      if (!value) return;
      if (this.parseLimit < 0 || tagCount < this.parseLimit) {
        currentGroup.push(value);
        tagCount++;
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
        continue;
      }

      if (c === ')') {
        flushBuffer();
        flushGroup();
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

    return { include: chunks, special: this.#extractSpecialsFromChunks(chunks) };
  }

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
