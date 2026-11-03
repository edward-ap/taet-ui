import { DataStore, EventBus, DisposableBag, normalizeMutationOptions, isUserOrigin,
  type ValueApi, type MutationOptions, type DataStoreChange } from 'taet-ui/core';

interface Row { id: number; title: string; enabled: boolean }
const store = new DataStore<Row>();
function check(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
const bag = new DisposableBag(), changes: DataStoreChange<Row>[] = [];
let invalidations = 0;
bag.add(store.events.on('change', event => {
  changes.push(event);
  if (event.operation === 'update') {
    const title: string = event.newItem.title;
    check(typeof title === 'string', 'Typed update payload');
  }
}));
bag.add(store.events.on('invalidate', event => { invalidations++; const silent: boolean = event.silent; void silent; }));
store.parse([{ id: 1, title: 'First', enabled: true }]);
store.update(1, { title: 'Imported' }, { silent: true, origin: 'import' });
check(invalidations === 2 && changes.length === 1 && store.get(1)?.title === 'Imported', 'Silent writes stay current');
const veto = store.events.on('beforeChange', event => {
  if (event.operation === 'remove') event.cancel = true;
});
check(store.remove(1) === false, 'Cancellable mutation'); veto.off();
const result: number = store.batch(data => {
  data.update(1, { enabled: false });
  data.add({ id: 2, title: 'Second', enabled: true });
  return data.all().length;
});
check(result === 2 && store.canUndo(), 'Transaction return/history');
const batch = changes.at(-1);
check(batch?.operation === 'batch' && batch.changes.length === 2, 'Batch event details');
check(store.undo() && store.get(2) === undefined && store.get(1)?.enabled === true, 'Undo');
check(store.redo() && store.get(2)?.title === 'Second', 'Redo');
const rows: Row[] = store.all(); rows.pop(); check(store.all().length === 2, 'Caller-owned snapshot');
store.update(2, { id: 3 });
const renamed = changes.at(-1);
check(store.get(2) === undefined && store.get(3)?.title === 'Second' && renamed?.operation === 'update' && renamed.newId === 3, 'Identity change');

const custom = new DataStore<{ key: string; quantity: number }, string>({ getId: item => item.key });
custom.parse([{ key: 'sku', quantity: 3 }]);
check(custom.idOf(custom.all()[0]!) === 'sku', 'Custom identity'); custom.destroy();
const fieldStore = new DataStore<{ code: string; name: string }, string>({ idField: 'code' });
fieldStore.parse([{ code: 'x', name: 'Custom field' }]); check(fieldStore.get('x')?.name === 'Custom field', 'ID field'); fieldStore.destroy();

const bus = new EventBus<{ save: { rowId: number }; idle: {} }>();
let saves = 0;
bag.add(bus.once('save', event => { saves += event.rowId; check(event.type === 'save', 'Event type'); }));
const emitted = bus.emit('save', { rowId: 2 }); bus.emit('save', { rowId: 3 }); bus.emit('idle');
check(emitted.rowId === 2 && saves === 2, 'Typed bus and once');
check(!('source' in emitted), 'A standalone EventBus does not invent a source');
const mutation = normalizeMutationOptions({ origin: 'user' });
check(mutation.userAction && !mutation.silent && isUserOrigin(mutation), 'Mutation normalization');

let text = '';
const value: ValueApi<string> = {
  get: () => text,
  set(next) { if (next === text) return false; text = next; return true; },
  clear() { return this.set(''); }
};
const imported: MutationOptions = { origin: 'import', silent: true };
check(value.set('Ready', imported) && value.get() === 'Ready' && value.clear(), 'Structural value protocol');
const target = new EventTarget(); let notifications = 0;
bag.addEventListener(target, 'ping', () => { notifications++; });
target.dispatchEvent(new Event('ping')); bag.dispose(); target.dispatchEvent(new Event('ping'));
check(notifications === 1 && bag.disposed, 'Owned event cleanup');
bus.destroy(); store.destroy(); check(store.destroyed && bus.destroyed, 'Teardown');
console.log('Typed package consumer OK');

// Compile-time regressions. This function is deliberately never executed.
function invalidUsage() {
  // @ts-expect-error Number IDs must not silently become strings.
  store.get('1');
  // @ts-expect-error Lookup may return undefined.
  store.get(99).title;
  // @ts-expect-error Patch values retain the row schema.
  store.update(1, { enabled: 'yes' });
  // @ts-expect-error Misspelled fields are rejected.
  store.update(1, { titel: 'Wrong' });
  // @ts-expect-error Required record fields must exist.
  store.add({ id: 3, title: 'Incomplete' });
  // @ts-expect-error Only supported mutation origins are allowed.
  value.set('Bad origin', { origin: 'network' });
  // @ts-expect-error Value type cannot change.
  value.set(123);
  // @ts-expect-error Store event names are checked.
  store.events.on('changed', () => {});
  store.events.on('change', event => {
    // @ts-expect-error Narrow the operation before reading an update-only field.
    event.patch.title;
    if (event.operation === 'update') {
      // @ts-expect-error An optional patch field remains optional and typed.
      const enabled: number = event.patch.enabled;
      void enabled;
    }
  });
  // @ts-expect-error Payload is required for this named event.
  bus.emit('save');
  // @ts-expect-error Event payload retains its own field types.
  bus.emit('save', { rowId: 'bad' });
  bus.on('save', event => {
    // @ts-expect-error A standalone typed bus only has the declared payload and type.
    event.source;
  });
  // @ts-expect-error Internal fields are not public API.
  store._items;
  // @ts-expect-error DisposableBag does not call destroy(). Wrap it in a callback.
  bag.add({ destroy() {} });
  // @ts-expect-error Constructor identity field is checked against the row type.
  new DataStore<Row>({ idField: 'typo' });
}
void invalidUsage;
