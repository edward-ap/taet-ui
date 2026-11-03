import { Grid, TreeGrid, gridEditors, gridExporters, GridVirtualRenderer,
  type GridColumn, type TreeGridColumn, type GridRemoteRequest, type GridWorkbook, type GridOptions } from 'taet-ui/grid';
import { BaseControl, DataStore, GridDataProvider } from 'taet-ui/core';
import type { GridEditorHost } from 'taet-ui/grid/editors';

function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
export interface Row { id: number; parentId: number | null; name: string; amount: number }
export const rows: Row[] = [
  { id: 1, parentId: null, name: 'Root', amount: 10 },
  { id: 2, parentId: 1, name: 'Child', amount: 30 }
];
export const columns: GridColumn<Row>[] = [
  { id: 'name', field: 'name', title: 'Name', width: 160, sortable: true,
    filterable: true, filterType: 'text', filterText: value => String(value),
    editor: gridEditors.text<Row>({ placeholder: 'Name' }) },
  { id: 'amount', title: 'Amount', width: 100, dataType: 'number', summary: { kind: 'total', scope: 'all' },
    sortable: true, sort: (left, right, context) => { context.grid.getSortModel(); return left.amount - right.amount; },
    summaryFormat: (value, context) => { context.source.getPageState(); return String(value); },
    editor: gridEditors.number<Row>({ min: 0 }) }
];
export const treeColumns: TreeGridColumn<Row>[] = [
  { id: 'name', title: 'Name', width: 160, sortable: true, filterable: true, editor: gridEditors.text<Row>() },
  { id: 'amount', title: 'Amount', width: 100 }
];
export function createGrid(container?: HTMLElement | string) {
  const data = new DataStore<Row>(); data.parse(rows);
  const options: GridOptions<Row> = { columns, data, width: 480, height: 260,
    statusBar: { pagination: { pageSize: 1 } },
    formatting: [{ columnId: 'amount', when: (_value, context) => context.item.amount >= 30, className: 'typed-high-amount' }],
    rowDetail: (item, context) => { context.source.getPageState(); return `Details: ${item.name}`; } };
  const grid = container ? new Grid(container, options) : new Grid(options);
  grid.events.on('beforeCellChange', event => {
    event.source.getPageState();
    if (event.newValue === 'veto') event.cancel = true;
  });
  grid.events.on('cellDoubleClick', event => { const row:Row=event.item; const id:number=event.id; event.cancel=false; event.source.getPageState(); void row; void id; });
  grid.events.on('groupChange', event => { event.source.getSelectedIds(); event.groupModel.getState(); });
  return { grid, data };
}
export function createTree(container?: HTMLElement | string) {
  const tree = new TreeGrid<Row>({ columns: treeColumns, expandedIds: [1], width: 480, height: 260,
    nodeIcon: (_item, entry, owner) => { owner.isExpanded(entry.id); return null; },
    onFocus: event => { event.source.getSelectedIds(); } });
  tree.events.on('rowDoubleClick', event => { const row:Row=event.item; const id:number=event.id; event.cancel=false; event.source.isExpanded(id); void row; });
  tree.data.parse(rows);
  if (container) tree.mount(container);
  return tree;
}

