# Minimal Tæt UI Tauri host

Source-only example: one compact Form and one bounded Rust echo command. It is
trimmed from the Windows acceptance stand; it does not ship that stand's EXE,
profiles, reports, fixture data, test harness or copied Tæt UI implementation.

**Windows build/run smoke verified (2026-11-01).** This trimmed source was built
as a separate consumer with historical Dense UI 0.6.0-rc.1 assets from commit
18c65890435e1bae97af262a20ced705e0e49e4f and run in standalone WebView2
156.0.4314.58 on Windows 11. Local JS/CSS/Noto loading, bounded Rust echo and
programmatic Form input/button handling passed. These are this example's own
checks, not inherited acceptance results; real keyboard/mouse/IME input is not
certified by the programmatic smoke. The renamed Tæt UI host has not been rebuilt
for this migration.

When placed at examples/tauri-minimal in a Tæt UI checkout:

```sh
npm ci
npm run build
node examples/tauri-minimal/prepare.mjs
cd examples/tauri-minimal
cargo build --release --locked
```

Windows: launch target/release/taet-ui-tauri-example.exe. Installed WebView2,
Rust MSVC and the appropriate Windows C++/SDK toolchain are host prerequisites.
Tauri/tauri-build are exact pinned; Cargo.lock is provided. The default Cargo
command can fetch host crates. Offline builds work only with those crates cached.
The standalone EXE embeds the prepared assets and needs no Node/Python/devserver.
It still needs the platform WebView runtime; no installer/signing is configured.

For a standalone copied example, `node prepare.mjs --taet-ui-root <checkout>` uses
that checkout's built components profile. It verifies copied assets against its
build manifest and writes relative asset hashes to BUNDLE.json. Do not mix bundles.

The host has Tauri Rust dependencies; Tæt UI JS still has no runtime npm libraries.
Only the local main window is granted echo. No filesystem/shell/opener plugin is
included; navigation is limited to the app origin. Runtime web assets and their
MIT/OFL notices are copied together. Source code uses the repository MIT license.

macOS/Linux, actual IME, screen readers and mixed-DPI behavior are unverified.
macOS testing is planned after GitHub publication from a fresh consumer project.
