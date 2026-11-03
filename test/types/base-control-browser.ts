import { BaseControl, LifecycleError, EventBus, type ControlParentResizeEvent } from 'taet-ui/core';

function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
interface Owner extends BaseControl {
  add(child: BaseControl): unknown;
  getItems(): readonly BaseControl[];
}

// Native DOM belongs to the control implementation, not application composition.
class FocusControl extends BaseControl<{ accepted: { count: number } }, HTMLElement> {
  override createElement(): HTMLElement {
    const root = super.createElement();
    const first = document.createElement('input');
    first.setAttribute('data-dui-focus-target', '');
    const second = document.createElement('button'); second.textContent = 'Inside';
    root.append(first, second);
    return root;
  }
  focusInternalButton() { this.element?.querySelector('button')?.focus(); }
}

export function verifyBaseControl(owner: Owner) {
  const external = new EventBus<{ tick: {} }>();
  let calls = 0, released = 0, globalKeys = 0, keyEvents = 0;
  const focusEvents: string[] = [], resizeEvents: ControlParentResizeEvent[] = [];
  const control = new FocusControl({ name: 'typed-child', tabIndex: 0, width: 200, height: 60,
    onFocus(event) { focusEvents.push(`focus:${event.origin}`); check(event.nativeEvent instanceof FocusEvent, 'native focus'); },
    onBlur(event) { focusEvents.push(`blur:${event.origin}`); },
    onKeyDown(event) { keyEvents++; if (event.key === 'Escape') event.cancel = true; },
    onParentResize(event) { resizeEvents.push(event); }
  });
  control.disposables.add(external.on('tick', () => { calls++; }));
  control.disposables.addEventListener(window, 'keyup', () => { globalKeys++; });
  control.disposables.add(() => { released++; });
  owner.add(control);
  check(control.getParent() === owner && control.isChildOf(owner), 'parent ownership');
  check(control.mounted && control.element?.parentElement, 'mount');
  check(control.mount(control.element.parentElement) === control, 'same-host mount');
  try { control.mount(document.body); throw new Error('Expected remount rejection'); }
  catch (error) { check(error instanceof LifecycleError && error.operation === 'mount', 'remount lifecycle error'); }
  control.state.set('readonly', false, { silent: true });
  check(control.element.classList.contains('dui-readonly'), 'CSS state is presence-based');
  control.state.clear('readonly', { silent: true });
  check(!control.element.classList.contains('dui-readonly'), 'silent state clear updates DOM');
  check(control.focus({ origin: 'command', preventScroll: true }), 'programmatic focus');
  control.focusInternalButton();
  check(focusEvents.join() === 'focus:command', 'internal focus keeps one public focus event');
  control.focus();
  check(control.blur({ origin: 'restore' }), 'programmatic blur');
  check(focusEvents.join() === 'focus:command,blur:restore', 'focus metadata');
  control.disable(); check(!control.focus(), 'disabled focus'); control.enable();
  control.hide(); check(control.element.hidden && !control.focus(), 'hidden focus'); control.show();
  control.setSize(180, null);
  check(control.element.style.width === '180px' && control.element.style.height === '', 'mounted null height reset');
  control.setSize({ width: null, height: 50 }, { silent: true });
  check(String(control.element.style.width) === '' && String(control.element.style.height) === '50px', 'object size');
  owner.setSize({ width: 580, height: 300 }, { origin: 'restore' });
  check(resizeEvents.some(event => event.parent === owner && event.source === control &&
    event.parentEvent.width === 580 && event.origin === 'restore'), 'parent resize propagation');
  const target = control.getFocusElement(); check(target, 'focus target');
  const cancelled = !target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  check(cancelled && keyEvents === 1, 'native keyboard cancellation');
  external.emit('tick'); window.dispatchEvent(new KeyboardEvent('keyup'));
  check(calls === 1 && globalKeys === 1, 'listeners before destroy');
  owner.destroy(); owner.destroy();
  external.emit('tick'); window.dispatchEvent(new KeyboardEvent('keyup'));
  target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  check(calls === 1 && globalKeys === 1 && keyEvents === 1 && released === 1, 'all listeners released exactly once');
  check(control.destroyed && control.element === null && control.getParent() === null &&
    owner.getItems().length === 0 && !target.isConnected, 'parent destroys child and DOM');
  check(!external.destroyed, 'subscription cleanup preserves external publisher'); external.destroy();
  try { control.mount(document.body); throw new Error('Expected terminal mount rejection'); }
  catch (error) { check(error instanceof LifecycleError && error.control === control, 'terminal lifecycle error'); }
  return { cancelled, released, calls, globalKeys, keyEvents };
}
