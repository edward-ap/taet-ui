import { EditorControl, TextInput, NumberInput } from '../src/ui/inputs.js';
import { testValueTeardown } from './helpers/editor-value-contract.js';

for (const [Control, oldValue, newValue] of [
  [EditorControl, 'Old', 'New'],
  [TextInput, 'Old', 'New'],
  [NumberInput, 1.25, 2.5]
]) {
  testValueTeardown({
    name: phase => `${Control.name} stops value mutation phases when ${phase} destroys it`,
    create: () => new Control({ value: oldValue }),
    oldValue, newValue
  });
}