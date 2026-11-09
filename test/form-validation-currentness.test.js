import { validationRevision } from "../src/core/validationRevision.js";
import test from 'node:test';
import assert from 'node:assert/strict';
import { BaseControl } from '../src/core/BaseControl.js';
import { Form } from '../src/ui/Form.js';
import { Panel } from '../src/ui/Panel.js';
import { TextInput } from '../src/ui/TextInput.js';
import { NumberInput } from '../src/ui/NumberInput.js';
import { TimeInput } from '../src/ui/DateTimeInput.js';
import { SelectInput } from '../src/ui/SelectInput.js';
import { MultiSelectDropDown } from '../src/ui/MultiSelectDropDown.js';
import { CodeBlock } from '../src/ui/CodeBlock.js';
import { OptionList } from '../src/ui/OptionList.js';
import { SelectionModel } from '../src/core/SelectionModel.js';

function run(form, operation) {
  return operation === 'validate' ? form.validate().ok
    : operation === 'isValid' ? form.isValid() : form.submit({ focusInvalid: false });
}

for (const kind of ['text', 'liveNumber', 'commitNumber']) {
  for (const phase of ['laterField', 'formValidate']) {
    for (const operation of ['validate', 'isValid', 'submit']) {
      for (const aba of [false, true]) {
        test(`${kind} ${phase} ${aba ? 'ABA' : 'replacement'} refuses ${operation} through nested Forms`, t => {
          const field = kind === 'text' ? new TextInput({ name: 'first', value: '1' })
            : new NumberInput({ name: 'first', value: 1, updateMode: kind === 'commitNumber' ? 'commit' : 'live' });
          const later = new TextInput({ name: 'later', value: 'ok' });
          const nested = new Form({ name: 'nested' }).row(field, later);
          const form = new Form().row(nested);
          t.after(() => form.destroy());
          let changes = 0, checks = 0, submits = 0, afters = 0;
          field.setValidators([() => { ++checks; return true; }]);
          field.events.on('change', () => ++changes);
          form.events.on('submit', () => ++submits);
          form.events.on('afterSubmit', () => ++afters);
          let mutated = false;
          const mutate = () => {
            if (mutated) return;
            mutated = true;
            field.value.set(kind === 'text' ? '9' : 9, { silent: true });
            if (aba) field.value.set(kind === 'text' ? '1' : 1, { silent: true });
          };
          if (phase === 'laterField') later.events.on('validate', mutate);
          else form.events.on('validate', mutate);
          assert.equal(run(form, operation), false);
          assert.equal(checks, 1, 'there is no automatic validation retry');
          assert.equal(changes, 0, 'silent writes stay silent');
          assert.equal(submits, 0);
          assert.equal(afters, 0);
          assert.equal(field.value.get(), kind === 'text' ? aba ? '1' : '9' : aba ? 1 : 9);
          assert.equal(form.submit({ focusInvalid: false }), true, 'a later explicit submit checks the new state');
          assert.equal(checks, 2);
          assert.equal(submits, 1);
        });
      }
    }
  }
}

const builtIns = [
  ['mask', () => new TextInput({ name: 'first', mask: '00', value: '12' }), '34'],
  ['time', () => new TimeInput({ name: 'first', value: '12:00' }), '13:00'],
  ['select', () => new SelectInput({ name: 'first', value: 'a' }), 'b'],
  ['multiSelect', () => new MultiSelectDropDown({ name: 'first', value: ['a'] }), ['b']],
  ['code', () => new CodeBlock({ name: 'first', value: 'a' }), 'b'],
  ['optionList', () => {
    const field = new OptionList({ name: 'first' });
    field.data.parse([{ id: 'a' }, { id: 'b' }]);
    field.value.set('a', { silent: true });
    return field;
  }, 'b']
];
for (const [kind, create, next] of builtIns) {
  test(`${kind} accepted silent ABA cannot evade Form currentness`, t => {
    const field = create();
    const previous = field.value.get();
    const later = new TextInput({ name: 'later', validators: [() => {
      field.value.set(next, { silent: true });
      field.value.set(previous, { silent: true });
      return true;
    }] });
    const form = new Form().row(field, later);
    t.after(() => form.destroy());
    assert.equal(form.submit({ focusInvalid: false }), false);
    assert.deepEqual(field.value.get(), previous);
  });
}

