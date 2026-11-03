import test from 'node:test';
import assert from 'node:assert/strict';
import {GridWindowRenderer} from '../src/ui/GridWindowRenderer.js';
import {Grid} from '../src/ui/Grid.js';

function fixture({enabled=true, gutter=10, count=20, width=240, left=1000}={}) {
  const columns=Array.from({length:count},(_,index)=>({id:`c${index}`,width:100,
    ...(index===0?{frozen:'left'}:index===count-1?{frozen:'right'}:{})}));
  const previous=globalThis.getComputedStyle;
  globalThis.getComputedStyle=()=>({gridTemplateColumns:
    `${enabled?gutter+'px ':''}${columns.length?columns.map(()=>'100px').join(' '):'220px'}`});
  const grid={indicatorGutterEnabled:enabled,_getIndicatorWidth:()=>gutter,
    _body:{clientWidth:width,scrollLeft:left},_header:{isConnected:true,children:[]},
    _visibleColumns:()=>columns,virtualColumns:true,_editing:null};
  return {grid,renderer:new GridWindowRenderer(grid),restore:()=>{globalThis.getComputedStyle=previous;}};
}

test('indicator is outside data tracks without disabling column virtualization',()=>{
  const {renderer,restore}=fixture();try{
    const layout=renderer.columns();
    assert.equal(layout.virtual,true);assert.equal(layout.tracks.length,20);
    assert.equal(layout.indicatorWidth,10);assert.equal(layout.totalWidth,2010);
    assert.equal(layout.frozenLeft,110);assert.equal(layout.frozenRight,100);
    assert.deepEqual(layout.visible.map(t=>t.index),[0,9,10,11,12,13,19]);
    assert.equal(layout.tracks[10].left,1010);assert.equal(layout.tracks[10].column.id,'c10');
    assert.ok(layout.template.startsWith('10px 100px'));
  }finally{restore();}
});

test('opt-out retains the original physical geometry and data identities',()=>{
  const {renderer,restore}=fixture({enabled:false});try{
    const layout=renderer.columns();assert.equal(layout.indicatorWidth,0);
    assert.equal(layout.totalWidth,2000);assert.equal(layout.frozenLeft,100);
    assert.equal(layout.tracks[10].left,1000);
  }finally{restore();}
});

test('resolved CSS indicator width participates in frozen/scroll geometry',()=>{
  const {grid,renderer,restore}=fixture({gutter:18,width:500,left:0});try{
    const layout=renderer.columns();assert.equal(layout.indicatorWidth,18);assert.equal(layout.frozenLeft,118);
    renderer.scrollToColumn('c5');assert.equal(grid._body.scrollLeft,218);
  }finally{restore();}
});

test('all hidden data columns retain a service track and no phantom data column',()=>{
  const {renderer,restore}=fixture({count:0,left:0});try{
    const layout=renderer.columns();assert.deepEqual(layout.tracks,[]);assert.deepEqual(layout.visible,[]);
    assert.equal(layout.indicatorWidth,10);assert.equal(layout.totalWidth,10);
  }finally{restore();}
});

test('indicator never enters public columns, ranges, or export data',()=>{
  for(const enabled of [true,false]){
    const g=new Grid({indicatorGutter:enabled,columns:[{id:'a',width:100},{id:'b',width:100}]});
    try{
      g.data.parse([{id:1,a:'A',b:'B'}]);
      g.setCellRanges({from:{rowId:1,columnId:'a'},to:{rowId:1,columnId:'b'}});
      assert.deepEqual(g.columns.map(c=>c.id),['a','b']);
      assert.deepEqual(g.getCellRanges(),[{anchor:{rowId:1,columnId:'a'},focus:{rowId:1,columnId:'b'}}]);
      assert.equal(g.exportData({export:context=>context.columns.map(c=>c.id).join(',')}),'a,b');
      assert.equal(g.getClipboardText(),'A\tB');
    }finally{g.destroy();}
  }
});
