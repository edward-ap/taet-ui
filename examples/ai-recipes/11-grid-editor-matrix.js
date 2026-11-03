import { Button, DataStore, DataView, Grid, LabelText, Panel, ReadonlyText, Switch, TreeDataView,
  TreeGrid, createGridEditorFactory, gridEditors } from '../../src/ui/all.js';

const editorKinds = ['text','number','select','checkbox','switch','date','time','dateTime','radio'];
const radioChoices = [{value:false,text:'N'},{value:true,text:'Y'}];
const choices = [{id:0,text:'Zero (number)'},{id:'ready',text:'Ready (string)'},{id:'hold',text:'Hold (string)'}];

function editorMatrixRecords() {
  const common = {parentId:'cases',text:'Sample',number:1.25,select:'ready',checkbox:true,switch:false,
    date:'2026-10-31',time:'09:30',dateTime:'2026-10-31T09:30',radio:false};
  return [{id:'cases',name:'Value cases',parentId:null},
    {...common,id:'empty',name:'Null / undefined / empty',text:null,number:null,select:null,date:'',time:undefined,dateTime:'',radio:null},
    {...common,id:'zero',name:'Zero and false',text:'',number:0,select:0,checkbox:false,time:'00:00',radio:false},
    {...common,id:'decimal',name:'Negative / decimal / long',number:-12.75,text:'Long text remains editable without widening the row or column.'},
    {...common,id:'invalid',name:'Invalid values - correct or cancel',text:'!',number:999,date:'bad-date',radio:true},
    {...common,id:'readonly',name:'Read-only record',readOnly:true},
    ...Array.from({length:95},(_,i)=>({...common,id:`row-${i}`,name:`Virtual row ${i+1}`,number:i/10,checkbox:i%2===0}))];
}