for (const action of ['change', 'cancel', 'sameValue']) {
  test(`NumberInput pending candidate ${action} invalidates a standalone Form validation`, t => {
    const field = new NumberInput({ name: 'first', value: 1, updateMode: 'commit' });
    field._input = { value: '2', validity: { badInput: false } };
    field._handleInput({});
    const later = new TextInput({ name: 'later', validators: [() => {
      if (action === 'change') { field._input.value = '3'; field._handleInput({}); }
      else if (action === 'cancel') field.cancelInput({ silent: true });
      else field.value.set(1, { silent: true });
      return true;
    }] });
    const form = new Form().row(field, later);
    t.after(() => form.destroy());
    const result = form.validate();
    assert.equal(result.ok, false);
    assert.deepEqual(result.errors, []);
    assert.equal(field.value.get(), 1);
  });
}

for (const mutation of ['add', 'remove', 'replace', 'transient', 'rename', 'nestedTransient']) {
  for (const operation of ['validate', 'isValid', 'submit']) {
    test(`Form ${operation} rejects ${mutation} topology changes during validation`, t => {
      const first = new TextInput({ name: 'first', value: '1' });
      const later = new TextInput({ name: 'later', value: '2' });
      const nested = new Form({ name: 'nested' }).row(first, later);
      const form = new Form().row(nested);
      t.after(() => form.destroy());
      first.events.once('validate', () => {
        if (mutation === 'remove') nested.remove(later);
        else if (mutation === 'replace') { nested.remove(later); nested.row(new TextInput({ name: 'later', value: '2' })); }
        else if (mutation === 'rename') later.name = 'renamed';
        else {
          const extra = mutation === 'nestedTransient' ? new Form({ name: 'temporary' }) : new TextInput({ name: 'temporary' });
          nested.row(extra);
          if (mutation !== 'add') nested.remove(extra);
        }
      });
      assert.equal(run(form, operation), false);
    });
  }
}

test('nested plain Panel membership changes cannot evade Form snapshot', t => {
  const first = new TextInput({ name: 'first', value: '1' });
  const panel = new Panel();
  panel.addControl(first);
  const form = new Form().row(panel);
  t.after(() => form.destroy());
  first.events.on('validate', () => {
    const transient = new TextInput({ name: 'temporary' });
    panel.addControl(transient);
    panel.remove(transient);
  });
  assert.equal(form.validate().ok, false);
});

test('no-op addControl does not create a topology interruption', t => {
  const field = new TextInput({ name: 'first' });
  const form = new Form().row(field);
  t.after(() => form.destroy());
  field.events.on('validate', () => form.addControl(field));
  assert.equal(form.submit(), true);
});

for (const action of ['sameValue', 'veto']) {
  test(`ordinary editor ${action} without an accepted write stays valid`, t => {
    const first = new TextInput({ name: 'first', value: '1' });
    const later = new TextInput({ name: 'later' });
    const form = new Form().row(first, later);
    t.after(() => form.destroy());
    if (action === 'veto') first.events.on('beforeChange', event => { event.cancel = true; });
    later.events.on('validate', () => first.value.set(action === 'sameValue' ? '1' : '9'));
    assert.equal(form.submit(), true);
    assert.equal(first.value.get(), '1');
  });
}

test('silent writes from beforeSubmit are included in the validation starting snapshot', t => {
  const field = new TextInput({ name: 'first', value: '1' });
  let checked;
  field.setValidators([value => { checked = value; return true; }]);
  const form = new Form().row(field);
  t.after(() => form.destroy());
  form.events.on('beforeSubmit', () => field.value.set('9', { silent: true }));
  assert.equal(form.submit(), true);
  assert.equal(checked, '9');
});

