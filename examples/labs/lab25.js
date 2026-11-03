import { CommandRegistry } from "../../src/core/CommandRegistry.js";
import {
  ContextMenu,
  DockLayout,
  Grid,
  LogPanel,
  Menu,
  MessageBox,
  PropertyInspector,
  StatusText,
  Toolbar,
  TreeGrid,
  gridEditors
} from "../../src/ui/all.js";

const owners = ["Alice", "Bruno", "Chen", "Daria"];
const statuses = ["Draft", "Ready", "Blocked"];
const commands = new CommandRegistry();
let selectedMapping = null;

const log = new LogPanel({ name:"workbenchLog", css:"dui-workbench__log" });
const status = new StatusText({ name:"workbenchStatus", text:"Ready" });

const mappings = new Grid({
  name:"mappingGrid",
  className:"dui-workbench__grid",
  width:"100%",
  height:"100%",
  rowHeight:24,
  statusBar:{ visible:true, showRowPosition:true, showTotalCount:true },
  columns:[
    { id:"source", title:"Source field", width:190, sortable:true,
      editor:gridEditors.text() },
    { id:"target", title:"Target field", width:190, sortable:true,
      editor:gridEditors.text() },
    { id:"transform", title:"Transform", width:150,
      editor:gridEditors.select({ options:["Direct", "Trim", "Uppercase", "Lookup"] }) },
    { id:"owner", title:"Owner", width:120,
      editor:gridEditors.select({ options:owners }) },
    { id:"enabled", title:"Enabled", width:80, align:"center",
      editor:gridEditors.switch({ onText:"", offText:"" }) }
  ]
});

mappings.data.parse([
  { id:"map-1", source:"customer_id", target:"client.id", transform:"Direct", owner:"Alice", enabled:true, status:"Ready" },
  { id:"map-2", source:"full_name", target:"client.name", transform:"Trim", owner:"Bruno", enabled:true, status:"Draft" },
  { id:"map-3", source:"country_code", target:"client.country", transform:"Lookup", owner:"Chen", enabled:true, status:"Ready" },
  { id:"map-4", source:"legacy_note", target:"client.note", transform:"Trim", owner:"Daria", enabled:false, status:"Blocked" }
], { origin:"import" });

const projectTree = new TreeGrid({
  name:"projectExplorer",
  className:"dui-workbench__tree",
  width:"100%",
  height:"100%",
  expandedIds:["project", "sources", "targets", "mappings"],
  treeColumnId:"name",
  columns:[{ id:"name", title:"Project", minWidth:190 }]
});

projectTree.data.parse([
  { id:"project", name:"Customer Migration" },
  { id:"sources", parentId:"project", name:"Sources" },
  { id:"src-customer", parentId:"sources", name:"Customer.csv" },
  { id:"src-country", parentId:"sources", name:"Countries.json" },
  { id:"targets", parentId:"project", name:"Targets" },
  { id:"target-client", parentId:"targets", name:"Client API" },
  { id:"mappings", parentId:"project", name:"Mappings" },
  { id:"mapping-customer", parentId:"mappings", name:"Customer Mapping" }
], { origin:"import" });

const inspector = new PropertyInspector({
  name:"mappingInspector",
  className:"dui-workbench__inspector",
  width:"100%",
  height:"100%",
  grid:{ labelWidth:125, expandedProperties:["transform.options"] }
});

commands.register("project.save", {
  label:"Save",
  shortcut:"Ctrl+S",
  run() {
    status.setText("Saved");
    log.write("project saved");
  }
});

commands.register("mapping.add", {
  label:"Add mapping",
  run() {
    const id = `map-${mappings.data.all().length + 1}`;
    const row = { id, source:"new_field", target:"client.field", transform:"Direct", owner:"Alice", enabled:true, status:"Draft" };
    mappings.data.add(row, { origin:"command", userAction:true });
    mappings.setSelectedIds([id], { origin:"command", userAction:true });
    selectMapping(row);
    log.write(`mapping added ${id}`);
  }
});

commands.register("mapping.validate", {
  label:"Validate",
  shortcut:"Ctrl+Shift+V",
  run:async () => {
    const active = mappings.data.all().filter(row => row.enabled);
    const blocked = active.filter(row => row.status === "Blocked");
    log.write(`validation complete: ${active.length} active, ${blocked.length} blocked`);
    status.setText(blocked.length ? "Validation warnings" : "Valid");
    await MessageBox.alert(
      blocked.length ? `${blocked.length} active mapping requires attention.` : `${active.length} active mappings are valid.`,
      { title:"Validation" }
    );
  }
});

commands.register("mapping.delete", {
  label:"Delete mapping",
  enabled:() => selectedMapping != null,
  run:async () => {
    if (!selectedMapping) return;
    const id = selectedMapping.id;
    const result = await MessageBox.confirm(`Delete ${selectedMapping.source} -> ${selectedMapping.target}?`, {
      title:"Delete Mapping"
    });
    if (result !== "ok") return;
    mappings.data.remove(id, { origin:"command", userAction:true });
    selectMapping(null);
    log.write(`mapping deleted ${id}`);
  }
});

