import { ProgressBar, StepProgressBar, OptionList } from 'taet-ui/inputs';
/** @type {import('taet-ui/inputs').ProgressBarOptions} */
const config = { valueFormatter: (value, context) => `${context.percent}: ${value}` };
const progress = new ProgressBar(config); progress.value.clear(); progress.destroy();
const steps = new StepProgressBar({ items: ['One'], onItemClick: event => { event.handled = true; } }); steps.selectNext(); steps.destroy();
/** @type {import('taet-ui/inputs').OptionList<{id: string, text: string}>} */
const options = new OptionList({ multiple: true }); options.data.parse([{ id: 'a', text: 'A' }]); options.value.set(['a']); options.destroy();
