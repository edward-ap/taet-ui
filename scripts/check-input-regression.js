import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, realpath, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTestServer } from './test-server.js';

// Reproduce the old decimal-normalization defect only in a disposable source
// snapshot. The checkout is never patched, reverted or restored by this check.
// Keep results, the exact mutant and JSON reports for inspection.
const root = fileURLToPath(new URL('../', import.meta.url));
const sourceFile = path.join(root, 'src/ui/NumberInput.js');
const targets = [
  { file: 'number-input-decimal-entry.spec.js', title: 'NumberInput emits the completed decimal without an event for its equal-valued prefix', expected: /toHaveValue[\s\S]*1\.0/ },
  { file: 'grid-editor-matrix.spec.js', title: 'Grid number actual input preserves typed commit cancel and parse', expected: /toHaveValue[\s\S]*1\.0/ },
  { file: 'grid-editor-matrix.spec.js', title: 'TreeGrid number actual input preserves typed commit cancel and parse', expected: /toHaveValue[\s\S]*1\.0/ },
  { file: 'grid-editor-demo.spec.js', title: 'matrix shows raw types, formatter-independent number drafts and exactly one write per commit', expected: /toHaveValue[\s\S]*1\.0/ },
  { file: 'keyboard-acceptance.spec.js', title: 'Dialog Form supports keyboard text, decimal, choice, checkbox, focus trap and return to opener', expected: /toHaveValue[\s\S]*1\.0/ }
];
// These fixed titles contain no regular-expression operators.
const grep = targets.map(target => target.title).join('|');
const engines = process.argv.includes('--all-engines') ? ['chromium', 'firefox', 'webkit'] : ['chromium'];
const unknown = process.argv.slice(2).filter(argument => argument !== '--all-engines');
if (unknown.length) throw new Error('Usage: node scripts/check-input-regression.js [--all-engines]');

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const original = await readFile(sourceFile);
const beforeHash = digest(original);
const temporaryRoot = await realpath(tmpdir());
const snapshot = await mkdtemp(path.join(temporaryRoot, 'taet-input-regression-'));
const report = { sourceSha256: beforeHash, snapshot, engines, targets: targets.map(target => target.title), results: [] };
let server;

function run(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('exit', code => resolve({ code, stdout, stderr }));
  });
}

function cases(suites) {
  return suites.flatMap(suite => [
    ...(suite.specs ?? []).flatMap(spec => spec.tests.map(test => ({ title: spec.title, ...test }))),
    ...cases(suite.suites ?? [])
  ]);
}

