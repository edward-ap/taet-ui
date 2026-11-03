import {
  Button, DataStore, DataView, Grid, LabelText, NumberInput, Panel, PropertyGrid,
  ReadonlyText, TextInput, TreeDataView, TreeGrid, gridEditors
} from "../../src/ui/all.js";

/** One screen owns the controls and their borrowed store/views. No global listeners. */
export function createGridWorkbench(container, records = sampleRecords(), { columnQA = false } = {}) {
  if (columnQA) {
    const ids = new Set(records.map(row => row.id));
    records = [...records, ...records.filter(row => row.kind === "project" && row.parentId == null)
      .flatMap(project => Array.from({ length:60 }, (_, index) => ({
        id:`column-qa-${project.id}-${index}`, parentId:project.id, kind:"task",
        name:`${project.name}: task ${index + 1}`, status:index % 2 ? "Ready" : "Queued", hours:index % 12
      }))).filter(row => !ids.has(row.id))];
  }
  const data = new DataStore();
  const owner = new Panel({ name: "gridWorkbench", css: `grid-workbench${columnQA ? " grid-workbench--columns" : ""}`, scroll: "hidden" });
  const activeEditors = new Map();
  let contextId = "atlas", selectedId = null, boundRecord = null;
  let contextFilter = null;
  let synchronizing = 0, selectionRequest = 0, propertyWrite = false, refreshQueued = false;
  let closing = false, savedLayouts = null;
  const alive = () => !closing && !owner.destroyed;
  owner.disposables.add(() => data.destroy());

  try {
    data.parse(records, { origin: "import", silent: true });
    const roots = data.all().filter(row => row.parentId == null).map(row => row.id);
    contextId = roots[0] ?? null;
    const treeView = new TreeDataView({ data, expandedIds: roots });
    const view = new DataView({ data });
    owner.disposables.add(() => treeView.destroy());
    owner.disposables.add(() => view.destroy());

    const title = new LabelText({ text: "Project workbench", css: "grid-workbench__title" });
    const subtitle = new ReadonlyText({ text: "Hierarchy · tasks · properties", css: "grid-workbench__subtitle" });
    const status = new ReadonlyText({ name: "workbenchStatus", role: "status", text: "Ready", css: "grid-workbench__status" });
    const taskTitle = new LabelText({ text: "Tasks", css: "grid-workbench__pane-title" });
    const propertyTitle = new LabelText({ text: "Properties — no selection", css: "grid-workbench__pane-title" });

    const trackedEditor = (key, numeric = false) => gridEditors.custom(context => {
      const control = numeric
        ? new NumberInput({ label: "", value: context.value, min: 0,
          validators: [value => Number.isFinite(value) && value >= 0 || "Hours must be zero or greater"] })
        : new TextInput({ label: "", value: context.value,
          validators: [value => String(value).trim().length >= 3 || "Use at least 3 characters"] });
      const id = context.id ?? selectedId;
      const entry = { owner: context.grid, control, id, item: data.get(id) };
      activeEditors.set(key, entry);
      control.disposables.add(() => {
        if (activeEditors.get(key) === entry) activeEditors.delete(key);
        queueProperties();
      });
      return control;
    });

    const treeColumns = () => columnQA ? [
      {id:"name",title:"Project / task",width:140,minWidth:120,maxWidth:220,frozen:"left",sortable:true,
        readOnly:row=>row.kind==="project",editor:trackedEditor("tree")},
      {id:"status",title:"Status",width:64,sortable:true},
      {id:"kind",title:"Kind",width:64,sortable:true},
      {id:"hours",title:"Hours",width:60,frozen:"right",align:"right",sortable:true,
        readOnly:row=>row.kind==="project",editor:trackedEditor("tree",true)}
    ] : [{ id:"name",title:"Project / task",width:"1fr",sortable:true,
      readOnly:row=>row.kind==="project",editor:trackedEditor("tree") }];
    const tree = new TreeGrid({ name: "workbenchHierarchy", css: "grid-workbench__tree",
      width: "100%", height: "100%", rowHeight: 24, data, treeView,
      treeColumnId: "name", multiSelect:columnQA, rowRangeSelection:columnQA, columnMenu: true, gridMenu: true, columnReorder: columnQA,
      nodeIcon: row => row.kind === "project" ? "folder" : "file",
      columns: treeColumns() });
    const columns = () => columnQA ? [
      {id:"name",title:"Task",width:"minmax(240px, 1fr)",minWidth:200,frozen:"left",sortable:true,
        filterable:true,editor:trackedEditor("grid")},
      {id:"status",title:"Status",width:136,sortable:true},
      {id:"id",title:"Record ID",width:150,sortable:true},
      {id:"parentId",title:"Project ID",width:150,sortable:true},
      {id:"kind",title:"Kind",width:104,sortable:true},
      {id:"hours",title:"Hours",width:84,dataType:"number",align:"right",frozen:"right",
        sortable:true,editor:trackedEditor("grid",true)}
    ] : [
      { id: "name", title: "Task", width: "minmax(210px, 1fr)", sortable: true,
        filterable: true, editor: trackedEditor("grid") },
      { id: "status", title: "Status", width: 100, sortable: true },
      { id: "hours", title: "Hours", width: 74, dataType: "number", align: "right",
        sortable: true, editor: trackedEditor("grid", true) }
    ];
    const grid = new Grid({ name: "workbenchTasks", css: "grid-workbench__tasks",
      width: "100%", height: "100%", rowHeight: 24, data, view, columns: columns(),
      columnMenu: true, gridMenu: true, columnReorder: columnQA, multiSelect:columnQA, rowRangeSelection:columnQA, clipboard: false, rangeSelection: false,
      statusBar: { visible: true, showRowPosition: true, showTotalCount: true } });
    const properties = new PropertyGrid({ name: "workbenchProperties", css: "grid-workbench__properties",
      width: "100%", height: "100%", labelWidth: 108, sortMode: "categorized" });

    function commitPending(except = null) {
      if (!alive()) return false;
      for (const entry of [...activeEditors.values()]) {
        if (entry.owner === except) continue;
        const committed = entry.owner.commitEdit({ origin: "user", userAction: true });
        if (!alive()) return false;
        const current = [...activeEditors.values()].find(candidate => candidate.owner === entry.owner);
        if (!committed || current) {
          (current ?? entry).control.focus({ preventScroll: true });
          if (!alive()) return false;
          status.setText("Finish or cancel the invalid draft before changing context.");
          return false;
        }
      }
      return alive();
    }

    function queueProperties() {
      if (!alive() || refreshQueued) return;
      refreshQueued = true;
      queueMicrotask(() => {
        refreshQueued = false;
        if (!alive() || activeEditors.has("properties")) return;
        const record = selectedId == null ? null : data.get(selectedId) ?? null;
        if (record === boundRecord) return;
        boundRecord = record;
        propertyTitle.setText(record ? `Properties — ${record.name}` : "Properties — no selection");
        if (!alive()) return;
        if (!record) { properties.clear({ silent: true }); return; }
        const write = (name, value, event) => {
          if (!alive()) return;
          const entry = activeEditors.get("properties");
          const current = data.get(record.id);
          if (selectedId !== record.id || !current || (entry && current !== entry.item)) return;
          propertyWrite = true;
          try { data.update(record.id, { [name]: value }, event); }
          finally { propertyWrite = false; }
        };
        properties.bind([{ id: "record", title: record.kind === "project" ? "Project" : "Task", properties: [
          { name: "id", label: "ID", type: "text", value: record.id, readOnly: true },
          { name: "name", label: "Name", type: "custom", value: record.name,
            editor: trackedEditor("properties"), set: (value, event) => write("name", value, event) },
          { name: "hours", label: "Hours", type: "custom", value: record.hours,
            readOnly: record.kind === "project", editor: trackedEditor("properties", true),
            set: (value, event) => write("hours", value, event) },
          { name: "status", label: "Status", type: "text", value: record.status, readOnly: true }
        ] }], { silent: true, origin: "system" });
      });
    }

    function projectOf(id) {
      const visited = new Set();
      let row = data.get(id);
      while (row && row.parentId != null && !visited.has(row.id)) {
        visited.add(row.id);
        row = data.get(row.parentId);
      }
      return row?.id ?? null;
    }

    function syncContext() {
      if (!alive()) return false;
      contextFilter = row => row.kind === "task" && projectOf(row.id) === contextId;
      grid.setFilter(contextFilter, { silent: true, origin: "system" });
      if (!alive()) return false;
      const project = contextId == null ? null : data.get(contextId);
      taskTitle.setText(project ? `Tasks — ${project.name}` : "Tasks");
      return alive();
    }

    function synchronize(action) {
      synchronizing++;
      try { action(); } finally { synchronizing--; }
      queueProperties();
    }

    function fromTree() {
      if (!alive() || synchronizing) return;
      synchronize(() => {
        const ids = tree.getSelectedIds();
        const id = ids[0] ?? null;
        if (id !== selectedId) selectionRequest++;
        selectedId = id;
        if (id != null) { contextId = projectOf(id); if (!syncContext()) return; }
        const row = id == null ? null : data.get(id);
        if (columnQA) grid.setSelectedIds(ids.filter(candidate =>
          data.get(candidate)?.kind === "task" && projectOf(candidate) === contextId && view.get(candidate)),
          { silent:true, origin:"system" });
        else if (row?.kind === "task") grid.setSelectedIds([id], { silent: true, origin: "system" });
        else {
          grid.cancelEdit({ silent: true, origin: "system" });
          if (!alive()) return;
          grid.clearSelection({ silent: true, origin: "system" });
        }
        if (!alive()) return;
        if (!propertyWrite && activeEditors.has("properties")) properties.cancelEdit({ silent: true, origin: "system" });
      });
    }

    function fromGrid() {
      if (!alive() || synchronizing) return;
      synchronize(() => {
        const ids = grid.getSelectedIds();
        const id = ids[0] ?? null;
        if (id !== selectedId) selectionRequest++;
        selectedId = id;
        if (id != null) {
          const ancestors = [];
          for (const selected of columnQA ? ids : [id]) {
            let row = data.get(selected);
            const path = new Set();
            while (row?.parentId != null && !path.has(row.parentId)) {
              path.add(row.parentId);
              if (!ancestors.includes(row.parentId)) ancestors.unshift(row.parentId);
              row = data.get(row.parentId);
            }
          }
          for (const ancestor of ancestors) {
            tree.expand(ancestor, { silent: true, origin: "system" });
            if (!alive()) return;
          }
          tree.setSelectedIds(columnQA ? ids.filter(candidate => treeView.get(candidate)) : [id],
            { silent: true, origin: "system" });
        } else tree.clearSelection({ silent: true, origin: "system" });
        if (!alive()) return;
        if (!propertyWrite && activeEditors.has("properties")) properties.cancelEdit({ silent: true, origin: "system" });
      });
    }

    function guardSelection(table, event) {
      if (!alive() || synchronizing || event.cancel) return;
      const request = ++selectionRequest;
      if (activeEditors.size === 0) return;
      const ids = event.items.map(row => data.idOf(row));
      event.cancel = true;
      if (!commitPending()) return;
      // Committing changes record identities. Replay the requested IDs after the
      // original beforeChange has unwound, rather than overwriting newer models.
      queueMicrotask(() => {
        if (alive() && request === selectionRequest) {
          table.setSelectedIds(ids, { origin: event.origin, userAction: event.userAction });
        }
      });
    }

    owner.disposables.add(tree.selection.events.on("beforeChange", event => guardSelection(tree, event)));
    owner.disposables.add(grid.selection.events.on("beforeChange", event => guardSelection(grid, event)));
    owner.disposables.add(tree.selection.events.on("invalidate", fromTree));
    owner.disposables.add(grid.selection.events.on("invalidate", fromGrid));
    for (const table of [tree, grid]) {
      owner.disposables.add(table.events.on("beforeEditStart", event => {
        if (!commitPending(table)) event.cancel = true;
      }));
    }
    owner.disposables.add(properties.events.on("editStart", () => {
      if (!commitPending(properties) && alive()) properties.cancelEdit({ silent: true });
    }));
    owner.disposables.add(data.events.on("invalidate", () => {
      if (!alive()) return;
      const editor = activeEditors.get("properties");
      if (editor && !propertyWrite && data.get(editor.id) !== editor.item) properties.cancelEdit({ silent: true });
      queueProperties();
    }));
    owner.disposables.add(view.events.on("invalidate", () => {
      if (!alive()) return;
      // Project scope is application context, separate from user conditions.
      // A table-level clear may remove the public predicate; reassert that scope
      // through the same public setter, with no second table state/model.
      if (contextFilter && view.getFilter() !== contextFilter) {
        grid.setFilter(contextFilter, { silent: true, origin: "system", reason: "project-context" });
        if (!alive()) return;
      }
      queueProperties();
    }));
    owner.disposables.add(treeView.events.on("invalidate", queueProperties));

    const filter = new TextInput({ name: "workbenchFilter", label: "Find task", labelWidth: 62, width: 240 });
    let query = "";
    function syncTaskFilter(showStatus = true) {
      if (!alive()) return;
      const condition = grid.filters.get("name");
      query = condition?.kind === "text" && condition.operator === "contains"
        ? String(condition.value ?? "") : "";
      filter.value.set(query, { silent: true, origin: "system" });
      if (alive() && showStatus) status.setText(query ? `Filtered tasks: ${query}`
        : grid.filters.hasAny() ? "Column conditions active." : "Task filter cleared.");
    }
    owner.disposables.add(grid.filters.events.on("invalidate", () => syncTaskFilter()));
    function setFilter(value) {
      if (!alive()) return false;
      if (!commitPending()) { syncTaskFilter(false); return false; }
      query = String(value ?? "");
      filter.value.set(query, { silent: true });
      if (!alive()) return false;
      if (query) grid.setColumnFilter("name", { kind: "text", operator: "contains", value: query });
      else grid.clearColumnFilter("name");
      if (!alive()) return false;
      syncTaskFilter();
      return alive();
    }
    owner.disposables.add(filter.events.on("change", event => setFilter(event.newValue)));

    function silentUpdate(id) {
      if (!alive()) return false;
      id ??= data.all().find(row => row.kind === "task" && row.id !== selectedId)?.id;
      const row = data.get(id);
      if (!row) return false;
      const changed = data.update(id, { hours: row.hours + 1 }, { silent: true, origin: "system" });
      if (alive()) status.setText(`Silent background update: ${id}. Drafts on other rows stay open.`);
      return changed;
    }
    function replaceRecords(rows) {
      if (!alive()) return false;
      selectionRequest++;
      const changed = data.parse(rows.map(row => ({ ...row })), { silent: true, origin: "import" });
      if (alive() && syncContext()) {
        queueProperties();
        status.setText("Records replaced; stable IDs retain selection.");
      }
      return changed;
    }

    function saveLayouts() {
      if (!alive()) return false;
      savedLayouts = JSON.stringify({tree:tree.getLayoutState(),grid:grid.getLayoutState()});
      status.setText("Column layouts saved in memory (JSON). Data was not written.");
      return true;
    }
    function restoreLayouts() {
      if (!alive() || !savedLayouts || !commitPending()) return false;
      const saved = JSON.parse(savedLayouts);
      tree.restoreLayoutState(saved.tree);
      if (!alive()) return false;
      grid.restoreLayoutState(saved.grid);
      if (!alive()) return false;
      status.setText("Saved column layouts restored; data and record IDs retained.");
      return true;
    }
    if (columnQA) {
      subtitle.setText("Drag headers within a pin band; pin/hide/Best fit via menus.");
      for (const [label, table] of [["Hierarchy",tree],["Tasks",grid]]) {
        owner.disposables.add(table.events.on("columnReorder",event=>{
          if (alive()) status.setText(`${label}: ${event.columnId} moved to column ${event.index + 1}.`);
        }));
      }
    }

    owner.mount(container);
    const heading = new Panel({ css: "grid-workbench__heading" });
    const toolbar = new Panel({ css: "grid-workbench__toolbar" });
    const body = new Panel({ css: "grid-workbench__body", scroll: "hidden" });
    owner.add(heading, toolbar, body, status);
    heading.add(title, subtitle);
    toolbar.add(
      new Button({ text: "Hierarchy", onClick: () => { if (commitPending()) tree.focus(); } }),
      filter,
      new Button({ text: "Clear filter", onClick: () => setFilter("") }),
      new Button({ text: "Silent update", onClick: () => silentUpdate() }),
      new Button({ text: "Reload records", onClick: () => { if (alive()) replaceRecords(data.all()); } }),
      new Button({ text: "Remove selected", onClick: () => {
        if (!alive() || !commitPending() || selectedId == null) return;
        const id = selectedId;
        const ids = data.all().filter(row => projectOf(row.id) === id || row.id === id).map(row => row.id);
        data.batch(() => { for (const rowId of ids.reverse()) { if (!alive()) break; data.remove(rowId); } });
        if (alive()) status.setText(`Removed ${id}.`);
      } })
    );
    if (columnQA) toolbar.add(
      new Button({text:"Save layout",onClick:saveLayouts}),
      new Button({text:"Restore layout",onClick:restoreLayouts}));
    const left = new Panel({ css: "grid-workbench__pane", scroll: "hidden" });
    const middle = new Panel({ css: "grid-workbench__pane", scroll: "hidden" });
    const right = new Panel({ css: "grid-workbench__pane grid-workbench__pane--properties", scroll: "hidden" });
    body.add(left, middle, right);
    left.add(new LabelText({ text: "Hierarchy", css: "grid-workbench__pane-title" }), tree);
    middle.add(taskTitle, grid);
    right.add(propertyTitle, new Button({ text: "Edit selected properties", onClick: () => {
      if (selectedId == null || !commitPending(properties)) return;
      properties.selectProperty("name");
      if (alive()) properties.startEdit("name");
    } }), properties);
    if (syncContext() && contextId != null) tree.setSelectedIds([contextId], { silent: true, origin: "import" });

    return {
      owner, data, treeView, view, tree, grid, properties, filterControl: filter,
      get selectedId() { return selectedId; }, get contextId() { return contextId; },
      get destroyed() { return !alive(); }, get activeEditorCount() { return activeEditors.size; },
      select(id) { return alive() && tree.setSelectedIds([id]); },
      setFilter, silentUpdate, replaceRecords, saveLayouts, restoreLayouts,
      restoreColumns() { if (alive()) grid.setColumns(columns()); },
      destroy() { if (!alive()) return; closing = true; selectionRequest++; owner.destroy(); }
    };
  } catch (error) { closing = true; owner.destroy(); throw error; }
}

function sampleRecords() {
  return [
    { id: "atlas", parentId: null, kind: "project", name: "Atlas desktop", status: "Active", hours: 0 },
    { id: "design", parentId: "atlas", kind: "task", name: "Design dense workflow", status: "In progress", hours: 12 },
    { id: "keys", parentId: "atlas", kind: "task", name: "Review keyboard rules", status: "Ready", hours: 5 },
    { id: "docs", parentId: "atlas", kind: "task", name: "Write migration notes", status: "Queued", hours: 3 },
    { id: "boreal", parentId: null, kind: "project", name: "Boreal release", status: "Active", hours: 0 },
    { id: "package", parentId: "boreal", kind: "task", name: "Prepare local package", status: "Ready", hours: 4 },
    { id: "verify", parentId: "boreal", kind: "task", name: "Run acceptance checks", status: "Queued", hours: 8 }
  ];
}
