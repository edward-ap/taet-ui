# ThemeDesigner (experimental)

ThemeDesigner is a BaseControl exported from taet-ui/experimental and all.
Include taet-ui.css. By default the editor is 550px wide and sizes its height to
content, without constructing a demonstration preview. The lower settings share
a neutral tray (`--dui-theme-designer-settings-bg` overrides its light-gray fill).
For documentation/demo use `preview:true` and a definite height; that approximately
1000px workspace scrolls inside narrower hosts. No iframe, network, native bridge
or framework is required. All constructed children are owned.

`new ThemeDesigner(host, {host:adapter})` creates a private
preset collection. `.getPreset()`, `.getPresets()` and `.getTheme()` return detached
snapshots. `.setPreset({name,definition})` validates before changing state; names
matching protected recovery presets select the canonical built-in. Names are
1..80 characters and local/custom collections are bounded to 50. Clear, Light
Blue and Dark Blue cannot be overwritten or deleted. New presets require names;
Save/Delete require confirmation through Tæt UI dialogs.

The editor stores canonical OKLCH tone/hue, converts sRGB at input/output, and
computes derived contrast-safe surfaces without modifying the source anchor.
Distribution orders anchor identities independently of wheel geometry.

Use `onChange` to preview generated theme snapshots in the parent application;
the editor never mutates the application theme automatically. Apply remains the
explicit host command. A movable popup can own this compact control; dragging
and window chrome belong to that popup, not to the color editor. Existing users
of the embedded demo must now pass `preview:true` to retain it. The standalone
workbench continues to show its separate Preview.

## Host and persistence

`host.getPresetDirectory({signal})` returns an opaque directory identifier or
null. `host.openPresetExplorer({directory,purpose,signal})` returns a named preset
or null for cancellation; purpose is open or copy.
`host.applyPreset({preset,theme,signal})` resolves only after the application has
accepted/applied the theme. Missing methods report an error. Calls are serialized
by the toolbar. Destroy aborts outstanding requests; late results cannot update
the destroyed editor. Hosts must honor cancellation for their own native work.
`connectHost(adapter)` replaces the instance adapter and returns a disposer.
The designer never applies tokens to its parent application automatically.

Persistence is in memory by default. `storage` optionally supplies synchronous
getItem/setItem, with localStorage-compatible JSON under taet-ui.theme-editor.v1.
Use independently namespaced storage adapters when applications want separate
persistent collections. No implicit localStorage or cross-instance state sharing.
Import/Export use versioned JSON; no user HTML is evaluated.

## Lifecycle and event contract

API calls require a mounted, live instance. Options are validated before controls
are created. A change event carries source, preset/theme snapshots and mutation
origin metadata. Host operations and public setPreset are API-origin; slider
changes are user-origin. Loading another document or repainting preview does not
by itself constitute a changed preset. Destroy is terminal and idempotent.
The built-in preview exercises Forms, Tabs, Layouts and Grid; it is an owned demo,
not a native host acceptance certificate. Reader integration remains separate.

Implementation: src/ui/ThemeDesigner.js and src/ui/theme-designer/. Legacy
examples/theme-editor module URLs forward to the same implementation; the
standalone example retains an iframe preview solely for its existing workbench.
Regression: browser-tests/theme-designer.spec.js plus theme-editor*.spec.js.


## Non-modal feedback

Toolbar errors and successful operations use an instance-owned bottom-right
notification in the browser top layer, outside normal layout. It does not steal
focus or move the workspace. Errors have an alert role and red background;
success uses a status role and green background. All message text is plain text.
`notificationDuration` defaults to 5000 ms; 0 requires manual dismissal. Hover or
keyboard focus pauses expiry. The close button dismisses immediately. New feedback
replaces the current notice and resets its timer; there is no unbounded queue.
Destroy cancels timers/listeners and removes the notification. Entrance motion is
brief and disabled for prefers-reduced-motion. This is the designer's feedback
presenter, not a new public application-wide notification service.


## Host theme and color limits

The editor chrome inherits Tæt UI CSS variables from its parent, including
runtime theme class/token changes. It does not install Light Blue on itself.
The preset's foundation switch edits the output theme, not the host chrome.
Spectrum, swatches and white anchor badges are data visualization colors.
The settings tray defaults to the inherited surface token, with an optional
`--dui-theme-designer-settings-bg` override.

`maxColors` is a constructor-only integer 1..4 (default 4). It caps active anchors,
not the application's DOM nesting. Distribution cycles after the active count.
The cap applies to initial presets, setPreset, Open/Copy/Import, stored presets,
ray buttons and splitting a pair by dragging B. Larger palettes are adapted to
the cap's canonical ray geometry, preserving the base tone/hue and filtering
inactive anchor bindings. Source preset objects and stored data are not rewritten
merely by opening them. getPresets exposes effective, limited definitions.

## Live host subscription

```js
const designer = new ThemeDesigner(container, {
  maxColors: 3,
  host: { applyPreset: ({preset, theme, signal}) => saveAndApply(preset, theme, signal) }
});
previewInApplication(designer.getTheme()); // explicit initial snapshot
const subscription = designer.events.on('change', ({theme, preset, origin, userAction}) => {
  previewInApplication(theme);
});
// Before disposing the owning application screen:
subscription.off();
designer.destroy();
```

`previewInApplication` and `saveAndApply` are application-owned functions, not
Tæt UI exports. `onChange` is the constructor callback for the same change event;
choose it or events.on to avoid registering the same handler twice. Snapshots are
detached from editor state. User updates coalesce at the next animation frame;
setPreset is synchronous and reports api/false. Identical effective presets do
not emit duplicate changes. Mount does not emit an initial change; getTheme reads
the current definition even before a pending frame paints. Apply is a separate
explicit host operation; change does not persist or apply anything globally.
Disconnect subscriptions/destroy owners to stop future updates. Hosts must honor
AbortSignal for asynchronous Apply, and own any rollback when a popup is cancelled.

`toolbar:false` omits preset collection controls and their commands. Use it when
the host owns a single editable draft and supplies its own OK/Cancel actions.
getPreset/getTheme, onChange, maxColors and host-theme inheritance remain available.
The default toolbar behavior is unchanged.

For reversible host styling use [ThemeApplicator](theme-applicator.md). It applies generated colors and explicit surface bindings without owning persistence or foundation selection.
