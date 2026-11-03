import test from 'node:test';
import assert from 'node:assert/strict';
import { Chart } from '../src/ui/Chart.js';
import { Gauge } from '../src/ui/Gauge.js';
import { DataStore } from '../src/core/DataStore.js';
import { chartModel, chartFraction, chartPath, normalizeChartSeries } from '../src/ui/chartGeometry.js';
const series = normalizeChartSeries([{id:'a',valueField:'a'},{id:'b',valueField:'b'},{id:'c',valueField:'c'}]);

test('chart geometry separates signed stacks and missing values',()=>{
  const m=chartModel([{a:20,b:30,c:-12},{a:-5,b:-7,c:null}],series,'stackedColumn');
  assert.deepEqual(m.rows[0].map(p=>[p.start,p.end]),[[0,20],[20,50],[0,-12]]);
  assert.deepEqual(m.rows[1].slice(0,2).map(p=>[p.start,p.end]),[[0,-5],[-5,-12]]);
  assert.equal(m.rows[1][2],null);assert.equal(m.min,-12);assert.equal(m.max,50);
  for(const value of [null,undefined,'3',NaN,Infinity])assert.equal(chartModel([{a:value}],series,'line').rows[0][0],null);
});
test('100 percent handles zeros, hidden series, negative stacks and large magnitudes',()=>{
  const m=chartModel([{a:1,b:3,c:-2},{a:0,b:0,c:0}],series,'stackedColumn100');
  assert.deepEqual(m.rows[0].map(p=>p.end),[25,100,-100]);
  assert.deepEqual(m.rows[1].map(p=>p.end),[0,0,0]);
  const hidden=series.map(s=>s.id==='b'?{...s,hidden:true}:s);
  assert.equal(chartModel([{a:1,b:3}],hidden,'stackedColumn100').rows[0][0].end,100);
  const huge=chartModel([{a:Number.MAX_VALUE,b:Number.MAX_VALUE}],series,'stackedColumn100');
  assert.deepEqual(huge.rows[0].slice(0,2).map(p=>p.value),[50,50]);
  assert.equal(chartFraction(0,-Number.MAX_VALUE,Number.MAX_VALUE),.5);
  assert.throws(()=>chartModel([{a:Number.MAX_VALUE,b:Number.MAX_VALUE}],series,'stackedColumn'),RangeError);
});
test('ordinary columns share zero and do not accumulate',()=>{
  const m=chartModel([{a:-10,b:5,c:8}],series,'column');
  assert.deepEqual(m.rows[0].map(p=>p.start),[0,0,0]);assert.equal(m.min,-10);assert.equal(m.max,8);
  const empty=chartModel([],series,'line');assert.equal(empty.min,0);assert.equal(empty.max,1);
});
test('spline breaks at gaps and stays between adjacent extrema',()=>{
  const points=[{x:0,y:10},{x:10,y:50},{x:20,y:20},{x:30,y:21}];
  const path=chartPath(points,true), segments=[...path.matchAll(/C([^CML]+)/g)];
  assert.equal(segments.length,3);
  segments.forEach((segment,i)=>{
    const coords=segment[1].trim().split(/[ ,]+/).map(Number);
    const lo=Math.min(points[i].y,points[i+1].y),hi=Math.max(points[i].y,points[i+1].y);
    for(let j=0;j<=100;j++){const t=j/100,u=1-t;const y=u*u*u*points[i].y+3*u*u*t*coords[1]+3*u*t*t*coords[3]+t*t*t*coords[5];assert.ok(y>=lo-1e-9&&y<=hi+1e-9);}
  });
  assert.equal((chartPath([points[0],null,points[1],points[2]],true).match(/M/g)||[]).length,2);
  assert.equal(chartPath([{x:3,y:4}],true),'M3,4');assert.equal(chartPath([],false),'');
});
test('Chart configuration, ownership and silent semantic events',()=>{
  const data=new DataStore();const chart=new Chart({data,series});let events=0;
  chart.events.on('seriesVisibilityChange',()=>events++);
  chart.setSeriesVisible('a',false,{silent:true});assert.equal(events,0);
  chart.setSeriesVisible('a',true);assert.equal(events,1);
  const copy=chart.getSeries();copy[0].hidden=true;assert.equal(chart.getSeries()[0].hidden,false);
  assert.throws(()=>chart.setType('pie'),TypeError);assert.equal(chart.type,'line');
  assert.throws(()=>chart.setSeries([{id:'a',valueField:'a'},{id:'a',valueField:'b'}]),TypeError);
  assert.throws(()=>chart.setSeriesVisible('missing',true));
  chart.destroy();assert.equal(data.destroyed,false);data.parse([{id:1,a:2}]);data.destroy();
  const owned=new Chart();owned.destroy();assert.equal(owned.data.destroyed,true);
});
test('Gauge clamps, resets and supports silent range changes',()=>{
  const gauge=new Gauge({min:-10,max:10,value:5});let count=0;gauge.events.on('change',()=>count++);
  gauge.value.set(50);assert.equal(gauge.value.get(),10);assert.equal(count,1);
  gauge.value.reset();assert.equal(gauge.value.get(),5);
  gauge.setRange(0,3,{silent:true});assert.equal(gauge.value.get(),3);assert.equal(count,2);
  gauge.destroy();
});
