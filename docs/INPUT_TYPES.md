# Typed input controls

This page documents the typed npm package; its package imports are intentional.
For portable JavaScript application setup, use the consolidated bundle as described
in [BUILD](BUILD.md). Standalone bundles do not currently ship flattened declarations.

`taet-ui/inputs` declares the stable EditorControl, TextInput, TextArea, NumberInput,
CheckBox, CheckLetter, SelectInput, RadioGroup and RadioLetter, plus experimental
Switch, DateInput, TimeInput, DateTimeInput, DropDownList, MultiSelectDropDown,
FilePicker, TrackBar, ColorPicker (including normalizeHexColor), ProgressBar,
StepProgressBar and OptionList. The latter two are not EditorControl subclasses.
Each binding is identical to its existing stable or experimental constructor;
declaration coverage does not change maturity.
There are no wrappers or extra runtime dependencies.
Form and remaining standalone UI/service constructors remain separate
typing work. Grid applications continue to use `taet-ui/grid` and its factories.

```ts
import { TextInput } from 'taet-ui/inputs';

const name = new TextInput({
  name: 'customerName', label: 'Name', labelPosition: 'top',
  validators: [value => value.trim() ? null : 'Name is required'],
  onChange: event => console.log(event.source.getName(), event.newValue)
});
name.mount('#customer-name');
name.value.set('Ada', { silent: true, origin: 'import' });
name.setCleanValue();
const result = name.validate();
if (!result.ok) console.log(result.errors[0]?.message);
// The containing screen owns the field and destroys it when closing.
name.destroy();
```

## Values, dirty state and events

TextInput uses string values. EditorControl is the generic value base and does not
create a concrete input DOM. Its default generic is unknown and default empty value
is ''. A non-string specialization must supply a compatible emptyValue, for example
`new EditorControl<number>({ emptyValue: 0, value: 10 })`. Subclasses can override
the declared normalization, cloning, input synchronization and label hooks.
Storage hook arguments are unknown because storage may differ from the public
value: NumberInput stores text while exposing number | null. Shared value-only
helpers can use EditorValueApi<T> without depending on a concrete control's events.

- value.set, value.clear, value.reset and reset return boolean: true means applied;
  false includes unchanged values, veto and rejected user writes.
- clear writes the configured emptyValue. reset writes the clean value captured
  initially or assigned by setCleanValue. setCleanValue changes the baseline and
  returns the field; it does not change the current value or emit dirtyChange.
- Equality and dirty tracking in the base use Object.is. Object clean snapshots
  are structured-cloned, and get returns the current reference; this is not a deep
  equality contract. Object-valued subclasses need their own policy.
- Writes default to api/false. Disabled/readonly fields reject user-origin writes,
  while programmatic writes remain possible. silent suppresses value events and
  still updates the DOM, dirty state and clears validation messages.
- beforeChange supports cancel. Its value fields are declared readonly snapshots;
  modifying a runtime payload's newValue does not rewrite the pending value, unlike
  Grid's beforeCellChange. Ordinary writes emit change, afterChange and, when the
  dirty flag changes, dirtyChange. Writes clear validation without running validators.

Constructor callbacks cover those value phases, validate, validationClear and the
six inherited BaseControl callbacks. Other events such as labelChange and
passwordVisibilityChange use events.on. Sources retain the concrete field type;
dirty/password events carry booleans, and TextInput value events carry strings.

Destroying the field in beforeChange returns false before the write. Destruction
in change/afterChange preserves a successful write and stops later phases.
Current EventBus dispatch snapshots still run their captured listeners. This does
not promise transaction isolation for arbitrary nested writes or subclass hooks.
After destruction value reads retain the last value and errors are cleared;
mutation/validation methods reject use of the destroyed field.

## Validation

Validators are synchronous functions returning null/undefined/true for success,
false or a string for an error, or an object with message, severity and optional
code (ok: true means success). Async validators are rejected by declarations.
The context combines optional application data with the authoritative control and
value. TextInput<TContext> and EditorControl<TValue, TContext> type that data;
when a validator needs it, supply it to validate. isValid calls validate without
application context and emits the same validation event.

validate returns source, ok, errors and the validated value. A warning does not
make ok false. Each normalized error has control, path, severity and message;
code may be absent. getErrors/validation.getErrors copy the array, not the errors.
clearValidation/validation.clear return the owner and respect silent. Validation
events carry validation results, not mutation origin/userAction. The required
flag affects state and native input attributes; it does not install a required
validator. Add the actual rule explicitly.

## Text presentation

TextInputOptions includes text/mask/password settings, placeholders, maxLength,
spellcheck and autocomplete, plus labels, state, sizing and inherited events.
The options-only constructor supports composition before mount; the container
overload mounts immediately. General property writes do not imply a render update;
use documented setters or refresh when appropriate.