const menu = new Menu("#workbench-menu", {
  name:"workbenchMenu",
  commands,
  items:[
    { text:"File", items:[{ command:"project.save" }, "-", { text:"Close", disabled:true }] },
    { text:"Mapping", items:[
      { command:"mapping.add" },
      { command:"mapping.validate" },
      "-",
      { command:"mapping.delete" }
    ] },
    { text:"View", items:[{ text:"Compact desktop", checked:true }] }
  ]
});

const toolbar = new Toolbar("#workbench-toolbar", { name:"workbenchToolbar", commands });
toolbar
  .addCommand("project.save", { tooltip:"Save project" })
  .addSeparator()
  .addCommand("mapping.add", { tooltip:"Add mapping" })
  .addCommand("mapping.validate", { tooltip:"Validate mappings" })
  .addCommand("mapping.delete", { tooltip:"Delete selected mapping" })
  .addSeparator()
  .add(status);

const dock = new DockLayout("#workbench-dock", {
  name:"mappingWorkbench",
  areaSizes:{ left:235, right:300, bottom:145 }
});
dock.addPanel({ name:"project", title:"Project Explorer", area:"left", pinnable:true, content:projectTree });
dock.addPanel({ name:"mapping", title:"Customer Mapping", area:"center", closeable:false, collapsible:false, movable:false, content:mappings });
dock.addPanel({ name:"inspector", title:"Properties", area:"right", pinnable:true, content:inspector });
dock.addPanel({ name:"logs", title:"Logs", area:"bottom", pinnable:true, content:log });

const contextMenu = new ContextMenu({
  name:"mappingContextMenu",
  commands,
  items:[{ command:"mapping.add" }, { command:"mapping.validate" }, "-", { command:"mapping.delete" }]
});
contextMenu.mount(document.body);
contextMenu.attach(mappings.element);

mappings.events.on("selectionChange", event => {
  selectMapping(event.items[0] ?? null);
});
mappings.events.on("cellChange", event => {
  log.write(`${event.columnId}: ${String(event.oldValue)} -> ${String(event.newValue)}`);
  if (selectedMapping?.id === event.id) inspector.refresh({ silent:true, origin:"system" });
});
inspector.events.on("propertyChange", event => {
  log.write(`property ${event.name}: ${String(event.oldValue)} -> ${String(event.newValue)}`);
});
projectTree.events.on("selectionChange", event => {
  const item = event.items[0];
  if (item) log.write(`project selected ${item.name}`);
});

function selectMapping(row) {
  selectedMapping = row ? new MappingProperties(row) : null;
  if (selectedMapping) inspector.bind(selectedMapping, { silent:true, origin:"system" });
  else inspector.clear({ silent:true, origin:"system" });
  commands.refreshState({ origin:"system" });
  status.setText(row ? `Selected ${row.id}` : "Ready");
}

class MappingProperties {
  constructor(row) {
    this.row = row;
    this.id = row.id;
  }

  getProperties() {
    return [
      { title:"Mapping", properties:[
        { name:"source", label:"Source", type:"text", value:this.row.source,
          description:"Source field read from the input dataset." },
        { name:"target", label:"Target", type:"text", value:this.row.target,
          description:"Destination field written by this mapping." },
        { name:"transform", label:"Transform", type:"select", value:this.row.transform,
          options:["Direct", "Trim", "Uppercase", "Lookup"],
          description:"Transformation applied before the value is written." },
        { name:"options", path:"transform.options", label:"Transform options", type:"readonly", value:"",
          description:"Additional settings used by the selected transformation.",
          children:[
            { name:"trim", label:"Trim input", type:"boolean", value:this.row.transform === "Trim" },
            { name:"empty", label:"Allow empty", type:"boolean", value:true }
          ] }
      ] },
      { title:"Execution", properties:[
        { name:"owner", label:"Owner", type:"select", value:this.row.owner, options:owners,
          description:"Person responsible for reviewing this mapping." },
        { name:"enabled", label:"Enabled", type:"boolean", value:this.row.enabled,
          description:"Controls whether validation and execution include this mapping." },
        { name:"status", label:"Status", type:"select", value:this.row.status, options:statuses,
          description:"Current review state of the mapping." },
        { name:"priority", label:"Priority", type:"integer", value:10, min:0, max:100,
          description:"Integer execution priority." },
        { name:"effectiveDate", label:"Effective date", type:"date", value:"2026-07-11",
          description:"Date when this mapping becomes active." },
        { name:"runTime", label:"Run time", type:"time", value:"09:30",
          description:"Preferred daily execution time." },
        { name:"lastRun", label:"Last run", type:"dateTime", value:"2026-07-10T16:45",
          description:"Date and time of the latest execution." },
        { name:"autoRetry", label:"Auto retry", type:"switch", value:true,
          description:"Automatically retry a failed mapping." },
        { name:"reviewMode", label:"Review mode", type:"radio", value:"standard",
          options:[
            { value:"standard", text:"Standard" },
            { value:"strict", text:"Strict" },
            { value:"off", text:"Off" }
          ],
          description:"Double-click to expand the available radio choices." }
      ] }
    ];
  }

  setProperty(name, value) {
    mappings.data.update(this.id, { [name]:value }, { origin:"user", userAction:true });
    this.row = mappings.data.get(this.id);
  }
}

selectMapping(mappings.data.all()[0]);
mappings.setSelectedIds(["map-1"], { silent:true, origin:"system" });
log.write("workbench ready");

window.lab25 = { menu, toolbar, dock, projectTree, mappings, inspector, log, status, commands, contextMenu };
