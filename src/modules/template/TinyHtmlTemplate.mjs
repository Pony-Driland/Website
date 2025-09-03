import { TinyHtml } from 'tiny-essentials';

/**
 * @typedef {string|string[]|Set<string>} ClassSetter
 * Represents a set of CSS classes that can be applied to an element.
 * - Can be a single class name string.
 * - Can be an array of class name strings.
 * - Can be a Set of class name strings.
 */

/**
 * TinyHtmlTemplate is a base helper class that extends TinyHtml and is designed
 * to simplify the creation of reusable HTML element templates.
 *
 * It is primarily intended as a foundation for specialized UI components
 * where consistent structure and styling are needed, similar in spirit to how React
 * components abstract HTML into reusable elements.
 *
 * As a result, TinyHtmlTemplate provides a small-scale, component-like
 * abstraction for HTML elements, serving as a lightweight building block
 * for higher-level UI helpers.
 *
 * @extends TinyHtml<Element>
 */
class TinyHtmlTemplate extends TinyHtml {
  /** @type {Set<string>} */
  #classes = new Set();

  /** @type {Set<string>} */
  #mainClass = new Set();

  /**
   * Updates the element's `className` attribute by combining
   * the current set of classes with the main class.
   */
  #setClassString() {
    this.setAttr(
      'className',
      `${Array.from(this.#classes).join(' ')} ${Array.from(this.#mainClass).join(' ')}`,
    );
  }

  /**
   * Ensures a given value is a valid ClassSetter.
   * @param {ClassSetter} value
   * @returns {Set<string>}
   */
  static #normalizeClasses(value) {
    if (typeof value === 'string') {
      return new Set(value.trim().split(/\s+/).filter(Boolean));
    }
    if (Array.isArray(value) || value instanceof Set) {
      for (const v of value) {
        if (typeof v !== 'string') {
          throw new TypeError(`Class names must be strings. Got: ${typeof v}`);
        }
      }
      return new Set(value);
    }
    throw new TypeError(
      `Invalid ClassSetter. Expected string | string[] | Set<string>, got ${typeof value}`,
    );
  }

  /**
   * Returns the combined list of all classes (regular + main).
   * @returns {string[]}
   */
  get fullClass() {
    return [...Array.from(this.#classes), ...Array.from(this.#mainClass)];
  }

  /**
   * Gets the current list of CSS classes applied to this element.
   * @returns {string[]}
   */
  get classes() {
    return [...Array.from(this.#classes)];
  }

  /**
   * Sets the list of CSS classes applied to this element.
   * Automatically updates the element's `className` attribute.
   * @param {ClassSetter} value
   */
  set classes(value) {
    this.#classes = TinyHtmlTemplate.#normalizeClasses(value);
    this.#setClassString();
  }

  /**
   * Gets the main CSS class applied to this element.
   * This class is always present in addition to the regular classes.
   * @returns {string[]}
   */
  get mainClass() {
    return [...Array.from(this.#mainClass)];
  }

  /**
   * Sets the main CSS class applied to this element.
   * Automatically updates the element's `className` attribute.
   * @param {ClassSetter} value
   */
  set mainClass(value) {
    this.#mainClass = TinyHtmlTemplate.#normalizeClasses(value);
    this.#setClassString();
  }

  /**
   * Creates a new TinyHtmlTemplate instance.
   * @param {string} tagName - The HTML tag name to create (e.g., 'div', 'span').
   * @param {ClassSetter} [tags=[]] - Initial CSS classes to apply.
   * @param {ClassSetter} [mainClass=[]] - Main CSS classes to apply.
   */
  constructor(tagName = '', tags = [], mainClass = []) {
    if (typeof tagName !== 'string' || !tagName.trim())
      throw new TypeError(`Invalid tagName: expected non-empty string, got "${tagName}"`);
    super(document.createElement(tagName));
    this.mainClass = mainClass;
    this.classes = tags;
  }

  /**
   * Add one or more CSS classes to the element.
   * @param {...string|string[]} tags
   * @returns {this}
   */
  // @ts-ignore
  addClass(...tags) {
    for (const tag of tags.flat()) {
      if (typeof tag !== 'string')
        throw new TypeError(`Class name must be a string. Got: ${typeof tag}`);
      this.#classes.add(tag);
    }
    this.#setClassString();
    return this;
  }

  /**
   * Remove one or more CSS classes from the element.
   * @param {...string|string[]} tags
   * @returns {this}
   */
  // @ts-ignore
  removeClass(...tags) {
    for (const tag of tags.flat()) {
      if (typeof tag !== 'string')
        throw new TypeError(`Class name must be a string. Got: ${typeof tag}`);
      this.#classes.delete(tag);
    }
    this.#setClassString();
    return this;
  }

  /**
   * Toggles the presence of a given CSS class on the element.
   * @param {string} tag - The class name to toggle.
   * @returns {this}
   */
  // @ts-ignore
  toggleClass(tag) {
    if (typeof tag !== 'string')
      throw new TypeError(`Class name must be a string. Got: ${typeof tag}`);
    if (this.#classes.has(tag)) return this.removeClass(tag);
    else return this.addClass(tag);
  }

  /**
   * Replaces an existing CSS class with a new one.
   * Behaves like DOMTokenList.replace:
   * - Only replaces if oldClass exists.
   * - Returns true if replacement occurred, false otherwise.
   * @param {string} oldClass - The class to replace.
   * @param {string} newClass - The new class to add.
   * @returns {boolean} True if the replacement occurred, false otherwise.
   */
  replaceClass(oldClass, newClass) {
    if (typeof oldClass !== 'string' || typeof newClass !== 'string')
      throw new TypeError('Both oldClass and newClass must be strings.');
    if (!this.#classes.has(oldClass)) return false;
    this.#classes.delete(oldClass);
    this.#classes.add(newClass);
    this.#setClassString();
    return true;
  }

  /**
   * Clears all CSS classes from the element.
   * @returns {this}
   */
  resetClasses() {
    this.#classes.clear();
    this.setAttr('className', '');
    return this;
  }
}

export default TinyHtmlTemplate;
