import type { Dialog, Form, Grid, Panel, PropertyGrid, TextInput, TreeGrid } from 'taet-ui/all';
export interface IntegrationRecord { id: string; name: string }
export interface IntegrationRecipeOptions {
  records?: IntegrationRecord[];
  rowRangeSelection?: boolean;
  service?: { load(id: string): Promise<IntegrationRecord>; save(dto: IntegrationRecord): Promise<IntegrationRecord> };
}
export interface IntegrationDialogSession {
  dialog: Dialog;
  name: TextInput;
  promise: Promise<IntegrationRecord | null>;
  ready: Promise<boolean>;
}
export interface IntegrationRecipes {
  owner: Panel; grid: Grid<IntegrationRecord, string>; tree: TreeGrid<{ id: string; parentId?: string; name: string }, string>;
  form: Form; name: TextInput; filter: TextInput; properties: PropertyGrid;
  save(): Promise<boolean>; discardDraft(): boolean;
  select(id: string): boolean; reload(): Promise<boolean>;
  setSearch(text: string): boolean; setTreeSearch(text: string): boolean;
  saveUi(): string | null; restoreUi(json?: string | null): boolean;
  openDialog(): IntegrationDialogSession | null;
  getContext(): { selectedId: string | null; draftRecordId: string | null; loading: boolean; saving: boolean; dirty: boolean };
  getPersistenceCount(): number; getSavedUi(): string | null; getLastDialogResult(): IntegrationRecord | null;
  destroy(): void;
}
export declare function createIntegrationRecipes(container: HTMLElement | string, options?: IntegrationRecipeOptions): IntegrationRecipes;
