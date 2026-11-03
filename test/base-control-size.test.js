import assert from 'node:assert/strict';
import test from 'node:test';
import { BaseControl } from '../src/core/BaseControl.js';

test('setSize accepts positional null dimensions and preserves resize metadata', () => {
  const control = new BaseControl({ width: 120, height: 80 });
  const events = [];
  control.events.on('resize', event => events.push(event));
  assert.equal(control.setSize(200, null, { origin: 'restore', userAction: true }), control);
  assert.deepEqual(control.getSize(), { width: 200, height: null });
  assert.equal(events.length, 1);
  assert.deepEqual(events[0].oldSize, { width: 120, height: 80 });
  assert.deepEqual(events[0].newSize, { width: 200, height: null });
  assert.equal(events[0].origin, 'restore');
  assert.equal(events[0].userAction, true);
  control.setSize(null, null, { silent: true });
  assert.deepEqual(control.getSize(), { width: null, height: null });
  assert.equal(events.length, 1);
  control.setSize({ width: '50%', height: 30 });
  control.setSize(undefined, null);
  assert.deepEqual(control.getSize(), { width: '50%', height: null });
  control.setSize(100, { silent: true });
  assert.deepEqual(control.getSize(), { width: 100, height: null });
  control.setSize({ height: null }, { silent: true });
  assert.equal(events.length, 3);
  control.destroy();
});
