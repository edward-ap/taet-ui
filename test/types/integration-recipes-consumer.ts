// Public-import compile fixture for recipe12: application policies, no new framework API.
import { Dialog, Form, Grid, Layout, Panel, PropertyGrid, TextInput, Toolbar, Button, FilePicker,
  type GridLayoutState, type TreeGridLayoutState, type TreeGrid } from 'taet-ui/all';
interface RecordDto { id: string; name: string }
interface SavedUi { version: 1; grid: GridLayoutState<RecordDto, string>; tree: TreeGridLayoutState<string>;
  selectedId: string | null; query: string; properties: { labelWidth: number; collapsedCategories: string[] } }
interface RecordService { load(id: string): Promise<RecordDto>; save(dto: RecordDto): Promise<RecordDto> }
export function compose(host: HTMLElement) {
  const name = new TextInput({ name: 'name' });
  const form = new Form().row(name); // Deferred form composition.
  const toolbar = new Toolbar().add(new Button({ text: 'Save' }));
  const owner = new Panel(host); owner.add(form, toolbar); // Panel mounted before add.
  const layout = new Layout({ cols: [{ id: 'main' }] }); owner.add(layout);
  layout.cell('main').attach(new Panel()); layout.cell('main').attach(new Panel(), { replace: false });
  return { owner, form, name };
}
export async function editDto(dialog: Dialog, form: Form): Promise<RecordDto | null> {
  const unsubscribe = dialog.events.on('beforeClose', event => {
    if (event.result != null && !form.validate().ok) event.cancel = true;
  });
  dialog.disposables.add(unsubscribe);
  const pending = dialog.showModal();
  dialog.close({ result: { id: 'a', name: 'DTO' } satisfies RecordDto });
  try { const result: unknown = await pending; return isRecord(result) ? result : null; }
  finally { dialog.destroy(); }
}
function isRecord(value: unknown): value is RecordDto {
  return !!value && typeof value === 'object' && 'id' in value && typeof value.id === 'string'
    && 'name' in value && typeof value.name === 'string';
}
export function context(owner: Panel, grid: Grid<RecordDto, string>, form: Form, service: RecordService) {
  let revision = 0, id: string | null = null;
  owner.disposables.add(grid.selection.events.on('beforeChange', event => {
    if (form.isDirty() && event.items[0]?.id !== id) event.cancel = true;
  }));
  owner.disposables.add(grid.selection.events.on('invalidate', () => { revision++; id = grid.getSelectedIds()[0] ?? null; }));
  return async () => {
    const generation = ++revision, currentId = id;
    if (currentId == null) return false;
    const dto = await service.load(currentId);
    if (owner.destroyed || form.destroyed || generation !== revision || currentId !== id || form.isDirty()) return false;
    form.value.set({ name: dto.name }, { silent: true }); form.setCleanValue({ name: dto.name }); return true;
  };
}
export function persist(owner: Panel, grid: Grid<RecordDto, string>, tree: TreeGrid<{ id: string; parentId?: string; name: string }, string>, properties: PropertyGrid) {
  const save = () => { const state: SavedUi = { version: 1, grid: grid.getLayoutState(), tree: tree.getLayoutState(),
    selectedId: grid.getSelectedIds()[0] ?? null, query: '', properties: { labelWidth: properties.labelWidth, collapsedCategories: properties.getCollapsedCategories() } }; return JSON.stringify(state); };
  owner.disposables.add(grid.events.on('layoutChange', save)); owner.disposables.add(grid.events.on('columnResizeEnd', save));
  for (const column of grid.getLayoutState().columns) { const width: number | string | null = column.width; void width; }
  return save;
}
export function files(picker: FilePicker): File[] { return picker.getFiles(); }
