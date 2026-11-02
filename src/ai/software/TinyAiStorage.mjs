import { EventEmitter } from 'events';
import { isJsonObject } from 'tiny-essentials/basics/objChecker';
import { tinyLs } from '../../important.mjs';

/**
 * Persists AI provider credentials and the currently selected provider in
 * `localStorage`.
 *
 * Emits `saveApiStorage` whenever the credential map is written, plus
 * `setApiKey` and `delApiKey` with the affected provider name.
 *
 * @extends EventEmitter
 */
class TinyAiStorage extends EventEmitter {
  /**
   * Restores the stored credentials and the previously selected provider.
   */
  constructor() {
    super();

    this._selected = tinyLs.getItem('tiny-ai-storage-selected');
    if (typeof this._selected !== 'string') this._selected = null;

    this.storage = tinyLs.getItem('tiny-ai-storage');
    try {
      this.storage = JSON.parse(this.storage);
      if (!this.storage) this.storage = {};
    } catch {
      this.storage = {};
    }
  }

  /**
   * Serializes the credential map back into `localStorage`.
   *
   * @private
   * @returns {void}
   */
  _saveApiStorage() {
    tinyLs.setItem('tiny-ai-storage', JSON.stringify(this.storage));
    this.emit('saveApiStorage', this.storage);
  }

  /**
   * Clears the selected provider when its credential no longer exists.
   *
   * @private
   * @returns {void}
   */
  _updateExistsAi() {
    if (
      this._selected &&
      (typeof this.storage[this._selected] !== 'string' ||
        this.storage[this._selected].length < 1) &&
      typeof this.storage[this._selected] !== 'number' &&
      !isJsonObject(this.storage[this._selected])
    ) {
      this._selected = null;
      tinyLs.removeItem('tiny-ai-storage-selected');
    }
  }

  /**
   * Marks a provider as the active one.
   *
   * @param {string} value - Provider name. Ignored when it has no stored credential.
   * @returns {void}
   */
  setSelectedAi(value) {
    this._selected =
      typeof value === 'string' &&
      ((typeof this.storage[value] === 'string' && this.storage[value].length > 0) ||
        typeof this.storage[value] === 'number' ||
        isJsonObject(this.storage[value]))
        ? value
        : null;

    if (this._selected) tinyLs.setItem('tiny-ai-storage-selected', this._selected);
    else tinyLs.removeItem('tiny-ai-storage-selected');
  }

  /**
   * Returns the name of the active provider.
   *
   * @returns {string|null} The provider name, or `null` when none is selected.
   */
  selectedAi() {
    return this._selected;
  }

  /**
   * Stores the credential of a provider and persists it.
   *
   * @param {string} name - Provider name.
   * @param {string|number|Object} key - Credential payload (API key or config object).
   * @returns {void}
   * @throws {Error} If `key` is not a string, a number or a plain object.
   */
  setApiKey(name, key) {
    if (typeof key === 'string' || typeof key === 'number' || isJsonObject(key)) {
      this.storage[name] = key;
      this._saveApiStorage();
      this._updateExistsAi();
      this.emit('setApiKey', name, key);
      return;
    }
    throw new Error('Invalid AI api key data type!');
  }

  /**
   * Removes the credential of a provider.
   *
   * @param {string} name - Provider name.
   * @returns {boolean} `true` when a credential was removed, `false` when none existed.
   */
  delApiKey(name) {
    if (this.storage[name]) {
      delete this.storage[name];
      this._saveApiStorage();
      this._updateExistsAi();
      this.emit('delApiKey', name);
      return true;
    }
    return false;
  }

  /**
   * Reads the credential of a provider.
   *
   * @param {string} name - Provider name.
   * @returns {{ key: string|null }|Object} `{ key }` for string credentials, otherwise the stored object.
   */
  getApiKey(name) {
    return typeof this.storage[name] === 'string'
      ? { key: this.storage[name] }
      : this.storage[name] || { key: null };
  }
}

export default TinyAiStorage;
