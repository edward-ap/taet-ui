import { Chart, Gauge } from 'taet-ui/experimental';
import type { ChartOptions, ChartType, ChartPointEvent } from 'taet-ui/all';
import { DataStore } from 'taet-ui/core';
type Row = { id: number; month: string; amount: number | null };
const data = new DataStore<Row>();
const options: ChartOptions<Row> = { data, categoryField: 'month', type: 'spline', markers: true,
  series: [{ id: 'amount', valueField: 'amount', label: 'Amount' }],
  onItemClick(event: ChartPointEvent<Row>) { const id: number = event.id; const value: number = event.value; void [id,value]; }
};
const chart = new Chart(options);
const financial = new Chart<{id:number;open:number;high:number;low:number;close:number}>({type:'candlestick',wickCaps:true,
  series:[{id:'price',ohlc:{open:'open',high:'high',low:'low',close:'close'}}],
  onItemClick(event){ const close:number|undefined=event.ohlc?.close;void close; }
});
financial.setType('ohlc').setWickCaps(false);financial.destroy();
const type: ChartType = chart.type;
chart.data.parse([{ id: 1, month: 'Jan', amount: 20 }]);
chart.setSeriesVisible('amount', false, { silent: true });
chart.setType('column').setMarkers(false).setSeries(chart.getSeries());
chart.events.on('seriesVisibilityChange',event=>{const visible: boolean=event.visible;void visible;});
const gauge = new Gauge({ min: 0, max: 200, value: 42, textMode: 'value' });
gauge.value.set(75);gauge.setRange(0,100);gauge.value.reset();gauge.destroy();chart.destroy();data.destroy();void type;
console.log('Installed charts OK: typed records, series, point events, range and ownership');
if (false) {
  // @ts-expect-error unsupported type
  chart.setType('pie');
  // @ts-expect-error unknown measurement field
  chart.setSeries([{id:'bad',valueField:'missing'}]);
  // @ts-expect-error numeric values only
  gauge.value.set('75');
}

