import test from 'node:test';
import assert from 'node:assert/strict';
import { Form } from '../src/ui/Form.js';
import { TextInput } from '../src/ui/TextInput.js';
import { NumberInput } from '../src/ui/NumberInput.js';

function compose(field, nested = false) {
  return nested
    ? new Form().row(new Form({ name: 'outer' }).row(new Form({ name: 'inner' }).row(field)))
    : new Form().row(field);
}

function check(form, operation) {
  return operation === 'validate' ? form.validate().ok
    : operation === 'isValid' ? form.isValid()
    : form.submit({ focusInvalid: false });
}

// Only the native input snapshot is simulated here. Browser tests exercise real
// input events; this suite isolates Form's aggregation and callback lifecycle.
function number(options = {}) {
  const field = new NumberInput({ name: 'amount', value: 1, updateMode: 'commit', ...options });
  field._input = { value: String(field.value.get() ?? ''), validity: { badInput: false } };
  return field;
}

function draft(field, text) {
  field._input.value = text;
  field._handleInput({});
}

for (const nested of [false, true]) {
  for (const operation of ['validate', 'isValid', 'submit']) {
    test(`${nested ? 'nested' : 'direct'} Form ${operation} preserves failure without diagnostics`, t => {
      const field = new TextInput({ name: 'amount', value: '1' });
      field.validate = () => ({ source: field, ok: false, errors: [], value: '1' });
      const form = compose(field, nested);
      t.after(() => form.destroy());
      const seen = [];
      for (const phase of ['validate', 'validationFail', 'submit', 'afterSubmit']) {
        form.events.on(phase, event => seen.push([phase, event]));
      }
      assert.equal(check(form, operation), false);
      assert.deepEqual(seen.map(([phase]) => phase), ['validate', 'validationFail']);
      assert.equal(seen[0][1].ok, false);
      assert.deepEqual(seen[0][1].errors, []);
      assert.deepEqual(seen[1][1].errors, []);
      assert.deepEqual(form.value.get(), { amount: '1' });
    });
  }
}

test('an explicit false result does not depend on an errors property', t => {
  const field = new TextInput({ name: 'amount' });
  field.validate = () => ({ ok: false });
  const form = compose(field);
  t.after(() => form.destroy());
  assert.equal(form.validate().ok, false);
});

for (const childOk of [false, true]) {
  test(`warning diagnostics retain their paths independently of child ok:${childOk}`, t => {
    const field = new TextInput({ name: 'amount', value: '1' });
    const warning = { control: field, path: 'amount.detail', severity: 'warning', message: 'Review this amount', code: 'review' };
    field.validate = () => ({ source: field, ok: childOk, errors: [warning], value: '1' });
    const form = compose(field, true);
    t.after(() => form.destroy());
    const result = form.validate();
    assert.equal(result.ok, childOk);
    assert.deepEqual(result.errors, [warning]);
    assert.equal(form.submit({ focusInvalid: false }), childOk);
  });
}

test('error severity still blocks a result reporting success and supplies missing field paths', t => {
  const field = new TextInput({ name: 'amount' });
  field.validate = () => ({ ok: true, errors: [{ severity: 'error', message: 'Rejected', code: 'range' }] });
  const form = compose(field);
  t.after(() => form.destroy());
  const result = form.validate();
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, [{ control: field, path: 'amount', severity: 'error', message: 'Rejected', code: 'range' }]);
});

test('Form continues validating later fields after a diagnostic-free refusal', t => {
  const first = new TextInput({ name: 'first' });
  first.validate = () => ({ ok: false, errors: [] });
  let later = 0;
  const second = new TextInput({ name: 'second', validators: [() => { ++later; return 'Required'; }] });
  const form = new Form().row(first, second);
  t.after(() => form.destroy());
  const result = form.validate();
  assert.equal(result.ok, false);
  assert.equal(later, 1);
  assert.deepEqual(result.errors.map(error => [error.path, error.message]), [['second', 'Required']]);
});

