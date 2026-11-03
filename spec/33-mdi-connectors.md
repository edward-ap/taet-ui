# 33. MDI workspace and connectors

Experimental generic visual-designer primitives. No SQL, join rules, source
formats, WebView bridge, or application project model belongs in these controls.
Imports: `taet-ui/experimental` or `taet-ui/all`.

## Composition

`MdiWorkspace` owns movable `MdiWindow` / `MapperWindow` controls and their
content. Mount the workspace before adding windows. Mount a MapperWindow before
calling `connect(layer)`. The workspace owns an attached ConnectorLayer. Models
and selection supplied to the layer are borrowed; destroy them separately.

```js
const fields = new TreeList({ nodeReorder:false, expandedIds:["root"] });
fields.data.parse([
  { id:"root", text:"Record" },
  { id:"name", parentId:"root", text:"Name" }
]);
const source = workspace.addWindow(new MapperWindow({
  name:"source", title:"Source", content:fields, portSides:["right"]
}));
const layer = new ConnectorLayer({ workspace });
workspace.attach(layer);
source.connect(layer);
```

Default adapters: List -> ListPortProvider, TreeList -> TreeListPortProvider,
Grid/TreeGrid -> GridPortProvider. A custom `portProviderFactory` can expose any
other control. `portDefinitions` selects StaticPortProvider for independent
named inputs/outputs. No separate TreeGridPortProvider export exists.

MapperWindow has fixed header, left/right port rails and bottom status; only
its content host flexes. `setStatus(text)` updates the status. `setBounds`,
`moveTo`, `resizeTo`, `collapse`, `expand`, `close`, and `serializeState` belong
to MdiWindow; cascade arrangement belongs to MdiWorkspace.

## Geometry and silent updates

List and TreeList expose client-coordinate snapshots:

- `getItemGeometry(id)` -> `{ id, anchorId, status, rect, viewport }`.
- `getVisibleItemGeometries()` -> snapshots for rows intersecting the viewport.
- `itemGeometryChange` -> technical `{ source }` notification after rendering,
  scrolling and observed row/root resizing, including silent data/projection writes.

IDs retain their original types: numeric `0` and string `"0"` are different.
No row elements are exposed. Status is `visible`, `above`, `below`, `collapsed`,
`filtered`, `missing`, or `hidden` (not mounted, not laid out, or display:none).
Unresolved snapshots have null rectangles. A collapsed child resolves to the
nearest visible collapsed ancestor in `anchorId`; its logical ID is unchanged.
Filtering is not a collapse and must not produce an ancestor proxy.

TreeList `renderItem(item, context)` replaces caption/icon content only. The
control retains its toggle, indentation, row selection and keyboard behavior.
Context adds `level`, `hasChildren` and `expanded` to List's renderer context.
Returned Nodes are trusted renderer code and owned by the row.

MdiWindow `geometryInvalidate` is a technical `{ source }` notification,
including silent geometry/collapse/expand changes. `geometryChange` and
`windowGeometryChange` are semantic notifications and remain silent when asked.
Providers listen to technical synchronization rather than public change events.

List/TreeList remain nonvirtualized collections, intended here for source-field
lists. Use Grid/TreeGrid for large row counts. GridPortProvider enumerates mounted
rows, caches ID-to-projection-index lookups, and invalidates the cache on projection
changes (including silent ones). Its legacy DOM adapter is internal to the provider.

## Provider contract

A provider supplies `controlId`, `getPortPosition(endpoint)`, optional `getPorts()`
and `onChange(handler) -> { dispose, off }`. Coordinates are client coordinates.
Providers are borrowed by a layer. MapperWindow owns its provider; closing or
destroying it unregisters the provider before destroying its content. Destroying
built-in providers also unregisters them from layers observing their changes.

Positions report `visible`, `above`, `below`, or `collapsed`; unresolved endpoints
return null. `proxyItemId` identifies a collapsed ancestor, when applicable.
Offscreen connections clamp to the viewport edge. Collapsed windows expose
noninteractive aggregate ports. A proxy never rewrites the stored endpoint.

Logical connections survive filtering, row removal and window closure; an
application decides whether to delete them. Reopening a provider with the same
controlId and row IDs restores the routes. The layer does not destroy providers.

## Logical model and interaction

`ConnectorModel` stores `{ id, source, target, type?, label?, directed?, routing?,
data? }`. Each endpoint is `{ controlId, itemId?, portId?, side? }`. Source side
defaults to right, target to left. Domain metadata belongs in `data` or an
application-owned model. `routing` supports curve and straight; arrows and
pluggable routing engines are not implemented.

Layer methods:

- `connect(source, target, options?)` -> new Connector or null.
- `reconnect(id, "source" | "target", endpoint, options?)` -> boolean; retains
  connector ID, metadata and the unchanged endpoint.
- `removeConnection(id, options?)` -> boolean.
- `startReconnect(id, end = "target")` -> boolean; starts a cancellable draft.
- `cancelConnection()` -> clears draft and pointer subscriptions.

`canConnect({ source:layer, connector, oldConnector })` may return false.
It runs for creation and reconnection even with `silent:true`. Keep it pure.
`beforeConnectionChange` is cancellable and covers creation (`oldConnector:null`)
and reconnection. Successful writes emit `connectionCreate` or `connectionChange`.
Removal has `beforeConnectionRemove` and `connectionRemove`. These semantic
events honor mutation options; synchronization does not depend on them. Direct
ConnectorModel writes intentionally bypass interactive validation (e.g. restore).

Drag between ports or use Tab then Enter/Space on source and target. Escape,
pointercancel, window blur, and provider removal cancel a draft. On a focused
connection: Delete/Backspace removes it; R chooses a new target, Shift+R a new
source. Finish by clicking or keyboard-activating the replacement port. SVG
ports/connections have accessible labels and visible keyboard focus. This is
browser keyboard coverage, not a screen-reader certification.

The framework rejects self-endpoints and unresolved endpoints. Direction, type,
cardinality, duplicate-edge and cycle rules belong in the application's validator.

## Examples and checks

- `examples/labs/mapper-lists.html` / `.js`: List/TreeList, custom field renderer,
  ancestor proxies, validation and keyboard editing.
- `examples/labs/lab27.html`: Grid/TreeGrid and independent static ports.
- `browser-tests/mapper-lists.spec.js`, `browser-tests/lab27-mdi-mapping.spec.js`.
- `test/connector-model.test.js`, `test/static-port-provider.test.js`.
- `test/types/mapper-consumer.ts` checks the installed package declarations.

Infinite pan/zoom, automatic graph layout and project persistence remain separate
work. This component family supplies MDI geometry and editable logical connectors.