test('public validate override returning a cloned result cannot evade submit currentness', t => {
  class DerivedForm extends Form {
    validate(context) {
      const result = super.validate(context);
      this.getFields()[0].value.set('9', { silent: true });
      return { ...result };
    }
  }
  const field = new TextInput({ name: 'first', value: '1' });
  const form = new DerivedForm().row(field);
  t.after(() => form.destroy());
  assert.equal(form.submit(), false);
  assert.equal(field.value.get(), '9');
});

test('final submit getter hook cannot publish after silently changing a checked field', t => {
  class ReadbackForm extends Form {
    getValue() {
      const result = super.getValue();
      if (this.mutateReadback) this.getFields()[0].value.set('9', { silent: true });
      return result;
    }
  }
  const field = new TextInput({ name: 'first', value: '1' });
  const form = new ReadbackForm().row(field);
  t.after(() => form.destroy());
  form.events.on('validate', () => { form.mutateReadback = true; });
  let submits = 0;
  form.events.on('submit', () => ++submits);
  assert.equal(form.submit(), false);
  assert.equal(submits, 0);
  assert.equal(field.value.get(), '9');
});

test('a revision-aware custom scalar FormField needs no EditorControl inheritance', t => {
  const field = new BaseControl({ name: 'custom' });
  let value = '1', revision = 0;
  field.value = { get: () => value, set: next => { value = next; ++revision; }, clear: () => { value = ''; ++revision; } };
  field.getValidationRevision = () => revision;
  field.validate = () => ({ ok: true, errors: [], value });
  const later = new TextInput({ name: 'later' });
  const form = new Form().row(field, later);
  t.after(() => form.destroy());
  later.events.on('validate', () => field.value.set('9'));
  assert.equal(form.validate().ok, false);
  assert.equal(value, '9');
});

test('pure custom array getters work with an explicit revision hook', t => {
  const field = new BaseControl({ name: 'custom' });
  let value = ['a'], revision = 0n;
  field.value = { get: () => [...value], set: next => { value = [...next]; ++revision; }, clear: () => { value = []; ++revision; } };
  field.getValidationRevision = () => revision;
  const form = new Form().row(field);
  t.after(() => form.destroy());
  assert.equal(form.submit(), true);
});

test('OptionList detects direct silent selection ABA and selection identity replacement', t => {
  const field = new OptionList({ name: 'first' });
  field.data.parse([{ id: 'a' }, { id: 'b' }]);
  field.value.set('a', { silent: true });
  const oldSelection = field.selection;
  const later = new TextInput({ name: 'later' });
  const form = new Form().row(field, later);
  t.after(() => form.destroy());
  later.events.once('validate', () => {
    field.selection.set([field.data.get('b')], { silent: true });
    field.selection.set([field.data.get('a')], { silent: true });
  });
  assert.equal(form.validate().ok, false);
  later.events.once('validate', () => {
    field.selection = new SelectionModel();
    field.selection.set([field.data.get('a')], { silent: true });
  });
  assert.equal(form.validate().ok, false);
  oldSelection.destroy();
});

test('teardown from the validation value read returns false without late events', () => {
  class ReadbackForm extends Form {
    getValue() {
      const value = super.getValue();
      if (this.closeOnRead) this.destroy();
      return value;
    }
  }
  const field = new TextInput({ name: 'first', value: '1' });
  const form = new ReadbackForm().row(field);
  const events = [];
  field.events.on('validate', () => { form.closeOnRead = true; });
  form.events.on('validate', () => events.push('validate'));
  form.events.on('validationFail', () => events.push('validationFail'));
  assert.equal(form.validate().ok, false);
  assert.equal(form.destroyed, true);
  assert.deepEqual(events, []);
});

