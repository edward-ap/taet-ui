import { Button } from "../../src/ui/Button.js?v=23.1";
import { LabelText } from "../../src/ui/LabelText.js?v=23.1";
import { Layout } from "../../src/ui/Layout.js?v=23.1";
import { LogPanel } from "../../src/ui/LogPanel.js?v=23.1";
import { Panel } from "../../src/ui/Panel.js?v=23.1";
import { TreeGrid } from "../../src/ui/TreeGrid.js?v=23.6";
import { gridEditors } from "../../src/ui/GridEditors.js?v=23.2";
import { Switch } from "../../src/ui/Switch.js?v=23.2";

const themeClasses = ["dui-theme-light", "dui-theme-light-blue", "dui-theme-dark-blue"];
let savedLayout = null;
const owners = ["Nora", "Ivan", "Maya", "Alex", "Sophia"];
const statuses = ["Ready", "Draft", "Review", "Blocked"];

const layout = new Layout("#root", {
  name:"lab23Layout", width:"100%", height:"100%",
  cols:[
    { name:"side", width:220, minSize:190 },
    { name:"main", flex:1, minSize:560 },
    { name:"log", width:300, minSize:230 }
  ]
});
const side = new Panel({ name:"lab23Side", className:"dui-lab23-side", bordered:true, scroll:"auto" });
const main = new Panel({ name:"lab23Main", className:"dui-lab23-main", bordered:true });
const title = new Panel({ name:"lab23Title", className:"dui-lab23-title" });
const log = new LogPanel({ name:"lab23Log", height:"100%" });
const counter = new LabelText({ text:"" });

const tree = new TreeGrid({
  name:"assetTree", className:"dui-lab23-grid", width:"100%", height:"100%",
  rowHeight:24, virtualOverscan:10, multiSelect:true, treeColumnId:"name",
  searchPanel:true,
  statusBar:{ visible:true },
  expandedIds:["workspace-1"],
  columns:[
    { id:"name", title:"Name", width:270, minWidth:150, frozen:"left", sortable:true,
      editor:gridEditors.text({ validators:[value => String(value).trim() ? null : "Name is required"] }) },
    { id:"type", title:"Type", width:100, sortable:true, filterable:true,
      editor:gridEditors.select({ options:["Workspace", "Folder", "Mapping", "Source"] }) },
    { id:"owner", title:"Owner", width:115, sortable:true, filterable:true,
      editor:gridEditors.select({ options:owners }) },
    { id:"status", title:"Status", width:100, sortable:true, filterable:true,
      editor:gridEditors.select({ options:statuses }) },
    { id:"size", title:"Size", width:90, align:"right", sortable:true, dataType:"number",
      editor:gridEditors.number({ min:0, step:1 }), render:value => value === "" ? "" : `${value} KB` },
    { id:"active", title:"Active", width:78, align:"center", sortable:true,
      editor:gridEditors.switch({ onText:"", offText:"" }),
      render:value => Switch.createIndicator(value, { className:"dui-grid__switch-indicator", ariaLabel:value?"Active":"Inactive" }) },
    { id:"modified", title:"Modified", width:128, sortable:true,
      editor:gridEditors.date() }
  ]
});

const rows = createTreeRows();
tree.data.parse(rows, { origin:"import" });
updateCounter();

const buttons = [
  new Button({ text:"Light Blue", onClick:() => setTheme("dui-theme-light-blue") }),
  new Button({ text:"Dark Blue", onClick:() => setTheme("dui-theme-dark-blue") }),
  new Button({ text:"Reset 1,260 Nodes", onClick:() => loadRows() }),
  new Button({ text:"Filter Ready", onClick:() => tree.setColumnFilter("status", "Ready", { origin:"user", userAction:true }) }),
  new Button({ text:"Clear Filter", onClick:() => tree.clearAllFilters({ origin:"user", userAction:true }) }),
  new Button({ text:"Sort Size", onClick:() => tree.sortBy("size", undefined, { origin:"user", userAction:true }) }),
  new Button({ text:"Clear Sort", onClick:() => tree.clearSort({ origin:"user", userAction:true }) }),
  new Button({ text:"Expand All", onClick:() => tree.expandAll({ origin:"user", userAction:true }) }),
  new Button({ text:"Collapse All", onClick:() => tree.collapseAll({ origin:"user", userAction:true }) }),
  new Button({ text:"Select Known", onClick:() => tree.setSelectedIds(["asset-1-2-3", "asset-4-4-2"], { origin:"user", userAction:true }) }),
  new Button({ text:"Scroll Bottom", onClick:() => { const body=tree.element?.querySelector(".dui-grid__body"); if(body) body.scrollTo({ top:body.scrollHeight }); } }),
  new Button({ text:"Clear Selection", onClick:() => tree.clearSelection({ origin:"user", userAction:true }) }),
  new Button({ text:"Hide Owner", onClick:() => tree.hideColumn("owner", { origin:"user", userAction:true }) }),
  new Button({ text:"Show Owner", onClick:() => tree.showColumn("owner", { origin:"user", userAction:true }) }),
  new Button({ text:"Save Layout", onClick:() => { savedLayout = tree.getLayoutState(); log.write("layout saved"); } }),
  new Button({ text:"Restore Layout", onClick:() => { if (savedLayout) tree.restoreLayoutState(savedLayout); } })
];

