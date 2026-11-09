// @ts-check
import { BaseControl, Form } from 'taet-ui';
import { createWidgetField } from './13-custom-editor.js';

/** @typedef {import('taet-ui').RevisionedFormField} RevisionedFormField */
/** @implements {RevisionedFormField} */
class CustomField extends BaseControl {
  #stored = '';
  #revision = 0n;
  getValidationRevision() { return this.#revision; }
  value = Object.freeze({
    get: () => this.#stored,
    /** @param {unknown} value @param {import('taet-ui').MutationOptions} [options] */
    set: (value, options) => { this.#stored = String(value); this.#revision++; void options; },
    /** @param {import('taet-ui').MutationOptions} [options] */
    clear: options => { this.value.set('', options); }
  });
}
/** @type {import('taet-ui').FormField} */
const structural = new CustomField({ name: 'custom' });
/** @type {unknown} */ const changed = structural.value.set('initial', { silent: true });
const separate = new CustomField();
/** @type {import('taet-ui/components').ValidationRevisionSource} */
const capability = separate;
/** @type {import('taet-ui/experimental').ValidationRevision[]} */
const revisions = [0, capability.getValidationRevision(), Symbol('opaque')];
const form = new Form().row(structural);
if (!form.validate().ok || !form.submit()) throw Error('JSDoc custom capability');
form.destroy(); separate.destroy(); void changed; void revisions;

let display = '', released = 0;
/** @type {(text: string) => void} */ let input = () => {};
const field = createWidgetField({
  mount() {},
  writeDisplay(text) { display = text; },
  onInput(listener) { input = listener; return () => { released++; }; },
  destroy() {}
}, { name: 'text', value: 'initial' });
field.value.set('loaded', { silent: true });
if (String(display) !== 'loaded') throw Error('JSDoc silent widget rendering');
input('edited');
const owner = new Form().row(field);
if (field.value.get() !== 'edited' || !owner.submit()) throw Error('JSDoc inherited currentness');
owner.destroy();
if (released !== 1) throw Error('JSDoc widget cleanup');

function rejected() {
  /** @type {import('taet-ui').ValidationRevisionSource} */
  // @ts-expect-error JSDoc revision hooks reject string tokens.
  const invalid = { getValidationRevision: () => 'revision' };
  /** @type {import('taet-ui').ValidationRevisionSource} */
  // @ts-expect-error JSDoc revision hooks reject promises.
  const asyncHook = { getValidationRevision: async () => 1 };
  /** @type {import('taet-ui').RevisionedFormField[]} */
  // @ts-expect-error getFields stays structural, not a runtime capability assertion.
  const allCapable = owner.getFields();
  // @ts-expect-error EditorControl value facade remains readonly.
  field.value.clear = () => true;
  void invalid; void asyncHook; void allCapable;
}
void rejected;
console.log('Installed Form revision JSDoc OK: void setters, capability typing and shipped widget recipe');
