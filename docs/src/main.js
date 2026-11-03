import { docsCatalog } from "./docsCatalog.js";
import { DocsShell } from "./DocsShell.js";

const shell = new DocsShell("#docs-root", {
  catalog: docsCatalog
});

window.denseUiDocs = { shell, catalog:docsCatalog };
