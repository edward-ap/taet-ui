import {Panel, Form, Button, TextInput, TextArea, ReadonlyText, Toolbar, CommandRegistry, DataStore} from 'taet-ui';
import {TreeList, PropertyGrid, Menu, TabBar, Dialog, LabelText, List} from 'taet-ui/components';
import {DockLayout, DockPanel, MdiWorkspace} from 'taet-ui/advanced';

// Synthetic records; every collection write goes through the public DataStore API.
const records = new DataStore();
records.parse([
  {id:'project', parentId:null, text:'Northwind Desk', kind:'Project', caption:'Northwind Desk', enabled:true, width:960},
  {id:'forms', parentId:'project', text:'Forms', kind:'Folder', caption:'Forms', enabled:true, width:0},
  {id:'customer', parentId:'forms', text:'CustomerForm.pas', kind:'Form', caption:'Customer details', enabled:true, width:480},
  {id:'orders', parentId:'forms', text:'OrdersForm.pas', kind:'Form', caption:'Order browser', enabled:true, width:520},
  {id:'services', parentId:'project', text:'Services', kind:'Folder', caption:'Services', enabled:true, width:0},
  {id:'store', parentId:'services', text:'CustomerStore.pas', kind:'Unit', caption:'CustomerStore', enabled:true, width:0},
  {id:'theme', parentId:'project', text:'Theme.json', kind:'Resource', caption:'Ocean blue', enabled:true, width:0},
  {id:'readme', parentId:'project', text:'README.md', kind:'Document', caption:'Project notes', enabled:true, width:0}
]);
const sources = {
  customer:`unit CustomerForm;\n\ninterface\n\nuses Forms, Controls, Data;\n\ntype\n  TCustomerForm = class(TForm)\n    NameEdit: TTextInput;\n    EmailEdit: TTextInput;\n    SaveButton: TButton;\n    procedure SaveCustomer;\n  end;\n\nimplementation\n\nprocedure TCustomerForm.SaveCustomer;\nbegin\n  CustomerStore.Update(NameEdit.Value);\nend;\n\nend.`,
  orders:`unit OrdersForm;\n\ninterface\n\ntype\n  TOrdersForm = class(TForm)\n    procedure RefreshOrders;\n  end;\n\nimplementation\n\nprocedure TOrdersForm.RefreshOrders;\nbegin\n  Orders.LoadSampleData;\nend;\n\nend.`,
  store:`unit CustomerStore;\n\n// Deterministic local fixture; no remote service.\nconst\n  CustomerCount = 24;\n  Region = 'North';\n\nprocedure Update(const Name: string);\nbegin\n  WriteLn('Customer saved: ', Name);\nend;`
};
let selectedId=null, dark=false, build=0, dialog=null;
const documents = new Map();
const customerFixture={customer:'Ada North',email:'ada@example.test'};
const commands = new CommandRegistry();
const status = new LabelText('#status',{text:'Ready  ·  CustomerForm.pas  ·  UTF-8  ·  Local fixtures'});
const log = new LabelText({className:'output', text:'Atelier demo build (simulation) · local demonstration\n✓ Workspace loaded · 8 project items\n✓ CustomerForm.pas · designer ready\n0 errors · 0 warnings'});
const notify = text => status.setText(text);
const dock = new DockLayout('#desktop',{id:'ideDock',className:'screen-fill',leftSize:216,rightSize:268,bottomSize:145});
const explorer = dock.addPanel(new DockPanel({id:'explorer',title:'Project Explorer',area:'left',closeable:false}));
const tree = new TreeList({id:'projectTree',data:records,textField:'text',expandAll:true,itemHeight:25});
const explorerRoot=new Panel({className:'pane-stack'});explorer.add(explorerRoot);explorerRoot.add(new ReadonlyText({text:'PROJECT  /  8 ITEMS',className:'summary'}),tree);
const inspector = dock.addPanel(new DockPanel({id:'inspector',title:'Object Inspector',area:'right',closeable:false}));
const inspectorRoot = new Panel({className:'pane-stack'});
inspector.add(inspectorRoot);
const objectTitle = new ReadonlyText({className:'summary'});
const inspectorTabs = new TabBar({id:'inspectorTabs',tabs:[{id:'properties',text:'Properties'},{id:'events',text:'Events'}],activeId:'properties'});
const properties = new PropertyGrid({id:'properties',labelWidth:112,sortMode:'none',className:'pane-body'});
const events = new List({className:'pane-body',textField:'text',visible:false});
events.data.parse([{id:1,text:'OnCreate   → FormCreate'},{id:2,text:'OnClose    → (none)'},{id:3,text:'OnSave     → SaveCustomer'}]);
inspectorRoot.add(objectTitle,inspectorTabs,properties,events);
inspectorTabs.events.on('change',({id})=>{properties[id==='properties'?'show':'hide']();events[id==='events'?'show':'hide']();});
const center = dock.addPanel(new DockPanel({id:'editor',title:'Editor Workspace',area:'center',closeable:false,collapsible:false}));
const workspace = new MdiWorkspace({id:'mdi',className:'screen-fill workspace'});
center.add(workspace);
const bottom = dock.addPanel(new DockPanel({id:'output',title:'Build & Diagnostics',area:'bottom',closeable:false}));
const outputRoot = new Panel({className:'pane-stack'});
bottom.add(outputRoot);
const outputTabs = new TabBar({id:'outputTabs',tabs:[{id:'build',text:'Build Output'},{id:'tasks',text:'Tasks · 3'}],activeId:'build'});
const tasks = new List({textField:'text',visible:false});
tasks.data.parse([{id:1,text:'TODO  CustomerForm: validate email before save'},{id:2,text:'TODO  OrdersForm: add status filter'},{id:3,text:'NOTE  All records in this workspace are synthetic'}]);
outputRoot.add(outputTabs,log,tasks);
outputTabs.events.on('change',({id})=>{log[id==='build'?'show':'hide']();tasks[id==='tasks'?'show':'hide']();});

