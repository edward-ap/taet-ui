// @ts-check
import { PropertyGrid } from 'taet-ui/components';
import { gridEditors } from 'taet-ui/grid/editors';

/** @param {HTMLElement} host */
export function checkPropertyRevisionJavascript(host) {
  let value = 'initial', revision = 0n, mutate = true;
  /** @param {string} next */
  const set = next => { if (value !== next) { value = next; revision++; } };
  const editor = gridEditors.custom(
    /** @param {import('taet-ui/experimental').PropertyEditorContext} context */
    context => {
      value = String(context.value ?? '');
      return { mount() {}, focus() {}, destroy() {}, getValue: () => value,
        getValidationRevision: () => revision,
        validate() { if (mutate) { const old = value; set('temporary'); set(old); } return { ok: true }; }
      };
    });
  const grid = new PropertyGrid(host, { source: [{ properties: [{ name: 'value', type: 'custom', value: 'initial', editor }] }] });
  /** @type {import('taet-ui/components').PropertyGridEvents['editReject'][]} */
  const events = [];
  grid.events.on('editReject', event => {
    /** @type {'validation-revision'|'validation-stale'} */ const reason = event.reason;
    /** @type {import('taet-ui/grid/editors').CellEditorValidation} */ const validation = event.validation;
    void reason; void validation; events.push(event);
  });
  if (!grid.startEdit('value')) throw Error('JSDoc PropertyGrid session start'); set('candidate');
  if (grid.commitEdit() || events[0]?.reason !== 'validation-stale' || grid.getPropertyControl('value')?.property.value !== 'initial') throw Error('JSDoc PropertyGrid stale refusal');
  mutate = false;
  if (!grid.commitEdit() || grid.getPropertyControl('value')?.property.value !== 'candidate') throw Error('JSDoc explicit property retry');
  grid.destroy();
}

function rejected() {
  /** @type {import('taet-ui/components').PropertyGridEvents['editReject']['reason']} */
  // @ts-expect-error Ordinary validation failure is not a new editReject reason.
  const reason = 'validation';
  void reason;
}
void rejected;
if (typeof document === 'undefined') console.log('Installed PropertyGrid revision JSDoc OK: strict rejection payload typing');
