import { importsFor } from "./pageHelpers.js";
import { Button, Panel, Toolbar } from "../../../src/ui/index.js";
import { List, TreeList, TreeGrid, OptionList } from "../../../src/ui/experimental.js";

function listExample(title, create, description) {
  return { title, create, description,
    source: `${create.toString()}\n\nconst example = ${create.name}({ container: "#root", log });\n// Replace log.write with your application action.\n// On screen teardown: example.destroy();` };
}

const listOptions = [
  { name: "data", type: "DataStore", description: "Optional shared source; an owned store is created by default." },
  { name: "textField / iconField", type: "string", description: "Item caption and registered icon-name properties; defaults text and icon. Missing icons leave text-only rows." },
  { name: "multiSelect", type: "boolean", description: "Allow several selected rows; List and TreeList use Ctrl/Cmd-click to add or remove one." },
  { name: "height / itemHeight", type: "number | string", description: "Visible list height and optional row height." }
];
const listMethods = [
  { name: "getItemGeometry(id) / getVisibleItemGeometries()", type: "ItemGeometry / ItemGeometry[]", description: "Client-coordinate snapshots for overlays; collapsed TreeList nodes resolve to a visible ancestor without changing logical IDs." },
  { name: "data.parse(items, options)", type: "boolean", description: "Replace rows through the data store." },
  { name: "selection.get()", type: "object[]", description: "Read selected row objects; use their stable ids in application state." },
  { name: "selection.set(items, options) / selection.clear(options)", type: "boolean", description: "Select data-store records or clear the selection." }
];
const listEvents = [
  { name: "itemGeometryChange", type: "{ source }", description: "Technical notification for scroll, rendering and observed resize; also fires for silent updates." },
  { name: "selectionChange", type: "{ items, oldItems, origin, userAction }", description: "Committed selection with row objects." },
  { name: "itemClick / itemDblClick", type: "{ item, id, nativeEvent }", description: "Row pointer actions." },
  { name: "dataChange", type: "DataEvent", description: "Notification following a public data-store change." }
];
const treeMethods = [
  { name: "expand(id, options) / collapse(id, options)", type: "boolean", description: "Expand or collapse one branch." },
  { name: "expandAll(options) / collapseAll(options)", type: "TreeList | TreeGrid", description: "Change all branches; collapse leaves root rows visible." },
  { name: "isExpanded(id)", type: "boolean", description: "Read a branch's expansion state." }
];
const ownershipNotes = ["Containers own the examples and their controls. Lists destroy their owned data, selection and tree projection; externally supplied models remain caller-owned."];

export const basicListPage = {
  id: "basic-list", title: "Basic List", status: "experimental",
  keywords: ["List", "rows", "text", "icon", "selection", "column"],
  description: "A vertical list of selectable text rows, with optional leading icons.",
  imports: importsFor(["List"]),
  paragraphs: [
    "List presents DataStore records as a single column. Arrow keys move the active row; Enter or Space selects it. Mouse selection reports the same row objects.",
    "Set iconField when your records use a custom property for Tæt UI icon names. The default property is icon. Icons are decorative, so captions remain the accessible row names."
  ],
  examples: [listExample("Text rows", function createTextList({ container, log }) {
    const list = new List(container, { name: "textList", label: "Messages", height: 128 });
    list.data.parse([
      { id: "inbox", text: "Inbox" }, { id: "drafts", text: "Drafts" },
      { id: "sent", text: "Sent" }, { id: "archive", text: "Archive" }
    ], { origin: "import" });
    list.events.on("selectionChange", event => log.write("Selected: " + event.items.map(item => item.text).join(", ")));
    return list;
  }, "Select a row with the mouse or focus the list and use ArrowDown followed by Enter."),
  listExample("Text with icons", function createIconList({ container, log }) {
    const list = new List(container, { name: "iconList", label: "Workspace shortcuts", height: 128, iconField: "symbol" });
    list.data.parse([
      { id: "projects", text: "Projects", symbol: "folder" },
      { id: "documents", text: "Documents", symbol: "file" },
      { id: "settings", text: "Settings", symbol: "settings" },
      { id: "recent", text: "Recent items" }
    ], { origin: "import" });
    list.events.on("selectionChange", event => log.write("Selected id: " + (event.items[0]?.id ?? "none")));
    return list;
  }, "Icons come from the standard registry. Recent items has no icon; each row can omit the icon property independently.")],
  options: [...listOptions, { name: "renderItem(item, context)", type: "function", description: "Optional custom renderer replacing default text/icon content." }],
  methods: listMethods, events: listEvents, notes: ownershipNotes
};

