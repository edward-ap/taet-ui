# 30. Grid Filter And Status API

## Implementation Status

Implemented in Grid v0.3.2:

- `GridFilterModel` value filters;
- composition with the existing global Grid filter;
- header filter button and active marker;
- popup search, Select All, value checklist, blanks, Apply, Cancel, and Clear;
- cancellable `beforeFilterChange` and applied `filterChange` events;
- configurable distinct-value limit.

Implemented in Grid v0.3.3:

- segmented Values / Condition popup modes;
- text operators: contains, equals, starts with, ends with, empty, not empty;
- number operators: equals, not equals, greater/less comparisons, inclusive between;
- date operators: on, before, after, inclusive between, empty, not empty;
- strict programmatic boolean filters;
- typed text, number, and date condition editors;
- validation for missing, invalid, or non-finite condition values.

Implemented in Grid v0.3.4:

- independent status band below the optional aggregate footer;
- active row position in the current visible projection;
- filtered count while filters are active;
- total raw DataStore count;
- runtime `setStatusBar()` configuration;
- programmatic `getStatusBarState()`;
- compact light/dark theme styling and accessible status label.

Implemented in Grid v0.3.5:

- `DataStore -> filter -> sort -> page -> virtual renderer` projection order;
- first, previous, direct page, next, and last navigation controls;
- configurable page-size selector;
- page state with filtered count and current from/to range;
- programmatic page navigation methods and `pageChange` event;
- filter and sort reset to page 1;
- runtime pagination enable/disable through `setStatusBar()`;
- compact themed controls with disabled navigation states and accessible labels.

Implemented in Grid v0.3.7:

- Values and Condition exposed as an accessible tablist with distinct tab panels;
- string and numeric Values/select columns infer a usable Condition type from their values;
- labeled Condition fields for operator, value, and optional second value;
- per-column `none`, `count`, and numeric `total` summary modes;
- staged Summary selection inside the column filter popup;
- automatic footer removal when no column has an active summary;
- cancellable `beforeSummaryChange` and applied `summaryChange` events;
- selected-row background without a row outline;
- compact blue accent at the left edge of the selected row.

## Scope

This document defines the next Grid batch after v0.3.1. It covers Excel-style column filtering and a separate bottom status/pagination bar.

Column summary footers and the Grid status bar are different features:

- column footer cells show aggregates aligned with columns;
- status bar shows navigation and projection state for the complete Grid.

They must not share one rendering contract.

## Filter Model

The implemented GridFilterModel now has declarations through `taet-ui/core`.
See [typed Grid state models](../docs/GRID_STATE_TYPES.md) for the exact input and
normalized output unions (including boolean), required range endpoints,
operation-discriminated events, snapshots and external ownership. The sketches
below describe the original design rather than the full current declarations.

Filtering remains a data projection concern. Grid owns filter UI and filter state; `DataView` receives the composed predicate.

The supplied DataView now retains the global predicate as the public
setFilter/getFilter contract while the attached Grid adds column filters and
filter-mode search to its effective projection. Either API can set or clear the
global predicate without losing the other conditions. TreeGrid/TreeDataView use
the same ownership rule. Only one table filter owner can attach to a view; use
separate views over the same store for independent tables. Table teardown removes
its local composition and silently refreshes an external view with the latest
global predicate. The internal bridge does not alter standalone view filtering.

```ts
interface GridFilterModel {
  get(columnId: string): ColumnFilter | null;
  set(columnId: string, filter: ColumnFilter, options?: MutationOptions): boolean;
  clear(columnId: string, options?: MutationOptions): boolean;
  clearAll(options?: MutationOptions): boolean;
  activeColumns(): string[];
  readonly events: EventBus;
}

type ColumnFilter =
  | { kind: "values"; values: unknown[]; includeEmpty?: boolean }
  | { kind: "text"; operator: TextFilterOperator; value: string }
  | { kind: "number"; operator: NumberFilterOperator; value: number; valueTo?: number }
  | { kind: "date"; operator: DateFilterOperator; value: unknown; valueTo?: unknown };
```

Grid exposes:

