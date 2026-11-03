// @ts-check
import { GridColumnModel, GridFilterModel, GridSearchModel, GridGroupModel } from 'taet-ui/core';
/** @typedef {{ id: number, name: string, amount: number }} Row */
/** @type {GridFilterModel<Row, 'name' | 'amount'>} */
const filters = new GridFilterModel();
filters.set('amount', { kind: 'number', operator: 'greater', value: 5 });
if (!filters.matches({ id: 1, name: 'JS', amount: 10 }, (row, key) => row[key])) throw new Error('JSDoc filter');
/** @type {GridGroupModel<Row, 'name' | 'amount'>} */
const groups = new GridGroupModel({ rules: ['name'] });
const entry = groups.entries([{ id: 1, name: 'JS', amount: 10 }], (row, key) => row[key])[0];
if (entry?.type !== 'group' || entry.count !== 1) throw new Error('JSDoc group');
const columns = new GridColumnModel([{ id: 'name', title: 'Name' }]);
if (columns.get('name')?.title !== 'Name') throw new Error('JSDoc column inference');
const search = new GridSearchModel({ query: 'JS' }); search.clear();
filters.destroy(); groups.destroy(); columns.destroy(); search.destroy();
console.log('Installed JSDoc Grid state consumers OK');
function rejected() {
  // @ts-expect-error Unknown filter operator is rejected in JS too.
  filters.set('name', { kind: 'text', operator: 'like', value: 'JS' });
  // @ts-expect-error Query state has no invented find method.
  search.find('JS');
}
void rejected;
