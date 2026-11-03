import { Chart, Gauge } from '../../../src/ui/experimental.js';
import { Panel, Button } from '../../../src/ui/index.js';
import { liveExample, importsFor, apiRows } from './pageHelpers.js';

const options = apiRows([
  ['type', 'ChartType', 'line, spline, area, candlestick, ohlc, column, stackedColumn, stackedColumn100 or bar (horizontal).'],
  ['series', 'ChartSeries[]', 'Unique id, valueField, label, optional color and hidden. Each record supplies one category.'],
  ['categoryField / label', 'string', 'Category field (default label) and accessible chart name.'],
  ['markers / legend', 'boolean', 'Markers default off; interactive series legend defaults on.'],
  ['data', 'DataStore', 'Optional borrowed store. Otherwise Chart owns a new store.'],
  ['height / width', 'number | string', 'Default height 320; width follows its container.']
]);
const methods = apiRows([
  ['data.parse / update / clear / batch', 'DataStore API', 'Invalidation updates the chart, including silent mutations. Batch high-frequency writes.'],
  ['setType(type) / setMarkers(boolean)', 'this', 'Switch presentation without rebuilding the control.'],
  ['getSeries() / setSeries(series)', 'ChartSeries[] / this', 'Read a detached configuration or replace it.'],
  ['setSeriesVisible(id, visible, options)', 'boolean', 'Hide/show a series and recompute bounds and stack totals.'],
  ['refresh() / destroy()', 'this / void', 'Immediate repaint / dispose listeners, observer and pending frame.']
]);
const events = apiRows([
  ['itemClick', 'ChartPointEvent', 'Mouse or Enter/Space: item, id, seriesId, category and raw numeric value.'],
  ['seriesVisibilityChange', 'event', 'seriesId, visible, origin and userAction; silent suppresses this event.']
]);
const notes = [
  'Experimental SVG renderer for small and medium categorical datasets. No third-party code, animations, polling or idle frame loop. One scheduled frame coalesces invalidations.',
  'Only finite numbers are plotted. null, undefined, strings, NaN and Infinity are missing values; gaps break lines. Columns include zero; line/area may use includeZero:false. Financial charts default to low/high bounds. Category order is the DataStore order; spacing is categorical, not elapsed time.',
  'Hover points/bars for native tooltips. Tab enters the point group; arrows and Home/End navigate, Enter/Space emits itemClick. Legend buttons toggle series. Titles, labels and tooltips are plain text.',
  'Background, text and axes inherit Tæt UI theme tokens. Six series colors can be overridden with --dui-chart-series-1 through -6 or per-series color. Beyond six series colors repeat.',
  'V1 has no zoom, numeric/time X axis, decimation, dual axes, image export or automatic label collision engine. Dense data and native WebView accessibility need application-specific acceptance.'
];
function page(id,title,description,examples) {
  return {id,title,status:'experimental',description,keywords:['chart','series','plot','svg'],
    imports:importsFor(['Panel','Button'],['Chart']),examples,options,methods,events,notes};
}

