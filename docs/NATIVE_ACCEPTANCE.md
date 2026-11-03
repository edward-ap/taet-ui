# Native host acceptance

A Windows Tauri acceptance stand used the pre-rename 0.6.0-rc.1 release from commit
18c65890435e1bae97af262a20ced705e0e49e4f. It embedded one components profile,
matching CSS, local Noto Sans and notices, with no frontend framework or CDN.

Windows 11 / Tauri 2.12.1 / WebView2 156.0.4314.50 at the existing scale factor
1.5: two actual standalone EXE launches passed 19/19 programmatic checks each.
These exercised public APIs and explicitly synthetic DOM events. A fixed Rust
host probe resized/minimized/restored the real window; it was not physical input.
Normal interactive mode has 18 programmatic checks because the autorun-only native
window probe is deliberately unavailable there.

The author additionally reported real Grid Move and Tree Move fixture operations.
That bounded observation does not certify the complete keyboard/mouse/IME matrix.
The large acceptance stand, EXE, local profiles and raw diagnostic reports are not
the small public example or a required runtime dependency of this toolkit.

Still unverified: actual IME composition; complete physical keyboard/pointer flow;
screen readers; mixed-monitor DPI; native file dialogs/clipboard; other WebView hosts.
macOS will be tested after GitHub publication from a separate consumer project.
macOS native acceptance is currently unverified and is not a preview-release blocker.
Linux native acceptance is also unverified.
No claim of tested macOS/Linux can be inferred from portable browser automation.

The source-only [minimal Tauri example](../examples/tauri-minimal/README.md) has its
own separate Windows build/run smoke: 7/7 programmatic checks, local assets/Noto,
bounded Rust echo, synthetic Form input/button handling and two fresh-profile
standalone launches with clean exits. WebView2 was 156.0.4314.58 at scale 1.5.
This result is distinct from the larger stand and still does not certify physical
keyboard/mouse/IME or other OSes. No native EXE/evidence is shipped in the example.

## Verified feedback base for rc.2 (2026-11-02)

A fresh build of exact commit `be78df1056d1c25369b989f51d7819f37c88c8fd`
was tested in a separate Windows 11 / Tauri 2.12.1 / WebView2 156.0.4314.58
stand at the existing 150% DPI. Two genuine standalone launches passed 46/46
programmatic checks each and exited cleanly. Scope included editor value/focus
and teardown, Date ordering, SVG gutter/selection markers, Grid batch copy/move
and rejection, and Tree subtree moves and vetoes. Events in the automated runner
were API/synthetic operations inside the real WebView, not physical OS input.
The host also exercised native resize/minimize/restore at the current scale.

The maintainer subsequently reported the manual interactive check passed on that
stand. This bounded report supplements the automated checks; it does not certify
every key/pointer path, actual IME, screen readers, mixed-monitor DPI, native
clipboard/file dialogs or macOS/Linux. The rc.2 release metadata update does not
claim a new native run on the later release SHA. No stand EXE, profile, private
fixture or raw diagnostic evidence is included in this source-only release.
