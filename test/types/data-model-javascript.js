// @ts-check
import { DataStore, DataView, TreeDataView, SelectionModel, RangeSelectionModel, GridDataProvider } from 'taet-ui/core';
/** @typedef {{ id: string, parentId: string | null, label: string }} Row */
/** @type {DataStore<Row>} */
const data = new DataStore();
data.parse([{ id: 'root', parentId: null, label: 'JSDoc' }]);
const view = new DataView({ data, filter: row => row.label.length > 0 });
const tree = new TreeDataView({ data });
/** @type {SelectionModel<string>} */
const selection = new SelectionModel();
/** @type {RangeSelectionModel<string>} */
const ranges = new RangeSelectionModel();
/** @type {GridDataProvider<Row>} */
const provider = new GridDataProvider(async (_request, { signal }) => {
  signal.throwIfAborted(); return { items: data.all() };
});
const result = await provider.request({ page: 1 });
selection.set(result.items.map(row => row.id));
ranges.set({ anchor: { rowId: 'root', columnId: 'label' } });
if (view.get('root')?.label !== 'JSDoc' || tree.getEntry('root')?.level !== 0) throw new Error('JS projection contract');
provider.destroy(); ranges.destroy(); selection.destroy(); tree.destroy(); view.destroy(); data.destroy();
console.log('Installed JSDoc data-model consumer OK');
function rejected() {
  // @ts-expect-error Inferred string identities also reach checked JavaScript.
  view.get(1);
  // @ts-expect-error Tree records keep their schema.
  tree.setFilter(row => row.missing);
  // @ts-expect-error Selected IDs retain their type.
  selection.set([1]);
}
void rejected;