test('a validate listener cannot turn a stale snapshot back into a successful result', t => {
  const first = new TextInput({ name: 'first', value: '1' });
  const later = new TextInput({ name: 'later', validators: [() => { first.value.set(first.value.get() === '9' ? '8' : '9', { silent: true }); return true; }] });
  const form = new Form().row(first, later);
  t.after(() => form.destroy());
  form.events.on('validate', event => { event.ok = true; });
  assert.equal(form.validate().ok, false);
  assert.equal(form.submit(), false);
});

for (const action of ['set', 'clear', 'reset']) {
  test(`accepted ${action} during Form validation is detected without relying on public change events`, t => {
    const field = new TextInput({ name: 'first', value: '1' });
    field.setCleanValue('clean');
    const later = new TextInput({ name: 'later' });
    const form = new Form().row(field, later);
    t.after(() => form.destroy());
    let changes = 0;
    field.events.on('change', () => ++changes);
    later.events.once('validate', () => {
      if (action === 'set') field.value.set('9');
      else if (action === 'clear') field.value.clear();
      else field.value.reset();
    });
    assert.equal(form.validate().ok, false);
    assert.equal(changes, 1);
  });
}

test('a vetoed outer write cannot hide accepted nested ABA writes during validation', t => {
  const first = new TextInput({ name: 'first', value: '1' });
  const later = new TextInput({ name: 'later' });
  const form = new Form().row(first, later);
  t.after(() => form.destroy());
  first.events.on('beforeChange', event => {
    first.value.set('2', { silent: true });
    first.value.set('1', { silent: true });
    event.cancel = true;
  });
  later.events.on('validate', () => assert.equal(first.value.set('9'), false));
  assert.equal(form.validate().ok, false);
  assert.equal(first.value.get(), '1');
});

test('snapshot refusal reports no invented diagnostic and stops later field validation', t => {
  const first = new TextInput({ name: 'first', value: '1' });
  const second = new TextInput({ name: 'second' });
  let laterChecks = 0;
  const third = new TextInput({ name: 'third', validators: [() => { ++laterChecks; return 'Do not run'; }] });
  const form = new Form().row(first, second, third);
  t.after(() => form.destroy());
  second.events.on('validate', () => first.value.set('2', { silent: true }));
  const phases = [];
  form.events.on('validate', event => phases.push(['validate', event.ok, event.errors]));
  form.events.on('validationFail', event => phases.push(['validationFail', event.errors]));
  const result = form.validate();
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, []);
  assert.equal(laterChecks, 0);
  assert.deepEqual(phases, [['validate', false, []], ['validationFail', []]]);
});

test('a rejected validationFail callback mutation is retained without automatic retry', t => {
  const first = new TextInput({ name: 'first', value: '1' });
  let checks = 0;
  first.setValidators([() => { ++checks; return false; }]);
  const form = new Form().row(first);
  t.after(() => form.destroy());
  form.events.on('validationFail', () => first.value.set('2', { silent: true }));
  assert.equal(form.submit({ focusInvalid: false }), false);
  assert.equal(checks, 1);
  assert.equal(first.value.get(), '2');
});

test('silent submit still refuses a changed validation snapshot', t => {
  const first = new TextInput({ name: 'first', value: '1' });
  const later = new TextInput({ name: 'later', validators: [() => { first.value.set('9', { silent: true }); return true; }] });
  const form = new Form().row(first, later);
  t.after(() => form.destroy());
  let submitEvents = 0;
  form.events.on('submit', () => ++submitEvents);
  assert.equal(form.submit({ silent: true }), false);
  assert.equal(submitEvents, 0);
});

function customField(tokenKind = 'number') {
  const field = new BaseControl({ name: 'custom' });
  let value = '1';
  let revision = tokenKind === 'bigint' ? 0n : tokenKind === 'symbol' ? Symbol('initial') : 0;
  const write = next => {
    if (Object.is(value, next)) return false;
    value = next;
    revision = tokenKind === 'symbol' ? Symbol('write') : tokenKind === 'bigint' ? revision + 1n : revision + 1;
    return true;
  };
  field.value = Object.freeze({ get: () => value, set: write, clear: () => write('') });
  field.getValidationRevision = () => revision;
  field.validate = () => ({ source: field, ok: true, errors: [], value });
  return field;
}

