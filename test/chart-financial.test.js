import test from 'node:test';
import assert from 'node:assert/strict';
import {chartModel,normalizeChartSeries,chartAreaPath} from '../src/ui/chartGeometry.js';
import {Chart} from '../src/ui/Chart.js';
const series=normalizeChartSeries([{id:'price',ohlc:{open:'o',high:'h',low:'l',close:'c'}}]);
test('OHLC bounds, mapping and invalid records',()=>{
 const model=chartModel([{o:102,h:110,l:100,c:108},{o:108,h:111,l:101,c:104},{o:9,h:8,l:7,c:8},{o:1,h:3,l:0,c:NaN}],series,'candlestick');
 assert.ok(model.min>0&&model.min<100);assert.ok(model.max>111);
 assert.deepEqual(model.rows[0][0].ohlc,{open:102,high:110,low:100,close:108});assert.equal(model.rows[0][0].raw,108);
 assert.equal(model.rows[2][0],null);assert.equal(model.rows[3][0],null);
 assert.equal(chartModel([{o:2,h:3,l:1,c:2}],series,'ohlc',true).min,0);
 const flat=chartModel([{o:10,h:10,l:10,c:10}],series,'ohlc');assert.ok(flat.min<10&&flat.max>10);
 const negative=chartModel([{o:-10,h:-5,l:-12,c:-8}],series,'ohlc');assert.ok(negative.max<0);
});
test('Area closes each segment separately at baseline',()=>{
 const path=chartAreaPath([{x:0,y:10},{x:10,y:20},null,{x:30,y:5},{x:40,y:15}],100);
 assert.equal(path,'M0,10L10,20L10,100L0,100ZM30,5L40,15L40,100L30,100Z');
 assert.equal(chartAreaPath([],100),'');
 const m=chartModel([{c:100},{c:110}],series,'area',false);assert.ok(m.min>0&&m.min<100);
});
test('Financial configuration copies field mapping and changes type safely',()=>{
 const input={id:'price',ohlc:{open:'o',high:'h',low:'l',close:'c'}};
 const chart=new Chart({type:'candlestick',series:[input]});input.ohlc.open='wrong';
 const copy=chart.getSeries();copy[0].ohlc.open='also wrong';assert.equal(chart.getSeries()[0].ohlc.open,'o');
 chart.setType('ohlc').setWickCaps(true);assert.equal(chart.wickCaps,true);
 assert.throws(()=>chart.setSeries([{id:'bad',ohlc:{open:'o'}}]),TypeError);chart.destroy();
});
