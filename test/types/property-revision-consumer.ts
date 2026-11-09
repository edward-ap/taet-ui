import { EditorControl } from 'taet-ui';
import { PropertyGrid } from 'taet-ui/components';
import type { PropertyEditorContext, PropertyGridEvents, PropertyGridOptions } from 'taet-ui/experimental';
import { gridEditors, type CellEditorValidation } from 'taet-ui/grid/editors';
function check(value: unknown, message: string): asserts value { if (!value) throw Error(message); }
type Scenario = 'stable' | 'aba' | 'pending' | 'final-read' | 'missing' | 'ordinary';

export function checkPropertyRevisionBrowser(host: HTMLElement) {
  for (const scenario of ['stable', 'aba', 'pending', 'final-read', 'missing', 'ordinary'] as const) {
    let value = 'initial', revision = 0n, pending: string | null = null, fired = false, finalRead = false, disposed = 0;
    const set = (next: string) => { if (next !== value) { value = next; revision++; } };
    const editor = gridEditors.custom((context: PropertyEditorContext) => {
      value = String(context.value ?? '');
      return {
        ...(scenario === 'missing' ? {} : { getValidationRevision: () => revision }),
        mount(_container: HTMLElement) {}, focus() {}, destroy() { disposed++; },
        getValue() { if (finalRead) { finalRead = false; const old = value; set('temporary'); set(old); } return value; },
        validate() {
          if (!fired) {
            fired = true;
            if (scenario === 'aba') { const old = value; set('temporary'); set(old); }
            if (scenario === 'pending') { pending = 'draft'; revision++; pending = null; revision++; }
            if (scenario === 'final-read') finalRead = true;
          }
          return { ok: scenario !== 'ordinary' };
        }
      };
    });
    const grid = new PropertyGrid(host, { source: [{ id: 'group', properties: [{ name: 'value', type: 'custom', value: 'initial', editor }] }] });
    const rejections: PropertyGridEvents['editReject'][] = [];
    grid.events.on('editReject', event => {
      const reason: 'validation-revision' | 'validation-stale' = event.reason;
      const owner: PropertyGrid = event.source;
      const validation: CellEditorValidation = event.validation;
      check(owner === grid && event.name === 'value' && event.property.name === 'value', 'Property identity/source');
      check(event.group.id === 'group' && event.origin === 'api' && !event.userAction, 'Property provenance/group');
      void reason; void validation; rejections.push(event);
    });
    check(grid.startEdit('value'), 'Staged property editor starts'); set('candidate');
    const committed = grid.commitEdit();
    check(committed === (scenario === 'stable'), 'Staged strict currentness');
    check(grid.getPropertyControl('value')?.property.value === (committed ? 'candidate' : 'initial'), 'Rejected property stays unchanged');
    if (!committed && scenario !== 'ordinary') {
      const event = rejections[0];
      check(event && rejections.length === 1 && event.reason === (scenario === 'missing' ? 'validation-revision' : 'validation-stale'), 'Property strict reason');
      check(event.validation.ok === false && event.validation.source !== grid, 'Validation source is the editor');
      if (scenario === 'missing') {
        const error = event.validation.errors?.[0];
        check(error && typeof error === 'object' && 'code' in error && error.code === 'validationRevision', 'Property protocol code');
      } else {
        check(event.validation.errors?.length === 0 && disposed === 0, 'Stale editor remains open without fabricated error');
        check(grid.commitEdit(), 'Explicit property retry succeeds');
      }
    } else check(rejections.length === 0, 'No new rejection event for success or ordinary validation');
    grid.destroy(); check(Number(disposed) === 1 && !host.childElementCount, 'Property editor released once'); void pending;
  }
  // Inline controls use the same inherited EditorControl pipeline. Silent API
  // hydration remains allowed and does not write the PropertyGrid source.
  for (const scenario of ['stable', 'aba'] as const) {
    let control: EditorControl<string> | undefined;
    const editor = gridEditors.custom((context: PropertyEditorContext) => {
      const field = new EditorControl<string>({ value: String(context.value ?? '') }); control = field;
      if (scenario === 'aba') field.addValidator(() => {
        const old = field.value.get(); field.value.set('temporary', { silent: true }); field.value.set(old, { silent: true }); return null;
      });
      return field;
    });
    const grid = new PropertyGrid(host, { source: [{ id: 'group', properties: [{ name: 'value', type: 'text', value: 'initial', editor }] }] });
    check(control, 'Inline control created');
    const field = control, rejections: string[] = [];
    grid.events.on('editReject', event => rejections.push(event.reason));
    field.value.set('candidate', { origin: 'user', userAction: true });
    check(grid.getPropertyControl('value')?.property.value === (scenario === 'stable' ? 'candidate' : 'initial'), 'Inline currentness protects source');
    check(rejections.join() === (scenario === 'aba' ? 'validation-stale' : ''), 'Inline strict diagnostic');
    field.setReadOnly(true);
    check(field.value.set('hydrated', { silent: true, origin: 'api' }), 'Readonly API hydration stays allowed');
    check(!field.value.set('user-edit', { origin: 'user', userAction: true }), 'Readonly user write remains blocked');
    grid.destroy(); check(field.destroyed && !host.childElementCount, 'Inline owner cleanup');
  }
  // Silent staged attempts suppress only the notification, not the refusal.
  let active: EditorControl<string> | undefined;
  const editor = gridEditors.custom((context: PropertyEditorContext) => {
    const field = new EditorControl<string>({ value: String(context.value ?? '') }); active = field;
    field.addValidator(() => { const old = field.value.get(); field.value.set('temporary', { silent: true }); field.value.set(old, { silent: true }); return null; });
    return field;
  });
  const silent = new PropertyGrid(host, { source: [{ properties: [{ name: 'value', type: 'custom', value: 'initial', editor }] }] });
  let notifications = 0; silent.events.on('editReject', () => { notifications++; });
  check(silent.startEdit('value') && active, 'Silent session setup'); active.value.set('candidate', { silent: true });
  check(!silent.commitEdit({ silent: true }) && notifications === 0, 'Silent stale commit stays rejected without notification');
  silent.destroy();
}

function rejected(grid: PropertyGrid) {
  grid.events.on('editReject', event => {
    // @ts-expect-error Currentness rejection reasons are exactly the two documented literals.
    const ordinary: 'validation' = event.reason;
    // @ts-expect-error A rejection is not a vetoable before event.
    event.cancel = true;
    void ordinary;
  });
  const options: PropertyGridOptions = {
    // @ts-expect-error No constructor option is promised without a runtime binding.
    onEditReject() {}
  };
  void options;
}
void rejected;
if (typeof document === 'undefined') {
  const grid = new PropertyGrid(); grid.events.on('editReject', event => { const typed: PropertyGridEvents['editReject'] = event; void typed; }); grid.destroy();
  console.log('Installed PropertyGrid revision TS OK: exact event reasons, payload/source typing and no unsupported option callback');
}