getDisplayValue reports formatted text, while getRawValue removes mask literals.
With unmaskValue: true, value.get also returns the unmasked value. Password
visibility setters return boolean and do nothing on an ordinary text field.
The existing togglePasswordVisible argument optionally sets an explicit state.

Installed-package checks compile strict TS/JSDoc with NodeNext and Bundler, compare
runtime identities, execute value/validation/subclass cases in Node, and exercise
the compiled recipe, native input, mask/password, silent DOM and teardown in Chromium.

## NumberInput

NumberInputOptions includes min/max, step/increment, integer conversion, precision,
clamping and optional mouse-wheel spinning, alongside inherited text presentation
options. All constructors support options-before-mount or an immediate container
overload; immediate mounting occurs after numeric settings and value normalization.
NumberInput and TextInput are TextField siblings, not subclasses of one another.

```ts
import { NumberInput } from 'taet-ui/inputs';
const quantity = new NumberInput({ value: 2, min: 0, max: 10, step: 0.5,
  validators: [value => value === null ? 'Enter a quantity' : null],
  onChange: event => { if (event.newValue !== null) console.log(event.newValue.toFixed(1)); }
});
quantity.spinUp();
quantity.value.clear(); // null, with empty display text
quantity.destroy();
```

Values, value events and validation use number | null; getRawValue/getDisplayValue
return strings. emptyValue is fixed to null in the typed API (internal empty text
is ''). Finite numbers normalize by integer truncation, optional min/max clamping,
then precision rounding. Precision must be within JavaScript's toFixed range.
Clearing does not become min. reset restores the numeric clean baseline.

During user input, numerically equivalent intermediate text such as `1.` and
`1.0` stays in the native editor so decimals can be typed character by character.
Public values/events remain numeric; equivalent prefixes do not emit changes.
Blur normalizes display text, including with clamp: false. API writes (including
silent writes and unchanged values), reset and refresh synchronize the display.
Integer/precision/range normalization still rewrites input when it changes the
number; vetoed and disabled/readonly user writes still restore the stored value.

spin/spinUp/spinDown return boolean and reject disabled or readonly controls,
including programmatic calls. This differs from value.set, which permits API
hydration. spin uses the sign of direction. Starting from empty uses min for
upward spinning or max for downward spinning when that bound exists; otherwise it
starts from zero and applies the delta. Native arrows/wheel report user/true.

A numeric step takes precedence over increment. With step: 'any', native step
validation is unrestricted and spinning uses increment or defaults to 1; it no
longer converts 'any' to NaN and clears the field. The declarations describe
existing alias options too. Inherited text presentation members do not turn this
control into a general masked/password editor; its mounted input is numeric.

## CheckBox and Switch

Both expose boolean values and typed validators/events. checked initializes the
value only when value is absent; an explicit value takes precedence. clear always
writes false, so the declared emptyValue option accepts only false. The runtime
normalizes only literal true to true; TypeScript callers pass booleans directly.

setText/getText manage the explanatory caption; setText returns the owner and
emits textChange unless silent. Switch additionally exposes onText/offText,
onIcon/offIcon and setStateText(onText, offText, options). stateTextChange carries
old/new { onText, offText } objects and the concrete Switch source. These extra
events use events.on rather than invented constructor callbacks.

Readonly CheckBox rejects user writes and restores its checked state; readonly
Switch disables its native input. Both still allow programmatic value updates.
Use an explicit acceptance validator when false is invalid; required alone does
not enforce agreement. Silent boolean updates synchronize checked/state display
without emitting value events.

Switch.createIndicator(value, { className, ariaLabel }) returns an HTMLSpanElement
for a static visual. It is not a live Control and has no value/lifecycle API; the
caller owns that DOM node. Installed Chromium checks exercise live boolean controls,
their state text and this visual helper separately.

## SelectInput

SelectInput<TChoice, TChoiceId, TValidationContext> types the choice store, selected
record, callbacks and validators. The same constructor supports native select and
custom popup presentations. Standalone Select accepts a borrowed DataStore in
data, or owns an initially empty store exposed as data. Load choices with
data.parse; unlike gridEditors.select, it does not consume items/options arrays.
External data determines identity; valueField/idField and getId configure an owned
store. Destroying Select unsubscribes from borrowed data without destroying it.

```ts
import { SelectInput } from 'taet-ui/inputs';
import { DataStore } from 'taet-ui/core';
const countries = new DataStore<{ code: string; name: string }, string>({ idField: 'code' });
countries.parse([{ code: 'ca', name: 'Canada' }, { code: 'fr', name: 'France' }]);
const country = new SelectInput({ data: countries, value: 'ca',
  textField: item => item.name, searchable: true, clearValueOnMissingData: true,
  onChange: event => console.log(event.oldItem?.name, event.newItem?.name)
});
country.mount('#country');
country.value.set('fr', { silent: true });
country.destroy();
countries.destroy(); // application-owned store
```

