# README desktop showcase verification - 2026-11-03

README now links a small runnable examples/desktop-showcase host and contains real
light/dark screenshots of that same application instance plus an actual Dialog
detail. Capture: local rc.4 core from 140478d4a0e8b91763b9413512b022500f46601c,
Windows Chromium 149, viewport 1200x700, DPR 2, bundled font ready before capture.
No browser chrome or machine paths appear. Synthetic records and build/run
simulation are labeled; no real compiler or native backend is claimed.

A separate model context installed public npm rc.3, using README/docs, public
declarations and checked recipes under a no-implementation-inspection constraint.
It then installed the verified local rc.4 tarball. The final identical app passed
12 checks on each version, with no browser errors or external requests. This was
a directed trial: coordinator review added sequential-typing and positioning QA.
It is not a general model, timing or token-efficiency benchmark.

The follow-up found a consumer wiring error: same-ID selection invalidations
rebound PropertyGrid after the first typed character. A selected-ID guard fixes
it; every prefix of the 16-character edit now retains the original focused editor
and updates model/preview. Fixed host CSS prevented Dialog title dragging, so
draggable:false is explicit. Dialog-owned Form destruction is explicit and checked
after both Cancel and Run. Other friction involved aggregate declaration files,
guessed icons, Toolbar showText and TextArea css/label options. No library
implementation or runtime stylesheet was changed for these corrections.

Consumer/capture app.js raw SHA-256:
4998845f8baf8b117d86fb0e21d4eae1b3d7aefb2abc1e51a19d825c58a74ae0.
The curated app.js/host.css normalize only line endings/EOF whitespace; their
logic/styles match the installed-package trial. The repository host only
maps public entries to this checkout and adds pagehide cleanup. The same 12 checks
also pass against this host in Chromium, Firefox and WebKit. They exercise Menu,
TreeList/PropertyGrid/model/preview synchronization including sequential typing,
MDI activation/open/close, dock collapse/menu restore, TabBar content, Dialog
cancel/primary action/content destruction, and theme state retention.

README relative image paths and alt text load in a local 896px layout preview,
with no horizontal overflow. The exact new JavaScript excerpt mounts successfully
and its cleanup removes all owned controls. All three PNGs were visually inspected;
lossless IDAT optimization preserves every pixel. Sizes: light 220154 bytes,
dark 218594, Dialog 31733; total 470481 bytes. Images live under .github/screenshots
and the small example is outside the npm files allowlist. Raw trial reports,
private test tooling, dependencies and draft captures remain outside Git.

Syntax check: 542 files. API inventory and package boundaries pass, including all
47 approved Grid candidate hashes. Production src/scripts/package manifests are
unchanged from the preceding fully checked rc.4 commit; those full core gates were
not needlessly rerun for documentation/host assets. No new native WebView/physical
input/IME or screen-reader acceptance is claimed. Published rc.3 and remote state
were not changed. The PropertyGrid presentation baseline already existed in rc.3;
the dummy IDE does not test rc.4-specific theme-file/storage migration.

---

# rc.4 local branding and compatibility verification - 2026-11-03

0.6.0-rc.4 is an unpublished local candidate based on
ab75c464ed300a8680e7081b94db3744b78c4dfd. No push, registry publication,
release edit or external application change is part of this cleanup. Published
rc.3 and its six original local release assets are preserved; old local outer
manifests are retained under ignored distribution/rc.3-publication/.

Current branding, notices, the row-drag label, export filenames and local benchmark
identifiers use the current project name. The broken private historical CI link is
removed. Exact old versions/commits still identify historical native evidence;
none is relabeled as a newly executed native test.

Theme export writes taet-ui-theme v1 and .taet-theme.json. Import retains the
previous v1 tag and bare definitions. Storage reads the current key first, falls
back only when it is absent, writes the current key on mutation and never eagerly
rewrites the previous key. Canonical globals retain their old host aliases.
See [compatibility decisions](TAET_MIGRATION.md) for retained CSS/MIME/storage
names and one-way backward reading of saved files.

