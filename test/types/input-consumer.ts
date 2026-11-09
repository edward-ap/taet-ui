import { gridEditors } from 'taet-ui/grid/editors';
import { NumberInput, TextArea, EditorControl, TextInput, type EditorValidationResult, type EditorControlOptions } from 'taet-ui/inputs';
function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
interface ValidationContext { minimum: number }

export function createInput() {
  const phases: string[] = [];
  const input = new TextInput<ValidationContext>({ name: 'name', label: 'Name', value: 'Initial',
    labelPosition: 'top', labelWidth: 90, indent: 4,
    validators: [(value, context) => {
      const live: string = context.control.getRawValue();
      check(live === value && context.value === value, 'Validator context');
      return value.length >= context.minimum ? null : { severity: 'warning', message: 'Short', code: 'length' };
    }],
    onBeforeChange: event => { if (event.newValue === 'Blocked') event.cancel = true; },
    onChange: event => { phases.push(event.type); event.source.getDisplayValue().toUpperCase(); },
    onAfterChange: event => { phases.push(event.type); },
    onDirtyChange: event => { const dirty: boolean = event.newValue; void dirty; phases.push(event.type); },
    onValidate: event => { event.source.getRawValue(); phases.push(event.type); },
    onFocus: event => { event.source.getRawValue(); },
    onKeyDown: event => { if (event.key === 'F2') event.cancel = true; }
  });
  input.events.on('change', event => { event.source.getRawValue(); });
  input.events.on('passwordVisibilityChange', event => { const visible: boolean = event.newValue; void visible; });
  return { input, phases };
}

const { input, phases } = createInput();
check(!input.value.set('Blocked') && input.value.get() === 'Initial', 'Veto');
check(input.value.set('X', { silent: true }) && input.isDirty() && phases.length === 0, 'Silent still changes dirty state');
const result: EditorValidationResult<string, typeof input> = input.validate({ minimum: 3 });
check(result.ok && result.errors[0]?.severity === 'warning' && result.errors[0].code === 'length', 'Warnings remain valid');
check(input.validation.clear({ silent: true }) === input, 'Clear validation returns owner');
check(input.value.reset() && input.value.get() === 'Initial' && !input.isDirty(), 'Reset returns to clean');
input.setCleanValue('Saved'); input.value.clear();
check(input.value.get() === '' && input.value.reset() && input.value.get() === 'Saved', 'Clear and reset differ');
input.setReadOnly(true); check(!input.value.set('User', { origin: 'user' }), 'Readonly rejects user writes');
check(input.value.set('API'), 'Readonly permits programmatic hydration');
input.setValidators([]).setRequired(true); input.value.clear();
check(input.validate({ minimum: 1 }).ok, 'Required flag does not install a validator');
input.destroy();

// A custom non-string base must supply a compatible empty value.
export class Amount extends EditorControl<number> {
  constructor() { super({ emptyValue: 0, value: 2 }); }
  protected override _normalizeValue(value: number) { return Math.max(0, value); }
}
const amount = new Amount(); amount.value.set(-1);
check(amount.value.get() === 0, 'Subclass normalization'); amount.destroy();
for (const phase of ['beforeChange', 'change', 'afterChange'] as const) {
  const closing = new TextInput({ value: 'Old' });
  closing.events.on(phase, event => event.source.destroy());
  check(closing.value.set('New') === (phase !== 'beforeChange'), 'Callback teardown result');
}

function rejected() {
  // @ts-expect-error Non-string bases cannot silently default to an empty string.
  new EditorControl<number>();
  // @ts-expect-error A concrete text value is a string.
  new TextInput().value.set(42);
  // @ts-expect-error Async validators are not supported.
  new TextInput({ validators: [async () => null] });
  new TextInput({ onBeforeChange: event => {
    // @ts-expect-error Editor beforeChange supports veto, not rewriting the draft.
    event.newValue = 'Replacement';
  } });
  input.addValidator((_value, context) => {
    // @ts-expect-error Context retains its schema.
    return context.missing;
  });
  input.events.on('validate', event => {
    // @ts-expect-error Validation events do not carry mutation provenance.
    event.origin;
  });
  const options: EditorControlOptions<string> = {
    // @ts-expect-error Label changes use events.on, not a constructor callback.
    onLabelChange() {}
  };
  void options;
}
void rejected;
console.log('Installed input consumer OK: values, veto, dirty/reset, validation, subclass and teardown');

// Opt-in sparse masks keep positional holes in serialized application values.
export function createSlotsInput(host: HTMLElement, unmaskValue = false) {
  return new TextInput(host, { mask: 'AA-0000', maskMode: 'slots', value: 'AB-1234', unmaskValue });
}

const slotsTextEditor = gridEditors.text({ mask: 'AA-0000', maskMode: 'slots', unmaskValue: true });
void slotsTextEditor;
function rejectSlotsOnNonText() {
  // @ts-expect-error Sparse masks are a text editor opt-in only.
  new NumberInput({ maskMode: 'slots' });
  // @ts-expect-error TextArea does not implement masked slots.
  new TextArea({ maskMode: 'slots' });
  // @ts-expect-error Numeric grid editors do not implement masked slots.
  gridEditors.number({ maskMode: 'slots' });
  // @ts-expect-error Unknown mask modes are not accepted.
  new TextInput({ maskMode: 'sparse' });
}
void rejectSlotsOnNonText;
