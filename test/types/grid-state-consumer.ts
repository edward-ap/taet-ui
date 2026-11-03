import { GridColumnModel, GridFilterModel, GridSearchModel, GridGroupModel,
  type GridModelColumn, type ColumnFilter, type GridGroupEntry } from 'taet-ui/core';
import type { GridEditorColumn } from 'taet-ui/grid/editors';

function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
interface Row { id: number; name: string; amount: number; category: string }
type Key = 'name' | 'amount' | 'category';
interface Column extends GridModelColumn<Key>, GridEditorColumn<Row> { id: Key }
const source: Column[] = [{ id: 'name', title: 'Name', width: 100 }, { id: 'amount', width: 80 }];
const columns = new GridColumnModel(source);
const operations: string[] = [];
const invalidatedColumns: boolean[] = [];
columns.events.on('invalidate', event => { invalidatedColumns.push(event.silent); });
columns.events.on('change', event => { operations.push(event.operation); check(event.source === columns, 'column source'); });
check(columns.get('name') === source[0] && columns.get('category') === null, 'live columns and missing sentinel');
columns.move('amount', 0);
check(source[0]?.id === 'amount', 'model mutates input array');
columns.setWidth('name', '40%', { silent: true });
check(invalidatedColumns.join() === 'false,true', 'column invalidation includes silent mutation');
columns.setHidden('amount', true); columns.setFrozen('name', 'left');
check(columns.visible().length === 1 && operations.join() === 'move,visibility,freeze', 'column silent events');
columns.restoreState([{ id: 'name', order: 0, width: null }], { silent: true });
check(columns.get('name')?.width === '40%' && columns.get('name')?.frozen === null, 'restore null keeps width, missing frozen clears');
const columnState = columns.getState(); columnState[0]!.width = 1;
check(columns.get('name')?.width === '40%', 'column state snapshot');
const renderedColumns: GridEditorColumn<Row>[] = columns.all(); void renderedColumns;
const literal = new GridColumnModel([{ id: 'literal', hidden: false as const }]);
literal.setHidden('literal', true);
const hidden: boolean | undefined = literal.get('literal')?.hidden; check(hidden, 'layout fields widen after mutation');
literal.replace(literal.all());
columns.destroy(); literal.destroy();
check(columns.destroyed && columns.events.destroyed, 'column teardown');
let columnReadRejected = false;
try { columns.all(); }
catch (error) { columnReadRejected = error instanceof Error && error.message.includes('destroyed'); }
check(columnReadRejected, 'column lifecycle');

const filters = new GridFilterModel<Row, Key>();
let invalidations = 0, changes = 0;
filters.events.on('invalidate', event => { invalidations++; const active: Key[] = event.activeColumns; void active; });
filters.events.on('change', event => {
  changes++;
  if (event.operation === 'clearAll') check(event.columnId === null && event.oldFilters instanceof Map, 'clearAll discriminant');
});
filters.events.once('beforeChange', event => { event.cancel = true; });
check(!filters.set('name', { kind: 'text', operator: 'contains', value: 'Ada' }), 'filter veto');
check(filters.createPredicate((row, key) => row[key]) === null, 'empty predicate sentinel');
filters.set('amount', { kind: 'number', operator: 'between', value: '10', valueTo: 20 }, { silent: true });
const normalized = filters.get('amount'); check(normalized?.kind === 'number' && normalized.operator === 'between', 'number discriminants');
const upper: number = normalized.valueTo; check(upper === 20 && normalized.value === 10, 'number normalization');
const predicate = filters.createPredicate((row, key) => row[key]); check(predicate, 'live predicate');
const row: Row = { id: 1, name: 'Ada', amount: 15, category: 'A' };
check(predicate(row) && invalidations === 1 && changes === 0, 'silent filters still invalidate');
filters.set('amount', { kind: 'number', operator: 'greater', value: 30 });
check(!predicate(row), 'retained predicate follows model changes');
filters.set('name', { kind: 'date', operator: 'on', value: new Date('2026-09-06T23:30:00Z') });
const date = filters.get('name'); check(date?.kind === 'date' && date.value === '2026-09-06', 'UTC date normalization');
for (const [key, filter] of filters.all()) filters.set(key, filter); // Normalized states round-trip.
filters.clearAll();
filters.set('name', { kind: 'values', values: ['Ada', 'Ada'], includeEmpty: true });
const values = filters.get('name'); check(values?.kind === 'values', 'values discriminant');
values.values.push('Other');
check(!filters.matches({ ...row, name: 'Other' }, (item, key) => item[key]), 'values arrays are copied');
filters.clearAll({ silent: true });
filters.destroy(); check(filters.destroyed, 'filter teardown');
try { predicate(row); throw new Error('Expected destroyed predicate error'); }
catch (error) { check(error instanceof Error && error.message.includes('destroyed'), 'live predicate lifecycle'); }

