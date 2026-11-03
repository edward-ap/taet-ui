import assert from "node:assert/strict";
import { readFile, readdir, access } from "node:fs/promises";
import test from "node:test";
import * as stable from "taet-ui";
import * as experimental from "taet-ui/experimental";
import * as all from "taet-ui/all";
import * as grid from "taet-ui/grid";

test("package exports expose core without advanced side projects", () => {
  assert.equal(all.Button, stable.Button);
  assert.equal(all.Grid, grid.Grid);
  assert.equal(experimental.TextLayout, all.TextLayout);
  for (const api of [stable, experimental, all, grid]) {
    assert.equal("QuestionPanel" in api, false);
    assert.equal("GraphViewer" in api, false);
  }
});

test("library JS and CSS references stay inside the distributable source tree", async () => {
  const root = new URL("../src/", import.meta.url);
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const url = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
      if (entry.isDirectory()) { await visit(url); continue; }
      if (!/\.(js|css)$/.test(entry.name)) continue;
      const text = await readFile(url, "utf8");
      const pattern = entry.name.endsWith(".css")
        ? /@import\s+url\(["']([^"']+)["']\)/g
        : /(?:from\s*|import\s*)["'](\.[^"']+)["']/g;
      for (const [, reference] of text.matchAll(pattern)) {
        const target = new URL(reference, url);
        assert.ok(target.href.startsWith(root.href), `${url.pathname} escapes src: ${reference}`);
        await access(target);
      }
    }
  }
  await visit(root);
});
