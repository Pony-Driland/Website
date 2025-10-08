import { marked } from 'marked';

/**
 * Converts <ai>...</ai> into <span class="made-by-ai">...</span>
 */
const aiTagExtension = {
  name: 'ai-tag',
  level: 'block',
  start(src) {
    return src.match(/<ai>/)?.index;
  },
  tokenizer(src) {
    const rule = /^<ai>([\s\S]+?)<\/ai>/;
    const match = rule.exec(src);
    if (match) {
      return {
        type: 'ai-tag',
        raw: match[0],
        text: match[1].trim(),
        tokens: this.lexer.blockTokens(match[1].trim()), // processa markdown dentro do <ai>
      };
    }
  },
  renderer(token) {
    return `<span class="made-by-ai">${this.parser.parse(token.tokens)}</span>`;
  },
};

// registra a extensão
marked.use({ extensions: [aiTagExtension] });
