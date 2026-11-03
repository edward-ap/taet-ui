# Existing table editor matrix

Grid and TreeGrid remain experimental. This page describes the existing factories
in `taet-ui/grid/editors`; it does not certify every standalone input as a cell
editor. [Live example](../examples/grid-editors/README.md) / [recipe11](../examples/ai-recipes/11-grid-editor-matrix.js).

| Factory | Actual control / result | Compact presentation |
| --- | --- | --- |
| text | TextInput / string | Single line; long draft scrolls inside its input |
| number | NumberInput / number or null | Single line, native spinbutton |
| select | SelectInput / choice ID or configured empty value | Native select by default; searchable mode uses a portaled listbox |
| checkbox | CheckBox / boolean | Inline boolean; Grid also has its existing immediate toggle path |
| switch | Switch / boolean | Inline boolean; TreeGrid retains mounted editing |
| date | DateInput / local date string | Inline text + portaled calendar |
| time | TimeInput / local time string | Inline text + portaled time picker |
| dateTime | DateTimeInput / local datetime string | Inline text + portaled calendar/time picker |
| radio | RadioGroup / application value | Two short flow choices tested; multi-row/wrapped layouts need application space/popup |
| custom | ValueControl adapter or complete CellEditor | Explicit application integration; no automatic geometry/type guarantee |

Color has no built-in grid factory. TextArea/multiline, FileUpload, token/multi
choice and other complex controls are not part of this tested inline matrix.
An existing Dialog/Popup with the ordinary control and explicit DataStore save is
the intended application approach when a short row cannot hold the content. No
new rich cell editor or factory alias was added for these controls.

## Values and factory selection

Assign a branded factory to columns[].editor, or use the existing column resolver.
A resolver also runs during editability checks; Grid may pass null and TreeGrid
undefined as source. Factory option callbacks receive the real cell context.
The factory gets raw field/computed `column.value`, never the formatted render
string. Built-ins replace option label/value with an empty label and that raw value.

- Text null/undefined normalizes to `''`; other primitives become strings.
- Number null/undefined/blank/invalid numeric text normalizes to null, not zero.
  Numeric zero, negative and decimal remain numbers. The existing NumberInput
  codec converts raw false to zero; pass numeric/null source fields deliberately.
  Existing clamp, precision and integer options still apply. The demo uses
  clamp:false plus a validator, so an invalid draft is rejected rather than clamped.
- Checkbox/switch use strict true; false stays boolean false. They are not tri-state.
- Select retains typed choice IDs (including numeric 0). Its default empty value
  remains `''`; explicitly configuring emptyValue:null now preserves null through
  initial loading, clear and no-op commit. IDs absent from choices may remain in
  the value; choices do not silently rewrite source records.
- Radio retains the configured value type, including false/0/null. It is not a
  boolean checkbox codec; configure actual choice records.
- Date/time/datetime return strings, with null/undefined empty as `''`. Time's
  existing numeric-looking string normalization includes 0 -> '00:00'. These are
  local values, not automatic UTC Date objects. Validation/ranges are application
  policy; the demo date validator checks the ISO shape, not every calendar rule.

DataStore.parse preserves raw record types. Starting/committing may normalize
through the chosen editor; cancelling preserves the source value. Read-only table
columns/records prevent activation. Control-level disabled/readOnly options retain
the standalone input behavior; they do not redefine column editability. Use the
column rule or disable the table for cells that should not start editing.

## Keys, popups and geometry

The shared cell policy remains Enter/F2 start, Enter commit, Escape cancel,
Tab/Shift+Tab commit and traverse, IME/default-prevented keys ignored. Closed
searchable Select follows that policy in a table; standalone Select keeps Enter
opening choices. With a popup open, its own Enter/first Escape remains local.
Unconsumed Tab from an owned Select/date/time portal reaches the same grid policy,
with the original native event, not a duplicate synthetic key dispatch.

Popup geometry is owned by the existing input. The cell adapter tracks control
resize and column-model geometry, forwarding to that positioning code. Resizing a
preceding column repositions an open popup; scrolling the grid body cancels the
session and destroys its popup, as before. Viewport scroll/resize repositions;
projection/data/schema removal cancels. Disabling a table also cancels its
editor silently with system provenance, without writing the draft. Popup OK/date choice/Escape return focus
when it still belongs to that input; teardown or a callback's deliberate external
focus wins. Owners release listeners/subscriptions and popup DOM on cancellation.