const { grid, data } = createGrid();
const base: BaseControl = grid;
const host: GridEditorHost<Row> = grid;
check(base instanceof BaseControl && host.data === data, 'base/editor host compatibility');
grid.sortBy('amount', 'desc');
check(grid.getSortState()?.columnId === 'amount' && grid.view.all()[0]?.id === 2, 'typed sort/page');
grid.setColumnFilter('amount', { kind: 'number', operator: 'greater', value: 15 });
check(grid.getPageState().filteredCount === 1, 'filter projection');
grid.clearColumnFilter('amount'); grid.setSelectedIds(2);
check(grid.selection.get()[0]?.id === 2, 'record selection on current page');
const saved = grid.getLayoutState(); grid.restoreLayoutState(saved);
check(grid.getColumnSummaryValue('amount') === 'Total 40', 'formatted summary');
const csv: string = grid.exportData(gridExporters.csv({ escapeFormulas: true }));
const workbook: GridWorkbook = grid.exportData(gridExporters.workbook({ sheetName: 'Records' }));
check(csv.includes('Name,Amount') && workbook.sheets[0]?.rows.length === 2, 'typed exporters');
const custom: number = grid.exportData({ export: context => context.rows.reduce((sum, row) => sum + row.amount, 0) });
check(custom === 40, 'custom exporter return inference');
const request: GridRemoteRequest = grid.createRemoteRequest(); check(request.sort.length === 1, 'request envelope');
const extra = grid.createRemoteRequest({ tenant: 'demo' }); const tenant: string = extra.tenant; void tenant;
const renderer = new GridVirtualRenderer(grid); check(renderer.getRange(2, false).end === 2, 'controller owner'); renderer.destroy();
grid.destroy(); check(!data.destroyed, 'external store ownership'); data.destroy();
const tree = createTree(); const treeHost: GridEditorHost<Row> = tree; void treeHost;
tree.setColumnFilter('name', (_value, row) => row.id === 2);
check(tree.treeView.entries().length === 2, 'tree retains matching ancestors');
tree.clearAllFilters(); tree.sortBy('name', 'desc');
check(Array.isArray(tree.getSortState()), 'tree sort state differs');
tree.events.once('beforeCollapse', event => { event.cancel = true; });
tree.events.on('editReject', event => { if (event.validation) check(typeof event.validation.ok === 'boolean', 'tree validation details'); });
check(!tree.collapse(1) && tree.isExpanded(1), 'typed expansion veto');
tree.collapse(1); tree.restoreLayoutState({ columns: tree.columnModel.getState(), expandedIds: [1] });
check(tree.isExpanded(1), 'tree layout restore'); tree.destroy();
const provider = new GridDataProvider<Row>(async () => ({ items: rows, totalCount: 200 }));
const remote = new Grid<Row>({ columns, dataProvider: provider });
await remote.reloadRemote({ page: 2, pageSize: 2 });
check(remote.remoteTotalCount === 200, 'typed remote loading'); remote.destroy();
check(!provider.destroyed, 'external provider ownership'); provider.destroy();
const customIds = new DataStore<{ key: string; label: string }, string>({ idField: 'key' });
const inferred = new Grid({ data: customIds, columns: [{ id: 'label', field: 'label' }] });
inferred.data.parse([{ key: 'a', label: 'Inferred' }]);
inferred.setSelectedIds('a');
check(inferred.data.get('a')?.label === 'Inferred', 'constructor inference from store without explicit Grid generics');
inferred.destroy(); customIds.destroy();
console.log('Installed Grid/TreeGrid constructors OK: inferred records, columns, models, summaries, export, remote and ownership');

function rejected() {
  // @ts-expect-error Custom string IDs are inferred from the injected store.
  inferred.selectById(1);
  // @ts-expect-error Inferred numeric IDs reject strings.
  grid.setSelectedIds('1');
  // @ts-expect-error Record shape comes from the injected store.
  grid.data.add({ id: 3, name: 'Missing fields' });
  // @ts-expect-error Constructors do not use string editor descriptors.
  new Grid<Row>({ columns: [{ id: 'name', editor: 'text' }] });
  // @ts-expect-error Typo in a column field.
  new Grid<Row>({ columns: [{ id: 'x', field: 'missing' }] });
  // @ts-expect-error TreeGrid has no pagination option.
  new TreeGrid<Row>({ statusBar: { pagination: true } });
  // @ts-expect-error TreeGrid does not inject Grid's filter model.
  new TreeGrid<Row>({ filters: grid.filters });
  // Typed conditions are shared; legacy Tree strings/callbacks also remain valid.
  tree.setColumnFilter('name', { kind: 'text', operator: 'contains', value: 'a' });
  // @ts-expect-error TreeGrid has no remote loading API.
  tree.reloadRemote();
  // @ts-expect-error No automatic click constructor callback binding.
  new Grid({ onRowClick() {} });
  // @ts-expect-error The group model is not the table source.
  grid.events.on('groupChange', event => event.groupModel.getSelectedIds());
  // @ts-expect-error Grid summaries require narrowing, not numeric arithmetic.
  grid.getColumnSummaryValue('amount') + 1;
  // @ts-expect-error Use clearColumnFilter to clear Grid filters.
  grid.setColumnFilter('name', null);
  tree.events.on('beforeEditStart', event => { event.cancel = true; });
  // @ts-expect-error Tree value accessors must handle missing sort/filter row indexes.
  const badTreeColumn: TreeGridColumn<Row> = { id: 'computed', value: (item, index: number) => item.amount + index };
  void badTreeColumn;
}
void rejected;

