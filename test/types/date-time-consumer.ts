import { DateInput, TimeInput, DateTimeInput, type DateTimeValueApi, type InputOverlayService } from 'taet-ui/inputs';
import type { TimeGridEditorOptions } from 'taet-ui/grid/editors';
function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }

export function createSchedule(host?: HTMLElement, overlayManager?: InputOverlayService) {
  const service = overlayManager ? { overlayManager } : {};
  const changes: Array<[string, string, string, boolean]> = [];
  const date = new DateInput<{ earliest: string }>({ ...service, name: 'date', label: 'Date',
    value: new Date(2026, 8, 6, 14, 35), min: '2026-01-01', max: '2026-12-31',
    validators: [(value, context) => {
      const owner: DateInput<{ earliest: string }> = context.control; void owner;
      return value && value >= context.earliest ? null : 'Date is too early';
    }], onChange: event => changes.push(['date', event.newValue, event.origin, event.userAction]) });
  const time = new TimeInput({ ...service, name: 'time', label: 'Time', value: '14:30', hour12: true, stepMinutes: 15,
    onBeforeChange: event => { if (event.newValue === '16:30') event.cancel = true; },
    onChange: event => { event.source.hourMode; changes.push(['time', event.newValue, event.origin, event.userAction]); } });
  const combined = new DateTimeInput({ ...service, name: 'combined', label: 'Combined',
    value: '2026-09-06 14:30:59', hourMode: '0-23', minuteStep: 10,
    onChange: event => changes.push(['combined', event.newValue, event.origin, event.userAction]) });
  if (host) { date.mount(host); time.mount(host); combined.mount(host); }
  return { date, time, combined, changes, destroy() { date.destroy(); time.destroy(); combined.destroy(); } };
}

const fields = createSchedule();
check(fields.date.value.get() === '2026-09-06', 'Local Date conversion');
check(fields.combined.value.get() === '2026-09-06T14:30', 'Date-time prefix normalization');
check(fields.date.validate({ earliest: '2026-09-01' }).ok, 'Typed validation context');
const value: DateTimeValueApi = fields.time.value;
check(value.set(new Date(2026, 8, 7, 0, 5)), 'Date write accepted');
check(value.get() === '00:05', 'Time Date conversion');
check(value.set('4:15 PM') && value.get() === '16:15', 'AM/PM normalization');
check(!value.set('16:30') && value.get() === '16:15', 'String beforeChange veto');
check(value.set(null) && value.get() === '', 'Null clears');
check(value.reset() && value.get() === '14:30', 'Initial string baseline');
fields.date.value.set('2026-10-07T18:00');
check(fields.date.value.get() === '2026-10-07', 'Date prefix');
fields.date.setCleanValue(fields.date.value.get());
fields.date.value.clear(); fields.date.reset(); check(!fields.date.isDirty(), 'Canonical clean baseline');
fields.time.value.set('99:99'); check(fields.time.value.get() === '23:59', 'Numeric component clamping');
fields.combined.value.set('unfinished'); check(fields.combined.value.get() === 'unfinished', 'Normalization is not validation');
fields.destroy();
check(fields.time.value.get() === '23:59', 'Last value remains readable after teardown');

function rejected() {
  // @ts-expect-error Read values are strings, never Date objects.
  const date: Date = fields.date.value.get(); void date;
  // @ts-expect-error Fixed empty string; null is a write value, not a configurable empty baseline.
  new DateInput({ emptyValue: null });
  // @ts-expect-error Numeric timestamps are not part of the typed date API.
  fields.time.value.set(1234);
  // @ts-expect-error Clean baselines are already normalized strings, not Date input values.
  fields.date.setCleanValue(new Date());
  // @ts-expect-error No invented standalone popup method.
  fields.date.openPopup();
  // @ts-expect-error No public time spin method.
  fields.time.spinUp();
  // @ts-expect-error Date does not support time display options.
  new DateInput({ hour12: true });
  // @ts-expect-error Validators receive strings.
  new TimeInput({ validators: [value => value.getHours() > 0] });
  // @ts-expect-error Picker opening has no constructor callback contract.
  new DateTimeInput({ onOpen() {} });
}
const gridMode: TimeGridEditorOptions<{ id: number }> = { hourMode: '0-23' }; void gridMode; void rejected;
console.log('Installed date/time inputs OK: local Date writes, strings, normalization, veto, validation and clean/reset');
