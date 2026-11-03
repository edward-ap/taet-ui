import {
  ConnectorLayer,
  ConnectorModel,
  Grid,
  LabelText,
  MapperWindow,
  MdiWorkspace,
  Panel,
  TreeGrid
} from "../../src/ui/all.js";

const customers = createFieldGrid("customersGrid", [
  ["customer_id", "Customer ID", "string", "PK"],
  ["full_name", "Full name", "string", ""],
  ["email", "Email", "string", ""],
  ["region_id", "Region ID", "number", "FK"],
  ["status", "Status", "string", ""],
  ["created_at", "Created", "date", ""],
  ["updated_at", "Updated", "date", ""],
  ["segment", "Segment", "string", ""],
  ["credit_limit", "Credit limit", "number", ""],
  ["is_active", "Active", "boolean", ""]
]);

const orders = createFieldGrid("ordersGrid", [
  ["order_id", "Order ID", "number", "PK"],
  ["customer_id", "Customer ID", "string", "FK"],
  ["order_date", "Order date", "date", ""],
  ["amount", "Amount", "number", ""],
  ["currency", "Currency", "string", ""],
  ["status", "Status", "string", ""],
  ["channel", "Channel", "string", ""],
  ["region_id", "Region ID", "number", "FK"],
  ["tax_amount", "Tax amount", "number", ""],
  ["discount", "Discount", "number", ""],
  ["ship_date", "Ship date", "date", ""],
  ["warehouse_id", "Warehouse ID", "number", "FK"]
]);

const projectTree = createProjectTree();
const transformerPanel = new Panel({
  name:"transformerPanel",
  className:"lab27-transformer-panel"
});
const transformerLabel = new LabelText({ text:"TODO: Transformer Logic" });

const workspace = new MdiWorkspace("#workspace", {
  name:"mappingWorkspace"
});

const customersWindow = workspace.addWindow(new MapperWindow({
  name:"customersWindow",
  title:"Customers",
  x:70,
  y:70,
  width:360,
  height:310,
  minWidth:280,
  minHeight:180,
  statusText:"10 available ports",
  content:customers
}));

const ordersWindow = workspace.addWindow(new MapperWindow({
  name:"ordersWindow",
  title:"Orders",
  x:650,
  y:130,
  width:370,
  height:330,
  minWidth:280,
  minHeight:180,
  statusText:"12 available ports",
  content:orders
}));

const projectWindow = workspace.addWindow(new MapperWindow({
  name:"projectWindow",
  title:"Project hierarchy",
  x:390,
  y:450,
  width:430,
  height:270,
  minWidth:320,
  minHeight:190,
  statusText:"Ports follow visible tree nodes",
  content:projectTree
}));

const transformerWindow = workspace.addWindow(new MapperWindow({
  name:"transformerWindow",
  title:"Transformer",
  x:930,
  y:470,
  width:300,
  height:150,
  minWidth:240,
  minHeight:120,
  statusText:"3 inputs / 2 outputs",
  content:transformerPanel,
  portDefinitions:[
    { id:"input-1", label:"Input 1", side:"left" },
    { id:"input-2", label:"Input 2", side:"left" },
    { id:"input-3", label:"Input 3", side:"left" },
    { id:"output-1", label:"Output 1", side:"right" },
    { id:"output-2", label:"Output 2", side:"right" }
  ]
}));
transformerPanel.add(transformerLabel);

const connectors = new ConnectorModel({
  items:[
    {
      id:"customer-orders",
      type:"join",
      label:"Customer join",
      source:{ controlId:"customersWindow", itemId:"customer_id", side:"right" },
      target:{ controlId:"ordersWindow", itemId:"customer_id", side:"left" }
    },
    {
      id:"region-orders",
      type:"join",
      label:"Region join",
      source:{ controlId:"customersWindow", itemId:"region_id", side:"right" },
      target:{ controlId:"ordersWindow", itemId:"region_id", side:"left" }
    }
  ]
});

const connectorLayer = new ConnectorLayer({
  name:"mappingConnections",
  workspace,
  model:connectors
});
workspace.attach(connectorLayer, { replace:false });

customersWindow.connect(connectorLayer);
ordersWindow.connect(connectorLayer);
projectWindow.connect(connectorLayer);
transformerWindow.connect(connectorLayer);
const customersPorts = customersWindow.portProvider;
const ordersPorts = ordersWindow.portProvider;
const projectPorts = projectWindow.portProvider;
const transformerPorts = transformerWindow.portProvider;

connectorLayer.selection.events.on("change", event => {
  const connector = event.items[0];
  document.querySelector("#status").textContent = connector
    ? `${connector.source.controlId}.${connector.source.itemId} → ${connector.target.controlId}.${connector.target.itemId}`
    : "No connection selected";
});

document.querySelector("#cascade").addEventListener("click", () => workspace.arrange("cascade", { origin:"user", userAction:true }));
document.querySelector("#reset").addEventListener("click", () => {
  customersWindow.setBounds({ x:70, y:70, width:360, height:310 }, { origin:"user", userAction:true });
  ordersWindow.setBounds({ x:650, y:130, width:370, height:330 }, { origin:"user", userAction:true });
  projectWindow.setBounds({ x:390, y:450, width:430, height:270 }, { origin:"user", userAction:true });
  transformerWindow.setBounds({ x:930, y:470, width:300, height:150 }, { origin:"user", userAction:true });
});

window.lab27 = {
  workspace,
  customersWindow,
  ordersWindow,
  projectWindow,
  transformerWindow,
  customers,
  orders,
  projectTree,
  transformerPanel,
  connectors,
  connectorLayer,
  customersPorts,
  ordersPorts,
  projectPorts,
  transformerPorts
};

function createFieldGrid(name, definitions) {
  const grid = new Grid({
    name,
    width:"100%",
    height:"100%",
    rowHeight:24,
    virtualRows:true,
    statusBar:false,
    columns:[
      { id:"name", title:"Field", minWidth:100 },
      { id:"type", title:"Type", width:96, minWidth:64 }
    ]
  });
  grid.data.parse(definitions.map(([id, field, type]) => ({ id, name:field, type })), { silent:true, origin:"import" });
  return grid;
}

function createProjectTree() {
  const tree = new TreeGrid({
    name:"projectTreeGrid",
    width:"100%",
    height:"100%",
    rowHeight:24,
    virtualRows:true,
    statusBar:false,
    treeColumnId:"name",
    expandedIds:["project", "inputs", "outputs"],
    columns:[
      { id:"name", title:"Node", minWidth:120 },
      { id:"kind", title:"Kind", width:110, minWidth:72 }
    ]
  });
  tree.data.parse([
    { id:"project", name:"Customer mapping", kind:"Project" },
    { id:"inputs", parentId:"project", name:"Inputs", kind:"Group" },
    { id:"crm", parentId:"inputs", name:"CRM source", kind:"Source" },
    { id:"billing", parentId:"inputs", name:"Billing source", kind:"Source" },
    { id:"outputs", parentId:"project", name:"Outputs", kind:"Group" },
    { id:"customer-output", parentId:"outputs", name:"Customer output", kind:"Target" },
    { id:"audit-output", parentId:"outputs", name:"Audit output", kind:"Target" }
  ], { origin:"import" });
  return tree;
}
