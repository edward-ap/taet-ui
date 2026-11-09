import test from 'node:test';
import assert from 'node:assert/strict';

const phases = ['beforeChange', 'change', 'afterChange'];

// Adapters provide public model values and choice-specific event assertions.
export function testValueTeardown({ name, create, oldValue, newValue, assertEvent }) {
  for (const phase of phases) {
    test(name(phase), t => {
      const control = create();
      t.after(() => { if (!control.destroyed) control.destroy(); });
      control.setValidators([() => 'Existing error']);
      assert.equal(control.validate().ok, false);
      const seen = [];
      for (const type of [...phases, 'dirtyChange']) control.events.on(type, event => {
        seen.push(type);
        assert.equal(event.source, control);
        if (type !== 'dirtyChange') {
          assert.deepEqual(event.oldValue, oldValue);
          assert.deepEqual(event.newValue, newValue);
          assertEvent?.(event, control);
        }
        if (type === phase) control.destroy();
      });
      assert.equal(control.value.set(newValue), phase !== 'beforeChange');
      assert.deepEqual(control.value.get(), phase === 'beforeChange' ? oldValue : newValue);
      assert.equal(control.destroyed, true);
      assert.deepEqual(seen, phases.slice(0, phases.indexOf(phase) + 1));
      assert.deepEqual(control.getErrors(), []);
    });
  }
}