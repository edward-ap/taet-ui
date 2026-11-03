import { DateInput, TimeInput, DateTimeInput } from 'taet-ui/inputs';
/** @type {import('taet-ui/inputs').TimeInputOptions} */
const options = { value: new Date(2026, 8, 6, 14, 30), hourMode: '1-24',
  onChange: event => { event.newValue.toUpperCase(); event.source.hourMode; } };
const time = new TimeInput(options);
time.value.set(null); time.value.reset(); time.destroy();
const date = new DateInput({ validators: [value => value.length === 10 || 'Date required'] });
date.value.set(new Date(2026, 8, 6)); date.validate(); date.destroy();
const combined = new DateTimeInput({ value: '2026-09-06T14:30', minuteStep: 5 });
combined.value.set(undefined); combined.destroy();
