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
   as a pre-release. Keep private:true unless npm publication is separately chosen.

macOS is intentionally checked after GitHub publication in a new consumer project
on the author's MacBook. Until then label it unverified; this is not a blocker for
the preliminary release. Linux native hosts are also unverified.

No script here publishes, pushes or changes GitHub settings automatically.

Selective browser projects in Windows PowerShell can use the runner directly to
avoid npm.ps1 consuming forwarded options. Choose a free isolated localhost port:

```powershell
$env:TAET_UI_PORT = '5662'
node scripts/run-browser.js --config playwright.compat.config.js --project=firefox --workers=1
```

Use `--project=webkit` for WebKit. The environment variable applies only to that
process/session; no browser/OS security setting needs to change.
