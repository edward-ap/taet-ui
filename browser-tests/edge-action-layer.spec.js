import { test, expect } from '@playwright/test';
async function setup(page, edges = {left:{size:.25,indicator:'L'},right:{size:.25,indicator:'R'},top:{size:.2,indicator:'T'},bottom:{size:'24px',indicator:'B'}}) {
  page.on('pageerror', error => { throw error; });
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async edges => {
    const { EdgeActionLayer }=await import('/src/ui/experimental.js');
    window.EdgeActionLayer=EdgeActionLayer;
    document.querySelector('#root').innerHTML='<div id="surface" style="width:400px;height:240px;overflow:hidden"><button id="under" style="width:100%;height:100%">Underlying content</button></div>';
    window.hits=[];window.underHits=0;
    document.querySelector('#under').onclick=()=>underHits++;
    for(const [edge,config] of Object.entries(edges)) config.action=()=>hits.push(edge);
    window.layer=new EdgeActionLayer('#surface',edges);
  }, edges);
}
async function point(page,x,y,click=true) {
  const r=await page.locator('#surface').boundingBox();
  if(click) await page.mouse.click(r.x+x*r.width,r.y+y*r.height);
  else await page.mouse.move(r.x+x*r.width,r.y+y*r.height);
}
const zone = (page,edge) => page.locator(`.dui-edge-action-layer__zone--${edge}`);

test('small DOM, fractional geometry, resize and child transforms', async ({page}) => {
  await setup(page);
  await expect(page.locator('.dui-edge-action-layer > div')).toHaveCount(4);
  expect(await page.locator('.dui-edge-action-layer *').count()).toBe(8);
  expect((await zone(page,'left').boundingBox()).width).toBe(100);
  expect((await zone(page,'top').boundingBox()).height).toBe(48);
  expect((await zone(page,'bottom').boundingBox()).height).toBe(24);
  await page.evaluate(()=>{surface.style.width='600px';surface.style.height='300px';under.style.transform='scale(2)';});
  expect((await zone(page,'left').boundingBox()).width).toBe(150);
  expect((await zone(page,'top').boundingBox()).height).toBe(60);
  expect((await zone(page,'right').boundingBox()).width).toBe(150);
  await page.evaluate(()=>layer.setEdgeSize('left','64px'));
  expect((await zone(page,'left').boundingBox()).width).toBe(64);
  await page.evaluate(()=>layer.setEdgeEnabled('left',false));
  expect((await zone(page,'left').boundingBox()).width).toBe(0);
  expect((await zone(page,'top').boundingBox()).width).toBe(450);
});

test('clicks, central pass-through, hover indicators and deterministic corners', async ({page}) => {
  await setup(page);
  for(const edge of ['left','right','top','bottom']) await expect(zone(page,edge).locator('span')).toHaveCSS('opacity','0');
  await point(page,.1,.5,false);await expect(zone(page,'left').locator('span')).toHaveCSS('opacity','1');
  await point(page,.5,.5,false);await expect(zone(page,'left').locator('span')).toHaveCSS('opacity','0');
  for(const [x,y] of [[.1,.5],[.9,.5],[.5,.1],[.5,.95],[.01,.01],[.99,.99]]) await point(page,x,y);
  expect(await page.evaluate(()=>hits)).toEqual(['left','right','top','bottom','left','right']);
  await point(page,.5,.5);
  expect(await page.evaluate(()=>underHits)).toBe(1);
  await page.evaluate(()=>{layer.setEdgeSize('left',.8);layer.setEdgeSize('right',.8);});
  expect((await zone(page,'right').boundingBox()).width).toBeCloseTo(80);
  expect((await zone(page,'top').boundingBox()).width).toBe(0);
  await point(page,.9,.01);
  expect(await page.evaluate(()=>hits.at(-1))).toBe('right');
});

