// @ts-check
import { NumberInput } from 'taet-ui/inputs';
/** @type {import('taet-ui/inputs').NumberInputUpdateMode} */
const mode = 'commit';
const field = new NumberInput({ updateMode: mode, value: 2 });
field.events.on('draftChange', event => {
  /** @type {string} */ const text = event.text;
  /** @type {boolean[]} */ const flags = [event.pending, event.badInput, event.userAction];
  /** @type {number | null} */ const value = event.source.value.get();
  void text; void flags; void value;
});
/** @type {import('taet-ui/inputs').NumberInputCommitResult} */
const result = field.commitInput({ origin: 'api' });
/** @type {import('taet-ui/inputs').NumberInputCommitStatus} */
const status = result.status;
if (!result.ok || result.changed || status !== 'unchanged' || result.value !== 2) throw new Error('JSDoc commit result');
field.cancelInput(); field.destroy();
function rejected() {
  // @ts-expect-error Invalid JavaScript update mode.
  new NumberInput({ updateMode: 'blur' });
  // @ts-expect-error Draft strings do not widen public numeric values.
  field.value.set('2');
  /** @type {import('taet-ui/inputs').NumberInputCommitStatus} */
  // @ts-expect-error Unknown result status.
  const invalid = 'accepted';
  void invalid;
}
void rejected;
console.log('Installed NumberInput commit JSDoc OK');