function bindProperties() {
  const item=records.get(selectedId);
  objectTitle.setText(`${item.text}\n${item.kind} · ${item.id}`);
  const field=(name,label,type,extra={})=>({name,label,type,value:item[name],...extra,set:value=>{
    records.update(item.id,{[name]:value});
    const doc=documents.get(item.id);
    if(name==='caption'&&doc) doc.title.setText(String(value));
    notify(`Modified ${item.text} · ${label} = ${value}`);
  }});
  properties.bind([{title:'Identity',properties:[field('text','Name','text'),field('caption','Caption','text'),{name:'kind',label:'Class',type:'text',value:item.kind,readOnly:true}]},
    {title:'Layout & behavior',properties:[field('width','Width','number',{min:0,max:1920}),field('enabled','Enabled','boolean'),{name:'parentId',label:'Parent',type:'text',value:item.parentId??'workspace',readOnly:true}]}]);
}
tree.selection.events.on('invalidate',({items})=>{const id=items[0]?.id??null;if(id===selectedId)return;selectedId=id;if(id)bindProperties();else{objectTitle.setText('No object selected');properties.clear();}});
tree.events.on('itemDblClick',({id})=>openDocument(id));
function openDocument(id=selectedId) {
  if(!sources[id]) {notify('Select a Pascal form or unit to open');return;}
  if(documents.has(id)){workspace.activateWindow(documents.get(id).window);return;}
  const item=records.get(id), index=documents.size;
  const window=workspace.addWindow({id:`doc-${id}`,title:item.text,x:id==='customer'?230:14+index*22,y:id==='customer'?56:16+index*25,width:id==='customer'?400:430,height:330,minWidth:300,minHeight:190});
  const body=new Panel({className:'document-body'});window.add(body);
  const tabs=new TabBar({tabs:[{id:'code',text:'Code'},{id:'design',text:'Design'}],activeId:id==='customer'?'design':'code'});
  const code=new TextArea({name:`source-${id}`,value:sources[id],css:'document-page code-editor',label:'',labelPosition:null,labelWidth:0,rows:18,acceptsTab:true,wordWrap:false,height:'100%'});
  const design=new Panel({className:'document-page designer'});
  body.add(tabs,code,design);
  const title=new ReadonlyText({text:item.caption,className:'design-title'});
  const form=new Form({className:'design-form',labelPosition:'top'}).row(title)
    .row(new TextInput({name:'customer',label:'Customer name',value:customerFixture.customer}))
    .row(new TextInput({name:'email',label:'Email address',value:customerFixture.email}))
    .row(new Button({text:'Save customer',onClick:()=>{Object.assign(customerFixture,form.value.get());notify('Customer fixture saved · '+customerFixture.customer);}}));
  design.add(new ReadonlyText({text:`${item.kind.toUpperCase()} DESIGNER  ·  100%`,className:'summary'}),form);
  const switchPage=()=>{const isCode=tabs.getActive()?.id==='code';code[isCode?'show':'hide']();design[isCode?'hide':'show']();};
  tabs.events.on('change',switchPage);switchPage();
  code.events.on('change',()=>{sources[id]=code.value.get();notify(`Editing ${item.text} · local draft`);});
  window.events.on('close',()=>{documents.delete(id);notify(`Closed ${item.text}`);});
  documents.set(id,{window,tabs,code,title});workspace.activateWindow(window);
}
workspace.events.on('activeWindowChange',({window})=>{if(!window)return;const id=window.id.replace('doc-','');if(records.get(id))tree.selection.set([records.get(id)]);});

