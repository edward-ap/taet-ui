import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const recipesDirectory = new URL("../examples/ai-recipes/", import.meta.url);

test("AI recipes are importable factories that follow application guardrails", async () => {
  const files = (await readdir(recipesDirectory))
    .filter(file => /^\d{2}-.+\.js$/.test(file))
    .sort();

  assert.deepEqual(files.map(f => f.slice(0,2)), ['01','02','03','04','05','06','07','08','09','10','11','12']);

  for (const file of files) {
    const url = new URL(file, recipesDirectory);
    const source = await readFile(url, "utf8");
    const module = await import(url.href);
    const factories = Object.values(module).filter(value => typeof value === "function");

    assert.equal(factories.length, 1, `${file} must export exactly one factory`);
    // Grid cell renderers explicitly accept inert Nodes. Application layout
    // still composes live Controls; permit DOM only in these two read visuals.
    let applicationSource = source;
    if (file === '11-grid-editor-matrix.js') {
      const visuals = [...source.matchAll(/    const (checkboxIndicator|radioIndicator) = [\s\S]*?^    };/gm)];
      assert.deepEqual(visuals.map(match => match[1]), ['checkboxIndicator','radioIndicator']);
      for (const [body] of visuals) {
        assert.match(body, /input\.disabled=true;input\.tabIndex=-1/);
        applicationSource = applicationSource.replace(body, '');
      }
      assert.match(source, /checkboxIndicator\(value\)/);
      assert.match(source, /radioIndicator\(value,row,radioPrefix\)/);
    }
    assert.doesNotMatch(applicationSource, /document\.createElement\s*\(/, `${file} creates raw application DOM`);
    assert.doesNotMatch(source, /addEventListener\s*\(/, `${file} attaches a native listener`);
    assert.doesNotMatch(source, /\b(?:React|useState|useEffect|JSX)\b/, `${file} uses framework syntax`);
    assert.doesNotMatch(
      source,
      /\btype\s*:\s*["'](?:button|input|select|checkbox|form|panel)["']/,
      `${file} uses a control descriptor`
    );
  }
});