```ts
grid.filters.set("status", {
  kind: "values",
  values: ["active", "review"]
});

grid.filters.clear("status");
grid.filters.clearAll();
```

## Excel-Style Filter Popup

Each filterable header has a compact filter icon. It is visually distinct from the sort indicator and column resize handle.

Initial popup feature set:

- sort ascending / descending;
- search within available values;
- Select All checkbox;
- value checklist including an explicit empty-value item;
- Clear Filter command;
- Apply and Cancel buttons;
- active-filter marker in the header.

Typed columns may additionally expose operators:

- text: contains, equals, starts with, ends with, empty, not empty;
- number: equals, not equals, greater, greater or equal, less, less or equal, between;
- date: on, before, after, between, empty, not empty;
- boolean: all, true, false.

Columns whose primary `filterType` is `values` keep the value checklist and infer their Condition tab separately:

- string lookup values use text operators;
- finite numeric lookup values use number operators;
- Date objects use date operators;
- boolean lookup values remain checklist-only;
- `conditionFilterType` may explicitly override inference with `text`, `number`, or `date`.

The popup must not render an unlimited distinct-value list. Large cardinality requires search and a configurable collection limit.

Popup edits are staged. DataView changes only after Apply. Cancel restores the currently applied filter.

## Filter Events

```ts
grid.events.on("beforeFilterChange", event => {
  event.cancel = app.readOnly;
});

grid.events.on("filterChange", event => {
  // event.columnId, oldFilter, filter, origin, userAction
});
```

Filtering uses the normal mutation metadata and must support silent restore/import without stale rendering.

## Column Summary

Summary is column state, not a separate data row supplied by the application:

```js
const columns = [
  { id: "customer", summary: "count" },
  {
    id: "amount",
    filterType: "number",
    summary: "total",
    summaryFormat: value => formatMoney(value)
  }
];
```

Public API:

```js
grid.getColumnSummary("amount");
grid.setColumnSummary("amount", "total");
grid.setColumnSummary("amount", "none");
```

Rules:

- `count` counts non-empty values in the current page projection;
- `total` sums finite numeric values and is available only for numeric columns;
- `none` and `null` remove the column summary;
- the footer band is hidden when every column summary is `none`;
- `summaryFormat` formats the computed number;
- Summary changes in the filter popup are staged until Apply;
- Cancel discards both staged filter and Summary changes;
- Clear clears only the filter and leaves Summary unchanged.

```js
grid.events.on("beforeSummaryChange", event => {
  event.cancel = app.readOnly;
});

grid.events.on("summaryChange", event => {
  // event.columnId, oldSummary, summary, origin, userAction
});
```

## Status Bar

The status bar is a separate Grid band below the optional aggregate footer.

```ts
type GridStatusBarOptions = {
  visible?: boolean;
  showRowPosition?: boolean;
  showFilteredCount?: boolean;
  showTotalCount?: boolean;
  pagination?: boolean | {
    page?: number;
    pageSize: number;
    pageSizes?: number[];
  };
};
```

Example display without pagination:

```text
Row 248 / 1,000    Total 5,000
```

Example display with pagination:

```text
Row 48 / 100    Total 5,000          <<  <  3 / 50  >  >>
```

Navigation rules:

- `<<` moves to the first page;
- `<` moves to the previous page;
- `>` moves to the next page;
- `>>` moves to the last page;
- unavailable commands are disabled, not hidden;
- the page field accepts direct numeric entry;
- page size is configurable and may use a compact select control.

## Projection Order

The eventual DataView pipeline is:

```text
DataStore -> filter -> sort -> page -> virtual row renderer
```

Virtualization and pagination are independent. Pagination limits the projected item set; virtualization limits how many items from that page exist in the DOM.

The public page number is 1-based. `filteredCount` describes the full filter/sort projection, while `pageItemCount` describes only the current page. Empty projections still expose page 1 of 1, with `from` and `to` equal to 0.

## Recommended Implementation Order

1. `GridFilterModel` with programmatic per-column filters.
2. Header filter marker and clear-filter command.
3. Value checklist popup with Apply/Cancel.
4. Typed filter operators.
5. Status bar with row/filtered/total counts.
6. Optional pagination projection and navigation controls.
