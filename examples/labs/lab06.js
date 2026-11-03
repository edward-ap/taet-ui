import { CommandRegistry } from "../../src/core/CommandRegistry.js";
import { DocumentState } from "../../src/core/DocumentState.js";
import { ShortcutManager } from "../../src/core/ShortcutManager.js";
import { StaticContextProvider } from "../../src/core/StaticContextProvider.js";
import { Form, LogPanel, Panel, StatusText, TextInput, Toolbar } from "../../src/ui/all.js";

const documentState = new DocumentState();
const contextProvider = new StaticContextProvider({
  documentState,
  activeControl: null
});
const commands = new CommandRegistry({ contextProvider });
const shortcuts = new ShortcutManager({ commands, contextProvider });

const log = new LogPanel({
  name: "log"
});

const status = new StatusText({
  name: "status",
  text: () => (documentState.isDirty() ? "Dirty" : "Clean")
});

const projectName = new TextInput({
  name: "projectName",
  label: "Project Name",
  value: "Customer Mapping",

  onChange(event) {
    if (event.origin === "import" || event.origin === "restore") {
      return;
    }

    documentState.markDirty({
      origin: event.origin,
      userAction: event.userAction,
      source: event.source,
      path: "project.name"
    });
  }
});

commands.register("project.save", {
  label: "Save",
  icon: "save",
  shortcut: "Ctrl+S",
  enabled: context => context.documentState?.isDirty() === true,
  run(context) {
    context.documentState.markClean(Date.now(), {
      origin: "command",
      userAction: true
    });

    log.write("Saved");
    return { ok: true };
  }
});

commands.register("project.validate", {
  label: "Validate",
  icon: "validate",
  enabled: () => true,
  run() {
    log.write(`Validated: ${projectName.value.get()}`);
    return { ok: true };
  }
});

shortcuts.bindCommands(commands);

const toolbar = new Toolbar({
  name: "mainToolbar",
  commands
})
  .addCommand("project.save", { name: "save" })
  .addCommand("project.validate", { name: "validate" })
  .addSeparator({ name: "separator" });

toolbar.addToolButton({
  name: "import",
  text: "Import",
  icon: "import",

  onClick() {
    projectName.value.set("Imported Mapping", {
      origin: "import",
      silent: true
    });

    documentState.markClean(Date.now(), {
      origin: "import"
    });

    log.write("Imported silently");
  }
});

const form = new Form({
  name: "projectForm"
}).row(projectName, status);

const panel = new Panel("#root", {
  name: "commandPanel"
}).add(toolbar, form, log);

documentState.events.on("dirtyChange", event => {
  status.refresh();
  contextProvider.notifyChange({
    origin: event.origin,
    userAction: event.userAction
  });
  log.write(`dirty=${event.dirty}, origin=${event.origin}`);
});

contextProvider.patchContext(
  { activeControl: projectName },
  { silent: true, origin: "system" }
);

status.refresh();
commands.refreshState();
log.write("lab06 ready");

window.lab06 = {
  panel,
  toolbar,
  form,
  projectName,
  status,
  log,
  commands,
  shortcuts,
  documentState,
  contextProvider
};
