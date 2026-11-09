import { gridEditors, createGridEditorFactory, ControlCellEditor, isGridEditorFactory,
  type GridEditorColumn, type GridCellEditorContext, type GridEditorHost,
  type GridEditorFactory, type GridValueControl, type GridEditingEvents,
  type TreeGridEditingEvents, type SharedGridEditingEvents, type GridBuiltinEditorControl } from 'taet-ui/grid/editors';
import type { EventBus } from 'taet-ui/core';

export interface Row { id: number; parentId: number | null; name: string; limit: number }
export const captures: { id: number; rowIndex: number; value: unknown }[] = [];
export const validationContexts: number[] = [];
export const valueEvents: string[] = [];
export const controlEvents = { focusValues: [] as string[], blur: 0, keys: [] as string[], resize: 0 };
export let focusedControl: GridBuiltinEditorControl<string> | null = null;
export const textEditor = gridEditors.text<Row>(context => {
  captures.push({ id: context.id, rowIndex: context.rowIndex, value: context.value });
  return {
    placeholder: `Position ${context.rowIndex}`, maxLength: context.item.limit,
    observeResize: true,
    onFocus: event => {
      focusedControl = event.source;
      controlEvents.focusValues.push(event.source.value.get());
      event.source.state.set('typed-editor-focus', true, { silent: true });
    },
    onBlur: event => { event.source.value.get().toUpperCase(); controlEvents.blur++; },
    onKeyDown: event => {
      controlEvents.keys.push(`down:${event.key}`);
      if (event.key === 'F2') event.cancel = true;
      const native: KeyboardEvent = event.nativeEvent; void native;
    },
    onKeyUp: event => { controlEvents.keys.push(`up:${event.key}`); },
    onResize: event => { const size: number | string | null = event.width; void size; controlEvents.resize++; },
    onParentResize: event => { event.parent.getSize(); event.source.value.get().toUpperCase(); },
    validators: [(value, validation) => {
      if (validation.rowIndex !== undefined) validationContexts.push(validation.rowIndex);
      return value.trim() ? null : 'A name is required';
    }],
    onChange: event => { valueEvents.push(event.newValue.toUpperCase()); }
  };
});

// Delegate to the same library control factory, retaining the full lifecycle.
// No application-owned input DOM and no dependency on a private Grid editor field.
export let customCreated = 0, customDestroyed = 0;
export const customEditor = createGridEditorFactory<Row, number, string>(context => {
  const inner = textEditor.createCellEditor(context); customCreated++;
  // Retain the actual library adapter: a plain forwarding object loses its
  // private currentness capability and would need its own complete revision hook.
  const destroy = inner.destroy.bind(inner);
  inner.destroy = () => { destroy(); customDestroyed++; };
  return inner;
}, { activation: 'edit', filterType: 'text' });
export const resolverSources: ('present' | 'absent')[] = [];
export function activationEditor(onMount: () => void, onDestroy: () => void) {
  return createGridEditorFactory<Row, number, string>(context => {
    const inner = gridEditors.text<Row>().createCellEditor(context);
    const mount = inner.mount.bind(inner), destroy = inner.destroy.bind(inner);
    inner.mount = host => { const mounted = mount(host); onMount(); return mounted; };
    inner.destroy = () => { destroy(); onDestroy(); };
    return inner;
  });
}
export const columns: GridEditorColumn<Row>[] = [
  { id: 'name', width: 260, sortable: true,
    value: (item, rowIndex) => `${item.name} / ${rowIndex}`,
    editor: (_item, _column, grid) => {
      resolverSources.push(grid ? 'present' : 'absent'); return customEditor;
    },
    set: (_item, value, context) => {
      if (typeof value !== 'string') return false;
      return context.source.data.update(context.id, { name: value }, {
        origin: context.origin, userAction: context.userAction, silent: context.silent === true
      });
    }
  }
];

export function observe(grid: GridEditorHost<Row>) {
  const events: string[] = [];
  const attempts: { type: string; columnId: string; origin: string; userAction: boolean }[] = [];
  const phases = (['beforeCellChange', 'editReject', 'cellChange', 'editCommit'] as const).map(type =>
    grid.events.on(type, event => attempts.push({ type, columnId: event.columnId,
      origin: event.origin, userAction: event.userAction })));
  const cancellations: { origin: string; userAction: boolean; reason: string | undefined }[] = [];
  const cancel = grid.events.on('editCancel', event => {
    cancellations.push({ origin: event.origin, userAction: event.userAction, reason: event.reason });
  });
  const reject = grid.events.on('editReject', event => {
    events.push(`reject:${event.reason}`);
    if (event.reason === 'validation' && event.validation?.ok !== false) {
      throw new Error('Validation rejection must retain the editor result');
    }
    event.columnId.toUpperCase();
  });
  const veto = grid.events.on('beforeCellChange', event => {
    if (event.newValue === 'VETO') event.cancel = true;
    if (typeof event.newValue === 'string') event.newValue = event.newValue.trim();
  });
  const commit = grid.events.on('editCommit', event => {
    const id: number = event.id; events.push(`commit:${id}`);
  });
  return { events, attempts, cancellations, dispose() {
    reject.dispose(); veto.dispose(); commit.dispose(); cancel.dispose(); phases.forEach(subscription => subscription.dispose());
  } };
}

