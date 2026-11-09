import { NumberInput, type NumberInputUpdateMode, type NumberInputCommitResult,
  type NumberInputCommitStatus, type NumberInputEvents } from 'taet-ui/inputs';
import type { NumberInputCommitResult as RootResult } from 'taet-ui';
import { NumberInput as ComponentNumberInput } from 'taet-ui/components';
import { gridEditors } from 'taet-ui/grid/editors';

function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const modes: NumberInputUpdateMode[] = ['live', 'commit'];
const componentMode = modes[1]!;
const statuses: Record<NumberInputCommitStatus, boolean> = {
  committed: true, unchanged: true, invalid: false, vetoed: false,
  readonly: false, disabled: false, destroyed: false, superseded: false
};
const input = new NumberInput({ value: 4, updateMode: componentMode });
input.events.on('draftChange', event => {
  const typed: NumberInputEvents['draftChange'] = event;
  const source: NumberInput = typed.source;
  const text: string = typed.text;
  const flags: boolean[] = [typed.badInput, typed.pending, typed.userAction];
  const origin: string = typed.origin;
  const value: number | null = source.value.get();
  void text; void flags; void origin; void value;
});
const result: NumberInputCommitResult = input.commitInput({ silent: true, origin: 'api', userAction: false });
const rootResult: RootResult = result;
const nullable: number | null = rootResult.value;
const ok: boolean = result.ok, changed: boolean = result.changed;
check(statuses[result.status] && ok && !changed && nullable === 4, 'Unchanged commit result');
check(!input.hasPendingInput() && !input.cancelInput(), 'No pending draft');
check(input.value.set(8, { silent: true }) && input.value.get() === 8, 'Commit mode API is immediate');
check(input.value.reset() && input.value.get() === 4, 'Commit mode reset is immediate');
const defaultField = new ComponentNumberInput();
check(defaultField.updateMode === 'live', 'Default remains live');
defaultField.destroy();
for (const updateMode of modes) {
  const field = new NumberInput({ updateMode }); field.destroy();
  gridEditors.number({ updateMode });
}
input.destroy();
check(input.commitInput().status === 'destroyed', 'Destroyed result');
function rejected() {
  // @ts-expect-error Update modes are a closed union.
  new NumberInput({ updateMode: 'blur' });
  // @ts-expect-error Grid options preserve the closed update-mode union.
  gridEditors.number({ updateMode: 'lazy' });
  // @ts-expect-error Numeric values remain numeric or null, never draft strings.
  input.value.set('8');
  // @ts-expect-error Commit status is a closed union.
  const status: NumberInputCommitStatus = 'success';
  // @ts-expect-error Commit values remain nullable.
  const number: number = result.value;
  // @ts-expect-error Mode is not a reactive mutable property.
  input.updateMode = 'live';
  input.events.on('draftChange', event => {
    // @ts-expect-error A draft contains text, not a public numeric value.
    const numeric: number = event.text;
    // @ts-expect-error Pending state is boolean.
    const pending: string = event.pending;
    void numeric; void pending;
  });
  void status; void number;
}
void rejected;
console.log('Installed NumberInput commit TS OK: modes, result/status/event types and immediate API/reset');
