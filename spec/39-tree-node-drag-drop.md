# Tree Node Drag And Drop

`TreeList` supports row reparenting and sibling ordering through one public
mutation API:

```js
tree.moveNode(sourceId, targetId, "before" | "inside" | "after", options);
```

## Options

- `nodeReorder` enables native row drag/drop and defaults to `true`.
- `canDropNode(move)` can reject a proposed visual or programmatic move.
- `onBeforeNodeMove(event)` receives a cancellable mutation event.
- `onNodeMove(event)` runs after the backing `DataStore` accepts the move.
- `onNodeDragStart(event)` and `onNodeDragEnd(event)` describe the pointer
  gesture without owning data mutation.

## Move Rules

- `inside` changes the source `parentField` to the target id and appends it to
  the target's direct children.
- `before` and `after` assign the target's parent and update sibling order.
- Moving a node into itself or any descendant is rejected.
- A move which would preserve the same parent and sibling index is a no-op.
- The mutation is stored as one `DataStore.batch()` operation so undo restores
  both parent and ordering.
- Successful `inside` drops expand the target unless `expandTarget: false` is
  passed.

`TreeDataView` remains a read-only projection. `TreeNodeDragController` owns
only DOM drag state and delegates all mutations to `TreeList.moveNode()`.

## Visual Contract

The top and bottom quarters of a row represent `before` and `after`. The middle
half represents `inside`. Invalid targets do not accept the browser drop.
Collapsed targets auto-expand after a short inside-hover delay.

## Callback lifetime

`canDropNode` and `beforeNodeMove` run before the write. Destroying the owner,
replacing its models, or changing data through store notifications (including
silent changes) cancels the pending move. It returns `false` and does not apply
the obsolete proposal. Recursive moves and recursive validator queries return
`false`; a validator should inspect its supplied proposal without mutating data.

After the store accepts the batch, the move remains committed. If a notification
destroys the owner or replaces the resulting rows, `moveNode` returns `true`
without auto-expanding the old target or emitting a stale `nodeMove`. The batch
still supplies the usual single undo step. Silent moves synchronize the tree
without public move/expansion events.

Native drag callbacks may close the owning screen. A replaced drag session cannot
overwrite the new session, and rows with reused IDs do not inherit an old drag.
Delayed expansion belongs to the current gesture and target record. Drop cleanup
runs even when the move handler throws; owner teardown releases its controls and
view even when `nodeDragEnd` throws. Consumer exceptions still propagate.

These guards cover tree operation callbacks and observable store writes. They
are not a general transaction/isolation guarantee for mutations made directly
to record objects or for arbitrary reentry inside a custom store implementation.

## Expansion events

TreeList and TreeGrid share the same operation lifetime checks. Before starting
work, a TreeGrid `beforeExpand`/`beforeCollapse` handler may veto, destroy the
owner or replace data; cancelled operations return `false`. Recursive expansion
requests during these before-events are rejected. After projection publication,
a nested control expansion/collapse can take over; the old operation retains its
committed return value but stops its remaining notifications.

Single-node operations return a change boolean; expandAll/collapseAll retain
their fluent control return value. Expanding a leaf or an already expanded node
is a no-op. Silent operations preserve visual/model synchronization without
semantic events. TreeDataView itself has no cancellable before-expansion event.
