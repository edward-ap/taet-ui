import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import compatibility from '../playwright.compat.config.js';

test('tagged editor journeys stay in the three-engine compatibility gate', async () => {
  const directory = new URL('../browser-tests/', import.meta.url);
  const tagged = [];
  for (const name of await readdir(directory)) {
    if (!name.endsWith('.spec.js')) continue;
    // Conservative: even a spec mentioning this contract must be selected.
    if ((await readFile(new URL(name, directory), 'utf8')).includes('@input-editing')) tagged.push(name);
  }
  for (const required of [
    'number-input-decimal-entry.spec.js', 'number-input-commit.spec.js',
    'number-input-commit-owners.spec.js', 'input-editing-contract.spec.js',
    'input-keyboard-history.spec.js', 'input-composition-lifecycle.spec.js',
    'input-composition-keyboard.spec.js',
    'masked-input.spec.js', 'masked-editing-regressions.spec.js', 'masked-owner-regressions.spec.js', 'masked-slots-editing.spec.js', 'masked-slots-owners.spec.js',
    'date-time-editing.spec.js', 'date-time-editing-owners.spec.js', 'time-input-partial-display.spec.js', 'editor-invariant-contract.spec.js',
    'grid-editor-matrix.spec.js', 'grid-editor-demo.spec.js', 'keyboard-acceptance.spec.js'
  ]) assert.ok(tagged.includes(required), required + ' lost its focused editor contract tag');
  for (const name of tagged) {
    assert.ok(compatibility.testMatch.includes(name), name + ' has editor contracts but is absent from compatibility.testMatch');
  }
  assert.deepEqual(compatibility.projects.map(project => project.use.browserName).sort(),
    ['chromium', 'firefox', 'webkit']);
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.match(manifest.scripts['test:inputs'], /playwright\.compat\.config\.js --grep @input-editing/);
});

test('isolated clipboard remains an explicit Chromium gate', async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.match(manifest.scripts['test:input-clipboard'],
    /playwright\.compat\.config\.js --project chromium --grep @input-clipboard/);
  assert.ok(compatibility.testMatch.includes('input-isolated-clipboard.spec.js'));
  const spec = await readFile(new URL('../browser-tests/input-isolated-clipboard.spec.js', import.meta.url), 'utf8');
  assert.ok(spec.includes('@input-clipboard'));
});
