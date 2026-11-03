import { Button, Toolbar, LabelText, List, TreeList, MapperWindow, MdiWorkspace, ConnectorLayer, ConnectorModel } from "../../src/ui/all.js";

const workspace = new MdiWorkspace("#workspace", { name:"listMapper" });
const source = new TreeList({ name:"sourceFields", nodeReorder:false, expandedIds:["order", "customer"], renderItem:renderField });
source.data.parse([
  { id:"order", text:"Order", type:"object" },
  { id:"orderId", parentId:"order", text:"Order ID", type:"integer" },
  { id:"customer", parentId:"order", text:"Customer", type:"object" },
  { id:"customerId", parentId:"customer", text:"Customer ID", type:"string" },
  { id:"name", parentId:"customer", text:"Name", type:"string" },
  { id:"amount", parentId:"order", text:"Amount", type:"decimal" },
  ...Array.from({ length:25 }, (_, index) => ({ id:`extra-${index}`, parentId:"order", text:`Additional field ${index + 1}`, type:"string" }))
]);
const target = new List({ name:"targetFields", renderItem:renderField });
target.data.parse([
  { id:"id", text:"ID", type:"integer" },
  { id:"customer", text:"Customer", type:"string" },
  { id:"total", text:"Total", type:"decimal" }
]);
const sourceWindow = workspace.addWindow(new MapperWindow({
  name:"source", title:"Source · TreeList", x:60, y:70, width:340, height:360,
  portSides:["right"], content:source, statusText:"Collapse Customer: its connections stay attached"
}));
const targetWindow = workspace.addWindow(new MapperWindow({
  name:"target", title:"Target · List", x:670, y:110, width:320, height:250,
  portSides:["left"], content:target, statusText:"Typed logical IDs; no SQL dependency"
}));
const model = new ConnectorModel({ items:[
  { id:"identity", source:{ controlId:"source", itemId:"orderId" }, target:{ controlId:"target", itemId:"id" } },
  { id:"customer-name", source:{ controlId:"source", itemId:"name" }, target:{ controlId:"target", itemId:"customer" } },
  { id:"amount", source:{ controlId:"source", itemId:"amount" }, target:{ controlId:"target", itemId:"total" } }
] });
const layer = new ConnectorLayer({ workspace, model,
  // This rule belongs to this demo, not to Tæt UI's connector model.
  canConnect:({ connector }) => connector.source.controlId === "source" && connector.target.controlId === "target"
});
workspace.attach(layer);
sourceWindow.connect(layer);
targetWindow.connect(layer);
const toolbar = new Toolbar("#actions", { name:"Mapper actions" });
toolbar.add(
  new Button({ text:"Collapse Customer", onClick:() => source.collapse("customer") }),
  new Button({ text:"Expand all", onClick:() => source.expandAll() }),
  new Button({ text:"Silent move", onClick:() => sourceWindow.moveTo(sourceWindow.x === 60 ? 120 : 60, 70, { silent:true }) }),
  new Button({ text:"Reconnect target", onClick:() => { const selected = layer.selection.get()[0]; if (selected) layer.startReconnect(selected.id); } }),
  new Button({ text:"Delete connection", onClick:() => { const selected = layer.selection.get()[0]; if (selected) layer.removeConnection(selected.id); } }),
  new LabelText({ text:"List / TreeList · generic connector controls" })
);
window.mapperLists = { workspace, source, target, sourceWindow, targetWindow, model, layer, toolbar };
window.addEventListener("pagehide", () => { workspace.destroy(); toolbar.destroy(); model.destroy(); }, { once:true });

function renderField(item) {
  // Trusted custom renderer: the control still owns the tree toggle and keyboard.
  const row = document.createElement("span");
  row.className = "mapper-field";
  const text = document.createElement("span");
  text.textContent = item.text;
  const type = document.createElement("small");
  type.textContent = item.type;
  row.append(text, type);
  return row;
}
