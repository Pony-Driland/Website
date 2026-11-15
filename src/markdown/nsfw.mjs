import { marked } from 'marked';
import {
  isFallbackNsfwExpression,
  matchesNsfwExpression,
  registerNsfwFilterExpression,
} from '../nsfw.mjs';

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
    return src.match(/^:::nsfw(?:\s|$)/m)?.index;
  },

  /**
   * Tokenizes a mature content block.
   *
   * @this {import('marked').TokenizerThis}
   * @param {string} src - Markdown source.
   * @returns {import('marked').Tokens.Generic | undefined} The mature content token.
   */
  tokenizer(src) {
    // The block ends on the first line that only holds the closing fence, so a
    // branch header (`:::nsfw <expression>`) never terminates the block.
    const rule = /^:::nsfw[ \t]*([^\n]*)\n([\s\S]*?)^:::[ \t]*$/m;
    const match = rule.exec(src);
    if (!match) return undefined;

    /** @type {{ expression: string, text: string }[]} */
    const branches = [];
    let expression = match[1].trim();
    let buffer = [];

    // Split the body on every `:::nsfw <expression>` header.
    for (const line of match[2].split('\n')) {
      const header = /^:::nsfw[ \t]*(.*)$/.exec(line);
      if (header) {
        branches.push({ expression, text: buffer.join('\n').trim() });
        expression = header[1].trim();
        buffer = [];
      } else buffer.push(line);
    }
    branches.push({ expression, text: buffer.join('\n').trim() });

    return {
      type: 'nsfw-block',
      raw: match[0],
      branches: branches.map((branch) => ({
        expression: branch.expression,
        tokens: this.lexer.blockTokens(branch.text, []),
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
