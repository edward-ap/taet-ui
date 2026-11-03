// @ts-check
import { Grid, TreeGrid, gridEditors, gridExporters } from 'taet-ui/grid';
/** @typedef {{ id: string, parentId: string | null, name: string }} Row */
/** @type {Grid<Row>} */
export const grid = new Grid({ columns: [{ id: 'name', field: 'name', sortable: true,
  editor: gridEditors.text() }], onFocus: event => { event.source.getPageState(); } });
grid.data.parse([{ id: 'root', parentId: null, name: 'JSDoc' }]);
grid.sortBy('name', 'asc');
/** @type {string} */
const csv = grid.exportData(gridExporters.csv());
if (!csv.includes('JSDoc')) throw new Error('JSDoc constructor/export');
grid.destroy();
/** @type {TreeGrid<Row>} */
const tree = new TreeGrid({ columns: [{ id: 'name' }], parentField: 'parentId' });
tree.data.parse([{ id: 'root', parentId: null, name: 'JSDoc' }]);
tree.setSelectedIds('root');
if (tree.getSelectedIds()[0] !== 'root') throw new Error('JSDoc TreeGrid IDs');
tree.destroy();
console.log('Installed JSDoc Grid/TreeGrid constructors OK');
function rejected() {
  // @ts-expect-error Typed identity reaches checked JS.
  grid.setSelectedIds(1);
  // @ts-expect-error TreeGrid has no pagination method.
  tree.setPage(2);
}
void rejected;