const search = new GridSearchModel({ query: 'old', columns: [1, '1', 'name'], mode: 'filter' });
check(search.columns?.join() === '1,name', 'search columns normalize to strings');
let searchChanges = 0;
let searchInvalidations = 0;
search.events.on('invalidate', event => { if (event.silent) searchInvalidations++; });
search.events.on('change', () => { searchChanges++; });
search.events.once('beforeChange', event => { event.cancel = true; });
check(!search.set('veto'), 'search veto');
search.set('silent', { silent: true }); check(searchChanges === 0 && searchInvalidations === 1, 'silent search invalidates without semantic change');
search.restoreState({ query: 'new' });
check(search.mode === 'highlight' && search.columns === null, 'partial search restore resets defaults');
check(!search.set('new'), 'equal search no-op');
search.clear(); search.destroy();
try { search.getState(); throw new Error('Expected destroyed search error'); }
catch (error) { check(error instanceof Error && error.message.includes('destroyed'), 'search lifecycle'); }

const groups = new GridGroupModel<Row, Key>({ rules: [{ column: 'category', summaries: [{ columnId: 'amount', kind: 'total' }] }] });
const rows = [row, { ...row, id: 2, amount: 25 }, { ...row, id: 3, category: 'B', amount: 4 }];
const entries: GridGroupEntry<Row, Key>[] = groups.entries(rows, (item, key, index) => { check(rows[index] === item, 'original rowIndex'); return item[key]; });
const first = entries[0]; check(first?.type === 'group', 'group discriminant');
check(first.count === 2 && first.summaries[0]?.value === 40, 'group summaries');
const item = entries[1]; check(item?.type === 'item' && item.rowIndex === 0 && item.item === row, 'item discriminant');
let groupInvalidations = 0, groupChanges = 0;
groups.events.on('invalidate', () => { groupInvalidations++; });
groups.events.on('change', () => { groupChanges++; });
check(groups.toggle(first.path, { silent: true }) === false, 'toggle returns expanded state');
check(groupInvalidations === 1 && groupChanges === 0, 'silent grouping invalidates');
check(groups.entries(rows, (item, key) => item[key]).length === 3, 'collapsed group omits members');
const state = groups.getState();
check(groups.restoreState(state) === undefined, 'group restore returns void');
groups.clear(); check(!groups.hasAny(), 'clear rules'); groups.destroy();
console.log('Installed Grid state consumers OK: columns, filter normalization/veto, search, grouping and teardown');

function rejected() {
  // @ts-expect-error Numeric ranges require both endpoints.
  filters.set('amount', { kind: 'number', operator: 'between', value: 1 });
  // @ts-expect-error Date ranges require both endpoints too.
  filters.set('name', { kind: 'date', operator: 'between', value: '2026-09-06' });
  // @ts-expect-error Boolean values are strict.
  filters.set('name', { kind: 'boolean', value: 'true' });
  // @ts-expect-error Column identity is constrained.
  filters.clear('missing');
  // @ts-expect-error Filter callbacks retain record shape.
  filters.matches(row, item => item.missing);
  // @ts-expect-error Search invalidation does not offer cancellation.
  search.events.on('invalidate', event => { event.cancel = true; });
  // @ts-expect-error Lifecycle state is read-only.
  columns.destroyed = false;
  // @ts-expect-error Wrong side.
  columns.setFrozen('name', 'top');
  // @ts-expect-error Source array is mutated and must be mutable.
  new GridColumnModel([{ id: 'readonly' }] as readonly GridModelColumn[]);
  // @ts-expect-error Unknown group column.
  groups.set(['missing']);
  const filter = {} as ColumnFilter;
  // @ts-expect-error Filter variants must be narrowed before accessing values.
  filter.values;
}
void rejected;