Values and validation remain unknown: the initial, empty or programmatically
assigned value need not be an ID present in the choices. Native/popup user selection
preserves the original store ID type. null/undefined writes become emptyValue,
which defaults to ''. getSelectedItem returns the stored record reference or null;
it does not copy the record. Value events include nullable oldItem/newItem snapshots
of those references. beforeChange supports cancel, not changing the pending value.

Silent store mutations still refresh choices and display. With
clearValueOnMissingData: true, invalidation silently clears a missing selected ID;
without it, the unmatched value remains. dataChange carries the underlying store
change as dataEvent; silent mutations do not emit that semantic event.

searchable: true, search: true and filter: true all enable the searchable popup.
imageField/iconField also enable popup presentation. Text, description and media
fields accept property names or synchronous record callbacks. renderItem alone
does not enable a popup; combine it with searchable or a media field. Its context
contains source, typed ID, filtered index and selected/active flags. Return a DOM
Node or scalar display content synchronously. filterPredicate receives a trimmed,
lowercase query; filterChange reports the original string passed to setFilter.

openPopup and closePopup return the control; opening supports provenance but no
silent option. closePopup supports silent, reason and restoreFocus. togglePopup
takes no options. Native presentation has no custom popup to open. The borrowed
InputOverlayService protocol describes getRoot/open/close, not the complete
OverlayManager class. GridEditorOverlayService extends that same protocol, so
existing Grid integrations remain compatible. Select removes its own overlay on
teardown and leaves the injected service alive.

## RadioGroup

RadioGroup<TRawItem, TValidationContext> accepts primitive or record items through
items/options and does not use a DataStore. Field mappings configure record value,
text, description, marker and disabled state. Object values fall back from
valueField to id and then the item index. Text falls back from textField to
descriptionField, label and then the value. Primitive values are retained.

```ts
import { RadioGroup } from 'taet-ui/inputs';
const answer = new RadioGroup<{ id: number; label: string }>({ value: 1,
  items: [{ id: 1, label: 'One' }, { id: 2, label: 'Two' }],
  markerStyle: 'letter', markerField: 'id', layout: 'flow', columns: 2
});
answer.mount('#answer');
answer.events.on('change', event => console.log(event.source.getSelectedItem()?.raw.label));
answer.setSelectedIndex(1);
answer.destroy();
```

RadioItem<TRawItem> is a normalized wrapper with key, unknown value, string text
and marker, boolean disabled and the original raw item. Other record fields are
retained. getItems/getSelectedItem return shallow wrapper copies; raw still refers
to the original input. Value/validation types remain unknown because arbitrary
values and field mappings are supported. Default empty is null; undefined writes
normalize to null. Use distinct primitive choice values for predictable selection.

getSelectedIndex returns -1 when unmatched. setSelectedIndex returns boolean:
disabled items reject selection; an invalid index writes emptyValue. setItems
rebuilds choices and clears a missing current value through the ordinary value
pipeline, which can be vetoed. This is not an atomic transaction: a veto preserves
the old value but does not undo the new item list. If a value listener destroys
the group, setItems stops before emitting itemsChange.

setLayout supports column/flow (null resets to column); setColumns accepts a
positive integer or null. appearanceChange carries name, oldValue and value,
not newValue. itemsChange carries oldValue/newValue normalized arrays. Both use
events.on. Arrow keys wrap through enabled choices; Home/End select boundaries.
Readonly disables native radio inputs and rejects keyboard selection while still
allowing API value writes. Silent updates synchronize selection and appearance.

Installed TS/JSDoc checks cover custom schemas, normalized raw items, record
events, invalid API shapes, reconciliation and ownership. Installed Chromium
executes both native and popup Select recipes, live shared data/service reuse and
Radio keyboard/readonly behavior. Separate regressions cover search aliases and
destruction during native/popup value phases and keyboard opening. Arbitrary
renderer/service callback reentrancy is outside these teardown guarantees.

## DateInput, TimeInput and DateTimeInput

All three remain experimental. Their constructors, inherited events, validation
and value APIs are declared by taet-ui/inputs. Both options-only composition and
immediate mounting through a selector/HTMLElement are supported. Picker and time
presentation options are shared with the Grid factory declarations, including
the existing '0-23' hour mode. Injected InputOverlayService remains borrowed.

