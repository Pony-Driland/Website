import { marked } from 'marked';

/**
 * Spoiler extension for [spoiler:chapter:line]...[/spoiler]
 */
const spoilerExtension = {
  name: 'book-spoiler',
  level: 'block',
  start(src) {
    return src.match(/\[spoiler:/)?.index;
  },
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
  },
  renderer(token) {
    return `
<div class="book-spoiler" data-chapter="${token.chapter}" data-line="${token.line}">
  ${this.parser.parse(token.tokens)}
</div>
`;
  },
};

marked.use({ extensions: [spoilerExtension] });
