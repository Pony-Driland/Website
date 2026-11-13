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

    /** @type {string | null} */
    const selected = tinyLs.getItem('tiny-ai-storage-selected');
    this._selected = typeof selected === 'string' ? selected : null;

    /** @type {string | null} */
    const rawStorage = tinyLs.getItem('tiny-ai-storage');
    try {
      this.storage = rawStorage ? JSON.parse(rawStorage) : {};
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
   * @param {string|number|AiCredential} key - Credential payload (API key or config object).
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
   * @returns {{ key: string|null }|AiCredential} `{ key }` for string credentials, otherwise the stored object.
   */
  getApiKey(name) {
    return typeof this.storage[name] === 'string'
      ? { key: this.storage[name] }
      : this.storage[name] || { key: null };
  }

  /**
   * Finds the provider that stores the multiplayer server settings.
   *
   * The room browser can be opened before a provider is selected, so the
   * lookup falls back to every stored credential and picks the first one that
   * already looks like a server config.
   *
   * @returns {string} Provider name that owns the room settings.
   */
  getRoomProvider() {
    const selected = this.selectedAi();
    if (typeof selected === 'string' && selected.length > 0) return selected;

    for (const name in this.storage) {
      const value = this.storage[name];
      if (isJsonObject(value) && typeof value.roomId === 'string') return name;
    }

    return 'tiny-chat';
  }

  /**
   * Points the multiplayer provider to another room.
   *
   * The provider is resolved automatically, so the caller does not need to know
   * which entry of the storage holds the server settings.
   *
   * @param {string} roomId - Room that will be joined.
   * @param {string} [roomPassword] - Password of the room.
   * @param {string} [name] - Provider name. Defaults to the active one.
   * @returns {void}
   */
  setRoom(roomId, roomPassword = '', name = this.getRoomProvider()) {
    const current = this.getApiKey(name);
    const next = {
      ...(isJsonObject(current) ? current : {}),
      roomId,
      roomPassword,
    };

    this.setApiKey(name, next);

    // Read it back: a quota error would otherwise leave the user stuck in the
    // previous room after the reload.
    const stored = this.getApiKey(name);
    if (!isJsonObject(stored) || stored.roomId !== roomId)
      throw new Error('Could not save the selected room.');
  }
}

export default TinyAiStorage;