const badReaders = [
  ['missing', field => { delete field.getValidationRevision; }],
  ['noncallable', field => { field.getValidationRevision = 0; }],
  ['throwing', field => { field.getValidationRevision = () => { throw new Error('reader failed'); }; }],
  ['propertyThrow', field => { Object.defineProperty(field, 'getValidationRevision', { get() { throw new Error('access failed'); } }); }],
  ['unstable', field => { let value = 0; field.getValidationRevision = () => ++value; }],
  ...[undefined, null, true, '1', {}, [], -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, -1n]
    .map((value, index) => [`invalid${index}`, field => { field.getValidationRevision = () => value; }])
];
for (const [kind, install] of badReaders) {
  for (const operation of ['validate', 'isValid', 'submit']) {
    test(`strict custom revision ${kind} refuses ${operation} with one diagnostic sequence`, t => {
      const field = customField();
      install(field);
      let fieldValidations = 0;
      field.validate = () => { ++fieldValidations; return { ok: true, errors: [] }; };
      const form = new Form().row(new Form({ name: 'nested' }).row(field));
      t.after(() => form.destroy());
      const phases = [];
      let failure;
      form.events.on('validate', event => phases.push(['validate', event.ok]));
      form.events.on('validationFail', event => { phases.push(['validationFail']); failure = event; });
      form.events.on('submit', () => phases.push(['submit']));
      form.events.on('afterSubmit', () => phases.push(['afterSubmit']));
      assert.equal(run(form, operation), false);
      assert.equal(fieldValidations, 0);
      assert.deepEqual(phases, [['validate', false], ['validationFail']]);
      assert.equal(failure.errors.length, 1);
      assert.equal(failure.errors[0].code, 'validationRevision');
      assert.equal(failure.errors[0].severity, 'error');
      assert.equal(failure.errors[0].control, field);
      assert.equal(failure.errors[0].path, 'custom');
      assert.match(failure.errors[0].message, /getValidationRevision/);
    });
  }
}

for (const kind of ['number', 'bigint', 'symbol']) {
  for (const phase of ['laterField', 'formValidate']) {
    test(`custom ${kind} hook accepts stable values and rejects silent ABA at ${phase}`, t => {
      const field = customField(kind);
      const valueApi = field.value;
      const later = new TextInput({ name: 'later' });
      const form = new Form().row(field, later);
      t.after(() => form.destroy());
      assert.equal(form.submit(), true);
      const mutate = () => { field.value.set('2', { silent: true }); field.value.set('1', { silent: true }); };
      if (phase === 'laterField') later.events.once('validate', mutate);
      else form.events.once('validate', mutate);
      let failure;
      form.events.on('validationFail', event => { failure = event; });
      assert.equal(form.submit(), false);
      assert.deepEqual(failure.errors, []);
      assert.equal(field.value, valueApi);
      assert.equal(field.value.get(), '1');
      assert.equal(form.submit(), true);
    });
  }
}

for (const kind of ['number', 'bigint']) {
  test(`observed custom ${kind} revision decrease is a protocol error`, t => {
    const field = customField();
    let revision = kind === 'number' ? 2 : 2n;
    field.getValidationRevision = () => revision;
    const later = new TextInput({ name: 'later', validators: [() => { revision = kind === 'number' ? 1 : 1n; return true; }] });
    const form = new Form().row(field, later);
    t.after(() => form.destroy());
    const result = form.validate();
    assert.equal(result.ok, false);
    assert.equal(result.errors[0].code, 'validationRevision');
    assert.match(result.errors[0].message, /decrease/);
  });
}

test('a public constant revision hook cannot suppress the built-in accepted-write stamp', t => {
  const first = new TextInput({ name: 'first', value: '1' });
  first.getValidationRevision = () => 0;
  const later = new TextInput({ name: 'later', validators: [() => {
    first.value.set('2', { silent: true }); first.value.set('1', { silent: true }); return true;
  }] });
  const form = new Form().row(first, later);
  t.after(() => form.destroy());
  const result = form.validate();
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, []);
});

