# JSON Grid definitions (experimental v1)

`compileGridDefinition` and `createGridFromJSON` are exported from `taet-ui/grid`,
`taet-ui/experimental`, `taet-ui/all` and the full portable bundle. This is a
strict adapter over Grid, not a general UI description language or live schema updater.

```js
import { createGridFromJSON } from "./taet-ui.min.js";
const response = await fetch("/api/orders/grid");
if (!response.ok) throw new Error(`Grid request failed: ${response.status}`);
const grid = createGridFromJSON(await response.json(), {
  container: "#orders",
  width: "100%",
  height: 320
});
// Owner must eventually call grid.destroy(), or attach it to its owning Panel.
```

An example server payload:

```json
{
  "schemaVersion": 1,
  "selection": { "multiple": true, "range": "rows" },
  "paging": { "pageSize": 25 },
  "columns": [
    { "id": "name", "title": "Product", "width": 240,
      "editor": { "type": "text", "required": true } },
    { "id": "price", "title": "Price", "dataType": "number", "sortable": true,
      "editor": { "type": "number", "min": 0 },
      "format": { "type": "currency", "currency": "USD", "locale": "en-US" },
      "summary": { "kind": "total", "scope": "filtered" } }
  ],
  "data": [{ "id": "item-1", "name": "Keyboard", "price": 49.5 }]
}
```

## Creation and separate data

- `compileGridDefinition(input, { formatters })` validates and copies JSON, then
  returns `{ options, data }`. No live controls or DOM are created. options contains
  compiled editor factories/formatters, so it is intentionally not another JSON file.
- `createGridFromJSON(input, { container, width, height, formatters })` returns a Grid.
  Container is optional; without it the caller mounts/adds the Grid later. Host
  width/height override server dimensions. Default height is 280.
- Input accepts JSON text or a plain JSON-valued object. Errors are TypeError with
  a diagnostic path. Invalid input is rejected before constructing a Grid.
- Omit data to deliver a schema separately. Later use `grid.data.parse(rows)`.
  This later call uses the existing DataStore contract, not the definition validator.
- Fetch, cancellation, IPC, stale response handling and persistence belong to the
  host. There is no automatic network request, URL loading or remote provider.
- V1 creates a new Grid. Replacing a running Grid is an explicit host action;
  there is no merge of drafts, selection, layout preferences or schema changes.
  The live JSON Configuration example validates/builds the replacement first and
  preserves the old table if validation fails.

## Supported schema

Only the following properties are accepted; spelling mistakes are not ignored.

| Location | Properties |
| --- | --- |
| Root | schemaVersion=1, columns, optional data, selection, paging, sort, width, height, rowReorder |
| Selection | multiple boolean; range rows/cells |
| Paging | pageSize integer (1–50000), local paging only |
| Sort | array of columnId/direction asc or desc; columns must declare sortable:true |
| Column | id, field, title, width, minWidth, maxWidth, dataType, align, hidden, frozen, sortable, filterable, resizable, editable, editor, format, summary |
| Editor | type, required, placeholder; number-only min/max/step; select/radio items |
| Item | unique value string/number (radio also boolean), text string |
| Summary | count/total/min/max/average string, or kind + scope page/filtered/all/selection |

Dimensions are positive finite numbers up to 10000; root width also accepts 100%.
Column ids/fields are flat property names, not object paths. IDs are unique column
strings; data rows require unique string/finite-number `id` values. Number 1 and
string "1" remain distinct. The record identity field cannot have an editor.
Columns without editors are read-only. editable:false maps to Grid readOnly;
editable:true requires an editor. Numeric summaries require dataType:number
(or the inferred number editor type). Boolean checkbox/switch editors infer boolean.
Other default column types remain Grid's normal behavior; date/dateTime editors
can use an explicit date dataType where needed.

Built-in editors: text, number, select, checkbox, switch, radio, date, time,
dateTime. They are existing Tæt UI factories, with normal value/commit/cancel
and validation behavior. required:true installs both the required state and the
standard required validator; number min/max/step use NumberInput normalization.
Incoming row values are JSON, not coerced against column
types and not validated by editor rules on load. Backend validation remains
required when accepting edits. min/max/step configuration does not grant permission
to mutate records on the backend.

Formats: number, currency, percent use Intl.NumberFormat; optional locale defaults
to en-US and fraction digits range from 0 to 20. Currency requires a currency code.
These format numeric values; numeric strings are left as text. Null/empty values
remain empty. boolean maps true/false using optional trueText/falseText (Yes/No by
default). Formatting affects display, not the stored value or summary arithmetic.

## Client extensions and input boundary

```js
const grid = createGridFromJSON(payload, {
  formatters: { productCode: value => `SKU ${String(value)}` }
});
// Server column: "format": { "type": "registered", "name": "productCode" }
```

Only own registered names resolve. The callback is trusted client code; its output
is converted to text. JSON cannot provide functions, eval, HTML renderers, URLs,
callbacks, regex validators, CSS injection or custom editor implementations. Custom
editor registries and more validators are deliberately outside v1.

Input is copied. Object input must contain plain JSON values, without accessors,
cycles, symbols or non-finite numbers. Reserved __proto__/constructor/prototype
keys/names are rejected. For an untrusted transport, pass parsed JSON or JSON text,
not arbitrary executable Proxy objects. Limits: 2,000,000 JSON text characters,
2,000,000 total string-value characters, 200,000 visited values, depth 32,
256 columns, 50,000 rows, 1,000 items per choice editor, 1,000 characters for schema
names/labels. These bound normal payloads; they are not a sandbox for client code.

Stable/experimental status is unchanged. See the live Components → Grid → JSON
Configuration page, GridDefinition declarations, and grid-definition/grid-json tests.

Related adapters: [Tree, TreeGrid and PropertyGrid](COLLECTION_JSON.md). They share
JSON validation and editor descriptors, but use separate component-specific schemas.