layout.cell("side").attach(side);
layout.cell("main").attach(main);
layout.cell("log").attach(log);
side.add(new LabelText({ text:"Lab 23" }), new LabelText({ text:"TreeGrid test bench" }), ...buttons);
main.add(title, tree);
title.add(new LabelText({ text:"Asset hierarchy" }), counter);

tree.events.on("selectionChange", event => log.write(`selection ${event.items.map(item=>item.id).join(",") || "(none)"}`));
tree.events.on("expand", event => { log.write(`expand ${event.id}`); updateCounter(); });
tree.events.on("collapse", event => { log.write(`collapse ${event.id}`); updateCounter(); });
tree.events.on("layoutChange", event => log.write(`layout ${event.operation}`));
tree.events.on("columnReorder", event => log.write(`column ${event.columnId}: ${event.oldIndex} -> ${event.index}`));
tree.events.on("activeCellChange", event => log.write(`active ${event.id}.${event.columnId}`));
tree.events.on("cellChange", event => log.write(`cell ${event.id}.${event.columnId}: ${JSON.stringify(event.oldValue)} -> ${JSON.stringify(event.newValue)}`));
tree.events.on("editReject", event => log.write(`edit rejected ${event.id}.${event.columnId}: ${event.reason}`));
tree.events.on("sortChange", event => log.write(`sort ${event.columnId ?? "none"} ${event.direction ?? "none"}`));
tree.events.on("filterChange", event => log.write(`filters ${event.activeColumns.join(",") || "none"}`));

window.lab23 = { layout, side, main, tree, log, loadRows };
log.write(`loaded ${rows.length} nodes`);

function setTheme(themeClass) {
  document.body.classList.remove(...themeClasses);
  document.body.classList.add(themeClass);
}

function updateCounter() {
  counter.setText(`visible ${tree.treeView.entries().length} / total ${tree.data.all().length}`);
}

function loadRows() {
  tree.data.parse(createTreeRows(), { origin:"import" });
  tree.clearAllFilters({ silent:true, origin:"system" });
  tree.clearSort({ silent:true, origin:"system" });
  tree.clearSelection({ silent:true, origin:"system" });
  updateCounter();
  log.write(`loaded ${tree.data.all().length} nodes`);
}

function createTreeRows() {
  const result = [];
  for (let workspace = 1; workspace <= 12; workspace += 1) {
    const workspaceId = `workspace-${workspace}`;
    result.push({ id:workspaceId, icon:"workspace", name:`Workspace ${workspace}`, type:"Workspace", owner:owners[workspace%owners.length], status:"Ready", size:"", active:true, modified:"2026-07-10" });
    for (let folder = 1; folder <= 8; folder += 1) {
      const folderId = `folder-${workspace}-${folder}`;
      result.push({ id:folderId, parentId:workspaceId, icon:"folder", name:`Folder ${folder}`, type:"Folder", owner:owners[folder%owners.length], status:statuses[folder%statuses.length], size:"", active:folder%3!==0, modified:"2026-07-09" });
      for (let asset = 1; asset <= 12; asset += 1) {
        result.push({ id:`asset-${workspace}-${folder}-${asset}`, parentId:folderId,
          icon:asset%3===0?"mapping":"source",
          name:`Asset ${workspace}.${folder}.${asset}`, type:asset%3===0?"Mapping":"Source",
          owner:owners[(workspace+folder+asset)%owners.length], status:statuses[asset%statuses.length],
          size:8+asset*3, active:asset%4!==0, modified:`2026-07-${String(1+(asset%9)).padStart(2,"0")}` });
      }
    }
  }
  return result;
}
