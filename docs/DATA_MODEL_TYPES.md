# Typed data models

This page documents the typed npm package; its package imports are intentional.
For portable JavaScript application setup, use the consolidated bundle as described
in [BUILD](BUILD.md). Standalone bundles do not currently ship flattened declarations.

`taet-ui/core` includes declarations for the existing DataView, TreeDataView,
SelectionModel, RangeSelectionModel and GridDataProvider. They are the same
constructors already used by the UI. The first three retain their stable v0.x
classification; RangeSelectionModel and GridDataProvider remain experimental.
These imports do not require a DOM at runtime. As for the rest of the typed core
entry, include TypeScript's DOM library for the declared browser platform types.

## Flat projections and paging

```ts
import { DataStore, DataView } from 'taet-ui/core';

interface Order { id: number; total: number; status: string }
const data = new DataStore<Order>();
const view = new DataView({
  data,
  filter: (order, context) => order.status === 'open',
  sort: (left, right) => right.total - left.total,
  pageSize: 50
});
data.parse([{ id: 1, total: 125, status: 'open' }]);
view.setPage(2);
const state = view.getPageState();
const pageRows = view.all();
const filteredRows = view.projectedAll();

view.destroy(); // unsubscribes; does not destroy data
data.destroy();
```

Record and ID types infer from the DataStore. The filter context contains
`index` (in the source array), typed `id`, `data` and `view`. The comparator
context contains `data` and `view`. Filters return boolean, comparators number.
Paging is applied **after** filtering and sorting. `all()`, `get()`, `has()` and
`indexOf()` refer to the current page; `projectedAll()` includes the whole
filtered/sorted projection. A lookup outside the page returns `undefined`.

Pages start at 1 and clamp to the available range. An empty projection still
has one page, with `from`/`to` equal to zero. `pageSize: null` or `false` disables
paging; `getPageState().pageSize` is then null. `setFilter`, `setSort` and
`setPageSize` reset to page 1 unless passed `keepPage: true`. Methods return
whether the visible projection/page state changed, not merely whether the
stored callback/configuration was replaced.

Silent store/view mutations still update the projection and emit `invalidate`
when its output changes, without public `change`/`afterChange`. Event arrays and
`all()` return snapshots of arrays, not deep clones of records. No `beforeChange`
event is promised for these projections. Destroyed DataView methods reject use;
the public `data` reference becomes null, which is reflected in its declaration.
Callback contexts contain the live store directly.

### Filter and comparator lifetime

Keep predicates/comparators pure: change application data before requesting a
projection. DataView and TreeDataView nevertheless guard observable store writes,
callback replacement, paging/expansion changes and teardown during evaluation.
An interrupted pass stops calling the old callback and discards its unfinished
row arrays. A fresh pass evaluates the latest inputs after the callback returns;
it does not recursively enter that callback. Nested setters/refresh return
`false` because they have not published their own projection yet. A recursive
refresh with unchanged inputs, or reassignment of the same active predicate or
comparator, does not request another pass.

Only the completed row projection is published. When nested requests invalidate
the pass, the latest such request supplies its mutation metadata, including
`silent`. Ordinary consumer exceptions propagate. A callback that keeps changing
its inputs fails explicitly after eight interrupted passes, instead of overflowing
the stack or scheduling an endless retry loop. The last completed row projection
remains; requested configuration and accepted store writes are not rolled back.
Correct/remove the failing callback and refresh before continuing to use the view.

Destroying a view during evaluation returns `false` without publishing. DataView
also stops later notification phases when invalidate/change handlers destroy it
or publish a newer projection, including incremental record updates. Already
emitted snapshots remain usable. These checks concern synchronous documented
callbacks and observable writes; they do not isolate arbitrary custom store
internals or detect direct record mutations.

When a Grid attaches to DataView, both APIs share one global predicate:
`view.setFilter(predicate)` and `grid.setFilter(predicate)` replace that same
predicate; their getFilter methods return it, not the effective AND composition.
Column filters and filter-mode search remain applied through either setter.
`grid.clearFilter()` / `view.clearFilter()` remove only the global predicate.
TreeGrid and TreeDataView share this behavior; use `treeView.setFilter(null)` to
clear the tree view's global predicate.

