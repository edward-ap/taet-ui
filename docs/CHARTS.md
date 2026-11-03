# Charts (experimental)

`Chart` and `Gauge` are exported by `taet-ui/experimental`, `taet-ui/all` and the
full portable bundle. They are original Tæt UI implementations, with no runtime
dependencies. DHTMLX's locally supplied public declarations were inspected for
feature vocabulary; no proprietary renderer or source was incorporated.

```js
import { Chart, Gauge } from './taet-ui.min.js';
const chart = new Chart('#plot', {
  label: 'Monthly orders', type: 'spline', markers: true, height: 320,
  categoryField: 'month',
  series: [{ id: 'orders', valueField: 'count', label: 'Orders' }]
});
chart.data.parse([{ id: 1, month: 'January', count: 42 },
                 { id: 2, month: 'February', count: 58 }]);
chart.events.on('itemClick', ({ item, seriesId, value }) => {
  // Host-owned action, e.g. navigate to the selected month.
});
const gauge = new Gauge('#capacity', { label: 'Capacity', min: 0, max: 200,
  value: 136, textMode: 'value', width: 280 });
gauge.value.set(150);
// On teardown: chart.destroy(); gauge.destroy();
```

Link the matching bundle CSS once. The docs workbench itself uses source modules.

## Models and presentation

| Requested presentation | API |
| --- | --- |
| Basic / BasicMarkers | `type: 'line'`, `markers: false / true` |
| Spline / SplineMarkers | `type: 'spline'`, `markers: false / true` |
| Column | `type: 'column'` (grouped vertical columns) |
| StackedColumn | `type: 'stackedColumn'` |
| StackedColumn 100% | `type: 'stackedColumn100'` |
| Bar | `type: 'bar'` (grouped horizontal bars) |
| Gauge | Separate `Gauge`, sharing ProgressBar's value/range contract |

Each record is a category, in store order; series read numeric fields from it.
Only finite **numbers** are measurements: missing/non-numeric values create gaps,
not zeros. Spline uses monotone cubic Hermite interpolation and splits at gaps.
An isolated point needs markers to be visible without hover/focus. The X axis is
categorical even when its label looks like a timestamp; intervals are equally spaced.

Columns and bars always include zero; Line/Spline/Area can use `includeZero:false`.
Positive/negative stack accumulators are separate.
100% stacks normalize positive and negative totals independently to +100/-100;
zero totals stay zero. Hidden series do not contribute. Tooltips/events retain
raw values. If a raw stack sum overflows the finite numeric range, the chart
shows an error message instead of emitting invalid SVG geometry.

`data` is an owned DataStore unless a store is supplied. Normal parse/update/clear/
batch operations invalidate the display, including `silent` writes. A borrowed
store survives chart destruction. `getSeries()` returns detached descriptors;
use `setSeries`, `setType`, `setMarkers` and `setSeriesVisible` to change configuration.
IDs and valueField strings are required for each series; IDs must be unique.

`seriesVisibilityChange` reports `seriesId`, `visible`, `origin`, `userAction`;
`silent` suppresses this event but still repaints. `itemClick` reports `item`, typed
`id`, `seriesId`, raw `value` and `category`, with user mutation metadata.

## Rendering, theme and interaction

- SVG paths, bars and markers; native SVG title tooltips. Labels are plain text.
- Automatic container resize handling. Default height is 320px; minimum plotted
  viewBox is 240x140. Very small containers scale that viewBox down.
- One pending animation-frame callback coalesces invalidations. No idle frame loop,
  animation, polling, document-level pointer handler or network request.
- SVG is O(records × visible series); this is not a virtualized or decimated renderer.
  V1 targets small/medium datasets. Thousands of SVG points require host measurement.
- Theme tokens control background, text, gridlines and the first accent series.
  Series 2–6 have distinct fallback colors; override `--dui-chart-series-1` … `-6`
  on the chart or use a series `color`. Colors repeat after six series. No claim of
  automatic palette contrast or colorblind-safe differentiation.
- Legend entries are keyboard buttons. One Tab stop enters plotted values; arrows
  and Home/End navigate, Enter/Space activates. Each point has an accessible label.
  Disabled charts ignore point activation and disable the legend.
- Gauge is a read-only meter (not progress completion and not CircularSlider).
  Range clamping, clean/reset, silent updates and formatting follow ProgressBar.
  Theme controls its track/needle/arc; `--dui-gauge-color` overrides the arc.

## Deliberate v1 limits and verification entry points

No mixed-type charts, pie/radar, numeric/time X scales, fixed axis bounds,
zoom/pan, decimation, remote paging, HTML formatter injection or image export.
Native tooltip timing and real screen-reader speech are not browser-test guarantees.

See `test/chart.test.js` (math/model), `browser-tests/charts.spec.js` (rendering,
interaction/lifetime), `test/types/chart-consumer.ts` (installed declarations),
`npm run test:charts` (Chromium/Firefox/WebKit). Live examples: Components → Charts
and `/examples/labs/charts.html`. Public declarations: Chart.d.ts and Gauge.d.ts.

## Financial and area charts

`type:'candlestick'` draws Japanese candles, including doji (open equals close).
`wickCaps:true` adds horizontal caps at high/low; `setWickCaps` toggles them.
`type:'ohlc'` draws the low/high stem, open tick left and close tick right.

```js
const prices = new Chart('#prices', {
  type: 'candlestick', wickCaps: true,
  series: [{ id: 'price', label: 'Price',
    ohlc: { open: 'o', high: 'h', low: 'l', close: 'c' } }]
});
prices.data.parse([{ id: 1, label: 'Monday', o: 102, h: 108, l: 100, c: 106 }]);
```

`series.ohlc` maps all four fields, and supplies its close field as valueField
when omitted. Without an explicit OHLC mapping, financial types use standard
`open/high/low` fields and the series valueField as close. All four must be finite
numbers, with low <= open/close <= high. Invalid records are skipped in place;
no silent correction or filling. Event `value` is close; `itemClick.ohlc` supplies
all four numeric values. Tooltip/accessibility text also contains all four.

Financial axes default to low/high extents plus 5% padding, not zero; use
`includeZero:true` to include zero explicitly. Flat ranges receive a nonzero span.
Direction is close versus open: rising/falling/doji. CSS tokens `--dui-chart-up`,
`--dui-chart-down`, `--dui-chart-neutral` customize those colors independently of
series colors. Negative prices are supported.

`type:'area'` fills each contiguous line segment separately. Default baseline is
zero; with `includeZero:false` it is the closest plotted bound to zero. This is
a truncated price axis, not a claim that the shaded area represents total value.
Missing values leave unfilled gaps. Series overlap translucently rather than stack.
`markers:true` also works for Area. No animation, calendars, automatic time sorting,
market aggregation or indicators are introduced. See Components → Charts → Financial Charts.

For interactive time-based price/volume charts, use separate StockChart (deferred extension; see [extension boundaries](EXTENSIONS.md)). Categorical Chart retains its existing contract.