export function createGridEditorMatrix(container, records=editorMatrixRecords()) {
  const data=new DataStore(), view=new DataView({data}), treeView=new TreeDataView({data,expandedIds:['cases']});
  const owner=new Panel({name:'editorMatrix',css:'editor-matrix',scroll:'hidden'});
  const live=new Map(), counters={cellChange:0,editCommit:0,editReject:0,storeChange:0};
  let selectedId='empty',disabled=false,dark=false,background=0,queued=false,radioSequence=0;
  const alive=()=>!owner.destroyed;
  owner.disposables.add(()=>data.destroy());owner.disposables.add(()=>view.destroy());owner.disposables.add(()=>treeView.destroy());
  try {
    owner.mount(container);
    data.parse(records,{silent:true,origin:'import'});view.setFilter(row=>row.parentId!=null,{silent:true});
    const inspector=new ReadonlyText({name:'matrixValues',css:'editor-matrix__values',text:''});
    const status=new ReadonlyText({name:'matrixStatus',css:'editor-matrix__status',role:'status',text:'Ready'});
    const schedule=()=>{if(!queued&&alive()){queued=true;queueMicrotask(()=>{queued=false;if(alive())renderValues()})}};
    const options=kind=>({
      ...(kind==='number'?{step:'any',clamp:false,validators:[v=>v==null||Number.isFinite(v)&&Math.abs(v)<=100||'Use a number from -100 to 100']}:{}),
      ...(kind==='text'?{validators:[v=>!String(v).startsWith('!')||'Text cannot start with !']}:{}),
      ...(kind==='select'?{items:choices,searchable:true,emptyValue:null,placeholder:'Empty',popupWidth:220}:{}),
      ...(kind==='radio'?{layout:'flow',items:radioChoices}:{}),
      ...(kind==='date'?{validators:[v=>v===''||/^\d{4}-\d{2}-\d{2}$/.test(v)||'Use YYYY-MM-DD']}:{}),
      onChange:schedule
    });
    const checkboxIndicator = value => {
      // CheckBox's stock primitive is a native checkbox. Read mode owns only
      // inert DOM; the live CheckBox Control is mounted by its editor adapter.
      const visual=document.createElement('span');
      visual.className='editor-matrix__checkbox-indicator';
      visual.setAttribute('role','img');visual.setAttribute('aria-label',value===true?'Checked':'Unchecked');
      const input=document.createElement('input');input.type='checkbox';
      input.className='dui-checkbox__box';input.checked=value===true;
      input.disabled=true;input.tabIndex=-1;input.setAttribute('aria-hidden','true');
      visual.append(input);return visual;
    };
    const radioIndicator = (value,row,prefix) => {
      const visual=document.createElement('span');visual.className='editor-matrix__radio-indicator';
      visual.setAttribute('role','img');
      const selected=radioChoices.find(option=>Object.is(option.value,value));
      visual.setAttribute('aria-label',`Options N / Y; selected ${selected?.text ?? 'none'}`);
      const name=`${prefix}-${encodeURIComponent(typeof data.idOf(row)+':'+String(data.idOf(row)))}`;
      for(const option of radioChoices){
        const item=document.createElement('span');item.className='dui-radio-group__item';
        item.classList.toggle('dui-radio-group__item--selected',Object.is(option.value,value));
        const input=document.createElement('input');input.type='radio';input.name=name;
        input.className='dui-radio-group__input';input.checked=Object.is(option.value,value);
        input.disabled=true;input.tabIndex=-1;input.setAttribute('aria-hidden','true');
        const dot=document.createElement('span');dot.className='dui-radio-group__visual';dot.setAttribute('aria-hidden','true');
        const text=document.createElement('span');text.className='dui-radio-group__text';text.textContent=option.text;
        item.append(input,dot,text);visual.append(item);
      }
      return visual;
    };
    const columns=()=>{const radioPrefix=`${owner.id}-radio-${++radioSequence}`;return [
      {id:'name',title:'Case',width:212,frozen:'left',readOnly:true},
      ...editorKinds.map(kind=>{
        const factory=gridEditors[kind](options(kind));
        const editor=createGridEditorFactory(context=>{
          const adapter=factory.createCellEditor(context),entry={adapter,id:context.id,kind,source:context.source};
          live.set(context.source,entry);adapter.control.disposables.add(()=>{if(live.get(context.source)===entry)live.delete(context.source);schedule()});schedule();return adapter;
        },{activation:['checkbox','switch'].includes(kind)?'edit':factory.activation,filterType:factory.filterType});
        return {id:kind,title:({checkbox:'Check',switch:'Switch',dateTime:'Date + time'})[kind]??kind,width:({text:190,number:86,select:126,checkbox:66,switch:62,date:132,time:160,dateTime:180,radio:96})[kind],
          minWidth:({text:64,number:64,select:80,checkbox:44,switch:54,date:128,time:156,dateTime:156,radio:96})[kind],
          editor,readOnly:row=>row.parentId==null||row.readOnly===true,
          ...(kind==='switch'?{render:(value,row)=>row.parentId==null?'':Switch.createIndicator(value===true,{className:'dui-grid__switch-indicator',ariaLabel:value===true?'On':'Off'})}:kind==='checkbox'?{render:(value,row)=>row.parentId==null?'':checkboxIndicator(value)}:kind==='radio'?{render:(value,row)=>row.parentId==null?'':radioIndicator(value,row,radioPrefix)}:{render:(value,row)=>row.parentId==null?'':kind==='number'&&typeof value==='number'?value.toFixed(2):String(value)})};
      })]};
    const grid=new Grid({name:'matrixGrid',css:'editor-matrix__grid',height:'100%',width:'100%',rowHeight:24,data,view,columns:columns(),multiSelect:true,rowRangeSelection:true,rangeSelection:false});
    const tree=new TreeGrid({name:'matrixTree',css:'editor-matrix__tree',height:'100%',width:'100%',rowHeight:24,data,treeView,treeColumnId:'name',columns:columns(),multiSelect:true,rowRangeSelection:true});
    for(const [kind,table]of [['Grid',grid],['TreeGrid',tree]]){
      for(const event of ['cellChange','editCommit','editReject'])owner.disposables.add(table.events.on(event,e=>{counters[event]++;if(alive())status.setText(`${kind}: ${event} ${e.columnId}${e.reason?' / '+e.reason:''}`);schedule()}));
      owner.disposables.add(table.events.on('selectionChange',()=>{const id=table.getSelectedIds()[0];if(id!=null)selectedId=id;schedule()}));
      owner.disposables.add(table.events.on('editStart',e=>{selectedId=e.id;schedule()}));
      owner.disposables.add(table.events.on('editCancel',schedule));
    }
    owner.disposables.add(data.events.on('change',()=>{counters.storeChange++;schedule()}));
    owner.disposables.add(data.events.on('invalidate',schedule));
    const typed=value=>`${value===null?'null':typeof value}: ${value===undefined?'undefined':JSON.stringify(value)}`;
    function renderValues(){
      const row=data.get(selectedId),lines=[`Record: ${selectedId}`, ...editorKinds.map(key=>`${key.padEnd(9)} ${typed(row?.[key])}`),'','Live drafts:'];
      for(const [source,{adapter,id,kind}]of live)if(!adapter.destroyed)lines.push(`${source===grid?'Grid':'TreeGrid'} ${id}.${kind}\n  ${typed(adapter.getValue())}`);
      if(!live.size)lines.push('(none)');lines.push('',...Object.entries(counters).map(([k,v])=>`${k}: ${v}`));inspector.setText(lines.join('\n'));
    }
    const toolbar=new Panel({css:'editor-matrix__toolbar'}),body=new Panel({css:'editor-matrix__body'}),tables=new Panel({css:'editor-matrix__tables'}),side=new Panel({css:'editor-matrix__side',scroll:'auto'});
    owner.add(new LabelText({text:'Grid editor matrix',css:'editor-matrix__title'}),toolbar,body,status);
    body.add(tables,side);
    const gridPane=new Panel({css:'editor-matrix__pane'}),treePane=new Panel({css:'editor-matrix__pane'});tables.add(gridPane,treePane);
    gridPane.add(new LabelText({text:'Grid - 24px rows',css:'editor-matrix__caption'}),grid);treePane.add(new LabelText({text:'TreeGrid - same store, separate view',css:'editor-matrix__caption'}),tree);
    side.add(new LabelText({text:'Raw values / types / draft',css:'editor-matrix__caption'}),inspector,
      new ReadonlyText({css:'editor-matrix__limits',text:'Enter/F2: edit; Escape: cancel; Tab: commit and move. ArrowDown opens Select; popup Enter chooses, next Enter commits. First Escape closes popup. Radio uses two short flow choices. Color has no built-in factory. Multiline, files and complex pickers need an explicit application popup/dialog, not a short inline cell.'}));
    toolbar.add(new Button({text:'Grid',onClick:()=>grid.focus()}),new Button({text:'Tree',onClick:()=>tree.focus()}),
      new Button({text:'Silent background',onClick:()=>{data.update('decimal',{name:`Background update ${++background}`},{silent:true,origin:'system'});if(alive())status.setText('Silent background: unrelated field; current drafts retained')}}),
      new Button({text:'Reload records',onClick:()=>data.parse(editorMatrixRecords(),{origin:'import'})}),
      new Button({text:'Remove selected',onClick:()=>{if(selectedId!=='cases')data.remove(selectedId)}}),
      new Button({text:'Disable / enable',onClick:()=>{disabled=!disabled;for(const table of [grid,tree]){if(!alive())break;disabled?table.disable():table.enable()}if(alive())status.setText(disabled?'Tables disabled':'Tables enabled')}}),
      new Button({text:'Light / dark',onClick:()=>{dark=!dark;document.body.classList.toggle('dui-theme-light-blue',!dark);document.body.classList.toggle('dui-theme-dark-blue',dark)}}));
    grid.setSelectedIds(['empty']);tree.setSelectedIds(['empty']);renderValues();
    return {owner,data,view,treeView,grid,tree,counters,live,editorKinds,select(id){if(!alive())return;selectedId=id;grid.setSelectedIds([id]);if(!alive())return;tree.setSelectedIds([id]);schedule()},destroy(){owner.destroy()}};
  }catch(error){owner.destroy();throw error}
}
