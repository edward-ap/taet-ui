# Checked application integrations

[Run the compact acceptance screen](../examples/ai-recipes/integration-contracts.html).
Its [factory](../examples/ai-recipes/12-integration-contracts.js) is application code built
from public exports, with an injectable mock service. It makes no network requests and
adds no service, state or host abstraction to Tæt UI. Start a local server as described
in [README](../README.md); open `/examples/ai-recipes/integration-contracts.html`.
For an installed package, import controls from `taet-ui/all` and load `taet-ui/taet-ui.css`.
The repository's browser-native examples use the corresponding relative public entry.

## Dialogs return DTOs through the result envelope

`Dialog.close` accepts either a scalar result or an options object. A plain object is
interpreted as **options**, even if its fields look like a record. Return an object with:

```js
const dto = { id: currentId, name: field.value.get() };
dialog.close({ result: dto, origin: "user", userAction: true });
```

Use `beforeClose` to veto an invalid non-cancel result; the dialog stays open and its
`showModal()` promise remains pending. The recipe validates its owned Form, returns
`null` on Cancel/Escape, and destroys the dialog in `finally` after the promise settles.
Destroying the screen also destroys its separately opened dialog and settles that promise.
A returned DTO does not automatically write to a DataStore. The caller owns that decision.
If native host close must await a save, guard it in host application code: Tæt UI's
synchronous close veto is not an asynchronous native-window shutdown protocol.

For delayed dialog content, call `dialog.reposition()` explicitly after the content size
changes. This recalculates geometry and preserves a position the user has dragged to.
Do not assume Popup automatically watches every application content mutation.
The example also checks owner lifetime and current record before applying delayed content;
typing into the dialog keeps that draft instead of replacing it with the late response.

## Async work has record, generation and draft guards

The recipe keeps stable record IDs, a context generation, a draft revision and a separate
save generation. It checks them **after every awaited service operation**, together with
`owner.destroyed`, before touching controls or writing data. Selecting B while A loads
invalidates A. Destroying the owner invalidates both requests. Starting a save invalidates older reads of that record, including a still-pending initial
load. A late reload cannot replace newly typed text. These guards ignore stale responses; they do not cancel server
work or undo an already completed server write. Use an application's AbortController or
server concurrency policy where needed.

Reload is rejected while a save is pending; it cannot invalidate that save or leave its
busy state stuck. Save validates the Form and sends a DTO, rather than a live Control or
DataStore reference.
A rejected save leaves the input and dirty baseline intact for Retry. A successful response
writes through `grid.data.update(id, patch)`. If more text was entered while saving, the
returned value becomes the clean baseline while the newer text stays visible and dirty.
Discard is explicit. No automatic context change throws away an unsaved draft.

The record service returns `{id: string, name: string}`. The recipe rejects a response
for a different ID or invalid shape. This is a small application policy, not a general
serializer or remote transactional provider.

## Master/detail follows selected IDs, not the active row

Grid active focus and selection are separate. With `rowRangeSelection: false`, arrow
navigation moves the active cell without replacing selected rows. With `true`, it opts
into spreadsheet-independent row range/navigation selection. Configure this deliberately;
there is no changed global default. The recipe's detail Form follows the **first selected
ID**, and refuses a different selection in `selection.events.beforeChange` while dirty.

Filtering can prune selected rows, including with `{silent: true}`. Silent suppresses
semantic selection callbacks; it still synchronizes the models and DOM. The recipe
subscribes to `grid.selection.events.on("invalidate", ...)` for technical context
synchronization, so a silently removed current row cannot remain an invisible save target.
An orphaned dirty draft is retained and made read-only until its record is reselected or
Discard is chosen. This also applies when A+B were selected and filtering leaves only B:
B remains selected, while the Form keeps A's draft and blocks Save. It is never written into the next row. Application search is vetoed
while dirty; an external projection change is still handled safely.

Clear a global search predicate with `setFilter(null)`. Passing `() => true` is still
**filtered mode**. In TreeGrid this exposes matching descendant paths as expanded while
remembered `expandedIds` remain separate; clearing restores that remembered expansion.
Global predicates, column filters and built-in search are distinct scopes. This example
changes only its own global predicate, not all other filters.

## Ownership and composition before mount

Form rows and Toolbar items support deferred composition. General Panel/Layout children
must be added after their owner is mounted:

```js
const form = new Form().row(new TextInput({ name: "name" }));
const toolbar = new Toolbar().add(new Button({ text: "Save" }));
const owner = new Panel(host); // mounted here
owner.add(form, toolbar);     // live instances, one owner per child
```

`LayoutCell.add(child)` and `LayoutCell.attach(child)` replace and destroy previous
content by default. `cell.attach(child, {replace: false})` explicitly appends another live
child. Usually attach one mounted Panel/Form and compose its children. Owner destruction
recursively destroys descendants; subscriptions belong in `owner.disposables`. The
browser regression checks replacement, append, descendant teardown and empty host DOM.
Do not share one live Control between two owners.

## Persist selected UI state, not controls or records

The screen saves a versioned JSON envelope in memory. It includes:

- `Grid.getLayoutState()` and `TreeGrid.getLayoutState()`;
- application query text and one selected ID;
- PropertyGrid label width, category collapse and expanded property paths.

Column widths are `number | string | null`, not always pixel numbers. Manual table resize
currently produces CSS tracks such as `minmax(48px,180fr)`. Preserve the raw width when
serializing and restore through `restoreLayoutState`; parsing it as an integer loses the
layout rule. Listen to **both** `columnResizeEnd` and `layoutChange`: manual pointer resize
ends with the former, and does not promise the latter. The recipe coalesces saves in a
microtask and ties both listeners to the owner. PropertyGrid has its own
`labelWidthChange`, `categoryToggle` and `propertyToggle` events.

This is an explicit application envelope, not universal `serializeState()` on every
control. Validate/version persisted data for production, restore against current columns,
rebuild predicates from query text, and restore only IDs still present in the view.
Do not JSON-serialize records, callbacks, validators, editors, services or live controls.
The recipe uses `PropertyGrid({sortMode: "none"})` to preserve descriptor order. Its
categorized/label sorting default is unchanged.

## Browser controls and native host boundaries

`FilePicker.value.get()` is selection metadata; `FilePicker.getFiles()` gives browser
`File` objects. Choosing a file does not grant arbitrary filesystem paths or native Save.
Native open/save dialogs, binary writes, permissions and application shutdown belong to
the host. This recipe does not invent a HostBridge API or claim native coverage.

Tæt UI Grid row transfer is internal, token-validated record transfer; TreeGrid subtree
move is its separate opt-in contract. Neither is OS file drop ingestion or clipboard
cut/paste. HTML drop events can be intercepted by a WebView host's native file-drop mode.
The optional [Tauri example](../examples/tauri-minimal/README.md) explicitly sets
`dragDropEnabled: false` for its HTML DnD path. Review that host policy if native file drops
are also needed; do not silently combine the two transports or weaken drop validation.

## Checks and limits

`browser-tests/integration-recipes.spec.js` exercises DTO validation/cancel/cleanup,
out-of-order responses, retry/newer drafts, silent pruning, lifetime guards, actual dialog
drag/reposition, keyboard row policy, real resize persistence and ownership. The existing
AI recipe browser check also mounts/destroys factory12. A strict public-import compile
fixture lives in `test/types/integration-recipes-consumer.ts`. Engine results are recorded
with the feedback work package, not asserted by this guide. Browser checks do not certify
native window lifecycle, real network concurrency, IME or macOS.
