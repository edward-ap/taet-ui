import {Grid,TreeGrid} from 'taet-ui/grid';
import type {TreeGridNodeMoveResult,TreeGridNodeDropPosition} from 'taet-ui/grid';
import {DataStore} from 'taet-ui/core';
interface Row {id:number;name:string}
interface Other {id:string;amount:number}
export function verifyGridTransfer(container?:HTMLElement) {
 const a=new Grid<Row>({columns:[{id:'name'}],rowTransfer:{drag:true}}),b=new Grid<Row>({columns:[{id:'name'}],rowTransfer:{accept:true}});
 if(container){a.mount(container);b.mount(container)}
 a.data.parse([{id:1,name:'one'}]);const result=a.transferRowsTo(b,[1]);
 const accepted:boolean=result.accepted;const targetId:number|undefined=result.ids[0];
 if(!accepted||targetId!==1||a.data.get(1)||b.data.get(1)?.name!=='one')throw Error('Installed transfer failed');
 a.setRowTransferMode('copy');a.destroy();b.destroy();
 const source=new DataStore<Row>(),target=new DataStore<Other>();source.parse([{id:2,name:'two'}]);
 const mapped=source.transferTo(target,[2],{mode:'copy',mapItem:r=>({id:'copy-'+r.id,amount:r.name.length})});
 const mappedId:string|undefined=mapped.ids[0];if(!mapped.accepted||mappedId!=='copy-2'||target.get('copy-2')?.amount!==3)throw Error('Installed mapped transfer failed');
 if(false){
  // @ts-expect-error Different record shapes require an explicit mapper.
  source.transferTo(target,[2]);
  // @ts-expect-error Mode alone is not a schema mapping.
  source.transferTo(target,[2],{mode:'copy'});
  const other=new Grid<Other>({rowTransfer:{accept:true}}),original=new Grid<Row>({rowTransfer:{drag:true}});
  // @ts-expect-error Grid heterogeneous records require a mapper too.
  original.transferRowsTo(other,[2]);
  original.transferRowsTo(other,[2],{mapItem:r=>({id:String(r.id),amount:r.name.length})});
 }
 source.destroy();target.destroy();
}
if(typeof document==='undefined'){verifyGridTransfer();console.log('Installed Grid transfer OK: atomic move and typed explicit mapping')}

interface TreeRow {id:number;parentId:number|null;name:string}
export function verifyTreeMove(container?:HTMLElement) {
 const tree=new TreeGrid<TreeRow>({nodeReorder:true,parentField:'parentId',treeColumnId:'name',columns:[{id:'name'}],expandAll:true});
 tree.data.parse([{id:1,parentId:null,name:'Root'},{id:2,parentId:1,name:'Child'},{id:3,parentId:2,name:'Descendant'},{id:4,parentId:null,name:'Target'}]);
 if(container)tree.mount(container);
 tree.events.on('beforeNodeMove',event=>{const ids:number[]=event.ids;const item:TreeRow|undefined=event.items[0];if(ids.length===0||!item)event.cancel=true;});
 const position:TreeGridNodeDropPosition='inside';const result:TreeGridNodeMoveResult<number>=tree.moveNodes([2,3],4,position);
 if(!result.accepted||result.ids.length!==1||tree.data.get(2)?.parentId!==4||tree.data.get(3)?.parentId!==2)throw Error('Installed subtree move failed');
 if(!tree.data.canUndo()||!tree.data.undo()||tree.data.get(2)?.parentId!==1)throw Error('Installed subtree undo failed');
 if(false){
  // @ts-expect-error Record IDs retain their declared number type.
  tree.moveNode('2',4);
  // @ts-expect-error No cross-tree copy operation is supplied.
  tree.moveNodes([2],4,'copy');
 }
 tree.destroy();
}
if(typeof document==='undefined'){verifyTreeMove();console.log('Installed TreeGrid subtree move OK: normalized roots, descendant links and undo')}
