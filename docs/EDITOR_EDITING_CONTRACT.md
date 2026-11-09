# Editor editing contract

This is the short normative center for current input/owner behavior. **Must** and
**must not** describe consumer and adapter obligations. Current guarantees and
remaining policy choices are identified separately. Exact signatures remain in
[EditorControl](../src/ui/EditorControl.d.ts),
[NumberInput](../src/ui/NumberInput.d.ts), [Form](../src/ui/container-contracts.d.ts)
and [cell editors](../src/ui/grid-editor-contracts.d.ts).

## 1. Name the value and its owner

- **Native edit state** is DOM text, selection and composition state. It need not
  equal public value or even reveal the browser's visible incomplete buffer.
- **Accepted control value** is value.get(). Live editors update it during input;
  commit-mode NumberInput keeps its last committed number/null until completion.
  Its pending native draft is separate; hasPendingInput()/draftChange expose only
  their declared information. Raw/display getters still describe accepted value.
- **Popup pending value** is a picker's temporary selection/preview before OK.
  Time/DateTime picker staging is not a generic deferred-input API. Direct typing
  remains live. Picker Cancel discards its preview, not earlier accepted typing.
- **Owner/session value** is the live editor's local value during a staged Grid,
  TreeGrid or PropertyGrid edit. **Stored value** is the row/property written by
  that owner. They can differ even after the numeric field commits on blur.
  Form.value.get() instead collects current fields; it is not a saved snapshot.

Consumers must not substitute DOM text, popup preview or a cell draft for stored
application data. For example, numeric DOM 1.0 can accompany accepted number 1;
TimeInput text 1: remains partial through passive blur/refresh, without invented
AM. An explicit picker/step choice may complete it. Slots value __-1234 retains
holes when serialized; a wholly empty focused scaffold is DOM-only, with public
value/raw/display all ''. See [component details](INPUT_TYPES.md).

## 2. Read, validate, complete, cancel

Getters must not complete drafts. validate() checks synchronously without
committing; it may update error UI and dispatch validate. It is not side-effect-free.
In commit-mode NumberInput it checks the normalized pending candidate; otherwise
it checks accepted value. isValid() invokes validation, not a cached boolean.

Among built-in inputs, only NumberInput offers updateMode: 'commit', commitInput(),
cancelInput() and hasPendingInput(). commitInput() normalizes acceptable numeric
text and completes the field; it does not enforce application validators on valid
numeric text. Invalid native input is rejected rather than treated as empty null.
No pending draft means successful unchanged completion. cancelInput() restores
accepted display without undoing a completed write. API set/clear/reset replace
its pending draft, including silent/equal writes; refresh retains that draft.

Native required/range/step validity and application validators are separate.
required:true installs no application rule; required() tests nonempty value, not
mask/time completeness. A slots scaffold uses owned native customError, not
valueMissing. NumberInput can accept a fraction while native stepMismatch is true.
Consumers must choose explicit completeness/range rules for owner saves.

Destroy must release owned editing resources, discard pending input and stop
later phases; it must not save a draft. Base field value reads retain last value
but mutations/validation reject after destruction. Numeric commitInput() instead
returns destroyed, cancelInput() returns false; a destroyed ControlCellEditor
rejects its getters too. These are distinct APIs, not interchangeable cleanup hooks.

## 3. Operation outcome is not diagnostic text

Distinguish **completed change**, **unchanged success**, **rejection** and
**interruption**.
These are explanatory categories, not a new result enum. Existing boolean field
writes conflate unchanged/veto/rejection as false; owner booleans are not a common
transaction result. Do not invent status fields on them.

NumberInputCommitResult supplies ok, changed, status and current accepted value.
Only committed/unchanged are ok. invalid/vetoed/readonly/disabled reject;
destroyed/superseded interrupt. changed can be true when a later callback
interrupts an already accepted write. Consumers continuing an owner save must
check ok, not changed. No status rolls back callback effects or completed writes.

An explicit validation ok:false must survive independently of errors. An
interrupted result can be { ok: false, errors: [] }; warnings alone need not fail.
Never infer success from an empty message list or fabricate an interruption error.
Form also rejects error-severity diagnostics even if a child reports ok:true.

