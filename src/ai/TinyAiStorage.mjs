import { objType } from "tiny-essentials";
import { tinyLs } from "../important.mjs";

// Localstorage Manager
class TinyAiStorage extends EventEmitter {
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

  _saveApiStorage() {
    tinyLs.setItem('tiny-ai-storage', JSON.stringify(this.storage));
    this.emit('saveApiStorage', this.storage);
  }

  _updateExistsAi() {
    if (
      this._selected &&
      (typeof this.storage[this._selected] !== 'string' ||
        this.storage[this._selected].length < 1) &&
      typeof this.storage[this._selected] !== 'number' &&
      !objType(this.storage[this._selected], 'object')
    ) {
      this._selected = null;
      tinyLs.removeItem('tiny-ai-storage-selected');
    }
  }

  setSelectedAi(value) {
    this._selected =
      typeof value === 'string' &&
      ((typeof this.storage[value] === 'string' && this.storage[value].length > 0) ||
        typeof this.storage[value] === 'number' ||
        objType(this.storage[value], 'object'))
        ? value
        : null;

    if (this._selected) tinyLs.setItem('tiny-ai-storage-selected', this._selected);
    else tinyLs.removeItem('tiny-ai-storage-selected');
  }

  selectedAi() {
    return this._selected;
  }

  setApiKey(name, key) {
    if (typeof key === 'string' || typeof key === 'number' || objType(key, 'object')) {
      this.storage[name] = key;
      this._saveApiStorage();
      this._updateExistsAi();
      this.emit('setApiKey', name, key);
      return;
    }
    throw new Error('Invalid AI api key data type!');
  }

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

  getApiKey(name) {
    return typeof this.storage[name] === 'string'
      ? { key: this.storage[name] }
      : this.storage[name] || { key: null };
  }
}

export default TinyAiStorage;