```ts
import { DateInput, TimeInput, DateTimeInput } from 'taet-ui/inputs';
const date = new DateInput({ value: new Date(2026, 8, 6),
  validators: [value => value ? null : 'Choose a date'],
  onChange: event => console.log(event.newValue) // string
});
const time = new TimeInput({ value: '14:30', hour12: true, stepMinutes: 15 });
const deadline = new DateTimeInput({ value: '2026-09-06T14:30' });
date.mount('#date'); time.mount('#time'); deadline.mount('#deadline');
date.value.set(new Date(2026, 8, 7), { silent: true });
date.setCleanValue(date.value.get()); // normalized string baseline
date.destroy(); time.destroy(); deadline.destroy();
```

DateTimeValueApi reads strings and accepts string | Date | null | undefined writes.
The canonical model formats are YYYY-MM-DD, HH:mm and YYYY-MM-DDTHH:mm. A valid
Date converts using local year/month/day/hours/minutes, not UTC serialization;
these strings contain no timezone. null/undefined writes and clear produce ''.
The typed emptyValue option permits only ''. setCleanValue accepts an already
normalized string (or no argument), because the inherited baseline setter does
not normalize arbitrary Date input. reset restores that clean string.

Normalization is deliberately not full validation. Date takes a leading date
prefix, DateTime takes a minute-resolution prefix and replaces the first space
with T. Incomplete/unrecognized strings can remain in the model. Time recognizes
AM/PM and hour/minute strings and clamps numeric components; it is not a strict
time parser. Invalid Date objects have no valid-date guarantee. Validators and
all value event payloads receive strings, and synchronous validation is explicit.
min/max/step populate native attributes on text inputs; they do not enforce calendar
ranges, prevent out-of-range dates or install business validators.

TimeInput hourMode supports '0-23', '1-24' and '12'; '24' aliases '1-24'. Constructor
aliases mode, hour12/hour24 and format also exist; avoid conflicting settings.
12-hour settings take precedence. Use canonical 00..23 model strings regardless of
mode. Native text '24:mm' in 1-24 mode becomes '00:mm'; model writes do not use that
display parser. stepMinutes/minuteStep defaults to 15 and drives TimeInput's step
buttons; the picker minute list uses a bounded 1..30 interval. Use positive finite
integer intervals. DateTimeInput uses these settings for its time picker; its text
display remains YYYY-MM-DD HH:mm even in 12-hour picker mode.

The calendar button or Alt+ArrowDown opens the picker. DateInput day selection
commits immediately; Clear commits an empty value. TimeInput/DateTimeInput wheels
preview text without changing value/dirty state or emitting value events. OK runs
the ordinary cancellable value pipeline, then closes; veto restores the committed
value. Cancel, Escape and outside dismissal discard the draft. Cancel restores the
latest committed value, including a programmatic write made while open, rather
than the value captured at opening. Switching hour mode is a presentation change
that persists across Cancel. TimeInput step buttons commit immediately.

No standalone openPopup, spinUp, getDisplayValue or picker open/change constructor
callbacks are declared: these controls have no such public methods/events. Use the
inherited value, validation and lifecycle APIs. Readonly/disabled blocks user
value writes and opening a picker; API hydration remains possible. Destruction
removes the owned picker and releases its DOM references, leaving a borrowed
overlay manager alive. Closing the screen in a value listener stops subsequent
picker selection, confirmation and step work; arbitrary service callback reentry
remains a separate concern.

Installed strict TS/JSDoc checks exercise Date writes/string reads, nullable clears,
local normalization, validation contexts, veto, clean/reset and rejected API shapes.
Installed Chromium executes the compiled schedule with calendar/time selection,
staging/OK/veto/cancel, native text, steppers, validation hints and shared overlays.
Browser regressions cover late programmatic values during Cancel and destruction
from each value phase through Clear/day selection, OK and time stepping.

## TextArea

TextArea<TValidationContext> is the multiline TextField sibling of TextInput.
It inherits string values, validation and text presentation members, and adds
rows/minRows/maxRows, resizing, wrapping, scrollbar, keyboard and auto-height
options. Shared mask/password members do not make its native textarea a password
input. rows defaults to 4; minRows defaults to rows. maxRows (alias linesCount)
caps automatic height rather than the number of lines allowed in the value.
Use positive integer row counts. resize defaults to vertical; resizable: true
selects both axes unless resize is explicit. wordWrap/wrap false disables wrapping.
scrollBars/scrollbars configure axes; the instance stores normalized overflowX/Y.

```ts
import { TextArea } from 'taet-ui/inputs';
const notes = new TextArea({ rows: 3, maxRows: 8, autoHeight: true, acceptsTab: true });
notes.mount('#notes');
notes.lines.set(['First line', 'Second line'], { silent: true });
notes.setSelection(0, 5);
notes.insertText('Updated');
console.log(notes.getSelection(), notes.lines.get());
notes.destroy();
```

