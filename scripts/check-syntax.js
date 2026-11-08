import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const roots = ["src", "docs/src", "browser-tests", "examples", "test", "scripts"];
const files = ["playwright.config.js", "playwright.compat.config.js", "playwright.bundle.config.js"];
// Cargo/Tauri outputs include compressed assets whose names still end in .js.
// Check the example source, not its ignored native build products.
const generatedDirectories = new Set([join("examples", "tauri-minimal", "target")]);

for (const root of roots) {
  collectJavaScriptFiles(root, files);
}

for (const file of files.sort()) {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8",
    stdio: "pipe"
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }
}

console.log(`Syntax OK: ${files.length} files`);

function collectJavaScriptFiles(directory, result) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (generatedDirectories.has(path)) continue;
      collectJavaScriptFiles(path, result);
      continue;
    }

    if (entry.isFile() && /\.(?:js|cjs|mjs)$/.test(entry.name)) {
      result.push(relative(process.cwd(), path));
    }
  }
}
