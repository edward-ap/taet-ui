import { FilePicker, TrackBar, ColorPicker, normalizeHexColor, type FileMetadata } from 'taet-ui/inputs';
function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }

export function createSpecializedInputs(host?: HTMLElement) {
  const events: Array<[string, unknown]> = [];
  const file = new FilePicker({ name: 'file', accept: '.txt', value: 'initial.txt',
    validators: [value => value?.name ? null : 'Choose a file'],
    onChange: event => { event.newValue?.name.toUpperCase(); events.push(['file', event.source.getFiles().map(file => file.name)]); } });
  const files = new FilePicker({ name: 'files', multiple: true, displayMode: 'count',
    onChange: event => { const metadata: FileMetadata[] = event.newValue; events.push(['files', metadata.map(item => item.name)]); } });
  const track = new TrackBar({ name: 'track', min: 0.25, max: 1.25, step: 0.5, value: 0.25,
    showValue: true, scale: 'ticks', showTickLabels: true, orientation: 'vertical',
    valueFormatter: value => value.toFixed(2), onChange: event => events.push(['track', event.newValue]) });
  const color = new ColorPicker({ name: 'color', label: 'Accent', value: '#AbC',
    onOpen: event => { event.source.getRgb(); events.push(['open', event.origin]); },
    onClose: event => events.push(['close', event.reason]), onChange: event => events.push(['color', event.newValue]) });
  if (host) { file.mount(host); files.mount(host); track.mount(host); color.mount(host); }
  return { file, files, track, color, events, destroy() { file.destroy(); files.destroy(); track.destroy(); color.destroy(); } };
}
const fields = createSpecializedInputs();
check(fields.file.value.get()?.name === 'initial.txt' && !fields.file.isDirty(), 'Single metadata/clean state');
fields.files.value.set(['a.txt', { path: 'folder/b.txt', size: 2 }]);
check(fields.files.value.get()[1]?.relativePath === 'folder/b.txt', 'Multiple metadata normalization');
check(fields.files.getFiles().length === 0, 'API metadata does not create File handles');
fields.file.value.clear(); check(!fields.file.validate().ok, 'Nullable file validation');
fields.file.value.reset(); check(!fields.file.isDirty(), 'Metadata reset');
fields.track.moveUp(); check(fields.track.value.get() === 0.75, 'Fractional move');
fields.track.setStep(0); fields.track.value.set(0.6); check(fields.track.value.get() === 0.6, 'Continuous range');
check(fields.color.value.get() === '#aabbcc', 'Hex normalization');
check(normalizeHexColor('rgb(1, 2, 3)') === '#010203', 'RGB helper');
fields.color.setRgb(256, -1, 2.5); check(fields.color.value.get() === '#ff0003', 'RGB byte clamp/round');
fields.color.value.clear(); check(fields.color.getRgb().red === 0, 'Empty RGB fallback');
fields.destroy();

function rejected() {
  // @ts-expect-error Multiple mode must be present in runtime options.
  new FilePicker<true>();
  // @ts-expect-error Multiple values are arrays.
  fields.files.value.set('one.txt');
  // @ts-expect-error Single values are metadata or null, not arrays.
  fields.file.value.set(['a.txt']);
  // @ts-expect-error Files are obtained separately from metadata.
  fields.file.value.get()?.arrayBuffer();
  // @ts-expect-error beforeOpen is a notification, not a cancellation payload.
  fields.file.events.on('beforeOpen', event => { event.cancel = true; });
  // @ts-expect-error Clear always uses min; no configurable empty override.
  new TrackBar({ emptyValue: 50 });
  // @ts-expect-error TrackBar formatter gets only a number.
  new TrackBar({ valueFormatter: (value, source) => source.id + value });
  // @ts-expect-error ColorPicker uses its owned Popup, not an injected input overlay service.
  new ColorPicker({ overlayManager: {} });
  // @ts-expect-error Opening does not support silent.
  fields.color.openPopup({ silent: true });
}
void rejected;
console.log('Installed specialized inputs OK: single/multiple metadata, clean/reset, ranges, RGB and event contracts');
