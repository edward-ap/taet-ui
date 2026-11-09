import test from "node:test";
import assert from "node:assert/strict";
import { TextInput } from "../src/ui/TextInput.js";

// Small DOM-input adapter: native event sequencing/caret behavior is separately
// exercised in masked-editing-regressions.spec.js on all available engines.
function editor(options = {}) {
  const control = new TextInput({ mask: "00:00", value: "12:34", ...options });
  control._input = {
    value: control.getDisplayValue(), selectionStart: 0, selectionEnd: 0,
    selectionDirection: "none",
    setSelectionRange(start, end, direction = "none") {
      this.selectionStart = start; this.selectionEnd = end; this.selectionDirection = direction;
    }
  };
  return control;
}
function select(c, start, end = start) { c._input.setSelectionRange(start, end); }
function edit(c, data = "", inputType = "insertText") {
  let prevented = false;
  c._beforeMaskInput({ data, inputType, cancelable: true,
    preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
}
function snapshot(c) {
  return [c.value.get(), c._input.value, c._input.selectionStart, c._input.selectionEnd];
}

for (const raw of [false, true]) {
  test(`mask sequential partial replacement preserves token caret (raw=${raw})`, () => {
    const c = editor({ unmaskValue: raw }); select(c, 0, 2);
    edit(c, "9"); edit(c, "8");
    assert.deepEqual(snapshot(c), [raw ? "9834" : "98:34", "98:34", 3, 3]);
    c._moveMaskHistory(false);
    assert.equal(c._input.value, "93:4");
    c._moveMaskHistory(false);
    assert.deepEqual(snapshot(c), [raw ? "1234" : "12:34", "12:34", 0, 2]);
    c._moveMaskHistory(true);
    assert.equal(c._input.value, "93:4");
    c.destroy();
  });
}

test("mask deletes tokens rather than literals, preserves caret and reaches empty", () => {
  const c = editor(); select(c, 3); edit(c, "", "deleteContentBackward");
  assert.deepEqual(snapshot(c), ["13:4", "13:4", 1, 1]);
  c.value.set("12:34"); select(c, 2); edit(c, "", "deleteContentForward");
  assert.deepEqual(snapshot(c), ["12:4", "12:4", 2, 2]);
  select(c, c._input.value.length);
  for (let i = 0; i < 5; i++) edit(c, "", "deleteContentBackward");
  assert.deepEqual(snapshot(c), ["", "", 0, 0]);
  c.destroy();
});

test("rejected input and mixed incompatible deletion retain selection and history", () => {
  const c = editor({ mask: "AA-0000", value: "AB1234" });
  select(c, 0, 2); const before = snapshot(c);
  edit(c, "", "deleteContentForward");
  assert.deepEqual(snapshot(c), before);
  edit(c, "9");
  assert.deepEqual(snapshot(c), before);
  assert.equal(c._maskUndo.length, 0);
  select(c, 0, c._input.value.length); edit(c, "", "deleteContentBackward");
  assert.equal(c.value.get(), "");
  c._moveMaskHistory(false); assert.equal(c.value.get(), "AB-1234");
  c.destroy();
});

for (const mask of ["+0 (000)", "+7 (000)", "ID-000"]) {
  test(`no editable token means empty value for ${mask}`, () => {
    for (const unmaskValue of [false, true]) {
      const c = editor({ mask, value: "", unmaskValue });
      edit(c, "x"); assert.equal(c.value.get(), ""); assert.equal(c._input.value, "");
      c.value.set("x"); assert.equal(c.value.get(), "");
      c.destroy();
    }
  });
}

test("API same value, silent load, reset and clear create history boundaries", () => {
  for (const action of ["same", "silent", "reset", "clear"]) {
    const c = editor({ value: "1" }); select(c, 1); edit(c, "2");
    if (action === "same") c.value.set(c.value.get());
    if (action === "silent") c.value.set("98", { silent: true });
    if (action === "reset") c.value.reset();
    if (action === "clear") c.value.clear();
    const value = c.value.get();
    c._moveMaskHistory(false); assert.equal(c.value.get(), value);
    assert.equal(c._maskUndo.length, 0); assert.equal(c._maskRedo.length, 0);
    c.destroy();
  }
});

test("vetoed edits/API/undo preserve model, selection and history", () => {
  const c = editor({ value: "1" }); select(c, 1); edit(c, "2");
  const dispose = c.events.on("beforeChange", e => { e.cancel = true; });
  select(c, 0, 2); const before = snapshot(c);
  edit(c, "9"); assert.deepEqual(snapshot(c), before);
  c.value.set("99", { silent: false });
  assert.equal(c._maskUndo.length, 1);
  c._moveMaskHistory(false); assert.deepEqual(snapshot(c), before);
  dispose.off(); c._moveMaskHistory(false); assert.equal(c.value.get(), "1");
  c.destroy();
});

test("composition retains live events/native text and records one completed edit", () => {
  const c = editor({ value: "1" }); select(c, 1);
  c._maskComposition = c._maskSnapshot(); c._maskComposing = true;
  const values = []; c.events.on("change", e => values.push(e.newValue));
  c._input.value = "12"; select(c, 2);
  c._handleInput({ isComposing: true, inputType: "insertCompositionText" });
  assert.equal(c.value.get(), "12:"); assert.equal(c._input.value, "12");
  c._endMaskComposition();
  assert.deepEqual(values, ["12:"]); assert.equal(c._input.value, "12:");
  c._handleInput({ inputType: "insertText" });
  assert.deepEqual(values, ["12:"]);
  c._moveMaskHistory(false); assert.equal(c.value.get(), "1");
  c.destroy();
});

test("accepted reentrant API load owns final selection/history", () => {
  const c = editor({ value: "1" }); select(c, 1);
  c.events.on("change", e => {
    if (e.newValue === "12:") c.value.set("98", { silent: true });
  });
  edit(c, "2");
  assert.equal(c.value.get(), "98:"); assert.equal(c._maskUndo.length, 0);
  c.destroy();
});

test("teardown in semantic callback leaves no mask history or pending work", () => {
  for (const phase of ["beforeChange", "change", "afterChange"]) {
    const c = editor({ value: "1" }); select(c, 1);
    c.events.on(phase, () => c.destroy());
    edit(c, "2");
    assert.equal(c.destroyed, true); assert.equal(c._input, null);
    assert.equal(c._maskUndo.length, 0);
  }
});

test("history is bounded and new edits discard redo", () => {
  const c = editor({ mask: "000", value: "" });
  for (let i = 0; i < 105; i++) {
    select(c, 0, c._input.value.length); edit(c, String(i % 10));
  }
  assert.equal(c._maskUndo.length, 100);
  c._moveMaskHistory(false); assert.equal(c._maskRedo.length, 1);
  select(c, 0, 1); edit(c, "9"); assert.equal(c._maskRedo.length, 0);
  c.destroy();
});


for (const phase of ["beforeChange", "change", "afterChange"]) {
  for (const action of ["same", "silent", "cancel"]) {
    test(`masked ${phase} API ${action} preserves live pipeline without stale history`, () => {
      const c = editor({ value: "1" }); select(c, 1);
      c.events.on(phase, e => {
        if (e.newValue !== "12:") return;
        c.value.set(action === "same" ? c.value.get() : "98", { silent: true });
        if (action === "cancel" && phase === "beforeChange") e.cancel = true;
      });
      edit(c, "2");
      const expected = phase === "beforeChange" && action !== "cancel" ? "12:" :
        action === "same" ? "12:" : "98:";
      assert.equal(c.value.get(), expected);
      assert.equal(c._input.value, expected);
      assert.equal(c._maskUndo.length, 0); assert.equal(c._maskRedo.length, 0);
      c.destroy();
    });
  }
}

for (const phase of ["beforeChange", "change", "afterChange"]) {
  test(`composition ${phase} API hydration clears history and pending composition`, () => {
    const c = editor({ value: "1" }); select(c, 1);
    c.events.on(phase, e => {
      if (e.newValue === "12:") c.value.set("98", { silent: true });
    });
    c._maskComposition = c._maskSnapshot(); c._maskComposing = true;
    c._input.value = "12"; select(c, 2);
    c._handleInput({ isComposing: true, inputType: "insertCompositionText" });
    c._endMaskComposition();
    assert.equal(c.value.get(), phase === "beforeChange" ? "12:" : "98:");
    assert.equal(c._input.value, c.value.get());
    assert.equal(c._maskUndo.length, 0); assert.equal(c._maskComposition, null);
    c.destroy();
  });
}

for (const unmaskValue of [false, true]) {
  test(`capacity cannot discard untouched suffix (raw=${unmaskValue})`, () => {
    const c = editor({ unmaskValue }); select(c, 1);
    const before = snapshot(c); edit(c, "9");
    assert.deepEqual(snapshot(c), before); assert.equal(c._maskUndo.length, 0);
    select(c, 0, c._input.value.length); edit(c, "987654");
    assert.equal(c._input.value, "98:76");
    c.value.set("123456"); assert.equal(c._input.value, "12:34");
    c.destroy();
  });
}

test("composition nested API plus veto leaves DOM coherent without stale undo", () => {
  const c = editor({ value: "1" }); select(c, 1);
  c.events.on("beforeChange", e => {
    if (e.newValue === "12:") {
      c.value.set("98", { silent: true }); e.cancel = true;
    }
  });
  c._maskComposition = c._maskSnapshot(); c._maskComposing = true;
  c._input.value = "12"; select(c, 2);
  c._handleInput({ isComposing: true, inputType: "insertCompositionText" });
  c._endMaskComposition();
  assert.equal(c.value.get(), "98:"); assert.equal(c._input.value, "98:");
  c._moveMaskHistory(false); assert.equal(c.value.get(), "98:");
  c.destroy();
});

test("composing input without compositionstart uses prior accepted display and inferred selection", () => {
  const c = editor({ value: "1" }); select(c, 1);
  const values = []; c.events.on("change", e => values.push(e.newValue));
  c._input.value = "12"; select(c, 2);
  c._handleInput({ isComposing: true, inputType: "insertCompositionText" });
  assert.equal(c.value.get(), "12:"); assert.equal(c._input.value, "12");
  assert.deepEqual(values, ["12:"]);
  c._endMaskComposition(); assert.equal(c._input.value, "12:");
  assert.deepEqual(values, ["12:"]);
  c._moveMaskHistory(false); assert.deepEqual(snapshot(c), ["1", "1", 1, 1]);
  c.destroy();
});

test("rejected mixed composition restores original selection and untouched suffix", () => {
  const c = editor({ mask: "AA-0000", value: "AB1234" }); select(c, 0, 2);
  const before = snapshot(c);
  c._maskComposition = c._maskSnapshot(); c._maskComposing = true;
  c._input.value = "X-1234"; select(c, 1);
  c._handleInput({ isComposing: true, inputType: "insertCompositionText" });
  assert.equal(c.value.get(), "AB-1234"); assert.equal(c._input.value, "X-1234");
  c._endMaskComposition(); assert.deepEqual(snapshot(c), before);
  assert.equal(c._maskUndo.length, 0);
  c.destroy();
});
