# Atelier desktop showcase

A small, runnable dummy IDE composed from real Tæt UI controls. Project records,
Pascal text, build/run output and customer values are synthetic, in-memory fixtures.
Build and Run simulate tasks; the example provides a live form preview, not a
compiler or a graphical form-design engine.

## Run from this checkout

Run `npm ci`, then `npm run dev -- --port 5896` from the repository root and open
http://127.0.0.1:5896/examples/desktop-showcase/. On Windows use `npm.cmd` if the
PowerShell script shim is blocked. Choose another free port if needed.

The HTML import map resolves only the public root/components/advanced entries.
The example adds no runtime packages. app.js and host.css retain the tested consumer logic/styles, with line endings
and EOF whitespace normalized. This host changes only module/CSS URLs and adds
pagehide cleanup.

## Components and interaction

- Menu and CommandRegistry share Open, Build, Run, window and view actions with Toolbar.
- TreeList borrows one DataStore; selecting a record binds its PropertyGrid descriptors.
- DockLayout and DockPanel own Explorer, Inspector, center workspace and Output.
- MdiWorkspace owns real document windows with Code/Design TabBars and live Form controls.
- PropertyGrid Caption edits update the selected model and the form-preview title.
  Other sample fields are record metadata, not a complete visual-designer binding.
- Output and Inspector TabBars switch real child controls. Window close/reopen and
  dock collapse/restore preserve application data separately from layout.
- Run configuration opens an actual modal Dialog with a Form. Its lower-right
  location is host CSS; draggable is deliberately false for that fixed placement.
- The theme button changes the built-in light/dark classes on the same live app.

Try selecting OrdersForm.pas and typing a new Caption, activating either MDI title,
double-clicking CustomerStore.pas and closing its window, collapsing Build & Diagnostics
and restoring it through View, switching Tasks/Build Output, and confirming/cancelling
Run configuration. Theme changes keep the selected record, edits and windows.

## Host wiring

This is live-instance composition: mount general Panels before adding children,
compose Form rows before mount, write collections through DataStore, and destroy
the owner plus application-owned commands/models on teardown. The demo exposes
window.atelier for its host and interaction checks; it is not a framework global.
Selection invalidations can also report changes to the selected record: rebind
PropertyGrid only when selection identity changes, or typing can destroy its editor.

To embed in a WebView, serve local assets through the host origin/custom protocol.
Use the full ESM bundle for these Advanced controls. Map all three package names
used by app.js to the same vendor/taet-ui.min.js URL, link vendor/taet-ui.min.css,
and retain fonts/, LICENSE and notices. Do not mix source and separately built
profiles. Node/npm/Python are preview/build tools, not application runtime dependencies.
Native backend operations are host work; this browser example supplies no native bridge.

## Consumer trial and screenshots

A separate model context used installed README/docs, public declarations and checked
recipes, with an explicit restriction against reading framework implementation.
The same final app passed the directed interaction checks on public npm rc.3 and
the supplied local rc.4 tarball. The coordinator added typing/positioning QA; this
was one guided consumer trial, not a benchmark of model capability or speed.

Friction included aggregate declaration filenames, a guessed unsupported icon,
Toolbar showText, TextArea css/label options, selected-record invalidation and host
Dialog positioning. These were resolved in the example without framework changes.

README screenshots use local rc.4 from core commit
140478d4a0e8b91763b9413512b022500f46601c, Chromium 149, 1200x700 at DPR 2.
The PropertyGrid presentation baseline already existed in rc.3; this example does
not exercise rc.4's theme-file/storage migration. Exact raw reports and draft
screenshots remain outside the repository. See ../../docs/VERIFICATION.md.

Desktop components retain their existing experimental maturity; see
../../docs/STABLE_API.md. Browser checks do not establish native WebView/IME or
screen-reader acceptance.
