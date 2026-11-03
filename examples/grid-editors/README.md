# Grid / TreeGrid editor matrix

Run `npm run dev`, open `http://127.0.0.1:5173/examples/grid-editors/`.
Both tables borrow one DataStore, with separate DataView/TreeDataView projections.
The recipe returns the owning screen and `destroy()`; no application framework or
private Grid state is needed. Raw record types, normalized live drafts and semantic
write counters are visible on the right.

Double-click a field or use Enter/F2. Enter commits, Escape cancels, Tab/Shift+Tab
commits and moves. For searchable Select, ArrowDown or Alt+ArrowDown opens choices;
popup Enter chooses, the next Enter commits. First Escape closes the popup and
returns focus; a second Escape cancels the cell. Unconsumed Tab from a popup uses
the same grid traversal policy. Date/time picker OK applies its preview to the
control; Enter in the cell then commits to DataStore.

The Switch column shows the stock passive `Switch.createIndicator()` in read mode.
Click selects; double-click/Enter/F2 opens the actual Switch editor. Its draft is
boolean and needs Enter/Tab to commit; Escape cancels. This example explicitly
uses edit activation for Switch; other consumers keep their factory defaults.
Popup text uses the shared bundled Noto Sans font token, including portaled Select.

The fixture includes null/undefined/empty, numeric zero, false, negative decimal,
long text, invalid drafts, a read-only record and virtual rows. Number display uses
two decimals while its editor receives the raw number. Silent background changes
an unrelated field; Reload replaces objects with stable IDs, Remove deletes the
target, Disable closes editors, and Light/dark changes only presentation.

Rows remain 24px. The tested 22px case is a regression fixture, not a change to the
24px default token. Narrow column minima in this recipe preserve picker buttons.
Radio uses exactly two short flow choices. Larger radio groups, multiline, files
and complex pickers belong in an application-owned Dialog/Popup, with explicit
save/cancel via DataStore. They are not silently squeezed into a short row.

See [support/codecs/limits](../../docs/GRID_EDITOR_MATRIX.md),
[editor contracts](../../docs/GRID_EDITOR_TYPES.md), and
[recipe11](../ai-recipes/11-grid-editor-matrix.js).

Check and Radio also have passive read visuals using their stock primitives/CSS.
The real controls mount only while editing. Radio's two N/Y choices belong to
one record, with separate group names in every row/view. Both tables opt into
Ctrl/Cmd/Shift row selection, with a gutter marker on every selected visible row.
No new single-click data commit is added; enter the editor before changing data.
