import { marked } from 'marked';

/**
 * Marked extension that turns spoiler syntax into a styled span.
 *
 * @type {import('marked').TokenizerAndRendererExtension}
 */
const spoilerExtension = {
  name: 'book-spoiler',
  level: 'block',

  /**
   * Finds the starting index of a spoiler block.
   *
   * @param {string} src - Markdown source.
   * @returns {number | void} Index of the spoiler block.
   */
  start(src) {
    return src.match(/\[spoiler:/)?.index;
  },

  /**
   * Tokenizes a spoiler block.
   *
   * @this {import('marked').TokenizerThis}
   * @param {string} src - Markdown source.
   * @returns {import('marked').Tokens.Generic | undefined} The spoiler token.
   */
  tokenizer(src) {
    const rule = /^\[spoiler:(\d+):(\d+)\]([\s\S]+?)\[\/spoiler\]/;
    const match = rule.exec(src);
    if (match) {
      return {
        type: 'book-spoiler',
        raw: match[0],
        chapter: parseInt(match[1], 10),
        line: parseInt(match[2], 10),
        text: match[3].trim(),
        tokens: this.lexer.blockTokens(match[3].trim()), // permite markdown dentro
      };
    }

    return undefined;
  },

  /**
   * Renders a spoiler block.
   *
   * @this {import('marked').RendererThis}
   * @param {import('marked').Tokens.Generic} token - Spoiler token.
   * @returns {string} Rendered HTML.
   */
  renderer(token) {
    return `
<div class="book-spoiler" data-chapter="${token.chapter}" data-line="${token.line}">
  ${this.parser.parse(token.tokens || [])}
</div>
`;
  },
};

marked.use({ extensions: [spoilerExtension] });
