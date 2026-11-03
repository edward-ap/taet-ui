import { importsFor } from "./pageHelpers.js";
import { TreeExplorer } from "../../../src/ui/experimental.js";

function createExplorer() {
  return new TreeExplorer({ title: "Library", height: 330, width: 360, dragDrop: true, renderDetail: item => item.kind === "file" ? "File" : "", items: [
    { id: "books", parentId: null, name: "Books", kind: "folder" },
    { id: "programming", parentId: "books", name: "Programming", kind: "folder" },
    { id: "rust", parentId: "programming", name: "Rust.djvu", kind: "file" },
    { id: "java", parentId: "programming", name: "Java.pdf", kind: "file" },
    { id: "history", parentId: "books", name: "History", kind: "folder" },
    { id: "documents", parentId: null, name: "Documents", kind: "folder" },
    { id: "notes", parentId: "documents", name: "notes.txt", kind: "file" }
  ] });
}
export const treeExplorerPage = {
  id: "tree-explorer", title: "TreeExplorer", status: "experimental",
  description: "A compact resource explorer: TreeGrid with shared commands, contextual menus and inline editing.",
  keywords: ["files", "folders", "resource", "rename", "context menu", "library", "provider"],
  imports: importsFor(["TreeExplorer", "MemoryResourceProvider"]),
  paragraphs: [
    "TreeGrid owns display, selection, expansion and the inline editor. TreeExplorer adds creation, object commands, a single ContextMenu reused by all menu surfaces, scoped shortcuts and provider permissions.",
    "Use + for New Folder / New File / Import File / Add Existing. Right-click a resource or use its hover ellipsis for object actions. Right-click empty space for New Folder, Paste and Refresh. Header ellipsis acts on the current selection, or on the root when nothing is selected.",
    "F2 renames; Enter commits an edit or opens a resource outside editing; Escape cancels and removes a transient new row. Delete, Ctrl+Shift+N and Ctrl+X/C/V operate inside the tree. Up/Down use TreeGrid navigation; Left/Right collapse/expand or visit parent/first child. Context Menu or Shift+F10 opens the same menu without a mouse. Text-editing shortcuts remain native inside the editor.",
    "This example uses an in-memory provider. It changes only this demo, without accessing your files. Import, Add Existing and Properties are disabled until implemented by an application provider. Open expands folders; subscribe to operation to open a file in your application."
  ],
  examples: [{ title: "Library — try creating, renaming and moving resources", source: `${createExplorer.toString()}\nconst example = createExplorer();`, create: createExplorer }],
  options: [
    { name: "renderName / renderDetail / detailWidth / rowHeight / nodeIcon", type: "callbacks / number", description: "Pure optional row presentation callbacks, lightweight secondary content, and geometry. Name editing retains the original name field." },
    { name: "items", type: "ResourceItem[]", description: "Flat records with id, parentId (null for root), name and kind: folder/file. Extra metadata is preserved." },
    { name: "provider", type: "ResourceProvider", description: "execute(request) returns the complete authoritative items after a mutation. canExecute(command, context) applies per-node permissions to every command surface." },
    { name: "title / expandAll / showHeader", type: "string / boolean", description: "Header/accessibility label, initial expansion (default true), and optional embedded header suppression." }
  ],
  methods: [
    { name: "moveResource(id, targetId)", type: "Promise<boolean>", description: "Same-explorer move through provider cut/paste permissions. dragDrop:true uses this path for folder drops." },
    { name: "execute(command, id?) / canExecute(command, id?)", type: "Promise<boolean> / boolean", description: "Use the same rules from application code. Omitted id uses the current context; null addresses the root." },
    { name: "getResources() / setResources(items)", type: "ResourceItem[] / void", description: "Read committed records (excluding the transient row) or replace the model, cancelling pending UI work." },
    { name: "grid / commands / busy", type: "TreeGrid / CommandRegistry / boolean", description: "Owned display and command objects; use grid for selection and expansion. Replace data through setResources." }
  ],
  events: [
    { name: "operation", description: "Accepted provider result: command, id, result. Open/Properties can be handled by the provider; the event can observe completion." },
    { name: "operationError", description: "Provider rejection or invalid snapshot; error is also shown as accessible status text. The rename draft remains editable." }
  ],
  notes: [
    "A provider implements execute({ command, items, id, parentId, name?, kind?, clipboard?, signal }). For create/rename/delete/move/copy return { items, selectId? }; other commands may return null. Persistence belongs to the provider, not TreeGrid.",
    "For async persistence, await your backend and return its complete updated model. Honor signal; setResources, Escape or destruction aborts pending UI work and late results are ignored. Aborting cannot roll back a backend operation already committed.",
    "The internal clipboard references one resource in this explorer. Copy/paste includes descendants and generates fresh ids; cut/paste moves the subtree. It is not the OS clipboard and is not shared between explorer instances.",
    "The memory provider rejects empty names, duplicate sibling names and pasting into descendants. A real provider must enforce its own naming, permissions, concurrency and deletion policy. It is borrowed and is never destroyed by the control. See spec/tree-explorer.md for the full contract."
  ]
};