### Implemented Form corrections

Form.validate() must retain any child result.ok === false alongside severity-based
error aggregation, even with no diagnostics. It must not promote an interrupted
child validation to success. Form.submit() therefore stops when a commit-mode
number's validate listener silently replaces 1 with 99: that field reports false
although errors is empty. The replacement 99 remains accepted; there is no rollback.
Tracked cross-field changes now also refuse Form.validate()/isValid()/submit():
a=1 passes <=10, then a later field or Form validate listener sets a=99 silently.
The current attempt fails; 99 remains. A later explicit submit validates again,
with no automatic retry or rollback. The currentness scope is below.

Teardown during Form's own validate dispatch returns a new ok:false result with
the captured value/errors and no later validationFail. An emitted result is not
retroactively mutated; its captured listeners may finish. Use the returned result,
not an earlier event snapshot, to decide whether validation completed.

## 4. Owner preparation and currentness

For staged Grid/TreeGrid/PropertyGrid commits, the order is optional
prepareCommit -> validate -> getValue -> owner veto/write -> completion.
ControlCellEditor.prepareCommit forwards to optional control.commitInput, otherwise
succeeds. Custom adapters must not hide completion in getters, validation or destroy.
A failed prepare/validation blocks the owner write. Field-only blur never saves a
Grid/TreeGrid row. Owner cancel discards its session, leaving stored value intact.
PropertyGrid inline controls instead start an attempt on an ordinary control
change. Stale validation/final-read work leaves callback state editable without
an owner property write. Only a still-current ordinary inline veto silently
restores the old field value; a newer callback value/candidate is not rolled back.

Form.submit() prepares pending fields (including nested forms), then beforeSubmit,
validation and submit/afterSubmit. Preparation can commit an early field before a
later field fails or beforeSubmit vetoes. There is no all-or-nothing rollback.
Submission itself is notification, not persistence to an external service. Form
validates flattened leaf fields; outer validation does not recursively dispatch
each nested Form's validate event.

Currentness is scoped, not global. Commit-mode NumberInput uses an internal input
revision across input/API replacement/cancel/destroy and callback boundaries;
stale validate/commit work cannot report success or continue its later phases.
Grid/TreeGrid capture editor/control revisions after preparation and check them
before/after validation and after final getValue(), alongside session/record/column
and lifetime guards. Accepted or pending-candidate changes, including silent ABA,
refuse this commit without rollback/retry. A surviving mounted session retains
callback changes for another explicit attempt; temporary clipboard/toggle editors
are still destroyed. The trusted beforeCellChange override follows these value
checks and is not revalidated. PropertyGrid staged/inline attempts use the same
revision protocol and also check after beforePropertyChange: it is a veto hook,
not a trusted newValue override. They retain the current editor after refusal
unless a callback removed it. Inline retry requires another ordinary control
change; commitEdit is the staged-session path. Their session/row/state checks
and reentry guards remain scoped to the affected owner.
Form captures participant identity/key/parent/value API and supported container
membership revisions. Built-in accepted writes are tracked, including silent
A -> B -> A changes; commit-mode numeric input revisions also cover changing or
cancelling a pending candidate. It checks currentness between field validations,
after Form validation callbacks and before emitting the submit payload. Submit
captures its validation boundary after preparation/beforeSubmit and retains the
public validate() call. Recursive submit and unresolved pending input still block.
Recursive same-Form validation refuses without field reads/events. During custom
revision lookup/read, captured nested Forms are guarded too and submit refuses
before preparing drafts. Independent Forms remain available; these guards do not
invalidate an otherwise unchanged outer validation.
Structural ABA tracking covers supported Panel/Form membership APIs only, whereas
parent/key/value API identities are checked at boundaries and do not cover direct
name/value API replace-and-restore or private mutations.

These are bounded checks of tracked values and participants, not frozen data,
rollback or global transaction isolation. The cooperative custom hook below does
not turn standalone plain/live validation into a universally guarded operation.

See [owner protocol and lifecycle](GRID_EDITOR_TYPES.md) and
[Form mutation rules](MUTATIONS.md) for the exact supported paths.

