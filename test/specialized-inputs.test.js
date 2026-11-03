import test from 'node:test';
import assert from 'node:assert/strict';
import { FilePicker, TrackBar } from '../src/ui/inputs.js';

test('FilePicker dirty state compares metadata fields and reset restores the baseline', () => {
  for (const multiple of [false, true]) {
    const field = new FilePicker({ multiple, value: multiple ? ['a.txt'] : 'a.txt' });
    assert.equal(field.isDirty(), false);
    field.value.set(multiple ? ['b.txt'] : 'b.txt'); assert.equal(field.isDirty(), true);
    field.value.reset(); assert.equal(field.isDirty(), false);
    field.value.set(multiple ? ['a.txt'] : 'a.txt'); assert.equal(field.isDirty(), false);
    field.destroy();
  }
});
test('TrackBar preserves fractional minima and scientific-notation step precision', () => {
  const fraction = new TrackBar({ min: 0.25, max: 1.25, step: 0.5, value: 0.25 });
  assert.equal(fraction.value.get(), 0.25); fraction.moveRight(); assert.equal(fraction.value.get(), 0.75);
  const tiny = new TrackBar({ min: 0, max: 1e-5, step: 1e-7, value: 3e-7 });
  assert.equal(tiny.value.get(), 3e-7); tiny.moveRight(); assert.equal(tiny.value.get(), 4e-7);
  fraction.destroy(); tiny.destroy();
});
test('TrackBar clear targets the current minimum after lowering the range', () => {
  const field = new TrackBar({ min: 40, max: 100, value: 50 });
  assert.equal(field.setRange(0, 100), false);
  field.value.clear(); assert.equal(field.value.get(), 0); field.destroy();
});
