# EdgeActionLayer (experimental)

Exports: `taet-ui/experimental`, `taet-ui/all`. Implementation is independent of
renderers, documents, navigation and application state. This is a pointer-only
auxiliary interaction layer; provide accessible explicit controls for essential actions.

## API and composition

```js
const layer = new EdgeActionLayer({
  parent: workspace, commands,
  left: { size: .25, action: event => performAction(event.edge), indicator: 'L' },
  right: { size: '64px', command: 'workspace.action', indicator: 'R' }
});
layer.setEdgeEnabled('left', false);
layer.setEdgeSize('right', .2);
layer.isEdgeEnabled('right');
layer.refresh();
layer.disable(); layer.enable(); layer.hide(); layer.show();
layer.destroy();
```

Also supports `new EdgeActionLayer(parent, options)` or `new EdgeActionLayer(options)`
followed by `mount(parent)`. Parent is a mounted Panel/Layout (its content element),
an HTMLElement or a selector. `Panel.addControl` registers ownership without
replacing existing content, including LayoutCell content. Raw-element callers own
and destroy the layer explicitly. A non-container control can supply its element,
but then ownership is explicit. `display:contents` hosts lack a box and are rejected.

All four optional edge configs accept `size`, `enabled`, `indicator` and either
`action` or `command`. An empty config is an event-only zone. Unconfigured edges
produce no DOM. Config must be an object; enabled is boolean; action is a function.
Size defaults to .25 and accepts fractions 0..1, finite nonnegative px strings and
0..100% strings. Invalid values throw before mutation. Zero depth has no hit area.
No arbitrary CSS expressions or new dimension language are accepted.

Runtime setters update existing edges only; unknown/unconfigured edges throw.
`isEdgeEnabled` reports effective enabled/visible/command state (not nonzero size).
There is no dynamic edge creation or indicator replacement API in v1.
Inherited layer size/tabIndex options are intentionally omitted: geometry belongs
to the host and the overlay is not a keyboard focus target.

## Geometry and DOM

One absolute root with pointer-events:none; one pointer-events:auto zone per
configured edge; one span per supplied indicator. Thus two edges without indicators
use three nodes, four text indicators use nine total. Custom nodes/controls add
their own subtree. No normal-flow wrappers or flex/grid tracks are added.

CSS percentages refer to the parent client width/height. The root is clipped to
that area. Left spans full height; right spans full height and is capped to the
width left over after left. Top and bottom span the remaining horizontal gap;
bottom is capped to the height left after top. Corners therefore belong to left
or right. Top wins over bottom if oversized vertical depths meet. No active
hit-target overlap or DOM-order tie-breaking is used. Disabled/hidden/unavailable
commands have zero effective depth and do not block underlying input.

CSS handles parent resizing; child scaling/resizing/scrolling is not observed.
A scroll listener on the host alone cancels pending gestures and translates the
root by host.scrollLeft/scrollTop, preserving its client origin. No JS resize
measurement or ResizeObserver is introduced by this layer. This is alignment
compensation, not a scrolling/gesture implementation. A non-scrolling workspace
shell around independently scrolling content is the simplest composition.

A static parent temporarily gets inline position:relative. A module-local WeakMap
reference-counts that adjustment across layers. Last destruction restores the old
inline value/priority if position is still the value installed by the layer.
Existing positioned parents and externally changed positions remain untouched.
As with any new containing block, existing absolutely positioned descendants of
a static host will now anchor to it; supply a deliberately positioned workspace
shell when their containing block must remain elsewhere.

Root z-index:1 supplies local sibling overlay placement, not a global popup tier.
Applications with higher-z-index siblings must arrange their own stacking context.

## Input and indicators

Pointer Events only. Primary button 0 press starts one candidate. Temporary
capture-phase document listeners observe movement and release outside the zone.
No explicit pointer capture or touch-action:none is applied. Touch scrolling can
produce pointercancel and remains native. On release, elementFromPoint must hit
the same zone; implicit touch capture cannot authorize release outside it.

Movement beyond dragThreshold (default 5 CSS pixels) cancels, including coalesced
samples and an excursion that returns to its start. Pointercancel, capture loss,
window blur, another pointer, host scroll, refresh/reconfiguration or destruction
also cancel. Right-click and synthetic click events do not activate. Activation
uses pointerup exactly once; generated click is contained at the zone. No replay
of gestures into sibling content is attempted. The center retains native hit
testing, selection and keyboard interaction.

Indicators are transparent decorations at an 8px inset from their physical edge,
centered on the other axis of their zone. They inherit foreground color, appear
only on hover-capable pointer hover and disappear when unavailable. No default
glyphs, backgrounds, transitions or theme-specific colors are supplied. Indicator
wrappers are inert; the root is aria-hidden and supplies no tab stops. HTMLElement
indicators must be detached; they are removed on destroy without changing their
own attributes. Tæt UI indicators must be unmounted/unowned and unique; the
layer mounts and destroys them. Their entire subtree is decorative, even when a
control would normally be interactive. Text is assigned using textContent.

## Commands, events and lifetime

`commands` is a borrowed CommandRegistry and must outlive the layer. Both action
and command on one edge throw, as with Button. Missing registry/id or an unknown
initial id throws. Later unregister disables a zone; re-register restores it.
State subscriptions use the existing enabled/visible fields. Call
commands.refreshState() when external context changes, or layer.refresh().
Commands execute with origin:user/userAction:true through the registry, preserving
its normal command context, result/error and cancellation behavior.

`activate`, `enter`, `leave`: `{source, edge, nativeEvent, origin:'user', userAction:true}`.
activate is synchronous before dispatch. Destruction, disabling or reconfiguration
from its listener prevents dispatch. action receives the same payload; thrown or
rejected action errors emit `actionError` with error while the activation remains
current. Late callback rejection after teardown/reconfiguration is ignored; the
layer cannot cancel application asynchronous work already started.

Destroy removes permanent and temporary listeners, owned indicators and root,
releases command/parent/config references, and restores borrowed positioning.
Repeated destroy is harmless; mutation methods and isEdgeEnabled reject usage
after destruction. Parent/other children and borrowed registry remain intact.

## Routes

- Source/types: src/ui/EdgeActionLayer.js and EdgeActionLayer.d.ts.
- CSS: src/ui/styles/edge-action-layer.css.
- Live source: docs/src/pages/EdgeActionLayer.page.js (Components / Layout).
- Validation/commands: test/edge-action-layer.test.js.
- Browser geometry, pointer, ownership and docs: browser-tests/edge-action-layer.spec.js.

## Non-intercepting observation
`observe: true` observes pointer gestures on the mounted host in capture phase.
Zones remain pointer-events:none; underlying canvas/input retains wheel, pan and
pointer capture. Geometry and drag cancellation are the same as normal zones.
Interactive elements and native scrollbar gutters are excluded. Child scroll and
wheel cancel a pending action. No events are replayed. Indicators have no hover
hit target in this mode. Tests: reader-shell-contracts.spec.js.