for (const replace of ['reader', 'valueApi']) {
  test(`custom ${replace} identity replacement refuses validation`, t => {
    const field = customField();
    const later = new TextInput({ name: 'later', validators: [() => {
      if (replace === 'reader') field.getValidationRevision = () => 0;
      else field.value = { ...field.value };
      return true;
    }] });
    const form = new Form().row(field, later);
    t.after(() => form.destroy());
    assert.equal(form.validate().ok, false);
  });
}

test('a once-throwing hook cannot recover the same submit proof silently', t => {
  const field = customField();
  let reads = 0;
  field.getValidationRevision = () => { if (++reads === 1) throw new Error('once'); return 0; };
  const form = new Form().row(field);
  t.after(() => form.destroy());
  let failures = 0, submits = 0;
  form.events.on('validationFail', event => { ++failures; assert.equal(event.errors[0].code, 'validationRevision'); });
  form.events.on('submit', () => ++submits);
  assert.equal(form.submit(), false);
  assert.equal(failures, 1);
  assert.equal(submits, 0);
  assert.equal(form.submit(), true);
});

test('strict protocol failure survives a public validate override returning success', t => {
  class DerivedForm extends Form {
    validate() { return { source: this, ok: true, errors: [], value: {} }; }
  }
  const field = customField();
  delete field.getValidationRevision;
  const form = new DerivedForm().row(field);
  t.after(() => form.destroy());
  let failures = 0;
  form.events.on('validationFail', event => { ++failures; assert.equal(event.errors[0].code, 'validationRevision'); });
  assert.equal(form.submit(), false);
  assert.equal(failures, 1);
});

test('a first protocol failure at final payload read emits one validationFail and refuses submit', t => {
  const field = customField();
  let failed = false;
  field.getValidationRevision = () => { if (failed) throw new Error('late'); return 0; };
  class ReadbackForm extends Form {
    getValue() {
      const value = super.getValue();
      if (this.failReadback) failed = true;
      return value;
    }
  }
  const form = new ReadbackForm().row(field);
  t.after(() => { if (!form.destroyed) form.destroy(); });
  form.events.on('validate', () => { form.failReadback = true; });
  let failures = 0;
  form.events.on('validationFail', event => {
    ++failures;
    assert.equal(event.errors[0].code, 'validationRevision');
    assert.equal(form.submit(), false, 'the existing submit guard rejects reentry');
    form.destroy();
  });
  assert.equal(form.submit(), false);
  assert.equal(failures, 1);
  assert.equal(form.destroyed, true);
});

test('revision reader teardown stops quietly without validation or submit phases', () => {
  const field = customField();
  const form = new Form().row(field);
  field.getValidationRevision = () => { form.destroy(); return 0; };
  const phases = [];
  for (const phase of ['validate', 'validationFail', 'submit']) form.events.on(phase, () => phases.push(phase));
  assert.equal(form.submit(), false);
  assert.deepEqual(phases, []);
});

for (const operation of ['validate', 'submit']) {
  test(`revision hook same-Form ${operation} reentry is bounded and does not invalidate a current outer validation`, t => {
    const field = customField();
    const form = new Form().row(field);
    t.after(() => form.destroy());
    const nested = [];
    field.getValidationRevision = () => {
      const result = operation === 'validate' ? form.validate() : form.submit();
      nested.push(result);
      return 0;
    };
    assert.equal(form.validate().ok, true);
    assert.ok(nested.length > 0);
    for (const result of nested) {
      if (operation === 'submit') assert.equal(result, false);
      else {
        assert.equal(result.ok, false);
        assert.deepEqual(result.errors, []);
        assert.deepEqual(result.value, {});
      }
    }
    field.getValidationRevision = () => 0;
    assert.equal(form.validate().ok, true);
    assert.equal(form.submit(), true);
  });
}

