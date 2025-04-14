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
class QueryParser {
  constructor(defaultColumn = 'tags') {
    this.defaultColumn = defaultColumn;
  }

  #parseWhere(pCache = { index: 1, values: [] }, group = {}) {
    if (!objType(pCache, 'object') || !group || typeof group !== 'object') return '';
    if (typeof pCache.index !== 'number') pCache.index = 1;
    if (!Array.isArray(pCache.values)) pCache.values = [];

    const where = [];
    const tagsColumn = group.column || this.defaultColumn;
    const include = group.include || [];

    for (const clause of include) {
      if (Array.isArray(clause)) {
        const ors = clause.map((tag) => {
          const not = tag.startsWith('!');
          const cleanTag = not ? tag.slice(1) : tag;
          const param = `$${pCache.index++}`;
          pCache.values.push(cleanTag);

          if (not) {
            return `NOT EXISTS (
              SELECT 1 FROM json_each(${tagsColumn})
              WHERE json_each.value = ${param}
            )`;
          } else {
            return `EXISTS (
              SELECT 1 FROM json_each(${tagsColumn})
              WHERE json_each.value = ${param}
            )`;
          }
        });

        if (ors.length) {
          where.push(`(${ors.join(' OR ')})`);
        }
      } else {
        const not = clause.startsWith('!');
        const cleanTag = not ? clause.slice(1) : clause;
        const param = `$${pCache.index++}`;
        pCache.values.push(cleanTag);

        if (not) {
          where.push(`NOT EXISTS (
            SELECT 1 FROM json_each(${tagsColumn})
            WHERE json_each.value = ${param}
          )`);
        } else {
          where.push(`EXISTS (
            SELECT 1 FROM json_each(${tagsColumn})
            WHERE json_each.value = ${param}
          )`);
        }
      }
    }

    // Apenas AND entre as condições geradas
    return where.length ? `(${where.join(' AND ')})` : '1';
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
      currentGroup.push(value);
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

    return { include: chunks };
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
