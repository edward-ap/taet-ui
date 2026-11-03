# Typed control lifecycle

This page documents the typed npm package; its package imports are intentional.
For portable JavaScript application setup, use the consolidated bundle as described
in [BUILD](BUILD.md). Standalone bundles do not currently ship flattened declarations.

For value, validation and TextInput contracts layered on this base, see
[typed input controls](INPUT_TYPES.md) and the `taet-ui/inputs` entry.

`taet-ui/core` exports the original `BaseControl` and `LifecycleError`, with
declarations for lifecycle, state, focus, keyboard and resize events. Importing
the entry, constructing an unmounted control and using its state or cleanup
does not require a DOM. Mounting and DOM interaction require a browser.
[Grid and TreeGrid](GRID_TYPES.md) have separate declarations in `taet-ui/grid`.
Other UI constructors, including Panel, are declared through the root entries;
see [component types](COMPONENT_TYPES.md). `BaseControl<Events, RootElement>` defaults
to an HTML/SVG root union; specify `HTMLElement` for custom HTML subclasses.

## State and return values

```ts
import { BaseControl, LifecycleError } from 'taet-ui/core';

const control = new BaseControl({ name: 'preview', width: '100%', height: 120 });
control.state.set('dirty');                         // returns control
control.state.set('validation', { message: 'Check' }, { silent: true });
const validation = control.state.get('validation'); // unknown: narrow before use
control.state.clear('dirty');                      // returns control
control.setSize(320, null);                        // reset explicit height
control.setSize({ width: null }, { silent: true }); // reset explicit width
control.destroy();

try { control.refresh(); }
catch (error) {
  if (error instanceof LifecycleError) {
    console.log(error.controlId, error.operation); // preview, refresh
  } else { throw error; }
}
```

State names are nonempty strings on writes; values are application-defined.
`get()` returns unknown, `has()` tests presence, and `all()` returns a new object
containing the existing value references. `set(name)` defaults the value to true.
The built-in CSS states (`invalid`, `warning`, `readonly`, `required`, `focused`,
`dirty`) depend on **presence**, so `set('dirty', false)` still applies the class.
Use `clear('dirty')` to remove it. `silent` updates state and CSS without emitting
`stateChange`. Equal-value sets suppress that event, but still apply state.
Visibility and disabled flags are separate from this state map.

| Methods | Result |
| --- | --- |
| mount, show, hide, setSize, setTabIndex, state.set, state.clear | The control, including when visibility is vetoed |
| refresh, enable, disable, destroy | void |
| focus, blur, canFocus, isFocused, isVisible, isChildOf | boolean |
| getParent, element, getFocusElement | Nullable until attached/mounted, or after teardown |
| getSize | CSS dimensions before mount; measured numeric dimensions after mount |

`ControlDimension` is `number | string | null`; numbers represent CSS pixels.
Use `setSize({ width, height }, options)` or `setSize(width, height, options)`;
omitted dimensions are retained and null clears the explicit style. The
positional null-height form now correctly resets height instead of throwing.
Resize events include old/new sizes, width, height and mutation provenance.
An `onResize` callback enables observation even without `observeResize: true`.
Observer notifications use `origin: 'system'` and `reason: 'observer'`.

## Events and subclasses

```ts
const visibility = new BaseControl({ name: 'visibilityExample' });
visibility.events.on('beforeHide', event => {
  if (event.source.state.has('dirty')) event.cancel = true;
});
visibility.hide();
visibility.destroy();
```

Visibility changes emit beforeShow/show/afterShow or beforeHide/hide/afterHide.
Only the before events are cancellable. Visibility options carry origin and
userAction; they do not implement silent semantics. An already satisfied
visibility request emits nothing. `isVisible()` reports the control's own flag,
not computed ancestor visibility.

Constructor callback options are `onResize`, `onParentResize`, `onFocus`,
`onBlur`, `onKeyDown`, and `onKeyUp`. Other base events use `events.on()`;
there is no automatic `onStateChange` or `onShow` constructor binding.
Event `type` remains a string because EventBus preserves a supplied type.

```ts
class PreviewControl extends BaseControl<{ accepted: { count: number } }, HTMLElement> {
  acceptedCount = 0;
  accept() { this.events.emit('accepted', { count: ++this.acceptedCount }); }
}

const preview = new PreviewControl();
preview.events.on('accepted', event => console.log(event.count));
preview.events.on('stateChange', event => event.source.accept());
preview.state.set('ready').setTabIndex(0);
preview.destroy();
```

The generic parameter adds an application event map; use distinct names from
base events. Base subscriptions retain the subclass type in `source`.
Constructor callbacks describe the base surface. An extra event receives only
the payload the subclass emits; EventBus does not invent its source.
Override `createElement()` to implement a custom control's DOM, preferably
starting from `super.createElement()` to keep its ownership marker. Underscore
implementation methods are not part of this declaration surface.

`focus()` and `blur()` report success. Focus is unavailable when unmounted,
disabled, hidden or destroyed. Focus events include native FocusEvent data;
moving between a control's internal targets does not emit a public blur/focus
pair. Programmatic focus defaults to API provenance; native focus uses user
provenance. Key events expose native KeyboardEvent data and a mutable `cancel`;
cancellation prevents the native default and stops propagation. `tabIndex`
accepts integer numbers or null; null removes the forced attribute.

## Ownership and teardown

`mount()` accepts an HTMLElement or CSS selector. Mounting again into the same
host returns the control; mounting into another host throws LifecycleError.
Mounting alone does not establish a control parent. A container's composition
API, such as a mounted Panel's `add()`, establishes ownership.

BaseControl disposes its bag, removes its DOM, detaches from its parent and
destroys its event bus. Containers implement descendant destruction.
`destroy()` is idempotent. Mutating lifecycle/state methods throw afterward;
focus/blur return false, and read-only state access remains available.
There is no base destroy event.

Register external subscriptions with `control.disposables.add(subscription)`.
For an owned resource exposing only destroy, register `() => resource.destroy()`;
DisposableBag does not invoke destroy automatically. Disposing a subscription
does not destroy its external publisher. Constructor callbacks and the base
DOM listeners are already owned by the control.

Checked JavaScript uses the same contract with
`/** @type {import('taet-ui/core').BaseControlOptions} */`.
The installed-package checks compile TS and JSDoc under NodeNext and Bundler,
execute state/visibility/size/lifecycle cases in Node, and mount a compiled TS
subclass inside a real Panel in Chromium. Browser coverage includes focus,
native key cancellation, silent DOM state, parent resize and teardown of DOM,
external subscriptions and global listeners.
