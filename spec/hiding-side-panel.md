# HidingSidePanel (experimental)

Import from `taet-ui/experimental`. A non-modal, live-Control container mounted
inside a positioned host of definite size. It overlays its host without reserving
a strip or changing sibling layout. Unlike DockLayout it does not dock/reparent
application workspaces.

`new HidingSidePanel({title, content, side: 'left', tabPosition: .35,
panelWidth: 290, opened: false})`; mount/attach before calling `add`.
The optional content is a live Control owned/destroyed by this Panel.

- Click the shaped 18×68px edge tab to toggle. Drag it vertically or within 40px
  of the opposite host edge to move it. The drag commits on release; cancellation
  rolls back. Alt+arrows provides keyboard positioning. Position is normalized
  to available vertical travel (0–1), so it remains reachable after resize.
- `setOpen`/`toggle`, `setPlacement`, `setPanelWidth` synchronize UI and emit
  `openChange`, `placementChange`, `widthChange` (oldValue/value plus mutation
  origin/userAction). Silent updates still synchronize. Persist committed events
  in the host application. Requested width survives temporary host narrowing.
- Click in the host outside the panel, close button, or Escape inside it to
  dismiss. External buttons and portalled menus/dialogs are deliberately excluded
  from outside dismissal. Focus returns on explicit close when it was inside;
  outside dismissal does not steal focus. This is not a modal/focus trap.
- Hidden content is inert and retains its controls/state. Drag gestures capture
  pointers; open/close animates transforms only, honoring reduced motion. Resizing
  uses the drawer's inner separator (pointer or arrows). Width is clamped to host.
- `closeLabel`, `resizeLabel`, `tabHint` provide application-localized labels.
  Inherited visibility controls the whole component, not just the drawer.

Regression: `browser-tests/hiding-side-panel.spec.js`.
