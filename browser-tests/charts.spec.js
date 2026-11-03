import { test, expect } from '@playwright/test';
test.beforeEach(async({page})=>{page.on('pageerror',error=>{throw error;});});

test('financial candles, caps, OHLC, area and events',async({page})=>{
 await page.goto('/docs/index.html#financial-charts');
 await expect(page.locator('.dui-chart')).toHaveCount(4);
 await expect(page.locator('.dui-chart__candle-body')).toHaveCount(6);
 await expect(page.locator('.dui-chart__doji')).toHaveCount(2);
 await expect(page.locator('.dui-chart__wick-caps')).toHaveCount(4);
 await expect(page.locator('.dui-chart__ohlc-ticks')).toHaveCount(4);
 await expect(page.locator('.dui-chart__area')).toHaveCount(1);
 await page.screenshot({path:test.info().outputPath('financial.png'),fullPage:true});
 await page.goto('/browser-tests/recipes.html');
 await page.evaluate(async()=>{const {Chart}=await import('/src/ui/all.js');window.chart=new Chart('#root',{type:'candlestick',series:[{id:'price',ohlc:{open:'o',high:'h',low:'l',close:'c'}}]});chart.data.parse([{id:1,label:'Up',o:10,h:15,l:8,c:12},{id:2,label:'Invalid',o:5,h:2,l:0,c:1}]);chart.events.on('itemClick',e=>window.selected=e.ohlc);});
 await expect(page.locator('.dui-chart__mark')).toHaveCount(1);
 await page.locator('.dui-chart__mark').focus();await page.locator('.dui-chart__mark').press('Enter');
 expect(await page.evaluate(()=>selected)).toEqual({open:10,high:15,low:8,close:12});
 await page.evaluate(()=>{chart.setWickCaps(true);chart.data.update(1,{c:9},{silent:true});});
 await expect(page.locator('.dui-chart__mark')).toHaveAttribute('data-direction','down');
 await expect(page.locator('.dui-chart__wick-caps')).toHaveCount(1);
 await page.evaluate(()=>chart.setType('ohlc'));await expect(page.locator('.dui-chart__ohlc-ticks')).toHaveCount(1);
 await page.evaluate(()=>chart.destroy());
});

test('all chart variants render and inherit light/dark surfaces',async({page})=>{
  await page.goto('/examples/labs/charts.html');
  await expect(page.locator('.dui-chart')).toHaveCount(8);
  await expect(page.getByRole('meter',{name:'Capacity'})).toHaveAttribute('aria-valuenow','68');
  await expect(page.locator('.dui-chart__mark')).toHaveCount(80);
  expect(await page.locator('.dui-chart svg').evaluateAll(nodes=>nodes.every(n=>!/(NaN|Infinity)/.test(n.innerHTML)))).toBe(true);
  const before=await page.locator('.dui-chart').first().evaluate(e=>getComputedStyle(e).backgroundColor);
  await page.getByRole('button',{name:'Light / dark'}).click();
  expect(await page.locator('.dui-chart').first().evaluate(e=>getComputedStyle(e).backgroundColor)).not.toBe(before);
  await page.screenshot({path:test.info().outputPath('charts-dark.png'),fullPage:true});
  await page.getByRole('button',{name:'Light / dark'}).click();
  await page.screenshot({path:test.info().outputPath('charts-light.png'),fullPage:true});
});

