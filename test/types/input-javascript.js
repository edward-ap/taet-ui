// @ts-check
import { TextInput, NumberInput, CheckBox, Switch, SelectInput, RadioGroup } from 'taet-ui/inputs';
/** @type {import('taet-ui/inputs').TextInputOptions<{minimum: number}>} */
const options = { value: 'JS', validators: [(value, context) => value.length >= context.minimum ? null : 'Short'],
  onChange: event => { event.source.getRawValue().toUpperCase(); }
};
export const input = new TextInput(options);
if (!input.validate({ minimum: 2 }).ok) throw new Error('JSDoc validation');
input.destroy();
function rejected() {
  // @ts-expect-error JS consumers also reject numeric text writes.
  input.value.set(10);
}
void rejected;

/** @type {import('taet-ui/inputs').NumberInputOptions} */
const numericOptions = { value: 2, min: 0, step: 0.5, onChange: event => {
  if (event.newValue !== null) event.newValue.toFixed(1);
  event.source.getRawValue();
} };
const number = new NumberInput(numericOptions);
const check = new CheckBox({ checked: true, onChange: event => { event.source.getText(); } });
const toggle = new Switch({ onText: 'Yes', offText: 'No' });
number.destroy(); check.destroy(); toggle.destroy();

/** @type {import('taet-ui/inputs').SelectInputOptions<{code: string, label: string}, string>} */
const choiceOptions = { valueField: 'code', textField: 'label',
  onChange: event => { event.newItem?.label.toUpperCase(); }
};
const choice = new SelectInput(choiceOptions);
choice.data.parse([{ code: 'ca', label: 'Canada' }]);
choice.value.set('ca'); choice.destroy();
const radio = new RadioGroup({ items: ['A', 'B'] });
radio.setSelectedIndex(1); radio.destroy();
