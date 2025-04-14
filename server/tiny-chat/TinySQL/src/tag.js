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

  #parseTagWhere(pCache = {}, group = {}) {
    const alias = group.alias || 'p';
    const column = group.column || this.defaultColumn;
    const includeGroups = group.include || []; // Pode ser plano ou nested
    const excludeList = group.exclude || [];

    if (!includeGroups.length && !excludeList.length) return '';

    // Gera subqueries EXISTS para cada grupo de inclusão
    const includeConditions = includeGroups.map((entry) => {
      if (Array.isArray(entry)) {
        // OR group: mistura de EXISTS e NOT EXISTS
        const orConditions = entry.map((term) => {
          if (term.startsWith('!')) {
            const cleanTerm = term.slice(1);
            return `NOT EXISTS (
                SELECT 1 FROM json_each(${alias}.${column})
                WHERE value = '${cleanTerm}'
              )`;
          } else {
            return `EXISTS (
                SELECT 1 FROM json_each(${alias}.${column})
                WHERE value = '${term}'
              )`;
          }
        });
        return `(${orConditions.join(' OR ')})`;
      } else {
        if (entry.startsWith('!')) {
          const cleanTerm = entry.slice(1);
          return `NOT EXISTS (
              SELECT 1 FROM json_each(${alias}.${column})
              WHERE value = '${cleanTerm}'
            )`;
        } else {
          return `EXISTS (
              SELECT 1 FROM json_each(${alias}.${column})
              WHERE value = '${entry}'
            )`;
        }
      }
    });

    // Gera NOT EXISTS para exclusões
    const excludeConditions = excludeList.map((term) => {
      return `NOT EXISTS (
          SELECT 1 FROM json_each(${alias}.${column})
          WHERE value = '${term}'
        )`;
    });

    const allConditions = [...includeConditions, ...excludeConditions];
    return allConditions.length ? `WHERE ${allConditions.join(' AND ')}` : '';
  }

  parseString(input) {
    const chunks = [];
    let buffer = '';
    let currentGroup = [];

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
      const slice4 = input.slice(i, i + 4).toUpperCase();
      const slice3 = input.slice(i, i + 3).toUpperCase();

      if (input[i] === '(') {
        flushBuffer();
        currentGroup = [];
        continue;
      }

      if (input[i] === ')') {
        flushBuffer();
        flushGroup();
        continue;
      }

      if (slice4 === ' AND') {
        flushBuffer();
        flushGroup();
        i += 3;
        continue;
      }

      if (slice3 === 'OR ') {
        flushBuffer();
        i += 2;
        continue;
      }

      buffer += input[i];
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
