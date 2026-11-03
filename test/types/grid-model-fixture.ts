import { DataStore, DataView, TreeDataView, SelectionModel, RangeSelectionModel, GridDataProvider,
  type DataProviderRequest } from 'taet-ui/core';

interface Row { id: number; parentId: number | null; name: string }
interface Query extends DataProviderRequest { page: number; pageSize: number }
export function createGridModels() {
  const data = new DataStore<Row>();
  data.parse([{ id: 1, parentId: null, name: 'Root' }, { id: 2, parentId: 1, name: 'Child' }]);
  const view = new DataView({ data });
  // Grid stores selected records, not scalar IDs, in its SelectionModel.
  const selection = new SelectionModel<Row>();
  const ranges = new RangeSelectionModel<number, 'name'>();
  const dataProvider = new GridDataProvider<Row, Query>(async ({ page, pageSize }, { signal }) => {
    signal.throwIfAborted();
    return { items: Array.from({ length: pageSize }, (_, i) => ({ id: (page - 1) * pageSize + i + 1,
      parentId: null, name: `Remote ${page}:${i}` })), totalCount: 1000 };
  });
  return {
    options: { data, view, selection, ranges, dataProvider },
    updateSilently() { data.update(1, { name: 'Silent root' }, { silent: true }); },
    hideSelected() { view.setFilter(row => row.id === 1, { silent: true }); },
    isAlive() { return !data.destroyed && !view.destroyed && !selection.destroyed && !ranges.destroyed && !dataProvider.destroyed; },
    destroy() { dataProvider.destroy(); ranges.destroy(); selection.destroy(); view.destroy(); data.destroy(); }
  };
}
export function createTreeModels() {
  const data = new DataStore<Row>();
  data.parse([{ id: 1, parentId: null, name: 'Root' }, { id: 2, parentId: 1, name: 'Child' }]);
  const treeView = new TreeDataView({ data, expandedIds: [1] });
  const selection = new SelectionModel<Row>();
  return {
    options: { data, treeView, selection },
    updateSilently() { data.update(1, { name: 'Silent root' }, { silent: true }); },
    hideSelected() { treeView.collapse(1, { silent: true }); },
    isAlive() { return !data.destroyed && !treeView.destroyed && !selection.destroyed; },
    destroy() { selection.destroy(); treeView.destroy(); data.destroy(); }
  };
}
