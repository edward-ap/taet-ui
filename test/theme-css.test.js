import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const styles = new URL("../src/ui/styles/", import.meta.url);

test("branded command buttons do not leak into Grid frozen surfaces", async () => {
  const [buttons, grid, tokens] = await Promise.all([
    readFile(new URL("buttons.css", styles), "utf8"),
    readFile(new URL("grid.css", styles), "utf8"),
    readFile(new URL("tokens.css", styles), "utf8")
  ]);

  assert.match(buttons, /\.dui-button\s*\{[\s\S]*?var\(--dui-command-button-bg\)/);
  assert.match(grid, /\.dui-grid__row:hover \.dui-grid__cell--frozen\s*\{\s*background: var\(--dui-grid-frozen-hover-bg\)/);
  assert.doesNotMatch(
    grid,
    /\.dui-grid__row:hover \.dui-grid__cell--frozen\s*\{[\s\S]*?var\(--dui-command-button-/
  );
  assert.match(tokens, /--dui-grid-frozen-bg: var\(--dui-color-bg\)/);
  assert.match(tokens, /--dui-command-button-bg: #5fa2d9/);
});
