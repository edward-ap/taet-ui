# Editor interaction coverage

The normative [editing contract](EDITOR_EDITING_CONTRACT.md) separates accepted
values, native/popup drafts, operation outcomes and unresolved owner policies.

This is a test strategy for the existing public input contracts, not a change to
accepted values, normalization timing, native keyboard behavior or API maturity.

## Layers and commands

- `npm test`: syntax, API/package boundaries, model/unit tests and installed TS/JS consumers.
- `npm run test:inputs`: the focused `@input-editing` journeys on Chromium,
  Firefox and WebKit. It uses the compatibility configuration and an owned
  loopback server. Set `TAET_UI_PORT` for independent runs.
- `npm run test:input-clipboard`: real copy/cut/paste shortcuts in an explicitly
  isolated Chromium headless shell. It is not a system clipboard test.
- `node scripts/probe-number-input-policy.js`: observational min/max and locale
  matrix with native comparisons; writes JSON under test-results/input-second-policy.
  This does not turn disputed behavior into a passing product contract.
- `npm run test:input-regression`: positive baseline and negative historical-bug
  proof on all three engines, using a separate temporary source snapshot.
- `npm run test:all`: the full default browser suite and browser type consumers,
  in addition to `npm test`.
- `npm run test:compat` and `npm run test:bundle`: broad selected cross-engine
  contracts and installed delivery formats. These are not native host certification.

A Node guard checks that tagged editor spec files stay in the three-engine configuration.
Focused cases overlap the full suites. Do not add their execution counts to the
full-suite counts as if they were independent scenarios.

## Focused interaction matrix

The tagged matrix exercises:
- NumberInput default options, step:any and fractional step; positive/negative
  fractions, including -0.05; visible equal-valued prefixes such as 1.0/1.00;
  numeric model values and exact semantic events.
- Numeric keyboard replacement, deletion, clearing, blur/refocus, API/silent
  synchronization, reset, veto, spin and readonly/disabled recovery.
- TextInput/TextArea middle insertion, selection replacement, Backspace/Delete,
  caret position and refocus, without replacing user gestures with value setters.
- Browser keyboard Undo/Redo after append, full-selection replacement and deletion
  in TextInput, single/multiline TextArea and integer/fractional NumberInput.
  Exact values and native input events are compared with bare native controls;
  semantic before/change/after phases are checked separately. Restored selection
  is meaningfully checked for text/textarea only: type=number exposes null
  selection offsets, so numeric caret restoration is not certified.
- Explicitly synthetic composition lifecycle: Form-owned destruction during each
  value phase, repeated text input, late detached events, NumberInput composing
  arrow guards and Grid/TreeGrid composing commit/cancel guards. These are dispatch
  and cleanup tests, not an OS IME candidate session.
- Grid/TreeGrid draft isolation, sequential decimal typing, Enter/Tab commit,
  Escape cancel, typed model values and exact store/commit counts.
- A keyboard-only Dialog/Form journey that reaches and edits the numeric field,
  preserves equal-valued draft text and propagates a number into the Form.

Fixture construction and model inspection may use page.evaluate. The editing
gesture under test must use browser keyboard/pointer input. fill and API setters
remain appropriate for complete-value assignment, setup, hydration and their own
contracts; they must not be described as incremental typing.

The existing masked/choice/date-time/remaining-input lifecycle, NumberInput mount,
Grid integration recovery, clipboard lifecycle, edit commit and editor activation
specs are now included in the selected three-engine compatibility gate. Their
distinct assertions remain intact. This is risk-based inclusion, not a claim that
all browser specs run on every engine.

## Error detection and shared contracts

New input specs import `input-test-fixture.js`. Its automatic fixture collects
uncaught page errors through the test and afterEach/control teardown. Expected
errors must match exact messages and counts; there is no blanket ignore switch.
It cannot certify arbitrary timers after the fixture ends. Existing spec-specific
error guards remain in place rather than being silently replaced.

The Node editor value-phase helper shares setup for beforeChange/change/afterChange
teardown, retaining named per-control/per-phase cases, event source/value checks,
choice-record identity, retained values and cleanup. Component-specific
reconciliation and post-destroy behavior remain separate cases.

## Shared editing-operation matrix

[Editor invariant cases](../browser-tests/editor-invariant-contract.spec.js) use
[test-only adapters](../browser-tests/editor-invariant-adapters.js) for plain text,
live/commit numbers, compact/slots masks and time, including Form/Grid/TreeGrid
ownership and PropertyGrid staged/inline journeys. Assertions keep native text,
accepted field value, owner projection
and saved data separate. They cover silent/equal writes, validation failure without
diagnostics, event phases, cancellation and teardown without equalizing specialized
parsing or nested-write precedence. A test helper is not a production abstraction.