// Executed from the packed installation; checks the declared clipboard payloads.
function checkClipboardContract() {
  const grid = new Grid<Row>({ columns });
  grid.data.parse(rows);
  grid.setCellRanges({ anchor: { rowId: 1, columnId: 'amount' }, focus: { rowId: 1, columnId: 'amount' } });
  let count = 0, rejected = false;
  grid.events.on('clipboardPaste', event => {
    const changed: number = event.changed;
    // @ts-expect-error changed is a count, not a success flag.
    const flag: boolean = event.changed;
    void flag;
    count += changed;
    check(event.origin === 'api' && !event.userAction, 'Clipboard default provenance');
  });
  grid.events.on('editReject', event => {
    const error: unknown = event.error;
    rejected = event.reason === 'clipboard-parse' && error instanceof TypeError;
  });
  check(grid.pasteClipboardText('42'), 'Typed paste');
  check(!grid.pasteClipboardText('invalid'), 'Rejected paste');
  check(count === 1 && rejected && grid.data.get(1)?.amount === 42, 'Clipboard event contract');
  grid.destroy();
}
checkClipboardContract();

// Row ranges are shared by both table classes, without widening options to any.
const rowGrid = new Grid<Row>({ columns, multiSelect: true, rowRangeSelection: true });
const rowTree = new TreeGrid<Row>({ columns: treeColumns, multiSelect: true, rowRangeSelection: true });
check(rowGrid.rowRangeSelection && !rowGrid.rangeSelectionEnabled, 'row mode disables pointer cell ranges');
check(rowTree.rowRangeSelection, 'TreeGrid row mode');
rowGrid.destroy(); rowTree.destroy();

const reorder = new Grid<Row>({ columns: [{id:'name'}], rowReorder: true });
reorder.data.parse(rows);
reorder.events.on('beforeRowReorder', event => { const ids: number[] = event.ids; event.cancel = ids.length > 10; });
reorder.events.on('rowReorder', event => { const position: 'before' | 'after' = event.position; void position; });
check(reorder.moveRows([2], 1, { position: 'before', origin:'user' }), 'typed local reorder');
check(reorder.rowReorderEnabled, 'typed row handles');
reorder.destroy();

import {createGridFromJSON, compileGridDefinition, type GridDefinition} from 'taet-ui/grid';
const definition: GridDefinition = {schemaVersion:1,columns:[{id:'name',editor:{type:'text',required:true}}],data:[{id:1,name:'Test'}]};
const compiled = compileGridDefinition(definition);
const jsonGrid = createGridFromJSON(definition,{formatters:{upper:value=>String(value).toUpperCase()}});
check(compiled.data.length === 1 && jsonGrid.data.all().length === 1,'JSON grid definition');jsonGrid.destroy();

import {createTreeGridFromJSON, type TreeGridDefinition} from 'taet-ui/grid';
import {createTreeFromJSON,createPropertyGridFromJSON,getPropertyGridValues,type TreeDefinition,type PropertyGridDefinition} from 'taet-ui/experimental';
const treeSpec:TreeDefinition={schemaVersion:1,data:[{id:1,text:'Root'}]};
const jsonTree=createTreeFromJSON(treeSpec);check(jsonTree.data.all().length===1,'JSON tree');jsonTree.destroy();
const treeGridSpec:TreeGridDefinition={...treeSpec,columns:[{id:'text'}]};
const jsonTreeGrid=createTreeGridFromJSON(treeGridSpec);check(jsonTreeGrid.data.all().length===1,'JSON tree grid');jsonTreeGrid.destroy();
const propertySpec:PropertyGridDefinition={schemaVersion:1,groups:[{id:'g',title:'General',properties:[{name:'enabled',editor:{type:'checkbox'}}]}],data:{enabled:true}};
const jsonProperties=createPropertyGridFromJSON(propertySpec);check(getPropertyGridValues(jsonProperties).enabled===true,'JSON properties');jsonProperties.destroy();

import {createFormFromJSON,compileFormDefinition,type FormDefinition} from 'taet-ui/experimental';
const formDefinition:FormDefinition={schemaVersion:1,groups:[{id:'general',rows:[[{name:'name',editor:{type:'text',required:true}}]]}],data:{name:'Sample'}};
const jsonForm=createFormFromJSON(formDefinition);check(jsonForm.value.get().name==='Sample' && compileFormDefinition(formDefinition).groups.length===1,'JSON form');jsonForm.destroy();
