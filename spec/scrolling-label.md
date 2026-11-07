# ScrollingLabel

Experimental LabelText-compatible plain-text display. Import from
`taet-ui/experimental` or `taet-ui/all`; include taet-ui/taet-ui.css.
See src/ui/ScrollingLabel.d.ts and docs/src/pages/ScrollingLabel.page.js.

Long text begins at offset zero, waits startDelay (default 1000 ms), and translates
left at speed (default 35 pixels/second). Exactly two copies share a gap (default
48 px). One cycle covers measured text width plus gap, making the second copy
coincide with the first at the iteration boundary. Delay applies once on restart.
Text that fits stays static. Text changes restart at the beginning; resize/font
metrics, speed and gap changes rebuild the geometry only when it differs.

The component uses one Web Animations transform, no JavaScript animation loop,
interval or timeout, no scrollLeft polling, and no per-frame DOM writes. Its root
clips painting and contains layout; input selection and document pointer handlers
are not modified. This does NOT guarantee zero CPU/GPU work: the browser must
composite changing pixels and may allocate a layer for the text. Extremely large
strings/many tickers and native WebView graphics drivers require target-device
measurement. Rasterization still happens when text/style changes.

ResizeObserver observes the viewport and one text copy. IntersectionObserver
pauses offscreen animation; document visibility, disabled, explicit hide and
setPaused also pause it. Reduced-motion preference disables the animation entirely
and shows the beginning. The complete text is available via getText and the native
title tooltip; only the first copy is exposed to assistive technology. No repeated
live-region announcements. Applications should expose pause/resume (as the demo
does) for long-lived animated content. Text is always inserted using textContent.

`setText(text, options)` preserves LabelText textChange/silent behavior. `refresh()`
reevaluates a function text source without emitting textChange. `setSpeed`, `setGap`
and `setPaused` return this, work before mount and reject after destroy. Invalid
numeric settings throw before mutation. speed must be positive; gap/startDelay
nonnegative. The owner cancels the animation and disconnects all observers/listeners
on destroy. No animation or measurement runs after teardown. Native font-ready
promises cannot be canceled, but their continuations are guarded against
measurement after destruction. Font loading/completion/error subscriptions are
released with the control.

Tests: test/scrolling-label.test.js; browser-tests/scrolling-label.spec.js checks
native mouse drag selection beyond both ends of a neighboring long TextInput,
its internal horizontal scrolling and stable label/input bounds while motion runs.
It also instruments timers/frame callbacks/DOM mutation during steady motion.
These tests establish interaction behavior, not a GPU power/performance certification.

Acceptance (2026-09-12): npm test passed (524 unit tests, syntax/API and installed
TS/JSDoc consumers); the final nine browser cases passed on Chromium, Firefox and
WebKit. Geometry uses untransformed CSS pixels and was checked under parent scaling.
During the 1.2-second steady-motion probe each engine reported zero observed JS
frame callbacks, timers and DOM mutations while the transform changed. Selection
checks passed with real mouse dragging beyond both input edges. Documentation was
opened with neighboring fields and its screenshot inspected. Package dry run
succeeded. These results do not measure GPU utilization or native WebView power.
