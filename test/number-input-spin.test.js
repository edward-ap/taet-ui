import test from 'node:test';
import assert from 'node:assert/strict';
import { NumberInput } from '../src/ui/NumberInput.js';

for (const [options, next] of [[{}, 5], [{ increment: 0.5 }, 4.5]]) {
  test(`NumberInput step any spins by ${options.increment ?? 1} instead of clearing its value`, () => {
    const input = new NumberInput({ value: 4, step: 'any', ...options });
    const changes = [];
    input.events.on('change', event => changes.push(event.newValue));
    assert.equal(input.spinUp(), true);
    assert.equal(input.value.get(), next);
    assert.equal(input.spinDown(), true);
    assert.equal(input.value.get(), 4);
    assert.deepEqual(changes, [next, 4]);
    input.destroy();
  });
}
