import { test, expect } from '@playwright/test';
test.beforeEach(async ({page})=>{page.on('pageerror',e=>{throw e});await page.goto('/browser-tests/recipes.html');});
test('Grid footer preserves a supplied Node and listeners across repeated repaint',async({page})=>{
 const result=await page.evaluate(async()=>{
  const {Grid}=await import('/src/ui/Grid.js');const button=document.createElement('button');button.textContent='Total';let clicks=0;button.onclick=()=>clicks++;
  const grid=new Grid({columns:[{id:'name',footer:button},{id:'amount',dataType:'number',summary:'total'}]}).mount('#root');grid.data.parse([{id:'a',name:'A',amount:2}]);grid.refresh();button.click();grid.data.update('a',{amount:7});grid.refresh();button.click();
  const result={same:document.querySelector('.dui-grid__footer button')===button,count:document.querySelectorAll('.dui-grid__footer button').length,clicks,total:grid.getColumnSummaryValue('amount')};grid.destroy();return {...result,detached:!button.isConnected};
 });expect(result).toEqual({same:true,count:1,clicks:2,total:'Total 7',detached:true});
});
test('Grid footer renders fresh fragments, text nodes and scalars without parsing HTML',async({page})=>{
 const result=await page.evaluate(async()=>{
  const {Grid}=await import('/src/ui/Grid.js');let n=1;window.footerInjected=false;const hostile='<img src=x onerror="window.footerInjected=true">';
  const grid=new Grid({columns:[{id:'fragment',footer:()=>{const f=document.createDocumentFragment();const b=document.createElement('b');b.textContent=String(n);f.append(b,document.createTextNode(' fragment'));return f;}},{id:'text',footer:document.createTextNode('Text node')},{id:'literal',footer:hostile},{id:'zero',footer:0},{id:'bool',footer:false},{id:'empty',footer:null}]}).mount('#root');grid.refresh();n=2;grid.refresh();
  const cells=Array.from(document.querySelectorAll('.dui-grid__footer-cell')).map(e=>e.textContent);const result={cells,bold:document.querySelector('.dui-grid__footer b')?.textContent,images:document.querySelectorAll('.dui-grid__footer img').length,injected:window.footerInjected};grid.destroy();return result;
 });expect(result).toEqual({cells:['2 fragment','Text node','<img src=x onerror="window.footerInjected=true">','0','false',''],bold:'2',images:0,injected:false});
});
for(const phase of ['connect','disconnect'])for(const action of ['destroy','replace'])test(`Grid footer custom element ${phase} ${action} interrupts stale paint`,async({page})=>{
 const result=await page.evaluate(async({phase,action})=>{
  const {Grid}=await import('/src/ui/Grid.js');let grid,armed=false,calls=0;const callback=()=>{if(!armed)return;armed=false;calls++;if(action==='destroy')grid.destroy();else grid.data.parse([{id:'new',name:'Current'}]);};
  customElements.define('footer-lifecycle-probe',class extends HTMLElement{connectedCallback(){if(phase==='connect')callback()}disconnectedCallback(){if(phase==='disconnect')callback()}});
  grid=new Grid({columns:[{id:'name',footer:()=>{const el=document.createElement('footer-lifecycle-probe');el.textContent='Node';return el;}},{id:'tail',footer:()=>grid?.data.get('new')?'Current footer':'Stale footer'}]}).mount('#root');grid.data.parse([{id:'old',name:'Old'}]);grid.refresh();armed=true;grid.refresh();await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
  const text=document.querySelector('#root').textContent;const result={calls,destroyed:grid.destroyed,stale:text.includes('Stale footer'),current:text.includes('Current footer')};grid.destroy();return result;
 },{phase,action});expect(result).toEqual({calls:1,destroyed:action==='destroy',stale:false,current:action==='replace'});
});

