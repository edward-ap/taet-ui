import { required, email } from "../../src/core/validators.js";
import {
  Button,
  CheckBox,
  DockLayout,
  Form,
  Grid,
  gridEditors,
  LogPanel,
  NumberInput,
  Panel,
  PropertyGrid,
  SelectInput,
  TextArea,
  TextInput,
  Toolbar,
  TreeGrid
} from "../../src/ui/all.js";

class ThemeObject {
  constructor(values) {
    Object.assign(this, values);
  }

  getProperties() {
    return [
      {
        title: "Appearance",
        properties: [
          { name: "theme", label: "Theme", type: "readonly", value: this.theme },
          { name: "profile", label: "Profile", type: "readonly", value: this.profile },
          { name: "accent", label: "Accent", type: "select", value: this.accent, options: ["blue", "steel", "navy"] }
        ]
      },
      {
        title: "State",
        properties: [
          { name: "enabled", label: "Enabled", type: "boolean", value: this.enabled },
          { name: "density", label: "Density", type: "number", value: this.density }
        ]
      }
    ];
  }

  setProperty(name, value) {
    this[name] = value;
  }
}

const themeObject = new ThemeObject({
  theme: "light-blue",
  profile: "compact",
  accent: "blue",
  enabled: true,
  density: 12
});

const themeActions = document.querySelector("#theme-actions");
const themeClasses = ["dui-theme-light", "dui-theme-light-blue", "dui-theme-dark-blue"];

const lightButton = new Button(themeActions, {
  name: "lightTheme",
  text: "Light Blue",
  onClick() {
    setTheme("dui-theme-light-blue", "light-blue");
  }
});

const darkButton = new Button(themeActions, {
  name: "darkTheme",
  text: "Dark Blue",
  onClick() {
    setTheme("dui-theme-dark-blue", "dark-blue");
  }
});

const projectTree = new TreeGrid({
  name: "themeProjectTree",
  width: "100%",
  height: "100%",
  rowHeight: 24,
  expandedIds: ["project", "ui", "data"],
  columns: [
    { id: "name", title: "Object", minWidth: 150 },
    { id: "kind", title: "Kind", width: 90, minWidth: 72 }
  ]
});

projectTree.data.parse(
  [
    { id: "project", name: "Workbench", kind: "root" },
    { id: "ui", parentId: "project", name: "UI", kind: "folder" },
    { id: "form", parentId: "ui", name: "Form", kind: "control" },
    { id: "grid", parentId: "ui", name: "Grid", kind: "control" },
    { id: "dock", parentId: "ui", name: "DockLayout", kind: "control" },
    { id: "data", parentId: "project", name: "Data", kind: "folder" },
    { id: "customers", parentId: "data", name: "Customers", kind: "source" }
  ],
  { origin: "import" }
);

const nameField = new TextInput({
  name: "name",
  label: "Name",
  value: "Customer Mapping",
  validators: [required()]
});

const emailField = new TextInput({
  name: "email",
  label: "Email",
  value: "bad-email",
  validators: [email()]
});

const typeField = new SelectInput({
  name: "type",
  label: "Type",
  placeholder: "Choose type",
  value: "mapping"
});

typeField.data.parse(
  [
    { id: "source", text: "Source" },
    { id: "target", text: "Target" },
    { id: "mapping", text: "Mapping" }
  ],
  { origin: "import" }
);

const priorityField = new NumberInput({
  name: "priority",
  label: "Priority",
  value: 10,
  min: 0,
  step: 1
});

const activeField = new CheckBox({
  name: "active",
  label: "Active",
  text: "Enabled",
  checked: true
});

const notesField = new TextArea({
  name: "notes",
  label: "Notes",
  value: "Theme tokens should affect every control at once.",
  rows: 3
});

const form = new Form({
  name: "themeForm",
  width: "min(520px, 100%)",
  labelWidth: 86,
  padding: "8px 0 8px 8px"
}).col(nameField, emailField, typeField, priorityField, activeField, notesField);

