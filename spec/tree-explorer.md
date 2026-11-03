# TreeExplorer (experimental)

`TreeExplorer` and `MemoryResourceProvider` are exported by `taet-ui/experimental`
and `taet-ui/all`. Runtime has no filesystem, native clipboard, network or reader dependency.

## Composition and ownership

TreeGrid owns rendering, single selection, expansion, navigation and inline edit.
TreeExplorer owns that grid, one CommandRegistry, one ContextMenu (reconfigured per
surface), ShortcutManager and two header IconButtons. Destroy the explorer once;
its provider is borrowed and is never destroyed. Mount before invoking creation
or rename. Use `grid` for selection/expansion; use `setResources()` for model replacement.
Do not replace owned columns, editors or command definitions.

Items are flat `{ id, parentId, name, kind }` records. Root parent is null (omission
normalizes to null). IDs are strings or finite numbers, including 0. Kind is
folder/file; only folders can be parents. Missing parents, duplicate ids, cycles,
empty names and invalid kinds are rejected before snapshot application. Extra
metadata survives shallow record copies; nested metadata must be treated as immutable.

## Commands and context

Header + presents newFolder, newFile, importFile and addExisting. Right-click,
row ellipsis and header ellipsis use the same menu and command registry. Row
context targets the clicked row, regardless of previous selection. Header ellipsis
uses current selection; blank space clears selection and targets root. Creation
under a selected file uses its parent; creation under a folder uses that folder.

Folder menu: open, newFolder, rename, delete, cut, copy, paste, properties.
File menu omits newFolder/paste. Empty menu: newFolder, paste, refresh.
Separators group object operations. Unavailable commands remain discoverable but
disabled. Row ellipsis appears on hover/focus and remains visible on touch devices.

`canExecute(command, id?)` and `execute(command, id?)` use the same permissions as
menus and shortcuts. Omitted id uses current context; null means root. Providers
may implement pure synchronous `canExecute(command, {id,item,parentId,clipboard})`.
Do not mutate/destroy/re-enter the explorer from that predicate. UI permissions
are not authorization: persistence providers must independently validate operations.

F2 rename, Del delete, Ctrl+Shift+N new folder, Ctrl+X/C/V cut/copy/paste,
Enter open, Context Menu or Shift+F10 menu. These are scoped to the tree; inputs
retain normal text editing. Up/Down use TreeGrid navigation; Left/Right collapse/expand or visit parent/first child. Enter/Esc in the inline
editor commit/cancel. No global key listener is installed.

## Provider contract

```
execute({command, id, parentId, items, name?, kind?, clipboard?, signal})
  -> {items, selectId?} | null | false | Promise<same>
```

`items` is the committed snapshot; a transient row is excluded. `newFolder` /
`newFile` become `create` on commit, with name/kind/parentId. The transient id is
UI-local: a provider returns its authoritative id through selectId. `paste`
becomes `move` for cut and `copy` for copy, with clipboard source id/mode. Cut and
copy capture a reference locally and do not call the provider until paste.

Create, rename, delete, move and copy must return a full authoritative snapshot;
open, properties, importFile, addExisting and refresh may return null when they
change no records. Return false or throw/reject to report failure. A returned
snapshot is validated before the model changes. `operation` reports successful
completion; `operationError` reports error and command/id; accessible status text
also displays the error. `execute()` resolves boolean. Registry.execute retains
its normal CommandResult wrapper around that value.

Only one provider operation runs at a time. Commands are disabled while busy.
An existing rename stays visible until successful persistence, then the editor
closes. Failure preserves the draft for correction/retry. New resources exist as
transient rows until persistence; Escape removes them without a create request.
`getResources()` excludes transient rows. Escape during a pending edit, setResources and
destroy abort the supplied signal; late completion cannot overwrite current UI.
Backend cancellation is cooperative: it cannot undo already committed work.
Reconcile backend state with a fresh snapshot if cancellation races a write.

Example application adapter (host is application-owned, not a Tæt UI API):

```js
const explorer = new TreeExplorer({
  title: 'Library', items: initialResources,
  provider: {
    canExecute(command, context) {
      return command !== 'delete' || context.item?.locked !== true;
    },
    async execute(request) {
      const { signal, ...operation } = request;
      // Translate resource ids and operations into host-specific storage calls.
      // Mutations return {items, selectId?}; use the authoritative backend model.
      return await host.resources.execute(operation, { signal });
    }
  }
});
explorer.mount(container);
```

The built-in stateless MemoryResourceProvider operates on request.items. It trims
names, rejects duplicate sibling names (case-sensitive), recursively copies/deletes,
generates new copy ids and prevents moving/copying into self/descendants. Copying
into a container with the same name rejects instead of silently overwriting.
Clipboard references the current source at paste time; it is per explorer, single
resource, and cleared by model replacement. Open expands folders and emits completion;
file opening belongs to the application. Import/Add Existing/Properties are disabled
in the memory provider. Refresh is a no-op because that provider has no external state.

V1 uses complete snapshots and synchronous tree projection. Remote lazy children,
OS clipboard, cross-explorer drag/drop, multiselection, undo and host file dialogs
are not part of this component contract.

## Verification routes

- `test/resource-model.test.js`: topology, names, subtree mutations and cycles.
- `browser-tests/tree-explorer.spec.js`: command surfaces, keyboard, async failures/lifetime.
- `test/types/remaining-components-consumer.ts`: installed-package typed provider.
- `docs/src/pages/TreeExplorer.page.js`: copyable live example.

## Presentation and local drag/drop
Optional `renderName(item)` and `renderDetail(item)` return trusted Nodes or plain
text; callbacks are pure and must not mutate the explorer. `detailWidth` defaults
to 58. `rowHeight`, `nodeIcon(item)` and `showHeader:false` allow compact embedding
in an existing section. The name editor still edits the original name field.
`dragDrop:true` enables same-explorer HTML drag/drop into folders. `moveResource`
uses the same cut/paste permissions and authoritative provider move operation;
it never reorders rows speculatively. Cross-explorer/OS drops are not supported.
Tests: reader-shell-contracts.spec.js.