Reviewed Grid change: only the plain-text row drag label. New
GridRowReorderController.js SHA-256:
83b559b6e08b7413033402e734df54a41748b6ba9a957b11b1debd230dcfd75b.
The other 46 candidate source hashes, all imported hashes and immutable
source-snapshot.json bytes are unchanged. MIT/OFL/font bytes are preserved;
notices change only this project's descriptive name.

| Check on the rc.4 working tree | Result |
| --- | --- |
| New compatibility and row-drag targeted cases | 13/13 passed |
| npm run test:all, including npm test | Passed: syntax 541, API/boundaries, 695/695 units, full Chromium 728/728 |
| Installed source-package consumers | Strict TypeScript/JSDoc, NodeNext + Bundler and browser recipes passed; 476 bindings across entries |
| Standard Firefox compatibility, port 5893, one worker | 473/473 passed |
| Standard WebKit compatibility, port 5894, one worker | 473/473 passed |
| npm run test:bundle | 42/42 across Chromium/Firefox/WebKit; readable/minified ESM/IIFE and bundled font |
| Isolated pre-commit ZIP consumers | 18/18: three profiles, two formats, three engines; live input/action, font and teardown; blocked external requests |
| Preview ZIP manifests/contents | 22 entries/profile; content hashes, relative maps, required assets/licenses/examples and secret-pattern checks passed |
| Pre-report npm pack inspection | 496 tracked entries byte-matched; zero runtime dependencies; source/types/CSS/font exports preserved |
| Scope check | One Grid presentation string; other candidate hashes, license/font bytes and six original local rc.3 release assets preserved |
| Source/artifact legacy-name scan | 39 source matches: 24 compatibility/test/documentation and 15 ordinary English; no obsolete product branding or old HTTP link |
| ZIP residuals including source maps | full 32, components 16, foundation 0; only retained MIME and backward theme/storage strings |

Full Chromium used two workers, Firefox and Windows WebKit one each, on isolated
ports/outputs. This retains the existing Windows resource mitigation and WebKit
cap; assertions and global timeouts are unchanged. Compatibility now additionally
includes the new migration cases and existing row-reorder regressions.

Build input content SHA-256: 91a1636bc57547a47b51a3f8d9e57916865eaeec96c4c5109d149f5cf139894a.
These checks identify the pre-commit rc.4 working-tree content, not the older base
commit. Final archives must be regenerated from the clean local commit with
--release and their exact revision recorded in PROVENANCE.json. Repack after this
verification-record update so the tarball contains the current documentation.

Remaining boundaries: no native Tauri/WebView2 rebuild, physical input/IME,
screen-reader, mixed-monitor or non-Windows native acceptance was rerun. Existing
applications and optional licensed-vendor benchmarks were not modified or run.
Ignored old reports/caches and preserved rc.3/history are not new release inputs.

---

# Publication destination correction — 2026-11-03

The maintainer's final destination is **edward-ap/taet-ui**, matching npm taet-ui.
The earlier edward-ap/taet repository was created before that correction. It was
confirmed empty (no branches, commits, releases or assets); no code was pushed.
It is left untouched and is not a publication destination. All current origin,
package metadata, release links and archive provenance use edward-ap/taet-ui.
Initial d03a9c0, harness fix 635df4a and preparation 34d29b8 remain in local history;
the correction is a follow-up commit, with no amend/rewrite.

---

# rc.3 publication preparation and standard Firefox gate — 2026-11-03

Initial local commit d03a9c065a16ffe9bf2240fffc4dc1ecc54ec587 is preserved.
Harness fix 635df4a57ec713b3a5cc8963b0b3b9e4c46bc005 is a separate commit.
The maintainer subsequently authorized the public edward-ap/taet-ui repository,
GitHub prerelease/distribution and npm taet-ui publication under next. The new
repository was created public; the original project repository stayed private and
its v0.6.0-rc.2 tag still targets 1e51bdc8baa99130954206b0aff6367b0764e9d6.
Remote release/CI and npm registry outcomes are recorded separately in release
notes; local checks below do not themselves claim either publication succeeded.

## Harness evidence and bounded resolution