Rows stay at the configured compact height (24px token, 22px test fixture). The
Select popup display/button and short flow Radio now fit without growing a row.
Radio column/multi-row layouts are not promised to fit, and the demo declares
minimum column widths rather than enlarging every row. The example uses at least
128px for Date and 156px for Time/DateTime. Time has a leading icon, popup and two
step buttons; 96-112px leaves too little room for its value and is not a usable
minimum. Narrow text/number fields may scroll their draft inside the input. The 10px indicator gutter
stays separate from editors and data/range/export indices.

See [full edit contract](GRID_COMMON_CONTRACT.md), [typed editor API](GRID_EDITOR_TYPES.md)
and [actual verification](VERIFICATION.md). Supported/tested rows and custom or
unsupported controls must not be conflated when extending an application.

## Read presentation and portal font

An editor factory controls editing, not read-mode rendering. The matrix Switch
column uses the existing `Switch.createIndicator()` with the supported Node
renderer and `dui-grid__switch-indicator` class. This is a passive visual, not a
live Switch Control per row. The table owns/removes its DOM on repaint and virtual
row recycling; no extra value listeners, row Control owners or caches are added.
The example passes pointer events through that static visual to its stable cell.

Only this example wraps the Switch factory with `activation:'edit'`: click selects,
double-click/Enter/F2 opens the live Switch, Space/click changes its boolean draft,
Escape discards it, and Enter/Tab validates and commits. No new single-click write
is added. Existing default factory toggle metadata and other consumers remain.
Readonly cells cannot start editing; disabled tables cannot write. The example
uses a 54px minimum Switch column so the stock indicator and cell padding fit.

Managed portal content uses `--dui-font-family`, `--dui-font-size` and
`--dui-line-height` at the overlay root, like ordinary Tæt UI controls. The default
face is bundled Noto Sans from `src/ui/fonts/NotoSans-variable.woff2`; serve the
matching CSS/font assets together. The matrix already uses searchable Select's
Tæt UI custom popup, so its list/search text uses that same face. The browser/OS
may control the painting of an OS-native select popup; this is not a guarantee
about every native popup or identical font rasterization across operating systems.

## Check and Radio read visuals

Check now renders CheckBox's stock native checkbox primitive/CSS in an inert DOM
wrapper; there is no public CheckBox.createIndicator API. Radio renders the stock
RadioGroup native inputs/visual CSS and its same two N/Y options. Groups have
unique names per record and per table, so choosing one record never unchecks a
separate row or the other view. Unknown/null Radio values show no selected option;
value types are retained. These read nodes are disabled/non-tabbable and passive,
not live Controls per row; virtual repaint/owner teardown releases their DOM.

Only the example uses explicit edit activation for Check/Switch. Click selects;
double-click/Enter/F2 opens the actual CheckBox/Switch/RadioGroup editor. Space or
Radio arrows/Home/End changes its draft; Enter/Tab commits and Escape cancels.
No new single-click data write is added. Check/Switch retain their existing strict
true/two-state codec: cancelling a null source retains null; committing the
normalized unchecked draft writes boolean false. Radio remains an application
choice value, not a row-selection radio. The 96px Radio column fits two short N/Y
labels; arbitrary long/many options are not certified inside compact cells.

Both editor tables now opt into multiSelect/rowRangeSelection. Each selected
visible row has its own gutter marker; an active-only row does not acquire one.
See GRID_COLUMN_LAYOUT.md for filtering/collapse and scroll policies.


Boolean editor focus: CheckBox/Switch fallback runs on the actual input click after application input handlers. Switch's cell adapter delegates a noninteractive label click to its native input exactly once, cancelling the label's automatic forwarding. This avoids WebKit's later label-default focus overriding the application's chosen target. Standalone Switch is unchanged. Draft boolean types, value/change counts, validation, commit/cancel, keyboard, disabled and readonly policies are preserved; no timer or manual checked/value write is used.

Private DOM listener migration note: the delegated Switch input click is programmatic (`isTrusted === false`), and the original visual click is prevented to avoid a second native label activation. Ordinary control change payloads retain their existing origin/userAction and boolean value. This concerns direct listeners on the editor's private DOM, not a new public editor API.
