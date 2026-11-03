import { SelectInput, RadioGroup, type InputOverlayService, type RadioItem } from 'taet-ui/inputs';
import { DataStore } from 'taet-ui/core';
import type { GridEditorOverlayService } from 'taet-ui/grid/editors';
function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
interface Country { code: string; label: string; region: string }
interface Answer { id: number; label: string; disabled?: boolean }

export function createNativeSelect(host: HTMLElement) {
  const changes: Array<[unknown, string | null, string, boolean]> = [];
  const select = new SelectInput<{ id: number; text: string }>(host, { value: 1,
    onChange: event => changes.push([event.newValue, event.newItem?.text ?? null, event.origin, event.userAction]) });
  select.data.parse([{ id: 1, text: 'One' }, { id: 2, text: 'Two' }]);
  return { select, changes };
}

export function createChoices(host?: HTMLElement, overlayManager?: InputOverlayService) {
  const data = new DataStore<Country, string>({ idField: 'code' });
  data.parse([{ code: 'ca', label: 'Canada', region: 'north' }, { code: 'fr', label: 'France', region: 'europe' }]);
  const changes: Array<[string | null, string | null]> = [];
  const select = new SelectInput({ data, value: 'ca', textField: item => item.label, search: true,
    ...(overlayManager ? { overlayManager } : {}),
    clearValueOnMissingData: true,
    filterPredicate: (item, query, source) => {
      check(source.data.idOf(item) === item.code, 'Select source store'); return item.region.includes(query);
    },
    renderItem: (item, context) => {
      const id: string = context.id; const index: number = context.index; void index;
      context.source.getSelectedItem()?.label.toUpperCase(); return `${id}: ${item.label}`;
    },
    onBeforeChange: event => { if (event.newItem?.code === 'blocked') event.cancel = true; },
    onChange: event => { changes.push([event.oldItem?.code ?? null, event.newItem?.code ?? null]); }
  });
  select.events.on('dataChange', event => { const source: DataStore<Country, string> = event.dataEvent.source; void source; });
  const radio = new RadioGroup<Answer>({ value: 1, options: [
    { id: 1, label: 'One' }, { id: 2, label: 'Blocked', disabled: true }, { id: 3, label: 'Three' }
  ], markerStyle: 'letter', markerField: 'id', layout: 'flow', columns: 2,
    onChange: event => { event.source.getSelectedItem()?.raw.label.toUpperCase(); }
  });
  radio.events.on('appearanceChange', event => {
    if (event.name === 'columns') { const columns: number | null = event.value; void columns; }
    else { const layout: 'flow' | 'column' = event.value; void layout; }
  });
  if (host) { select.mount(host); radio.mount(host); }
  return { select, radio, data, changes, destroy() { select.destroy(); radio.destroy(); data.destroy(); } };
}

const fields = createChoices();
check(fields.select.getSelectedItem()?.code === 'ca', 'Borrowed choice identity');
check(fields.select.value.set('fr') && fields.changes[0]?.join(',') === 'ca,fr', 'Select change records');
fields.data.remove('fr', { silent: true });
check(fields.select.value.get() === '' && fields.select.getSelectedItem() === null && fields.changes.length === 1, 'Silent missing-value reconciliation');
fields.select.destroy(); check(!fields.data.destroyed, 'Borrowed data lifetime');
check(fields.radio.getSelectedIndex() === 0 && !fields.radio.setSelectedIndex(1), 'Disabled radio item');
check(fields.radio.setSelectedIndex(2) && fields.radio.value.get() === 3, 'Radio selection index');
const selected: RadioItem<Answer> | null = fields.radio.getSelectedItem();
check(selected?.text === 'Three' && selected.raw.label === 'Three' && selected.marker === '3', 'Normalized radio item');
if (selected) selected.text = 'Changed copy';
check(fields.radio.getSelectedItem()?.text === 'Three', 'Radio shallow wrapper copy');
fields.radio.setItems([{ id: 4, label: 'Four' }], { silent: true });
check(fields.radio.value.get() === null && fields.radio.getSelectedIndex() === -1, 'Radio items reconciliation');
fields.radio.setColumns(null).setLayout('column');
fields.radio.destroy(); fields.data.destroy();
const primitive = new RadioGroup({ items: ['A', 'B'] });
check(primitive.getItems()[0]?.raw === 'A' && primitive.setSelectedIndex(0), 'Primitive radio normalization'); primitive.destroy();

function rejected(service: InputOverlayService) {
  const gridService: GridEditorOverlayService = service; void gridService;
  // @ts-expect-error Standalone Select does not parse options arrays; use data.parse.
  new SelectInput({ options: ['A'] });
  // @ts-expect-error Radio uses items/options, not a DataStore.
  new RadioGroup({ data: new DataStore() });
  // @ts-expect-error Unknown choice values need narrowing even with a typed choice store.
  fields.select.value.get().toUpperCase();
  // @ts-expect-error Popup open has no silent contract.
  fields.select.openPopup({ silent: true });
  fields.radio.events.on('appearanceChange', event => {
    // @ts-expect-error Appearance payload uses value, not newValue.
    event.newValue;
  });
  // @ts-expect-error Select callbacks retain the choice schema.
  new SelectInput<Country, string>({ filterPredicate: item => item.missing === true });
  // @ts-expect-error Item identity is string, not number.
  fields.select.data.get(1);
}
void rejected;
console.log('Installed choice inputs OK: schema, record events, ownership, normalization, indices and reconciliation');
