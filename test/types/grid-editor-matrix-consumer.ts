import {Grid,TreeGrid} from 'taet-ui/grid';
import {gridEditors} from 'taet-ui/grid/editors';
interface MatrixRow { id:number; value:number|null }
export function verifyGridMatrixCodecs() {
 const choice=gridEditors.select<MatrixRow>({emptyValue:null,items:[{id:0,text:'Zero'}]});
 for(const table of [new Grid<MatrixRow>({columns:[{id:'value',editor:choice}]}),new TreeGrid<MatrixRow>({columns:[{id:'value',editor:choice}]})]){
  table.data.parse([{id:1,value:null}]);const item=table.data.get(1),column=table.getColumn('value');
  if(!item||!column)throw new Error('Matrix consumer context');
  const context={source:table,grid:table,item,id:1,column,columnId:'value',rowIndex:0,value:null};
  const c=choice.createCellEditor(context);if(c.getValue()!==null)throw new Error('Explicit null choice changed');c.destroy();
  const n=gridEditors.number<MatrixRow>({clamp:false,step:'any'}).createCellEditor({...context,value:''});
  const empty:number|null=n.getValue();if(empty!==null)throw new Error('Empty number became zero');n.destroy();
  const b=gridEditors.checkbox<MatrixRow>().createCellEditor({...context,value:false});const unchecked:boolean=b.getValue();if(unchecked!==false)throw new Error('Boolean codec');b.destroy();
  table.destroy();
 }
}
