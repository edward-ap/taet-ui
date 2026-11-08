# Preview release checklist

Choose one immutable commit and version. Finish changes before the final build.

1. Fresh clone: npm ci, npm test, npm run build, package/bundle inspection and an
   independent installed consumer. Check matching browser prerequisites explicitly.
2. Run test:all and the available compatibility/bundle engines. Use one worker for
   Windows WebKit/Firefox; keep earlier failed runs as historical evidence.
3. Record the exact commit, tool/browser versions and bounded native acceptance in
   VERIFICATION.md. Browser automation is not native IME/DPI/screen-reader acceptance.
4. Check MIT/OFL notices, source provenance, package versions and asset hashes.
   Exclude node_modules/dist/test-results/caches/EXEs/profiles from Git source.
5. Choose the real repository, issue/homepage URLs and reporting settings. Add
   metadata only after those destinations exist. Check CI from that repository;
   a committed workflow file is not a passing CI run.
6. Prepare source, local npm tarball and optional portable profile archives from
   that commit; include checksums and matching fonts/notices. Mark GitHub release
   as a pre-release. npm publication requires a separate explicit decision;
   do not infer permission from package.json metadata or a branch push.

macOS browser checks and a bounded Apple Silicon Tauri build/smoke are now
recorded in VERIFICATION.md. They do not certify all native integrations:
actual IME, VoiceOver, native clipboard/file dialogs, mixed DPI, signing,
notarization and Intel/universal builds remain unverified. Linux native hosts
are also unverified. Preserve these limits in release notes.

The macOS CI job uses Node 22 and two browser workers: test:all, the Firefox and
WebKit compatibility projects, and all three bundle projects. It has a
30-minute timeout and runs for pull requests, main pushes and manual dispatch,
not duplicate feature-branch pushes. It does not compile or certify a native
Tauri host. Local full-engine runs are recorded separately; verify the remote
job for the exact proposed commit before calling CI successful.

Keep existing release tags immutable. Corrections go through a reviewed branch
in this repository; merging a PR, choosing a new preview version and publishing
npm/GitHub release artifacts are separate steps.

No script here publishes, pushes or changes GitHub settings automatically.

Selective browser projects in Windows PowerShell can use the runner directly to
avoid npm.ps1 consuming forwarded options. Choose a free isolated localhost port:

```powershell
$env:TAET_UI_PORT = '5662'
node scripts/run-browser.js --config playwright.compat.config.js --project=firefox --workers=1
```

Use `--project=webkit` for WebKit. The environment variable applies only to that
process/session; no browser/OS security setting needs to change.