export function cancelForReload(grid: GridEditorHost<Row>) {
  return grid.cancelEdit({ origin: 'system', userAction: false, reason: 'reload' });
}

// These are executed by the installed consumer in Node as well as the browser.
export function checkFactories() {
  const factories = [textEditor, customEditor, gridEditors.number<Row>({ min: 0, validators: [value => value === null ? false : value >= 0] }),
    gridEditors.select<Row>({ options: [{ id: 'a', text: 'A' }] as const, searchable: true }),
    gridEditors.radio<Row>({ options: ['A', 'B'], layout: 'flow', markerStyle: 'letter' }),
    gridEditors.checkbox<Row>(), gridEditors.switch<Row>(), gridEditors.date<Row>(),
    gridEditors.time<Row>({ hourMode: '12' }), gridEditors.dateTime<Row>(),
    gridEditors.custom<Row>(context => textEditor.createCellEditor(context))];
  if (!factories.every(isGridEditorFactory) || isGridEditorFactory({ type: 'text' })) throw new Error('Factory identity');
  return factories.length;
}
checkFactories();

function rejected(context: GridCellEditorContext<Row>, host: GridEditorHost<Row>,
  gridEvents: EventBus<GridEditingEvents<Row>>, treeEvents: EventBus<TreeGridEditingEvents<Row>>,
  shared: EventBus<SharedGridEditingEvents<Row>>) {
  gridEditors.text<Row>({ onKeyDown: event => {
    // @ts-expect-error Key cancellation requires a boolean.
    event.cancel = 'yes';
    // @ts-expect-error The source is the live editor control, not its table.
    event.source.getSelectedIds();
  } });
  // @ts-expect-error Row IDs retain their type.
  host.startEdit('1', 'name');
  // @ts-expect-error Raw cell values must be narrowed, not assumed to be strings.
  context.value.toUpperCase();
  // @ts-expect-error The record schema is available inside option callbacks.
  gridEditors.text<Row>(cell => ({ placeholder: cell.item.typo }));
  // @ts-expect-error Numeric editor options are checked.
  gridEditors.number<Row>({ min: 'zero' });
  // @ts-expect-error Radio uses flow, not a row layout name.
  gridEditors.radio<Row>({ layout: 'row' });
  // @ts-expect-error Search belongs to Select, not Radio.
  gridEditors.radio<Row>({ searchable: true });
  // @ts-expect-error Number validators see number | null, not string.
  gridEditors.number<Row>({ validators: [value => value.toUpperCase()] });
  // @ts-expect-error Factory option callbacks cannot return descriptor arrays.
  gridEditors.text<Row>(() => []);
  // @ts-expect-error String editor declarations are not supported.
  const badColumn: GridEditorColumn<Row> = { id: 'name', editor: 'text' };
  // @ts-expect-error Field spelling is checked independently of a computed column ID.
  const badField: GridEditorColumn<Row> = { id: 'display', field: 'typo' };
  // @ts-expect-error A setter must be synchronous.
  const asyncColumn: GridEditorColumn<Row> = { id: 'name', set: async () => true };
  const resolver: GridEditorColumn<Row> = { id: 'name', editor: (_item, _column, grid) => {
    // @ts-expect-error Resolver preflight calls can omit the source.
    grid.data.get(1); return customEditor;
  } };
  // @ts-expect-error Raw cell-editor implementations require validation.
  const incomplete: GridEditorFactory<Row> = { createCellEditor: () => ({ mount() {}, focus() {}, getValue() { return ''; }, destroy() {} }) };
  // @ts-expect-error Custom creator must return a live control or cell editor.
  gridEditors.custom<Row>(() => ({ type: 'text' }));
  // @ts-expect-error custom takes one argument; factory metadata belongs to createGridEditorFactory.
  gridEditors.custom<Row>(() => textEditor.createCellEditor(context), { activation: 'toggle' });
  treeEvents.on('beforeEditStart', event => { event.cancel = true; });
  treeEvents.on('editCommit', event => {
    const changed: boolean = event.changed;
    const legacyCancel: boolean = event.cancel;
    void [changed, legacyCancel];
  });
  shared.on('editCommit', event => {
    const writeResult: boolean = event.writeResult;
    void writeResult;
  });
  gridEvents.on('editCommit', event => { const changed: boolean = event.changed; void changed; });
  gridEvents.on('beforeEditStart', event => { event.cancel = true; });
  const valueControl: GridValueControl<string> = { value: { get: () => '', set: () => true }, mount() {}, focus() {}, destroy() {} };
  const adapter = new ControlCellEditor(valueControl, context);
  const text: string = adapter.getValue();
  // @ts-expect-error Generic getValue result retains the control's value type.
  const numeric: number = adapter.getValue();
  void [badColumn, badField, asyncColumn, resolver, incomplete, text, numeric];
}
void rejected;

// Execute the nullable factory contract against the freshly installed package in
// both Node and the independent browser consumer, not repository source aliases.
import {verifyGridMatrixCodecs} from './grid-editor-matrix-consumer.js';
verifyGridMatrixCodecs();
