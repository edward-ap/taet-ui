import { DockLayout, Grid, PropertyGrid, TreeList } from "../../src/ui/all.js";

export function createDockWorkbench(container) {
  const project = new TreeList({ name: "projectExplorer" });
  const workspace = new Grid({
    name: "workspaceGrid",
    width: "100%",
    height: "100%",
    columns: [{ id: "name", title: "Name", minWidth: 180 }]
  });
  const properties = new PropertyGrid({ name: "properties", labelWidth: 110 });

  const dock = new DockLayout(container, {
    name: "mainWorkbench",
    areaSizes: { left: 220, right: 280, bottom: 140 }
  });

  dock.addPanel({ name: "project", title: "Project", area: "left", content: project });
  dock.addPanel({
    name: "workspace",
    title: "Workspace",
    area: "center",
    closeable: false,
    collapsible: false,
    movable: false,
    content: workspace
  });
  dock.addPanel({ name: "properties", title: "Properties", area: "right", content: properties });
  return dock;
}
