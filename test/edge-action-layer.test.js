import test from 'node:test';
import assert from 'node:assert/strict';
import { EdgeActionLayer } from '../src/ui/EdgeActionLayer.js';
import { CommandRegistry } from '../src/core/CommandRegistry.js';
test('EdgeActionLayer construction and post-destroy conventions', () => {
  for (const config of [{}, {left:{}}, {left:{},right:{},top:{},bottom:{}}]) {
    const layer = new EdgeActionLayer(config);
    assert.equal(layer.isEdgeEnabled('left'), !!config.left);
    layer.destroy(); layer.destroy();
    assert.throws(()=>layer.setEdgeEnabled('left',true));
    assert.throws(()=>layer.setEdgeSize('right',.2));
    assert.throws(()=>layer.refresh());
  }
});
test('EdgeActionLayer rejects invalid edges/sizes/actions and ambiguous commands', () => {
  for (const config of [{left:true},{left:[]},{left:{action:2}},{left:{enabled:'yes'}},
    {left:{action(){},command:'x'}},{left:{command:'x'}},{left:{indicator:{}}},
    {dragThreshold:-1},{dragThreshold:NaN}]) assert.throws(()=>new EdgeActionLayer(config));
  for(const size of [-.1,1.1,NaN,Infinity,'-1px','101%','calc(1px)','auto','3em',{}]) {
    assert.throws(()=>new EdgeActionLayer({left:{size}}));
  }
  const layer=new EdgeActionLayer({left:{}});
  assert.throws(()=>layer.setEdgeSize('middle',.2));
  assert.throws(()=>layer.setEdgeSize('right',.2));
  assert.throws(()=>layer.setEdgeEnabled('left',1));
  layer.destroy();
});
test('EdgeActionLayer borrows registry and follows availability/removal', () => {
  const commands=new CommandRegistry();
  assert.throws(()=>new EdgeActionLayer({commands,left:{command:'missing'}}),/not registered/);
  let enabled=true;
  commands.register('test',{enabled:()=>enabled,run(){}});
  const layer=new EdgeActionLayer({commands,left:{command:'test'}});
  assert.equal(layer.isEdgeEnabled('left'),true);
  enabled=false;commands.refreshState();assert.equal(layer.isEdgeEnabled('left'),false);
  commands.unregister('test');assert.equal(layer.isEdgeEnabled('left'),false);
  commands.register('test',{run(){}});assert.equal(layer.isEdgeEnabled('left'),true);
  layer.disable();assert.equal(layer.isEdgeEnabled('left'),false);
  layer.enable();layer.setEdgeEnabled('left',false);assert.equal(layer.isEdgeEnabled('left'),false);
  layer.destroy();assert.equal(commands.destroyed,false);commands.destroy();
});