test('drag, return-to-start, other edge release, right click and cancel never activate', async ({page}) => {
  await setup(page);
  await point(page,.1,.5,false);await page.mouse.down();await point(page,.15,.5,false);await point(page,.1,.5,false);await page.mouse.up();
  await point(page,.1,.5,false);await page.mouse.down();await point(page,.9,.5,false);await page.mouse.up();
  const r=await zone(page,'left').boundingBox();
  await page.mouse.click(r.x+10,r.y+100,{button:'right'});
  await zone(page,'left').dispatchEvent('pointerdown',{pointerId:27,button:0,isPrimary:true,clientX:r.x+10,clientY:r.y+100});
  await page.evaluate(()=>document.dispatchEvent(new PointerEvent('pointercancel',{pointerId:27,bubbles:true})));
  await zone(page,'left').dispatchEvent('pointerup',{pointerId:27,button:0,isPrimary:true,clientX:r.x+10,clientY:r.y+100});
  expect(await page.evaluate(()=>hits)).toEqual([]);
  // Cross the exact left/center boundary by less than the drag threshold.
  const host=await page.locator('#surface').boundingBox();
  await page.mouse.move(host.x+99,host.y+120);await page.mouse.down();await page.mouse.move(host.x+101,host.y+120);await page.mouse.up();
  expect(await page.evaluate(()=>hits)).toEqual([]);
});

test('disabled and hidden edges pass through; no added keyboard stops', async ({page}) => {
  await setup(page,{left:{indicator:'L'}});
  await page.evaluate(()=>layer.setEdgeEnabled('left',false));
  await point(page,.1,.5);expect(await page.evaluate(()=>underHits)).toBe(1);
  await expect(zone(page,'left').locator('span')).toHaveCSS('opacity','0');
  await page.evaluate(()=>layer.setEdgeEnabled('left',true));
  await point(page,.1,.5);expect(await page.evaluate(()=>hits)).toEqual(['left']);
  await page.evaluate(()=>layer.disable());await point(page,.1,.5);
  await page.evaluate(()=>{layer.enable();layer.hide();});await point(page,.1,.5);
  expect(await page.evaluate(()=>underHits)).toBe(3);
  await page.evaluate(()=>layer.show());
  await expect(page.locator('.dui-edge-action-layer')).toHaveAttribute('aria-hidden','true');
  await expect(page.locator('.dui-edge-action-layer [tabindex]')).toHaveCount(0);
  await page.evaluate(()=>under.focus());await expect(page.getByRole('button',{name:'Underlying content'})).toBeFocused();
});

test('command state, activation reentry, callback errors and borrowed registry', async ({page}) => {
  await setup(page,{});
  await page.evaluate(async()=>{
    layer.destroy(); const {CommandRegistry}=await import('/src/core/CommandRegistry.js');
    window.commands=new CommandRegistry();window.allowed=true;window.errors=[];
    commands.register('act',{enabled:()=>allowed,run:()=>hits.push('command')});
    window.layer=new EdgeActionLayer('#surface',{commands,left:{command:'act',indicator:'L'}});
  });
  await point(page,.1,.5);expect(await page.evaluate(()=>hits)).toEqual(['command']);
  await page.evaluate(()=>{allowed=false;commands.refreshState();});await point(page,.1,.5);
  expect(await page.evaluate(()=>underHits)).toBe(1);
  await page.evaluate(()=>{allowed=true;commands.refreshState();layer.events.on('activate',()=>layer.disable());});
  await point(page,.1,.5);expect(await page.evaluate(()=>hits)).toEqual(['command']);
  await page.evaluate(()=>{layer.destroy();window.layer=new EdgeActionLayer('#surface',{left:{action:()=>Promise.reject(new Error('Expected failure'))}});layer.events.on('actionError',e=>errors.push(e.error.message));});
  await point(page,.1,.5);await expect.poll(()=>page.evaluate(()=>errors)).toEqual(['Expected failure']);
  await page.evaluate(()=>{layer.destroy();});expect(await page.evaluate(()=>commands.destroyed)).toBe(false);
});

