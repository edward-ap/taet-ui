import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const issues = [];
const check = (condition, message) => { if (!condition) issues.push(message); };
check(pkg.license === 'MIT', 'Review the package license.');
check(!Object.keys(pkg.dependencies ?? {}).length, 'Review new runtime dependencies.');
for (const file of ['LICENSE', 'README.md', 'CHANGELOG.md', 'SECURITY.md', 'CONTRIBUTING.md', 'docs/RELEASE.md']) {
  try { check(readFileSync(file, 'utf8').trim().length > 0, `Empty ${file}`); } catch { issues.push(`Missing ${file}`); }
}
const publication = process.argv.includes('--publication');
if (publication) {
  check(Boolean(pkg.repository), 'Set the chosen GitHub repository metadata.');
  check(Boolean(pkg.bugs?.url), 'Set the chosen issue-reporting URL.');
  check(Boolean(pkg.homepage), 'Set the chosen documentation/homepage URL.');
  try { check(Boolean(execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()), 'Configure origin.'); }
  catch { issues.push('Configure the chosen origin remote.'); }
}
if (issues.length) { console.error(issues.map(issue => `- ${issue}`).join('\n')); process.exitCode = 1; }
else console.log(`Local release prerequisites passed${publication ? '; GitHub settings still require manual verification' : '; publication metadata not required in local mode'}.`);
console.log('This check does not publish, certify security, or replace test:all, test:compat and pack inspection.');
