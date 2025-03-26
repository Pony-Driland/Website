import TimedMap from '../database';

// Example usage:
const myTimedMap = new TimedMap();

// Listener for modification events
const modifyListener = (event) => {
  console.log(
    `Modify event: ${event.action} on key "${event.key}" at ${new Date(event.timestamp)}`,
  );
};
myTimedMap.onModify(modifyListener);

// Listener for queue updates
const queueUpdateListener = (queueSize) => {
  console.log(`Queue updated! Current size: ${queueSize}`);
};
myTimedMap.onQueueUpdate(queueUpdateListener);

// Listener for event processing
const processEventListener = (event) => {
  console.log(
    `Processing event: ${event.action} on key "${event.key}" at ${new Date(event.timestamp)}`,
  );
};
myTimedMap.onProcessEvent(processEventListener);

// Adding values
myTimedMap.set('item1', { name: 'Example Item' });
myTimedMap.set('item2', { name: 'Another Item' });

// Removing specific listener
myTimedMap.offModify(modifyListener);
myTimedMap.set('item3', { name: 'Should not trigger modifyListener' });

// Removing all listeners from 'queueUpdated'
myTimedMap.removeAllListeners('queueUpdated');
myTimedMap.set('item4', { name: 'Queue update should not trigger' });

// Processing events
myTimedMap._processNextEvent();
