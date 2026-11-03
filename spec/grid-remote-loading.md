# Grid remote loading

Grid and GridDataProvider remain experimental. `reloadRemote(overrides, options)` creates a request containing page, pageSize, sort, filters and search, then applies overrides. It returns a promise for `{ items, totalCount, page, pageSize }` and replaces the loaded DataStore records after a successful request. It does not accumulate a page cache. The previous batch stays visible if loading fails.

GridDataProvider is also available with declarations from `taet-ui/core`,
retaining its experimental status. Its typed paging envelope can be extended
with a backend's query fields; it does not yet declare the complete generated
Grid filter/search schema. See [typed models](../docs/DATA_MODEL_TYPES.md).

`GridDataProvider(load)` calls `load(request, { ...options, signal })`. Pass this signal to fetch in a network loader. Return only the requested records, not a full dataset sliced in the browser. The documentation uses a deterministic range generator to demonstrate the same contract without requiring a backend.

- A new request aborts the previous request. A loader that ignores cancellation cannot publish its late result.
- `options.signal` can cancel a request without overriding internal supersession cancellation.
- Grid.destroy aborts that grid's pending load. Grid does not destroy an externally supplied provider; the provider's creator owns it.
- Provider.destroy aborts its active request and closes its events. Late results emit neither load nor error events.
- Only the current request clears loading state. Grid exposes aria-busy and an in-grid Loading status/spinner while its request is pending. The spinner stops animating under prefers-reduced-motion and disappears on completion or failure.
- Aborted completions reject with AbortError. Callers must handle rejections and avoid updating controls after teardown.
- Cancellation does not force a loader that ignores its signal to settle; the provider checks cancellation when that loader resolves/rejects. Always forward the signal to cooperative asynchronous work.

`remoteLoadStart` and `remoteLoad` report the request and successful response. GridDataProvider also exposes loading, load and error events. Source row writes remain normal DataStore import mutations.

Built-in `statusBar.pagination` and Grid.setPage apply **local** DataView paging. A remote batch UI explicitly calls `reloadRemote({ page, pageSize })`; it must not page the returned subset a second time. Remote sorting/filtering must be implemented by the loader/backend. Local summaries and selection refer to loaded records, not unloaded rows. Virtualization remains useful within each loaded batch but does not itself reduce source memory.

See the executable Lazy Loading example in `docs/src/pages/LazyLoading.page.js`, `test/grid-remote-loading.test.js`, and `browser-tests/grid-docs.spec.js`. Large Data and Paging is a separate full local dataset example. Its async provider first yields for paint, then generates short chunks with event-loop yields; it starts only when that page is opened. Async alone does not make synchronous CPU work nonblocking.
