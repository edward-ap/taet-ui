// @ts-check
import { Grid, TreeGrid } from 'taet-ui/grid';
import { gridEditors } from 'taet-ui/grid/editors';
/** @typedef {{id:number,parentId:number|null,value:string}} Row */
/** @typedef {import('taet-ui/grid/editors').GridEditorValidationContext<Row>} Context */

/** @param {'direct'|'control'} shape @param {boolean} mutate */
function customFactory(shape, mutate) {
  let accepted = '', revision = 0n, disposals = 0;
  /** @param {string} value */
  const set = value => { if (accepted === value) return false; accepted = value; revision++; return true; };
  /** @returns {import('taet-ui/grid/editors').ValidationRevision} */
  const getValidationRevision = () => revision;
  const validate = () => {
    if (mutate) { const old = accepted; set('temporary'); set(old); }
    return { ok: true };
  };
  /** @type {import('taet-ui/grid/editors').GridEditorFactory<Row,number,string>} */
  const factory = gridEditors.custom(context => {
    set(String(context.value ?? ''));
    if (shape === 'direct') {
      /** @type {import('taet-ui/grid/editors').CellEditor<string,Context>} */
      const editor = { getValidationRevision, getValue: () => accepted, validate,
        mount() {}, focus() {}, destroy() { disposals++; } };
      return editor;
    }
    /** @type {import('taet-ui/grid/editors').GridValueControl<string,Context>} */
    const control = { getValidationRevision, value: { get: () => accepted, set }, validate,
      mount() {}, focus() {}, destroy() { disposals++; } };
    return control;
  });
  return { factory, set, disposed: () => disposals };
}

export function checkJavascriptRevisionNode() {
  for (const shape of /** @type {const} */ (['direct', 'control'])) for (const mutate of [false, true]) {
    const fixture = customFactory(shape, mutate);
    const grid = new Grid({ columns: [{ id: 'value', editor: fixture.factory }] });
    grid.data.parse([{ id: 1, parentId: null, value: 'initial' }]);
    grid.setCellRanges({ anchor: { rowId: 1, columnId: 'value' } });
    if (grid.pasteClipboardText('candidate') === mutate) throw Error('JSDoc temporary currentness');
    if (grid.data.get(1)?.value !== (mutate ? 'initial' : 'candidate')) throw Error('JSDoc stored value');
    if (fixture.disposed() !== 1) throw Error('JSDoc temporary cleanup');
    grid.destroy();
  }
}

/** @param {HTMLElement} host */
export function checkJavascriptRevisionBrowser(host) {
  for (const kind of ['Grid', 'TreeGrid']) for (const shape of /** @type {const} */ (['direct', 'control'])) for (const mutate of [false, true]) {
    const fixture = customFactory(shape, mutate);
    const options = { height: 180, columns: [{ id: 'value', editor: fixture.factory }] };
    const table = kind === 'Grid' ? new Grid(host, options) : new TreeGrid(host, options);
    table.data.parse([{ id: 1, parentId: null, value: 'initial' }]);
    /** @type {string[]} */ const reasons = [];
    /** @type {import('taet-ui/grid/editors').GridEditorHost<Row>} */ const editing = table;
    editing.events.on('editReject', event => reasons.push(event.reason));
    if (!table.startEdit(1, 'value')) throw Error('JSDoc start custom editor');
    fixture.set('candidate');
    if (table.commitEdit() === mutate) throw Error('JSDoc mounted currentness');
    if (mutate && reasons.join() !== 'validation-stale') throw Error('JSDoc stale reason');
    if (table.data.get(1)?.value !== (mutate ? 'initial' : 'candidate')) throw Error('JSDoc mounted stored value');
    table.destroy(); if (fixture.disposed() !== 1) throw Error('JSDoc mounted cleanup');
  }
}

function rejected() {
  /** @type {import('taet-ui/grid/editors').CellEditor<string>['getValidationRevision']} */
  // @ts-expect-error JSDoc raw editor hook rejects object tokens.
  const object = () => ({ version: 1 });
  /** @type {import('taet-ui/grid/editors').GridValueControl<string>['getValidationRevision']} */
  // @ts-expect-error JSDoc wrapped control hook is synchronous.
  const promise = async () => 1;
  void object; void promise;
}
void rejected;
if (typeof document === 'undefined') { checkJavascriptRevisionNode(); console.log('Installed Grid revision JSDoc OK: raw/wrapped custom capability, accepted ABA and cleanup'); }