The saved Python-runner failures record NS_ERROR_NET_PARTIAL_TRANSFER on three
different unchanged module files. Firefox uses this code for incomplete HTTP
response framing ([Mozilla implementation](https://searchfox.org/firefox-main/source/netwerk/protocol/http/nsHttpTransaction.cpp));
the error alone does not identify the server, client or OS trigger.
Failures occurred with a one-worker repeat too, so concurrent browser load is not
necessary for the observed symptom. No readiness or wrong-root cause was proved.

A bounded instrumented reproduction used the unchanged Python request handler:
400 fresh Firefox contexts loaded the complete module graph, 82,001 responses
were recorded, all announced/sent byte counts matched and no client import failed.
Reset exceptions occurred while reading the next request after contexts closed;
no truncated-body record was observed. This probe did NOT establish a root cause.
Raw diagnostics remain outside source/package/distribution history.

The automated harness now uses Node's built-in loopback HTTP server, already a
required test tool. Resources are read into Buffers; Content-Length describes
those exact bytes. The runner checks the serving child PID, consumes its readiness
response and retains fixture stderr for failures. An occupied-port regression
proves an unrelated listener is not used or stopped. Python dev/docs commands
remain available. No runtime UI, assertions, global timeout, worker budget or
browser/OS security settings changed. This is an operational harness resolution,
not a claim that the original Python/Firefox transport trigger was repaired.

| Check on the final harness/release formats | Result |
| --- | --- |
| Standard Firefox compatibility runner, one worker, port 5873 | 462/462 passed, 14.0 minutes |
| Three originally interrupted cases, ten repeats through standard runner | 30/30 passed |
| Exact byte/HEAD/concurrent transfer and occupied-port regressions | 2/2 passed |
| npm test after public package metadata/formats | Passed: 694 units, syntax/API/boundaries, strict installed TS/JS consumers; 476 bindings across entries |
| Final complete unit run, including provenance regression | 695/695 passed; ignored Python bytecode cannot change the source digest; changing a real build input does |
| ESM/IIFE readable/minified exports, ownership and fonts | 42/42 across Chromium, Firefox and WebKit |
| Isolated extracted ZIPs | 18/18 across three profiles, two JS formats and three engines; live Form input/action, models, fonts and teardown; no source/network access |
| ZIP content/checksums | 22 members per profile; inner manifest/SHA-256 and outer ZIP hashes verified; no caches, credentials, executables or machine-specific map paths |

The source-provenance walker now excludes ignored __pycache__/*.pyc files.
Local diagnostic imports/compile checks had exposed those caches as volatile
hash inputs; no cache bytes were in Git or packaged assets. A regression proves
real source changes remain detected. The approved 47 Grid hashes and immutable
imported manifest are still checked independently and were not regenerated.

## Publication artifacts and boundaries

The npm root has public repository/homepage/issues metadata, typed ESM entries,
canonical/legacy CSS exports, local fonts and zero runtime dependencies. Explicit
publishConfig selects public access and next, not latest. Portable dist profile
metadata stays private; it is omitted from ZIPs. Registry authentication/2FA is a
separate user-controlled step; no credentials are placed in source or artifacts.

Build/minify uses pinned esbuild. Each full/components/foundation ZIP contains
readable/minified ESM and TaetUI classic IIFE alternatives, matching CSS/maps,
Noto WOFF2/OFL, MIT/notices, working classic/ESM examples, PROVENANCE.json and
SHA256SUMS.txt. Generated dist/ and distribution/ remain ignored. Release packaging
rejects stale build input digests and --release requires a clean commit. Final
archive provenance identifies the exact release commit. Maps contain public code.

No new native Tauri/WebView2, physical IME/screen-reader or mixed-monitor acceptance
was performed. Historical native evidence below keeps its original pre-rename
identities. The new browser/distribution results do not certify native hosts.

---

# Tæt UI migration verification — 2026-11-03

These are new local checks of taet-ui 0.6.0-rc.3, based on the pre-rename release
1e51bdc8baa99130954206b0aff6367b0764e9d6 plus the accepted PropertyGrid CSS patch.
See [migration inventory and naming decisions](TAET_MIGRATION.md). Historical
results below retain their original identities and are not new Tæt UI evidence.

Runtime/build input content SHA-256 (src, scripts, package and lockfile):
`21040b2599326c1bc25be05ee2ee626a40d040fbd9d2743661b18debb58f3edb`.
The local initial commit identifies the complete final source/docs tree; generated
dist/size-report.json records the exact Git state and source digest for each build.

| Check | New local result |
| --- | --- |
| Locked dev dependencies | npm ci --offline --ignore-scripts passed; six pinned dev packages from cache; no unknown taet-ui package installed |
| npm test | Passed: syntax (535 files), API inventory, package boundaries, 692/692 unit tests, installed TypeScript/JSDoc consumers |
| Declaration/runtime bindings | 476 across public package entries; strict NodeNext and Bundler; constructor identity retained |
| Full Chromium | Final 719/719, two workers, isolated port 5868 |
| Firefox compatibility | 462/462 with independent Node HTTP fixture, one worker, port 5870; standard Python runner 460/462 due to module transfer failures |
| WebKit compatibility | 462/462, one worker, isolated port 5863 |
| Portable bundles/fonts | 24/24 across Chromium/Firefox/WebKit; full/components/foundation builds and asset hashes passed |
| Installed tarball browser consumer | Passed: lifecycle, values, models, Grid/TreeGrid, all editors, transfer, Form, PropertyGrid, theme and teardown |
| PropertyGrid presentation | 12/12 contexts: three engines × light/dark × DPR 1/1.5; inset category geometry, no selected pseudo-element, retained selection background, focus and keyboard collapse/expand |
| Corrected affected browser files | 38/38 over two repeats, one worker; lab25-workbench, projection-callbacks and remaining-docs |
| Isolated mini-radio frontend | 56/56, DPR 1/1.5; new full bundle, original app-owned Spectrum extension and original radio CSS; synthetic bridge only |
| Isolated GjøaReader frontend | 10/10 selected theme/settings/menu/ownership/presentation tests; original all+foundation profile rebuilt from new public entries; original app-owned Painter/Viewport |
| Bundle/docs consistency | All 77 documentation imports and three profiles passed |
| CSS compatibility alias | dense.css and taet-ui.css produce identical minified bundled CSS |
| Minimal Tauri example assets | Isolated prepare.mjs --taet-ui-root passed; six matched JS/CSS/font/license assets, version 0.6.0-rc.3; native compilation not run |
| Local release prerequisites | Passed; publication mode deliberately not run |
| Package/content audit | Local tarball inspected; zero runtime dependencies; no caches, old Git history, local reports, credentials or native binaries; migration whitespace delta clean |
| Provenance and licenses | All 47 reviewed Grid file hashes preserved in the Git index; immutable imported manifest, MIT license, Noto WOFF2/OFL bytes unchanged |

Commands used: npm test; npm run build; node scripts/check-bundle.js;
npm run test:types:browser; npm run release:check; npm pack --json --ignore-scripts.
Browser execution used node scripts/run-browser.js with --workers=2 for the full
Chromium gate, and the compat/bundle configurations with --project and --workers=1
for Windows Firefox/WebKit. Each server used its own loopback port. This is the
test:all scope executed in separate commands; no remote CI result is claimed.
For the independent Firefox check, the local Node HTTP fixture served the same
tree and the CLI used TAET_UI_TEST_SERVER=1, TAET_UI_PORT=5870, the unchanged
playwright.compat.config.js, --project=firefox and --workers=1. Its complete
462/462 result took 14.2 minutes. The standard Python-runner gate is not claimed
green; its failures are described below.
Local diagnostic scripts, logs, screenshots and isolated consumer copies are
outside this Git tree. Existing consumers and source folders were not modified.

## Earlier attempts preserved

The early Chromium collection finished 711/714: one lab25 assertion still expected
the category border at the gutter origin; it now expects border + the configured
18px gutter, matching the accepted presentation change. The other two failures
occurred during module loading. Their traces contain net::ERR_NETWORK_CHANGED
(30 failed module requests in projection-callbacks, 44 in remaining-docs).
This establishes the loading symptom, not the underlying network/OS cause.
The unchanged affected behavior passed the separate 38/38 run; the subsequent full
719/719 run is a new result and does not overwrite that earlier failed collection.
No runtime workaround, relaxed assertion or global timeout change was applied.

The first full Firefox run finished 460/462. Both failures were in fixture module
loading, before the exercised actions: gridIntrinsicWidth.js and TextArea.js each
recorded NS_ERROR_NET_PARTIAL_TRANSFER in their trace. A separate one-worker repeat
through the same Python server failed while loading RangeSelectionModel.js, also
NS_ERROR_NET_PARTIAL_TRANSFER; that repeat was stopped after the confirmed failure.
The complete one-worker Firefox suite was then run through an independent Node
HTTP server over the same unchanged tree and passed 462/462. No assertion, timeout,
runtime or OS setting changed. The standard Python-runner gate remains failed;
the Node result is independent browser-behavior evidence, not a retroactive pass
of that runner. The original logs/traces remain separate, and the underlying
transport cause has not been established.

The first radio harness invocation accidentally mixed two Playwright runner copies
and discovered no tests; invoking its own isolated CLI passed 56/56. An initial
Gjøa harness tried the generic full bundle, omitting the application's required
foundation-only exports. That attempt was stopped; rebuilding the same public
all+foundation profile used by the application passed 10/10. Neither required
changes to the real applications or the framework API.

An initial all-files git diff --cached --check reports inherited CRLF in immutable
Grid/provenance files, existing EOF blank lines and original OFL trailing whitespace.
Those imported bytes were deliberately preserved. A separate complete migration
delta check with CR-at-EOL recognized passed; all staged Grid/provenance hashes
and unchanged license/font bytes were independently checked. No import hashes were
regenerated to hide a formatting change.

## Environment and bounded limits

Windows, Node 22.14.0, npm 11.8.0, Python 3.13.2, TypeScript 5.9.3,
esbuild 0.28.2, Playwright 1.61.1; existing Chromium 149.0.7827.55,
Firefox 151.0 and WebKit 26.5 binaries. Existing browser prerequisites and the
offline dependency cache were reused; a fresh OS/browser download was not tested.

No new native Rust/Tauri/WebView2 build, original legacy Reader replacement,
performance workload, macOS/Linux native run, physical IME/screen-reader/mixed-DPI
acceptance or remote CI was run for this migration. Browser DPR is emulation.
Legacy Reader keeps its original specialized pinned bundle. The two app consumer
checks above use synthetic isolated frontends, not real audio, books or Libraries.

Read-only GET https://registry.npmjs.org/taet-ui returned HTTP 404 on 2026-11-03.
That means no package document was found at that time; it is not a reservation,
ownership guarantee or publication permission. No unknown taet-ui package was
installed. private:true is retained; no npm publish/register action occurred.
No origin, remote repository, push, visibility change or release was created.
The intended future repository is edward-ap/taet-ui, requiring a separate action.

---

# Historical pre-rename verification (exact versions preserved)

# Verification scope

This is a preview with bounded evidence, not certification of every host/platform.
The final release tag/CI results must identify their own exact commit and artifacts.

## rc.2 preparation and verified feedback base (2026-11-02)

The rc.2 release changes version metadata and public status documentation only on
feedback commit `be78df1056d1c25369b989f51d7819f37c88c8fd`; runtime/declarations,
fonts and the reviewed Grid file hashes are unchanged from that input. Final
release checks and CI run again on the resulting release commit. Results below
identify the feedback base and are not silently transferred to another SHA.

Archived pre-rename CI run 41375177487 (private repository; not a public validation link)
completed successfully on that exact feedback SHA, first attempt, all six jobs:

- 692 unit tests; full Chromium 719/719 in each Windows/Linux Node22/24 job.
- Linux compatibility 1386/1386: 462 each Chromium, Firefox and WebKit.
- Three-engine bundle/font 24/24; build, API/boundaries, provenance, pack,
  installed TS/JS/browser consumers (476 runtime exports), and performance passed.

The preceding runs 41367710193 and 41372754653 remain failed historical runs.
Their traces established Date DOM readiness, Mapper port readiness, WebKit label
focus ordering and a missing keyboard-fixture focus wait; the fixes retain strict
assertions. Windows worker reduction is only a mitigation for an observed module
load `ERR_NO_BUFFER_SPACE`, not proof of its root cause or the earlier retained
renderer symptom. The retained-renderer regression and SVG gutter checks passed
in the successful Linux/Windows matrix. The detailed local history below records
what was known at each earlier stage; earlier pending statements are historical.

A fresh build of the same feedback SHA was embedded in a separate Windows 11 /
Tauri 2.12.1 / WebView2 156.0.4314.58 stand at 150% DPI. Two standalone launches
passed 46/46 programmatic checks each, with clean exits. The maintainer subsequently
reported that the manual interactive check passed. This is bounded host acceptance,
not complete physical keyboard/pointer, native IME, screen-reader or mixed-monitor
certification; see [Native acceptance](NATIVE_ACCEPTANCE.md). macOS remains unverified.

## Recorded baseline: 18c65890435e1bae97af262a20ced705e0e49e4f

A fresh Git clone with a new npm cache passed npm ci; npm test (688 units,
syntax/API/boundaries and installed TS/JSDoc consumers); all three bundle builds;
package/bundle checks; pack-byte comparison (468 files); installed browser/model
consumers; and source/package/portable newcomer flows. Chromium/WebKit bundle-font
checks passed 16/16. Existing matching browser binaries were reused; a clean OS or
browser download was not tested. This result is an actual clone, not git archive.

The imported snapshot's original bytes are preserved using -text attributes.
Do not weaken provenance checks or regenerate import hashes to hide line-ending changes.

A separate genuine Windows Tauri/WebView2 stand passed 19/19 programmatic checks
in each of two EXE launches. Synthetic DOM events, native window probes and the
author's bounded manual DnD observations are described in NATIVE_ACCEPTANCE.md.
This does not claim complete physical input/IME accessibility acceptance.

The separate source-only [minimal Tauri example](../examples/tauri-minimal/README.md)
passed its own Windows standalone smoke 7/7 with WebView2 156.0.4314.58 and two
fresh-profile clean exits. Those are programmatic/synthetic Form/echo/assets
checks, not native human-input certification.

## Immutable full run: 18c65890435e1bae97af262a20ced705e0e49e4f

The unmodified snapshot passed 688 units, full Chromium 701/701 (32 workers),
WebKit compatibility 444/444 (one worker), all-engine bundle/font 24/24 and
build/package/boundaries/installed TS/JS/browser-consumer checks. Firefox
compatibility was **443 passed / 1 failed**, not a green full gate. The failed
ScrollingLabel geometry read crossed fallback-to-Noto font/layout delivery.
The unchanged isolated test passed 5/5; this does not overwrite the failed run.
Controlled delayed-font diagnostics reproduced the exact 63.2px mismatch for one
frame and the subsequent ResizeObserver correction at the original tolerance.

Tools: Node 22.14.0, npm 11.8.0, Python 3.13.2, Playwright 1.61.1, esbuild 0.28.2
and TypeScript 5.9.3 on Windows 11. Chromium 149.0.7827.55, Firefox 151.0 and
Playwright WebKit 26.5 used existing matching binaries outside the execution
sandbox; no browser/security settings changed.

## Integrated candidate: results and remaining loading blocker

Test input is the exact 868-file snapshot SHA-256
`cafe11276a76ba8378d303d00c3fd33d1904d94b5229914d194414f69d0335a8`,
based on 18c6589 plus an uncommitted overlay; it is not the immutable 18c gate.
Runtime/declarations/scripts/lockfile/provenance did not change. The ScrollingLabel
test waits for font/layout readiness, keeps the original strict assertions and
adds an explicit delayed-font regression.

| Check on that input | Result |
| --- | --- |
| Unit/API/syntax/boundaries/installed TS-JS types | Passed; 688 units |
| ScrollingLabel, three engines, three repeats | 36/36 passed |
| WebKit compatibility, one worker | 445/445 passed |
| Firefox compatibility, one worker | 444 passed / 1 failed during example startup |
| Full Chromium, 32 workers, initial and repeat | Each 701 passed / 1 startup failure |
| Full Chromium, 8 workers | 700 passed / 2 module/startup failures |
| Three-engine bundle/font | 24/24 passed |
| Separate installed TS/JS/browser consumer | Passed; 476 exports |
| Build/bundle/pack/local release checks | Passed; 484 package members verified |
| Exact affected Chromium cases, one worker | 12/12 passed |
| Exact affected Firefox case, one worker | 5/5 passed |

The full Chromium failures included local module loads aborted with
`ERR_NETWORK_CHANGED`; transfer/theme test actions had not started. Firefox's
failed beforeEach waited for the TreeGrid example before any move callback. The
original failed runs/traces are retained; the isolated passes do not turn those
full gates green. A safe loader-only investigation passed 192 sequential and 256
parallel ESM starts across Python/Node HTTP/1.1 servers. A longer module/font probe
passed 447/448 with a separate `ERR_NO_BUFFER_SPACE` failure; that different error
is not asserted to explain the original network reset. The original trigger is
still unconfirmed. No OS/network/security setting or test assertion was changed.
No full green matrix or remote CI result is claimed for this candidate.

The independent original docs-only consumer passed A 8/8 and B 15/15 with a clean
browser log and no implementation-source access. Two consumer-code corrections
were needed; no runtime defect was confirmed. The three identified public-doc gaps
were corrected: control-specific pre-mount composition, silent selection pruning
and TreeGrid move API. The same consumer's address-specific docs recheck closed
all three; this was not a new blind/browser run. Original A/B evidence was preserved.

This result/status summary was added after the matrix. The sealed test input was
not edited. This documentation-only update is checked separately for diff, links
and package contents, and is not represented as a new full browser run.

Historical Windows parallel WebKit/Firefox runs had timeouts; sequential passes
are recorded separately and never rewrite those failed runs as passed. Use one
worker for those engines on Windows. Playwright's patched browser build is distinct
from a user's installed stock browser. Codex execution-sandbox process restrictions
are not fixed by changing browser/OS security settings.

## Unverified

- macOS (planned after GitHub publication), Linux and other native hosts.
- Real IME, screen readers, mixed-DPI/monitor behavior and native file/clipboard flows.
- Complete physical-input/native coverage beyond the bounded Windows checks.

Detailed local investigation logs are maintainer evidence, not machine-specific
setup instructions. Public users should use README and the repository-local commands.


## Historical local feedback stabilization, 2026-11-01 (before branch publication)

Work is isolated on `codex/feedback-stabilization`, based on public rc.1 commit `7e4b2983bcac5c640de250bc7fa1b17d8e6d369e`. The published commit/tag, canonical checkout, original imported provenance, and Reader/vendor pin are not changed. Package version remains 0.6.0-rc.1; this is not another published candidate.

The Date-sort regression fails on rc.1 before the timestamp correction. Preliminary checks after the correction passed 41 unit cases and two mounted timezone cases. Checked integration recipes passed 14 Chromium, 14 Firefox, and 14 WebKit cases, plus strict installed-package NodeNext/Bundler consumers. Independent source review found no confirmed issue in Date-pair handling or SVG menu geometry/dependencies.

Bounded renderer checks on an experiment-local Node24.22.2 passed 6/6; the original loaded CI failure is still not reproduced. Focus/SVG diagnostic checks passed 6 Chromium, 4 Firefox and 4 WebKit cases with strict assertions.

The settings icon is now SVG rather than a font glyph. Local light/dark pixels and strict geometry/focus assertions are checked on Windows; Linux rendering is pending CI. Windows Node24 retained-renderer and Linux WebKit Switch callback-focus failures from rc.1 are preserved as unresolved historical failures. The local retained-renderer check passes, but the original trace shows scroll changed while the rendered window stayed unchanged; it does not prove a model mutation or a stale retained cell. The original focus trace fails on Switch after checkbox succeeds. New stage/event-order diagnostics retain the strict behaviour assertions. No speculative runtime workaround or blanket network/infra explanation is applied.

Final aggregate results for one sealed source inventory are recorded separately under the feedback implementation experiment, including commands, versions, hashes, failed/not-run checks, and source preservation. Browser tests do not certify native IME, macOS, or all WebView hosts. W4 API/default proposals and unconfirmed heap/paint symptoms remain deferred.


The first aggregate input (`d0761e74a382a57bddbe9749295c831915842adc9d94b947c62a55d0d2164baa`) passed 692 unit tests and installed types, but Chromium finished 714/717. Two failures were a newly added diagnostic line accidentally placed in the neighbouring explicit-refresh fixture (`visible` was out of scope); that harness line was removed without changing assertions or runtime. The third failed before TrackBar creation while importing modules, with recorded `net::ERR_NETWORK_CHANGED`. This establishes a loading failure for that case, not its underlying OS/network cause. The failed snapshot/traces are retained; the corrected harness requires a new immutable input and the first result is not counted as a green aggregate.


CI feedback branch, first push `39b4a2ade115f2042680ca0d964f5a2a75ca5d39`, run41367710193: Ubuntu/Node24 passed692 units but finished716/717 Chromium. The new Date DOM test read immediately after synchronous model sorting, before the scheduled animation-frame paint. Its failure screenshot already shows the correct descending order; the saved assertion captured the earlier ascending DOM. The follow-up test adds immediate strict model-order checks and bounded Playwright polling for the same exact DOM arrays after sort/schema changes. No runtime/asserted order or global timeout is changed. Original failure ZIP/trace/screenshot is retained outside the source; this is a new commit rather than an in-place rerun. Other first-run jobs and the follow-up SHA are recorded separately in the CI work report.

The same first run on Windows/Node24 finished716/717: `ERR_NO_BUFFER_SPACE` loading workbench.js during beforeEach, before the tested schema/removal actions. This differs from the historical retained-renderer assertion and from ERR_NETWORK_CHANGED. HTTP/1.1 reuse was already enabled. The follow-up budgets Windows CI to2 browser workers (all717 cases retained) as a conservative transport-resource mitigation; the underlying runner buffer exhaustion cause is not proven. Local default32/cpu cap, Linux workers, assertions and OS/network/security settings remain unchanged. Windows/Node22 and Ubuntu/Node22 first-run jobs passed; exact run conclusions are preserved in the external CI report.

The first Linux compatibility job finished1376/1380. Two failures repeat Switch application-focus loss. The event-order attachment shows visual-click fallback focusing the input before the forwarded input handler chooses its application button. The adapter now runs fallback only on actual input clicks after target handlers. WebKit HTMLLabelElement forwards the click and then focuses the input (upstream Source/WebCore/html/HTMLLabelElement.cpp). For Switch cell editors the adapter cancels label forwarding and activates the same native input once, so that late label-default focus cannot override the application callback. No manual boolean write, timer or new API is introduced. Standalone Switch remains native. A deterministic negative visual-phase plus positive input-fallback regression failed2/2 before the change and focused checks passed4/4 after it; independent review found no blocking issue. Full Linux confirmation remains pending on the follow-up SHA.

The other compatibility failures are the same pre-paint Date DOM read (fixed as above) and Mapper's immediate null boundingBox before port paint. The Mapper failure screenshot already has the port visible; its fixture waited for a connection path but not port geometry. It now bounded-polls for a nonzero port box before pointer injection, retaining the drag/cancel/filter assertions. No Mapper runtime change. The bundle step was skipped in the failed first compatibility job and is not counted as a pass.

Primary source for the platform label ordering: https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WebCore/html/HTMLLabelElement.cpp . The CI trace records application focus, input click/change, then a final input focus; the implementation delegates activation rather than trying to restore focus afterward with a timer.


Follow-up `c8b8657215c0361dedd9fbe6b8ee15f643bb9ada`, run41372754653: all four Windows/Linux Node22/24 jobs and performance passed. Linux compatibility passed1385/1386; the earlier Switch application-focus, Mapper and Date failures passed. One Grid keyboard fixture sent Escape after Shift+Tab as soon as the new input value appeared, without awaiting the separately scheduled activation focus. Trace snapshots show the new editor not focused at that point and focused later, still open after Escape. The next fixture revision requires input focus after every reopen before global keyboard injection. Cancellation, boundary-focus and value assertions are retained and strengthened; runtime and timeouts are unchanged. The failed second-run trace/ZIP is preserved separately and its CI bundle step was skipped.