lines.get/set/append alias getLines/setLines/appendLine. Reads split CRLF/CR/LF;
empty text returns []. Writes join lines with LF, converting null/undefined to
empty text and other entries to strings. They return the value-write boolean and
respect silent/veto/dirty tracking. The lines API object is frozen; returned arrays
are independent. Native textarea newline normalization is separate from raw model
text supplied by an API write.

getSelection returns start/end/text; unmounted fields return zeros and empty text.
setSelection and selectAll return false before mount, true when applied to DOM.
Offsets clamp to the input length. insertText replaces the DOM selection when
mounted or appends to the model before mount, returning the value-write boolean.
It updates the caret after an accepted write only while the field remains alive.
calcAutoHeight returns a pixel height or null without a mounted input.

acceptsReturn: false prevents Enter and emits enterKey with the current string;
acceptsTab: true inserts a tab through the user value pipeline. tabInsert now emits
only after an applied insertion on a live control, including veto/readonly/teardown
handling. These events carry value (not newValue) and use events.on; they are not
constructor callbacks. API insertText remains possible in readonly mode.

## Letter controls and DropDownList

CheckLetter is the stable boolean CheckBox variant with a square letter/number
marker. letter (alias marker) normalizes to a string; setLetter returns the control
and emits letterChange with string oldValue/newValue unless silent. getLetter reads
the marker. The accessible name combines marker and caption; changing either
updates that name. Value, checked precedence, validation and empty false are the
CheckBox contracts. The marker is not the model value.

RadioLetter is the stable RadioGroup variant with circular markers. It fixes
markerStyle to letter and defaults markerField to letter; the item schema, normalized
raw records, keyboard navigation and unknown selected value remain RadioGroup's
contract. The typed constructor rejects markerStyle: 'default', which runtime
would overwrite. These generic primitives do not include Questionary scoring.

DropDownList is the experimental SelectInput compatibility constructor that always
uses a custom popup. It has the same typed record/store/options contract as Select,
including renderItem without needing a searchable/media option to enable the popup.
Choices still load through data/data.parse rather than items/options arrays.

## MultiSelectDropDown

The experimental multiple-choice popup types its choice record and ID schema while
values remain unknown[]: unmatched values are valid and need not be current store
IDs. The value setter accepts an array, with null/undefined/'' clearing it. Other
scalar values are rejected. emptyValue is fixed to []; the declared option accepts
only an empty tuple. Value normalization removes duplicates with Object.is while
preserving order. value.get returns a shallow array copy. Prefer primitive store IDs.

```ts
import { MultiSelectDropDown } from 'taet-ui/inputs';
const regions = new MultiSelectDropDown<{ id: string; text: string }>({
  value: ['north'], searchable: true, clearValueOnMissingData: true,
  onChange: event => console.log(event.newItems.map(item => item.text))
});
regions.data.parse([{ id: 'north', text: 'North' }, { id: 'south', text: 'South' }]);
regions.mount('#regions');
regions.addValue('south');
regions.removeValue('north');
regions.destroy();
```

addValue/removeValue return boolean and reject calls after destruction, including
would-be no-ops. getSelectedItems returns a fresh array of existing record references;
getSelectedItem returns the first resolved record or null. beforeChange/change/
afterChange carry oldItems/newItems arrays rather than Select's oldItem/newItem.
Value payloads are snapshots; beforeChange supports veto, not rewriting the draft.
Validation receives the value array. Dirty comparison is ordered element identity;
setCleanValue() captures the current normalized baseline and reset restores it.

Selecting toggles an ID; closeOnSelect defaults to false. Tokens and Backspace/Delete
remove values through user writes, preserving the distinction between numeric and
string IDs. The popup is always custom and supports Select's filtering, rendering,
borrowed data/overlay service and silent updates. clearValueOnMissingData silently
removes missing IDs on invalidation; otherwise unmatched values remain. Destroying
the field during a value phase stops later phases and popup follow-up work.

Installed TS/JSDoc and Chromium recipes cover these five constructors, concrete
callback sources, line/selection APIs, markers and accessible captions, always-popup
and multiple-choice selection, silent data synchronization and external ownership.
Regressions cover teardown, rejected Tab writes and mixed string/numeric token IDs.

## FilePicker

The experimental FilePicker has two distinct outputs: `.value` contains serializable
metadata; `getFiles()` returns browser-selected File handles. Neither uploading nor
reading file contents happens automatically. The multiple option selects the typed
value: FileMetadata | null by default, FileMetadata[] with multiple: true. Events
and validators use the same shape. Explicit FilePicker<true> requires multiple: true
at construction; a runtime boolean produces the union of both value shapes.

