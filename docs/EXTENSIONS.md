# Deferred extensions

RenderViewport/raster integration, Painter, StockChart/indicators/volume profile,
FlatFile compiler/reader/worker/editor, SpectrumAnalyzer and Pivot are absent from
this preview. There are no compatibility stubs or placeholder implementations.

Generic Chart/Gauge remain Advanced with their existing categorical/candlestick/
OHLC behavior and do not depend on StockChart.

Applications using omitted extensions must retain their previous complete vendor
delivery until compatible extensions exist. Do not mix old/new library instances
or replace JS alone. A future extension needs separate imports/types/styles/assets,
tests and one shared Tæt UI identity. No private application is a framework dependency.
