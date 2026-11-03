import { FilePicker, TrackBar, ColorPicker, normalizeHexColor } from 'taet-ui/inputs';
/** @type {import('taet-ui/inputs').FilePickerOptions<true>} */
const options = { multiple: true, value: ['a.txt'], onChange: event => event.newValue.map(item => item.name) };
const files = new FilePicker({ ...options, multiple: true }); files.value.clear(); files.destroy();
const track = new TrackBar({ valueFormatter: value => value.toFixed(1) }); track.moveEnd(); track.destroy();
const color = new ColorPicker({ value: normalizeHexColor('#abc'), onOpen: event => event.source.getRgb() }); color.destroy();
