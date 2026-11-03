import { Panel, Form, TextInput, NumberInput, CheckBox, Button, LabelText, Grid, TreeList, PropertyGrid } from '../../src/ui/all.js';
const owners=[];
const definitions=[{name:'Segoe UI',family:'Compare Segoe',system:true},{name:'Noto Sans',family:'Compare Noto'},{name:'Roboto',family:'Compare Roboto'}];
const probe='William Miller / Project 0123456789';
const board=document.querySelector('#comparison');
const toolbar=new Panel('#actions');owners.push(toolbar);
toolbar.add(new Button({text:'Light / dark theme',onClick:()=>{
 document.body.classList.toggle('dui-theme-dark-blue');document.body.classList.toggle('dui-theme-light-blue');
}}));
function section(parent,title) {
 const heading=document.createElement('h3');heading.textContent=title;
 const host=document.createElement('div');host.className='font-host';parent.append(heading,host);return host;
}
function buildSample(definition,loaded) {
 const card=document.createElement('section');card.className='font-sample';card.dataset.font=definition.name;
 card.style.setProperty('--dui-font-family',`"${definition.family}", Arial, sans-serif`);
 const heading=document.createElement('h2');heading.textContent=definition.name;
 const status=document.createElement('div');status.className='font-status';
 status.textContent=loaded ? (definition.system?'Local Segoe UI is available.':'Local font file loaded.') : 'Font unavailable: Arial fallback shown. Do not use this column for comparison.';
 card.dataset.loaded=String(loaded);card.append(heading,status);board.append(card);
 const sample=new LabelText(section(card,'Letters, numbers and weights'),{text:'Il1 | O0 | rn m | 0123456789\nMW mw | Aa Gg Qq | 1,234.56\nThe quick brown fox jumps over the lazy dog.',css:'font-specimen'});owners.push(sample);
 const weights=document.createElement('div');weights.className='font-specimen';
 for(const weight of [400,600,700]) {const line=document.createElement('div');line.style.fontWeight=weight;line.textContent=`${weight}: File 101 — Document 101 — $1,234.56`;weights.append(line);}card.append(weights);
 const form=new Form(section(card,'Form — editing and selection'),{labelWidth:100,width:'100%'}).row(
  new TextInput({name:'name',label:'Name',value:'William Miller'})
 ).row(new TextInput({name:'path',label:'Path',value:'C:/Projects/Documentation/A very long file name.txt'}))
 .row(new NumberInput({name:'amount',label:'Amount',value:1234.56}))
 .row(new CheckBox({name:'active',label:'Active',text:'Enabled',value:true}));owners.push(form);
 const actions=new Panel(section(card,'Buttons'));actions.element.classList.add('font-buttons');actions.add(new Button({text:'Save'}),new Button({text:'Cancel'}),new Button({text:'Settings'}));owners.push(actions);
 const grid=new Grid(section(card,'Grid — 22 px'),{height:160,width:'100%',columnMenu:false,columns:[{id:'name',title:'Name',width:195},{id:'code',title:'Code',width:90},{id:'count',title:'Qty',width:55,align:'right'}]});
 grid.data.parse([{id:1,name:'William Miller',code:'Il1-O0',count:101},{id:2,name:'Alex Johnson',code:'AJ-01',count:108},{id:3,name:'Photography — updated file',code:'RN-m',count:999},{id:4,name:'Documentation',code:'DOC-7',count:1234},{id:5,name:'Minimum / Maximum',code:'00-88',count:56}]);owners.push(grid);
 const tree=new TreeList(section(card,'Tree — levels and long labels'),{height:160,width:'100%',nodeReorder:false,label:'Files'});
 tree.data.parse([{id:'project',parentId:null,text:'Project',icon:'folder'},{id:'docs',parentId:'project',text:'Documentation',icon:'folder'},{id:'readme',parentId:'docs',text:'README — instructions.txt',icon:'file'},{id:'long',parentId:'docs',text:'A very long document name — revision 101.txt',icon:'file'},{id:'archive',parentId:null,text:'Archive',icon:'folder'}]);tree.expandAll();owners.push(tree);
 const values={name:'William',code:'Il1-O0-rn',count:1234,enabled:true};
 const properties=new PropertyGrid(section(card,'PropertyGrid — labels and values'),{labelWidth:145,height:170,width:'100%'});
 properties.bind({getProperties(){return [{name:'general',title:'General',properties:[{name:'name',label:'Name',type:'string',value:values.name},{name:'code',label:'Code',type:'string',value:values.code},{name:'count',label:'Count',type:'integer',value:values.count},{name:'enabled',label:'Enabled',type:'boolean',value:values.enabled}]}];},setProperty(name,value){values[name]=value;}});owners.push(properties);
}
try {
 for(const definition of definitions) {
  let loaded=false;
  try {const faces=await Promise.all([400,600,700].map(weight=>document.fonts.load(`${weight} 12px "${definition.family}"`,probe)));loaded=faces.every(list=>list.length>0 && list.every(face=>face.status==='loaded'));}catch{}
  buildSample(definition,loaded);
 }
 document.querySelector('#load-status').textContent='Ready. Compare text clipping, numbers and small labels; fields and trees are interactive.';
 document.body.dataset.ready='true';
}catch(error){document.querySelector('#load-status').textContent=`Error: ${error.message}`;throw error;}
window.addEventListener('pagehide',()=>owners.reverse().forEach(owner=>owner.destroy()),{once:true});
