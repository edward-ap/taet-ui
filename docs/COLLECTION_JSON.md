# JSON trees and properties (experimental v1)

These adapters create existing live controls, not a new UI framework. They use
Grid JSON's strict JSON boundary and editor descriptors. Existing component
maturity is unchanged. All factories return an unmounted control unless the host
supplies container; the caller owns destruction. No fetching or live schema patch.

Portable apps import from `./taet-ui.min.js` with `./taet-ui.min.css` linked once.
Typed package imports use `taet-ui/experimental`; TreeGrid factories also use
`taet-ui/grid`. Full bundle exports all factories. Application profiles may omit them.

## Tree / TreeGrid

```js
import {createTreeFromJSON, createTreeGridFromJSON} from "./taet-ui.min.js";
const definition = {
  schemaVersion: 1,
  tree: {expandedIds: ["root"]},
  selection: {multiple: true},
  data: [
    {id: "root", text: "Project", icon: "folder"},
    {id: 1, parentId: "root", text: "main.js", icon: "file", bytes: 1024}
  ]
};
const tree = createTreeFromJSON(definition, {container: "#tree"});
const grid = createTreeGridFromJSON({...definition,
  treeColumnId: "text",
  columns: [
    {id: "text", title: "Resource", sortable: true, editor: {type: "text", required: true}},
    {id: "bytes", title: "Bytes", dataType: "number", format: {type: "number"}}
  ],
  sort: [{columnId: "text", direction: "asc"}]
}, {container: "#grid"});
// On teardown: tree.destroy(); grid.destroy();
```

- `createTreeFromJSON` returns TreeList; no separate Tree class is introduced.
- `compileTreeDefinition` / `compileTreeGridDefinition` return `{options,data}`;
  the latter also returns `sort`, applied by its factory after loading rows.
- Both accept schemaVersion=1, data, tree, selection, width/height. Dimensions follow
  GRID_JSON. Host container/width/height are outside the server definition.
- `tree` accepts textField/iconField, expandedIds, expandAll, expandOnClick.
  expandAll and expandedIds are mutually exclusive. Explicit expanded IDs may refer
  to rows arriving later. expandAll applies once, to the factory's initial data;
  after loading later rows call expandAll explicitly if desired.
- Flat records use fixed id/parentId; absent/null parentId denotes a root.
  IDs are strings/numbers, including distinct 1 and "1". Multiple roots work.
  Initial data must be a complete forest: no missing parents, cycles or duplicates.
  Hierarchy depth is limited to 128. Referenced icons must already be registered;
  JSON cannot register SVG or fetch icons. Captions render as text.
- Tree selection accepts only multiple. nodeReorder is opt-in (default false).
  Per-node permission callbacks remain host code, outside v1 JSON.
- TreeGrid columns/editors/formats follow GRID_JSON, except summary is rejected.
  treeColumnId must identify a declared column. Neither id nor parentId is editable.
  Selection additionally accepts range rows/cells. A single initial sort rule sorts
  siblings; paging and Grid rowReorder are rejected, not silently ignored.
- Omit data for separate delivery. Later `control.data.parse(rows)` follows the
  underlying DataStore contract and does not run this adapter's hierarchy checks.
  To validate a fresh response, compile a definition containing its complete rows
  and use its data. Lazy child loading/provider protocols are outside v1.
- TreeGrid host accepts the same trusted formatter registry as Grid; Tree does not.

## PropertyGrid

```js
import {createPropertyGridFromJSON, getPropertyGridValues} from "./taet-ui.min.js";
const properties = createPropertyGridFromJSON({
  schemaVersion: 1,
  groups: [{id: "general", title: "General", properties: [
    {name: "title", label: "Title", editor: {type: "text", required: true}},
    {name: "copies", label: "Copies", editor: {type: "number", min: 1, max: 20}},
    {name: "enabled", label: "Enabled", editor: {type: "checkbox"}}
  ]}],
  data: {title: "Report", copies: 2, enabled: true}
}, {container: "#properties"});
properties.events.on("propertyChange", () => {
  const values = getPropertyGridValues(properties);
  // Send values through the host's transport when appropriate.
});
```

`compilePropertyGridDefinition` returns `{options,names}` without creating controls.
Root fields: schemaVersion, groups, data, showCategories, sortMode (categorized /
alphabetical / none), labelWidth, width, height. Groups contain unique id, title,
properties. A property contains a globally unique name, optional label, description,
readOnly, editor and children. Missing editor means readonly. Editor descriptors
match GRID_JSON; required installs validation, not only the visual required state.
Numeric min/max/step use NumberInput normalization. PropertyGrid inline edits now
run editor validation before writing, just as explicit cell editing already did.

`data` is a flat JSON object keyed by property name, even for nested properties.
Unknown keys are rejected; missing values initialize to null. Children express UI
nesting, not dotted object traversal. Nesting is limited to 16 levels, 2000 total
properties and 256 groups. The source schema and values are cloned. Initial values
are not coerced or validated against editor rules; backend validation is still required.

`getPropertyGridValues` returns a detached snapshot of committed values, including
collapsed children and readonly entries. It does not force an editing draft to
commit. It requires a live factory-created PropertyGrid and rejects replaced property
models. Submit changes through propertyChange or the snapshot, not data.all():
PropertyGrid data is its visible presentation rows. Its data.parse() is not a value
loading API. Assemble separately delivered schema and data before construction;
replace the control explicitly when replacing its definition.

No server-defined callbacks, setters, commands, arbitrary HTML or permissions.
Shared JSON limits and registered formatters: [GRID_JSON](GRID_JSON.md).
Live pages: List -> Tree JSON Configuration / TreeGrid JSON Configuration;
Grid -> PropertyGrid JSON Configuration.

For editable grouped forms, see [JSON Form](FORM_JSON.md). It shares editor
descriptors but returns a regular Form with its existing value/validation API.