for (const phase of ['validator', 'onValidate']) {
  for (const nested of [false, true]) {
    for (const operation of ['validate', 'isValid', 'submit']) {
      test(`${nested ? 'nested' : 'direct'} Form ${operation} refuses NumberInput ${phase} supersession`, t => {
        const field = number({ validators: [value => value < 10] });
        if (phase === 'validator') {
          field.setValidators([value => { field.value.set(99, { silent: true }); return value < 10; }]);
        } else {
          field.events.on('validate', () => field.value.set(99, { silent: true }));
        }
        const form = compose(field, nested);
        t.after(() => form.destroy());
        const seen = [];
        for (const event of ['validate', 'validationFail', 'submit', 'afterSubmit']) {
          form.events.on(event, value => seen.push([event, value]));
        }
        assert.equal(check(form, operation), false);
        assert.equal(field.value.get(), 99, 'the callback write is retained');
        assert.deepEqual(seen.map(([event]) => event), ['validate', 'validationFail']);
        assert.deepEqual(seen[0][1].errors, [], 'interruption does not invent a validation message');
        assert.deepEqual(seen[0][1].value, { amount: 99 });
        assert.deepEqual(field.getErrors(), []);
      });
    }
  }
}

for (const change of ['same', 'reset', 'cancel']) {
  test(`Form preserves NumberInput refusal after a validator ${change}`, t => {
    const field = number();
    draft(field, '2');
    field.setValidators([() => {
      if (change === 'same') field.value.set(1, { silent: true });
      else if (change === 'reset') field.value.reset({ silent: true });
      else field.cancelInput({ silent: true });
      return true;
    }]);
    const form = compose(field);
    t.after(() => form.destroy());
    const result = form.validate();
    assert.equal(result.ok, false);
    assert.deepEqual(result.errors, []);
    assert.equal(field.value.get(), 1);
    assert.equal(field.hasPendingInput(), false);
  });
}

for (const phase of ['validator', 'onValidate']) {
  for (const operation of ['validate', 'isValid', 'submit']) {
    test(`reentrant Form ${operation} from NumberInput ${phase} preserves the child refusal`, t => {
      const field = number();
      const form = compose(field, true);
      t.after(() => form.destroy());
      let inner;
      let submitted = 0;
      const reenter = () => { inner = check(form, operation); };
      if (phase === 'validator') field.setValidators([() => { reenter(); return true; }]);
      else field.events.on('validate', reenter);
      form.events.on('submit', () => ++submitted);
      assert.equal(field.validate().ok, true, 'the outer field check itself remains current');
      assert.equal(inner, false);
      assert.equal(submitted, 0);
    });
  }
}

for (const phase of ['validator', 'onValidate']) {
  for (const action of ['destroyField', 'removeField', 'destroyForm']) {
    test(`Form validation stops accepting NumberInput ${phase} ${action}`, t => {
      const field = number();
      const form = compose(field);
      t.after(() => { if (!form.destroyed) form.destroy(); });
      let later = 0;
      const remove = () => {
        if (action === 'destroyField') field.destroy();
        else if (action === 'removeField') form.remove(field);
        else form.destroy();
      };
      if (phase === 'validator') field.setValidators([() => { remove(); return true; }, () => { ++later; return true; }]);
      else field.events.on('validate', remove);
      const result = form.validate();
      assert.equal(result.ok, false);
      assert.deepEqual(result.errors, []);
      assert.deepEqual(result.value, {});
      assert.equal(field.destroyed, true);
      assert.equal(later, 0);
    });
  }
}

for (const operation of ['validate', 'submit']) {
  test(`Form ${operation} skips a later removed field and refuses the changed validation topology`, t => {
    let later = 0;
    const first = number({ name: 'first' });
    const second = number({ name: 'second', validators: [() => { ++later; return true; }] });
    const form = new Form().row(first, second);
    t.after(() => form.destroy());
    first.setValidators([() => { form.remove(second); return true; }]);
    assert.equal(check(form, operation), false);
    assert.equal(later, 0);
    assert.equal(second.destroyed, true);
    assert.deepEqual(form.value.get(), { first: 1 });
  });
}

