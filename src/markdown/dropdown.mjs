import { marked } from 'marked';

let contentId = 0;

/**
 * Marked extension that renders collapsible `<details>` blocks.
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
    return src.match(/:::collapse\s/)?.index;
  },

  /**
   * Tokenizes a collapse block.
   *
   * @this {import('marked').TokenizerThis}
   * @param {string} src - Markdown source.
   * @returns {import('marked').Tokens.Generic | undefined} The collapse token.
   */
  tokenizer(src) {
    const rule = /^:::collapse\s+(.*?)\n([\s\S]*?):::/;
    const match = rule.exec(src);
    if (match) {
      contentId++;
      return {
        type: 'collapse',
        raw: match[0],
        label: match[1].trim(),
        text: match[2].trim(), // conteúdo interno bruto
        id: `collapseMdWiki-${contentId}`,
        tokens: this.lexer.blockTokens(match[2].trim(), []), // parse interno como markdown
      };
    }
    return undefined;
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
