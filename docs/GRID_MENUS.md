# Table menus and indicator gutter

Grid and TreeGrid share a compact left service gutter. Its default width is 10 CSS
pixels (`--dui-grid-indicator-width`). Explicit CSS widths such as 18px or 20px
remain supported. The button stays inside the strip with zero padding; its visible
keyboard focus and ellipsis fit at the 10px default without covering a data cell.
The header ellipsis button has the accessible name and tooltip
`Настройки таблицы`. It opens the table-wide menu with Enter, Space or ArrowDown.
Escape closes the menu and restores the opener. Header rebuilds keep that button
connected, including when every data column is hidden.

The body gutter contains the existing selected-row accent. Active/focused row and
selected row remain different states; an active-only row does not acquire a selected
marker. Editing the first data cell cannot cover the accent: the editor and
marker have separate layout cells. No checkbox, new row-selection gesture or row numbering is introduced.
The strip is presentation, never a data column: no column ID, column ARIA index,
resize/reorder/sort operation, range endpoint or export/clipboard field. It stays
pinned on horizontal scrolling and shares row virtualization with the data. Tree
indentation, icons and expand toggles remain inside the first data column.

## Menu scopes

| Column menu | Table menu |
| --- | --- |
| Sort this column; clear its rule | Clear all sorting, including an external comparator |
| Filter this column; clear its filter | Clear all user conditions/search through existing APIs |
| Best fit this column | Best fit all visible columns |
| Pin/unpin/hide this column | Visible columns chooser; Reset column layout |
| Existing summary/scope for this column (Grid) | Existing Grid search/status display; Tree expand/collapse all |

Local sort commands retain the existing primary-sort behavior; local Clear sorting
removes only that column rule and retains other Grid sort rules. An arbitrary view
comparator has no column identity, so it can be cleared only from the table menu.
The Columns submenu still permits repeated toggles and protects the last visible
column. Programmatic all-hidden layouts remain recoverable through the table menu.

`Reset column layout` restores initial width/order/hidden/frozen values for known
columns via GridColumnModel. It does not resurrect removed schema columns or reset
data, filters/search, sorting, page, grouping or Tree expansion. Those have their
own commands. Structural custom views do not need new paging/layout methods.

No existing `Align All` command was found. `Best fit all columns` is the existing
`autoSizeColumns` operation: it measures rendered header/body/footer content within
width constraints. It does not equalize alignment or scan every unmounted row.
No alignment API was added to fill a menu.

## Shared options and compatibility

```js
new Grid({ columns, indicatorGutter: false }); // old cell accent and geometry
new TreeGrid({ columns, columnMenu: false, gridMenu: true }); // global menu only
new Grid({ columns, gridMenu: false }); // gutter without global menu
```

`indicatorGutter` defaults to true. `gridMenu` defaults to `columnMenu !== false`;
`indicatorGutter:false` disables it even if gridMenu:true was supplied. Existing
columnMenu:false therefore still defaults to no menus. These constructor options
are shared through GridCoreOptions; option assignments after mounting are not reactive.
Imports, constructors and data/layout state formats remain compatible. The visible
placement of Columns/Best fit all/global clears has intentionally moved from column
menus to the gutter menu. Embedded TreeExplorer opts out to retain its resource-list
layout. General tables use the new default strip.

The existing Grid layout is a physical LTR left/right contract. This change does
not introduce or certify logical RTL column/pinning/tree placement. Unicode text
values are unchanged; full native/RTL host acceptance remains separate.

## Workbench

Run `npm run dev` and open `/examples/grid-workbench/`. Both tables show the new
menus with no additional toolbar panels. The project scope is application context:
the screen reapplies that invariant through its public view setter after a global
clear, while clearing user column conditions/search. Find task reflects the existing
GridFilterModel, so a menu clear cannot leave stale toolbar text or a second query.

See [common edit/data contract](GRID_COMMON_CONTRACT.md) and
[recipe 09](../examples/ai-recipes/09-grid-workbench.js). Invalid drafts, callback
teardown, all-hidden recovery and keyboard/menu focus are covered by the dedicated
browser regressions. Screenshots are checked in light and dark themes outside Git.