export const lineChartPage = page('line-chart','Line Chart','Straight and shape-preserving smooth lines, with optional markers.',[
  liveExample('Basic',function createBasicLine({container,log}) {
    const panel = new Panel(container,{width:'100%'});
    const chart = new Chart({label:'Monthly orders',type:'line',categoryField:'month',series:[
      {id:'online',valueField:'online',label:'Online'}, {id:'store',valueField:'store',label:'Store'}]});
    chart.data.parse([{id:1,month:'Jan',online:24,store:16},{id:2,month:'Feb',online:38,store:21},{id:3,month:'Mar',online:31,store:29},{id:4,month:'Apr',online:48,store:35}]);
    chart.events.on('itemClick',event=>log.write(event.category+': '+event.value));
    panel.add(chart);
    panel.add(new Button({text:'Update April',onClick:()=>chart.data.update(4,{online:chart.data.get(4).online===48?58:48})}));
    return panel;
  },'Two series with live data updates. Click a legend entry to hide or restore its series.'),
  liveExample('Basic with markers',function createMarkedLine({container}) {
    const chart = new Chart(container,{label:'Weekly activity',type:'line',markers:true,series:[{id:'visits',valueField:'value',label:'Visits'}]});
    chart.data.parse([{id:1,label:'Mon',value:12},{id:2,label:'Tue',value:27},{id:3,label:'Wed',value:19},{id:4,label:'Thu',value:34},{id:5,label:'Fri',value:26}]);
    return chart;
  },'Visible point markers. Focus a point and use arrow keys to inspect adjacent values.'),
  liveExample('Spline',function createSpline({container}) {
    const chart = new Chart(container,{label:'Daily temperature',type:'spline',series:[{id:'temperature',valueField:'value',label:'Temperature'}]});
    chart.data.parse([{id:1,label:'Mon',value:12},{id:2,label:'Tue',value:18},{id:3,label:'Wed',value:15},{id:4,label:'Thu',value:22},{id:5,label:'Fri',value:20}]);
    return chart;
  },'Monotone cubic interpolation preserves the extrema of the measured values.'),
  liveExample('Spline with markers',function createMarkedSpline({container}) {
    const chart = new Chart(container,{label:'Measurements with a gap',type:'spline',markers:true,series:[{id:'reading',valueField:'value',label:'Reading'}]});
    chart.data.parse([{id:1,label:'09:00',value:8},{id:2,label:'10:00',value:15},{id:3,label:'11:00',value:null},{id:4,label:'12:00',value:21},{id:5,label:'13:00',value:17}]);
    return chart;
  },'A missing measurement leaves a real gap; it is not plotted as zero.')
]);
export const columnChartPage = page('column-chart','Column Chart','Grouped columns, signed stacks and normalized percentage stacks.',[
  liveExample('Column',function createColumns({container}) {
    const chart = new Chart(container,{label:'Quarterly totals',type:'column',series:[{id:'revenue',valueField:'revenue',label:'Revenue'},{id:'cost',valueField:'cost',label:'Cost'}]});
    chart.data.parse([{id:1,label:'Q1',revenue:42,cost:25},{id:2,label:'Q2',revenue:55,cost:29},{id:3,label:'Q3',revenue:49,cost:31},{id:4,label:'Q4',revenue:68,cost:37}]);
    return chart;
  },'Series are grouped within each category.'),
  liveExample('Stacked Column',function createStackedColumns({container}) {
    const chart = new Chart(container,{label:'Cash flow',type:'stackedColumn',series:[{id:'direct',valueField:'direct',label:'Direct'},{id:'partners',valueField:'partners',label:'Partners'},{id:'refunds',valueField:'refunds',label:'Refunds'}]});
    chart.data.parse([{id:1,label:'Jan',direct:30,partners:12,refunds:-8},{id:2,label:'Feb',direct:42,partners:18,refunds:-5},{id:3,label:'Mar',direct:38,partners:24,refunds:-11}]);
    return chart;
  },'Positive and negative values stack separately above and below zero.'),
  liveExample('Stacked Column 100%',function createPercentColumns({container}) {
    const chart = new Chart(container,{label:'Traffic sources',type:'stackedColumn100',series:[{id:'direct',valueField:'direct',label:'Direct'},{id:'search',valueField:'search',label:'Search'},{id:'referral',valueField:'referral',label:'Referral'}]});
    chart.data.parse([{id:1,label:'Jan',direct:30,search:50,referral:20},{id:2,label:'Feb',direct:25,search:35,referral:15},{id:3,label:'Mar',direct:42,search:64,referral:24}]);
    return chart;
  },'Each positive stack sums to 100%. Negative stacks, if present, normalize separately to -100%. Hidden series are excluded; tooltips retain raw values.')
]);
export const barChartPage = page('bar-chart','Bar Chart','Horizontal grouped bars with a shared zero baseline.',[
  liveExample('Bar',function createBars({container}) {
    const chart = new Chart(container,{label:'Regional change',type:'bar',series:[{id:'change',valueField:'value',label:'Change'}]});
    chart.data.parse([{id:1,label:'North',value:28},{id:2,label:'South',value:-12},{id:3,label:'East',value:41},{id:4,label:'West',value:19}]);
    return chart;
  },'Negative values extend left of zero. Long category labels are shortened visually and remain complete in tooltips.')
]);
export const gaugePage = {id:'gauge',title:'Gauge',status:'experimental',description:'A semicircular numeric range display with a needle and filled arc.',
  imports:importsFor(['Panel','Button'],['Gauge']),
  examples:[liveExample('Gauge',function createGauge({container}) {
    const panel = new Panel(container,{width:320});
    const gauge = new Gauge({label:'Capacity',width:280,min:0,max:200,value:136,textMode:'value'});
    panel.add(gauge);
    panel.add(new Button({text:'Change value',onClick:()=>gauge.value.set(gauge.value.get()===136?84:136)}));
    return panel;
  },'Gauge is a display, not a circular slider. Values clamp to the range; update it through the usual value API.')],
  options:apiRows([['min / max / value','number','Range and initial value; defaults 0 / 100 / 0.'],['label / width','string / number|string','Caption and responsive size.'],['textMode / valueFormatter','percent | value | custom / callback','Same formatting contract as ProgressBar.'],['showText','boolean','Defaults true; ARIA value remains available when visible text is hidden.']]),
  methods:apiRows([['value.get / set / clear / reset','Editor value API','Range-clamped value; silent changes still repaint.'],['setRange(min,max,options)','boolean','Update bounds and clamp the current value.'],['setText(text,options)','this','Custom text when textMode is custom.']]),
  events:apiRows([['change / beforeChange / afterChange','Editor events','Inherited numeric value events; no per-frame or animation events.']]),
  notes:['Inherits ProgressBar value, validation, clean/reset and lifecycle semantics. No user editing or animation. Colors follow the Tæt UI theme; --dui-gauge-color overrides the arc. Accessible as a meter with its current value and range.']};
