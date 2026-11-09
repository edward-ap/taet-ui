# Change an existing screen

Exact [editor](../src/ui/EditorControl.d.ts) and
[container](../src/ui/container-contracts.d.ts) declarations are authoritative.

~~~js
import {Panel,Form,TextInput,CheckBox} from 'taet-ui/components';
const name=new TextInput({name:'name',label:'Customer',value:'Ada'});
const active=new CheckBox({name:'active',text:'Active',value:true});
const form=new Form().row(name).row(active);
const screen=new Panel('#app').add(form);
name.setLabel('Account owner');
form.setReadOnly(true);
form.value.set({name:'Ed'},{silent:true,origin:'import'});
const email=new TextInput({name:'email',label:'Email',readOnly:true});
form.row(email);
form.remove(email);
form.value.set({name:'Grace',email:'ignored'},{silent:true});
export function destroy(){screen.destroy();}
~~~

| Intent | Operation |
| --- | --- |
| Field values | value.get/set/clear/reset |
| Input / button caption | setLabel / setText |
| Readonly / disabled | setReadOnly / enable or disable |
| Collection replacement | data.parse |
| Grouped writes | data.batch; mutate through add/update/remove/clear |
| Form composition | row/columns; remove destroys and forgets the slot/value |
| Direct owned child teardown | child.destroy detaches; Form forgets it |
| Clear values / remove all controls | form.value.clear / form.clear |
| Accept clean baseline | form.setCleanValue(form.value.get()) |
| External service teardown | screen.disposables.add(() => service.destroy()) |

Partial load changes supplied known fields only. Silent load synchronizes editors
without value/form change events and does not mark data clean automatically.
Form.row/col/columns and Toolbar.add support composition before mount.
A plain Panel.add/attach requires a mounted Panel: pass its constructor host or
call mount before adding children. The Toolbar exception does not apply to Panel.

Form claims ownership/keys before mount. One child cannot occupy two slots or
belong to another owner. Duplicate keys fail before state changes. Removing the
last field removes its row. Recreate a control to reuse its name; never remount a
destroyed control. Stop application work when a callback closes the owner.

[Runnable form](../examples/basic-form/index.html) and
[browser regressions](../browser-tests/foundation-regressions.spec.js).


Mount callbacks may change ownership or claim another key reentrantly. If attach
then rejects, it destroys a control newly mounted by that attempt only when the
control is still unowned. Recreate that rejected control. A control mounted before
the attempt, or accepted by another owner, is preserved. This is transient cleanup,
not rollback of arbitrary application callback side effects.

Callback-triggered field removal is respected by active value/validation batches.
Closing an owner stops child composition, readonly notification and resize fanout.
Removed field subscriptions are disposed and removed from active cleanup storage;
repeatedly replacing optional fields does not retain each former field until close.

## Saving a pending NumberInput

`new NumberInput({ name: 'quantity', min: 10, updateMode: 'commit' })` opts into
native drafts without changing the default live policy. While typing, Form value
reads and dirty state still describe committed fields. Form.validate checks the
numeric candidate without committing it; do not treat a getter or validation as
an implicit save. Form.submit explicitly prepares pending fields (also through
nested forms), then runs beforeSubmit and validation. A refused numeric commit
returns false; focusInvalid:false disables its invalid-field focus request.

A beforeSubmit veto or a later invalid field does not undo already completed
field commits. This is not an atomic transaction across the Form. Submission
stops if callbacks remove/replace fields, destroy an owner, or introduce another
pending draft; recursive submission is refused. A disabled/readonly field with a
pending draft blocks saving instead of submitting its older value. Unlock and
finish it, cancelInput, or deliberately replace it with an API value.

API/silent value.set, clear and reset replace the draft immediately, including
same-value writes. Refresh retains it; merely changing disabled/readonly state
retains it too. Standalone Enter and blur commit the field, Escape cancels pending
input, and destroy never commits. For a custom save action call commitInput and
inspect its structured ok result, then validate before reading/saving. Read
[NumberInput](INPUT_TYPES.md#numberinput) for event, normalization and refusal details.
