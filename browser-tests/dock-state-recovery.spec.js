import {test,expect} from '@playwright/test';

test('Layout restores imported dimensions through both collapsed transitions',async({page})=>{
  await page.goto('/browser-tests/recipes.html');
  const result=await page.evaluate(async()=>{
    const {Layout}=await import('/src/ui/index.js');
    const layout=new Layout('#root',{cols:[{name:'side',width:200,flex:0,collapsible:true},{name:'body',flex:1}]});
    const events=[];layout.events.on('stateRestore',()=>events.push('restore'));
    layout.collapseCell('side');
    layout.restoreState({cells:[{id:'side',width:340,height:null,flex:0,collapsed:false}]},{silent:true});
    const expanded={width:layout.cell('side').width,rendered:layout.cell('side').element.getBoundingClientRect().width};
    layout.collapseCell('side');
    layout.restoreState({cells:[{id:'side',width:410,height:null,flex:0,collapsed:true}]},{silent:true});
    layout.expandCell('side');
    const afterCollapsedRestore=layout.cell('side').width;
    layout.restoreState({cells:[{id:'side',width:null,height:null,flex:2,collapsed:false}]},{silent:true});
    layout.collapseCell('side');layout.expandCell('side');
    const flex=layout.cell('side').flex;layout.destroy();
    return {expanded,afterCollapsedRestore,flex,events,remaining:document.querySelector('#root').childElementCount};
  });
  expect(result).toEqual({expanded:{width:340,rendered:340},afterCollapsedRestore:410,flex:2,events:[],remaining:0});
});

test('outer dock target wins hit testing and a moved/resized panel restores in a fresh owner',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async()=>{
    const {DockLayout,ReadonlyText}=await import('/src/ui/all.js');
    window.createTestDock=()=>{
      const dock=new DockLayout('#root',{id:'work',width:'100%',height:'100%',areaSizes:{left:250,right:250}});
      dock.addPanel({id:'main',title:'Main',area:'center',content:new ReadonlyText({text:'Main'})});
      dock.addPanel({id:'inspector',title:'Inspector',area:'right',content:new ReadonlyText({text:'Inspect'})});
      return dock;
    };
    window.dock=window.createTestDock();
  });
  const header=page.locator('[data-dui-control-id="inspector"] .dui-dock-panel__header');
  let rect=await header.boundingBox();
  await page.mouse.move(rect.x+50,rect.y+12);await page.mouse.down();await page.mouse.move(rect.x+65,rect.y+24,{steps:4});
  const target=page.locator('[data-dui-dock-drop-area="left"][data-dui-dock-drop-mode="area"]');
  await expect(target).toBeVisible();rect=await target.boundingBox();
  await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2,{steps:8});
  await expect(target).toHaveClass(/dui-active/);
  expect(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.dataset.duiDockDropMode,{x:rect.x+rect.width/2,y:rect.y+rect.height/2})).toBe('area');
  await page.mouse.up();expect(await page.evaluate(()=>window.dock.getPanel('inspector').area)).toBe('left');
  rect=await page.locator('.dui-layout-splitter[aria-orientation="vertical"]:visible').first().boundingBox();
  await page.mouse.move(rect.x+2,rect.y+80);await page.mouse.down();await page.mouse.move(rect.x+62,rect.y+80,{steps:6});await page.mouse.up();
  const before=await page.evaluate(()=>window.dock.serializeState());
  expect(before.main.cells.find(c=>c.id==='left').width).toBeGreaterThan(250);
  const after=await page.evaluate(state=>{window.dock.destroy();window.dock=window.createTestDock();window.dock.restoreState(state,{silent:true});return window.dock.serializeState();},before);
  expect(after).toEqual(before);
  const width=await page.locator('[data-dui-control-id="inspector"]').evaluate(e=>e.getBoundingClientRect().width);
  expect(width).toBeCloseTo(before.main.cells.find(c=>c.id==='left').width,0);
  await page.evaluate(()=>window.dock.destroy());await expect(page.locator('#root > *')).toHaveCount(0);expect(errors).toEqual([]);
});
