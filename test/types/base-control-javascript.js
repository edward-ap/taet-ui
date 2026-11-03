// @ts-check
import { BaseControl, LifecycleError } from 'taet-ui/core';
/** @type {import('taet-ui/core').BaseControlOptions} */
const options = { id: 'checked-js', onResize(event) { event.source.getSize(); } };
const control = new BaseControl(options);
control.setSize({ width: '100%', height: null }).state.set('dirty');
control.events.on('beforeHide', event => { event.cancel = true; });
control.hide();
if (!control.visible) throw new Error('JS visibility cancellation');
control.destroy();
try { control.refresh(); }
catch (error) {
  if (!(error instanceof LifecycleError) || error.operation !== 'refresh') throw error;
}
console.log('Installed JSDoc BaseControl consumer OK');
function rejected() {
  // @ts-expect-error State values are unknown in checked JS too.
  control.state.get('dirty').valueOf();
  // @ts-expect-error Unsupported callback is rejected.
  new BaseControl({ onShow() {} });
}
void rejected;