[Form result tests](../test/form-validation-outcome.test.js) separately cover
child ok:false with empty/missing diagnostics, warnings, preparation order and
teardown after Form's own validate dispatch. See the [contract](EDITOR_EDITING_CONTRACT.md)
for currentness limits. [Form currentness tests](../test/form-validation-currentness.test.js)
cover tracked cross-field and Form-callback changes, silent ABA, numeric pending
candidates, participant replacement and explicit retry without rollback. They also
cover strict missing/invalid/throwing/unstable hook diagnostics, scalar tokens,
custom ABA, public-hook precedence and bounded same/nested Form reentry.

Strict custom-field integration is also exercised by the installed
[TS consumer](../test/types/form-revision-consumer.ts) and
[JSDoc consumer](../test/types/form-revision-javascript.js), including unchanged
void-setter typing, invalid hook types, copied array values, candidate revisions
and missing-hook diagnostics. The exact [widget recipe](../examples/ai-recipes/13-custom-editor.js)
is compiled with NodeNext/Bundler and run headlessly for inherited accepted values,
silent rendering, veto/readonly behavior, ABA rejection and owned cleanup. The
[AI recipe browser fixture](../browser-tests/ai-recipes.spec.js) also mounts and
renders the sample widget port and checks cleanup. Neither fixture certifies an
actual third-party widget, real IME or native host.
[Grid currentness tests](../test/grid-validation-currentness.test.js) and installed
[TS](../test/types/grid-revision-consumer.ts)/[JSDoc](../test/types/grid-revision-javascript.js)
consumers cover both mounted owners and Grid temporary clipboard/toggle paths:
accepted/pending changes, silent ABA, final-read mutation, custom protocol failure,
retained sessions, explicit retry, cleanup and the unchanged trusted override.
[PropertyGrid currentness tests](../test/property-grid-validation-currentness.test.js)
and installed [TS](../test/types/property-revision-consumer.ts)/[JSDoc](../test/types/property-revision-javascript.js)
consumers separately assert staged versus inline behavior, checks after the property
veto hook, retained callback state, conditional ordinary veto restoration, strict
editReject payloads, reentry and readonly/disabled API hydration compatibility.
These are complementary boundaries, not a system-clipboard or universal custom
widget guarantee. Only [VERIFICATION](VERIFICATION.md) records passing outcomes.

## Form scaling boundary

Form currentness repeatedly traverses the participant set between field validations.
That traversal work can grow quadratically with field count; using a Set for child
lookup does not make the whole validation pass linear. Focused correctness and
browser-interaction gates do not certify large-form latency. Node-only timing
observations must not be presented as browser or native-host performance.

## Historical decimal-bug proof

`scripts/check-input-regression.js` copies src, the small HTML fixture, and the Grid editor demo/recipe into a
new OS temporary directory. It serves only that copy on loopback, first runs five
unchanged journeys (NumberInput, Grid, TreeGrid, the example and Form), then replaces only the copy's NumberInput._syncInput with
the old unconditional normalization.

Success requires all five unchanged baselines to pass and all five mutants to fail
the expected intermediate decimal assertion (1.0 was rewritten to 1), not merely
exit nonzero. A missing input is not accepted as a detected normalization defect. Missing
tests, loading errors and timeouts are not accepted as a caught defect. Reports,
the mutated snapshot and summary.json are retained for inspection. The checkout's
NumberInput SHA-256 must remain unchanged. Tests are read from the checkout;
do not edit them during this check. No production source is patched or reverted.

## Explicitly unverified or awaiting a product decision

- A comma-decimal locale, numeric keypad layout and accepted exponent/whitespace
  grammar need an explicit support contract. No locale support is inferred from
  an English dot-decimal test or from Playwright's browser engine.
- Real native IME composition, candidate confirmation/cancellation and physical
  keyboard routing require host acceptance. Existing synthetic composing-key
  flags test guards only; they are not an IME session.
- Real OS clipboard routing and native-host Undo/Redo remain separate acceptance
  work. Browser keyboard history is now tested on three engines. Chromium copy/
  cut/paste uses a reviewed in-memory shell backend; neither it nor the existing
  synthetic clipboard lifecycle tests certify system clipboard integration.
  Automated tests here do not read or overwrite the user's shared clipboard.
- In default live mode, positive minimum and other constraints can normalize an
  intermediate prefix even when a later complete value would be valid (for example
  min:10 while entering 12). Opt-in commit mode now defers that normalization;
  it does not change the live baseline or add a new numeric grammar.
- The readonly recovery test refocuses after unlocking. A focused Chromium
  native number input showed the same failure to accept resumed typing without
  refocus as the control in a bounded bare-input comparison; no library workaround
  or universal browser diagnosis is implied. In WebKit, Backspace on a noneditable
  native input also navigated browser history. That gesture is excluded only from
  noneditable attempts; editable Backspace remains covered.