test('same-Form validate event reentry has no duplicate phases or hidden value reads', t => {
  const field = customField();
  const form = new Form().row(field);
  t.after(() => form.destroy());
  let validations = 0;
  form.events.on('validate', () => {
    ++validations;
    const result = form.validate();
    assert.equal(result.ok, false);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.value, {});
  });
  assert.equal(form.validate().ok, true);
  assert.equal(validations, 1);
  assert.equal(form.validate().ok, true);
  assert.equal(validations, 2);
});

test('a throwing field validator releases the Form in-flight guard for later validation', t => {
  const field = new TextInput({ name: 'first', validators: [() => { throw new Error('validator failed'); }] });
  const form = new Form().row(field);
  t.after(() => form.destroy());
  assert.throws(() => form.validate(), /validator failed/);
  field.setValidators([]);
  assert.equal(form.validate().ok, true);
  assert.equal(form.submit(), true);
});

test('a once-throwing hook releases the Form guard and requires a fresh validation', t => {
  const field = customField();
  let once = true;
  field.getValidationRevision = () => { if (once) { once = false; throw new Error('once'); } return 0; };
  const form = new Form().row(field);
  t.after(() => form.destroy());
  const first = form.validate();
  assert.equal(first.ok, false);
  assert.equal(first.errors[0].code, 'validationRevision');
  assert.equal(form.validate().ok, true);
});

test('already destroyed Form retains its lifecycle error instead of a recursive-abort result', () => {
  const form = new Form().row(customField());
  form.destroy();
  assert.throws(() => form.validate(), /destroyed control/);
});

test('a throwing public revision accessor cannot be ignored on an automatic built-in field', t => {
  const field = new TextInput({ name: 'first', value: '1' });
  Object.defineProperty(field, 'getValidationRevision', { get() { throw new Error('bad accessor'); } });
  const form = new Form().row(field);
  t.after(() => form.destroy());
  const result = form.validate();
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, 'validationRevision');
});

test('revision reader writes to an earlier built-in field cannot escape the second internal check', t => {
  const first = new TextInput({ name: 'first', value: '1' });
  const custom = customField();
  let mutate = false;
  custom.getValidationRevision = () => {
    if (mutate) { mutate = false; first.value.set('9', { silent: true }); }
    return 0;
  };
  const form = new Form().row(first, custom);
  t.after(() => form.destroy());
  first.events.on('validate', () => { mutate = true; });
  assert.equal(form.validate().ok, false);
  assert.equal(first.value.get(), '9');
});

for (const reenter of ['validate', 'submit']) {
  test(`submit snapshot revision hook ${reenter} reentry cannot duplicate validation or prepare fields`, t => {
    const custom = customField();
    const pending = new NumberInput({ name: 'pending', value: 1, updateMode: 'commit' });
    const form = new Form().row(custom, pending);
    t.after(() => form.destroy());
    let validations = 0, preparations = 0;
    const original = pending.commitInput.bind(pending);
    pending.commitInput = (...args) => { ++preparations; return original(...args); };
    form.events.on('validate', () => ++validations);
    custom.getValidationRevision = () => {
      const nested = reenter === 'validate' ? form.validate() : form.submit();
      assert.equal(reenter === 'validate' ? nested.ok : nested, false);
      return 0;
    };
    assert.equal(form.submit(), true);
    assert.equal(validations, 1);
    assert.equal(preparations, 0);
    assert.equal(form.submit(), true);
    assert.equal(validations, 2);
  });
}

for (const operation of ['validate', 'submit']) {
  test(`revision readers block affected nested Form ${operation} but permit an independent Form`, t => {
    const custom = customField();
    const nested = new Form({ name: 'nested' }).row(custom);
    const form = new Form().row(nested);
    const independent = new Form().row(new TextInput({ name: 'other' }));
    t.after(() => { form.destroy(); independent.destroy(); });
    let nestedEvents = 0, independentEvents = 0;
    nested.events.on('validate', () => ++nestedEvents);
    independent.events.on('validate', () => ++independentEvents);
    custom.getValidationRevision = () => {
      assert.equal(operation === 'validate' ? nested.validate().ok : nested.submit(), false);
      assert.equal(independent.validate().ok, true);
      return 0;
    };
    assert.equal(form.submit(), true);
    assert.equal(nestedEvents, 0);
    assert.ok(independentEvents > 0);
  });
}