export const treeListPage = {
  id: "tree-list", title: "TreeList", status: "experimental",
  keywords: ["tree", "nodes", "roots", "hierarchy", "folder", "expand", "collapse", "icons"],
  description: "A hierarchical list with multiple roots, nested branches and optional node icons.",
  imports: importsFor(["Button", "Panel", "Toolbar", "TreeList"]),
  paragraphs: [
    "TreeList uses flat records with id and parentId. A null parentId identifies a root, so several roots can coexist. Children reference their parent's stable id; nesting is not limited to two levels.",
    "The triangle expands one branch. Expand All / Collapse All demonstrate the matching methods. ArrowRight expands the active branch; ArrowLeft collapses it or moves to its parent."
  ],
  examples: [listExample("Several roots without icons", function createPlainTree({ container, log }) {
    const owner = new Panel(container, { name: "plainTreeExample" });
    const tree = new TreeList({ name: "plainTree", label: "Project hierarchy", height: 204, expandedIds: ["projects"], nodeReorder: false });
    const actions = new Toolbar({ name: "Plain tree actions" }).add(
      new Button({ text: "Expand All", onClick: () => tree.expandAll({ origin: "user", userAction: true }) }),
      new Button({ text: "Collapse All", onClick: () => tree.collapseAll({ origin: "user", userAction: true }) })
    );
    owner.add(actions, tree);
    tree.data.parse([
      { id: "projects", parentId: null, text: "Projects" },
      { id: "dense", parentId: "projects", text: "Tæt UI" },
      { id: "components", parentId: "dense", text: "Components" },
      { id: "docs", parentId: "dense", text: "Documentation" },
      { id: "archive", parentId: null, text: "Archive" },
      { id: "previous", parentId: "archive", text: "Previous releases" }
    ], { origin: "import" });
    tree.events.on("selectionChange", event => log.write("Selected: " + event.items.map(item => item.text).join(", ")));
    tree.events.on("expandAll", () => log.write("All branches expanded"));
    tree.events.on("collapseAll", () => log.write("All branches collapsed"));
    return owner;
  }, "Projects and Archive are separate roots. Expand All reveals the third-level Components and Documentation nodes."),
  listExample("Folders and files with icons", function createIconTree({ container, log }) {
    const owner = new Panel(container, { name: "iconTreeExample" });
    const tree = new TreeList({ name: "iconTree", label: "Files", height: 204, nodeReorder: false });
    owner.add(new Toolbar({ name: "File tree actions" }).add(
      new Button({ text: "Expand All", onClick: () => tree.expandAll({ origin: "user", userAction: true }) }),
      new Button({ text: "Collapse All", onClick: () => tree.collapseAll({ origin: "user", userAction: true }) })
    ), tree);
    tree.data.parse([
      { id: "src", parentId: null, text: "src", icon: "folder" },
      { id: "ui", parentId: "src", text: "ui", icon: "folder" },
      { id: "button", parentId: "ui", text: "Button.js", icon: "file" },
      { id: "list", parentId: "ui", text: "List.js", icon: "file" },
      { id: "docs", parentId: null, text: "docs", icon: "folder" },
      { id: "readme", parentId: "docs", text: "README.md", icon: "file" }
    ], { origin: "import" });
    tree.expandAll({ silent: true });
    tree.events.on("selectionChange", event => log.write("Selected: " + event.items.map(item => item.text).join(", ")));
    return owner;
  }, "The same tree behavior with registered folder/file icons. The data is a small illustrative hierarchy.")],
  options: [...listOptions,
    { name: "parentField / rootParentId", type: "string / unknown", description: "Parent reference property and root marker; defaults parentId / null." },
    { name: "expandedIds / expandAll", type: "unknown[] / boolean", description: "Initial expanded branches or all branches." },
    { name: "nodeReorder", type: "boolean", description: "Enable drag reordering; disabled in these browsing examples." }
  ], methods: [...listMethods, ...treeMethods],
  events: [...listEvents, { name: "expand / collapse / expandAll / collapseAll", type: "TreeEvent", description: "Branch visibility notifications." }], notes: ownershipNotes
};