test('ownership, indicators, repeated teardown and shared positioning restore', async ({page}) => {
  await setup(page,{});
  expect(await page.evaluate(async()=>{
    layer.destroy();
    const {Panel,Button}=await import('/src/ui/index.js');
    const parent=new Panel('#root',{height:180});const child=new Button({text:'Keep me'});parent.add(child);
    const indicator=new Button({text:'Decorative'});
    const first=new EdgeActionLayer({parent,left:{indicator}});
    const second=new EdgeActionLayer({parent,right:{indicator:'R'}});
    const relative=parent.element.style.position;
    first.destroy(); const interim=parent.element.style.position;
    const indicatorDestroyed=indicator.destroyed;
    second.destroy();const restored=parent.element.style.position;
    const preserved=parent.getItems().length===1&&!child.destroyed;
    const last=new EdgeActionLayer({parent,top:{}});parent.destroy();
    for(let i=0;i<20;i++){const current=new EdgeActionLayer('#surface',{left:{}});current.destroy();}
    return {relative,interim,restored,indicatorDestroyed,preserved,owned:last.destroyed,left:surface.children.length};
  })).toEqual({relative:'relative',interim:'relative',restored:'',indicatorDestroyed:true,preserved:true,owned:true,left:1});
  await expect(page.locator('.dui-edge-action-layer')).toHaveCount(0);
});

test('host scroll compensation preserves client geometry and cancels gestures', async ({page}) => {
  await setup(page,{left:{}});
  const before=await zone(page,'left').boundingBox();
  await page.evaluate(()=>{surface.style.overflow='auto';under.style.width='800px';under.style.height='700px';});
  await point(page,.1,.5,false);await page.mouse.down();
  await page.evaluate(()=>{surface.scrollTop=60;surface.scrollLeft=35;});
  await expect.poll(()=>page.evaluate(()=>layer.element.style.transform)).toContain('60px');
  const after=await zone(page,'left').boundingBox();
  expect(after.x).toBe(before.x);expect(after.y).toBe(before.y);
  await page.mouse.up();expect(await page.evaluate(()=>hits)).toEqual([]);
});

test('documentation sample is live and supplied source matches', async ({page}) => {
  page.on('pageerror',error=>{throw error;});
  await page.goto('/docs/index.html#edge-action-layer');
  await expect(page.getByRole('heading',{name:'EdgeActionLayer',exact:true,level:1})).toBeVisible();
  await page.getByRole('button',{name:'Center remains interactive'}).click();
  await expect(page.getByText('Last action: center',{exact:true})).toBeVisible();
  await zone(page,'right').click();
  await expect(page.getByText('Last action: right (command)',{exact:true})).toBeVisible();
});


test('temporary and permanent listeners are released even mid-gesture', async ({page}) => {
  await setup(page,{});
  expect(await page.evaluate(()=>{
    layer.destroy();
    const proto=EventTarget.prototype, add=proto.addEventListener, remove=proto.removeEventListener;
    const active=[];
    proto.addEventListener=function(type,handler,options){
      const capture=typeof options==='boolean'?options:!!options?.capture;
      if(!active.some(r=>r.target===this&&r.type===type&&r.handler===handler&&r.capture===capture)) active.push({target:this,type,handler,capture});
      return add.call(this,type,handler,options);
    };
    proto.removeEventListener=function(type,handler,options){
      const capture=typeof options==='boolean'?options:!!options?.capture;
      const index=active.findIndex(r=>r.target===this&&r.type===type&&r.handler===handler&&r.capture===capture);
      if(index>=0)active.splice(index,1);
      return remove.call(this,type,handler,options);
    };
    let during=0, retained;
    try {
      for(let i=0;i<10;i++) {
        const current=new EdgeActionLayer('#surface',{left:{action:()=>hits.push('leak')}});
        retained=current.element;
        const edge=retained.firstElementChild;
        edge.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,button:0,isPrimary:true,clientX:12,clientY:100,bubbles:true}));
        during=Math.max(during,active.length);current.destroy();
        edge.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,button:0,isPrimary:true,bubbles:true}));
      }
      document.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,button:0,clientX:12,clientY:100,bubbles:true}));
      return {during:during>0,remaining:active.length,hits:hits.length,detached:!retained.isConnected,position:surface.style.position};
    } finally {proto.addEventListener=add;proto.removeEventListener=remove;}
  })).toEqual({during:true,remaining:0,hits:0,detached:true,position:''});
});

test('a touch tap activates once without a synthetic-click duplicate', async ({browser}) => {
  const context=await browser.newContext({hasTouch:true});
  const page=await context.newPage();
  try {
    await setup(page,{right:{indicator:'R'}});
    const rect=await zone(page,'right').boundingBox();
    await page.touchscreen.tap(rect.x+rect.width/2,rect.y+rect.height/2);
    expect(await page.evaluate(()=>hits)).toEqual(['right']);
  } finally {await context.close();}
});
