import { ProgressBar, StepProgressBar, OptionList } from 'taet-ui/inputs';
import { DataStore, SelectionModel } from 'taet-ui/core';
function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
type Choice = { key: number; title: string; icon?: string };
export function createIndicatorInputs(host?: HTMLElement) {
  const events: string[] = [];
  const progress = new ProgressBar({ name: 'progress', minimum: 10, maximum: 30, value: 20,
    textMode: 'custom', text: 'Halfway', orientation: 'vertical',
    onChange: event => events.push(event.newValue.toFixed(1)) });
  const formatted = new ProgressBar({ name: 'formatted', value: 25,
    valueFormatter: (value, context) => `${value}/${context.max} (${context.percent}%)` });
  const steps = new StepProgressBar({ name: 'steps', interactive: true,
    items: ['Source', { caption: 'Skipped', disabled: true }, { text: 'Export', block2: 'Result' }],
    onItemClick: event => { event.item.contentBlock1.caption.toUpperCase(); events.push('stepClick'); },
    onSelectedItemChanged: event => events.push(`step:${event.newValue}`) });
  const data = new DataStore<Choice, number>({ idField: 'key' });
  const selection = new SelectionModel<Choice>({ multiple: true });
  const options = new OptionList<Choice, number>({ name: 'options', label: 'Export contents', multiple: true,
    data, selection, value: [1, 3], textField: item => item.title });
  options.events.on('change', event => { event.items.map(item => item.title); events.push('options'); });
  options.events.on('itemClick', event => event.id.toFixed());
  if (host) { progress.mount(host); formatted.mount(host); steps.mount(host); options.mount(host); }
  return { progress, formatted, steps, options, data, selection, events,
    destroy() { progress.destroy(); formatted.destroy(); steps.destroy(); options.destroy(); } };
}
const controls = createIndicatorInputs();
controls.data.parse([{ key: 1, title: 'Source' }, { key: 2, title: 'Mapping' }, { key: 3, title: 'Export' }], { silent: true });
check(JSON.stringify(controls.options.value.get()) === '[1,3]', 'Pending IDs resolve silently');
controls.options.value.clear(); check(controls.selection.get().length === 0, 'Selection facade');
controls.progress.value.set(99); check(controls.progress.value.get() === 30, 'Progress clamps');
controls.progress.setRange(0, 40); controls.progress.value.clear(); check(controls.progress.value.get() === 0, 'Clear current min');
controls.progress.value.reset(); check(controls.progress.value.get() === 20 && !controls.progress.isDirty(), 'Progress reset');
controls.steps.selectNext(); controls.steps.selectNext(); check(controls.steps.getSelectedItemIndex() === 2, 'Skip disabled stage');
check(controls.steps.getSelectedItems().length === 2, 'Active prefix excludes disabled');
controls.steps.setItemProgress(2, 200); check(controls.steps.getItems()[2]?.progress === 100, 'Progress metadata clamp');
controls.destroy(); check(!controls.data.destroyed && !controls.selection.destroyed, 'Borrowed models stay live');
controls.data.destroy(); controls.selection.destroy();
function rejected() {
  // @ts-expect-error Step progress uses index methods, not editor values.
  controls.steps.value.set(1);
  // @ts-expect-error OptionList has no editor reset.
  controls.options.value.reset();
  // @ts-expect-error OptionList has no validation API.
  controls.options.validate();
  // @ts-expect-error ID schema is numeric.
  controls.options.value.set(['wrong']);
  // @ts-expect-error Veto lives on selection.events, not OptionList.events.
  controls.options.events.on('beforeChange', () => {});
  // @ts-expect-error There is no constructor callback for list change.
  new OptionList({ onChange: () => {} });
  // @ts-expect-error Progress clear is fixed to min.
  new ProgressBar({ emptyValue: 50 });
}
void rejected;
console.log('Installed indicators/OptionList OK: ranges, normalized stages, typed IDs, pending selection and borrowed models');
