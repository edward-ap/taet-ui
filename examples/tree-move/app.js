import {Panel,TreeGrid,Button,ReadonlyText,LabelText,gridEditors} from '../../src/ui/all.js';

export function createTreeMoveDemo(container) {
 const owner=new Panel({css:'tree-move',scroll:'hidden'});owner.mount(container);let dark=false,serial=0;
 owner.attach(new LabelText({text:'TreeGrid subtree move'}));
 owner.attach(new ReadonlyText({text:'Ctrl/Cmd/Shift select. Drag the 10px left strip: row middle = inside, top/bottom edge = before/after, blank body = root. [READ ONLY] rejects the whole set.'}));
 const toolbar=owner.attach(new Panel({css:'tree-move__toolbar',scroll:'hidden'}));
 const tree=owner.attach(new TreeGrid({name:'treeMove',parentField:'parentId',textField:'name',treeColumnId:'name',nodeReorder:true,multiSelect:true,rowRangeSelection:true,expandAll:true,statusBar:true,rowHeight:24,columns:[
  {id:'name',title:'Node',width:'minmax(220px,1fr)',sortable:true,editor:gridEditors.text(),readOnly:row=>row.readOnly===true},
  {id:'amount',title:'Amount',width:96,editor:gridEditors.number({step:'any'}),readOnly:row=>row.readOnly===true},
  {id:'id',title:'ID',width:96,readOnly:true},{id:'parentId',title:'Parent',width:96,readOnly:true}
 ]}));
 const status=owner.attach(new ReadonlyText({css:'tree-move__status',role:'status',text:'Ready'}));
 const log=owner.attach(new ReadonlyText({css:'tree-move__log',text:''})),entries=[];
 const alive=()=>!owner.destroyed&&!tree.destroyed&&!tree.data.destroyed;
 owner.disposables.add(tree.events.on('beforeNodeMove',e=>{
  const blocked=[...e.subtreeIds.map(id=>tree.data.get(id)),e.targetId==null?null:tree.data.get(e.targetId)].find(row=>row?.readOnly===true);
  if(blocked){e.cancel=true;e.reason=`Read-only node ${blocked.id}: entire batch cancelled`}
 }));
 owner.disposables.add(tree.events.on('nodeMove',e=>{
  if(!alive())return;const r=e.result;
  const message=r.accepted?`Moved ${r.ids.length} subtree(s), ${r.subtreeIds.length} nodes: ${r.position} ${r.targetId??'ROOT'}`:`Rejected: ${r.reason}`;
  status.setText(message);if(!alive())return;
  entries.unshift(`${++serial}. ${message} | roots [${r.ids.join(',')}] | nodes [${r.subtreeIds.join(',')}] | observer errors ${r.notificationErrors.length}`);
  entries.splice(8);log.setText(entries.join('\n'));
 }));
 const reset=()=>{
  if(!alive())return false;tree.cancelEdit();if(!alive())return false;
  tree.clearAllFilters({search:true});if(!alive())return false;tree.clearSort();if(!alive())return false;
  const result=tree.data.parse([
   {id:'A',parentId:null,name:'Branch Alpha',amount:10},{id:'A1',parentId:'A',name:'Alpha child / subtree',amount:1},
   {id:'A11',parentId:'A1',name:'Alpha grandchild',amount:0},{id:'A2',parentId:'A',name:'Alpha sibling',amount:-2},
   {id:'B',parentId:null,name:'Branch Beta',amount:20},{id:'B1',parentId:'B',name:'Beta child',amount:2},
   {id:'locked',parentId:null,name:'[READ ONLY] Locked branch',amount:9,readOnly:true},{id:'C',parentId:null,name:'Branch Gamma',amount:30}
  ],{origin:'import'});if(!result||!alive())return false;
  tree.expandAll();if(!alive())return false;tree.clearSelection();if(!alive())return false;
  entries.length=0;serial=0;log.setText('');status.setText('Ready - move only inside this tree; IDs and descendants are preserved');return alive();
 };
 toolbar.attach(new Button({text:'Reset fixture',onClick:reset}));
 toolbar.attach(new Button({text:'Sort names',onClick:()=>tree.sortBy('name','asc')}));
 toolbar.attach(new Button({text:'Clear sorting',onClick:()=>tree.clearSort()}));
 toolbar.attach(new Button({text:'Undo',onClick:()=>{if(alive())tree.data.undo()}}));
 toolbar.attach(new Button({text:'Redo',onClick:()=>{if(alive())tree.data.redo()}}));
 toolbar.attach(new Button({text:'Light / dark',onClick:()=>{dark=!dark;document.body.classList.toggle('dui-theme-light-blue',!dark);document.body.classList.toggle('dui-theme-dark-blue',dark)}}));
 reset();return{owner,tree,reset};
}
