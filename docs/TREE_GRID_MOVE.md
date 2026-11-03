# TreeGrid subtree movement (experimental)

Opt-in move within one local TreeGrid, from its existing 10px service gutter.
No copy, transfer between trees, external import or remote persistence is added.
Existing TreeList node movement and Grid row transfer keep their own contracts.

## API and gesture

```js
const tree = new TreeGrid({
  nodeReorder: true, multiSelect: true, rowRangeSelection: true,
  parentField: 'parentId', treeColumnId: 'name',
  columns: [{id:'name', title:'Node'}]
});
// Existing DataStore loading/mount/ownership rules apply.
const result = tree.moveNodes(['branch', 'selected-child'], 'target', 'inside');
if (!result.accepted) console.log(result.reason);
tree.moveNode('branch', null, 'inside'); // append at root
```

moveNode(id,targetId,position?,options?) and moveNodes(ids,targetId,position?,options?)
return accepted, reason, normalized root ids, all subtreeIds, targetId, position,
parentId and notificationErrors. Positions are inside (default), before and after.
A null target is supported only with inside and means root append. Both helpers
require nodeReorder:true; they work without a gutter or a mounted DOM. The current
schema-version-1 JSON factory is unchanged; opt in through the object API.

A row middle drop means inside; its top/bottom quarter means before/after. Empty
body space appends at root. Only the whole existing gutter body cell starts drag:
text, hierarchy toggles and header settings do not. A normal click retains current
Ctrl/Cmd/Shift selection. A selected-row drag uses the selected set; dragging an
unselected row first selects that row alone. Native threshold starts the gesture.
No gutter means no pointer start. No new keyboard shortcut is introduced; commands
can call the declared helpers. Native previews show roots/node counts and target
zones. A preview is not acceptance: domain vetoes run on commit.

Escape, outside drop, scroll, data/view/schema/selection changes, disabling or
teardown cancel the lifetime-bound native session. An active editor rejects drag
and programmatic movement while preserving its draft. A different TreeGrid cannot
accept the source's internal token; text/files are not imported as node data.

## Parent, order and integrity

The supplied TreeDataView parentField/rootParentId are authoritative, including an
explicit null root marker. Data is a flat valid forest in a native local DataStore
and TreeDataView. Sibling order is DataStore array order; records need not be in
contiguous depth-first order. No new parent/order schema is introduced.

Selected ancestors and descendants normalize to one root, in store order. Every
descendant participates, including collapsed/filtered nodes. Only moved root
records receive a shallow parent-field patch. IDs, nested values and descendant
record references/parent links remain unchanged. The operation does not JSON-clone,
deep-copy or regenerate IDs. Stable application IDs are required; index-derived
IDs, custom/subclass stores/views and asynchronous providers reject conservatively.

Self/descendant targets, invalid forests/cycles/orphans, missing IDs/targets and
no-op plans reject the entire operation. With active sort, before/after rejects
sorted-order; inside reparenting remains allowed and is displayed in sorted order.
Filtering does not remove descendants from the moved closure. API calls can name
hidden IDs; pointer targets must be visible rows or blank body.

Successful inside moves expand the target after commit unless expandTarget:false.
Explicit selection changes from callbacks remain authoritative, including direct
silent/system model calls. Visibility pruning runs against the final view rather
than an intermediate collapsed target. Afterwards ordinary TreeGrid policy applies:
only visible IDs remain selected. TreeDataView filtering temporarily reveals paths
to matches; clearing a filter restores stored expansion state, which can prune
selection without deleting records. Expansion and selection are not history data.

## Veto, notifications and history

beforeNodeMove supplies ids, subtreeIds, root items, targetId, position, parentId,
nativeEvent (null for API calls), origin/userAction and mutable cancel/reason.
Per-record permissions belong to application policy in this hook. Read-only cell
editors do not imply structural row permissions. The demo vetoes any readonly node
in the moved closure or target, naming its ID and cancelling the entire batch.

Policy hooks and DataStore.beforeChange run before the history batch. A callback
that replaces data/view/schema makes the proposal stale; its own replacement is
preserved. Exceptions before commit reject callback-error; teardown stops dependent
phases and cannot commit into a surviving borrowed store. Nested movement is busy.
Use DataStore mutations rather than assigning parent properties directly.

The prepared array swaps in one parse/history batch, so there is no partially
reparented set. nodeMove reports the final result once per surviving owner. Errors
from committed observers are collected in returned notificationErrors and leave
accepted:true. Reentrant post-commit changes stop dependent expansion/selection
work; a surviving owner may still receive the committed result with original IDs.
Further nodeMove listeners stop after teardown/context replacement. Silent follows
the existing mutation contract: technical UI invalidation and history still run,
semantic beforeNodeMove/nodeMove and store change hooks are suppressed.

One successful move adds one normal DataStore history step; veto/no-op adds none.
data.undo()/redo() restore record/order snapshots, not expansion/selection. This
uses existing history rules and does not clear history as cross-store move does.
External writes are not merged into an older snapshot on undo. Demo Reset fixture
reloads its records/selection/expansion; it does not introduce a new history-reset
API or alter the store's parse/history contract.

## Checked demo

Open /examples/tree-move/ on the existing localhost server. Three branches, a
three-level subtree, multi-selection, readonly policy, sorting, undo/redo and
operation reasons exercise the contract. It uses Noto Sans, 24px rows and 10px
gutter in light/dark themes. Source recipe: ../examples/tree-move/app.js.
Exact commands, counts, artifacts and remaining limitations are in VERIFICATION.md.
