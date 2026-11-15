import { marked } from 'marked';
import {
  isFallbackNsfwExpression,
  matchesNsfwExpression,
  registerNsfwFilterExpression,
} from '../nsfw.mjs';

/** Matches the opening fence of a mature content block. */
const OPEN_FENCE = /^:::nsfw(?:[ \t]+(.*))?$/;

/** Matches the closing fence of a mature content block. */
const CLOSE_FENCE = /^:::[ \t]*$/;

/**
 * Marked extension that renders reader-dependent content.
 *
 * It reuses the mature content filters of the chapter reader, so a reader that
 * enabled `vore` in the reader also unlocks every `vore` block of the wiki.
 *
 * ```md
 * :::nsfw vore
 * Content only shown when the `vore` filter is enabled.
 * :::nsfw !vore
 * Content only shown while the `vore` filter is disabled.
 * :::nsfw default
 * Fallback used when no other branch matches.
 * :::
 * ```
 *
 * Every branch is optional and a block without any branch is a no-op.
 *
 * @type {import('marked').TokenizerAndRendererExtension}
 */
const nsfwExtension = {
  name: 'nsfw-block',
  level: 'block',

  /**
   * Finds the starting index of a mature content block.
   *
   * @param {string} src - Markdown source.
   * @returns {number | void} Index of the block.
   */
  start(src) {
    const index = src.search(/^:::nsfw(?:[ \t\r]|$)/m);
    return index < 0 ? undefined : index;
  },

  /**
   * Tokenizes a mature content block.
   *
   * @this {import('marked').TokenizerThis}
   * @param {string} src - Markdown source.
   * @returns {import('marked').Tokens.Generic | undefined} The mature content token.
   */
  tokenizer(src) {
    // Markdown files are commonly stored with CRLF line endings, so the block is
    // always read line by line instead of relying on a single multi-line regex.
    const lines = src.split('\n');
    const first = OPEN_FENCE.exec(stripCr(lines[0]));
    if (!first) return undefined;

    /** @type {{ expression: string, lines: string[] }[]} */
    const branches = [{ expression: (first[1] ?? '').trim(), lines: [] }];
    let closed = false;
    let index = 1;

    for (; index < lines.length; index++) {
      const line = stripCr(lines[index]);

      // A closing fence ends the whole block.
      if (CLOSE_FENCE.test(line)) {
        closed = true;
        index++;
        break;
      }

      // A new header starts another branch of the same block.
      const header = OPEN_FENCE.exec(line);
      if (header) {
        branches.push({ expression: (header[1] ?? '').trim(), lines: [] });
        continue;
      }

      branches[branches.length - 1].lines.push(line);
    }

    // An unterminated block is not a mature content block at all.
    if (!closed) return undefined;

    return {
      type: 'nsfw-block',
      raw: lines.slice(0, index).join('\n'),
      branches: branches.map((branch) => ({
        expression: branch.expression,
        tokens: this.lexer.blockTokens(branch.lines.join('\n').trim(), []),
      })),
    };
  },

  /**
   * Renders every branch of the block.
   *
   * The reader can flip a filter without a reload, so all branches are emitted
   * and only the first matching one is visible. The initial state is already
   * resolved here to keep the first paint correct before the scripts run.
   *
   * @this {import('marked').RendererThis}
   * @param {import('marked').Tokens.Generic} token - Mature content token.
   * @returns {string} Rendered HTML.
   */
  renderer(token) {
    /** @type {{ expression: string, tokens: any[] }[]} */
    const branches = token.branches ?? [];
    let matched = false;

    const html = branches.map((branch) => {
      const keys = registerNsfwFilterExpression(branch.expression);
      const isMatch = !matched && matchesNsfwExpression(branch.expression);
      if (isMatch) matched = true;

      return `<div class="nsfw-block" data-nsfw="${escapeAttribute(
        branch.expression,
      )}" data-nsfw-keys="${escapeAttribute(keys.join(' '))}"${
        isFallbackNsfwExpression(branch.expression) ? ' data-nsfw-fallback="true"' : ''
      }${isMatch ? '' : ' hidden'}>${this.parser.parse(branch.tokens ?? [])}</div>`;
    });

    return `<div class="nsfw-group">\n${html.join('\n')}\n</div>\n`;
  },
};

/**
 * Removes the trailing carriage return of a CRLF line.
 *
 * @param {string} line - Raw line.
 * @returns {string} The line without the trailing `\r`.
 */
function stripCr(line) {
  return line.endsWith('\r') ? line.slice(0, -1) : line;
}

/**
 * Escapes a value so it can be used inside a double quoted attribute.
 *
 * @param {string} value - Raw value.
 * @returns {string} Escaped value.
 */
function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, '\u0026')
    .replace(/"/g, '\u0022')
    .replace(/</g, '\u003C')
    .replace(/>/g, '\u003E');
}

marked.use({ extensions: [nsfwExtension] });
