import TinyHtmlTemplate from './TinyHtmlTemplate.mjs';

/**
 * TinyIcon is a lightweight helper class for managing icon-like elements
 * (such as `<i>` or `<span>` tags) with class-based styling.
 * It extends TinyHtml to provide direct DOM element manipulation.
 */
class TinyIcon extends TinyHtmlTemplate {
  /**
   * Creates a new TinyIcon instance.
   * @param {string|string[]|Set<string>} tags - Initial icon classes to apply.
   * @param {string} [tagName="i"] - The HTML tag to use for the element (e.g., `i`, `span`).
   */
  constructor(tags, tagName = 'i') {
    super(tagName, tags);
  }
}

export default TinyIcon;