One view can have one attached table filter owner. Use separate views over the
same DataStore for independent tables. Destroying the table removes its owned
column/search composition from an external view, keeps the latest global
predicate, and silently refreshes that view. It does not destroy the external
view or store. This integration applies to the supplied DataView/TreeDataView
classes (including subclasses using their setters). Custom structural view
implementations retain their existing composition contract; use the table API
as their sole filter owner.

Direct sorting on supplied views clears stale table column sort state and
indicators, including same-order silent changes, without inferring column rules
or synthesizing table sortChange events. See [table sorting](GRID_TYPES.md).

Grid and TreeGrid also release their current table-created comparator on an
external view during teardown, restoring the comparator it replaced. A newer comparator
set directly on the view is preserved. This avoids retaining a custom sort
callback whose context points at a destroyed Grid. Internally owned views are
destroyed without an unnecessary final projection rebuild.

## Tree projections

```ts
import { DataStore, TreeDataView } from 'taet-ui/core';
interface Node { id: string; parentId: string | null; title: string }
const data = new DataStore<Node>();
data.parse([{ id: 'root', parentId: null, title: 'Root' },
  { id: 'child', parentId: 'root', title: 'Child' }]);
const tree = new TreeDataView({ data, expandedIds: ['root'] });
const entry = tree.getEntry('child'); // TreeDataViewEntry<Node, string> | null
if (entry) console.log(entry.item.title, entry.level);
tree.setFilter(node => node.title.includes('Child'));
tree.destroy();
data.destroy();
```

Tree filters receive just the record; sort callbacks receive two records and
sort siblings. They do not receive the flat DataView callback context. Filtering
retains ancestors of matches and renders them expanded. The explicit expanded
ID set remains separate from this filter-driven display state.

`get()` returns `undefined` for a hidden/missing record; `getEntry()` returns
null. Entries contain typed `item`/`id`, `parentId`, `level`, `hasChildren` and
`expanded`. Parent values are application-owned fields and are not validated by
TreeDataView; `parentIdOf()`/`entry.parentId` conservatively return `unknown`.
Use valid parent identities (or the configured root marker) in application data.

Projection events expose `oldEntries`, `entries`, `oldIds` and `ids`. These arrays
materialize when first read but describe the version at emission, even after
later updates or destruction. Entry wrappers are copied; record objects are
shared. Do not retain an unbounded event history. Tree destruction releases its
store reference, filter/sort callbacks and subscription without owning the store.
Operational methods, including getFilter()/getSort(), then throw. Inspect
destroyed to determine lifecycle state rather than calling a disposed view.

TreeDataView emits expand/collapse notifications but has no cancellable
`beforeExpand` event. The TreeGrid control adds its own interaction events.

After invalidation/change callbacks destroy the view or publish another
projection, the old projection stops its remaining change/afterChange phases.
Already emitted events retain their original lazy snapshots. Nested expansion
operations and store invalidations also suppress the old expansion notification;
the applied operation's return value is retained. EventBus still delivers the
current event to its captured listener list; these guards stop subsequent phases.

## Selection and ranges

```ts
import { SelectionModel, RangeSelectionModel } from 'taet-ui/core';
const selection = new SelectionModel<number>({ multiple: true });
selection.set([1, 2] as const);
const veto = selection.events.on('beforeChange', event => {
  if (event.items.includes(99)) event.cancel = true;
});
const ranges = new RangeSelectionModel<number, 'name' | 'total'>();
ranges.set({ from: { rowId: 1, columnId: 'name' },
  to: { rowId: 2, columnId: 'total' } });
const latest = ranges.primary(); // normalized anchor/focus pair, or null
veto.dispose(); selection.destroy(); ranges.destroy();
```

SelectionModel stores whichever `T` the application chooses and deduplicates
with reference/value identity. Its actual API is `multiple`, get/set/clear/
hasAny/destroy; no mode/ids/add/remove/toggle methods are implemented yet.
Single selection rejects more than one distinct item. `get()` copies the array.

**Grid and TreeGrid store records in their SelectionModel**, despite exposing
ID-based `setSelectedIds()` convenience methods. For external grid selection,
use `new SelectionModel<Order>()`, not `SelectionModel<number>`. The control
reconciles selection with the visible projection; a standalone SelectionModel
has no DataStore subscription and does not reconcile itself.

