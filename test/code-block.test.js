import test from "node:test";
import assert from "node:assert/strict";
import { CodeBlock } from "../src/ui/CodeBlock.js";

test("CodeBlock exposes value API before mount", () => {
  const block = new CodeBlock({ language:"js", code:"const value = 1;" });

  assert.equal(block.value.get(), "const value = 1;");
  assert.equal(block.value.set("const value = 2;", { silent:true }), true);
  assert.equal(block.value.get(), "const value = 2;");
  assert.equal(block.value.clear({ silent:true }), true);
  assert.equal(block.value.get(), "");

  block.destroy();
});
