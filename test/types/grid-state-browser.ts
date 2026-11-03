import { DataStore, GridColumnModel, GridFilterModel, GridSearchModel, GridGroupModel } from 'taet-ui/core';
import type { GridEditorColumn } from 'taet-ui/grid/editors';

interface Row { id: number; name: string; amount: number; category: string }
type Key = 'name' | 'amount' | 'category';
export const columns: GridEditorColumn<Row>[] = [
  { id: 'name', title: 'Name', width: 160 },
  { id: 'amount', title: 'Amount', width: 100 },
  { id: 'category', title: 'Category', width: 100 }
];
export const rows: Row[] = [
  { id: 1, name: 'Alpha', amount: 10, category: 'A' },
  { id: 2, name: 'Beta', amount: 20, category: 'B' },
  { id: 3, name: 'Gamma', amount: 5, category: 'A' }
];
export function configureColumns(model: GridColumnModel<GridEditorColumn<Row>>) {
  model.move('amount', 0, { silent: true });
  model.setWidth('amount', 145, { silent: true });
  model.setFrozen('amount', 'left', { silent: true });
  model.setHidden('category', true, { silent: true });
  return model.visible().map(column => column.id);
}
export function checkColumnDOM(element: HTMLElement) {
  const header = Array.from(element.querySelectorAll<HTMLElement>('.dui-grid__header-cell'));
  if (header.map(cell => cell.dataset['duiGridColumnId']).join() !== 'amount,name') throw new Error('Silent column order/visibility did not render');
  if (Math.abs(header[0]!.getBoundingClientRect().width - 145) > 1) throw new Error('Silent width did not render');
  if (!element.querySelector('.dui-grid__cell--frozen-left')) throw new Error('Silent freezing did not render');
}
export function createGridState() {
  const data = new DataStore<Row>(); data.parse(rows);
  const filters = new GridFilterModel<Row, Key>();
  const searchModel = new GridSearchModel({ columns: ['name'], mode: 'filter' });
  const groupModel = new GridGroupModel<Row, Key>();
  let filterChanges = 0, groupChanges = 0;
  filters.events.on('change', () => { filterChanges++; });
  groupModel.events.on('change', () => { groupChanges++; });
  return {
    options: { columns, data, filters, searchModel, groupModel },
    filterSilently() { filters.set('amount', { kind: 'number', operator: 'greaterOrEqual', value: 10 }, { silent: true }); },
    search() { searchModel.set('Beta', { silent: true }); },
    clearSearch() { searchModel.clear({ silent: true }); },
    highlightSilently() { searchModel.restoreState({ query: 'Alpha', mode: 'highlight', columns: ['name'] }, { silent: true }); },
    excludeMatchesSilently() { searchModel.setColumns(['amount'], { silent: true }); },
    clearIntoFilterSilently() { searchModel.restoreState({ query: '', mode: 'filter' }, { silent: true }); },
    groupSilently() { groupModel.set([{ columnId: 'category', summaries: [{ columnId: 'amount', kind: 'total' }] }], { silent: true }); },
    collapseFirst() {
      const entry = groupModel.entries(rows, (row, key) => row[key])[0];
      if (entry?.type !== 'group') throw new Error('Expected group');
      return groupModel.toggle(entry.path, { silent: true });
    },
    events() { return { filterChanges, groupChanges }; },
    isAlive() { return !data.destroyed && !filters.destroyed && !searchModel.destroyed && !groupModel.destroyed; },
    afterGridDestroy() { filters.clearAll(); searchModel.clear(); groupModel.clear(); },
    destroy() { groupModel.destroy(); searchModel.destroy(); filters.destroy(); data.destroy(); }
  };
}