- Browser tests on Windows do not certify macOS native WKWebView, real IME,
  VoiceOver, native dialogs/clipboard or mixed-DPI hosts. See NATIVE_ACCEPTANCE.md.


## Isolated clipboard safety boundary

`input-isolated-clipboard.spec.js` launches a fresh Chromium headless shell process
per case. It hard-fails before any clipboard gesture unless the reported version
is 149.0.7827.55 and CDP reports a headless-shell executable with --headless. The
exact-tag Chromium implementation installs HeadlessClipboard/ClipboardNonBacked,
an in-memory backend, before the main loop. Review the linked implementation in
the spec again before upgrading this pinned browser version. Browser permissions
alone do not prove OS clipboard isolation.

The tests first copy known rendered fixture text, then use actual browser keyboard
copy/paste/cut/paste. They inspect trusted DOM events, values and selection, never
clipboardData or existing clipboard contents. Firefox/WebKit are explicitly
skipped because their clipboard backends have not been reviewed for isolation;
this is not three-engine clipboard coverage. No browser clipboard permission,
Windows clipboard command, user browser or physical keyboard is used.

## Observed numeric policy boundaries (Windows, 2026-11-09)

The historical live-mode observational probe ran 240 engine/locale/lang/native-control combinations,
with Chromium 149.0.7827.55, Firefox 151.0 and WebKit 26.5. It records each key,
capture/bubble native event, semantic value phase, DOM/model, valueAsNumber and
native validity. Source hashes must remain unchanged. Context locale and HTML/
input lang are emulated independently; no OS keyboard layout is switched.

- All three engines: with min:10, typing 12 into an empty NumberInput produces
  10 then 102. Bare native number inputs produce 1 then 12. The first Tæt input
  event normalizes 1 to 10 before its beforeChange event. This is the documented
  per-write clamp, with an undesirable intermediate-edit consequence.
- clamp:false and its existing alias clampToRange:false preserve 1 then 12.
  They also preserve out-of-range model values after blur. There is no clampInput
  option. The later opt-in commit mode changes timing without changing live mode.
- max:10 changes typed 12 to 10. max:-10 changes typed -12 to -102; min:0 changes
  typed -12 to DOM 02/model 2, then display 2 on blur. Bare native controls keep
  the typed number and expose rangeUnderflow/rangeOverflow instead.
- For keyboard 1,05, Chromium ignores comma and yields 105 in all nine tested
  context-locale/lang combinations. Firefox accepts it when lang is ru-RU/de-DE,
  but en-US lang yields badInput and model null. WebKit accepts it for ru-RU/de-DE
  context locale; en-US context yields 105. Bare native inputs behave the same.
  Dot 1.05 works in every tested combination. This is not an OS numpad/layout claim.
- A native value setter containing 1,05 sanitizes to empty in every engine/locale,
  unlike some keyboard paths. Do not use that setter to simulate comma typing.
- Default native step validation reports stepMismatch for 1.05 even though the
  Tæt numeric model accepts it. step:'any' removes that native mismatch.
- A lone minus can have .value equal to an empty string and badInput:true,
  including after blur, in both Tæt and bare controls. The DOM value does not
  necessarily expose the browser's visibly incomplete editor buffer.

At the time of this probe, draft/commit semantics were a pending product decision.
They are now opt-in as documented below; this historical probe still describes
live mode. Applications may retain live clamp, use clamp:false with explicit
validation, or opt into deferred normalization. For comma input, a supported
locale grammar/editor remains a separate decision. Replacing comma in an input
handler is insufficient when the browser has already ignored it. The commit-mode
change does not alter that native locale boundary.

## Opt-in NumberInput commit coverage

The default live cases above remain the baseline. `number-input-commit.spec.js`
and `number-input-commit-owners.spec.js` add tagged browser journeys for deferred
min/max/integer/precision normalization, empty versus bad input, Enter/Tab/blur,
Escape, draft events, API/silent/reset replacement, refresh, spin, veto and
readonly/disabled recovery. Owner cases cover Form, Grid/TreeGrid and PropertyGrid,
including field-only blur, explicit owner save and cancellation/teardown.

The corresponding Node tests in `test/number-input-commit.test.js` and
`test/number-commit-owners.test.js` exercise result statuses, mutation metadata,
normalized validation without commit, nested writes and owner preparation guards.
Installed TS/JSDoc consumers check the closed mode/status unions and factory
options; the compiled browser consumer exercises the public package integration.
These are complementary boundaries, not additive public scenario counts. Actual
command outcomes and engine availability belong in [VERIFICATION](VERIFICATION.md).

