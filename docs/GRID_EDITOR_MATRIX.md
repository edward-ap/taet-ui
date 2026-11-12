# Existing table editor matrix

The short [editing contract](EDITOR_EDITING_CONTRACT.md) defines shared vocabulary
and owner boundaries without making all controls deferred or transactional.

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

## Opt-in deferred numeric values

Number factories accept `updateMode: 'commit'`; omission remains live. Native text
then stays pending until the numeric field commits, with integer/range/precision
normalization deferred to that commit. Use `clamp:false` plus validators when an
out-of-range completed number should be rejected instead of clamped. The existing
matrix demo remains live and is not a commit-mode demonstration.

Grid/TreeGrid prepare the field before validating and reading it for a row commit.
Enter/Tab follow table policy; Escape discards the session. Blur commits only the
field, never the row. Validation or veto can reject the owner write even after the
local field committed. Disabled/readonly pending input is retained and blocks
preparation rather than saving stale data. See [draft preparation](GRID_EDITOR_TYPES.md#explicit-draft-preparation)
and [numeric API](INPUT_TYPES.md#numberinput). This adds no multiline, locale or
real-IME guarantee to the editor matrix.

## Validation-currentness boundary

Built-in factories retain automatic value/candidate tracking. Independent custom
CellEditor/GridValueControl state needs getValidationRevision(); its optional type
annotation does not waive the runtime requirement. After preparation, a value or
draft change during validation/final read rejects commit without an owner row write,
rollback or retry. The surviving session keeps callback changes for another explicit
commit. Grid's temporary clipboard/toggle editor is instead released after refusal.

Missing/invalid tracking reports editReject reason validation-revision; an ordinary
stale attempt uses validation-stale with empty diagnostic errors. Silent attempts
still check but suppress editReject. The trusted beforeCellChange.newValue override
remains outside revalidation. See the [exact protocol and checked custom examples](GRID_EDITOR_TYPES.md#validation-currentness-and-custom-revisions).

PropertyGrid shares the revision protocol but checks after its veto hook too;
inline stale state is retained, while a still-current ordinary veto restores the
old display. Its distinct owner/event contract is documented [separately](GRID_EDITOR_TYPES.md#propertygrid-staged-and-inline-ownership).

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
128px for Date and 156px for Time/DateTime. Temporal inputs put the calendar/clock glyph on the existing trailing popup
button, with no decorative leading square (24px saved at the default token).
Time retains its two step buttons, so narrow widths still need a readable-value
check; the example minimum widths remain unchanged. Narrow text/number fields may scroll their draft inside the input. The 10px indicator gutter
stays separate from editors and data/range/export indices.

See [full edit contract](GRID_COMMON_CONTRACT.md), [typed editor API](GRID_EDITOR_TYPES.md)
and [actual verification](VERIFICATION.md). Supported/tested rows and custom or
unsupported controls must not be conflated when extending an application.

## Masked and temporal edit sessions

text({ mask: '00-00' }) uses standalone TextInput's live formatting, caret handling
and bounded local keyboard history. Field values change while typing; DataStore
changes only on owner commit. Enter/Tab or explicit owner commit writes the
accepted value, Escape cancels the session, and blur alone does not write the row.
Add an explicit completeness validator to reject partial masks; required() only
checks nonempty values. Rejected input accepting no tokens leaves empty fields empty.
The no-token-empty correction also applies to programmatic mask normalization;
token grammar, raw-literal handling and whole-value capacity rules are unchanged.

Default compact-mode mixed-token/capacity guards reject edits that would lose an untouched suffix;
they do not add sparse slots. For AA-0000, replacing selected AB in AB-1234 with
sequential XY can reject intermediate X. Use one-letter replacements or a complete
compatible replacement. API writes/reset restart mask history, including silent
or equal-value writes; veto preserves it.

Opt in with text({ mask: 'AA-0000', maskMode: 'slots' }) for fixed positions:
AB-1234 -> __-1234 -> X_-1234 -> XY-1234. Holes survive model/raw serialization
and edit-session reopening; unmaskValue uses __1234. Do not remove markers when
saving. Deletion clears slots, typing overwrites, selected replacement stays
inside selected tokens, and paste overflow rejects. Fully empty model/raw/display
reads stay ''; a focused empty native input can show the navigable scaffold.
The required DOM guard uses customError for that scaffold, not valueMissing;
required() and an explicit marker-based completeness validator remain separate.
See INPUT_TYPES.md for marker restrictions, API shape validation and history.
Slots are construction-only on text, not number, TextArea or JSON factories, and
do not add commitInput. Owner store commit/cancel semantics remain unchanged.

time preserves equivalent/partial native text and caret with a live normalized
model. Partial/unparsed stored time is not completed by passive blur/API/refresh
or 24-hour presentation. Its picker shows no selected hour/minute/AM/PM; 24
indicates only mode. OK without a choice retains the partial value, Cancel
restores it, and explicit time choices use existing defaults. Add completeness
validation before owner commit when partial values are unacceptable.
date/dateTime reject native edits that would truncate an untouched suffix,
retaining value/selection; API prefix normalization is unchanged. Picker staging
remains its existing OK/Cancel interaction, not a shared typed commit mode.
Only number supports updateMode: 'commit' and commitInput; optional owner
preparation does not add those methods to other controls. See
[input contracts](INPUT_TYPES.md) and [test boundaries](INPUT_TESTING.md).

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
