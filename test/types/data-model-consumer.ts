import { DataStore, DataView, TreeDataView, SelectionModel, RangeSelectionModel, GridDataProvider,
  type TreeDataViewChange, type DataViewFilter, type DataProviderRequest, type DataProviderResult,
  type DataProviderResponse } from 'taet-ui/core';

interface Row { id: number; parentId: number | null; name: string; rank: number }
function check(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function throws(run: () => unknown, message: string) {
  let failed = false; try { run(); } catch { failed = true; } check(failed, message);
}
const data = new DataStore<Row>();
data.parse([{ id: 1, parentId: null, name: 'Root', rank: 3 },
  { id: 2, parentId: 1, name: 'Child', rank: 1 }, { id: 3, parentId: null, name: 'Other', rank: 2 }]);
const filter: DataViewFilter<Row> = (item, context) => {
  const id: number = context.id;
  check(context.data.get(id) === item && context.index >= 0, 'Filter context identity/index');
  return item.rank <= 3;
};
const view = new DataView({ data, filter, sort: (a, b, context) => {
  check(context.data === data, 'Comparator source'); return a.rank - b.rank;
}, pageSize: 2 });
check(view.all().map(row => row.id).join() === '2,3', 'Filter/sort before paging');
check(view.projectedAll().length === 3 && view.get(1) === undefined && !view.has(1), 'Page-scoped lookup');
const page = view.getPageState();
check(page.pageCount === 2 && page.from === 1 && page.to === 2 && page.canGoNext, 'Paging state');
let semantic = 0, invalidations = 0;
view.events.on('change', event => { semantic++; const items: Row[] = event.items; void items; });
view.events.on('invalidate', event => {
  invalidations++; check(event.ids.length === event.pageState.pageItemCount, 'View event page snapshot');
});
check(view.setPage(2, { silent: true }) && view.get(1)?.name === 'Root', 'Silent page transition');
check(semantic === 0 && invalidations === 1, 'Silent projection notification');
view.setFilter(filter, { keepPage: true }); check(view.getPageState().page === 2, 'Keep page');
view.setFilter(filter); check(view.getPageState().page === 1, 'Filter resets page');
view.setPageSize(1); view.setPage(99); check(view.getPageState().page === 3, 'Page clamp');
view.clearPaging(); check(view.all().length === 3 && view.getPageState().pageSize === null, 'Disable paging');
view.clearSort(); view.clearFilter(); check(view.getSort() === null && view.getFilter() === null, 'Clear callbacks');
check(view.idOf(data.get(1)!) === 1 && view.indexOf(2) === 1 && view.indexOf(data.get(3)!) === 2, 'ID/item lookup');
const earlier = view.all(); earlier.pop(); check(view.all().length === 3, 'View defensive array');
data.update(2, { name: 'Silent child' }, { silent: true });
check(view.get(2)?.name === 'Silent child', 'Silent store mutation updates projection');
check(view.refresh() === false, 'No-op projection');

const tree = new TreeDataView({ data, expandedIds: new Set([1]) });
const customRoot = new TreeDataView({ data, rootParentId: 'root', expandAll: true });
check(customRoot.getEntry(1)?.parentId === 'root' && customRoot.has(2), 'Root marker independent of record ID type');
customRoot.destroy();
check(tree.all().map(row => row.id).join() === '1,2,3' && tree.getEntry(2)?.level === 1, 'Flattened hierarchy');
check(tree.parentIdOf(data.get(2)!) === 1 && tree.hasChildren(1), 'Parent/children');
check(tree.getEntry(99) === null && tree.get(99) === undefined, 'Different missing-entry sentinel');
const entry = tree.getEntry(2)!; entry.level = 999; check(tree.getEntry(2)?.level === 1, 'Entry copy');
const retained: TreeDataViewChange<Row>[] = [];
let expansions = 0;
tree.events.on('change', event => retained.push(event));
tree.events.on('expand', event => { const id: number = event.id; expansions++; void id; });
tree.collapse(1); check(!tree.has(2) && !tree.isExpanded(1), 'Collapsed visibility');
tree.expand(data.get(1)!); check(tree.has(2) && expansions === 1, 'Expand by item');
tree.collapseAll({ silent: true }); check(tree.getExpandedIds().length === 0, 'Collapse all');
tree.setFilter(row => row.name === 'Silent child');
check(tree.all().map(row => row.id).join() === '1,2' && tree.getEntry(1)?.expanded, 'Filter retains/open ancestors');
tree.setFilter(null); tree.setSort((a, b) => b.rank - a.rank); tree.expandAll();
check(tree.all().map(row => row.id).join() === '1,2,3', 'Sibling sorting preserves hierarchy');
tree.toggle(1); tree.setSort(null);
const snapshot = retained[0]!;
tree.destroy(); view.destroy();
check(tree.data === null && view.data === null && !data.destroyed, 'Projection destruction releases external store');
check(snapshot.oldIds.join() === '1,2,3' && snapshot.ids.join() === '1,3', 'Deferred snapshot survives later projections/teardown');
check(snapshot.oldEntries[1]?.item.name === 'Silent child', 'Deferred snapshot records');
throws(() => view.all(), 'Destroyed view rejects access');
throws(() => tree.entries(), 'Destroyed tree rejects access');

const selection = new SelectionModel<number>({ multiple: true });
const technicalSelection: number[][] = [];
selection.events.on('invalidate', event => {
  const silent: boolean = event.silent;
  const items: number[] = event.items;
  if (silent) technicalSelection.push(items);
});
const veto = selection.events.on('beforeChange', event => { if (event.items.includes(99)) event.cancel = true; });
check(selection.set([1, 1, 2] as const) && selection.get().join() === '1,2', 'Selection uniqueness');
check(selection.set([99]) === false, 'Selection cancellation');
selection.set([99], { silent: true }); check(selection.get()[0] === 99 && technicalSelection.length === 1 && technicalSelection[0]?.[0] === 99, 'Silent skips semantic veto and still invalidates');
const selected = selection.get(); selected.pop(); check(selection.hasAny(), 'Selection array copy');
veto.off(); selection.clear(); selection.destroy();
const single = new SelectionModel<number>(); throws(() => single.set([1, 2]), 'Single selection rejects multiple items'); single.destroy();
const objectSelection = new SelectionModel<Row>(); objectSelection.set([data.get(1)!]); objectSelection.destroy();

const ranges = new RangeSelectionModel<number, 'name' | 'rank'>();
let technicalRangeCount = 0;
ranges.events.on('invalidate', event => {
  const silent: boolean = event.silent;
  const id: number | undefined = event.ranges[0]?.anchor.rowId;
  if (silent && id !== undefined) technicalRangeCount++;
});
ranges.set({ from: { rowId: 1, columnId: 'name' }, to: { rowId: 2, columnId: 'rank' } });
check(ranges.primary()?.focus.rowId === 2, 'Range aliases normalized');
const rangeVeto = ranges.events.on('beforeChange', event => { event.cancel = true; });
check(ranges.clear() === false && ranges.hasAny(), 'Range cancellation'); rangeVeto.dispose();
ranges.add({ anchor: { rowId: 3, columnId: 'name' } });
const primary = ranges.primary()!; primary.anchor.rowId = 99;
check(ranges.primary()?.anchor.rowId === 3 && ranges.primary()?.focus.rowId === 3, 'Range copy/default focus');
ranges.set([null, false, { from: { rowId: 1, columnId: 'rank' } }], { silent: true });
check(ranges.get().length === 1 && technicalRangeCount === 1, 'Nullable ranges synchronize through typed technical event'); ranges.clear(); ranges.destroy();
data.destroy();

interface Query extends DataProviderRequest { page: number; pageSize: number; search: string }
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const pending: { signal: AbortSignal; result: ReturnType<typeof deferred<DataProviderResult<Row>>> }[] = [];
const provider = new GridDataProvider<Row, Query>((request, options) => {
  request.search.toUpperCase();
  const result = deferred<DataProviderResult<Row>>(); pending.push({ signal: options.signal, result }); return result.promise;
});
const loads: DataProviderResponse<Row>[] = [];
let errors = 0;
provider.events.on('load', event => { event.request.search.toUpperCase(); loads.push(event.response); });
provider.events.on('error', event => { if (event.error instanceof Error) errors++; });
const request = (page: number) => ({ page, pageSize: 2, search: 'typed' });
async function expectAbort(promise: Promise<unknown>) {
  try { await promise; throw new Error('Expected cancellation'); }
  catch (error) { check(error instanceof Error && error.name === 'AbortError', 'Cancellation type'); }
}
const first = expectAbort(provider.request(request(1)));
const second = provider.request(request(2));
check(pending[0]!.signal.aborted && provider.loading, 'Superseding request aborts previous');
pending[0]!.result.resolve({ items: [] }); await first;
check(provider.loading && loads.length === 0, 'Stale response cannot publish or clear new loading');
const rows: readonly Row[] = [{ id: 4, parentId: null, name: 'Remote', rank: 4 }];
pending[1]!.result.resolve({ items: rows }); const response = await second;
check(response.items === rows && response.page === 2 && response.pageSize === 2 && response.totalCount === 1, 'Response defaults and array identity');
const caller = new AbortController(); const aborted = expectAbort(provider.request(request(3), { signal: caller.signal }));
caller.abort(); pending[2]!.result.resolve({ items: [] }); await aborted;
const failure = provider.request(request(4)).catch(error => error);
pending[3]!.result.reject(new Error('offline')); check((await failure) instanceof Error && errors === 1, 'Loader error event/rejection');
const last = expectAbort(provider.request(request(5))); provider.destroy();
check(pending[4]!.signal.aborted, 'Teardown aborts loader'); pending[4]!.result.resolve({ items: [] }); await last;
check(Number(loads.length) === 1 && !provider.loading && provider.destroyed, 'No late publication');
console.log('Installed data-model consumer OK: projection, snapshots, selection, paging, cancellation and ownership');

function invalidUsage() {
  // @ts-expect-error DataView requires a store.
  new DataView<Row>();
  // @ts-expect-error Inferred numeric ID is not a string.
  view.get('1');
  // @ts-expect-error Lookup can be absent from the current page.
  view.get(1).name;
  // @ts-expect-error Released store is nullable.
  view.data.get(1);
  // @ts-expect-error Comparator must return a number.
  view.setSort((a, b) => a.rank > b.rank);
  // @ts-expect-error Filter receives a typed row.
  view.setFilter(row => row.typo);
  // @ts-expect-error Page size does not accept arbitrary strings.
  view.setPageSize('all');
  // @ts-expect-error Internal projection hints are not public options.
  view.refresh({ _oldPageState: page });
  // @ts-expect-error Tree has no flat-view filter context argument.
  tree.setFilter((row, context) => context.index > 0);
  // @ts-expect-error Tree entry may be null.
  tree.getEntry(1).level;
  // @ts-expect-error Field selection is checked against the row schema.
  new TreeDataView({ data, parentField: 'typo' });
  // @ts-expect-error Tree view does not emit a cancellable beforeExpand event.
  tree.events.on('beforeExpand', () => {});
  // @ts-expect-error Selection keeps its chosen item/ID type.
  selection.set(['1']);
  // @ts-expect-error Planned convenience method is not implemented.
  selection.toggle(1);
  // @ts-expect-error Technical invalidation has a declared boolean silent flag.
  selection.events.on('invalidate', event => { const silent: string = event.silent; void silent; });
  // @ts-expect-error Range requires an anchor or from endpoint.
  ranges.set({ focus: { rowId: 1, columnId: 'name' } });
  // @ts-expect-error Range row identity retains its type.
  ranges.add({ anchor: { rowId: '1', columnId: 'name' } });
  // @ts-expect-error Column ID union remains constrained.
  ranges.add({ anchor: { rowId: 1, columnId: 'missing' } });
  // @ts-expect-error Domain query field is required.
  provider.request({ page: 1, pageSize: 2 });
  // @ts-expect-error Provider results retain record shape.
  new GridDataProvider<Row>(() => ({ items: [{ id: 1 }] }));
  // @ts-expect-error Loader options always receive a real signal.
  new GridDataProvider<Row>((_request, options: { signal: string }) => ({ items: [] }));
  provider.events.on('error', event => {
    // @ts-expect-error Errors are unknown until narrowed.
    event.error.message;
  });
}
void invalidUsage;
