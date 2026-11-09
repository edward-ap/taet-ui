import { BaseControl, Form, TextInput, type FormField, type FormError,
  type RevisionedFormField, type ValidationRevision, type ValidationRevisionSource,
  type MutationOptions } from 'taet-ui';
import type { ValidationRevision as ExperimentalRevision } from 'taet-ui/experimental';
import type { RevisionedFormField as ComponentField } from 'taet-ui/components';
import type { ValidationRevisionSource as AllSource } from 'taet-ui/all';
import { createWidgetField } from './13-custom-editor.js';

function check(value: unknown, message: string): asserts value { if (!value) throw Error(message); }

// Existing structural fields, including void-returning setters, remain assignable.
class LegacyField extends BaseControl {
  private stored: unknown = '';
  readonly value = Object.freeze({
    get: (): unknown => this.stored,
    set: (value: unknown, _options?: MutationOptions): void => { this.stored = value; },
    clear: (_options?: MutationOptions): void => { this.stored = ''; }
  });
}
const legacy: FormField = new LegacyField({ name: 'legacy' });
const returnsUnknown: unknown = legacy.value.set('still usable', { silent: true });
const legacyForm = new Form().row(legacy);
const legacyResult = legacyForm.validate();
const diagnostic: FormError | undefined = legacyResult.errors[0];
check(!legacyResult.ok && diagnostic?.code === 'validationRevision', 'Untracked field diagnostic');
check(!legacyForm.submit(), 'Structural compatibility is not a currentness guarantee');
check(legacyForm.value.get().legacy === 'still usable', 'Legacy field keeps value operations');
legacyForm.destroy(); void returnsUnknown;

