import { marked } from 'marked';

/**
 * Creates a custom extension configuration for marked to parse specific XML-like tags.
 * Spreads the target class into child elements or wraps them in a span if no wrapper tag exists.
 * @param {string} tagName - The name of the tag to match (e.g., 'ai', 'semi-ai').
 * @param {string} className - The CSS class name to apply to the inner elements.
 * @returns {import('marked').TokenizerAndRendererExtension} The marked extension object.
 */
function createTagExtension(tagName, className) {
  return {
    name: `${tagName}-tag`,
    level: 'block',

    /**
     * Finds the starting index of the tag in the source string.
     */
    start(src) {
      const match = src.match(new RegExp(`<${tagName}>`));
      return match ? match.index : undefined;
    },

    /**
     * Tokenizes the matched tag block.
     */
    tokenizer(src) {
      /** @type {RegExp} */
      const rule = new RegExp(`^<${tagName}>([\\s\\S]*?)<\\/${tagName}>`);
      const match = rule.exec(src);

      if (match) {
        /** @type {string} */
        const content = match[1].trim();

        return {
          type: `${tagName}-tag`,
          raw: match[0],
          text: content,
          // Generate child block tokens safely
          tokens: this.lexer.blockTokens(content),
        };
      }
    },

    /**
     * Renders the token into HTML distributing the classes into child elements.
     */
    renderer(token) {
      // Parse the inner tokens into their standard HTML representation first
      /** @type {string} */
      const innerHtml = this.parser.parse(token.tokens).trim();

      // Check if the inner HTML starts with a valid HTML tag (e.g., <p>, <ul>, <h1>)
      /** @type {RegExp} */
      const tagRegex = /^<([a-zA-Z1-6]+)([^>]*)>/;
      const match = innerHtml.match(tagRegex);

      if (match) {
        /** @type {string} */
        const tagNameCaptured = match[1];
        /** @type {string} */
        const existingAttributes = match[2];

        // If the tag already has a class attribute, inject our class into it. Otherwise, create the class attribute.
        /** @type {string} */
        let updatedAttributes;
        if (existingAttributes.includes('class="')) {
          updatedAttributes = existingAttributes.replace('class="', `class="${className} `);
        } else {
          updatedAttributes = ` class="${className}"${existingAttributes}`;
        }

        // Reconstruct the HTML string putting our classes inside the first top-level tag discovered
        return `<${tagNameCaptured}${updatedAttributes}>${innerHtml.substring(match[0].length)}`;
      }

      // Fallback: If there are no HTML tags wrapping the content, safely wrap it in a span
      return `<span class="${className}">${innerHtml}</span>`;
    },
  };
}

// Register the optimized extensions smoothly
marked.use({
  extensions: [
    createTagExtension('ai', 'made-by-ai'),
    createTagExtension('semi-ai', 'made-by-semi-ai'),
  ],
});
