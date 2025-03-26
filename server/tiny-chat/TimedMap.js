import EventEmitter from 'events';

/**
 * A class that extends Map and emits events whenever an item is set or deleted.
 * It also maintains a queue of modification events to ensure sequential processing.
 */
class TimedMap extends Map {
  #eventQueue = [];
  #eventEmitter = new EventEmitter();

  /**
   * Emits a modification event and adds it to the event queue.
   * This method is private and cannot be accessed externally.
   * @param {string} key - The key of the modified item.
   * @param {'set' | 'delete'} action - The type of modification performed.
   * @param {any} [value] - The new value of the item (if applicable).
   * @private
   */
  #emitChangeEvent(key, action, value = undefined) {
    const timestamp = Date.now();
    const event = { key, action, value, timestamp };

    this.#eventEmitter.emit('modify', event);
    this._addToQueue(event);
  }

  constructor() {
    super();
  }

  /**
   * Adds an event to the end of the queue for sequential processing.
   * Emits an event indicating that the queue has new content.
   * @param {Object} event - The event object containing modification details.
   * @private
   */
  _addToQueue(event) {
    this.#eventQueue.push(event);
    this.#eventEmitter.emit('queueUpdated', this.#eventQueue.length);
  }

  /**
   * Adds an event back to the front of the queue.
   * Emits an event indicating that the queue has new content.
   * @param {Object} event - The event object to be reprocessed.
   * @private
   */
  _addToQueueFront(event) {
    this.#eventQueue.unshift(event);
    this.#eventEmitter.emit('queueUpdated', this.#eventQueue.length);
  }

  /**
   * Retrieves and removes the first event in the queue.
   * Emits an event notifying that an event should be processed.
   * Also emits 'queueUpdated' to indicate that the queue has changed.
   * @returns {Object | undefined} - The event object if available, otherwise undefined.
   */
  _processNextEvent() {
    if (this.#eventQueue.length === 0) return undefined;

    const event = this.#eventQueue.shift();
    this.#eventEmitter.emit('processEvent', event);
    this.#eventEmitter.emit('queueUpdated', this.#eventQueue.length);
    return event;
  }

  /**
   * Sets a value in the Map and emits an event.
   * @param {string} key - The key of the item.
   * @param {any} value - The value to be stored.
   * @returns {TimedMap} - Returns the instance for method chaining.
   */
  set(key, value) {
    super.set(key, value);
    this.#emitChangeEvent(key, 'set', value);
    return this;
  }

  /**
   * Retrieves a value from the Map.
   * @param {string} key - The key of the item.
   * @returns {any} - The value associated with the key, or undefined if not found.
   */
  get(key) {
    return super.get(key);
  }

  /**
   * Deletes a value from the Map and emits an event.
   * @param {string} key - The key of the item to delete.
   * @returns {boolean} - Returns true if the key existed and was removed.
   */
  delete(key) {
    const value = super.get(key);
    super.delete(key);
    this.#emitChangeEvent(key, 'delete', value);
    return true;
  }

  /**
   * Returns a copy of the current event queue to avoid data corruption.
   * @returns {Object[]} - A new array containing the event queue.
   */
  getEventQueue() {
    return [...this.#eventQueue];
  }

  /**
   * Retrieves an event at a specific index without removing it from the queue.
   * @param {number} index - The index of the event to retrieve.
   * @returns {Object | undefined} - The event object if found, otherwise undefined.
   */
  peekEventAt(index) {
    return this.#eventQueue[index];
  }

  /**
   * Sorts the event queue using a custom comparison function.
   * @param {Function} compareFn - The comparison function to determine sorting order.
   */
  sortEventQueue(compareFn) {
    this.#eventQueue.sort(compareFn);
  }

  /**
   * Subscribes a callback function to listen for modification events.
   * @param {Function} callback - The function to execute when an event occurs.
   */
  onModify(callback) {
    this.#eventEmitter.on('modify', callback);
  }

  /**
   * Unsubscribes a callback function from modification events.
   * @param {Function} callback - The function to remove from the listener.
   */
  offModify(callback) {
    this.#eventEmitter.off('modify', callback);
  }

  /**
   * Subscribes a callback function to listen for queue updates.
   * @param {Function} callback - The function to execute when the queue is updated.
   */
  onQueueUpdate(callback) {
    this.#eventEmitter.on('queueUpdated', callback);
  }

  /**
   * Unsubscribes a callback function from queue updates.
   * @param {Function} callback - The function to remove from the listener.
   */
  offQueueUpdate(callback) {
    this.#eventEmitter.off('queueUpdated', callback);
  }

  /**
   * Subscribes a callback function to listen for event processing.
   * @param {Function} callback - The function to execute when an event is ready to be processed.
   */
  onProcessEvent(callback) {
    this.#eventEmitter.on('processEvent', callback);
  }

  /**
   * Unsubscribes a callback function from event processing.
   * @param {Function} callback - The function to remove from the listener.
   */
  offProcessEvent(callback) {
    this.#eventEmitter.off('processEvent', callback);
  }

  /**
   * Removes all listeners for 'modify', 'queueUpdated', or 'processEvent' events.
   * @param {'modify' | 'queueUpdated' | 'processEvent'} eventType - The event type to remove all listeners from.
   */
  removeAllListeners(eventType) {
    if (['modify', 'queueUpdated', 'processEvent'].includes(eventType)) {
      this.#eventEmitter.removeAllListeners(eventType);
    }
  }
}

export default TimedMap;
