import { Button, Dialog, Form, Grid, Layout, Panel, PropertyGrid, ReadonlyText, TextInput, Toolbar, TreeGrid, required } from "../../src/ui/all.js";

/**
 * Checked application recipes, not a new framework state/service API.
 * @param {HTMLElement|string} container Mounted host or selector.
 * @param {import('./12-integration-contracts.js').IntegrationRecipeOptions} [options]
 */
export function createIntegrationRecipes(container, options = {}) {
  const rows = (options.records ?? [{ id: "a", name: "Alpha" }, { id: "b", name: "Beta" }]).map(row => ({ ...row }));
  let disposed = false, contextRevision = 0, draftRevision = 0, saveRevision = 0;
  let currentId = null, draftRecordId = null, loading = false, saving = false;
  let rejectNext = false, activeDialog = null, lastDialogResult = null;
  let query = "", treeQuery = "", savedUi = null, persistQueued = false, persistenceCount = 0;
  const owner = new Panel({ name: "integrationRecipes", css: "integration-recipes" });
  const status = new ReadonlyText({ name: "recipeStatus", text: "Select a record.", ariaRole: "status" });
  const name = new TextInput({ name: "name", label: "Record name", validators: [required("A name is required")] });
  const form = new Form({ name: "recordDraft", labelWidth: 88 }).row(name);
  const grid = new Grid({ name: "recipeRecords", width: "100%", height: 236, rowHeight: 24,
    multiSelect: true, rowRangeSelection: options.rowRangeSelection !== false,
    columns: [{ id: "name", title: "Record", width: 160, sortable: true }, { id: "id", title: "ID", width: 90 }] });
  const tree = new TreeGrid({ name: "recipeHierarchy", width: "100%", height: 180, rowHeight: 24,
    treeColumnId: "name", columns: [{ id: "name", title: "Hierarchy", width: 240 }] });
  const properties = new PropertyGrid({ name: "recipeViewSettings", width: "100%", height: 148, labelWidth: 112, sortMode: "none",
    source: [{ id: "display", title: "Display", properties: [
      { name: "density", label: "Density", type: "text", value: "24px rows / 10px gutter", readOnly: true },
      { name: "state", label: "Saved state", type: "text", value: "UI only, not record data", readOnly: true }
    ] }] });
  const filter = new TextInput({ name: "recordQuery", label: "Find record", labelWidth: 80, width: "100%" });
  const treeFilter = new TextInput({ name: "treeQuery", label: "Find branch", labelWidth: 80, width: "100%" });
  const service = options.service ?? {
    async load(id) { return { ...grid.data.get(id) }; },
    async save(dto) { if (rejectNext) { rejectNext = false; throw new Error("Mock service rejected the save. Draft retained."); } return { ...dto }; }
  };
  const alive = () => !disposed && !owner.destroyed && !form.destroyed && !grid.destroyed && !tree.destroyed;
  const say = text => { if (alive()) status.setText(text); };
  const isRecord = value => value && typeof value.id === "string" && typeof value.name === "string";

  function applyRecord(record) {
    if (!alive()) return false;
    form.value.set({ name: record.name }, { silent: true, origin: "import" });
    if (!alive()) return false;
    form.setCleanValue({ name: record.name }, { silent: true });
    return alive();
  }
  async function loadCurrent(id) {
    if (!alive() || currentId !== id || form.isDirty() || saving) return false;
    const revision = ++contextRevision, draft = draftRevision;
    ++saveRevision; loading = true; say(`Loading ${id}.`);
    try {
      const record = await service.load(id);
      if (!alive() || revision !== contextRevision || currentId !== id || draftRecordId !== id) return false;
      if (!isRecord(record) || record.id !== id) throw new Error("Unexpected record response.");
      if (draft !== draftRevision || form.isDirty()) { say("Loaded response ignored: newer draft retained."); return false; }
      if (!applyRecord(record)) return false;
      say(`Loaded ${id}.`); return true;
    } catch (error) {
      if (alive() && revision === contextRevision && currentId === id) say(`Load failed: ${error.message}`);
      return false;
    } finally { if (alive() && revision === contextRevision) loading = false; }
  }
  function syncSelection() {
    if (!alive()) return;
    const id = grid.getSelectedIds()[0] ?? null;
    if (id === currentId) return;
    ++contextRevision; ++saveRevision; loading = saving = false;
    currentId = id;
    if (form.isDirty()) {
      form.setReadOnly(id !== draftRecordId);
      if (alive()) say(id === draftRecordId ? "Reselected record; draft retained."
        : "Current record changed automatically. Draft retained; reselect its record or Discard draft.");
      return;
    }
    if (id == null) {
      form.setReadOnly(true);
      draftRecordId = null; applyRecord({ name: "" }); say("No selected record.");
      return;
    }
    form.setReadOnly(false);
    if (!alive()) return;
    draftRecordId = id;
    if (applyRecord(grid.data.get(id))) void loadCurrent(id);
  }
  async function save() {
    if (!alive() || currentId == null || draftRecordId !== currentId || saving) return false;
    if (!form.submit({ origin: "user", userAction: true }) || !alive()) return false;
    const id = currentId, context = ++contextRevision, revision = ++saveRevision, draft = draftRevision;
    loading = false; // A save supersedes earlier reads of this record.
    const dto = { id, name: String(name.value.get()) };
    saving = true; say(`Saving ${id}.`);
    try {
      const record = await service.save(dto);
      if (!alive() || context !== contextRevision || revision !== saveRevision || currentId !== id) return false;
      if (!isRecord(record) || record.id !== id) throw new Error("Unexpected save response.");
      grid.data.update(id, { name: record.name }, { origin: "api" });
      if (!alive() || context !== contextRevision || revision !== saveRevision || currentId !== id) return false;
      if (grid.data.get(id)?.name !== record.name) { say("Local record write rejected; draft retained."); return false; }
      if (draft === draftRevision) applyRecord(record);
      else form.setCleanValue({ name: record.name }, { silent: true });
      say(draft === draftRevision ? `Saved ${id}.` : "Saved previous input; newer draft retained.");
      return true;
    } catch (error) {
      if (alive() && context === contextRevision && revision === saveRevision) say(`Save failed: ${error.message}`);
      return false;
    } finally { if (alive() && revision === saveRevision) saving = false; }
  }
  function discardDraft() {
    if (!alive()) return false;
    ++contextRevision; ++saveRevision; ++draftRevision; loading = saving = false;
    currentId = grid.getSelectedIds()[0] ?? null; draftRecordId = currentId;
    form.clearValidation({ silent: true });
    if (!applyRecord(currentId == null ? { name: "" } : grid.data.get(currentId))) return false;
    form.setReadOnly(currentId == null); say("Draft discarded explicitly."); return true;
  }
  function setSearch(text) {
    if (!alive()) return false;
    if (form.isDirty()) { filter.value.set(query, { silent: true }); say("Save or discard the draft before filtering."); return false; }
    query = String(text).trim(); filter.value.set(query, { silent: true });
    const folded = query.toLocaleLowerCase();
    grid.setFilter(query ? row => row.name.toLocaleLowerCase().includes(folded) : null);
    return alive();
  }
  function setTreeSearch(text) {
    if (!alive()) return false;
    treeQuery = String(text).trim(); treeFilter.value.set(treeQuery, { silent: true });
    const folded = treeQuery.toLocaleLowerCase();
    tree.setFilter(treeQuery ? row => row.name.toLocaleLowerCase().includes(folded) : null);
    return alive();
  }
  function saveUi() {
    if (!alive()) return null;
    savedUi = JSON.stringify({ version: 1, grid: grid.getLayoutState(), tree: tree.getLayoutState(), query, treeQuery,
      selectedId: grid.getSelectedIds()[0] ?? null,
      properties: { labelWidth: properties.labelWidth, sortMode: properties.sortMode,
        collapsedCategories: properties.getCollapsedCategories(), expandedProperties: properties.getExpandedProperties() } });
    return savedUi;
  }
  function restoreUi(json = savedUi) {
    if (!alive() || !json || form.isDirty()) { say("Save or discard the draft before restoring UI state."); return false; }
    const state = JSON.parse(json);
    if (state.version !== 1 || !Array.isArray(state.grid?.columns) || !Array.isArray(state.tree?.columns)) throw new TypeError("Unsupported recipe UI state.");
    grid.restoreLayoutState(state.grid, { silent: true }); if (!alive()) return false;
    tree.restoreLayoutState(state.tree, { silent: true }); if (!alive()) return false;
    setSearch(state.query ?? ""); if (!alive()) return false;
    setTreeSearch(state.treeQuery ?? ""); if (!alive()) return false;
    if (state.properties) {
      properties.setLabelWidth(state.properties.labelWidth, { silent: true });
      properties.setSortMode(state.properties.sortMode, { silent: true });
      const collapsed = new Set(state.properties.collapsedCategories ?? []);
      for (const id of ["display"]) collapsed.has(id) ? properties.collapseCategory(id, { silent: true }) : properties.expandCategory(id, { silent: true });
      for (const id of properties.getExpandedProperties()) properties.collapseProperty(id, { silent: true });
      for (const id of state.properties.expandedProperties ?? []) properties.expandProperty(id, { silent: true });
    }
    if (!alive()) return false;
    const id = state.selectedId;
    grid.setSelectedIds(id != null && grid.view.all().some(row => row.id === id) ? [id] : [], { silent: true });
    say("UI state restored; record data and callbacks were not serialized."); return alive();
  }
  function queuePersistence() {
    if (!alive() || persistQueued) return;
    persistQueued = true;
    queueMicrotask(() => { persistQueued = false; if (alive()) { saveUi(); persistenceCount++; } });
  }
  function openDialog() {
    if (!alive()) return null;
    if (activeDialog && !activeDialog.dialog.destroyed) return activeDialog;
    const id = currentId, context = contextRevision;
    const content = new Panel({ padding: 12 });
    const field = new TextInput({ name: "dialogName", label: "Dialog name", value: String(name.value.get()), validators: [required("A name is required")] });
    const note = new ReadonlyText({ text: "Loading dialog content.", ariaRole: "status" });
    const dialogForm = new Form({ labelWidth: 88 }).row(field);
    const dialog = new Dialog({ title: "Return a record DTO", width: 380, content, destroyContent: true, draggable: true });
    let edited = false;
    dialogForm.row(new Button({ text: "Return DTO", onClick() {
      if (!alive() || dialog.destroyed) return;
      if (currentId !== id) { note.setText("Context changed; cancel this dialog."); return; }
      dialog.close({ result: { id: id ?? "new", name: String(field.value.get()) }, origin: "user", userAction: true });
    } }), new Button({ text: "Cancel DTO", onClick: () => dialog.close({ result: null, reason: "cancel", origin: "user", userAction: true }) }));
    dialog.disposables.add(field.events.on("change", () => { edited = true; }));
    dialog.disposables.add(dialog.events.on("beforeClose", event => {
      if (event.result != null && !dialogForm.validate().ok) event.cancel = true;
    }));
    const result = dialog.showModal();
    // Popup mounted its Panel content; ordinary Panel.add is safe only now.
    content.add(dialogForm, note); dialog.reposition();
    const session = { dialog, name: field, promise: null, ready: null };
    activeDialog = session;
    session.promise = result.then(value => {
      if (activeDialog === session) activeDialog = null;
      if (alive()) { lastDialogResult = isRecord(value) ? value : null; say(value == null ? "Dialog cancelled." : "DTO returned without writing the record store."); }
      return isRecord(value) ? value : null;
    }).finally(() => dialog.destroy());
    session.ready = (async () => {
      if (id == null) { note.setText("Enter a name and return a DTO."); return true; }
      try {
        const record = await service.load(id);
        if (!alive() || dialog.destroyed || activeDialog !== session || context !== contextRevision || id !== currentId) return false;
        if (!isRecord(record) || record.id !== id) throw new Error("Unexpected dialog response.");
        if (!edited) field.value.set(record.name, { silent: true });
        if (!alive() || dialog.destroyed) return false;
        note.setText(edited ? "Loaded response ignored: dialog draft retained." : "Content loaded. Return DTO uses the result envelope.");
        dialog.reposition(); return true;
      } catch (error) { if (alive() && !dialog.destroyed && activeDialog === session) note.setText(`Load failed: ${error.message}`); return false; }
    })();
    return session;
  }
  function destroy() { if (disposed) return; disposed = true; ++contextRevision; ++saveRevision; activeDialog?.dialog.destroy(); owner.destroy(); }

  const toolbar = new Toolbar({ name: "recipeActions" }).add(
    new Button({ text: "Save record", onClick: () => { void save(); } }),
    new Button({ text: "Discard draft", onClick: discardDraft }),
    new Button({ text: "Reload record", onClick: () => { if (currentId != null) void loadCurrent(currentId); } }),
    new Button({ text: "Reject next save", onClick: () => { rejectNext = true; say("The mock service will reject the next save."); } }),
    new Button({ text: "Open DTO dialog", onClick: openDialog }),
    new Button({ text: "Save UI", onClick: () => { saveUi(); say("UI saved in memory."); } }),
    new Button({ text: "Restore UI", onClick: () => restoreUi() }));
  owner.mount(container);
  const columns = new Layout({ css: "integration-recipes__columns", height: 390, cols: [{ id: "hierarchy", flex: 1 }, { id: "records", flex: 1 }, { id: "details", flex: 1 }] });
  owner.add(new ReadonlyText({ text: "Integration recipes: owned controls, guarded async work and UI state. Mock service; no network." }), toolbar, columns, status);
  const left = new Panel({ css: "integration-recipes__pane" }), middle = new Panel({ css: "integration-recipes__pane" }), right = new Panel({ css: "integration-recipes__pane" });
  columns.cell("hierarchy").attach(left); columns.cell("records").attach(middle); columns.cell("details").attach(right);
  left.add(treeFilter, tree, new Button({ text: "All-match tree filter", onClick: () => { if (alive()) { tree.setFilter(() => true); say("All-match is still filtered: paths appear expanded. Clear the query to restore remembered expansion."); } } }), new Button({ text: "Clear tree search", onClick: () => setTreeSearch("") }));
  middle.add(filter, grid, new Button({ text: "Clear record search", onClick: () => setSearch("") }));
  right.add(form, properties);
  grid.data.parse(rows);
  tree.data.parse([{ id: "root", name: "Workspace" }, { id: "child", parentId: "root", name: "Records" }, { id: "leaf", parentId: "child", name: "Details" }]);
  owner.disposables.add(name.events.on("change", () => { draftRevision++; }));
  owner.disposables.add(filter.events.on("change", event => setSearch(event.newValue)));
  owner.disposables.add(treeFilter.events.on("change", event => setTreeSearch(event.newValue)));
  owner.disposables.add(grid.selection.events.on("beforeChange", event => {
    if (alive() && form.isDirty() && event.items[0]?.id !== currentId && event.items[0]?.id !== draftRecordId) { event.cancel = true; say("Save or discard the draft before selecting another record."); }
  }));
  // Technical invalidate follows silent projection pruning as well as user selection.
  owner.disposables.add(grid.selection.events.on("invalidate", syncSelection));
  for (const table of [grid, tree]) for (const event of ["layoutChange", "columnResizeEnd"]) owner.disposables.add(table.events.on(event, queuePersistence));
  for (const event of ["labelWidthChange", "categoryToggle", "propertyToggle"]) owner.disposables.add(properties.events.on(event, queuePersistence));
  owner.disposables.add(() => { disposed = true; ++contextRevision; ++saveRevision; activeDialog?.dialog.destroy(); });
  grid.setSelectedIds(rows.length ? [rows[0].id] : [], { silent: true, origin: "import" });
  if (!rows.length) form.setReadOnly(true);
  return { owner, grid, tree, form, name, filter, properties, save, discardDraft, setSearch, setTreeSearch, saveUi, restoreUi, openDialog, destroy,
    select(id) { return alive() && grid.setSelectedIds([id]); },
    reload() { return currentId == null ? Promise.resolve(false) : loadCurrent(currentId); },
    getContext() { return { selectedId: currentId, draftRecordId, loading, saving, dirty: alive() && form.isDirty() }; },
    getPersistenceCount() { return persistenceCount; }, getSavedUi() { return savedUi; }, getLastDialogResult() { return lastDialogResult; } };
}
