// @ts-check
import { EditorControl } from 'taet-ui';

/** A scalar text widget owned by the returned field.
 * writeDisplay is render-only: it must not emit onInput. onInput reports user edits
 * immediately, without a separate hidden draft. Adapt focus/accessibility in the widget.
 * @typedef {object} TextWidget
 * @property {(host: HTMLElement) => void} mount
 * @property {(text: string) => void} writeDisplay
 * @property {(listener: (text: string) => void) => (() => void)} onInput
 * @property {() => void} destroy
 */

/** Keep the inherited value pipeline authoritative; never poll the widget in a getter.
 * This is an application recipe for this widget contract, not a universal adapter.
 * @param {TextWidget} widget Ownership passes to the field, including before mount.
 * @param {import('taet-ui').EditorControlOptions<string>} [options]
 */
export function createWidgetField(widget, options = {}) {
  /** @extends {EditorControl<string>} */
  class WidgetField extends EditorControl {
    constructor() {
      super(options);
      let released = false;
      const stop = widget.onInput(text => {
        if (!released && !this.destroyed) {
          this.value.set(text, { origin: 'user', userAction: true });
        }
      });
      this.disposables.add(() => {
        released = true;
        stop();
        widget.destroy();
      });
      widget.writeDisplay(this.value.get());
    }

    createElement() {
      const root = super.createElement();
      widget.mount(root);
      widget.writeDisplay(this.value.get());
      return root;
    }

    /** Silent programmatic writes still synchronize the visible widget.
     * @param {unknown} value
     */
    _syncInput(value) { widget.writeDisplay(String(value ?? '')); }
  }
  return new WidgetField();
}
