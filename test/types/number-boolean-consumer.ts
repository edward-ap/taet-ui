import { NumberInput, CheckBox, Switch, type EditorValueApi, type SwitchStateText } from 'taet-ui/inputs';
function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }

export function createFields(container?: HTMLElement) {
  const changes: Array<[string, number | boolean | null, string, boolean]> = [];
  const number = new NumberInput({ name: 'quantity', value: 1, min: 0, max: 10, step: 2, precision: 1,
    allowSpinOnMouseWheel: true,
    validators: [(value, context) => {
      const raw: string = context.control.getRawValue(); void raw;
      return value === null ? 'Quantity required' : null;
    }],
    onChange: event => {
      const value: number | null = event.newValue;
      event.source.getDisplayValue(); changes.push(['number', value, event.origin, event.userAction]);
    }
  });
  const checkbox = new CheckBox({ name: 'accepted', text: 'Accept', checked: false,
    validators: [(value, context) => { context.control.getText(); return value ? null : 'Accept first'; }],
    onChange: event => { event.source.getText(); changes.push(['checkbox', event.newValue, event.origin, event.userAction]); }
  });
  const toggle = new Switch({ name: 'notify', text: 'Notify', onText: 'Enabled', offText: 'Disabled',
    onChange: event => { event.source.getText(); changes.push(['switch', event.newValue, event.origin, event.userAction]); }
  });
  toggle.events.on('stateTextChange', event => {
    const pair: SwitchStateText = event.newValue;
    const label: string = pair.onText;
    event.source.getText(); void label;
  });
  if (container) { number.mount(container); checkbox.mount(container); toggle.mount(container); }
  return { number, checkbox, toggle, changes, destroy() { number.destroy(); checkbox.destroy(); toggle.destroy(); } };
}

const fields = createFields();
const baseNumber: EditorValueApi<number | null> = fields.number.value;
const baseBoolean: EditorValueApi<boolean> = fields.checkbox.value;
void baseNumber; void baseBoolean;
check(fields.number.spinUp() && fields.number.value.get() === 3, 'Numeric spin');
check(fields.number.value.set(2.345) && fields.number.value.get() === 2.3, 'Precision');
check(fields.number.getRawValue() === '2.3' && fields.number.getDisplayValue() === '2.3', 'Raw storage is text');
check(fields.number.value.set(20) && fields.number.value.get() === 10, 'Clamping');
check(fields.number.value.clear() && fields.number.value.get() === null && !fields.number.validate().ok, 'Nullable validation');
check(fields.number.spinDown() && fields.number.value.get() === 10, 'Empty spin starts at maximum');
fields.number.setReadOnly(true);
check(!fields.number.spinUp() && fields.number.value.set(5), 'Readonly blocks spin but allows API hydration');
check(fields.number.value.reset() && fields.number.value.get() === 1, 'Numeric clean baseline');
check(!fields.checkbox.validate().ok && fields.checkbox.value.set(true) && fields.checkbox.validate().ok, 'Boolean validation');
check(fields.checkbox.setText('Accepted') === fields.checkbox && fields.checkbox.getText() === 'Accepted', 'Checkbox text');
check(fields.checkbox.value.clear() && fields.checkbox.value.get() === false, 'Boolean empty');
fields.toggle.setStateText('Yes', 'No').setText('Notification');
check(fields.toggle.value.set(true) && fields.toggle.value.reset() && !fields.toggle.value.get(), 'Switch reset');
fields.destroy();
for (const control of [new CheckBox({ checked: true, value: false }), new Switch({ checked: true, value: false })]) {
  check(!control.value.get(), 'Explicit value overrides checked'); control.destroy();
}

export function indicator() {
  const element: HTMLSpanElement = Switch.createIndicator(true, { className: 'status', ariaLabel: 'Ready' });
  return element;
}
export function mountedNumber(host: HTMLElement | string) {
  return new NumberInput(host, { value: 1.5, step: 'any', increment: 0.5 });
}
function rejected() {
  // @ts-expect-error Numeric values are not strings in the typed public API.
  fields.number.value.set('12');
  // @ts-expect-error The numeric empty value is fixed to null.
  new NumberInput({ emptyValue: 0 });
  // @ts-expect-error Boolean empty is fixed to false.
  new CheckBox({ emptyValue: true });
  // @ts-expect-error Checkbox values must be boolean.
  fields.checkbox.value.set('true');
  // @ts-expect-error Switch values must be boolean.
  fields.toggle.value.set(1);
  new NumberInput({ onChange: event => {
    // @ts-expect-error Numeric values can be null.
    event.newValue.toFixed(2);
  } });
  // @ts-expect-error Text changes are EventBus subscriptions, not constructor callbacks.
  new Switch({ onStateTextChange() {} });
  // @ts-expect-error The static indicator is DOM, not a Control.
  Switch.createIndicator(true).value.get();
}
void rejected;
console.log('Installed numeric/boolean inputs OK: values, precision, clamp/spin, validation, reset and text events');