```ts
import { FilePicker } from 'taet-ui/inputs';
const attachments = new FilePicker({
  multiple: true, accept: '.pdf,.djvu', displayMode: 'count',
  onChange: event => {
    console.log(event.newValue.map(file => file.name));
    console.log(event.source.getFiles()); // File[] after an accepted native selection
  }
});
attachments.mount('#attachments');
attachments.value.set([{ name: 'previous.djvu', size: 2048 }], { silent: true });
console.log(attachments.getFiles()); // []: metadata writes do not select local files
attachments.destroy();
```

Metadata has name, size, type, lastModified and relativePath. Missing size/time become
null; missing text fields become ''. Writes accept partial metadata, file names or
File objects, wrapped in an array for multiple mode. path supplies fallback name and
relativePath; webkitRelativePath is another relative-path alias. Null/undefined clear
to null or []; emptyValue is configurable and normalized. A File supplied by API is
converted to metadata and does not populate getFiles(). Metadata reads expose the
current objects/array; getFiles() copies the array of original File references.

Accepted native writes commit handles before change listeners run. A veto preserves
the previous metadata and handles; the rejected native input is cleared so another
selection can be made. API metadata writes, clearFiles, value.clear and reset discard
handles and clear the native input. reset restores only the clean metadata snapshot.
Dirty comparison uses ordered metadata fields, not object identity or file contents;
equivalent metadata can emit a value change while remaining clean. Use normalized
metadata for explicit setCleanValue baselines.

openPicker returns false when unmounted, disabled or readonly. beforeOpen is a
notification through events.on, without cancel or a constructor callback; if its
listener destroys/disables the control, opening stops. Browser picker activation
still follows browser user-gesture rules. clearFiles returns the value-write boolean
and respects veto/silent/userAction. accept and directory configure native selection;
they are not application validation. Choose multiple: true for directory collections.

## TrackBar

The experimental TrackBar is a numeric range editor with horizontal/vertical layout,
ticks, optional labels and an optional formatted value. Defaults are min: 0, max: 100,
step: 1; values clamp and snap relative to min. Fractional bounds and scientific-notation
steps retain their decimal precision within JavaScript number limits. step: 0 disables
snapping. The valueFormatter callback receives only the number and returns text/number.

```ts
import { TrackBar } from 'taet-ui/inputs';
const zoom = new TrackBar({
  min: 0.25, max: 1.25, step: 0.5, value: 0.25,
  orientation: 'vertical', scale: 'ticks', showValue: true,
  valueFormatter: value => `${Math.round(value * 100)}%`
});
zoom.mount('#zoom');
zoom.moveUp(); // 0.75
zoom.setRange(0, 2);
zoom.value.clear(); // current min: 0
zoom.destroy();
```

setRange/setStep return whether the normalized value changed, not whether the range
or step changed. They update configuration before the cancellable value write; a veto
does not roll configuration back. emptyValue is fixed to the current min. reset applies
the clean baseline through the current bounds/step. Setting step does not recompute
smallChange/largeChange. Directional movement and Begin/End respect invert; wheel and
PageUp/PageDown retain their numeric direction. Readonly disables native interaction
while programmatic value/movement calls remain available unless userAction is true.
Orientation is a constructor option, with no setOrientation method. Scale aliases
labels/minmax select range, true selects ticks; rendered ticks are capped at 101.

## ColorPicker

The experimental RGB editor exposes canonical '' or lowercase #rrggbb values to reads,
events and validators. Writes and normalizeHexColor accept three/six-digit hex,
rgb(r, g, b) with integer channels 0..255, or null/undefined/'' for empty. Other strings
throw TypeError. setRgb rounds/clamps finite channels to 0..255; getRgb returns the
three channels (black for empty). HSV is temporary popup state, not a model value.

```ts
import { ColorPicker, normalizeHexColor } from 'taet-ui/inputs';
const accent = new ColorPicker({
  label: 'Accent', value: normalizeHexColor('#AbC'), allowEmpty: false,
  validators: [value => value !== '' || 'Choose a color'],
  onClose: event => console.log(event.reason)
});
accent.mount('#accent');
accent.setRgb(255, 128, 0); // #ff8000
accent.destroy();
```

allowEmpty controls the popup Clear action; it does not forbid empty model writes.
Use a validator when empty values are invalid. The popup is created lazily and owned
by the picker; there is no injectable overlayManager option. openPopup needs a mounted
control. open/close support constructor callbacks and events.on; close adds reason.
Opening is not silent. closePopup accepts silent; togglePopup's silent option only
applies when closing. These methods return booleans. Popup edits commit immediately;
Escape closes without undoing them. Disabling/readonly silently closes the popup and
still permits API value writes.

