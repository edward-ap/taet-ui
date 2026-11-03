import { docsCatalog } from "./docsCatalog.js";
import { DocsShell } from "./DocsShell.js";

const shell = new DocsShell("#docs-root", {
  catalog: docsCatalog
});

window.denseUiDocs = window.taetUiDocs = { shell, catalog:docsCatalog };