export const treeTableListPage = {
  id: "tree-table-list", title: "TreeTableList", status: "experimental",
  keywords: ["TreeGrid", "tree table", "columns", "directory", "files", "created", "dates"],
  description: "A tree with columns for file type, creation date and size, implemented by TreeGrid.",
  imports: importsFor(["Button", "Panel", "Toolbar", "TreeGrid"]),
  paragraphs: [
    "TreeTableList is the documentation name for this TreeGrid recipe. The first column contains the hierarchy; other columns display fields from the same records.",
    "Opt in with nodeReorder: true for local move inside one TreeGrid. Drag the existing service gutter, or call moveNode(id, targetId, position, options) / moveNodes(ids, targetId, position, options). A branch moves with all descendants and keeps IDs; inside is the default, before/after reorder siblings, and null + inside appends at root. The result reports accepted/reason. Cross-tree copy/transfer is not supported; active sorting rejects before/after. Full contract: docs/TREE_GRID_MOVE.md.",
    "The examples use fictional records and do not read the local filesystem. Columns can be sorted and resized; the tree remains hierarchical.",
    "TreeGrid virtualizes both rows and body columns. Freeze the hierarchy column to keep expanders visible during horizontal scrolling. Changes share an animation-frame paint; refresh() synchronizes the DOM immediately. Source data and semantic events remain synchronous.",
    "Without custom sorting or filtering, TreeDataView updates a branch locally and preserves the visible scroll anchor when another branch changes above it. Silent changes update the UI without public change events. Collapsing an edited row's ancestor cancels its editor."
  ],
  examples: [listExample("Directory with file metadata", function createDirectoryTree({ container, log }) {
    const owner = new Panel(container, { name: "directoryExample" });
    const tree = new TreeGrid({
      name: "directoryTree", height: 252, width: "100%", treeColumnId: "name",
      columns: [
        { id: "name", title: "Name", width: 300, minWidth: 180, sortable: true },
        { id: "type", title: "Type", width: 140, sortable: true },
        { id: "created", title: "Created", width: 160, sortable: true },
        { id: "size", title: "Size", width: 100, align: "right", sortable: true, dataType: "number", render: value => value == null || value === "" ? "â€”" : value + " KB" }
      ]
    });
    owner.add(new Toolbar({ name: "Directory actions" }).add(
      new Button({ text: "Expand All", onClick: () => tree.expandAll({ origin: "user", userAction: true }) }),
      new Button({ text: "Collapse All", onClick: () => tree.collapseAll({ origin: "user", userAction: true }) })
    ), tree);
    tree.data.parse([
      { id: "src", parentId: null, name: "src", icon: "folder", type: "Folder", created: "2026-08-01", size: null },
      { id: "ui", parentId: "src", name: "ui", icon: "folder", type: "Folder", created: "2026-08-01", size: null },
      { id: "button", parentId: "ui", name: "Button.js", icon: "file", type: "JavaScript", created: "2026-08-03", size: 12 },
      { id: "list", parentId: "ui", name: "List.js", icon: "file", type: "JavaScript", created: "2026-08-06", size: 9 },
      { id: "docs", parentId: null, name: "docs", icon: "folder", type: "Folder", created: "2026-08-02", size: null },
      { id: "readme", parentId: "docs", name: "README.md", icon: "file", type: "Markdown", created: "2026-08-04", size: 4 }
    ], { origin: "import" });
    tree.expandAll({ silent: true });
    tree.events.on("selectionChange", event => log.write("Selected: " + event.items.map(item => item.name).join(", ")));
    return owner;
  }, "Collapse All leaves the src and docs roots. Expand All restores their descendants. Select a file or click a column heading to sort siblings."),
  listExample("Wide directory with 2,000 records", function createWideDirectory({ container, log }) {
    const owner = new Panel(container, { name: "wideDirectoryExample" });
    const tree = new TreeGrid({ name: "wideDirectoryTree", width: "100%", height: 300, rowHeight: 24, treeColumnId: "name",
      expandedIds: Array.from({ length: 100 }, (_, i) => `n${i * 20}`),
      columns: [{ id: "name", title: "Name", width: 200, frozen: "left" },
        ...Array.from({ length: 98 }, (_, i) => ({ id: `c${i + 1}`, title: `Metadata ${i + 1}`, width: 120 })),
        { id: "status", title: "Status", width: 100, frozen: "right" }]
    });
    owner.add(new Toolbar({ name: "Wide directory actions" }).add(
      new Button({ text: "Collapse first folder", onClick: () => tree.collapse("n0", { origin: "user" }) }),
      new Button({ text: "Expand first folder", onClick: () => tree.expand("n0", { origin: "user" }) })
    ), tree);
    tree.data.parse(Array.from({ length: 2000 }, (_, i) => Object.fromEntries([
      ["id", `n${i}`], ["parentId", i % 20 ? `n${i - i % 20}` : null],
      ["name", i % 20 ? `File ${i}` : `Folder ${i / 20 + 1}`], ["icon", i % 20 ? "file" : "folder"], ["status", "Ready"],
      ...Array.from({ length: 98 }, (_, c) => [`c${c + 1}`, `R${i} / C${c + 1}`])
    ])), { origin: "import" });
    tree.events.on("selectionChange", () => log.write("Selected: " + tree.getSelectedIds().join(", ")));
    return owner;
  }, "Scroll down and across, then collapse/expand the first folder using the toolbar. The visible records stay in place; Name and Status remain pinned. All source records stay in memory.")],
  options: [
    { name: "nodeReorder", type: "boolean", description: "Opt-in local subtree move via the service gutter and moveNode/moveNodes; default false." },
    { name: "columns", type: "GridColumn[]", description: "Column ids map to item properties; configure title, width, alignment and sorting." },
    { name: "treeColumnId", type: "string", description: "Column containing indentation, expanders and icons." },
    { name: "parentField / rootParentId", type: "string / unknown", description: "Parent reference property and root marker; defaults parentId / null." },
    { name: "iconField", type: "string", description: "Property with a registered icon name; default icon." },
    { name: "height / rowHeight", type: "number", description: "Viewport and virtual row dimensions." },
    { name: "virtualRows / virtualColumns", type: "boolean", description: "Both default to true. Disable either axis independently; headers retain all columns." }
  ], methods: [...treeMethods,
    { name: "moveNode(id, targetId, position?, options?) / moveNodes(ids, targetId, position?, options?)", type: "TreeGridNodeMoveResult", description: "With nodeReorder:true, move complete local subtrees and return accepted/reason; positions inside/before/after." },
    { name: "data.parse(items, options)", type: "boolean", description: "Replace the hierarchy and metadata." },
    { name: "getSelectedIds() / setSelectedIds(ids, options)", type: "unknown[] / boolean", description: "Read or set selected records by id." },
    { name: "sortBy(column, direction)", type: "void", description: "Sort siblings by a column while retaining hierarchy." }
  ], events: [{ name: "selectionChange", type: "{ items, oldItems, origin, userAction }", description: "Selected directory records." }], notes: ownershipNotes
};

