import { required } from "../../src/core/validators.js";
import { Button, CheckBox, Form, LogPanel, Panel, TextArea, TextInput } from "../../src/ui/all.js";

const title = new TextInput({
  name: "title",
  label: "Title",
  value: "Mapping Note",
  validators: [required("Title is required")]
});

const description = new TextArea({
  name: "description",
  label: "Description",
  value: "Source fields are normalized before mapping.\nReview lookup values before export.",
  rows: 4,
  placeholder: "Enter multiline description",
  validators: [required("Description is required")]
});

const reviewed = new CheckBox({
  name: "reviewed",
  label: "Reviewed",
  text: "Ready for validation",
  value: false
});

const log = new LogPanel({
  name: "log"
});

description.events.on("change", event => {
  log.write(
    `description length: ${event.oldValue.length} -> ${event.newValue.length}, origin=${event.origin}`
  );
});

let form;

const okButton = new Button({
  name: "ok",
  text: "OK",

  onClick() {
    const result = form.validate();

    if (!result.ok) {
      log.write(`Validation failed: ${result.errors.length} error(s)`);
      return;
    }

    log.write(
      `OK: title=${title.value.get()}, descriptionLines=${description.value.get().split("\n").length}, reviewed=${reviewed.value.get()}`
    );
  }
});

const silentButton = new Button({
  name: "silent",
  text: "Silent Load",

  onClick() {
    description.value.set("Imported note\nwith two lines", {
      origin: "import",
      silent: true
    });

    log.write(`silent load length=${description.value.get().length}`);
  }
});

const clearButton = new Button({
  name: "clear",
  text: "Clear",

  onClick() {
    description.value.clear();
    log.write(`cleared description length=${description.value.get().length}`);
  }
});

form = new Form({
  name: "textAreaForm"
})
  .row(title)
  .row(description)
  .row(reviewed)
  .row(okButton, silentButton, clearButton);

const panel = new Panel("#root", {
  name: "textAreaPanel"
}).add(form, log);

log.write("lab08 ready");

window.lab08 = {
  panel,
  form,
  title,
  description,
  reviewed,
  okButton,
  silentButton,
  clearButton,
  log
};
