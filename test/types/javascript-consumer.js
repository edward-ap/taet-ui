// @ts-check
import { DataStore, EventBus } from 'taet-ui/core';
/** @typedef {{ id: number, label: string }} Row */
/** @type {import('taet-ui/core').DataStore<Row>} */
const rows = new DataStore();
rows.parse([{ id: 1, label: 'JavaScript' }]);
rows.events.on('change', event => {
  if (event.operation === 'update') event.newItem.label.toUpperCase();
});
rows.update(1, { label: 'JSDoc' });
if (rows.get(1)?.label !== 'JSDoc') throw new Error('JS consumer failed');
/** @type {import('taet-ui/core').EventBus<{ ready: { count: number } }>} */
const bus = new EventBus();
bus.emit('ready', { count: 1 });
rows.destroy(); bus.destroy();
console.log('JavaScript package consumer OK');
function rejected() {
  // @ts-expect-error JS callers also get schema checking.
  rows.update(1, { label: 123 });
  // @ts-expect-error JSDoc keeps event payload types.
  bus.emit('ready', { count: 'wrong' });
}
void rejected;
