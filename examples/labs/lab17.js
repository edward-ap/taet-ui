import { CommandRegistry } from "../../src/core/CommandRegistry.js";
import { DocumentState } from "../../src/core/DocumentState.js";
import { StaticContextProvider } from "../../src/core/StaticContextProvider.js";
import {
  Button,
  ContextMenu,
  Form,
  LabelText,
  LogPanel,
  Menu,
  Panel,
  StatusText,
  TextInput
} from "../../src/ui/all.js";

const documentState = new DocumentState();
const contextProvider = new StaticContextProvider({
  documentState
});
const commands = new CommandRegistry({ contextProvider });

const log = new LogPanel({
  name: "log"
});

const status = new StatusText({
  name: "status",
  text: () => (documentState.isDirty() ? "Dirty" : "Clean")
});

const projectName = new TextInput({
  name: "projectName",
  label: "Project",
  value: "Customer Mapping",

  onChange(event) {
    if (event.origin === "import" || event.origin === "restore") {
      return;
    }

    documentState.markDirty({
      origin: event.origin,
      userAction: event.userAction,
      path: "project.name"
    });
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
    log.write("command save");
    return { ok: true };
  }
});

commands.register("project.validate", {
  label: "Validate",
  shortcut: "Ctrl+Shift+V",
  run() {
    log.write(`command validate ${projectName.value.get()}`);
    return { ok: true };
  }
});

commands.register("edit.undo", {
  label: "Undo",
  shortcut: "Ctrl+Z",
  enabled: false,
  run() {
    log.write("command undo");
    return { ok: true };
  }
});

commands.register("view.properties", {
  label: "Properties",
  checked: true,
  run() {
    log.write("command properties");
    return { ok: true };
  }
});

const menu = new Menu({
  name: "mainMenu",
  commands,
  width: "min(720px, 100%)",
  items: [
    {
      text: "File",
      items: [
        { command: "project.save" },
        { command: "project.validate" },
        "-",
        {
          text: "Close",
          onClick() {
            log.write("local close");
          }
        }
      ]
    },
    {
      text: "Edit",
      items: [{ command: "edit.undo" }]
    },
    {
      text: "View",
      items: [
        { command: "view.properties" },
        {
          text: "Panels",
          items: [
            {
              text: "Output",
              checked: true,
              onClick() {
                log.write("local output");
              }
            },
            {
              text: "Preview",
              onClick() {
                log.write("local preview");
              }
            }
          ]
        }
      ]
    }
  ]
});

const surface = new LabelText({
  name: "surface",
  className: "dui-menu-lab-surface",
  text: "Right-click this surface for the ContextMenu"
});

const contextMenu = new ContextMenu({
  name: "surfaceContextMenu",
  commands,
  items: [
    { command: "project.save" },
    { command: "project.validate" },
    "-",
    {
      text: "Inspect",
      onClick() {
        log.write("context inspect");
      }
    }
  ]
});

const importButton = new Button({
  name: "import",
  text: "Import Clean",

  onClick() {
    projectName.value.set("Imported Mapping", {
      origin: "import",
      silent: true
    });
    documentState.markClean(Date.now(), {
      origin: "import"
    });
    log.write("import clean");
  }
});

const dirtyButton = new Button({
  name: "dirty",
  text: "Mark Dirty",

  onClick() {
    documentState.markDirty({
      origin: "api"
    });
  }
});

const form = new Form({
  name: "menuForm",
  width: "min(520px, 100%)"
}).row(projectName, status);

const actions = new Form({
  name: "menuActions",
  width: "min(520px, 100%)"
}).row(importButton, dirtyButton);

const panel = new Panel("#root", {
  name: "menuPanel"
}).add(menu, form, surface, actions, contextMenu, log);

contextMenu.attach(surface.element);

documentState.events.on("dirtyChange", event => {
  status.refresh();
  contextProvider.notifyChange({
    origin: event.origin,
    userAction: event.userAction
  });
  log.write(`dirty=${event.dirty}, origin=${event.origin}`);
});

menu.events.on("open", event => {
  log.write(`menu open ${event.id ?? "root"}`);
});

menu.events.on("itemClick", event => {
  log.write(`menu click ${event.commandId ?? event.id}`);
});

contextMenu.events.on("open", () => {
  log.write("context open");
});

contextMenu.events.on("itemClick", event => {
  log.write(`context click ${event.commandId ?? event.id}`);
});

status.refresh();
commands.refreshState();
log.write("lab17 ready");

window.lab17 = {
  panel,
  menu,
  contextMenu,
  form,
  surface,
  actions,
  log,
  commands,
  documentState,
  contextProvider
};
