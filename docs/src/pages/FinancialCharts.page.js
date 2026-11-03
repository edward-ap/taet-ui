import {Chart} from '../../../src/ui/experimental.js';
import {liveExample,importsFor,apiRows} from './pageHelpers.js';
export const financialChartsPage={id:'financial-charts',title:'Financial Charts',status:'experimental',
 description:'Japanese candlesticks, capped wicks, OHLC bars and filled stock areas.',
 imports:importsFor([],['Chart']),
 examples:[
  liveExample('Japanese Candlestick',function createCandlesticks({container}) {
    const chart=new Chart(container,{type:'candlestick',label:'Daily prices',series:[{id:'price',label:'Price',ohlc:{open:'open',high:'high',low:'low',close:'close'}}]});
    chart.data.parse([{id:1,label:'Mon',open:102,high:108,low:100,close:106},{id:2,label:'Tue',open:106,high:109,low:101,close:103},{id:3,label:'Wed',open:103,high:107,low:101,close:103},{id:4,label:'Thu',open:104,high:112,low:103,close:110}]);return chart;
  },'Bodies encode open/close; shadows encode low/high. A doji uses a horizontal line.'),
  liveExample('Candlestick with wick caps',function createCappedCandles({container}) {
    const chart=new Chart(container,{type:'candlestick',wickCaps:true,label:'Capped daily prices',series:[{id:'price',label:'Price',ohlc:{open:'open',high:'high',low:'low',close:'close'}}]});
    chart.data.parse([{id:1,label:'Mon',open:102,high:108,low:100,close:106},{id:2,label:'Tue',open:106,high:109,low:101,close:103},{id:3,label:'Wed',open:103,high:107,low:101,close:103},{id:4,label:'Thu',open:104,high:112,low:103,close:110}]);return chart;
  },'Optional horizontal caps at the high and low endpoints. Toggle with setWickCaps(true).'),
  liveExample('OHLC',function createOHLC({container}) {
    const chart=new Chart(container,{type:'ohlc',label:'OHLC prices',series:[{id:'price',label:'Price',ohlc:{open:'open',high:'high',low:'low',close:'close'}}]});
    chart.data.parse([{id:1,label:'Mon',open:102,high:108,low:100,close:106},{id:2,label:'Tue',open:106,high:109,low:101,close:103},{id:3,label:'Wed',open:103,high:107,low:101,close:103},{id:4,label:'Thu',open:104,high:112,low:103,close:110}]);return chart;
  },'Open tick points left; close tick points right. The vertical stem spans low to high.'),
  liveExample('Stock Area',function createStockArea({container}) {
    const chart=new Chart(container,{type:'area',includeZero:false,label:'Closing price',series:[{id:'price',valueField:'close',label:'Close'}]});
    chart.data.parse([{id:1,label:'Mon',close:106},{id:2,label:'Tue',close:103},{id:3,label:'Wed',close:103},{id:4,label:'Thu',close:110},{id:5,label:'Fri',close:108}]);return chart;
  },'With includeZero:false, the filled area closes at the lower plotted bound, not at price zero.')],
 options:apiRows([['type','candlestick | ohlc | area','All share Chart lifecycle, data, legend and point events.'],['series.ohlc','{open,high,low,close}','Field names; when supplied, valueField defaults to the close field.'],['wickCaps','boolean','High/low endpoint caps on candles, default false.'],['includeZero','boolean','Financial defaults false; area/line defaults true. Columns always retain zero.']]),
 methods:apiRows([['setWickCaps(boolean)','this','Toggle endpoint caps.'],['data.parse/update/batch','DataStore API','Silent writes repaint; invalid OHLC records are omitted without changing their category positions.']]),
 events:apiRows([['itemClick','ChartPointEvent','value is close; financial events also include ohlc: {open, high, low, close}.']]),
 notes:['OHLC records must contain four finite numbers with low <= open/close <= high. Invalid records are gaps, never repaired silently.','Category order and spacing follow the store: no timestamp sorting, session calendar, indicators, zoom or financial calculations. Negative prices are supported.','Use --dui-chart-up, --dui-chart-down and --dui-chart-neutral for price direction colors. Native tooltips and accessible labels contain all four values. Area gaps remain unfilled.']};
