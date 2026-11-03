import {Panel,Grid,Button,ReadonlyText,LabelText,gridEditors} from '../../src/ui/all.js';

export function createGridTransferDemo(container) {
 const owner=new Panel({css:'grid-transfer',scroll:'hidden'});let dark=false,mode='move',serial=0;
 owner.mount(container);
 const title=owner.attach(new LabelText({text:'Grid row transfer'}));
 const help=owner.attach(new ReadonlyText({text:'Ctrl/Cmd/Shift select rows. Drag the left service strip to the other table. Rows marked [READ ONLY] and matching IDs reject the entire set; no rows move.'}));
 const toolbar=owner.attach(new Panel({css:'grid-transfer__toolbar',scroll:'hidden'}));
 const tables=owner.attach(new Panel({css:'grid-transfer__tables',scroll:'hidden'}));
 const leftPane=tables.attach(new Panel({css:'grid-transfer__pane',scroll:'hidden'})),rightPane=tables.attach(new Panel({css:'grid-transfer__pane',scroll:'hidden'}));
 const leftCount=leftPane.attach(new LabelText({text:'Source'})),rightCount=rightPane.attach(new LabelText({text:'Target'}));
 const columns=()=>[{id:'name',title:'Record',sortable:true,width:'minmax(180px,1fr)',editor:gridEditors.text()},
  {id:'amount',title:'Amount',sortable:true,width:88,editor:gridEditors.number({step:'any'})},{id:'id',title:'ID',width:94,readOnly:true}];
 const options={columns:columns(),multiSelect:true,rowRangeSelection:true,rowTransfer:{drag:true,accept:true},statusBar:true};
 const left=leftPane.attach(new Grid({...options,name:'transferSource'})),right=rightPane.attach(new Grid({...options,columns:columns(),name:'transferTarget'}));
 const status=owner.attach(new ReadonlyText({css:'grid-transfer__status',role:'status',text:'Ready'}));
 const log=owner.attach(new ReadonlyText({css:'grid-transfer__log',text:''}));const entries=[];
 const traceMode=new URLSearchParams(location.search).get('trace')==='1';let traceSequence=0;
 const alive=()=>!owner.destroyed&&!left.destroyed&&!right.destroyed&&!left.data.destroyed&&!right.data.destroyed;
 const refresh=()=>{if(!alive())return;leftCount.setText(`Source — ${left.data.all().length} records / ${left.getSelectedIds().length} selected`);if(!alive())return;rightCount.setText(`Target — ${right.data.all().length} records / ${right.getSelectedIds().length} selected`)};
 const record=e=>{if(!alive())return;const r=e.result;entries.unshift(`${++serial}. ${e.role}: ${r.accepted?'accepted':'rejected'} ${r.mode} ${r.sourceIds.length} | ${r.reason??'OK'} | observer errors ${r.notificationErrors.length}`);entries.splice(traceMode?64:8);log.setText(entries.join('\n'));status.setText(r.accepted?`${r.mode}: ${r.ids.length} accepted`:`Rejected: ${r.reason}`);refresh();
  if(e.role==='target'&&r.accepted){const visible=r.ids.filter(id=>e.source.view.get(id));e.source.setSelectedIds(visible,{origin:'system'});}
 };
 if(traceMode){
  for(const [grid,side]of[[left,'source'],[right,'target']])owner.disposables.add(grid.selection.events.on('invalidate',()=>{
   if(!alive())return;
   entries.unshift(`event ${++traceSequence} selection/invalidate ${side} L[${left.getSelectedIds().join(',')}] R[${right.getSelectedIds().join(',')}]`);
   entries.splice(64);log.setText(entries.join('\n'));
  }));
  const snapshot=(event,phase,side,rowKey)=>{
   if(!alive())return;
   entries.unshift(`event ${++traceSequence} ${event.type}/${phase} ${side} row[${rowKey}] L[${left.getSelectedIds().join(',')}] R[${right.getSelectedIds().join(',')}] prevented=${event.defaultPrevented}`);
   entries.splice(64);log.setText(entries.join('\n'));
  };
  for(const type of['pointerdown','mousedown','pointerup','mouseup','click','dblclick','dragstart','drop','dragend']){
   owner.disposables.addEventListener(owner.element,type,event=>{
    if(!alive())return;
    const side=left.element.contains(event.target)?'source':right.element.contains(event.target)?'target':null;
    if(!side)return;
    const rowKey=event.target.closest?.('.dui-grid__row')?.dataset.duiGridRowId??'-';
    snapshot(event,'capture',side,rowKey);
    queueMicrotask(()=>snapshot(event,'queued',side,rowKey));
   },true);
  }
 }
 for(const grid of[left,right]){owner.disposables.add(grid.events.on('rowTransfer',record));owner.disposables.add(grid.data.events.on('invalidate',refresh));owner.disposables.add(grid.selection.events.on('invalidate',refresh));grid.events.on('beforeRowTransfer',e=>{const blocked=e.items.find(row=>row.readOnly);if(blocked){e.cancel=true;e.reason=`Record ${blocked.id} (${blocked.name}) is read-only; entire batch cancelled`}})}
 const modeButton=toolbar.attach(new Button({text:'Mode: Move',onClick:()=>{if(!alive())return;mode=mode==='move'?'copy':'move';left.setRowTransferMode(mode);if(!alive())return;right.setRowTransferMode(mode);if(!alive())return;modeButton.setText(`Mode: ${mode==='move'?'Move':'Copy'}`)}}));
 const reset=()=>{
  if(!alive())return false;
  left.cancelEdit();if(!alive())return false;
  right.cancelEdit();if(!alive())return false;
  const leftLoaded=left.data.parse([{id:'A1',name:'Design notes',amount:12.5},{id:'A2',name:'Keyboard review',amount:0},{id:'A3',name:'Long record label / preserve typed data',amount:-3.25},{id:'locked',name:'[READ ONLY] Read-only policy veto',amount:9,readOnly:true}]);
  if(!alive()||!leftLoaded)return false;
  const rightLoaded=right.data.parse([{id:'B1',name:'Target record',amount:2}]);
  if(!alive()||!rightLoaded)return false;
  left.setSelectedIds(['A1','A2']);if(!alive())return false;
  right.clearSelection();if(!alive())return false;
  entries.length=0;serial=0;log.setText('');if(!alive())return false;
  status.setText('Ready - move/copy via API; no clipboard operation');if(!alive())return false;
  refresh();return alive();
 };
 toolbar.attach(new Button({text:'Reset fixture',onClick:reset}));
 toolbar.attach(new Button({text:'Light / dark',onClick:()=>{dark=!dark;document.body.classList.toggle('dui-theme-light-blue',!dark);document.body.classList.toggle('dui-theme-dark-blue',dark)}}));
 reset();return{owner,left,right,reset,get mode(){return mode}};
}