test('data, legend, keyboard, resize, safe labels and borrowed ownership',async({page})=>{
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async()=>{
    const {Chart,DataStore}=await import('/src/ui/all.js');
    window.store=new DataStore();window.chart=new Chart('#root',{width:600,height:300,type:'spline',markers:true,data:store,label:'Activity',series:[{id:'a',valueField:'a',label:'Primary'},{id:'b',valueField:'b',label:'Other'}]});
    window.clicks=[];chart.events.on('itemClick',e=>clicks.push([e.id,e.seriesId,e.value,e.userAction]));
    store.parse([{id:0,label:'<img onerror=alert(1)>',a:12,b:3},{id:1,label:'Gap',a:null,b:5},{id:2,label:'End',a:20,b:9}]);
  });
  await expect(page.locator('.dui-chart__mark')).toHaveCount(5);
  await expect(page.locator('.dui-chart img')).toHaveCount(0);
  const paths=await page.locator('.dui-chart__line').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d')));
  expect(paths.some(path=>(path.match(/M/g)||[]).length===2)).toBe(true);
  const first=page.locator('[data-point="0"]');await first.focus();await first.press('Enter');
  expect(await page.evaluate(()=>clicks)).toEqual([[0,'a',12,true]]);
  await first.press('ArrowRight');await expect(page.locator('[data-point="1"]')).toBeFocused();
  await page.getByRole('button',{name:'Other',exact:true}).click();await expect(page.locator('.dui-chart__mark')).toHaveCount(2);
  await expect(page.getByRole('button',{name:'Other',exact:true})).toBeFocused();
  await page.evaluate(()=>store.update(0,{a:33},{silent:true}));await expect(first).toHaveAttribute('aria-label',/33/);
  const originalBox=await page.locator('.dui-chart svg').getAttribute('viewBox');
  await page.evaluate(()=>chart.setSize({width:420,height:240}));
  await expect.poll(()=>page.locator('.dui-chart svg').getAttribute('viewBox')).not.toBe(originalBox);
  await page.evaluate(()=>chart.disable());await expect(page.getByRole('button',{name:'Other',exact:true})).toBeDisabled();
  await first.dispatchEvent('click');expect(await page.evaluate(()=>clicks.length)).toBe(1);
  await page.evaluate(()=>{chart.enable();chart.setType('stackedColumn100');});
  await expect(page.locator('.dui-chart rect')).toHaveCount(2);
  await page.getByRole('button',{name:'Primary',exact:true}).click();await expect(page.locator('.dui-chart__empty')).toHaveText('No data');
  await page.evaluate(()=>{store.update(0,{a:44});chart.destroy();store.update(0,{a:55});});
  await expect(page.locator('.dui-chart')).toHaveCount(0);
  expect(await page.evaluate(()=>store.destroyed)).toBe(false);
});

test('empty/overflow recovery, idle rendering and queued teardown',async({page})=>{
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async()=>{const {Chart}=await import('/src/ui/all.js');window.chart=new Chart('#root',{type:'stackedColumn',series:[{id:'a',valueField:'a'},{id:'b',valueField:'b'}]});});
  await expect(page.locator('.dui-chart__empty')).toHaveText('No data');
  await page.evaluate(()=>chart.data.parse([{id:1,label:'Huge',a:Number.MAX_VALUE,b:Number.MAX_VALUE}]));
  await expect(page.locator('.dui-chart__empty')).toContainText('supported numeric range');
  await page.evaluate(()=>chart.setType('stackedColumn100'));await expect(page.locator('.dui-chart__mark')).toHaveCount(2);
  await page.evaluate(()=>{window.renders=0;window.observer=new MutationObserver(()=>renders++);observer.observe(chart.element,{subtree:true,childList:true,attributes:true});});
  await page.waitForTimeout(150);expect(await page.evaluate(()=>renders)).toBe(0);
  await page.evaluate(()=>{observer.disconnect();chart.data.clear({silent:true});});
  await expect(page.locator('.dui-chart__empty')).toHaveText('No data');
  await page.evaluate(async()=>{
    const {Chart}=await import('/src/ui/all.js');chart.destroy();
    for(let i=0;i<20;i++){const c=new Chart('#root',{series:[{id:'a',valueField:'a'}]});c.data.parse([{id:1,a:2}]);c.destroy();}
  });
  await page.waitForTimeout(50);await expect(page.locator('.dui-chart')).toHaveCount(0);
});

test('documentation examples mount every requested chart variant',async({page})=>{
  for(const [id,count] of [['line-chart',4],['column-chart',3],['bar-chart',1],['gauge',0]]) {
    await page.goto(`/docs/index.html#${id}`);
    await expect(page.locator('.dui-example-host__live .dui-chart')).toHaveCount(count);
    if(id==='gauge')await expect(page.getByRole('meter',{name:'Capacity'})).toHaveAttribute('aria-valuenow','136');
  }
});

test('Gauge updates value, bounds and label without stale ARIA or geometry',async({page})=>{
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async()=>{const {Gauge}=await import('/src/ui/all.js');window.gauge=new Gauge('#root',{label:'Load',width:300,min:0,max:200,value:100,textMode:'value'});});
  const meter=page.getByRole('meter',{name:'Load'});
  await expect(meter).toHaveAttribute('aria-valuenow','100');
  await expect(page.locator('.dui-gauge__fill')).toHaveAttribute('stroke-dasharray','50 100');
  await page.evaluate(()=>gauge.setRange(0,400,{silent:true}));
  await expect(meter).toHaveAttribute('aria-valuemax','400');
  await expect(page.locator('.dui-gauge__fill')).toHaveAttribute('stroke-dasharray','25 100');
  await page.evaluate(()=>{gauge.value.set(900,{silent:true});gauge.setLabel('Capacity');});
  await expect(page.getByRole('meter',{name:'Capacity'})).toHaveAttribute('aria-valuenow','400');
  await expect(page.locator('.dui-gauge__needle')).toHaveAttribute('transform','rotate(180 120 120)');
  await page.evaluate(()=>gauge.destroy());await expect(page.getByRole('meter')).toHaveCount(0);
});
