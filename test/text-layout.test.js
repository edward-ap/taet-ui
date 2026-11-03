import assert from "node:assert/strict";
import test from "node:test";

import { TextLayout } from "../src/ui/experimental.js";

test("TextLayout normalizes safe structured content and appearance before mount", () => {
  const layout = new TextLayout({
    className: "training-message",
    title: "Debug Info",
    tone: "info",
    content: [
      { type: "keyValue", label: "Format", value: "fixed" },
      { type: "list", items: ["Five lines", "Five fields"] },
      {
        type: "definitionList",
        items: [
          { term: "PreToolUse", definition: "Runs before a tool call." },
          { label: "tool_choice", value: "Influences tool selection." }
        ]
      }
    ]
  });
  assert.equal(layout.getTitle(), "Debug Info");
  assert.equal(layout.css, "training-message");
  assert.equal(layout.getTone(), "info");
  assert.equal(layout.hasBackground(), true);
  assert.deepEqual(layout.getContent()[0], {
    type: "keyValue",
    label: "Format",
    value: "fixed"
  });
  assert.equal(layout.getContent().length, 3);
  assert.deepEqual(layout.getContent()[2].items[1], {
    term: "tool_choice",
    definition: "Influences tool selection."
  });
  layout.setContent("First paragraph\n\nSecond paragraph");
  assert.equal(layout.getContent().length, 2);
  assert.throws(
    () => layout.setContent([{ type: "html", text: "unsafe" }]),
    /Unsupported TextLayout block type/
  );
  layout.destroy();
});

