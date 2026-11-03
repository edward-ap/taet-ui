import test from "node:test";
import assert from "node:assert/strict";

import { Form } from "../src/ui/Form.js";
import { TextInput } from "../src/ui/TextInput.js";

test("Form getValue works before mount for composed rows", () => {
  const firstName = new TextInput({ name: "firstName" });
  const lastName = new TextInput({ name: "lastName" });
  const form = new Form({
    initialValue: {
      firstName: "Ada",
      lastName: "Lovelace"
    }
  }).row(firstName, lastName);

  assert.deepEqual(form.getValue(), {
    firstName: "Ada",
    lastName: "Lovelace"
  });
});

test("Form clearValues clears values while clear keeps container semantics", () => {
  const field = new TextInput({ name: "title", value: "Mapping" });
  const form = new Form().row(field);

  assert.deepEqual(form.getValue(), { title: "Mapping" });
  assert.equal(form.clearValues({ silent: true }), true);
  assert.deepEqual(form.getValue(), { title: "" });

  assert.equal(form.clear(), form);
  assert.deepEqual(form.getFields(), []);
});

test("Form and editors normalize shared label geometry options", () => {
  const field = new TextInput({
    name: "title",
    labelPosition: "top",
    labelWidth: "8rem",
    indent: 6
  });
  const form = new Form({ labelPosition: "top", fieldIndent: 10 }).row(field);

  assert.equal(form.labelPosition, "top");
  assert.equal(form.fieldIndent, 10);
  assert.equal(field.labelPosition, "top");
  assert.equal(field.labelWidth, "8rem");
  assert.equal(field.indent, 6);
  assert.throws(() => new Form({ labelPosition: "right" }), /labelPosition/);
  assert.throws(() => new TextInput({ labelPosition: "right" }), /labelPosition/);
});

test("Form keeps inherited Panel padding API", () => {
  const form = new Form({ padding: "8px 4px 10px 12px" });

  assert.equal(form.getPadding(), "8px 4px 10px 12px");
  assert.equal(form.setPadding(6), form);
  assert.equal(form.getPadding(), 6);
});
