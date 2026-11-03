import {Grid,TreeGrid,type GridSortRule} from 'taet-ui/grid';
type Row={id:number;name:string;n:number};
const grid=new Grid<Row>({columns:[{id:'name'},{id:'n'}]});
const tree=new TreeGrid<Row>({columns:[{id:'name',sortable:true},{id:'n'}]});
for(const table of [grid,tree]){
  table.data.parse([{id:1,name:'Alpha',n:1},{id:2,name:'Beta',n:2}]);
  table.setColumnFilter('n',{kind:'number',operator:'greater',value:1});
  table.clearColumnFilter('n');
  table.clearAllFilters({search:false,silent:true});
  const sort:GridSortRule[]=table.getSortModel();if(sort.length)throw new Error('Unexpected sort');
}
tree.setColumnFilter('name','Al');tree.clearAllFilters({search:true});
if(tree.treeView.all().length!==2)throw new Error('Filter scope mismatch');
const mini = new Grid<Row>({indicatorGutter:false,gridMenu:true,columns:[{id:'name'}]});
if (mini.indicatorGutterEnabled || mini.gridMenuEnabled) throw new Error('Gutter opt-out must win');
const globalOnly = new TreeGrid<Row>({columnMenu:false,gridMenu:true,columns:[{id:'name'}]});
if (!globalOnly.indicatorGutterEnabled || !globalOnly.gridMenuEnabled || globalOnly.columnMenuEnabled) {
  throw new Error('Independent global menu option');
}
mini.destroy();globalOnly.destroy();
if (false) {
  // @ts-expect-error Shared gutter option is boolean, not a size/data-column declaration.
  new Grid<Row>({indicatorGutter:'20px'});
  // @ts-expect-error Shared menu option is boolean.
  new TreeGrid<Row>({gridMenu:'yes'});
}
grid.destroy();tree.destroy();
console.log('Installed common Grid contracts OK: descriptors, typed/tree legacy conditions, explicit search scope');