test('an independent Form callback still invalidates an affected Form if it writes a participant', t => {
  const first = new TextInput({ name: 'first', value: '1' });
  const custom = customField();
  const form = new Form().row(first, custom);
  const independent = new Form();
  t.after(() => { form.destroy(); independent.destroy(); });
  let mutate = false;
  independent.events.on('validate', () => {
    if (mutate) { mutate = false; first.value.set('9', { silent: true }); }
  });
  custom.getValidationRevision = () => { independent.validate(); return 0; };
  first.events.on('validate', () => { mutate = true; });
  assert.equal(form.validate().ok, false);
  assert.equal(first.value.get(), '9');
});

for (const target of ['field', 'form']) {
  test(`public revision accessor ${target} teardown never invokes the returned reader`, () => {
    const field = customField();
    const form = new Form().row(field);
    let late = 0;
    const phases = [];
    form.events.on('validate', event => phases.push(['validate', event.ok, event.errors.length]));
    form.events.on('validationFail', event => phases.push(['validationFail', event.errors.length]));
    Object.defineProperty(field, 'getValidationRevision', { get() {
      if (target === 'field') field.destroy(); else form.destroy();
      return () => { ++late; return 0; };
    } });
    try {
      const result = form.validate();
      assert.equal(result.ok, false);
      assert.deepEqual(result.errors, []);
      assert.equal(late, 0);
      assert.equal(form._validating, false);
      assert.ok(!form._readingValidationRevision);
      assert.deepEqual(phases, target === 'form' ? [] : [['validate', false, 0], ['validationFail', 0]]);
    } finally { if (!form.destroyed) form.destroy(); }
  });
}

for (const target of ['field', 'form']) {
  for (const phase of ['lookup', 'call']) {
    test(`internal revision ${phase} ${target} teardown stops before returned work`, () => {
      const field = new TextInput({ name: 'first', value: '1' });
      const form = new Form().row(field);
      let late = 0;
      const close = () => { if (target === 'field') field.destroy(); else form.destroy(); };
      if (phase === 'lookup') {
        Object.defineProperty(field, validationRevision, { get() {
          close();
          return () => { ++late; return 0; };
        } });
      } else {
        field[validationRevision] = () => {
          close();
          return new Proxy([], { get(value, property) {
            if (property === Symbol.iterator) ++late;
            return Reflect.get(value, property);
          } });
        };
      }
      try {
        const result = form.validate();
        assert.equal(result.ok, false);
        assert.deepEqual(result.errors, []);
        assert.equal(late, 0);
        assert.equal(form._validating, false);
        assert.ok(!form._readingValidationRevision);
      } finally { if (!form.destroyed) form.destroy(); }
    });
  }
}

for (const target of ['field', 'form']) {
  for (const silent of [false, true]) {
    test(`initial submit read ${target} teardown is quiet with silent:${silent}`, () => {
      let field;
      class CloseOnRead extends Form {
        getValue() {
          const value = super.getValue();
          if (this.closeOnRead) {
            if (target === 'form') this.destroy(); else field.destroy();
          }
          return value;
        }
      }
      field = new TextInput({ name: 'first', value: '1' });
      const form = new CloseOnRead().row(field);
      const phases = [];
      for (const phase of ['beforeSubmit', 'validate', 'validationFail', 'submit', 'afterSubmit']) {
        form.events.on(phase, () => phases.push(phase));
      }
      form.closeOnRead = true;
      try {
        assert.equal(form.submit({ silent }), false);
        assert.deepEqual(phases, []);
        assert.equal(form._submitting, false);
      } finally { if (!form.destroyed) form.destroy(); }
    });
  }
}
