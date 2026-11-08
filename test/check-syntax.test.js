import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

test('syntax check ignores native build products but still checks example source', async t => {
  const root = await mkdtemp(join(tmpdir(), 'taet-syntax-'));
  t.after(() => rm(root, { recursive: true }));
  for (const dir of ['src', 'docs/src', 'browser-tests', 'examples/tauri-minimal/target/release/build', 'test', 'scripts']) {
    await mkdir(join(root, dir), { recursive: true });
  }
  for (const file of ['playwright.config.js', 'playwright.compat.config.js', 'playwright.bundle.config.js']) {
    await writeFile(join(root, file), '// valid fixture');
  }
  const source = join(root, 'examples/tauri-minimal/source.js');
  await writeFile(source, 'const example = 1;');
  await writeFile(join(root, 'examples/tauri-minimal/target/release/build/compressed.js'), Buffer.from([0x1b, 0xff, 0x02]));
  const run = () => spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/check-syntax.js', import.meta.url))], {
    cwd: root, encoding: 'utf8'
  });
  const valid = run();
  assert.equal(valid.status, 0, valid.stderr);
  assert.match(valid.stdout, /Syntax OK: 4 files/);
  await writeFile(source, 'const broken = ;');
  const invalid = run();
  assert.notEqual(invalid.status, 0);
  assert.match(invalid.stderr, /source\.js/);
});