async function check(engine, phase, port) {
  const output = path.join(snapshot, 'results', engine, phase);
  await mkdir(output, { recursive: true });
  const execution = await run([
    path.join(root, 'node_modules/@playwright/test/cli.js'), 'test',
    '--config', 'playwright.compat.config.js',
    '--project', engine, '--workers', '1', '--retries', '0', '--reporter', 'json',
    '--output', output, ...new Set(targets.map(target => target.file)), '--grep', grep
  ], { ...process.env, TAET_UI_TEST_SERVER: '1', TAET_UI_PORT: String(port) });
  await writeFile(path.join(output, 'report.json'), execution.stdout);
  await writeFile(path.join(output, 'stderr.txt'), execution.stderr);
  let parsed;
  try { parsed = JSON.parse(execution.stdout); }
  catch { throw new Error(engine + '/' + phase + ': Playwright produced no valid JSON report; see ' + output); }
  const selected = cases(parsed.suites ?? []);
  assert.equal(selected.length, targets.length, engine + '/' + phase + ': every requested regression must be selected');
  assert.deepEqual(selected.map(test => test.title).sort(), targets.map(target => target.title).sort());
  if (phase === 'baseline') assert.equal(execution.code, 0, engine + ': unchanged snapshot must pass first');
  else assert.notEqual(execution.code, 0, engine + ': old normalization defect unexpectedly survived');
  for (const selectedTest of selected) {
    const target = targets.find(target => target.title === selectedTest.title);
    const result = selectedTest.results.at(-1);
    assert.ok(result, engine + '/' + phase + ': regression did not run');
    const messages = (result.errors ?? (result.error ? [result.error] : [])).map(error => error.message ?? '');
    report.results.push({ engine, phase, title: target.title, exitCode: execution.code,
      status: result.status, errors: messages, output });
    if (phase === 'baseline') assert.equal(result.status, 'passed', target.title);
    else {
      assert.equal(result.status, 'failed', target.title + ': timeout/interruption is not a killed mutation');
      assert.ok(messages.some(message => {
        const plain = message.replace(/\u001b\[[0-9;]*m/g, '');
        return target.expected.test(plain) && /Expected(?: string)?:\s*"1\.0"/.test(plain) &&
          /Received(?: string)?:\s*"1"/.test(plain) && !/element\(s\) not found/.test(plain);
      }),
        target.title + ': failure must be the expected decimal value assertion, not a loading/setup error');
    }
  }
  console.log(engine + '/' + phase + ': ' + selected.length +
    (phase === 'mutant' ? ' expected decimal assertion failures' : ' passed'));

}

try {
  await cp(path.join(root, 'src'), path.join(snapshot, 'src'), { recursive: true });
  await mkdir(path.join(snapshot, 'browser-tests'));
  await cp(path.join(root, 'browser-tests/recipes.html'), path.join(snapshot, 'browser-tests/recipes.html'));
  await mkdir(path.join(snapshot, 'examples'));
  await cp(path.join(root, 'examples/grid-editors'), path.join(snapshot, 'examples/grid-editors'), { recursive: true });
  await mkdir(path.join(snapshot, 'examples/ai-recipes'));
  await cp(path.join(root, 'examples/ai-recipes/11-grid-editor-matrix.js'), path.join(snapshot, 'examples/ai-recipes/11-grid-editor-matrix.js'));
  const snapshotSource = path.join(snapshot, 'src/ui/NumberInput.js');
  assert.equal(digest(await readFile(snapshotSource)), beforeHash, 'Source changed while snapshot was copied');
  const text = original.toString('utf8');
  const matcher = /  _syncInput\(value\) \{\r?\n[\s\S]*?\r?\n  \}/g;
  const matches = [...text.matchAll(matcher)];
  assert.equal(matches.length, 1, 'Expected one NumberInput._syncInput; review this mutation if implementation changes');
  assert.ok(matches[0][0].includes('this._preserveInputText'), 'Expected the decimal draft guard');
  const replacement = '  _syncInput(value) {\n    // MUTATION: restore the old unconditional editor normalization.\n    super._syncInput(value);\n  }';
  const mutated = text.replace(matcher, replacement);
  assert.notEqual(mutated, text);
  report.originalSyncInput = matches[0][0];
  report.mutatedSyncInput = replacement;
  server = createTestServer(snapshot);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  for (const engine of engines) {
    await writeFile(snapshotSource, original);
    await check(engine, 'baseline', port);
    await writeFile(snapshotSource, mutated);
    await check(engine, 'mutant', port);
  }
  report.ok = true;
} catch (error) {
  report.ok = false;
  report.error = String(error.stack ?? error);
  process.exitCode = 1;
  console.error(report.error);
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  report.checkoutSourceUnchanged = digest(await readFile(sourceFile)) === beforeHash;
  if (!report.checkoutSourceUnchanged) {
    report.ok = false;
    process.exitCode = 1;
    console.error('Checkout NumberInput changed during verification; the checker did not write it. Recheck concurrent work.');
  }
  await writeFile(path.join(snapshot, 'summary.json'), JSON.stringify(report, null, 2) + '\n');
  console.log('Regression proof and source snapshot: ' + snapshot);
  console.log('Checkout NumberInput unchanged: ' + report.checkoutSourceUnchanged);
  if (report.ok) console.log('Decimal regression verified: every clean baseline passed and every historical-defect mutation was caught.');
}