The screen picker is disabled when EyeDropper is unavailable. A pending result is
ignored after control destruction; this is not a general cancellation/latest-request
contract when closing or reopening a live picker. Queued Popup focus also stops after
closure, replacement opening or destruction, including teardown in onOpen.

Installed strict TS/JSDoc checks cover all three constructors, concrete event sources,
single/multiple file shapes, normalized values, validation and negative API cases.
Installed Chromium exercises actual file selection, metadata/handle consistency,
clear/reset, fractional vertical movement, color hex/RGB edits and readonly behavior.
Lifecycle regressions cover file veto/teardown and late EyeDropper completion.

## ProgressBar

ProgressBar is an experimental numeric indicator with EditorControl values, events,
validation and dirty/reset state. It has no user editing interaction. Values clamp to
min/max (aliases minimum/maximum); defaults are 0/100. clear targets the current min,
and reset normalizes the clean baseline against the current range. setRange returns
the value-change boolean; a veto does not undo configuration changes.

```ts
import { ProgressBar } from 'taet-ui/inputs';
const progress = new ProgressBar({
  min: 0, max: 200, value: 50,
  valueFormatter: (value, { percent, max }) => `${value}/${max} (${percent.toFixed(1)}%)`
});
progress.mount('#progress');
progress.value.set(100, { silent: true });
progress.destroy();
```

Horizontal/vertical orientation is configured at construction. showText hides visual
text, while the progressbar retains accessible text. textMode is percent (rounded),
value or custom; percentView is its alias. A valueFormatter overrides these modes and
receives value and { source, percent, min, max }. A zero-width range has 0 percent.
setText updates custom text, visible text and aria-valuetext, including silent writes;
it returns the control. textChange uses string oldValue/newValue through events.on,
not a constructor callback. There is no indeterminate/async task API or timer.

## StepProgressBar

StepProgressBar is an experimental BaseControl workflow indicator. It has no `.value`,
validation or editor reset. Use items and selectedItemIndex (alias selectedIndex): -1
means no current stage; integer indices clamp to the item range. Nonintegers normalize
to -1. setSelectedItemIndex returns whether the index changed. setItems clamps the
index and emits itemsChange, without synthesizing selectedItemChanged.

```ts
import { StepProgressBar } from 'taet-ui/inputs';
const flow = new StepProgressBar({
  interactive: true, layoutMode: 'fullSize',
  items: ['Source', { caption: 'Mapping', contentBlock2: 'Edit rules' }, 'Export'],
  onItemClick: event => { if (event.index === 2) event.cancel = true; },
  onSelectedItemChanged: event => console.log(event.newValue, event.selectedItems)
});
flow.mount('#flow');
flow.selectNext();
flow.setSelectedItemIndex(1, { silent: true });
flow.destroy();
```

Primitive items become string captions; objects support caption/text/label, description,
two content blocks, icon, tooltip, enabled/disabled and allowUserInteraction. Blocks
accept strings or caption/description objects, with text/details aliases. Normalized
items retain extra application fields as unknown. getItems copies item and block
objects; getSelectedItems copies items shallowly. Selected means visually active:
the prefix through the selected index plus explicit state: active, excluding disabled
and error items. It is not just the current stage. Explicit inactive does not override
the selected prefix. setItemProgress clamps/stores 0..100 and emits itemProgressChange;
in this version fractional progress does not change connectors. Block image metadata
is retained but not rendered.

Use numeric indices for selectItem/setItemProgress/scrollToItem. Object arguments must
be live references from `.items`; input objects and getItems copies do not resolve by
ID. An unmatched selectItem clears selection; unmatched progress/scroll returns false.
setItemProgress returns true for a valid item even when unchanged, without an event.

selectNext/Previous skip disabled or noninteractive items; Previous can clear selection.
selectAll targets the last item and fails if that item is not selectable. Programmatic
selection ignores the control's global interactive/disabled flags but respects item
enabled/allowUserInteraction. User interaction defaults off; when enabled, arrows and
Home/End move focus, Enter/Space activate. inverse/reverse changes visual order while
keyboard traversal remains in logical item order. Layout supports compact/fixed/fullSize,
horizontal/vertical orientation and start/center/end alignment.

itemClick is cancellable through cancel or handled and precedes selection. Destroying,
disabling or replacing the clicked stage in that callback stops the default transition.
selectedItemChanged is a notification with oldValue/newValue indices, a live selectedItem
and a selectedItems array. Only itemClick and selectedItemChanged have constructor
callbacks; itemsChange/itemProgressChange use events.on. Movement rejects calls after
destruction, including no-ops; deferred geometry work is inert after teardown.

## OptionList

