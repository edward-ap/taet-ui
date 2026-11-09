import { EditorControl, type ValidationRevision as FormRevision } from 'taet-ui';
import { Grid, TreeGrid } from 'taet-ui/grid';
import { gridEditors, type CellEditor, type GridValueControl, type GridEditorFactory,
  type GridEditorValidationContext, type GridEditorHost, type ValidationRevision, type ValidationRevisionSource } from 'taet-ui/grid/editors';

interface Row { id: number; parentId: number | null; value: string }
type Context = GridEditorValidationContext<Row>;
type Shape = 'direct' | 'control';
type Scenario = 'stable' | 'accepted' | 'aba' | 'pending' | 'final-read' | 'prepare' | 'missing' | 'invalid' | 'throwing' | 'unstable';
function check(value: unknown, message: string): asserts value { if (!value) throw Error(message); }

// This independent model owns both accepted and pending state. Counters advance
// synchronously at each mutation, including silent and restored-value changes.
class Candidate {
  revision = 0n;
  pending: string | null = null;
  validations = 0;
  destroyed = 0;
  finalRead = false;
  constructor(public accepted: string, public scenario: Scenario) {}
  set(value: string): boolean {
    if (this.accepted === value && this.pending === null) return false;
    this.accepted = value; this.pending = null; this.revision++; return true;
  }
  stage(value: string): void { this.pending = value; this.revision++; }
  cancel(): void { if (this.pending !== null) { this.pending = null; this.revision++; } }
  token(): ValidationRevision {
    if (this.scenario === 'invalid') return NaN;
    if (this.scenario === 'throwing') throw Error('Invalid custom revision read');
    if (this.scenario === 'unstable') this.revision++;
    return this.revision;
  }
  prepare(): { ok: boolean } { if (this.pending !== null) this.set(this.pending); return { ok: true }; }
  read(): string {
    if (this.finalRead) {
      this.finalRead = false;
      const accepted = this.accepted; this.set('temporary'); this.set(accepted);
    }
    return this.accepted;
  }
  validate(): { ok: boolean } {
    this.validations++;
    const accepted = this.accepted;
    if (this.scenario === 'accepted') this.set('callback');
    if (this.scenario === 'aba') { this.set('temporary'); this.set(accepted); }
    if (this.scenario === 'pending') { this.stage('draft'); this.cancel(); }
    if (this.scenario === 'final-read') this.finalRead = true;
    this.scenario = 'stable';
    return { ok: true };
  }
}

function candidateFactory(shape: Shape, scenario: Scenario) {
  let candidate: Candidate | undefined;
  const factory: GridEditorFactory<Row, number, string> = gridEditors.custom<Row, number, string>(context => {
    const model = new Candidate(String(context.value ?? ''), scenario); candidate = model;
    if (scenario === 'prepare') model.stage('prepared');
    const capability = scenario === 'missing' ? {} : { getValidationRevision: () => model.token() };
    if (shape === 'direct') {
      const editor: CellEditor<string, Context> = { ...capability,
        mount() {}, focus() {}, destroy() { model.destroyed++; },
        prepareCommit: () => model.prepare(), getValue: () => model.read(), validate: () => model.validate()
      };
      return editor;
    }
    const control: GridValueControl<string, Context> = { ...capability,
      value: Object.freeze({ get: () => model.read(), set: value => model.set(value) }),
      mount() {}, focus() {}, destroy() { model.destroyed++; },
      commitInput: () => model.prepare(), validate: () => model.validate()
    };
    return control;
  });
  return { factory, current() { check(candidate, 'Factory created a candidate'); return candidate; } };
}

const scenarios: Scenario[] = ['stable', 'accepted', 'aba', 'pending', 'final-read', 'prepare', 'missing', 'invalid', 'throwing', 'unstable'];
const succeeds = (scenario: Scenario) => scenario === 'stable' || scenario === 'prepare';
const protocolFailure = (scenario: Scenario) => ['missing', 'invalid', 'throwing', 'unstable'].includes(scenario);
function observe(table: GridEditorHost<Row>) {
  const rejected: { reason: string; errors: readonly unknown[]; source: object | undefined }[] = [];
  let before = 0, commits = 0;
  table.events.on('editReject', event => {
    const reason: string = event.reason;
    rejected.push({ reason, errors: event.validation?.errors ?? [], source: event.validation?.source });
  });
  table.events.on('beforeCellChange', () => { before++; });
  table.events.on('editCommit', () => { commits++; });
  return { rejected, before: () => before, commits: () => commits };
}
function checkRejection(observed: ReturnType<typeof observe>, scenario: Scenario, model: Candidate) {
  const rejection = observed.rejected[0];
  check(rejection && observed.rejected.length === 1, 'Exactly one rejection');
  check(rejection.reason === (protocolFailure(scenario) ? 'validation-revision' : 'validation-stale'), 'Currentness rejection reason');
  check(observed.before() === 0 && observed.commits() === 0, 'No downstream commit phases');
  if (protocolFailure(scenario)) {
    const error = rejection.errors[0];
    check(error && typeof error === 'object' && 'code' in error && error.code === 'validationRevision' &&
      'severity' in error && error.severity === 'error' && 'message' in error && typeof error.message === 'string' &&
      'source' in error && error.source && typeof error.source === 'object', 'Public protocol diagnostic shape');
    check(model.validations === 0, 'Invalid capability rejects before validation');
  } else check(rejection.errors.length === 0 && model.validations === 1, 'Stale candidate is not a fabricated value error or retry');
}

