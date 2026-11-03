// @ts-check
import { gridEditors } from 'taet-ui/grid/editors';
import { DataStore } from 'taet-ui/core';
/** @typedef {{ id: number, label: string }} Row */
/** @type {import('taet-ui/grid/editors').GridEditorFactory<Row>} */
export const editor = gridEditors.text(context => ({ placeholder: context.item.label,
  observeResize: true,
  onFocus: event => { event.source.value.get().toUpperCase(); },
  onKeyDown: event => { if (event.key === 'F2') event.cancel = true; }
}));
/** @type {import('taet-ui/grid/editors').GridEditorColumn<Row>[]} */
export const columns = [{ id: 'label', editor }];
function rejected() {
  /** @type {import('taet-ui/grid/editors').GridEditorColumn<Row>} */
  const bad = {
    id: 'label',
    // @ts-expect-error Checked JS also rejects field spelling errors.
    field: 'typo'
  };
  gridEditors.number({
    // @ts-expect-error Numeric option types also reach JS callers.
    min: 'zero'
  });
  void bad;
}
void rejected;

/** @typedef {{code: string, label: string}} Choice */
/** @type {DataStore<Choice, string>} */
const choices = new DataStore({ idField: 'code' });
choices.parse([{ code: 'ca', label: 'Canada' }]);
/** @type {import('taet-ui/grid/editors').SelectGridEditorOptions<Row, number, Choice, string>} */
const selectOptions = { data: choices, textField: 'label', searchable: true,
  filterPredicate: (item, query, source) => source.data.idOf(item).includes(query),
  renderItem: (item, context) => `${context.id}: ${item.label}`
};
export const selectEditor = gridEditors.select(selectOptions);