test('Form reads, validation and destroy never commit a pending NumberInput', t => {
  const field = number();
  draft(field, '2');
  const form = compose(field, true);
  t.after(() => { if (!form.destroyed) form.destroy(); });
  let changes = 0;
  field.events.on('change', () => ++changes);
  assert.deepEqual(form.value.get(), { amount: 1 });
  assert.equal(form.validate().ok, true);
  assert.equal(form.isValid(), true);
  assert.equal(field.value.get(), 1);
  assert.equal(field.hasPendingInput(), true);
  assert.equal(field.isDirty(), false);
  form.destroy();
  assert.equal(field.value.get(), 1);
  assert.equal(changes, 0);
});

test('successful submit retains preparation, validation and notification order', t => {
  const field = number();
  draft(field, '2');
  const form = compose(field, true);
  t.after(() => form.destroy());
  const order = [];
  field.events.on('change', () => order.push('change'));
  field.events.on('validate', () => order.push('fieldValidate'));
  for (const phase of ['beforeSubmit', 'validate', 'submit', 'afterSubmit']) {
    form.events.on(phase, event => { order.push(phase); assert.deepEqual(event.value, { amount: 2 }); });
  }
  assert.equal(form.submit(), true);
  assert.deepEqual(order, ['change', 'beforeSubmit', 'fieldValidate', 'validate', 'submit', 'afterSubmit']);
});

for (const failure of ['veto', 'validation']) {
  test(`a ${failure} refusal does not roll back completed NumberInput preparation`, t => {
    const field = number();
    draft(field, '2');
    const later = new TextInput({ name: 'later', validators: failure === 'validation' ? [() => false] : [] });
    const form = new Form().row(field, later);
    t.after(() => form.destroy());
    if (failure === 'veto') form.events.on('beforeSubmit', event => { event.cancel = true; });
    assert.equal(form.submit({ focusInvalid: false }), false);
    assert.equal(field.value.get(), 2);
    assert.equal(field.hasPendingInput(), false);
  });
}

for (const operation of ['validate', 'isValid', 'submit']) {
  test(`teardown from Form validate event refuses ${operation} without late phases`, () => {
    const field = new TextInput({ name: 'name', value: 'Ada' });
    const form = new Form().row(field);
    const phases = [];
    let emitted;
    form.events.on('validate', event => { emitted = event; phases.push('validate'); form.destroy(); });
    for (const phase of ['validationFail', 'submit', 'afterSubmit']) {
      form.events.on(phase, () => phases.push(phase));
    }
    const result = operation === 'validate' ? form.validate() : check(form, operation);
    assert.equal(form.destroyed, true);
    assert.equal(field.destroyed, true);
    assert.deepEqual(phases, ['validate']);
    assert.equal(emitted.ok, true, 'teardown does not mutate the already emitted result');
    assert.deepEqual(emitted.value, { name: 'Ada' });
    if (operation === 'validate') {
      assert.equal(result.ok, false);
      assert.notEqual(result, emitted);
      assert.deepEqual(result.errors, [], 'teardown does not fabricate an error');
      assert.deepEqual(result.value, { name: 'Ada' }, 'the captured value remains a snapshot');
    } else {
      assert.equal(result, false);
    }
  });
}

test('teardown in validationFail remains a refusal without submit notifications', () => {
  const field = new TextInput({ name: 'name', validators: [() => false] });
  const form = new Form().row(field);
  const phases = [];
  form.events.on('validate', () => phases.push('validate'));
  form.events.on('validationFail', () => { phases.push('validationFail'); form.destroy(); });
  form.events.on('submit', () => phases.push('submit'));
  form.events.on('afterSubmit', () => phases.push('afterSubmit'));
  assert.equal(form.submit(), false);
  assert.equal(form.destroyed, true);
  assert.deepEqual(phases, ['validate', 'validationFail']);
});