export const checkListPage = {
  id: "check-list", title: "Check List", status: "experimental",
  keywords: ["OptionList", "checkbox", "multiple", "multiSelect", "checked", "selection"],
  description: "Select several independent rows using leading checkbox marks.",
  imports: importsFor(["Button", "Panel", "Toolbar", "OptionList"]),
  paragraphs: [
    "OptionList with multiSelect: true shows a checkbox mark before each row. Clicking anywhere on a row toggles it without Ctrl or Cmd. Focus the list, move with arrow keys and press Space to toggle the active row.",
    "Its value API returns selected ids, while selection.get() returns the corresponding records. Marks visualize the listbox's aria-selected state; they do not create an extra keyboard stop for every checkbox.",
    "OptionList has declarations in taet-ui/inputs. It is not an EditorControl: value has get/set/clear, without reset or validation. Unresolved IDs retry when data arrives, including silent loads. Injected data and selection models remain application-owned."
  ],
  examples: [listExample("Choose export contents", function createCheckList({ container, log }) {
    const owner = new Panel(container, { name: "checkListExample" });
    const list = new OptionList({ name: "exportContents", label: "Export contents", height: 132, multiSelect: true, value: ["source", "report"] });
    list.data.parse([
      { id: "source", text: "Source files" }, { id: "rules", text: "Mapping rules" },
      { id: "report", text: "Validation report" }, { id: "logs", text: "Execution logs" }
    ], { origin: "import" });
    owner.add(list, new Toolbar({ name: "Checklist actions" }).add(
      new Button({ text: "Select All", onClick: () => list.value.set(list.data.all().map(item => item.id)) }),
      new Button({ text: "Clear Selection", onClick: () => list.value.clear() }),
      new Button({ text: "Read Selection", onClick: () => log.write(JSON.stringify(list.value.get())) })
    ));
    list.events.on("change", event => log.write(JSON.stringify(event.newValue)));
    return owner;
  }, "Source files and Validation report start checked. Toggle Mapping rules to add it without losing the existing selections, or clear all rows.")],
  options: [...listOptions, { name: "value", type: "unknown[]", description: "Initial selected ids when multiSelect is true; default []." }],
  methods: [
    { name: "value.get()", type: "unknown[]", description: "Selected ids in selection order." },
    { name: "value.set(ids, options)", type: "boolean", description: "Replace selection; silent updates still synchronize checkbox marks." },
    { name: "value.clear(options)", type: "boolean", description: "Uncheck all rows." }
  ], events: [{ name: "change / afterChange", type: "{ oldValue, newValue, items, origin, userAction }", description: "Selection values and matching records." }], notes: ownershipNotes
};
