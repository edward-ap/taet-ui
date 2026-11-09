import { NumberInput, type NumberInputCommitResult } from 'taet-ui/inputs';
import { Form } from 'taet-ui/components';
import { Grid, gridEditors } from 'taet-ui/grid';

export function createNumberCommitFixture(host: HTMLElement) {
  const drafts: Array<{ text: string; badInput: boolean; pending: boolean; origin: string; userAction: boolean }> = [];
  const changes: Array<number | null> = [];
  const live = new NumberInput({ id: 'number-live', value: 1 });
  const field = new NumberInput({ id: 'number-commit', name: 'amount', value: 2, updateMode: 'commit' });
  field.events.on('draftChange', ({ text, badInput, pending, origin, userAction }) => {
    drafts.push({ text, badInput, pending, origin, userAction });
  });
  field.events.on('change', event => changes.push(event.newValue));
  live.mount(host);
  const form = new Form().row(field); form.mount(host);
  const grid = new Grid<{ id: number; amount: number | null }>({ width: 400, height: 180,
    columns: [{ id: 'amount', width: 200, editor: gridEditors.number({ updateMode: 'commit' }) }] });
  grid.data.parse([{ id: 1, amount: 3 }]); grid.mount(host);
  return {
    live, field, form, grid, drafts, changes,
    commit(): NumberInputCommitResult { return field.commitInput({ origin: 'api', userAction: true }); },
    snapshot() { return { value: field.value.get(), formValue: form.value.get().amount,
      pending: field.hasPendingInput(), raw: field.getRawValue(), changes: changes.slice() }; },
    destroy() { grid.destroy(); form.destroy(); live.destroy(); }
  };
}
