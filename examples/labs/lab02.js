import { CommandRegistry } from "../../src/core/CommandRegistry.js";
import { DocumentState } from "../../src/core/DocumentState.js";
import { StaticContextProvider } from "../../src/core/StaticContextProvider.js";
import { Button, Form, Layout, LogPanel, StatusText, TextInput } from "../../src/ui/all.js";

const documentState = new DocumentState();

const contextProvider = new StaticContextProvider({
  documentState,
  activeControl: null
});

const commands = new CommandRegistry({ contextProvider });
const log = new LogPanel({ name: "log" });

const status = new StatusText({
  name: "status",
  text: () => (documentState.isDirty() ? "Dirty" : "Clean")
});

const sourceName = new TextInput({
  name: "sourceName",
  label: "Project Name",
  value: "Customer Mapping",
  placeholder: "Enter project name",

  onChange(event) {
    log.write(
      `field change: "${event.oldValue}" -> "${event.newValue}", origin=${event.origin}, userAction=${event.userAction}`
    );

    if (event.origin !== "import" && event.origin !== "restore") {
      documentState.markDirty({
        origin: event.origin,
        userAction: event.userAction,
        source: event.source,
        path: "project.name"
      });
    }
  }
});

commands.register("project.save", {
  label: "Save",
  shortcut: "Ctrl+S",
  enabled: context => context.documentState?.isDirty() === true,
  run(context) {
    context.documentState.markClean(Date.now(), {
      origin: "command",
      userAction: true
    });

    log.write("project.save executed");
    return { ok: true };
  }
});

const saveButton = new Button({
  name: "save",
  text: "Save",
  command: "project.save",
  commands
});

const importButton = new Button({
  name: "import",
  text: "Silent Import",

  onClick() {
    sourceName.value.set("Imported Mapping", {
      origin: "import",
      silent: true
    });

    documentState.markClean(Date.now(), {
      origin: "import"
    });

    contextProvider.notifyChange({ origin: "import" });
    status.refresh();

    log.write("import applied silently; document remains clean");
  }
});

let form;
const workbench = new Layout("#root", {
  name: "workbench",
  cols: [{ id: "main", name: "main" }]
});

const destroyButton = new Button({
  name: "destroy",
  text: "Destroy",

  onClick() {
    log.write("destroying lab02 controls");
    form.destroy();
  }
});

form = new Form({
  name: "labForm",
  commands
})
  .row(saveButton, importButton, destroyButton, status)
  .row(sourceName)
  .row(log);

workbench.cell("main").attach(form);

documentState.events.on("dirtyChange", event => {
  status.refresh();
  commands.refreshState();

  log.write(`document dirty=${event.dirty}, origin=${event.origin}`);
});

contextProvider.patchContext(
  { activeControl: sourceName },
  { silent: true, origin: "system" }
);

status.refresh();
commands.refreshState();
log.write("lab02 ready");

window.lab02 = {
  form,
  app: form,
  workbench,
  commands,
  contextProvider,
  documentState,
  sourceName
};
