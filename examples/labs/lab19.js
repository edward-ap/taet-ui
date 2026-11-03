import { DockLayout, LabelText, LogPanel, PropertyGrid, TreeGrid } from "../../src/ui/all.js";

class DemoObject {
  constructor(values) {
    Object.assign(this, values);
  }

  getProperties() {
    return [
      {
        title: "Identity",
        properties: [
          { name: "id", label: "Id", type: "readonly", value: this.id },
          { name: "name", label: "Name", type: "text", value: this.name },
          {
            name: "kind",
            label: "Kind",
            type: "select",
            value: this.kind,
            options: ["source", "target", "mapping"]
          }
        ]
      },
      {
        title: "State",
        properties: [
          { name: "enabled", label: "Enabled", type: "boolean", value: this.enabled },
          { name: "priority", label: "Priority", type: "number", value: this.priority }
        ]
      }
    ];
  }

  setProperty(name, value) {
    this[name] = value;
  }
}

const selectedObject = new DemoObject({
  id: "mapping.customer",
  name: "Customer Mapping",
  kind: "mapping",
  enabled: true,
  priority: 10
});

const projectTree = new TreeGrid({
  name: "projectTree",
  width: "100%",
  height: "100%",
  rowHeight: 24,
  expandedIds: ["project", "sources", "targets"],
  columns: [
    { id: "name", title: "Name", minWidth: 160 },
    { id: "kind", title: "Kind", width: 92, minWidth: 72 }
  ]
});

projectTree.data.parse(
  [
    { id: "project", name: "Project", kind: "root" },
    { id: "sources", parentId: "project", name: "Sources", kind: "folder" },
    { id: "source.customer", parentId: "sources", name: "Customer", kind: "object" },
    { id: "source.order", parentId: "sources", name: "Order", kind: "object" },
    { id: "targets", parentId: "project", name: "Targets", kind: "folder" },
    { id: "target.client", parentId: "targets", name: "Client", kind: "object" }
  ],
  {
    origin: "import"
  }
);

const workspace = new LabelText({
  name: "workspace",
  className: "dui-dock-demo-workspace",
  text: "Main workspace"
});

const preview = new LabelText({
  name: "preview",
  className: "dui-dock-demo-workspace",
  text: "Preview"
});

const inspector = new PropertyGrid({
  name: "inspector",
  width: "100%",
  height: "100%",
  labelWidth: 88
});

const details = new LabelText({
  name: "details",
  className: "dui-dock-demo-workspace",
  text: "Selection details"
});

const log = new LogPanel({
  name: "log",
  css: "dui-dock-demo-log"
});

const output = new LogPanel({
  name: "output",
  css: "dui-dock-demo-log"
});

const dock = new DockLayout("#root", {
  name: "workbenchDock",
  areaSizes: {
    left: 240,
    right: 300,
    bottom: 140
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
  title: "Workspace",
  area: "center",
  closeable: false,
  collapsible: false,
  movable: false,
  content: workspace
});

dock.addPanel({
  name: "previewPanel",
  title: "Preview",
  area: "center",
  closeable: false,
  collapsible: false,
  content: preview
});

dock.addPanel({
  name: "inspectorPanel",
  title: "Inspector",
  area: "right",
  closeable: true,
  pinnable: true,
  content: inspector
});

dock.addPanel({
  name: "detailsPanel",
  title: "Details",
  area: "right",
  closeable: true,
  pinnable: true,
  content: details
});

dock.addPanel({
  name: "logPanel",
  title: "Logs",
  area: "bottom",
  closeable: true,
  pinnable: true,
  content: log
});

dock.addPanel({
  name: "outputPanel",
  title: "Output",
  area: "bottom",
  closeable: true,
  pinnable: true,
  content: output
});

inspector.bind(selectedObject);

projectTree.events.on("selectionChange", event => {
  const selected = event.items.map(item => item.id).join(", ") || "(none)";
  log.write(`project selection ${selected}`);
});

inspector.events.on("propertyChange", event => {
  log.write(`property ${event.name}: ${formatValue(event.oldValue)} -> ${formatValue(event.newValue)}`);
});

dock.events.on("panelCollapse", event => {
  log.write(`collapse ${event.panel.title}`);
});

dock.events.on("panelExpand", event => {
  log.write(`expand ${event.panel.title}`);
});

dock.events.on("panelMove", event => {
  log.write(`move ${event.panel.title}: ${event.oldArea} -> ${event.area}`);
});

dock.events.on("panelPin", event => {
  log.write(`pin ${event.panel.title}`);
});

dock.events.on("panelUnpin", event => {
  log.write(`unpin ${event.panel.title}`);
});

dock.events.on("panelClose", event => {
  log.write(`close ${event.panel.title}`);
});

dock.events.on("panelAutoHideShow", event => {
  log.write(`auto-hide show ${event.panel.title}`);
});

dock.events.on("panelAutoHideHide", event => {
  log.write(`auto-hide hide ${event.panel.title}`);
});

log.write("lab19 ready");
output.write("output ready");

window.lab19 = {
  dock,
  projectTree,
  workspace,
  preview,
  inspector,
  details,
  log,
  output,
  selectedObject
};

function formatValue(value) {
  return value == null || value === "" ? "(empty)" : String(value);
}