RangeSelectionModel stores row/column endpoints without resolving their visual
coordinates. Its default is multiple ranges; `primary()` returns the last range.
Inputs accept anchor/focus or from/to, with an omitted end defaulting to the
start. Output always uses anchor/focus. Arrays and endpoint wrappers are copied.
The owning Grid determines how these endpoints map to visible rows/columns.

Both selection models support cancellable beforeChange and committed
change/afterChange. Silent changes skip these events (and their veto handlers);
both models emit technical invalidate after each accepted write, including silent.
Invalidate includes the committed snapshot, origin/userAction and silent; it is
for synchronization, not a second user change notification. No-op/veto emits none. After
destruction their operational methods reject access.

SelectionModel aborts a write if a beforeChange listener destroys it, returning false.
Destruction in change suppresses afterChange while the applied write still returns true.
Nested writes that publish a newer selection suppress the old remaining phases.
This guarantee covers SelectionModel and RangeSelectionModel; it does not change current EventBus listener
snapshots or promise arbitrary nested-write handling in every selection model.

## Typed asynchronous providers

```ts
import { GridDataProvider, type DataProviderRequest } from 'taet-ui/core';
interface Order { id: number; total: number; status: string }
interface Query extends DataProviderRequest {
  page: number;
  pageSize: number;
  status: string;
}
const provider = new GridDataProvider<Order, Query>(async (query, { signal }) => {
  signal.throwIfAborted();
  // Replace this sample with a loader that validates your backend's response.
  return { items: [{ id: query.page, total: 125, status: query.status }], totalCount: 200 };
});
try {
  const result = await provider.request({ page: 1, pageSize: 50, status: 'open' });
  console.log(result.items, result.totalCount);
} finally {
  provider.destroy();
}
```

The base request declares optional page/pageSize; extend it with a backend's
query schema. This is not yet a complete declaration of Grid's generated
sort/filter/search request. Loaders can return a result directly or a promise,
and always receive the internally linked AbortSignal. Forward it to fetch.
Request options include the caller's signal and mutation metadata.

The response supplies items, totalCount, page and pageSize. Defaults come from
the result, then request, then page 1/null page size; totalCount defaults to the
item count. The loader's array is preserved and declared readonly. Types do not
validate external JSON, identities or finite/consistent counts at runtime.

A new request aborts the previous one; an aborted/stale completion cannot
publish a load event or clear a newer request's loading state. Cancellation and
destruction reject the promise with AbortError once the loader settles. They
do not force an uncooperative pending loader to settle. Other errors emit an
error event with `error: unknown` and also reject. Handle every request promise.

The creator owns provider destruction. Grid aborts its own pending request on
teardown, but does not destroy an injected provider. Local DataView paging and
remote batches are distinct; see [remote loading](../spec/grid-remote-loading.md).

## Verification and coverage

Strict TS and checked JSDoc consumers are compiled and executed from a real
installed tarball under `test:types`. Tests cover inference, missing lookups,
callback signatures, page state, silent projection updates, retained tree
snapshots, selection vetoes, range copies, stale/aborted loads and destruction.
Negative checks reject unsupported methods/events, wrong IDs/fields, malformed
ranges and incorrect loader/query schemas.

`test:types:browser` additionally supplies compiled model factories to actual
Grid/TreeGrid instances. It checks rendering after silent model writes,
selection reconciliation, ranges, remote loading and external model ownership.
The existing editor integration runs alongside it. The JavaScript bootstrap
still creates the controls: full Grid/TreeGrid and BaseControl declarations,
other grid models and the wider UI typing stage remain pending.

## Experimental local store transfer

DataStore.transferTo coordinates two concrete local stores without nested batches.
Both plans and cancellable beforeChange phases complete before a callback-free
pair commit. Same-store, existing/incoming ID conflict and active transaction reject.
Move retains default row references; copy spreads own fields and preserves nested
references. Different TypeScript record shapes require mapItem; runtime schema
permissions belong to the application/Grid facade. Accepted results can include
notificationErrors from observers; do not retry an accepted commit. A rejected
callback-error also includes the preflight exception there. Successful transfer
clears independent history for each changed store. Full contract: [GRID_TRANSFER](GRID_TRANSFER.md).