The experimental OptionList extends List and adds an ID value facade. It is not an
EditorControl: `.value` has get/set/clear, without reset, validation, dirty or readonly
methods. It exposes typed records/IDs, render callbacks, DataStore and SelectionModel.
List declarations are included as its parent dependency; List is not a value export
from taet-ui/inputs. Standalone List is typed through taet-ui/experimental and taet-ui/all.

```ts
import { OptionList } from 'taet-ui/inputs';
const outputs = new OptionList<{ id: string; text: string }>({
  multiple: true, value: ['report'], label: 'Export contents'
});
outputs.mount('#outputs');
outputs.events.on('change', event => console.log(event.newValue, event.items));
outputs.data.parse([{ id: 'report', text: 'Report' }, { id: 'logs', text: 'Logs' }], { silent: true });
outputs.value.clear({ silent: true });
outputs.destroy();
```

multiple/multiSelect true selects array mode; otherwise reads return an ID or null.
The declaration retains ID | ID[] | null because mode is runtime state. Multiple writes
require arrays at runtime; single mode accepts an ID or the last entry of an array.
Null/undefined clear. Array reads are fresh; selection.get returns record references in
an independent array. Unknown IDs remain pending by default, and reads include only
resolved records. Later data updates retry the pending IDs silently. Pending arrays
are copied on write. keepPending: false discards unresolved IDs; a return value of false
only means selection did not change and does not imply no pending state was stored.
Pending requests are not cancelled by a later native click; explicitly replace/clear
the value to discard an old request. Selection veto applies to current resolved records,
not to saving pending IDs.

Load data through data.parse, not items/options arrays. Default models are owned;
injected DataStore and SelectionModel are borrowed, and their multiple modes should
match. Built-in DataStore invalidation synchronizes silent parse/update/remove and
pending selection. Structural legacy stores using only change retain that path; they
are outside this typed concrete-store contract. Silent direct selection.set has no
invalidation signal: call list.refresh(), or use value.set/clear for immediate DOM sync.

change/afterChange carry oldValue/newValue IDs and oldItems/items records. Subscribe
through events.on; there are no onChange/onItemClick constructor callbacks. Veto is on
selection.events.beforeChange, not OptionList.events. List also emits selectionChange,
dataChange, activeChange and native itemClick/itemDblClick notifications. Data reconciliation
is silent; it does not synthesize value events. Default rendering adds a mark and optional
icon; a custom renderItem replaces that entire row content and may return a Node or text.
Clicks toggle multiple selection without Ctrl; arrows move the active row and Space/Enter
select it. Marks have no separate keyboard stop. Value-listener teardown stops later
notifications and native click follow-up work. Shared SelectionModel also stops later
phases after destruction; this does not change same-event listener snapshot semantics.

Installed TS/JSDoc and Chromium fixtures cover these contracts, including accessible
progress, stage keyboard navigation, typed IDs, silent pending data, native toggles and
borrowed model ownership. Unit/browser regressions exercise teardown and silent updates.

## CircularSlider

Experimental export from `taet-ui/inputs`, `taet-ui/experimental` and `taet-ui/all`.
`new CircularSlider(host, {label:'Surface', min:0, max:100, step:1, value:50})`
uses TrackBar's numeric `.value`, change events, silent writes, range/step methods,
validation, disabled/read-only state and lifecycle. It is an EditorControl for Form composition.
The fixed circular presentation starts at six o'clock and fills clockwise, without a thumb.
Center text is range-relative percent; `valueFormatter` overrides it. Use `label` for the accessible name.
Arrow keys change by smallChange, Page Up/Down by largeChange, Home/End reach min/max.
Pointer dragging clamps across the shared min/max seam instead of wrapping. A new click selects
an absolute angle; at the bottom endpoint the current half of the range disambiguates 0/100.
No timer, continuous animation or rendering loop runs while idle. Include taet-ui.css.
Linear presentation settings inherited from TrackBar (orientation, scale, thumb/value position)
are not part of CircularSlider's supported options; its ring and center stay fixed.
Live example: Input Controls → TrackBar → Circular slider.

### State recovery and accessible captions

NumberInput defaults to inputType:number throughout disable/enable, readonly and
refresh transitions. Applications no longer need to repeat inputType:number to
preserve its native spinbutton semantics.

Named TextField-based inputs explicitly reference their caption with
aria-labelledby. Validation messages remain aria-describedby descriptions and do
not join the accessible name. Relabeling updates the caption; clearing validation
removes its error description. This also applies to TextArea and NumberInput.

Caption/error DOM IDs are instance-specific; field names may repeat across separate
forms without cross-linking their accessibility descriptions. These IDs are internal,
so integrations should follow aria-labelledby/aria-describedby rather than derive them.