// Independent custom array state: copied inputs/outputs and a stored token. The
// token covers accepted writes AND candidate transitions, including silent ABA.
export class RevisionArrayField extends BaseControl implements RevisionedFormField {
  #items: string[] = [];
  #draft: string[] | null = null;
  #revision: ValidationRevision;
  constructor(name: string, revision: ValidationRevision = 0) { super({ name }); this.#revision = revision; }
  #advance(): void {
    if (typeof this.#revision === 'symbol') this.#revision = Symbol('candidate');
    else if (typeof this.#revision === 'bigint') this.#revision += 1n;
    else this.#revision += 1;
  }
  getValidationRevision(): ValidationRevision { return this.#revision; }
  readonly value = Object.freeze({
    get: (): string[] => [...this.#items],
    set: (value: unknown, _options?: MutationOptions): void => {
      if (!Array.isArray(value) || !value.every((item: unknown) => typeof item === 'string')) throw TypeError('Expected strings');
      const next = [...value] as string[];
      if (!this.#draft && next.length === this.#items.length && next.every((item, index) => item === this.#items[index])) return;
      this.#items = next;
      this.#draft = null;
      this.#advance();
    },
    clear: (options?: MutationOptions): void => { this.value.set([], options); }
  });
  stage(items: readonly string[]): void { this.#draft = [...items]; this.#advance(); }
  cancelInput(): void { if (this.#draft) { this.#draft = null; this.#advance(); } }
  hasPendingInput(): boolean { return this.#draft !== null; }
  commitInput(options?: MutationOptions): { ok: boolean } {
    if (this.#draft) this.value.set(this.#draft, options);
    return { ok: true };
  }
}

const tokens: ExperimentalRevision[] = [0, 0n, Symbol('initial')];
for (const token of tokens) {
  const field = new RevisionArrayField('tags', token);
  const capable: ComponentField = field;
  const source: AllSource = capable;
  const stamp: ValidationRevision = source.getValidationRevision();
  check(Object.is(stamp, token), 'Entry-point capability identity');
  const form = new Form().row(field);
  const input = ['a']; field.value.set(input, { silent: true }); input.push('external');
  const output = field.value.get(); output.push('external');
  check(field.value.get().length === 1, 'Mutable aliases cannot bypass revision tracking');
  check(form.validate().ok && form.submit(), 'Valid custom capability');
  const old = field.getValidationRevision();
  field.stage(['pending']); field.cancelInput();
  check(!Object.is(old, field.getValidationRevision()) && !field.hasPendingInput(), 'Candidate ABA is tracked');
  field.stage(['committed']);
  check(form.submit() && field.value.get()[0] === 'committed', 'Custom draft committed before validation');
  form.destroy();
}

for (const candidateOnly of [false, true]) {
  const field = new RevisionArrayField('custom'); field.value.set(['a']);
  const trigger = new TextInput({ name: 'trigger', validators: [() => {
    if (candidateOnly) { field.stage(['draft']); field.cancelInput(); }
    else { field.value.set(['b'], { silent: true }); field.value.set(['a'], { silent: true }); }
    return null;
  }] });
  const form = new Form().row(field, trigger);
  const result = form.validate();
  check(!result.ok && result.errors.length === 0, 'Accepted/candidate ABA refuses stale validation');
  check(!form.submit(), 'Accepted/candidate ABA refuses stale submit');
  form.destroy();
}

// The exact shipped recipe is also checked as JS and executed from the tarball.
let display = '', released = 0, destroyed = 0;
let deliver: (text: string) => void = () => {};
const widget = createWidgetField({
  mount(_host: HTMLElement) {},
  writeDisplay(text: string) { display = text; },
  onInput(listener: (text: string) => void) { deliver = listener; return () => { released++; }; },
  destroy() { destroyed++; }
}, { name: 'widget', value: 'initial', onBeforeChange(event) { if (event.newValue === 'blocked') event.cancel = true; } });
const widgetForm = new Form().row(widget);
check(Object.isFrozen(widget.value), 'Inherited value API stays frozen');
widget.value.set('loaded', { silent: true }); check(String(display) === 'loaded', 'Silent render');
deliver('user'); check(widget.value.get() === 'user', 'Widget input uses inherited pipeline');
deliver('blocked'); check(widget.value.get() === 'user' && String(display) === 'user', 'Veto resynchronizes display');
widget.setReadOnly(true); deliver('readonly'); check(widget.value.get() === 'user', 'Readonly user input rejected');
widget.setReadOnly(false);
check(widgetForm.validate().ok && widgetForm.submit(), 'Subclass automatically tracked without public hook');
widget.addValidator(() => { widget.value.set('temporary', { silent: true }); widget.value.set('user', { silent: true }); return null; });
check(!widgetForm.submit(), 'Inherited pipeline tracks silent ABA');
widgetForm.destroy(); deliver('late'); check(released === 1 && destroyed === 1, 'Owner releases widget and subscription');

function rejected(form: Form, field: FormField) {
  // @ts-expect-error A number property is not a callable capability.
  const property: ValidationRevisionSource = { getValidationRevision: 1 };
  // @ts-expect-error Tokens cannot be strings.
  const text: ValidationRevisionSource = { getValidationRevision: () => 'v1' };
  // @ts-expect-error Tokens cannot be arrays.
  const array: ValidationRevisionSource = { getValidationRevision: () => [1] };
  // @ts-expect-error Tokens cannot be objects.
  const object: ValidationRevisionSource = { getValidationRevision: () => ({ version: 1 }) };
  // @ts-expect-error A revision getter is synchronous.
  const promise: ValidationRevisionSource = { getValidationRevision: async () => 1 };
  // @ts-expect-error Undefined is not a valid token.
  const absent: ValidationRevisionSource = { getValidationRevision: () => undefined };
  // @ts-expect-error A structural field need not have a public hook.
  const allCapable: RevisionedFormField[] = form.getFields();
  // @ts-expect-error Optional capability needs a guard.
  field.getValidationRevision();
  // @ts-expect-error Structural setter results are unknown, not necessarily boolean.
  const changed: boolean = field.value.set('value');
  // @ts-expect-error Built-in private tracking does not introduce a public hook.
  widget.getValidationRevision();
  // @ts-expect-error The inherited frozen value API cannot be rewritten.
  widget.value.set = () => true;
  void [property, text, array, object, promise, absent, allCapable, changed];
}
void rejected;
// Composition remains BaseControl-based, not restricted to revision-capable fields.
const layout = new Form().row(new BaseControl()).columns([new BaseControl()]); layout.destroy();
console.log('Installed Form revision TS OK: structural compatibility, capability types, tokens, arrays, drafts and shipped EditorControl recipe');