function showRunDialog() {
  if(dialog?.isOpen()){dialog.focus();return;}
  const target=records.get(selectedId);
  const config=new Form({className:'dialog-content',labelPosition:'top'})
    .row(new ReadonlyText({text:'Run configuration',className:'design-title'}))
    .row(new ReadonlyText({text:`Target: ${target.text}\nProfile: Local Debug\nData: Deterministic fixtures`,className:'summary'}))
    .row(new TextInput({name:'arguments',label:'Program arguments',value:'--sample north'}));
  dialog=new Dialog({title:'Run · Northwind Desk',className:'side-dialog',width:290,content:config,destroyContent:true,draggable:false,closeOnOutsideClick:false,
    buttons:[{text:'Cancel',result:'cancel'},{text:'Run preview',result:'run',primary:true}]});
  dialog.events.on('close',({result})=>{notify(result==='run'?'Preview completed · 24 synthetic customers · 0 errors':'Run configuration dismissed');dialog.destroy();dialog=null;});
  dialog.open();
}
function toggleTheme() {
  dark=!dark;
  document.body.classList.toggle('dui-theme-light-blue',!dark);
  document.body.classList.toggle('dui-theme-dark-blue',dark);
  themeButton.setText(dark?'Light theme':'Dark theme');
}
const register=(id,label,run)=>commands.register(id,{label,run});
register('open','Open selected',()=>openDocument());
register('build','Build project',()=>{build++;log.setText(`Atelier demo build (simulation) · build #${build}\n✓ CustomerForm.pas · fixture checked\n✓ OrdersForm.pas · fixture checked\n✓ CustomerStore.pas · fixture linked\nSimulated build succeeded · 3 units · 0 errors · 0 warnings`);outputTabs.setActive('build');dock.expandPanel('output');notify(`Demo build #${build} succeeded · 3 units`);},'check');
register('run','Run configuration',showRunDialog,'play');
register('cascade','Cascade windows',()=>workspace.arrange('cascade'));
register('close','Close active document',()=>workspace.activeWindow?.close());
register('output','Toggle build panel',()=>dock.togglePanel('output'));
register('theme','Switch theme',toggleTheme);
const menu=new Menu('#menu',{commands,items:[{text:'File',items:[{command:'open'},{command:'close'}]},{text:'View',items:[{command:'output'},{command:'theme'}]},{text:'Project',items:[{command:'build'},{command:'run'}]},{text:'Window',items:[{command:'cascade'}]},{text:'Help',items:[{text:'About Atelier',onClick:()=>notify('Atelier · independent Tæt UI consumer experiment · synthetic records only')}]}]});
const toolbar=new Toolbar('#tools',{commands});
toolbar.addCommand('open',{showText:true}).addSeparator().addCommand('build',{showText:true}).addCommand('run',{showText:true}).addSeparator().addCommand('cascade',{showText:true}).addSpacer();
const themeButton=new Button({id:'themeButton',text:'Dark theme',onClick:toggleTheme});toolbar.add(themeButton);
openDocument('orders');openDocument('customer');tree.selection.set([records.get('customer')]);
// Public test handle contains app state and the actual controls, no implementation access.
window.atelier={records,dock,tree,properties,workspace,documents,outputTabs,inspectorTabs,commands,openDocument,showRunDialog,
  get dialog(){return dialog;},get selectedId(){return selectedId;},get dark(){return dark;},
  destroy(){dialog?.destroy();dock.destroy();menu.destroy();toolbar.destroy();status.destroy();commands.destroy();records.destroy();}};
