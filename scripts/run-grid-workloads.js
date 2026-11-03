import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);
const output = process.argv[2] ?? 'test-results/grid-workloads';
let server;
const ready = async () => {
  try { return (await fetch('http://127.0.0.1:5173/browser-tests/recipes.html', { signal: AbortSignal.timeout(1000) })).ok; }
  catch { return false; }
};
try {
  if (!await ready()) {
    server = spawn('python', ['scripts/dev-server.py', '--port', '5173', '--bind', '127.0.0.1'], { stdio: 'ignore', windowsHide: true });
    let failure;
    server.on('error', error => { failure = error; });
    for (let i = 0; !await ready(); i++) {
      if (failure) throw failure;
      if (i === 30 || server.exitCode != null) throw new Error('Development server did not start');
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  const measured = await run(process.execPath, ['scripts/profile-grid-workloads.cjs', output], { windowsHide: true, timeout: 600000, maxBuffer: 2 ** 20 });
  process.stdout.write(measured.stdout);
  const checked = await run(process.execPath, ['scripts/check-grid-workloads.js', `${output}/results.json`], { windowsHide: true });
  process.stdout.write(checked.stdout);
} finally { server?.kill(); }
