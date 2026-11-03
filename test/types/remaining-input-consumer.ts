import { TextArea, CheckLetter, RadioLetter, DropDownList, MultiSelectDropDown, type InputOverlayService } from 'taet-ui/inputs';
import { DataStore } from 'taet-ui/core';
function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
interface Region { code: string; label: string }

export function createRemainingInputs(host?: HTMLElement, overlayManager?: InputOverlayService) {
  const data = new DataStore<Region, string>({ idField: 'code' });
  data.parse([{ code: 'n', label: 'North' }, { code: 's', label: 'South' }]);
  const changes: string[] = [];
  const text = new TextArea({ name: 'notes', value: 'One\nTwo', rows: 2, minRows: 2, maxRows: 4,
    acceptsTab: true, acceptsReturn: false, autoHeight: true, wordWrap: false,
    onChange: event => { event.source.getLines(); changes.push('text'); } });
  text.events.on('tabInsert', event => { event.value.toUpperCase(); event.source.getSelection(); changes.push('tab'); });
  const checkLetter = new CheckLetter({ name: 'accept', text: 'Accept', letter: 'A',
    onChange: event => { event.source.getLetter(); changes.push('check'); } });
  checkLetter.events.on('letterChange', event => { event.newValue.toUpperCase(); event.source.setText('Accepted'); });
  const radio = new RadioLetter({ name: 'answer', items: [{ id: 1, text: 'First', letter: 'A' }, { id: 2, text: 'Second', letter: 'B' }], value: 1 });
  const dropdown = new DropDownList({ name: 'single', data, value: 'n', textField: 'label', renderItem: item => item.label });
  const multi = new MultiSelectDropDown({ name: 'regions', data, value: ['n'], textField: 'label', searchable: true,
    clearValueOnMissingData: true, ...(overlayManager ? { overlayManager } : {}),
    filterPredicate: (item, query, source) => { source.getSelectedItems()[0]?.code; return item.label.toLowerCase().includes(query); },
    renderItem: (item, context) => { const id: string = context.id; void id; context.source.addValue; return item.label; },
    validators: [value => value.length ? null : 'Select a region'],
    onChange: event => { event.newItems[0]?.label.toUpperCase(); event.source.getSelectedItems(); changes.push('multi'); } });
  if (host) { text.mount(host); checkLetter.mount(host); radio.mount(host); dropdown.mount(host); multi.mount(host); }
  return { text, checkLetter, radio, dropdown, multi, data, changes,
    destroy() { text.destroy(); checkLetter.destroy(); radio.destroy(); dropdown.destroy(); multi.destroy(); data.destroy(); } };
}

const fields = createRemainingInputs();
check(fields.text.lines.get().join(',') === 'One,Two', 'Text lines');
check(fields.text.lines.set(['A', null, 3]) && fields.text.value.get() === 'A\n\n3', 'String line conversion');
check(fields.text.lines.append('B') && fields.text.insertText('!'), 'Unmounted append insertion');
check(fields.text.getSelection().text === '' && fields.text.calcAutoHeight() === null && !fields.text.selectAll(), 'Unmounted selection/height');
fields.checkLetter.setLetter(3); check(fields.checkLetter.getLetter() === '3' && fields.checkLetter.getText() === 'Accepted', 'Letter event source');
check(fields.radio.markerField === 'letter' && fields.radio.getSelectedItem()?.marker === 'A', 'Radio letter defaults');
check(fields.dropdown.getSelectedItem()?.label === 'North', 'Dropdown custom schema');
fields.multi.value.set(['n', 'n', 's']);
check(fields.multi.value.get().join(',') === 'n,s', 'Duplicate normalization');
fields.multi.value.get().push('unobserved'); check(fields.multi.value.get().length === 2, 'Value array copy');
check(fields.multi.getSelectedItems()[1]?.label === 'South', 'Selected records');
fields.multi.setCleanValue(); fields.multi.removeValue('n'); fields.multi.value.reset();
check(!fields.multi.isDirty(), 'Ordered clean baseline');
fields.data.remove('s', { silent: true }); check(fields.multi.value.get().join(',') === 'n', 'Silent missing ID reconciliation');
fields.multi.value.clear(); check(!fields.multi.validate().ok, 'Array validation');
fields.multi.addValue('unmatched'); check(fields.multi.getSelectedItem() === null, 'Unmatched value remains accepted');
fields.destroy();

function rejected() {
  // @ts-expect-error MultiSelect values are arrays, not strings.
  fields.multi.value.set('n');
  // @ts-expect-error Item schema is retained by selected records.
  fields.multi.getSelectedItems()[0]?.missing;
  fields.multi.events.on('change', event => {
    // @ts-expect-error MultiSelect events have newItems, not single newItem.
    event.newItem;
  });
  // @ts-expect-error TextArea has no constructor onTabInsert callback.
  new TextArea({ onTabInsert() {} });
  // @ts-expect-error lines is an API, not an array-valued field.
  fields.text.lines.push('x');
  // @ts-expect-error CheckLetter retains boolean values.
  fields.checkLetter.value.set('A');
  // @ts-expect-error RadioLetter forces letter markers.
  new RadioLetter({ markerStyle: 'default' });
  // @ts-expect-error MultiSelect owns or borrows a store, it does not parse an options array.
  new MultiSelectDropDown({ options: ['a'] });
}
void rejected;
console.log('Installed remaining inputs OK: lines, markers, schemas, array copies, dirty/reset, reconciliation and validation');