export function checkGridRevisionNode() {
  for (const shape of ['direct', 'control'] as const) for (const scenario of scenarios) {
    const fixture = candidateFactory(shape, scenario);
    const grid = new Grid<Row>({ columns: [{ id: 'value', editor: fixture.factory }] });
    grid.data.parse([{ id: 1, parentId: null, value: 'initial' }]);
    grid.setCellRanges({ anchor: { rowId: 1, columnId: 'value' } });
    const observed = observe(grid), result = grid.pasteClipboardText('candidate');
    check(result === succeeds(scenario), 'Headless paste respects strict editor currentness');
    check(grid.data.get(1)?.value === (succeeds(scenario) ? scenario === 'prepare' ? 'prepared' : 'candidate' : 'initial'), 'Headless currentness protects stored value');
    if (!result) checkRejection(observed, scenario, fixture.current());
    check(fixture.current().destroyed === 1, 'Temporary editors release ownership');
    grid.destroy();
  }
}

export function checkGridRevisionBrowser(host: HTMLElement) {
  for (const kind of ['Grid', 'TreeGrid'] as const) for (const shape of ['direct', 'control'] as const) for (const scenario of scenarios) {
    const fixture = candidateFactory(shape, scenario);
    const options = { height: 180, columns: [{ id: 'value', width: 180, editor: fixture.factory }] };
    const table = kind === 'Grid' ? new Grid<Row>(host, options) : new TreeGrid<Row>(host, options);
    table.data.parse([{ id: 1, parentId: null, value: 'initial' }]);
    const observed = observe(table);
    check(table.startEdit(1, 'value'), 'Mounted custom editor starts');
    const model = fixture.current();
    if (scenario !== 'prepare') model.set('candidate');
    const result = table.commitEdit();
    check(result === succeeds(scenario), kind + ': custom commit currentness');
    check(table.data.get(1)?.value === (succeeds(scenario) ? scenario === 'prepare' ? 'prepared' : 'candidate' : 'initial'), 'Rejected attempt keeps original store');
    if (!result) {
      checkRejection(observed, scenario, model);
      check(model.destroyed === 0, 'Rejected editor stays alive');
      if (!protocolFailure(scenario)) {
        const latest = model.accepted;
        check(table.commitEdit() && table.data.get(1)?.value === latest, 'Explicit next commit can save latest accepted value');
      }
    }
    table.destroy(); check(model.destroyed === 1 && !host.childElementCount, 'Custom editor owned cleanup');
  }
  for (const kind of ['Grid', 'TreeGrid'] as const) {
    // Ordinary EditorControl subclasses retain automatic private tracking.
    class InheritedEditor extends EditorControl<string> {}
    let control: InheritedEditor | undefined;
    const factory = gridEditors.custom<Row, number, string>(context => {
      control = new InheritedEditor({ value: String(context.value ?? '') }); return control;
    });
    const options = { height: 180, columns: [{ id: 'value', editor: factory }] };
    const table = kind === 'Grid' ? new Grid<Row>(host, options) : new TreeGrid<Row>(host, options);
    table.data.parse([{ id: 1, parentId: null, value: 'initial' }]);
    check(table.startEdit(1, 'value'), 'Inherited editor starts'); check(control, 'Control created');
    const active = control;
    active.value.set('candidate', { silent: true });
    active.addValidator(() => { active.value.set('temporary', { silent: true }); active.value.set('candidate', { silent: true }); return null; });
    const observed = observe(table);
    check(!table.commitEdit() && observed.rejected[0]?.reason === 'validation-stale', 'Inherited silent ABA tracked automatically');
    active.setValidators([]);
    const editing: GridEditorHost<Row> = table;
    editing.events.on('beforeCellChange', event => { event.newValue = 'trusted'; });
    check(table.commitEdit() && table.data.get(1)?.value === 'trusted', 'Trusted beforeCellChange replacement remains allowed');
    table.destroy(); check(active.destroyed, 'Inherited owner cleanup');
  }
}

function rejected() {
  const direct = candidateFactory('direct', 'stable'); void direct;
  // @ts-expect-error Revision hooks cannot be async.
  const asynchronous: CellEditor<string>['getValidationRevision'] = async () => 1;
  // @ts-expect-error Revision hooks cannot return strings.
  const text: GridValueControl<string>['getValidationRevision'] = () => '1';
  // @ts-expect-error Revision hooks cannot return arrays.
  const array: CellEditor<string>['getValidationRevision'] = () => [1];
  // @ts-expect-error Revision hook must be callable, not a counter property.
  const property: GridValueControl<string>['getValidationRevision'] = 1;
  const automatic = new EditorControl<string>();
  // @ts-expect-error No public revision method is added to built-in controls.
  automatic.getValidationRevision();
  // @ts-expect-error Existing GridValueControl setters still return boolean.
  const returnsVoid: GridValueControl<string>['value'] = { get: () => '', set() {} };
  void [asynchronous, text, array, property, returnsVoid];
}
void rejected;
const sharedToken: FormRevision = 0n;
const source: ValidationRevisionSource = { getValidationRevision: () => sharedToken }; void source;
if (typeof document === 'undefined') { checkGridRevisionNode(); console.log('Installed Grid revision TS OK: same capability, truthful custom factories, temporary commits and protocol diagnostics'); }
