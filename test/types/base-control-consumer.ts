import { BaseControl, LifecycleError, EventBus, type BaseControlOptions,
  type ControlSize, type ControlStateChange } from 'taet-ui/core';

function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
const options: BaseControlOptions = { name: 'consumer', width: '50%', height: 80,
  onResize(event) { const size: ControlSize = event.newSize; check(size.width === event.width, 'resize shape'); },
  onFocus(event) { event.source.getFocusElement(); event.nativeEvent?.composedPath(); },
  onKeyDown(event) { if (event.key === 'Escape') event.cancel = true; }
};
const control = new BaseControl(options);
const stateChanges: ControlStateChange[] = [];
control.events.on('stateChange', event => stateChanges.push(event));
check(control.state.set('dirty', false) === control, 'state setter returns owner');
check(control.state.has('dirty'), 'false state retains presence');
control.state.set('dirty', false);
check(stateChanges.length === 1, 'equal state suppresses event');
control.state.set('payload', { id: 1 }, { silent: true });
const snapshot = control.state.all(); delete snapshot.dirty;
check(control.state.has('dirty'), 'state snapshot is separate');
check(control.state.clear('dirty') === control, 'clear returns owner');
control.state.set('persistent');
control.setSize(240, null).setTabIndex(-1);
check(control.getSize().height === null && control.getTabIndex() === -1, 'nullable size/tab index');
control.events.once('beforeHide', event => { event.cancel = true; });
check(control.hide() === control && control.isVisible(), 'visibility veto');
control.hide({ origin: 'command' });
check(!control.isVisible(), 'hide');
control.show();
check(control.enable() === undefined && control.disable() === undefined, 'void enable/disable');
check(!control.focus() && !control.blur(), 'unmounted focus');
const external = new EventBus<{ tick: {} }>();
let notifications = 0, cleanup = 0;
control.disposables.add(external.on('tick', () => { notifications++; }));
control.disposables.add(() => { cleanup++; });
external.emit('tick'); control.destroy(); control.destroy(); external.emit('tick');
check(notifications === 1 && cleanup === 1 && !external.destroyed, 'subscription ownership');
check(control.destroyed && control.events.destroyed && control.disposables.disposed, 'teardown');
check(control.state.has('persistent') && control.element === null, 'post-destroy reads');
try { control.state.clear('persistent'); throw new Error('Expected lifecycle error'); }
catch (error) {
  check(error instanceof LifecycleError && error.control === control &&
    error.controlId === control.id && error.operation === 'state.clear', 'lifecycle metadata');
}
external.destroy();

// Extra events preserve inherited payloads and subclass-aware sources on base events.
class SpecializedControl extends BaseControl<{ accepted: { count: number } }> {
  acceptedCount = 0;
  accept() { this.events.emit('accepted', { count: ++this.acceptedCount }); }
}
const specialized = new SpecializedControl();
const base: BaseControl = specialized;
specialized.events.on('accepted', event => { check(event.count === 1, 'extra event'); });
specialized.events.on('stateChange', event => { event.source.accept(); });
specialized.state.set('custom').setTabIndex(0);
base.destroy();
console.log('Installed TypeScript BaseControl consumer OK: state, events, sizes, lifecycle and ownership');

function rejected() {
  // @ts-expect-error Visibility does not implement silent mutation semantics.
  control.hide({ silent: true });
  // @ts-expect-error No implicit onStateChange constructor binding.
  new BaseControl({ onStateChange() {} });
  // @ts-expect-error State values require narrowing.
  control.state.get('payload').id;
  // @ts-expect-error Lifecycle state is read-only to consumers.
  control.destroyed = false;
  // @ts-expect-error DOM mount hosts are not control owners.
  control.mount(base);
  // @ts-expect-error The base event set is checked.
  control.events.on('click', () => {});
  // @ts-expect-error Custom payload is checked too.
  specialized.events.emit('accepted', { count: 'one' });
  // @ts-expect-error Register a destroy callback, not the control itself.
  control.disposables.add(base);
  // @ts-expect-error Enable is not fluent.
  control.enable().show();
}
void rejected;
