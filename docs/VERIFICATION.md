# rc.7 native caret audit follow-up - 2026-11-10 (UTC)

The first portability follow-up `9ea50f9548b22a8a7b17c7f64efeb7a18996d19e`
passed all four Windows/Linux Node jobs, performance, Linux compatibility
(3308 passed / 16 existing clipboard skips), and its 42 bundle cases in
[PR run 42722365084](https://github.com/edward-ap/taet-ui/actions/runs/42722365084).
macOS passed all 1305 Chromium cases, including the repaired documentation
journeys. Its Firefox/WebKit compatibility then exposed eight End-key fixture
failures: two deletion journeys, both raw modes, both engines. That gate finished
2192 passed / 8 failed / 16 existing skips; later macOS bundle/release steps were
skipped. The [second failure artifact](https://github.com/edward-ap/taet-ui/actions/runs/42722365084/artifacts/13724955203)
is preserved rather than treating the first fix as a complete macOS pass.

Both deletion traces passed their initial value/caret checks before sending End.
The test incorrectly assumed End moved the caret to the final character. macOS
End is not guaranteed caret movement; Playwright maps it to document scrolling.
Controlled Chromium replay of that command
on Windows reproduced all four raw-mode/scenario symptoms: Backspace at caret 0
left `34:` unchanged; Delete at caret 2 changed `12:4` to `12:`. Explicit keyboard
Select All then ArrowRight established the final caret and restored the original
strict expected outcomes. This replay is not native macOS certification.

The two masked setups now assert full selection and final caret explicitly.
A complete browser-spec Home/End audit found four more native-caret setup calls:
three NumberInput draft appends and one ScrollingLabel drag-selection setup.
They now use Select All plus the appropriate arrow. Each number append must show
`1.0` before API/reset/clear; the drag setup checks caret 0 and horizontal scroll 0.
All original deletion, value, event, pointer, layout and teardown assertions stay.
Home/End remains unchanged where it exercises component-owned grid/tree/list/tab,
select-popup, radio or slider navigation, or editor/grid keyboard isolation.

No runtime source, API, timeout, worker budget or skip is changed. A preliminary
macOS three-engine run of the four affected specs now catches this class earlier;
every full test:all, compatibility, bundle, pack and release gate remains afterward.
Local focused verification and the final commit's complete CI must pass before publication.
Neither this report nor a Windows command replay turns a failed macOS gate green.

---

# rc.7 macOS documentation-fixture correction - 2026-11-09 (UTC)

The first rc.7 CI input was `270c9c6770827caf995de7f15d8170d63800e6fc`,
[run 42717928687](https://github.com/edward-ap/taet-ui/actions/runs/42717928687).
Its macOS Chromium suite finished 1304 passed / 1 failed. The failure was the
positional-mask documentation journey after focus, Home and typing X; the value
remained `__-1234`. Later macOS compatibility/bundle gates were skipped, not passed.
The original [failure artifact](https://github.com/edward-ap/taet-ui/actions/runs/42717928687/artifacts/13719258057)
is retained as historical evidence.

Playwright 1.61.1 maps macOS Home to `scrollToBeginningOfDocument`, not caret
movement. TextField leaves that native key behavior intact, and a positional mask
correctly rejects insertion beyond its final slot. A controlled Windows Chromium
replay of that macOS editing command on a scrollable page reproduced the unchanged
masked value with the caret at the end; a bare input retained the same caret and
accepted a trailing X. This is command replay, not a native macOS run. The original
trace does not record selection offsets, so no exact failed-run caret is claimed.

Both documentation journeys now use Ctrl/Cmd+A followed by ArrowLeft and assert
selection `[0,7]` then `[0,0]` before the unchanged sequential X/Y typing. Their
value, raw-value, Form, completeness, required-validation and teardown assertions
are preserved. The complete four-test documentation spec is now also in the
three-engine compatibility gate. No runtime, API, timeout or skip is changed.

Focused Windows verification passed 36/36: all four documentation tests, three
engines and three repeats, one worker. Independent source review found no blocker.
The follow-up commit still requires its complete remote CI, including actual macOS,
before publication. This correction alone does not declare rc.7 published or the
original failed run green. npm remains intended for `next`; `latest` is unchanged.

---

# rc.7 publication preparation - 2026-11-09 (UTC)

This candidate collects the accumulated input-editing and strict owner-validation
work on top of `0ca41c6836e3a6e4e0b9f87a3d968ec55ef74d65`, previously published
as rc.6. The full scope and breaking custom-editor migration are in CHANGELOG.md.
NumberInput live mode, compact masks and existing API maturity remain the defaults;
commit mode and positional slots are opt-in.

Release inspection matched all 302 live source files against the approved final
source freeze below. A separate review of production changes, declarations and
focused regressions found no confirmed release blocker. All pre-existing local
changes were preserved. Git metadata is now readable and was verified against
origin/main without changing Git trust settings or repository ownership. The
source-provenance script no longer overrides safe.directory.

The completed Windows technical aggregate below remains evidence for that source
freeze: 1348 units, 1305 Chromium cases, 3296 compatibility passes with 16 explicit
clipboard skips, 42 bundle cases, installed TS/JS/browser consumers and 15 clean /
15 intended mutant outcomes. Its documentation-only repack subsequently completed
with 502 package entries; the pending wording below records the earlier writing
stage and is not the current repack status.

Release metadata advances to 0.6.0-rc.7. No runtime source is changed by this
preparation. Normal Git text normalization may replace CRLF with LF for text
files; imported/candidate bytes governed by .gitattributes remain preserved.
A fresh clone, package inspection and the exact release commit's full GitHub CI
are required before npm publication; earlier aggregate passes do not substitute
for that final CI. Registry metadata separately confirms publication outcome.

The macOS job's overall budget is increased from 30 to 90 minutes to accommodate
the expanded 1305-case Chromium and 1104-case-per-engine compatibility matrix.
Its two-worker limit, individual test timeouts and assertions are unchanged.
No new native IME/clipboard, accessibility, DPI or host certification is claimed.
Large-form currentness costs and other boundaries below remain applicable.

The intended npm channel is next; latest and all existing versions/tags remain
unchanged. This preparation does not create a GitHub release or release tag.

---

# Editor validation currentness - final local verification, 2026-11-09 (UTC)

**The technical aggregate passed on the approved source freeze.** Original
`test:all` passed at 21:25:29.863Z; the corrected remaining-gates continuation
passed at 22:19:04.697Z. These are two explicitly linked runs on the same input,
not a claim that the original overall runner passed. This is local Windows
verification on SANDRA, version 0.6.0-rc.6, not publication or remote CI.

## Implemented and reviewed scope

- Form retains an explicit child `ok:false` even with empty diagnostics. Accepted
  value, pending-candidate and supported membership revisions reject stale
  validate/isValid/submit attempts, including silent A -> B -> A changes.
- EditorControl subclasses retain the inherited value pipeline. Independent
  custom fields/editors require a pure synchronous `getValidationRevision()`
  stored number, bigint or symbol covering accepted-value and candidate changes.
  Missing, invalid, unstable or throwing readers fail closed. A changed valid
  token interrupts the attempt rather than fabricating an ordinary field error.
- Grid/TreeGrid guard preparation, validation and final value reads against stale
  values/candidates/sessions. Trusted beforeCellChange overrides remain supported
  without revalidation. PropertyGrid staged/inline saves reject stale work; only
  a still-current ordinary inline veto restores the previous field value.
- Callback and method-accessor lifetime checks stop obsolete phases after destroy
  or replacement. Protocol errors and stale attempts have separate editReject
  diagnostics. Callback changes remain: no rollback, automatic retry, fallback
  acceptance or global transaction guarantee. NumberInput commit mode remains
  opt-in; live default, positional masks and partial-time behavior remain intact.

Contracts: [editing](EDITOR_EDITING_CONTRACT.md),
[custom fields](INPUT_TYPES.md#custom-fields-in-strict-form-validation),
[table currentness](GRID_EDITOR_TYPES.md#validation-currentness-and-custom-revisions),
and [Form mutations](MUTATIONS.md).

## Sealed input and preservation

The approved source-freeze file SHA-256 is
`72bd0661d2db780def895b800570753d95b539982e7071b74be4978f05c1a6c7`;
302 source files have ordered-tree SHA-256
`4285d07152eff09096a2e0eb1bb48bf62f7b29b26ab5b28413a3075a696653cf`.
The tree recipe is SHA-256 of UTF-8 JSON.stringify(freeze.hashes), retaining key
order. Final run-after evidence and a subsequent read-only comparison matched all
302 live files. Candidate/import manifest hashes stayed unchanged throughout the
sealed aggregate; no source drift was detected. The earlier baseline had 300
files; exact added/changed/preserved inventories are in the machine-readable
summary. No commit, push, publication, security-setting change or Git ownership
bypass was performed.

Previously saved HEAD is 0ca41c6836e3a6e4e0b9f87a3d968ec55ef74d65.
Git commands are unavailable under dubious ownership; source provenance honestly
records revision null/state not-versioned. This is not proof of a clean Git tree.
The independently reviewed provenance correction removed the safe.directory
command override only: 9/9 focused tests and syntax passed; script SHA-256
`4dde6f0c82c4c088ca8aaebdeb97ef425103de74f732cabd8e2b188a9175eb61`.

Tools: Node v22.14.0, npm 10.9.2, Playwright 1.61.1, TypeScript 5.9.3,
esbuild 0.28.2. Matching browser metadata: Chromium/headless shell 149.0.7827.55
(revision 1228), Firefox 151.0 (1532), WebKit 26.5 (2311).

## Completed commands and results

Evidence root is `test-results/editor-contract-final/`. Original run is
`final-20261109-node-02`; corrected direct-argv run is
`final-20261109-continuation-03`. Full actual argv, timestamps, exit codes,
stdout/stderr and input checks are retained in each runner-status/exit JSON and
logs, and indexed by `summary.json`. Output paths below refer to the corrected
run directory; no shell literal quotes were passed in its argv.

| Gate / actual command family | Completed result |
| --- | --- |
| `npm.cmd run test:all` (original run; workers 2, port 5360) | Exit 0; 1348/1348 units, zero skips; syntax 587 files; API/package checks (302 resources, 43 imported and 48 candidate entries); installed NodeNext/Bundler TS and JS consumers; fresh build; Chromium 1305/1305; installed browser consumers, 476 runtime exports |
| `node scripts/run-browser.js --config playwright.compat.config.js --workers=2 --retries=0 --reporter=line,json --output <compat-output>` (port 5361) | Exit 0; 3312 scheduled, 3296 passed, 16 explicitly supported clipboard skips; zero failures, unexpected, flaky or global errors; one attempt per case |
| `node <npm-cli.js> run test:bundle -- --workers=2 --retries=0 --reporter=line,json --output <bundle-output>` (port 5362) | Exit 0; 42/42, 14 per engine; zero skips/unexpected/flaky |
| `node <npm-cli.js> run test:input-regression` | Exit 0; 15 baseline passes plus 15 intended mutant failures; mutation proof passed in a temporary snapshot, checkout unchanged |
| `node <npm-cli.js> pack --dry-run --json --ignore-scripts` | Exit 0; package inventory inspected |
| `node <npm-cli.js> pack --json --ignore-scripts --pack-destination <run-directory>` | Exit 0; 502 entries; all 302 frozen source files match; forbidden content absent |
| `node <npm-cli.js> run release:check` | Exit 0; local release prerequisites only, not publication or security certification |

`<npm-cli.js>` was `C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js`.
Windows WebKit remained capped at one worker. Overlapping original/continuation
browser work stayed within four workers; later bundle/mutation gates were sequenced.

Raw compatibility JSON was independently traversed, rather than trusting the
runner's pass flag: Chromium 1104 passed; Firefox and WebKit each 1096 passed and
8 skipped. Each non-Chromium engine skips exactly four input-isolated-clipboard,
two masked-editing-regressions and two masked-slots-editing cases. These require
the reviewed Chromium headless-shell in-memory clipboard; no OS clipboard
permission or real clipboard acceptance is implied. The final
editor-invariant-contract matrix itself is **142/142 in each engine, 426/426**,
zero skips and no retries. It is an actual final run, not a sum of older checkpoints.

The main aggregate archive was 1,816,956 bytes with 502 entries. It contains the
prior checkpoint version of this document. This final documentation-only
consolidation follows the browser gates and does not claim another browser run.
A separate post-documentation repack/check records the final archive identity,
packaged document hash and unchanged source evidence in the machine-readable
summary; the final archive hash is intentionally not embedded in its own contents.
At this section's writing that repack is pending, separately from the completed
technical gates. No archive has been published.

## Regression history retained, not reclassified

- Focused adapter units passed 234/234. Pre-fix lookup and prepare/focus regressions
  failed on their intended assertions (9 and 2); six final lifetime browser cases
  failed 6/6 before the fix and passed 18/18 across engines after it.
- Earlier full units 1284/1284 and 136-case-per-engine invariant matrix 408/408
  are superseded checkpoints, not the final totals and not extra independent journeys.
- An interrupted table-diagnostic fixture produced five Chromium failures by
  incorrectly assuming Form-style paths. The correction checks exact offending
  source identity, code, severity and owner context. Original log and list-only
  inventory remain; the latter is not completed execution evidence.
- The earlier original test:all attempt was interrupted with unknown exit status,
  not classified as a crash or failed test. The subsequent PowerShell launcher
  was blocked because script execution was disabled, before runner/gates started.
  No policy bypass was used. The user then approved the direct Node alternative.
- Original Node runner `final-20261109-node-02` ended **failed**, exit 1,
  21:25:30.039Z, solely because compatibility output-path quoting caused ENOENT
  before any test executed. Its successful test:all is reused; the failed launcher
  is not relabeled green. Corrected continuation used direct argv, the same source
  freeze and original auxiliary baseline, and finished all remaining gates.

Earlier logs, red/green evidence, interrupted/blocked records and terminal runner
JSON remain available in local evidence; summary.json retains their exact pointers.

## Form validation performance: measured improvement and remaining cost

Independently reviewed Form SHA-256:
`81813fc9fc079b13cfdcb53955f37016a9766b94babb2b4796129301580e485a`.
Live focused checks passed 266/266, zero failures/skips. The optimization retains
full fresh currentness traversals, metadata lookup order and internal/public/internal
checks at each boundary. It reuses operation-local traversal storage, removes
redundant Set/result allocation and sets/restores captured reader guards once per
phase. It does not cache topology/revisions or defer checks until the end.
The faster unsafe traversal-cache prototype was rejected; its timings are excluded.

The retained `form-optimization-evidence/REVIEW_REPORT.md`, `benchmark.mjs`,
`benchmark-results.json` and manifest contain full methods, hashes and raw samples.
`node benchmark.mjs` used Node v22.14.0 / V8 12.4.254.21-node.22, win32 x64,
no document, current matching dependencies. Only validate was timed: construction,
composition, result assertions and teardown excluded. Each variant had 20 global
warmups of 50 fields, then 5 warmups and 11 samples per case, alternating variant
order. Reviewer tests were paused; no broad suite was launched by the experiment,
but unrelated machine activity was not globally inspected.

Median milliseconds, strict reference -> optimized (optimized p90): plain 100
fields 5.077 -> 3.947 (4.442); plain 300 54.438 -> 38.501 (42.180); plain 600
220.842 -> 150.217 (168.546); nested 600 653.514 -> 247.658 (269.294).
At 600 fields: stable validators 209.491 -> 159.503; public hooks
259.111 -> 185.427; independent custom fields 245.209 -> 199.981; early silent
ABA 1.991 -> 1.627. Plain 600 range was 148.674-173.213 ms; nested 600
228.400-270.709 ms. Plain 1-field median was 0.023 -> 0.024 ms: no universal
speedup is asserted. Full distributions and other sizes remain in the JSON.

The pre-strict Form-only baseline measured plain 100/300/600 at
0.180/0.633/1.445 ms with current dependencies, but lacks strict proof: it is
neither a historical complete build nor a security-equivalent alternative.
Dense flat scans remain quadratic. These unmounted Node measurements are not
browser/mounted-control SLAs. No wall-clock thresholds were added to tests.

## Boundaries and final documentation

Cooperative hooks cannot prove hidden alias/closure mutations. Supported membership
tracking does not cover private mutations or direct identity replace-and-restore.
Currentness is bounded tracking, not rollback, retry or transaction isolation.
There is no new certification of real OS IME/clipboard, physical keyboard layout,
screen readers, mixed-DPI behavior, macOS/Linux or native WebView hosts.

This section replaces only this task's accumulated progress prefixes. The entire
97,527-byte pre-task history below, beginning with positional masks/partial time,
is preserved byte-for-byte (SHA-256
`de085f3658e4e53cd5e2360523e1abcd6f7728b12bfefe1c8e3d0fb4ec536ab0`).
Exact before-edit backups and the current document hash are retained in the summary.

---

# Positional masks and partial time - 2026-11-09 (UTC)

User-approved local continuation on SANDRA/Windows, same main HEAD
0ca41c6836e3a6e4e0b9f87a3d968ec55ef74d65 and version 0.6.0-rc.6. Previous
uncommitted NumberInput, TextArea, compact mask and temporal repairs are retained.
No commit, push or publication. These changes supersede the partial-time and
compact-only mask limitations recorded in earlier verification sections.

## Implemented and reviewed contract

- TextField/TextInput and gridEditors.text accept opt-in maskMode: 'slots'. The
  default remains compact. Slot positions never shift: deleting AB from AB-1234
  produces __-1234; typing X then Y produces X_-1234 then XY-1234. Positional holes
  survive string value/raw serialization, Form import/reset and Grid/TreeGrid
  commit/reopen. Raw retains the existing alphanumeric-literal convention.
- Entirely empty token data produces empty model/raw/getDisplayValue strings.
  While focused, only the native DOM shows a navigable scaffold. Focus/blur does
  not change model, dirty state or history. Required native validity uses an owned
  customError for that scaffold, rather than valueMissing; checkValidity remains
  false. Blur restores native empty valueMissing. External custom errors survive;
  ownership cleanup is deferred while readonly/disabled bars validation messages.
- Slot mode validates its placeholder marker and positional API strings. A marker
  must be one printable ASCII punctuation character absent from mask literals.
  Malformed marker-bearing API strings reject before mutation. Fixed-position
  overwrite/paste limits protect unselected data. Existing local history, veto,
  API/silent/reset, reentry, teardown and synthetic composition guards remain.
- Slots is not promised for NumberInput, TextArea, SelectInput or JSON factories.
  No new owner runtime, parser grammar, locale behavior or deferred commit API.
  NumberInput remains the only field with updateMode/commitInput support.
- Partial/unrecognized TimeInput text, such as 1:, remains unchanged during passive
  formatting in every hour mode. Incomplete picker values no longer highlight a
  fabricated hour/minute/AM/PM selection; 24 can still indicate presentation mode.
  Explicit AM/PM, wheel and step actions retain existing completion behavior.
  Cancel restores partial text; OK without a value choice does not complete it.
- required() still means nonempty, not complete. Existing validators express
  optional completeness; combine one with required() for mandatory fields.
  required:true remains a state/native attribute, not an installed library validator.

Independent review checked exact pre-change runtime backups, narrow declarations,
roundtrips, native-validity lifecycle, tests and all four edited documentation files.
No blocking findings remained before the aggregate gates. Detailed contracts and
examples are in INPUT_TYPES.md, INPUT_TESTING.md, GRID_EDITOR_MATRIX.md and the
InputControls documentation page.

## Reproductions and focused verification

- Before the temporal fix, the browser baseline passed 0-23 but correctly failed
  1-24 and 12-hour blur assertions (1: became 01: / 01: AM). New unit reproductions
  also failed on the intended display and picker-highlight assertions.
- Temporal units: 25 new plus 48 existing, 73/73 passed. Browser gate: 450/450 in
  5.0 minutes, 150 per engine, including 29 new journeys, 116 previous editing/owner
  journeys and five lifecycle tests per engine; no retries.
- Before slot implementation, 11 initial unit cases and both raw/formatted browser
  prefix-deletion cases failed on intended assertions. Slot units: 25 new plus
  30 previous compact tests, 55/55 passed, including 264 positional roundtrip inputs.
- New slot browser files contain 37 journeys / 111 selected engine executions.
  Initial sweep: 104 passed and four explicit clipboard skips. The added native
  validity lifecycle passed 3/3. All final cases are included in the aggregate below.
  Empty-scaffold navigation is browser-tested; late caret restoration after undo
  is separately unit-tested. No broader caret certification is inferred.
- Focused offline installed-package consumers passed: strict NodeNext/Bundler,
  positive text constructor/editor types and negative unsupported-editor options,
  real-key edits, formatted/raw holes, JSON/API roundtrip, completeness and prior
  compact/numeric/temporal checks. Source hashes matched the reviewed freeze.
- New specs use the shared page-error fixture and input-editing tag; all three are
  required by the matrix guard and selected in the 77-spec compatibility allowlist.

Focused artifacts: test-results/partial-time-red-20261109.log,
partial-time-final-three-engine-20261109.log, partial-time-consumers,
mask-slots-red.log, mask-slots-initial.log, mask-slots-validity.log,
mask-slots-verification.md and slots-consumers.

## Aggregate gates

- Fresh full/components/foundation build passed before browser runs.
- npm test passed: 573 syntax files, API/package/provenance guards, 908/908 units
  with zero skips, installed strict TS/JS consumers, TypeScript 5.9.3 and 476 runtime
  exports. The subsequently edited documentation spec also passed node --check.
- Full default Chromium final rerun passed: 1163/1163, no skips or failures,
  26.2 minutes, two workers, port 5302; output slots-partial-time-full-chromium-final.
- Full compatibility matrix passed: 2870 passed, 16 explicit clipboard skips,
  no failures, 48.1 minutes, 77 selected specs across Chromium/Firefox/WebKit;
  four global workers with the Windows WebKit one-worker cap, port 5301. The eight
  clipboard cases are skipped on each engine without reviewed OS isolation.
- Installed browser type consumers passed, including slots/partial-time real-key
  cases, previous compact/numeric behavior and all nine built-in editor consumers.
- Bundle/provenance/assets/exclusions/77-documentation-import guard passed; all
  42 bundle browser tests passed across three engines in 47.6 seconds, two workers.
- Historical decimal mutation proof passed: 15 clean baselines and all 15 expected
  decimal-assertion mutant failures across three engines. Checkout unchanged;
  isolated proof snapshot taet-input-regression-HeQmEL under the OS temporary directory.
- Final offline package dry-run passed: 498 files, version 0.6.0-rc.6; no dist,
  node_modules, test, browser-tests or test-results entries. Final read-only API
  and package-boundary guards passed again.

The initial concurrent four-worker full Chromium attempt had 1159 passed and
three failures in 13.1 minutes: two outdated documentation test assumptions after
adding the slots example, plus ERR_NO_BUFFER_SPACE while opening one local
clipboard fixture. Documentation assertions are now scoped to the proper example,
require all 31 snippets, and include a new exact slots example test. Focused docs
passed 4/4; both clipboard variants passed again with one worker (17.4 seconds).
The entire Chromium suite then passed with two workers; runtime was not changed
for these corrections. Initial and final logs are retained separately.

The test:all stages were run individually, without a redundant wrapper invocation.
Browser ports/outputs are distinct; Windows WebKit remains capped at one worker.
Aggregate logs and machine-readable results are under test-results/slots-partial-time-aggregate.
Overlapping executions are not independent user-journey counts.

## Preservation and remaining limits

Runtime changed only in TextField.js and DateTimeInput.js; declarations changed in
TextInput.d.ts, display-contracts.d.ts and grid-editor-options.d.ts. The other 295
source/resources match the saved pre-continuation snapshot. NumberInput/TextArea,
package version/dependencies and immutable imported provenance are unchanged.
Only the reviewed grid-editor-options.d.ts candidate hash was refreshed; the other
46 candidate hashes and previous owner integration are preserved.

Frozen runtime SHA-256:
- TextField.js: 4d156b34c5bf543ee05461d5f027a0fffd0df6e90a0a3e018be4dda0d7dacac0
- DateTimeInput.js: a2f80a330cc34bc1e239974c2a1a898b81415674c5ed79686205c7137742b235

No real OS IME, physical-layout, native macOS WebView, context-menu undo or system
clipboard certification. Clipboard gestures use only the reviewed isolated Chromium
headless backend; unsupported isolation on other engines is explicitly skipped.
Compact behavior and ASCII token grammar remain unchanged. Switching existing
saved compact data to slots is opt-in and requires the same mask/marker settings
when restoring positional values. Full calendar/time validity, ranges and business
rules still require explicit validators; permissive normalization is not validation.

---

# Mask and temporal native editing repairs - 2026-11-09 (UTC)

User-approved local continuation on SANDRA/Windows, main HEAD
0ca41c6836e3a6e4e0b9f87a3d968ec55ef74d65, version 0.6.0-rc.6. Existing uncommitted
NumberInput live/commit, TextArea and test work is preserved. No commit, push or
publication. Runtime changes in this package are limited to TextField.js and
DateTimeInput.js; public declarations and dependency versions are unchanged.

## Corrected behavior and scope

- Masked native edits retain token-relative caret/selection, delete token data
  around literals, and can be undone/redone through bounded control-local history.
  Rejected input with no accepted token data stays empty rather than manufacturing
  a literal-only value. This no-token-empty correction also applies to API
  normalization; required() remains a nonempty check, not completeness validation.
- Mask operations that would lose an untouched incompatible or over-capacity
  suffix are rejected with original value/selection. The approved compact string
  model has no sparse slots. Replacing a mixed prefix with several sequential
  keys may be rejected at an unrepresentable intermediate state; replace one
  position at a time or supply a complete compatible replacement together.
- Mask history is one accepted edit per step, capped internally at 100 entries.
  Accepted API/clear/reset writes, including equal/silent writes, start a new
  history. Veto preserves it. Ordinary text and NumberInput native history are
  not routed through this mask history implementation.
- TimeInput retains equivalent/incomplete browser text during typing instead of
  padding the first hour digit into the DOM before the next key. The normalized
  model/events remain live; blur/API/reset/refresh/step/picker behavior remains
  authoritative. Existing lossy clamp behavior still synchronizes visible text.
- User-approved DateInput/DateTimeInput protection rejects insertions that would
  truncate an unselected suffix. Compatible selected replacements work; API
  prefix normalization is unchanged. Fallback input paths restore the captured
  text and selection without publishing the truncated model.
- Explicit nested API write plus beforeChange veto now leaves these editors' DOM
  coherent with the surviving model. Existing outer-wins live mutation ordering
  without veto is preserved; no general nested-write isolation is introduced.
- Synthetic composing events retain the existing live normalized value phases.
  Mask reconciliation preserves rejected selections and tolerates missing start
  events using an inferred prior range. These are not real IME acceptance claims.

Only NumberInput has the new updateMode/commitInput API. No implicit commit is
added to getters, validation or destroy. Form and Grid/TreeGrid owner boundaries
remain distinct from these live fields. See INPUT_TYPES.md, INPUT_TESTING.md and
GRID_EDITOR_MATRIX.md for the exact behavior and limitations.

## Reproductions and focused coverage

Strict pre-fix browser assertions caught mask caret/deletion/undo and literal-only
validation defects (11 failures and one already-passing case), TimeInput
12:34 becoming 01:002:34, and Date/DateTime middle insertion discarding final
digits. They failed on the intended value/selection assertions, not setup errors.
Artifacts: test-results/mask-fix-red, temporal-fix-red, temporal-fix-suffix-red.
Two later synthetic composition unit reproductions also failed before correction.
Independent exact-backup runtime review and documentation review found no remaining
blocking findings after those corrections.

- Added 30 mask and 48 temporal unit tests.
- Added masked-editing-regressions.spec.js and masked-owner-regressions.spec.js:
  77 cases, 231 selected engine executions. The first sweep passed 215 with four
  intentional clipboard skips; the final composition correction passed all 12
  added executions. The full aggregate below covers the final code together.
- Added date-time-editing.spec.js and date-time-editing-owners.spec.js:
  116 cases, 348/348 across Chromium/Firefox/WebKit in 5.5 minutes. Coverage includes
  native prefixes, calendar/clock segment replacement, selection, deletion,
  history, modes, blur/API/reset/veto/reentry, fallback and Form/Grid/TreeGrid.
- Existing masked-input.spec.js retains its assertions and now uses the shared
  pageerror fixture and input-editing tag. The matrix guard requires all four new
  files, and the compatibility allowlist includes them.
- Installed-package consumer checks now use actual masked/temporal keyboard edits,
  not only fill/API writes. Existing checks remain. Offline focused installation,
  strict NodeNext/Bundler compilation and Chromium consumer execution passed.

## Completed aggregate gates

- Fresh full/components/foundation build passed before browser gates.
- npm test passed: 568 syntax files, API/package/provenance guards, 858/858 units
  with no skips, and installed TS/JS consumers with TypeScript 5.9.3 and 476
  runtime exports.
- Full default Chromium: 1096/1096, no skips, 12.4 minutes; four workers, port 5302,
  output test-results/mask-temporal-full-chromium.
- npm run test:types:browser passed, including new mask/temporal keyboard consumers,
  previous NumberInput modes and all nine built-in editor consumers.
- Bundle/provenance/assets/exclusions/77-documentation-import guard passed;
  bundle browser suite 42/42 across three engines, 45.5 seconds, two workers,
  port 5304, output test-results/mask-temporal-bundle. No concurrent rebuild.
- Original decimal regression proof rerun after the shared TextField changes:
  15 clean baselines passed and all 15 isolated unconditional-sync mutants failed
  the required decimal assertion across three engines; checkout unchanged.
- Full compatibility matrix: 2676 passed, 12 explicit isolated-clipboard skips,
  no failures, 47.6 minutes across Chromium/Firefox/WebKit and 74 selected specs;
  output test-results/mask-temporal-compat. Skips are the six clipboard cases on
  each non-Chromium engine, whose OS isolation has not been certified.
- Final offline npm pack --dry-run --json --offline passed: 498 files, version
  0.6.0-rc.6; no dist, node_modules, test, browser-tests or test-results entries.
  Final read-only API and package-boundary guards passed again.

The test:all stages were run separately (npm test, fresh build/full browser gate,
and installed browser types), rather than invoking that wrapper redundantly.
Compatibility uses scripts/run-browser.js --config playwright.compat.config.js
--workers=4, port 5301, and the Windows WebKit one-worker cap. Reports/logs are
under test-results/mask-temporal-aggregate. Overlapping engine executions are not
independent user-journey counts.

## Preservation and explicit limits

The other 298 source/resources match the saved current snapshot. TextField and
DateTimeInput were independently compared with exact pre-change byte backups.
NumberInput, TextArea, package.json and both Grid provenance manifests are
unchanged by this package. No maturity, runtime dependency or exported API changes.

The current runtime hashes are:
- TextField.js: e3dd4bac592dc50df1f6f50242dcb760d71918eb379e6a19e08fc1fd8f66443e
- DateTimeInput.js: 5f24902acae31b2c104a5d14e76746ad9f2dfb070278710d28690307ea893033

Browser results are Chromium 149.0.7827.55, Firefox 151.0 and WebKit 26.5 on Windows,
with Playwright 1.61.1/Node 22.14.0. No native macOS WebView, physical keyboard
layout, actual IME, browser context-menu undo or OS clipboard certification.
Clipboard gestures use only the reviewed isolated Chromium in-memory backend;
unsupported engines are explicitly skipped, not silently simulated.

Mask token grammar, raw alphanumeric-literal convention, optional-position rules
and locale parsing are not expanded. Completeness and real calendar/time validity
still require explicit validators. The pre-existing partial TimeInput model 1:
passes required(); blur displays 01: in 1-24 mode or 01: AM in 12-hour mode while
model stays 1:. An explicit HH:mm validator blocks Form/Grid/TreeGrid saving.
This incomplete-text formatting limitation is recorded, not claimed fixed;
see test-results/temporal-fix-boundary-probe.json. Date min/max text attributes
are not automatic calendar-range validation.

---

# Opt-in NumberInput commit mode - 2026-11-09 (UTC)

Local user-approved continuation on SANDRA/Windows, same main HEAD
0ca41c6836e3a6e4e0b9f87a3d968ec55ef74d65 and version 0.6.0-rc.6. Existing
uncommitted test and TextArea work is retained. No commit, push or publication.

## Implemented boundary

NumberInput now supports updateMode: 'live' | 'commit', with live unchanged as
the default. The opt-in mode retains a native draft independently of the stored
number, explicitly completes or cancels it, and exposes structured commit results,
hasPendingInput and draftChange. API/clear/reset replacement remains immediate.
Min/max, integer and precision normalization use the existing order at commit.
The native number parser and locale/comma behavior are not extended.

Form prepares pending fields before its beforeSubmit snapshot. Grid/TreeGrid and
PropertyGrid use the optional editor prepareCommit phase before validation/read.
Old custom editors without that hook retain their interface. Getters, validation
and destroy never implicitly commit. Blur completes the field, not a table row.
Readonly/disabled pending input is retained and refuses an owner save rather than
silently substituting the old number. See INPUT_TYPES.md and GRID_EDITOR_TYPES.md
for validation, veto, silent writes, cancellation and PropertyGrid inline limits.

Independent current-source architecture review and a separate documentation pass
found no remaining actionable findings. Review closed stale validator results,
recursive commit/validate callbacks, normalization/option errors discarding drafts,
mutable beforeChange payload contamination, and owner teardown/state holes.
Core changes were compared with an exact pre-change backup; owner review used
current sources and existing contracts/tests, not a complete pre-owner byte diff.

## Added coverage

- 46 core and 17 owner unit regressions; existing unique assertions retained.
- 62 real browser journeys in number-input-commit.spec.js and
  number-input-commit-owners.spec.js, selected by the input and compatibility gates.
  They cover standalone, Form, Grid/TreeGrid and PropertyGrid; actual sequential
  prefixes; model/event/dirty separation; Enter/Tab/Escape/blur/API; invalid/veto;
  silent/reset/replacement; spin; reentry, teardown and ownership changes.
- Installed-package TS/JSDoc fixtures use strict NodeNext and Bundler modes,
  execution outside the repository, and a typed browser consumer for both modes,
  Form submission and Grid commit. Existing consumer checks remain enabled.

## Completed checks

- npm run docs:api and the final read-only documentation inventory check passed.
  Runtime export counts and maturity/tier boundaries are unchanged.
- npm test passed: 562 syntax files; API and package boundaries; 780/780 units,
  no skips; installed TS/JS consumers with TypeScript 5.9.3 and 476 runtime exports.
- Fresh full/components/foundation build passed before aggregate browser runs.
- Focused new cases: 186/186 across Chromium/Firefox/WebKit (165 plus 21 final
  additions). Windows WebKit used one worker. The initial PropertyGrid fixture
  was corrected to distinguish an inline editor from an explicit edit session.
- Full default Chromium: 903/903, no skips, 10.4 minutes, four workers, port 5262,
  output test-results/number-commit-full-chromium.
- Bundle/provenance/assets/exclusions/77-documentation-import guard passed;
  bundle browser gate 42/42 across three engines, 45.2 seconds, two workers,
  port 5264, output test-results/number-commit-bundle. No rebuild raced the tests.
- npm run test:types:browser passed, including the new installed NumberInput
  consumer and all nine existing built-in editor consumers.
- Historical decimal mutation rechecked in a disposable source copy:
  15/15 clean baselines passed and all 15 restored unconditional-sync mutants
  failed the expected decimal assertion, across three engines. The checkout
  NumberInput SHA-256 was unchanged throughout this proof.
- Full compatibility: 2101 passed, eight explicit clipboard-backend skips, no
  failures, 36.1 minutes. All 70 selected specs ran across three engines; the eight
  skips are the unsupported Firefox/WebKit isolated clipboard backend, not numeric
  commit or composition exclusions. Output: test-results/number-commit-compat.
- Final offline npm pack dry-run passed: 498 files, version 0.6.0-rc.6; generated
  dist, tests, browser-tests, test-results and node_modules excluded. No publication.

The test:all stages are executed separately: npm test, a fresh build/full browser
gate, and installed browser types. Browser commands use scripts/run-browser.js;
the compatibility gate adds --config playwright.compat.config.js --workers=4
and port 5261, with Windows WebKit capped at one. Logs are under
test-results/number-commit-aggregate; focused reports are number-commit-flows and
number-commit-flows-final-corrected. Engine repetitions overlap other suites and
are not counts of independent user journeys.

## Preservation and limitations

The saved 300-source/resource snapshot differs only in the 15 intended source
and declaration files for NumberInput/TextField and its owners; 285 remain
byte-identical, including the previously corrected TextArea. Only six reviewed
Grid/editor candidate hashes changed; the previous 41 candidate entries and
immutable imported source-snapshot hash remain unchanged. The imported manifest
SHA-256 is 9d32c9bcbbafcce32f04719b4b095b6c8b8bed1230ae7bc47aeff18bc3150d67.

These are local browser results on Chromium 149.0.7827.55, Firefox 151.0 and
WebKit 26.5 with Playwright 1.61.1/Node 22.14.0. They do not certify native macOS
WebView, physical keyboard layouts or a real IME session. Existing synthetic
composition checks and the strictly isolated Chromium clipboard backend retain
their stated limits. Application validators remain a separate phase from numeric
commit; a later owner veto/validation failure does not roll back an already
completed field commit. No new atomic multi-field rollback contract is claimed.

---

# TextArea composing-key guard correction - 2026-11-09 (UTC)

Local continuation on SANDRA/Windows, same main HEAD
0ca41c6836e3a6e4e0b9f87a3d968ec55ef74d65, preserving the two uncommitted test
packages below. The requested runtime change is restricted to TextArea's
keydown guard: ignore defaultPrevented, isComposing and legacy keyCode 229 before
running Enter/Tab commands. NumberInput's policy, public declarations, dependency
versions and Grid provenance are unchanged. No commit, push or publication.

The former input-composition-known-gap.spec.js is replaced by active
input-composition-keyboard.spec.js regressions. All four original desired
assertions remain, with normal keyboard recovery, default behavior, a
host-prevented key and readonly/disabled recovery added. There is no fixme or
TAET_UI_COMPOSITION_PROBE opt-in path in the active file. It is included in the
focused input and three-engine compatibility gates.

Composition/keyCode flags are synthetic dispatch. Recovery uses browser keyboard
input, not a physical IME session. The earlier expected assertion failures below
remain historical evidence of the corrected defect, not current skipped coverage.

## Checks

- Final new keyboard regressions: 27/27 across Chromium/Firefox/WebKit, one worker,
  after the platform-aware native Tab helper change (53.7 seconds).
- Expanded focused regressions: 159/159 across the same engines (4.6 minutes),
  including composition lifecycle, editing, remaining-input lifecycle, foundation,
  basic Form, keyboard acceptance and Grid edit-commit lifecycle.
- Isolated handler fixture: the original handler violates all four original
  desired assertions; the corrected handler violates none. No checkout rollback.
- Fresh full/components/foundation build passed before the aggregate browser runs.
- npm test passed: 556 syntax files; API inventory and package/provenance guards;
  717/717 units; installed TS/JS consumers with TypeScript 5.9.3, NodeNext/Bundler
  and 476 runtime exports.
- Full default Chromium: 841/841 passed, no fixme skips (9.8 minutes), four workers,
  port 5242, output test-results/textarea-guard-full-chromium.
- Bundle/provenance/assets/77-documentation-import guard passed; bundle suite
  passed 42/42 on three engines (46.5 seconds), two workers, port 5244.
- Installed browser consumers/types passed, including all nine built-in editors.
- Focused discovery lists 255 executions in eight files (85 journeys), not counted
  as a separate test pass. Independent final read-only review found no actionable
  findings after the native Tab helper adjustment.
- Expanded compatibility: 1915 passed and eight explicit clipboard-backend skips,
  no TextArea skips (34.4 minutes), 68 selected specs across three engines. Four
  workers with Windows WebKit capped at one; port 5241; output
  test-results/textarea-guard-compat. Engine repetitions overlap the full suite.
- Final npm pack dry-run: 498 files, version 0.6.0-rc.6; generated dist, test,
  browser-test, test-result and node_modules trees excluded. No publication.
- The 299 other source/resources match the saved current snapshot. TextArea is
  byte-for-byte its original file plus the guard line and one blank line. Its
  SHA-256 is f50f24213a837d373e2885764c713cb6a4f6847b23635324e1c71669ddbdf0d3.
  NumberInput remains afa7a817a04c2e2193c0403254a478796cf6de2e93ec9fbe921d627c26bcd0f9.

The test:all stages were run separately: npm test, fresh build/full browser suite,
and installed browser types. These are local Windows/browser results, not a
remote CI, macOS native WebView or actual IME acceptance claim.

## Numeric draft investigation, without a runtime change

A blur-only clamp change is insufficient: ControlCellEditor reads value.get(),
and Grid/TreeGrid validate and read before destroying an editor. Enter/Tab and
API commits need not blur first. Form.submit also takes a value snapshot before
beforeSubmit without explicitly finishing editing. Numeric draft policy therefore
needs an explicit owner integration, not a change to one blur listener.

Unresolved choice: live parseable model/events while typing (temporarily outside
min/max), versus last committed model plus a separate draft and one value event
cycle on commit. The latter gives a clear Escape transaction but changes the
stable live-value contract, so it needs an explicit opt-in/migration decision.
Empty/null versus incomplete badInput, validators/veto, silent API writes, reset,
spin and destruction must remain separately defined. The investigation did not
add any draft/commit/locale API or change current NumberInput behavior.

---

# Input history, clipboard and composition follow-up - 2026-11-09 (UTC)

Local follow-up to the editor-coverage package below on SANDRA/Windows, same
main HEAD 0ca41c6836e3a6e4e0b9f87a3d968ec55ef74d65. Existing uncommitted work is
preserved. Runtime, declarations, dependencies, version and Grid provenance are
unchanged. No commit, push, publication or user OS clipboard operation occurred.

## Added coverage and observed limits

- 15 real browser keyboard Undo/Redo cases: TextInput, single/multiline TextArea,
  integer/fractional NumberInput; append, selection replacement and deletion.
  Compare bare controls, exact model/events and text/textarea selection. Number
  inputs expose null selection offsets, so their caret restoration is unverified.
- Four real keyboard clipboard cases, including fractional paste 1.05, run only
  in a fresh reviewed Chromium 149.0.7827.55 headless-shell process. The exact-tag
  implementation uses ClipboardNonBacked in memory. Version/executable/headless
  guards fail before gestures on an unreviewed launch. No shared OS clipboard
  is read or overwritten. Firefox/WebKit are explicit unsupported-backend skips.
- 17 explicitly synthetic composition lifecycle cases cover Form-owned teardown,
  repeated input, exact value phases, NumberInput guards and Grid/TreeGrid editor
  isolation/recovery. They do not certify real native IME candidate behavior.
- Four separate TextArea composing-key regressions remain fixme by default.
  Opt-in reproduction failed all 12 desired assertions across three engines,
  with no setup/global/teardown errors: composing Enter emits enterKey when
  acceptsReturn:false; composing Tab inserts a tab when acceptsTab:true.
  Both isComposing:true and keyCode229 reproduce. Runtime was not changed.
- The observational policy probe records 240 cases, not regression assertions.
  It compares native/Tæt controls under nine context-locale/lang combinations.
  min:10 plus typed 12 becomes 102 under live clamp; clamp:false preserves 12.
  Keyboard comma behavior varies by engine and locale/lang, matching native
  controls. See INPUT_TESTING.md for exact traces and the unresolved UX choices.
- NATIVE_ACCEPTANCE.md now distinguishes the recorded 7 November Apple Silicon
  build/echo smoke from unverified current native input acceptance. No new host
  build/launch occurred; MacBook was reported offline during this pass.

## Checks for this follow-up

Focused evidence completed before aggregate gates:
- Keyboard history: 90/90 (15 cases x 3 engines x 2 repetitions).
- Isolated clipboard: 4 passed Chromium, 8 explicit Firefox/WebKit skips.
- Composition lifecycle: 51/51 across Chromium/Firefox/WebKit.
- Known-gap opt-in probe: 12/12 expected desired-assertion failures, not a green
  pass; ordinary standalone mode explicitly skips all 12.
- Policy probe: 240 observations, zero page errors, all runtime source hashes
  unchanged; full reproduction details live in ignored test-results.

Completed aggregate gates:
- npm test passed: 556 syntax files, API/package boundaries, 717/717 units and
  installed TS/JS consumers (TypeScript 5.9.3, NodeNext/Bundler, 476 exports).
- Full default Chromium: 832 passed, four known-gap fixme skips (9.4 minutes),
  four workers, port 5223, output test-results/input-second-full-chromium.
- Fresh build and bundle/provenance/assets/77-doc-import guard passed.
- Bundle suite: 42/42 across three engines (40.9 seconds), two workers, port 5224.
- Installed browser types/consumers passed, including all nine built-in editors.
- Focused tag selection lists 228 engine executions in seven files (76 journeys);
  list-only evidence is not counted as a separate execution pass.
- Expanded compatibility: 1888 passed, eight explicit clipboard-backend skips
  (28.2 minutes), Chromium/Firefox/WebKit, four workers with Windows WebKit capped
  at one, port 5222, output test-results/input-second-compat. The 67 selected specs
  contain 632 scheduled executions per engine; clipboard runs only on Chromium.
- Refreshed historical decimal mutation proof: 15/15 clean baselines passed and
  15/15 mutant runs failed the required 1.0-to-1 assertion. The isolated snapshot
  and reports are retained at OS temp taet-input-regression-2PFkoa; checkout
  NumberInput SHA-256 remains afa7a817a04c2e2193c0403254a478796cf6de2e93ec9fbe921d627c26bcd0f9.
- Final npm package dry-run: 498 files, version 0.6.0-rc.6; no test, browser-test,
  test-result, node_modules or dist trees. Nothing was published.

The prior package's completed results below remain historical evidence. They are
not relabeled as passes for the new files. Native OS clipboard, physical keyboard,
actual IME and current native WebView acceptance remain unverified. Public
min/max normalization and locale support contracts have not been changed.

---

# Input editing coverage hardening - 2026-11-09 (UTC)

Uncommitted test-only work on main, based on `0ca41c6836e3a6e4e0b9f87a3d968ec55ef74d65`
(0.6.0-rc.6), verified locally on Windows x64, Node 22.14.0 and Playwright 1.61.1.
No runtime source, declaration, dependency, API maturity or Grid candidate hash
was changed. No commit, push or publication was performed.

## Changed coverage

- NumberInput browser cases expand from 17 to 38 while retaining existing assertions:
  actual default/any/fractional step, -0.05, equal-valued prefixes, keyboard
  replacement/deletion, blur/refocus and disabled/readonly recovery.
- Existing Grid/TreeGrid adapter, live demo and keyboard-only Dialog/Form journeys
  now type decimal drafts sequentially and retain exact model/event/store checks.
- New TextInput/TextArea journeys check middle insertion, selection replacement,
  deletion, caret position and refocus. An automatic pageerror fixture checks body
  and afterEach errors, including an exact-error self-check.
- A shared Node value-phase harness retains distinct teardown cases and
  choice-specific assertions. NumberInput model normalization/reset/spin coverage
  is expanded. A Node guard prevents tagged editor specs from silently leaving
  the selected three-engine gate.
- `test:inputs` selects 44 tagged journeys (132 engine executions). Compatibility
  now selects 64 spec files, including the existing high-risk input and Grid
  lifecycle regressions. These overlap the broad suites.
- `test:input-regression` verifies five journeys against an unchanged snapshot and
  the historical decimal defect on all three engines. The checker never patches
  the checkout and rejects setup failures, missing inputs and timeouts as proof.
  Strategy and explicit acceptance limits: [INPUT_TESTING](INPUT_TESTING.md).

## Verification

- `npm test`: passed, including API inventory/package boundaries, all 716 Node
  tests, installed TS/JS consumers (NodeNext/Bundler) and 476 runtime exports.
  All 47 approved Grid candidate hashes passed.
- Final `npm run test:syntax`: passed, 551 JavaScript files.
- Build plus full Chromium via `node scripts/run-browser.js --workers=8
  --output=test-results/input-audit-full-chromium`, port 5201: 796/796 passed.
- `npm run test:types:browser`: passed, including installed editor, input,
  data/model and component consumers.
- Expanded compatibility via `node scripts/run-browser.js --config
  playwright.compat.config.js --workers=4 --output=test-results/input-audit-compat-final`,
  port 5202: 1788/1788 passed (596 per engine), 32.2 minutes. The configured
  Windows WebKit single-worker cap remained active.
- Final build, `node scripts/check-bundle.js`, and the bundle browser config
  with two workers, port 5203: 42/42 passed across the three engines.
- `node scripts/check-input-regression.js --all-engines`: 15/15 unchanged
  baseline journeys passed; all 15 mutant journeys failed the exact expected
  intermediate-value assertion (expected "1.0", received "1").
- `npm pack --dry-run --json`: passed, 498 files; generated dist, dependencies,
  tests and reports were excluded. This was inspection, not publication.

The `test:all` stages were run individually as npm test, build/full Chromium,
and test:types:browser rather than repeating the same aggregate command.
No unrelated source changes followed those browser checks. The final scripts and
matrix guard were covered by the final syntax pass; the guard also ran in the
716-case unit gate.

NumberInput SHA-256 before/after mutation verification:
`afa7a817a04c2e2193c0403254a478796cf6de2e93ec9fbe921d627c26bcd0f9`.
The successful five-journey proof retained its source snapshot, reports and
summary.json in the OS temporary directory `taet-input-regression-T2Ec3W`.
Broad gate logs remain under ignored `test-results/input-audit-*`.

## Exploratory failures and limits

An initial focused run passed 130/132 cases: the two new noneditable WebKit
journeys sent Backspace, which navigated to about:blank. The same behavior was
reproduced on bare native inputs. Only that noneditable gesture was removed;
typing/Delete/ArrowUp, display/model/events and recovery assertions remain,
and editable Backspace remains covered. Both focused WebKit recovery cases passed.
A bare Chromium comparison also motivated explicit refocus after clearing readonly.

The first extended mutation baseline was rejected because the copied demo's recipe
dependency was missing. Another iteration rejected an overly specific expected-failure
classification. Neither counted as a successful proof. The final checker requires
all five clean baselines and the observed 1.0-to-1 assertion on every mutant.

These are Windows browser/package results, not a remote CI, macOS or native WebView
acceptance claim. Native IME, OS clipboard, undo/redo, comma-decimal locale/keypad
behavior and constrained draft/commit policy remain explicit follow-up decisions
in INPUT_TESTING.md. No new support policy or runtime workaround was introduced.

---
# rc.6 publication candidate - 2026-11-08

The 0.6.0-rc.6 candidate combines the NumberInput fix and completed local checks
recorded below with synchronized package/documentation versions. There are no
additional runtime, declaration or dependency changes. Grid candidate metadata
advances only packageVersion; all 47 approved file hashes and the immutable
source-snapshot manifest remain unchanged.

Publication targets npm next. The exact release commit must pass its own remote
CI before publication. The PR and registry record provide commit/run and package
integrity evidence; a prepared package or workflow file alone is not publication
or a claim that final CI has passed. Existing release tags/versions stay immutable.

---

# NumberInput decimal entry - 2026-11-08

Local working-tree verification on `codex/number-input-decimal-entry`, based on
`3361a7e` (0.6.0-rc.5). Public declarations/exports, dependencies and the 47
approved Grid candidate hashes remain unchanged.

The new native keystroke regression failed before the fix: typing `1.05`
produced `15`. NumberInput now preserves equivalent editor text such as `1.`
and `1.0` during user changes while keeping public values/events numeric.
Blur canonicalizes text with either clamping setting; API writes and numeric
normalization, veto, disabled/readonly recovery and nested writes retain their
synchronization behavior. The portable compatibility gate includes the new spec.

Completed checks on Windows x64:

- `npm run test:all`: passed. Its `npm test` phase checked 546 JavaScript files,
  API inventory/package boundaries and all 698 unit tests. The main Chromium
  browser suite passed 772 tests. Installed TS/JS consumers passed in Node and
  Chromium with TypeScript 5.9.3, NodeNext/Bundler and 476 checked runtime exports.
- `node scripts/run-browser.js --config playwright.compat.config.js`: 1605
  passed across Chromium, Firefox and WebKit. The run used eight workers with
  the configured single-worker Windows WebKit cap.
- `npm run test:bundle`: build/provenance/assets checks and all 42 ESM/IIFE,
  font and export checks passed across the three engines.
- The new decimal-entry subset separately passed 51 tests (17 per engine);
  the focused Chromium run including existing mount/recovery tests passed 24.
  These subsets overlap the full gates and are not additional unique coverage.
- `npm pack --pack-destination <external-directory>`: 497 files. The packed
  NumberInput source matched the checkout; dist, node_modules and test reports
  were excluded. Build/test artifacts and detailed logs remained ignored or
  outside the checkout.

These are automated browser/package checks, not native WebView host or physical
keyboard/IME certification. This change stays within Tæt UI; application pins
and public release metadata retain their existing versions.

---

# rc.5 release preparation - 2026-11-08

The 0.6.0-rc.5 release metadata is based on merge commit
`65abe6a5b2d3dff0c28ebb88e4e9a96dfbca3bc1`. Runtime, declarations, test
fixtures, build scripts and workflows are unchanged from that commit. All 47
reviewed Grid candidate source hashes and the immutable imported manifest are
preserved; only the candidate packageVersion advances with package.json.

The exact merge commit passed all seven jobs in
[CI run 42427920445](https://github.com/edward-ap/taet-ui/actions/runs/42427920445):
Windows/Linux Node 22 and 24, macOS, three-engine compatibility/bundles, and
performance. This is base-commit evidence, not a claim about a later commit.
The final release commit must pass its own linked GitHub Actions run before npm
publication. The public npm registry separately records publication outcome.

Local preparation checks:

- Clean macOS main at the merge commit: npm test passed 546 syntax files,
  API/package guards, 698 units and installed TS/JS consumers (476 exports).
- Windows rc.5 metadata snapshot: fresh build, bundle/provenance/assets guard
  and 77 documentation imports passed; publication metadata prerequisites passed.
- npm dry-run contained 497 files. Build products, dependencies, logs, profiles
  and credential files were excluded. A bounded scan found no common npm/GitHub
  token, private-key, AWS-access-key or npm auth-assignment patterns. This is
  package hygiene, not a security certification.
- Windows test:all and sequential Firefox/WebKit compatibility runs were
  interrupted during execution. They have no completed pass/fail summary and
  are not counted as passed gates. Full results must come from the final CI run.

No API maturity is promoted. Native IME, VoiceOver, clipboard/file dialogs,
mixed DPI, signing/notarization, Intel/universal macOS and Linux native hosts
remain unverified. Earlier failed runs and bounded native evidence below remain
historical records. Published rc.3/rc.4 versions and release tags are unchanged;
rc.5 is intended for npm next, without promoting latest.

---

# Cross-platform branch preparation - 2026-11-07

Pre-PR verification snapshot for `fix/macos-webkit-portability`, based on
`bfd3ddcddf1cdc539397e5d2ac5ed3cb976e72c2`. These are source-branch results,
not new results for the previously published v0.6.0-rc.4 archives. The original
Windows main was checked clean at that common base; Windows verification uses
a separate detached worktree. No release tag or npm publication is part of
this change. Final remote CI and further Windows engine results belong to the
pull request for this branch, not to an assumed passing workflow file.

## Additional findings before the PR

- Modal traversal now includes native contenteditable hosts with true, empty
  and plaintext-only attributes. Their default tabIndex is -1 despite being
  native Tab stops. Explicit negative tabindex and inherited/nested editors
  stay excluded unless explicitly tabbable. Twenty modal cases per engine
  cover these and the earlier containment/editor/reentry contracts.
- A separate pre-existing Firefox race lost an active Grid/TreeGrid draft when
  automatic scrolling after a resize arrived before ResizeObserver. It was
  reproduced with the baseline OverlayManager, so it was not a modal-fix
  regression. Both tables now reconcile changed client geometry first using
  their existing resize path. A subsequent scroll at unchanged geometry still
  immediately cancels editing; there is no timer or grace period. Factory
  teardown remains safe. Four new width/height regressions force this ordering.
- The lab27 MDI test had a separate render-readiness race: selecting a connector
  updates status immediately, then replaces SVG ports in a later animation
  frame. The fixture now waits for selection rendering and bounded-polls live
  port geometry. All interaction and connection assertions remain; production
  ConnectorLayer code is unchanged.
- ScrollingLabel had a rapid-font-swap edge: setGap could measure fallback
  metrics, then the loaded font restored the observer's original width before
  ResizeObserver sampled the fallback. The stale animation could persist.
  Font loading/completion/error events now invalidate metrics; each loading
  cycle also captures FontFaceSet.ready because WebKit can omit loadingdone.
  Listeners are disposed and pending continuations cannot measure after
  destruction. No polling, timers or per-frame JavaScript were added. The
  original late-font test is unchanged; dedicated no-resize-delivery, listener
  cleanup and missing-API cases cover the correction.
- The two Grid source changes were reviewed before updating only their two
  candidate hashes. The other 45 entries and immutable source-snapshot remain
  unchanged. Imported CRLF bytes are retained.

## Completed local checks

| Check | Result |
| --- | --- |
| macOS test:all, two workers | 546 syntax files; API/package guards; 698/698 units; 755/755 Chromium; installed TS/JS/browser consumers; 476 runtime exports |
| macOS full Firefox, two workers | 755/755 passed, 7.9 minutes |
| macOS full WebKit, two workers | 755/755 passed, 6.2 minutes |
| macOS modal regression file, all engines | 60/60 passed |
| macOS Grid/TreeGrid window regressions, all engines | 66/66 passed |
| macOS editor activation/teardown, all engines | 15/15 passed |
| Original intermittent Firefox resize case | 30/30 serial repetitions passed after the fix |
| Corrected lab27 fixture | 10/10 WebKit repetitions and 3/3 engine checks passed |
| ScrollingLabel font completion | 21/21 focused engine checks; 40/40 WebKit repetitions; original/fixed comparison confirmed the stale endpoint and correction |
| macOS bundle guard and all-engine bundle suite | 77 documentation imports checked; 42/42 browser cases passed |
| macOS native example | prepare and cargo build --release --locked passed; final Mach-O arm64 binary and local .app copy match |
| Windows after Grid fix, before final font patch | 698/698 units; incremental syntax and API/package guards; fresh build; 752/752 Chromium; 515/515 Firefox compatibility |
| Windows initial patch baseline | Full test:all passed: 698 units, 748 Chromium, syntax/API/package and installed TS/JS/browser consumers |
| Local distribution and package inspection | 497 npm package files; native PNG and verification record present; build outputs/dependencies/reports excluded; three portable archives have 22 files each |
| Workflow and source hygiene | actionlint 1.7.12 passed; CRLF-aware diff check passed; only reviewed source/assets/tests/docs/workflow files selected |

At this pre-PR snapshot, further Windows engine runs and the final font patch's
Windows verification are still in progress. The pull request records their
outcome and CI for its exact head commit. Earlier exploratory WebKit runs each
passed 751/752 and exposed the lab27 fixture race and then the font-completion
edge; those failures are retained as evidence, not counted as passing full
runs. The final full Mac suites above use the corrected runtime and fixtures.

Final source-content SHA-256 (src/scripts/package inputs):
`e5672499ec2115ecf38a52b57d81d10a0839fd33f6005f9e3935563a60cb083a`.
Reviewed runtime SHA-256 values:

- OverlayManager.js: `17b9250fae7325a2164ae73af1c2b103f66397e6d4bd9cb9cd5c8f810d2b0de8`
- Grid.js: `646bf4902a17d068896204d64de68bcf967bc8ac70208d82b891221385599690`
- TreeGrid.js: `59c37c5e9c2a88c9242556dc7b8fa356c153bbe1d95b7d1d35fd7e77f42de3c2`
- ScrollingLabel.js: `5b3c1d5340c70c6571b8577e947909044b3953db4e1bb377d2ec3893d618e982`

Candidate manifest SHA-256:
`4d7dddb43219c6daead41568e9fc063467abb99dd19fad4e158d86be9a5f487c`.
The native BUNDLE.json and dist report identify the same final source content.

The maintainer's earlier Safari/Grid and native Rust-echo smoke remains bounded
manual evidence. The final rebuilt executable was not manually retested.
Playwright WebKit is not a complete Safari/WKWebView acceptance pass. Actual
IME, VoiceOver, native clipboard/file dialogs, mixed DPI, signing/notarization,
installers and Intel/universal macOS builds remain unverified. Linux native
hosts remain unverified. Earlier runs and their limitations follow below.

---

# macOS keyboard and WebKit remediation - 2026-11-07

This local follow-up resolves the failures described in the first consumer
check below. Source checkout: `bfd3ddcddf1cdc539397e5d2ac5ed3cb976e72c2`, with
uncommitted local corrections. No release, push or publication was performed.
Host: Apple M1 Max (10 cores, 64 GiB), macOS 26.5.1 arm64. Toolchain and browser
versions are unchanged from the first check.

## Findings and corrections

- **Real OverlayManager defects:** native macOS WebKit Tab could leave a modal
  from an interior button; capture-phase trapping could steal Grid editor Tab
  before validation/commit. Consumed Grid/TreeGrid Tab at the first/last cell
  could also escape to an outside control or BODY. Popup editor forwarding at
  document level must run before the modal's ordinary Tab handling.
- OverlayManager now handles unconsumed Tab at window bubble phase, explicitly
  advances modal/portal focus, and checks captured Tab after dispatch/default
  actions. The deferred check only repairs focus outside the same live top
  modal, tolerates a child popup closing, and cannot reclaim focus after modal
  replacement/reopen. Teardown clears pending checks. Positive tabindex,
  radio groups, duplicate portal targets and native summary/media/frame targets
  are retained. Escape handling remains capture-phase.
- **Platform-aware tests:** primary mouse/keyboard shortcuts use ControlOrMeta.
  Unit tests retain explicit ctrlKey and metaKey coverage. macOS WebKit native
  all-control navigation uses Option+Tab through a narrow test helper; Grid
  editor and modal behavior still exercise plain Tab/Shift+Tab. No system
  keyboard settings were changed.
- Safari mouse activation does not focus native buttons. Two focus-return
  tests now explicitly focus and keyboard-activate their opener before checking
  restoration. Diagnostics confirmed the previous implementation restored the
  actual saved focus correctly in those cases.
- Firefox does not expose WebKit scrollbar pseudo-elements. Three visual tests
  retain 6px pseudo-element assertions where supported and check standard
  width/color against explicit native CSS probes elsewhere. macOS Firefox
  computes native thin as none even in an independent plain-HTML probe. Theme
  color assertions remain active; production CSS was unchanged.
- The syntax walker now excludes exactly examples/tauri-minimal/target: Tauri
  writes compressed assets with .js suffixes there. A regression verifies that
  an invalid real example source still fails the check. The PNG icon extracted
  from the existing ICO remains the only native-example source addition.

Only src/core/OverlayManager.js changed in library runtime source. Grid source,
public exports, immutable provenance and all 47 approved Grid candidate hashes
are unchanged. Added coverage: 17 modal browser regressions, explicit Ctrl/Cmd
unit variants and the syntax-walker fixture. No whole tests were skipped.

## Final verification on the corrected source

| Check | Result |
| --- | --- |
| npm run test:all, four workers | Passed: 546 syntax files, API/package guards, 698/698 units, 745/745 Chromium browser cases, installed TS/JS/browser consumers and 476 runtime exports |
| Full Firefox suite, four workers | 745/745 passed, 6.1 minutes |
| Full WebKit suite, two workers | 745/745 passed, 6.4 minutes |
| Modal plus existing overlay/reentry regressions, all three engines, one worker | 108/108 passed, including 17 new cases per engine |
| Bundle guard and three-engine bundle configuration, one worker | Passed; 42/42 browser cases; provenance/assets/exclusions and 77 documentation imports verified |
| Local npm pack dry-run and tarball inspection | 497 files; final verification record and native PNG included; target, node_modules and test-results absent |
| Portable ZIP packaging from the verified build | Full/components/foundation archives passed, 22 files each; local dirty-tree provenance retained |
| Native example prepare + cargo build --release --locked | Passed; current components bundle embedded in Mach-O arm64 executable |
| git diff --check | Passed |

Final commands, with the installed user toolchains on PATH, included:

- TAET_UI_PORT=5721 TAET_UI_WORKERS=4 npm run test:all
- TAET_UI_PORT=5723 node scripts/run-browser.js --browser=firefox --workers=4
- TAET_UI_PORT=5722 node scripts/run-browser.js --browser=webkit --workers=2
- node scripts/check-bundle.js
- TAET_UI_PORT=5724 node scripts/run-browser.js --config playwright.bundle.config.js --workers=1
- node examples/tauri-minimal/prepare.mjs
- cargo build --manifest-path examples/tauri-minimal/Cargo.toml --release --locked
- python scripts/package-distribution.py
- npm pack --dry-run --json; npm pack --json

Distinct output directories were used for each run. Final source-content SHA-256
(src/scripts/package inputs):
`6f197d60d98b8ac3662f7471038162e912dfcd8d95dc505e4da2d785440f26bc`.
OverlayManager.js SHA-256:
`a4417cb37ba24f4f36ba8fbbb6d1c73ffc5ff57214bec04c28f3bd987900be3a`.
The native BUNDLE.json source matches the final dist report. The existing local
.app wrapper was refreshed with the identical rebuilt executable; its Finder
launch is not an additional verified acceptance result.

Exploratory reports are retained separately. One early parallel run read dist
while another command rebuilt it, causing temporary delivery/JSON failures.
Two Firefox geometry-loop tests exceeded their 30-second budget under that
heavy load. The final runs used an unchanged completed build and both geometry
tests passed without changing their assertions or timeout.

## Remaining limits

The maintainer's earlier native Rust-echo and Safari documentation/Grid checks
remain useful manual smoke evidence. The final native executable was rebuilt
but the already-open application was not restarted or manually retested. The
2,235 passing final browser cases are Playwright Chromium/Firefox/WebKit tests,
not a claim that all were driven in the Safari application or native WKWebView.
Actual IME, VoiceOver, native clipboard/file dialogs, mixed-DPI behavior and a
complete native consumer acceptance pass remain unverified. Signing,
notarization, installers and Intel/universal builds were not configured.

---

# macOS first consumer check - 2026-11-07

Local source checkout at `bfd3ddcddf1cdc539397e5d2ac5ed3cb976e72c2`,
Tæt UI 0.6.0-rc.4, on macOS 26.5.1 arm64. This is a local preparation and
verification record, not a publication or a complete macOS acceptance claim.

Toolchain: Node 22.23.4, npm 10.9.9, Python 3.13.18, Rust/Cargo 1.99.1,
Xcode 26.5 and macOS SDK 26.5. Playwright 1.61.1 used Chromium
149.0.7827.55, Firefox 151.0 and WebKit 26.5. Tools and browser dependencies
were installed in user-owned locations; system keyboard/security settings
were not changed.

| Check | Result |
| --- | --- |
| Fresh npm ci | Passed; npm audit reported zero vulnerabilities |
| npm test | Passed: syntax/API/package guards, 695 units, installed TS/JS consumers and 476 runtime exports |
| npm run test:all | Failed at full Chromium browser stage: 706/728 passed, 22 failed; the final types-browser stage did not run in this command |
| Separate npm run test:types:browser | Passed |
| Standard Firefox compatibility | 470/473 passed; three keyboard text-replacement failures |
| Standard WebKit compatibility | 441/473 passed; modifier/selection and keyboard focus failures |
| npm run test:bundle | 42/42 passed across Chromium, Firefox and WebKit |
| Repeat of the 22 Chromium failures with one worker | All 22 reproduced; original evidence retained separately |
| Local npm pack and portable archive packaging | Passed; full/components/foundation archives each contain 22 files; no publication |
| Native Tauri example release build, locked Cargo dependencies | Passed after adding the PNG icon described below; Mach-O arm64 executable |
| Native interactive smoke | The maintainer reported seeing the native example and receiving Rust echo after clicking its button |

The Chromium failures are at test flows that hard-code Control-click or
Control+A. A separate diagnostic observed Chromium emitting contextmenu rather
than click for Control-click on this Mac. Control+A did not select all text.
Using Cmd-click selected both Grid records, and Cmd+A replaced and committed
the editor value in Chromium, Firefox and a fresh WebKit page. This is bounded
browser evidence, not a rerun of the full suite with modified tests. No Grid
implementation, candidate hashes or standard tests were changed.

WebKit additionally skipped native HTML buttons during a plain Tab sequence
in a minimal button/input/button page without Tæt: focus alternated between the
input and document body. Its suite failures involving Tab entry, focus return
and dialog trapping remain unresolved. They must not all be relabeled as
library passes or dismissed as only Control/Cmd test mistakes. The earlier
combined WebKit modifier diagnostic ran after a Control-click/context-menu
sequence and failed; a fresh independent Cmd-first diagnostic passed.

The native example originally failed in tauri::generate_context because
icons/icon.png was absent. The existing MIT-licensed icon.ico contains one
32x32 RGBA PNG image. That original embedded image was extracted without
altering its pixels into icons/icon.png (125 bytes, SHA-256
`7ee8e611873e85c0f0bd6ef5a7ee03dc97dd791c52fb3d6b5efc87d81c25eee3`). The ICO, application Rust/JS and Tauri
configuration were unchanged. Native rebuild succeeded with pinned Tauri
2.12.1 and tauri-build 2.7.1. The maintainer's button/echo observation is a
limited manual smoke, not the historical Windows acceptance stand.

Remaining work: platform-aware modifier tests, WebKit/native keyboard-focus
acceptance, extended native controls, actual IME, screen reader, clipboard/file
dialog and mixed-DPI checks. Signing, notarization and installer distribution
were not configured. No push, release, npm publication or other project change
was performed.

---

# rc.4 publication preflight - 2026-11-03

The maintainer authorized a new rc.4 GitHub prerelease and npm next publication.
This preparation combines the reviewed 140478d4 cleanup and 51424a27 desktop
showcase; rc.3 versions, tags and assets are immutable. It changes release wording
and uses absolute public GitHub image/example URLs so the npm README can display
the showcase without shipping PNGs or a duplicate application in the tarball.

Production src/scripts/package inputs are unchanged from the fully checked rc.4
cleanup: content SHA-256 91a1636bc57547a47b51a3f8d9e57916865eaeec96c4c5109d149f5cf139894a.
The exact completed local gate results and the three-engine showcase checks are
recorded below. Publication re-runs, final-commit CI and registry/archive checks
are recorded separately in the matching GitHub prerelease notes. This preflight
entry does not claim those external operations succeeded.

Source review: 898 tracked files; no generated archives, dependencies, reports or
secret-pattern matches in tracked content. The three PNGs total 470481 bytes and
retain the recorded hashes. The immutable imported manifest is byte-identical;
all 47 reviewed candidate hashes pass the boundary guard. No export or maturity
changes are introduced. Final archives must use --release from the final clean
commit and embed that revision; npm must be verified independently after upload.

Native WebView/physical-input, IME, screen-reader and non-Windows native limits
remain as described below. Browser automation and remote CI do not remove them.

---

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
