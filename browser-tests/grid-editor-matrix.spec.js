import {test,expect} from '@playwright/test';
const kinds=['text','number','checkbox','switch','select','date','time','dateTime','radio'];
const initial={text:null,number:0,checkbox:false,switch:false,select:0,date:'2026-10-31',time:'00:00',dateTime:'2026-10-31T00:00',radio:false};
const changed={text:'Edited long text',number:-2.75,checkbox:true,switch:true,select:'ready',date:'2026-11-01',time:'16:45',dateTime:'2026-11-01T16:45',radio:true};
const popup=page=>page.locator('.dui-overlay-root > .dui-dropdown-list__popup:visible, .dui-overlay-root > .dui-date-time-picker:visible, .dui-overlay-root > .dui-time-picker:visible');
async function mount(page,facade,kind,extra={}){
 await page.goto('/browser-tests/recipes.html');
 await page.evaluate(async({facade,kind,initial,extra})=>{
 const ui=await import('/src/ui/grid-api.js');
 const options=kind==='select'?{searchable:true,emptyValue:null,popupWidth:220,items:[{id:0,text:'Zero'},{id:'ready',text:'Ready'}]}:kind==='radio'?{layout:'flow',items:[{value:false,text:'N'},{value:true,text:'Y'}]}:kind==='number'?{clamp:false,step:'any'}:{};
 const f=ui.gridEditors[kind]({...options,...extra.options,...(extra.validation?{validators:[v=>v.length>=3||'At least three characters']}:{})});
 const editor=ui.createGridEditorFactory(context=>{window.ed=f.createCellEditor(context);return ed},{activation:f.activation,filterType:f.filterType});
 window.grid=new ui[facade]('#root',{width:460,height:220,rowHeight:extra.rowHeight??24,treeColumnId:'label',columns:[{id:'label',width:100,readOnly:true},{id:'value',width:extra.width??160,editor},{id:'tail',width:90,editor:ui.gridEditors.text()}]});
 grid.data.parse(Array.from({length:extra.rows??3},(_,i)=>({id:i+1,parentId:null,label:`Row ${i+1}`,value:Object.hasOwn(extra,'value')?extra.value:initial[kind],tail:'Tail'})));
 window.writes=[];window.events=[];grid.data.events.on('change',e=>writes.push(e.type));
 for(const name of ['cellChange','editCommit','editCancel','editReject'])grid.events.on(name,e=>events.push({name,columnId:e.columnId,reason:e.reason,newValue:e.newValue}));
 },{facade,kind,initial,extra});
}
async function start(page,id=1){expect(await page.evaluate(id=>grid.startEdit(id,'value'),id)).toBe(true);await page.waitForFunction(()=>ed.element?.contains(document.activeElement));}
async function openPopup(page,kind){if(kind==='select')await page.locator('.dui-dropdown-list__display').press('ArrowDown');else await page.locator('.dui-date-time-input__button').click();await expect(popup(page)).toHaveCount(1);}
test.beforeEach(({page})=>page.on('pageerror',error=>{throw error}));
for(const facade of ['Grid','TreeGrid']){
 for(const kind of kinds)test(`${facade} ${kind} actual input preserves typed commit cancel and parse`,async({page})=>{
  await mount(page,facade,kind);await start(page);
  if(kind==='select'){
   await openPopup(page,kind);await page.locator('.dui-dropdown-list__search').press('End');await page.keyboard.press('Enter');await expect(popup(page)).toHaveCount(0);
  }else if(kind==='checkbox')await page.locator('.dui-grid__editor-host input[type=checkbox]').check();
  else if(kind==='switch')await page.locator('.dui-grid__editor-host .dui-switch__visual').click();
  else if(kind==='radio')await page.locator('.dui-radio-group__content').press('End');
  else await page.locator('.dui-grid__editor-host input').fill(String(changed[kind]));
  await page.keyboard.press('Enter');await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
  expect(await page.evaluate(()=>grid.data.get(1).value)).toEqual(changed[kind]);
  expect(await page.evaluate(()=>events.map(e=>e.name))).toEqual(['cellChange','editCommit']);expect(await page.evaluate(()=>writes.length)).toBe(1);
  await start(page);await page.evaluate(v=>ed.control.value.set(v),initial[kind]);await page.keyboard.press('Escape');
  await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);expect(await page.evaluate(()=>grid.data.get(1).value)).toEqual(changed[kind]);
  expect(await page.evaluate(()=>events.map(e=>e.name))).toEqual(['cellChange','editCommit','editCancel']);
  await page.evaluate(()=>grid.data.parse(grid.data.all().map(x=>({...x})),{silent:true,origin:'import'}));
  expect(await page.evaluate(()=>({value:grid.data.get(1).value,type:typeof grid.data.get(1).value}))).toEqual({value:changed[kind],type:typeof changed[kind]});await page.evaluate(()=>grid.destroy());
 });
 test(`${facade} boolean pointer focus respects an application target-click callback`,async({page},testInfo)=>{
  for(const kind of ['checkbox','switch']){
   await mount(page,facade,kind);await start(page);
   await page.evaluate(()=>{const action=document.createElement('button');window.applicationAction=action;action.textContent='Application action';document.body.append(action);window.booleanFocusTrace=[];window.focusTraceAbort=new AbortController();for(const type of ['pointerdown','mousedown','focusin','click','change'])document.addEventListener(type,event=>booleanFocusTrace.push({type,target:event.target.className||event.target.tagName,active:document.activeElement===action?'application':document.activeElement?.className}),{signal:focusTraceAbort.signal});const input=ed.element.querySelector('input'),nativeFocus=input.focus.bind(input);input.focus=(...args)=>{booleanFocusTrace.push({type:'input-focus-call',stack:new Error().stack,activationPending:grid._editing?.focusFrame??null});return nativeFocus(...args)};input.addEventListener('click',()=>{action.focus();booleanFocusTrace.push({type:'application-focus',active:document.activeElement===action?'application':'other'})})});
   if(kind==='checkbox')await page.locator('.dui-grid__editor-host input[type=checkbox]').check();
   else await page.locator('.dui-grid__editor-host .dui-switch__visual').click();
   try { await expect(page.getByRole('button',{name:'Application action',exact:true})).toBeFocused(); } finally { await testInfo.attach(`${kind}-focus-order`,{contentType:'application/json',body:JSON.stringify(await page.evaluate(()=>booleanFocusTrace))}); }
   expect(await page.evaluate(()=>({draft:ed.getValue(),value:grid.data.get(1).value,writes:writes.length}))).toEqual({draft:true,value:false,writes:0});
   await page.evaluate(()=>{grid.cancelEdit();grid.destroy();applicationAction.remove();focusTraceAbort.abort()});
  }
 });
 test(`${facade} nullable number and explicit null Select keep zero false and emptiness distinct`,async({page})=>{
  for(const value of [null,undefined,'',0,-2.75]){await mount(page,facade,'number',{value});await start(page);await page.locator('.dui-grid__editor-host input').fill('');await page.keyboard.press('Enter');expect(await page.evaluate(()=>grid.data.get(1).value)).toBeNull();await page.evaluate(()=>grid.destroy());}
  await mount(page,facade,'select',{value:null});await start(page);await page.keyboard.press('Enter');expect(await page.evaluate(()=>grid.data.get(1).value)).toBeNull();expect(await page.evaluate(()=>writes.length)).toBe(0);await page.evaluate(()=>grid.destroy());
 });
 test(`${facade} Select popup keys commit traverse cancel and ignore IME/prevented keys`,async({page})=>{
  await mount(page,facade,'select');await start(page);await openPopup(page,'select');
  const input=page.locator('.dui-dropdown-list__search');
  for(const flags of [{isComposing:true},{keyCode:229},{prevented:true}]){
   await input.evaluate((input,flags)=>{const e=new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true,...flags});if(flags.prevented)e.preventDefault();input.dispatchEvent(e)},flags);
   await expect(popup(page)).toHaveCount(1);expect(await page.evaluate(()=>ed.getValue())).toBe(0);
  }
  await page.keyboard.press('Escape');await expect(popup(page)).toHaveCount(0);await expect(page.locator('.dui-dropdown-list__display')).toBeFocused();
  await page.keyboard.press('Escape');await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
  for(const [key,column]of [['Tab','tail'],['Shift+Tab','tail']]){
   await start(page,key==='Tab'?1:2);await openPopup(page,'select');await input.press('End');await input.press('Enter');await openPopup(page,'select');await input.press(key);
   await expect(popup(page)).toHaveCount(0);expect(await page.evaluate(()=>grid._editing.column.id)).toBe(column);
   expect(await page.evaluate(()=>grid._editing.id)).toBe(key==='Tab'?1:1);await page.keyboard.press('Escape');
  }await page.evaluate(()=>grid.destroy());
 });
 test(`${facade} number/date IME and consumed keys cannot spin or open a picker`,async({page})=>{
  for(const kind of ['number','date','time','dateTime']){
   await mount(page,facade,kind);await start(page);const before=await page.evaluate(()=>ed.getValue());
   for(const flags of [{isComposing:true},{keyCode:229},{prevented:true}])await page.locator('.dui-grid__editor-host input').evaluate((input,{kind,flags})=>{const e=new KeyboardEvent('keydown',{key:kind==='number'?'ArrowUp':'ArrowDown',altKey:kind!=='number',bubbles:true,cancelable:true,...flags});if(flags.prevented)e.preventDefault();input.dispatchEvent(e)},{kind,flags});
   expect(await page.evaluate(()=>ed.getValue())).toEqual(before);await expect(popup(page)).toHaveCount(0);await page.keyboard.press('Escape');await page.evaluate(()=>grid.destroy());
  }
 });
 test(`${facade} picker Escape and apply restore the cell input`,async({page})=>{
  for(const kind of ['date','time','dateTime']){
   await mount(page,facade,kind);await start(page);await openPopup(page,kind);
   await popup(page).locator('button').first().focus();await page.keyboard.press('Escape');
   await expect(popup(page)).toHaveCount(0);await expect(page.locator('.dui-grid__editor-host input')).toBeFocused();
   await openPopup(page,kind);
   if(kind==='date')await popup(page).locator('.dui-date-time-picker__day:not(:disabled)').first().click();
   else await popup(page).getByRole('button',{name:'OK',exact:true}).click();
   await expect(popup(page)).toHaveCount(0);await expect(page.locator('.dui-grid__editor-host input')).toBeFocused();
   await page.keyboard.press('Escape');await page.evaluate(()=>grid.destroy());
  }
 });
 test(`${facade} validation and background/silent writes keep live draft and focused editor`,async({page})=>{
  await mount(page,facade,'text',{value:'Old',validation:true});await start(page);const input=page.locator('.dui-grid__editor-host input');await input.fill('x');await input.press('Tab');await expect(input).toBeFocused();await expect(input).toHaveValue('x');expect(await page.evaluate(()=>grid.data.get(1).value)).toBe('Old');
  await page.evaluate(()=>grid.data.update(2,{tail:'background'},{silent:true}));await expect(input).toHaveValue('x');await expect(input).toBeFocused();
  await input.fill('Valid');expect(await page.evaluate(()=>grid.commitEdit({silent:true}))).toBe(true);expect(await page.evaluate(()=>grid.data.get(1).value)).toBe('Valid');expect(await page.evaluate(()=>events.map(e=>e.name))).toEqual(['editReject']);
  await start(page);await page.evaluate(()=>grid.data.parse(grid.data.all().map(x=>({...x})),{silent:true}));await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
  await start(page);await page.evaluate(()=>grid.data.remove(1,{silent:true}));await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);await expect(popup(page)).toHaveCount(0);await page.evaluate(()=>grid.destroy());
 });
 test(`${facade} picker close callback may destroy the table without touching detached DOM`,async({page})=>{
  for(const kind of ['date','time','dateTime']){
   await mount(page,facade,kind);await start(page);await openPopup(page,kind);
   await page.evaluate(async()=>{const {overlayManager}=await import('/src/core/OverlayManager.js');overlayManager.events.on('close',e=>{if(e.overlay===ed.control)grid.destroy()})});
   await page.keyboard.press('Escape');expect(await page.evaluate(()=>grid.destroyed)).toBe(true);await expect(popup(page)).toHaveCount(0);await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
  }
 });
 test(`${facade} disabling an open editor releases its popup without a write`,async({page})=>{
  await mount(page,facade,'select');await start(page);await openPopup(page,'select');
  await page.evaluate(()=>grid.disable());await expect(popup(page)).toHaveCount(0);await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
  expect(await page.evaluate(()=>({value:grid.data.get(1).value,events,writes}))).toEqual({value:0,events:[],writes:[]});
  await page.evaluate(()=>grid.enable());await start(page);
  await page.evaluate(()=>{const destroy=ed.destroy.bind(ed);ed.destroy=()=>{destroy();grid.enable()};grid.disable()});
  expect(await page.evaluate(()=>({disabled:grid.disabled,tabIndex:grid.element.tabIndex}))).toEqual({disabled:false,tabIndex:0});
  await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);await page.evaluate(()=>grid.destroy());
 });
 test(`${facade} all single-line built-ins retain 22/24px row and marker geometry`,async({page})=>{
  const widths={text:64,number:64,checkbox:44,switch:44,select:80,date:128,time:156,dateTime:156,radio:96};
  for(const rowHeight of [22,24])for(const kind of kinds){await mount(page,facade,kind,{width:widths[kind],rowHeight,rows:100});await page.evaluate(()=>grid.setSelectedIds([1]));const before=await page.locator('[data-dui-grid-row-id="number:1"]').boundingBox();await start(page);
   const geometry=await page.evaluate(()=>{const cell=document.querySelector('.dui-grid__cell--editing'),row=cell.parentElement,r=row.getBoundingClientRect(),c=cell.getBoundingClientRect(),root=ed.element.getBoundingClientRect(),g=row.querySelector('[data-dui-grid-indicator]'),s=getComputedStyle(g,'::before');return {height:r.height,cellHeight:c.height,rootBottom:root.bottom,cellBottom:c.bottom,rootRight:root.right,cellRight:c.right,marker:s.content,gutter:g.getBoundingClientRect().width}});
   expect(geometry.height).toBe(before.height);expect(geometry.height).toBe(rowHeight);expect(geometry.rootBottom).toBeLessThanOrEqual(geometry.cellBottom+0.5);expect(geometry.rootRight).toBeLessThanOrEqual(geometry.cellRight+0.5);expect(geometry.gutter).toBe(10);expect(geometry.marker).not.toMatch(/^(none|normal)$/);if(kind==='time'){const parts=await page.evaluate(()=>{const input=ed.element.querySelector('input').getBoundingClientRect(),button=ed.element.querySelector('.dui-date-time-input__button').getBoundingClientRect(),last=ed.element.querySelector('.dui-date-time-input__step:last-child').getBoundingClientRect();return {inputWidth:input.width,inputRight:input.right,buttonLeft:button.left,lastRight:last.right}});expect(parts.inputWidth).toBeGreaterThanOrEqual(40);expect(parts.inputRight).toBeLessThanOrEqual(parts.buttonLeft+0.5);expect(parts.lastRight).toBeLessThanOrEqual(geometry.cellRight+0.5)}
   await page.keyboard.press('Escape');await page.evaluate(()=>grid.destroy());
  }
 });
 for(const kind of ['select','date','time','dateTime'])test(`${facade} ${kind} popup bounds resize scroll and teardown`,async({page})=>{
  await mount(page,facade,kind,{rows:100,width:190});await page.setViewportSize({width:760,height:600});
  for(const [left,top]of [[4,4],[296,4],[4,376],[296,376]]){
   await page.locator('#root').evaluate((r,{left,top})=>Object.assign(r.style,{position:'fixed',left:`${left}px`,top:`${top}px`,overflow:'hidden',width:'460px',height:'220px'}),{left,top});
   await start(page);await openPopup(page,kind);const p=popup(page),box=await p.boundingBox();expect(box.x).toBeGreaterThanOrEqual(3);expect(box.y).toBeGreaterThanOrEqual(3);expect(box.x+box.width).toBeLessThanOrEqual(757);expect(box.y+box.height).toBeLessThanOrEqual(597);
   await page.keyboard.press('Escape');await expect(popup(page)).toHaveCount(0);await page.keyboard.press('Escape');await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
  }
  await page.locator('#root').evaluate(r=>Object.assign(r.style,{left:'4px',top:'4px'}));await start(page);await openPopup(page,kind);
  await page.evaluate(()=>grid.columnModel.setWidth('label',160));await page.evaluate(async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame)});
  const positioned=await page.evaluate(kind=>{const c=ed.control,p=c._popupElement??c._picker,group=c._group,a=group.getBoundingClientRect(),r=p.getBoundingClientRect();return {actual:r.left,expected:Math.max(4,Math.min(kind==='select'?a.left:a.right-r.width,innerWidth-r.width-4))}},kind);
  expect(Math.abs(positioned.actual-positioned.expected)).toBeLessThan(2);
  await page.locator('.dui-grid__body').evaluate(el=>{el.scrollTop=100});await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);await expect(popup(page)).toHaveCount(0);
  await start(page,2);await openPopup(page,kind);await page.evaluate(()=>grid.destroy());await expect(popup(page)).toHaveCount(0);expect(await page.evaluate(()=>ed.destroyed)).toBe(true);
 });

 test(`${facade} boolean label fallback runs after input handlers rather than on the visual click`,async({page})=>{
  await mount(page,facade,'switch');await start(page);
  await page.evaluate(()=>{
   const action=document.createElement('button');action.textContent='Label application action';document.body.append(action);window.labelAction=action;window.labelFocusCalls=[];window.labelPhase=null;window.labelInputClicks=0;window.labelDraftChanges=0;ed.control.events.on('change',()=>labelDraftChanges++);
   const input=ed.element.querySelector('input'),focus=ed.control.focus.bind(ed.control);
   ed.control.focus=(...args)=>{labelFocusCalls.push(labelPhase);return focus(...args)};
   ed.element.addEventListener('click',event=>{labelPhase=event.target===input?'input':'visual';if(labelPhase==='visual')grid._body.focus()},{capture:true});
   input.addEventListener('click',()=>{labelInputClicks++;action.focus()});
  });
  await page.locator('.dui-grid__editor-host .dui-switch__visual').click();
  expect(await page.evaluate(()=>labelFocusCalls.filter(phase=>phase==='visual'))).toEqual([]);
  await expect(page.getByRole('button',{name:'Label application action',exact:true})).toBeFocused();
  expect(await page.evaluate(()=>({draft:ed.getValue(),value:grid.data.get(1).value,writes:writes.length,clicks:labelInputClicks,changes:labelDraftChanges}))).toEqual({draft:true,value:false,writes:0,clicks:1,changes:1});
  await page.evaluate(()=>{grid.cancelEdit();grid.destroy();labelAction.remove()});
  await mount(page,facade,'switch');await start(page);
  await page.evaluate(()=>{
   const input=ed.element.querySelector('input');window.inputFallbacks=0;const focus=ed.control.focus.bind(ed.control);
   ed.control.focus=(...args)=>{inputFallbacks++;return focus(...args)};
   input.addEventListener('click',()=>grid._body.focus(),{capture:true});
  });
  await page.locator('.dui-grid__editor-host .dui-switch__visual').click();
  await expect(page.locator('.dui-grid__editor-host input')).toBeFocused();
  expect(await page.evaluate(()=>inputFallbacks)).toBeGreaterThan(0);
  await page.keyboard.press('Enter');expect(await page.evaluate(()=>({value:grid.data.get(1).value,writes:writes.length,commits:events.filter(x=>x.name==='editCommit').length}))).toEqual({value:true,writes:1,commits:1});
  await page.evaluate(()=>grid.destroy());
  await mount(page,facade,'switch');await start(page);
  await page.evaluate(()=>ed.element.querySelector('input').addEventListener('click',()=>grid.destroy()));
  await page.locator('.dui-grid__editor-host .dui-switch__visual').click();
  await expect(page.locator('#root > *')).toHaveCount(0);expect(await page.evaluate(()=>ed.destroyed)).toBe(true);
 });

}