Commit validation checks a candidate but never commits; explicit prepareCommit
precedes owner validation/readback. A failed owner validation or veto need not
undo a numeric field write already completed during preparation. Tests must
separately assert the native draft, committed field value and stored row value.
Synthetic composing/default-prevented key guards remain synthetic: commit-mode
coverage expands neither comma-locale support nor native IME certification.

## TextArea composing-key regression

`TextArea._handleKeyDown` now ignores already-prevented events, isComposing and
legacy keyCode229, matching the NumberInput/shortcut guard. This prevents
acceptsReturn:false from invoking enterKey and acceptsTab:true from inserting a
tab while those keys belong to composition. Non-composing behavior is unchanged.

The original four desired assertions from `input-composition-known-gap.spec.js`
are active in `input-composition-keyboard.spec.js`, with no fixme or opt-in flag.
Additional cases check normal keyboard recovery, a host-prevented key, default
native behavior, readonly/disabled rejection and recovery. Native button traversal
uses the existing platform-aware helper; library-handled Tab stays plain Tab.
The spec is included in the focused and three-engine compatibility gates.

Composition flags/events here are synthetic. The subsequent ordinary Enter/Tab
steps use real browser keyboard input, but neither part establishes physical
keyboard or actual native IME candidate behavior. Historical failed probes remain
in VERIFICATION.md as evidence of the defect before this guard correction.

## Mask and temporal editing boundaries

Exploratory reports under test-results/mask-audit-probes and mask-owner-audit
record pre-fix observations, not final passing gates. Keep native text/selection,
normalized field values, value phases and owner store writes separate. Final
commands/results belong in [VERIFICATION](VERIFICATION.md), not additive totals.

- Mask regressions address position-aware insertion/replacement, separator
  deletion, invalid input retaining selection, deletion to empty, bounded keyboard
  Undo/Redo, API/silent/equal-value/reset history boundaries, veto, disabled/
  readonly recovery and callback teardown.
- Default compact-mode untouched-suffix protection rejects incompatible mixed-token compaction and
  capacity overflow. AA-0000 with AB selected in AB-1234 can reject the first X
  of sequential XY. Complete compatible replacement and one-letter replacement
  are distinct paths; tests must not imply sparse slots.
- Literal-only rejected input stays empty. Normalization, including API writes,
  also returns empty when no mask token is accepted. required() remains nonempty validation;
  partial values need an explicit completeness validator. Raw values retain
  alphanumeric mask literals and remove punctuation, as before.
- Form values stay live. Grid/TreeGrid masked text editors keep field changes in
  the edit session until owner commit; Escape cancels and blur alone does not
  write the store. Explicit validators can block partial submit/commit; without
  them completeness is not implied.
- TimeInput preserves native equivalent/partial text and caret with a live
  normalized model. Check authoritative API/reset, blur, stepping and picker
  synchronization separately. Date/DateTime suffix-truncating native edits retain
  prior value/selection; compatible selected replacements and unchanged API
  prefix normalization are separate assertions. None gains updateMode/commitInput.
- Opt-in slots coverage must distinguish compact defaults from fixed-position
  deletion/overwrite/paste, selected-token capacity, malformed positional API
  rejection, raw/formatted round trips with alphanumeric literals and markers,
  Form/Grid preservation and separate completeness rules. Empty model/raw/display
  reads remain empty even while a focused native scaffold supports navigation.
  Check required customError versus valueMissing, external custom-error ownership,
  deferred cleanup while validation is barred, blur and lifecycle separately.
  Slots keep local history and synthetic composition limits, not new native IME,
  context-menu, macOS or system-clipboard guarantees. Actual gate outcomes belong
  in VERIFICATION.md; an inventory of cases is not a passing result.
- Partial-time presentation checks keep unparsed text through blur/API/refresh/
  24-hour mode, avoid selected picker hour/minute/AM/PM markers, and distinguish
  passive OK/Cancel from explicit AM/PM/wheel/step choices. Optional canonical
  HH:mm completeness validation and required() nonempty validation are separate.
  Display preservation does not change the existing permissive parser.
- Mask composition cases are synthetic: normalized live events continue while
  composing DOM is retained until reconciliation. Rejected composition restores
  pre-edit selection, and synthetic missing-compositionstart input is reconciled
  against the accepted value. Actual IME remains unverified.
  Clipboard coverage is limited to the reviewed isolated Chromium backend below,
  not Firefox/WebKit or OS integration. Mask-local keyboard history does not
  certify native context-menu Undo/Redo.

## Adding future regressions

Identify the gesture and intermediate state that made the defect possible.
Prefer extending an existing component/adapter journey over another isolated
happy path. Keep exact event/model assertions and meaningful case names. Tag
the small broadly portable contract with @input-editing and include its spec in
playwright.compat.config.js. Retain API, callback/reentry, installed-package and
bundle tests because they protect different boundaries.