import { marked } from 'marked';

let contentId = 0;

/**
 * Marked extension to handle :::collapse label ... :::
 */
const collapseExtension = {
  name: 'collapse',
  level: 'block', // funciona como bloco (não inline)
  start(src) {
    return src.match(/:::collapse\s/)?.index;
  },
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
  renderer(token) {
    return `
<button class="btn btn-primary" type="button" 
  data-bs-toggle="collapse" data-bs-target="#${token.id}" 
  aria-expanded="false">${token.label}</button>
<div class="collapse mt-3" id="${token.id}">
  ${this.parser.parse(token.tokens)}
</div>
`;
  },
};

// registra extensão
marked.use({ extensions: [collapseExtension] });
