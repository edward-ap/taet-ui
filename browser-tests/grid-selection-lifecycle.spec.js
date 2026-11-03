import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
  page.on('pageerror',error=>{throw error});
  await page.goto('/browser-tests/recipes.html');
});

async function setup(page,type){
  await page.evaluate(async type=>{
    const api=await import('/src/ui/grid-api.js');
    const {SelectionModel,RangeSelectionModel}=await import('/src/core/index.js');
    window.selection=new SelectionModel();window.ranges=new RangeSelectionModel();
    window.semantic=[];
    window.g=new api[type]('#root',{height:200,width:500,statusBar:true,selection,
      ...(type==='Grid'?{ranges}:{}),columns:[{id:'name',width:220},
        {id:'n',width:100,dataType:'number',...(type==='Grid'?{summary:{kind:'total',scope:'selection'}}:{})}]});
    g.data.parse([{id:'a',name:'Alpha',n:5},{id:'b',name:'Beta',n:9},{id:'c',name:'Gamma',n:13}]);
    for(const name of ['selectionChange','rangeSelectionChange'])g.events.on(name,()=>semantic.push(name));
    for(const model of [selection,ranges])for(const name of ['beforeChange','change','afterChange'])model.events.on(name,()=>semantic.push(name));
    window.finish=()=>{g.destroy();selection.destroy();ranges.destroy()};
  },type);
  await expect(page.getByRole('gridcell',{name:'Alpha',exact:true})).toBeVisible();
}

for(const type of ['Grid','TreeGrid']){
  test(`${type} facade and direct model silent selection synchronize rows and derived UI`,async({page})=>{
    await setup(page,type);
    await page.evaluate(()=>{g.setSelectedIds(['a']);semantic.length=0;g.clearSelection({silent:true})});
    await expect(page.locator('.dui-grid__row[aria-selected=true]')).toHaveCount(0);
    await page.evaluate(()=>{g.setSelectedIds(['a'],{silent:true});g.setSelectedIds([],{silent:true})});
    await expect(page.locator('.dui-grid__row[aria-selected=true]')).toHaveCount(0);
    await page.evaluate(()=>selection.set([g.data.get('b')],{silent:true,origin:'import'}));
    await expect(page.locator('.dui-grid__row[aria-selected=true]')).toHaveText('Beta9');
    if(type==='Grid')expect(await page.evaluate(()=>String(g.getColumnSummaryValue('n')))).toBe('Total 9');
    else await expect(page.locator('.dui-grid__status-bar')).toContainText('Selected 1');
    expect(await page.evaluate(()=>semantic)).toEqual([]);
    await page.evaluate(()=>selection.clear({silent:true}));
    await expect(page.locator('.dui-grid__row[aria-selected=true]')).toHaveCount(0);
    if(type==='Grid')expect(await page.evaluate(()=>String(g.getColumnSummaryValue('n')))).toBe('Total 0');
    else await expect(page.locator('.dui-grid__status-bar')).not.toContainText('Selected');
    await page.evaluate(()=>finish());
  });

  test(`${type} non-silent selection emits one semantic table change`,async({page})=>{
    await setup(page,type);await page.evaluate(()=>selection.set([g.data.get('b')]));
    expect(await page.evaluate(()=>semantic.filter(x=>x==='selectionChange').length)).toBe(1);
    await page.evaluate(()=>finish());
  });

  for(const phase of ['beforeChange','invalidate','change'])test(`${type} selection ${phase} can destroy an owner with borrowed models`,async({page})=>{
    await setup(page,type);
    const result=await page.evaluate(phase=>{
      selection.events.once(phase,()=>g.destroy());let error=null;try{g.setSelectedIds(['a'])}catch(e){error=e.message}
      return {error,destroyed:g.destroyed,modelDestroyed:selection.destroyed};
    },phase);
    expect(result).toEqual({error:null,destroyed:true,modelDestroyed:false});
    await expect(page.locator('.dui-grid')).toHaveCount(0);await page.evaluate(()=>finish());
  });

  for(const phase of ['beforeChange','change'])test(`${type} nested ${phase} selection keeps the newer active cell`,async({page})=>{
    await setup(page,type);
    const result=await page.evaluate(phase=>{
      g.setSelectedIds(['c']);selection.events.once(phase,()=>g.setSelectedIds(['b']));g.setSelectedIds(['a']);
      return {ids:g.getSelectedIds(),active:g._activeId};
    },phase);
    expect(result).toEqual({ids:['b'],active:'b'});
    await expect(page.locator('.dui-grid__row[aria-selected=true]')).toHaveText('Beta9');await page.evaluate(()=>finish());
  });

  test(`${type} view replacement from selection callback aborts the old proposal`,async({page})=>{
    await setup(page,type);
    const result=await page.evaluate(()=>{
      g.setSelectedIds(['c']);selection.events.once('beforeChange',()=>g.setFilter(item=>item.id!=='a',{silent:true}));
      const changed=g.setSelectedIds(['a']);return {changed,ids:g.getSelectedIds(),active:g._activeId};
    });
    expect(result).toEqual({changed:false,ids:['c'],active:'c'});await page.evaluate(()=>finish());
  });
}

test('Grid direct silent range writes and clears synchronize highlights without semantic events',async({page})=>{
  await setup(page,'Grid');await page.evaluate(()=>ranges.set({from:{rowId:'a',columnId:'name'},to:{rowId:'b',columnId:'n'}},{silent:true}));
  await expect(page.locator('.dui-grid__cell--range-selected')).toHaveCount(4);
  await page.evaluate(()=>ranges.clear({silent:true}));await expect(page.locator('.dui-grid__cell--range-selected')).toHaveCount(0);
  expect(await page.evaluate(()=>semantic)).toEqual([]);await page.evaluate(()=>finish());
});

test('Grid range beforeChange can close the owner without repopulating owned ranges',async({page})=>{
  await page.evaluate(async()=>{
    const {Grid}=await import('/src/ui/grid-api.js');window.g=new Grid('#root',{columns:[{id:'name'}]});
    g.data.parse([{id:'a',name:'Alpha'}]);window.ownedRanges=g.ranges;g.ranges.events.on('beforeChange',()=>g.destroy());
    g.setCellRanges({from:{rowId:'a',columnId:'name'}});
  });
  expect(await page.evaluate(()=>({destroyed:g.destroyed,modelDestroyed:ownedRanges.destroyed,retained:ownedRanges._ranges.length}))).toEqual({destroyed:true,modelDestroyed:true,retained:0});
});

test('Grid forwards only the latest range change after an earlier model listener reenters',async({page})=>{
  await page.evaluate(async()=>{
    const {Grid,RangeSelectionModel}=await import('/src/ui/grid-api.js');const ranges=new RangeSelectionModel();
    ranges.events.once('change',()=>ranges.set({from:{rowId:'b',columnId:'name'}}));
    window.g=new Grid('#root',{height:200,ranges,columns:[{id:'name'}]});g.data.parse([{id:'a',name:'Alpha'},{id:'b',name:'Beta'}]);
    window.forwarded=[];g.events.on('rangeSelectionChange',e=>forwarded.push(e.ranges[0].anchor.rowId));
    ranges.set({from:{rowId:'a',columnId:'name'}});window.disposeRanges=()=>ranges.destroy();
  });
  expect(await page.evaluate(()=>forwarded)).toEqual(['b']);
  await expect(page.locator('.dui-grid__cell--range-selected')).toHaveText('Beta');
  await page.evaluate(()=>{g.destroy();disposeRanges()});
});
