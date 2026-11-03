import { importsFor } from "./pageHelpers.js";
import { Button, Panel, Toolbar } from "../../../src/ui/index.js";
import { Grid, GridDataProvider, StatusText } from "../../../src/ui/experimental.js";
import { gridExample } from "./Grid.page.js";

export const lazyLoadingGridPage = {
  id: "grid-lazy-loading", title: "Lazy Loading", status: "experimental",
  imports: importsFor(["Button", "Panel", "Toolbar", "Grid", "GridDataProvider", "StatusText"]),
  keywords: ["Grid", "lazy", "dataProvider", "remote", "async", "batch", "memory", "fetch"],
  description: "An optional data-provider pattern that loads only the requested batch and bounds memory usage.",
  paragraphs: [
    "Large Data and Paging loads its full dataset asynchronously after the page opens, showing Grid's loading spinner. Lazy Loading additionally limits the data held in memory: this example loads 50 records at a time out of 10,000, replacing the previous batch. The same spinner appears while a batch request is pending.",
    "Use a full local dataset when it fits comfortably in memory and you want immediate local sorting, filtering and scrolling. Use a provider for large, remote or expensive datasets. Lazy loading is configured through dataProvider and reloadRemote; it is not a separate Grid class or a lazyLoading boolean option.",
    "The demo provider generates only the requested range, without allocating the full dataset or making a network request. In an application, replace the loader with fetch and pass its supplied AbortSignal. Return { items, totalCount, page, pageSize }.",
    "The batch toolbar calls reloadRemote explicitly. Built-in statusBar.pagination uses local paging and must not page a returned batch a second time. Implement remote sorting/filtering in the loader or backend. Local summaries and selection operate on loaded records only.",
    "A failed load preserves the previous batch. Replaced requests and requests on a destroyed grid are aborted; late results cannot overwrite newer data. The example owner destroys its provider when leaving this page."
  ],
  examples: [
gridExample("10,000 records, loaded 50 at a time", function createLazyGrid({ container, log }) {
    const owner = new Panel(container, { name: "lazyGridExample" });
    const pageSize = 50;
    const provider = new GridDataProvider(async ({ page, pageSize }, { signal }) => {
      signal.throwIfAborted();
      const totalCount = 10000;
      const offset = (page - 1) * pageSize;
      const count = Math.max(0, Math.min(pageSize, totalCount - offset));
      const items = Array.from({ length: count }, (_, index) => {
        const id = offset + index + 1;
        return { id, name: `Record ${id}`, quantity: ((id - 1) * 7) % 100 };
      });
      return { items, totalCount, page, pageSize };
    });
    owner.disposables.add(() => provider.destroy());
    const grid = new Grid({ name: "lazyGrid", dataProvider: provider, width: "100%", height: 280, rowHeight: 24,
      statusBar: true, columnMenu: false,
      columns: [{ id: "id", title: "ID", width: 100, sortable: false },
        { id: "name", title: "Record", width: 260, sortable: false },
        { id: "quantity", title: "Quantity", width: 120, align: "right", sortable: false }]
    });
    let currentPage = 1;
    let pageCount = 1;
    const status = new StatusText({ name: "batchStatus", text: "Loading first batch…" });
    const first = new Button({ text: "First Batch", onClick: () => load(1) });
    const previous = new Button({ text: "Previous Batch", onClick: () => load(currentPage - 1) });
    const next = new Button({ text: "Next Batch", onClick: () => load(currentPage + 1) });
    const last = new Button({ text: "Last Batch", onClick: () => load(pageCount) });
    const reload = new Button({ text: "Reload Batch", onClick: () => load(currentPage) });
    const updateActions = loading => {
      for (const [button, disabled] of [[first, loading || currentPage === 1], [previous, loading || currentPage === 1],
        [next, loading || currentPage === pageCount], [last, loading || currentPage === pageCount], [reload, loading]]) {
        disabled ? button.disable() : button.enable();
      }
    };
    async function load(page) {
      updateActions(true);
      status.setText("Loading batch…");
      try {
        const response = await grid.reloadRemote({ page, pageSize });
        if (owner.destroyed) return;
        currentPage = response.page;
        pageCount = Math.max(1, Math.ceil(response.totalCount / pageSize));
        status.setText(`Batch ${currentPage} / ${pageCount} · ${response.items.length} rows in memory · ${response.totalCount} total`);
        log.write(`Loaded records ${response.items[0]?.id ?? 0}–${response.items.at(-1)?.id ?? 0}`);
      } catch (error) {
        if (!owner.destroyed && error.name !== "AbortError") {
          status.setText("Loading failed. Try the batch again.");
          log.write(error.message);
        }
      } finally {
        if (!owner.destroyed) updateActions(false);
      }
    }
    owner.add(new Toolbar().add(first, previous, next, last, reload), grid, status);
    grid.events.on("selectionChange", () => log.write("Selected ids: " + grid.getSelectedIds().join(", ")));
    void load(1);
    return owner;
  }, "Initially only records 1–50 are loaded. Next Batch requests 51–100; Last Batch requests 9951–10000 directly. Scroll within the loaded batch. Previous batches are replaced, not cached.")
  ],
  options: [
    { name: "dataProvider", type: "GridDataProvider", description: "Async loader returning requested items and totalCount. Its creator owns the provider." },
    { name: "height / rowHeight", type: "number", description: "Viewport and fixed virtual row height. Virtual rendering also applies within each batch." }
  ],
  methods: [
    { name: "reloadRemote({ page, pageSize }, options)", type: "Promise<Response>", description: "Request a batch, replace loaded rows and update the total count. Pages are one-based." },
    { name: "createRemoteRequest(overrides)", type: "object", description: "Build a request with page, pageSize, sort, filters and search." },
    { name: "provider.destroy()", type: "void", description: "Cancel the provider request and release its events when its owner is destroyed." }
  ],
  tables: [{ title: "Provider contract", rows: [
    { name: "load(request, { signal })", type: "Promise<Response>", description: "Fetch or generate just the requested batch. Forward signal to fetch." },
    { name: "items / totalCount", type: "object[] / number", description: "Loaded records and the total size reported by the source." },
    { name: "page / pageSize", type: "number", description: "Returned page and batch size." },
    { name: "options.signal", type: "AbortSignal", description: "Optional caller cancellation for reloadRemote or provider.request." }
  ] }],
  events: [
    { name: "remoteLoadStart", type: "{ source, request }", description: "The Grid begins loading and exposes aria-busy." },
    { name: "remoteLoad", type: "{ source, request, response }", description: "A successful response has replaced the loaded rows." },
    { name: "provider.events: loading / load / error", type: "ProviderEvent", description: "Provider request status. Catch rejected promises, including AbortError on cancellation." }
  ],
  notes: ["Previous batches are replaced, not cached. The full dataset is never allocated by this example.",
    "Grid cancels its own request on destruction but does not destroy an externally supplied provider. The example registers provider.destroy with its owning Panel."]
};
