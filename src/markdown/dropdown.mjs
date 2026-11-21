import { marked } from 'marked';
import { scanFence, stripCr } from './fence.mjs';

let contentId = 0;

/** Matches the opening fence of a collapse block. */
const OPEN_FENCE = /^:::collapse[ \t]+(.*)$/;

/**
 * Marked extension that renders collapsible `<details>` blocks.
 *
 * The body is read with {@link scanFence}, so a `:::nsfw` block (or another
 * `:::collapse`) nested inside it does not close the block by accident.
 *
 * @type {import('marked').TokenizerAndRendererExtension}
 */
const collapseExtension = {
  name: 'collapse',
  level: 'block', // funciona como bloco (não inline)

  /**
   * Finds the starting index of a collapse block.
   *
   * @param {string} src - Markdown source.
   * @returns {number | void} Index of the collapse block.
   */
  start(src) {
    return src.match(/:::collapse[ \t]/)?.index;
  },

  /**
   * Tokenizes a collapse block.
   *
   * @this {import('marked').TokenizerThis}
   * @param {string} src - Markdown source.
   * @returns {import('marked').Tokens.Generic | undefined} The collapse token.
   */
  tokenizer(src) {
    const lines = src.split('\n');
    const first = OPEN_FENCE.exec(stripCr(lines[0]));
    if (!first) return undefined;

    /** @type {string[]} */
    const body = [];
    const end = scanFence(lines, 1, (line) => {
      body.push(line);
    });

    // An unterminated block is not a collapse block at all.
    if (end < 0) return undefined;

    contentId++;
    const text = body.join('\n').trim();

    return {
      type: 'collapse',
      raw: lines.slice(0, end + 1).join('\n'),
      label: first[1].trim(),
      text, // conteúdo interno bruto
      id: `collapseMdWiki-${contentId}`,
      tokens: this.lexer.blockTokens(text, []), // parse interno como markdown
    };
  },

  /**
   * Renders a collapse block.
   *
   * @this {import('marked').RendererThis}
   * @param {import('marked').Tokens.Generic} token - Collapse token.
   * @returns {string} Rendered HTML.
   */
  renderer(token) {
    return `
<button class="btn btn-primary" type="button" 
  data-bs-toggle="collapse" data-bs-target="#${token.id}" 
  aria-expanded="false">${token.label}</button>
<div class="collapse mt-3" id="${token.id}">
  ${this.parser.parse(token.tokens || [])}
</div>
`;
  },
};

// registra extensão
marked.use({ extensions: [collapseExtension] });