const grid = new Grid({
  name: "themeGrid",
  width: "100%",
  height: 210,
  rowHeight: 24,
  columns: [
    { id: "field", title: "Field", width: 160, minWidth: 100, editor: gridEditors.text(), footer: rows => `${rows.length} rows` },
    { id: "type", title: "Type", width: 100, minWidth: 80, editor: gridEditors.select({ options: ["string", "number", "boolean"] }) },
    { id: "required", title: "Req", width: 64, minWidth: 54, align: "center", editor: gridEditors.checkbox(), render: value => (value ? "On" : "Off") },
    { id: "source", title: "Source", minWidth: 170, editor: gridEditors.text(), footer: "Theme preview" }
  ]
});

grid.data.parse(
  [
    { id: "name", field: "Name", type: "string", required: true, source: "customer.name" },
    { id: "email", field: "Email", type: "string", required: true, source: "customer.email" },
    { id: "active", field: "Active", type: "boolean", required: false, source: "customer.active" },
    { id: "priority", field: "Priority", type: "number", required: false, source: "mapping.priority" }
  ],
  { origin: "import" }
);

const log = new LogPanel({
  name: "themeLog",
  css: "dui-dock-demo-log"
});

const inspector = new PropertyGrid({
  name: "themeInspector",
  width: "100%",
  height: "100%",
  labelWidth: 88
});

const toolbar = new Toolbar({
  name: "themeToolbar"
})
  .addToolButton({
    name: "save",
    text: "Save",
    icon: "save",
    showText: true,
    onClick() {
      log.write("save clicked");
    }
  })
  .addToolButton({
    name: "validate",
    text: "Validate",
    icon: "validate",
    showText: true,
    onClick() {
      const result = form.validate();
      log.write(`validate ok=${result.ok}`);
    }
  })
  .addSeparator()
  .addToolButton({
    name: "import",
    text: "Import",
    icon: "import",
    onClick() {
      log.write("import clicked");
    }
  });

const workspace = new Panel({
  name: "themeWorkspace",
  width: "100%",
  height: "100%"
});

const dock = new DockLayout("#root", {
  name: "themeDock",
  areaSizes: {
    left: 240,
    right: 320,
    bottom: 130
  }
});

dock.addPanel({
  name: "projectPanel",
  title: "Project",
  area: "left",
  closeable: true,
  pinnable: true,
  content: projectTree
});

dock.addPanel({
  name: "workspacePanel",
  title: "Theme Workspace",
  area: "center",
  closeable: false,
  collapsible: false,
  movable: false,
  content: workspace
});

workspace.add(toolbar, form, grid);

dock.addPanel({
  name: "inspectorPanel",
  title: "Inspector",
  area: "right",
  closeable: true,
  pinnable: true,
  content: inspector
});

dock.addPanel({
  name: "logPanel",
  title: "Logs",
  area: "bottom",
  closeable: true,
  pinnable: true,
  content: log
});

inspector.bind(themeObject);
emailField.validate();
grid.selection.set([grid.data.get("email")], { origin: "system" });

projectTree.events.on("selectionChange", event => {
  log.write(`tree selection ${event.items.map(item => item.id).join(", ") || "(none)"}`);
});

inspector.events.on("propertyChange", event => {
  log.write(`property ${event.name}: ${event.newValue}`);
});

log.write("lab20 ready");

window.lab20 = {
  dock,
  projectTree,
  workspace,
  form,
  grid,
  inspector,
  log,
  lightButton,
  darkButton,
  setTheme
};

function setTheme(themeClass, themeName) {
  document.body.classList.remove(...themeClasses);
  document.body.classList.add(themeClass);
  document.body.dataset.theme = themeName;
  themeObject.theme = themeName;
  inspector.bind(themeObject);
  log.write(`theme ${themeName}`);
}