## 5. Events, silence and reentry

Ordinary accepted field writes dispatch beforeChange (cancellable), write/sync,
change, afterChange and conditional dirtyChange. Field beforeChange.newValue is
a readonly snapshot, not a value override. Silent supported mutations still
synchronize value/UI/dirty state, but skip semantic value events including veto
phases. Silent owner save still prepares and validates; validation callbacks run.

After a callback destroys/cancels/replaces the relevant guarded owner/session,
later stale phases must stop. A write already accepted stays accepted. EventBus
uses a snapshot for the current dispatch: remaining listeners in that phase can
still run. Applications must not assume that destroy retracts callbacks already
being dispatched, or that exceptions roll back their effects. Owners release
owned controls, popup DOM/listeners and session resources; borrowed application
services remain application-owned. Replacement sessions must survive old cleanup.

## 6. Strict custom fields and cell editors

Form.validate()/isValid()/submit(), Grid/TreeGrid commit paths and PropertyGrid
staged/inline propagation require observable currentness for validated values.
The recommended path is an EditorControl subclass using its inherited accepted
value pipeline. A widget displays that value and sends edits through value.set;
it must not become an untracked source polled by _getValue(). Built-in tracking
then works without adding a public method to EditorControl.

An independent custom field must provide getValidationRevision(): number | bigint | symbol.
The getter must be pure, synchronous and stable between writes. Advance a stored
token at every accepted-value or validation-candidate change, before rendering or
post-write callbacks, including silent A -> B -> A changes. Use a nonnegative safe
integer/increasing nonnegative bigint, or a fresh symbol that is never reused.
Do not return a value hash or create a symbol during reads. Revision/value getters
and validation must not commit hidden drafts; completion remains explicit.

Missing, noncallable, invalid, unstable or throwing revision readers, and observed
counter decreases, fail closed. Form reports code validationRevision with control
and path. Tables reject with reason validation-revision and validation errors
identifying the offending editor/control through source. A valid token change
instead interrupts the attempt; tables use validation-stale with errors:[], not
a fabricated diagnostic. Callback writes remain and retry is explicit. An explicit
public hook adds checks and cannot bypass built-in currentness checks.

The structural FormField value API is unchanged, including custom void-returning
setters. getFields() still returns FormField[], not a claim that every field has
a public hook. Strict validation rejects legacy untracked fields at runtime.
Independent CellEditor/GridValueControl state uses the same public hook, optional
in declarations but required for strict runtime commits. ControlCellEditor retains
its owned control's automatic tracking without a new public built-in method.
Existing method/value return types are unchanged. See
[migration and checked recipe](INPUT_TYPES.md#custom-fields-in-strict-form-validation)
and [table revision details](GRID_EDITOR_TYPES.md#validation-currentness-and-custom-revisions).

## 7. Remaining policy and evidence boundaries

- **Nested live writes:** plain/live beforeChange may perform a nested value.set
  and then let the outer write win. Commit-mode NumberInput supersedes the outer
  attempt instead. Should other editors adopt that policy? No unification is
  implied by this contract or by specialized caret/composition synchronization.
- **Grid value override:** beforeCellChange may replace a validated newValue as a
  trusted application hook. Should the override be revalidated? Today it is not.
  Field beforeChange and PropertyGrid beforePropertyChange are not this override API.

Inheritance or hook presence alone does not prove implementation correctness.
Protected getter/setter/validation-value overrides must preserve the inherited
contract or report independent changes through a complete hook. Mutable aliases,
validator closures/context, rule/configuration changes and external choice data
are not automatically observed. A dishonest constant token or hidden change and
restore cannot be certified. Custom getters must remain pure; own/copy immutable
domain values where needed and keep validation callbacks read-only when possible.

Shared currentness tracking does not create an EditorTransactionManager or a
common public operation result. Parsing, caret, mask history and popup staging
remain specialized; reuse requires evidence from the component adapters.

[Test strategy](INPUT_TESTING.md) distinguishes model, real-browser gesture and
synthetic-event evidence; [verification](VERIFICATION.md) records actual runs.
Nothing here certifies real IME, macOS/native hosts, native context-menu history
or the system clipboard.
