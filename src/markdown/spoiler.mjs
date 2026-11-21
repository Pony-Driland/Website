import { marked } from 'marked';
import { readTagBody } from './fence.mjs';

/** Matches the opening token of a spoiler block. */
const OPEN_TAG = /\[spoiler:\d+:\d+\]/g;

/** Matches the closing token of a spoiler block. */
const CLOSE_TAG = /\[\/spoiler\]/g;

/**
 * Marked extension that turns spoiler syntax into a styled span.
 *
 * The body is read with {@link readTagBody}, so a spoiler nested inside another
 * spoiler is kept as content instead of closing the outer block.
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
    const header = /^\[spoiler:(\d+):(\d+)\]/.exec(src);
    if (!header) return undefined;

    const block = readTagBody(src, OPEN_TAG, CLOSE_TAG);
    if (!block) return undefined;

    const text = block.body.trim();

    return {
      type: 'book-spoiler',
      raw: src.slice(0, block.end),
      chapter: parseInt(header[1], 10),
      line: parseInt(header[2], 10),
      text,
      tokens: this.lexer.blockTokens(text), // permite markdown dentro
    };
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
