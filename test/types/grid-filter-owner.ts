import { DataStore, DataView, TreeDataView } from 'taet-ui/core';
import { Grid, TreeGrid } from 'taet-ui/grid';

interface Row { id: number; parentId: number | null; name: string; amount: number }
const columns = [{ id: 'name', title: 'Name', width: 180, sortable: true }, { id: 'amount', title: 'Amount', width: 120, sortable: true }];
function createData() {
  const data = new DataStore<Row>();
  data.parse([
    { id: 1, parentId: null, name: 'Alpha', amount: 10 },
    { id: 2, parentId: null, name: 'Beta', amount: 20 },
    { id: 3, parentId: null, name: 'Gamma', amount: 30 },
    { id: 4, parentId: null, name: 'Beta', amount: 40 }
  ]);
  return data;
}
const silent = { silent: true, origin: 'restore' as const };

export function createGridFilterOwner() {
  const data = createData();
  const view = new DataView({ data });
  const table = new Grid({ columns, view, searchPanel: true, width: 480, height: 260 });
  return { table, view,
    restrictColumn() { table.setColumnFilter('amount', { kind: 'number', operator: 'greaterOrEqual', value: 20 }, silent); },
    search(value: string) { table.search.restoreState({ query: value, mode: 'filter', columns: ['name'] }, silent); },
    sort() { table.sortBy('amount', 'desc', silent); },
    destroy() { table.destroy(); view.destroy(); data.destroy(); }
  };
}
export function createTreeFilterOwner() {
  const data = createData();
  const view = new TreeDataView({ data });
  const table = new TreeGrid({ columns, treeView: view, searchPanel: true, width: 480, height: 260 });
  return { table, view,
    restrictColumn() { table.setColumnFilter('amount', value => Number(value) >= 20, silent); },
    search(value: string) { table.setSearchQuery(value, silent); },
    sort() { table.sortBy('amount', 'desc', silent); },
    destroy() { table.destroy(); view.destroy(); data.destroy(); }
  };
}
