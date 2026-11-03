import { importsFor } from "./pageHelpers.js";
import { TreeList } from "../../../src/ui/all.js";

const hierarchyItems = [
  { id:"base-control", title:"BaseControl" },
  { id:"button", parentId:"base-control", title:"Button" },
  { id:"tool-button", parentId:"button", title:"ToolButton" },
  { id:"editor-control", parentId:"base-control", title:"EditorControl" },
  { id:"text-field", parentId:"editor-control", title:"TextField" },
  { id:"text-input", parentId:"text-field", title:"TextInput" },
  { id:"text-area", parentId:"text-field", title:"TextArea" },
  { id:"number-input", parentId:"text-field", title:"NumberInput" },
  { id:"select-input", parentId:"text-field", title:"SelectInput" },
  { id:"panel", parentId:"base-control", title:"Panel" },
  { id:"form", parentId:"panel", title:"Form" },
  { id:"layout", parentId:"panel", title:"Layout" },
  { id:"list", parentId:"base-control", title:"List" },
  { id:"tree-list", parentId:"list", title:"TreeList" },
  { id:"grid-core", parentId:"base-control", title:"GridCore" },
  { id:"grid", parentId:"grid-core", title:"Grid" },
  { id:"tree-grid", parentId:"grid-core", title:"TreeGrid" }
];

export const objectModelPage = {
  id: "object-model",
  title: "Object Model",
  status: "stable",
  keywords: ["basecontrol", "inheritance", "eventbus", "disposablebag", "control hierarchy"],
  description: "Understand the live control objects, inheritance contracts and composed services that form Tæt UI.",
  imports: importsFor(["BaseControl", "EditorControl", "EventBus", "Panel", "TextInput"]),
  paragraphs: [
    "Every visual Tæt UI component is a live JavaScript object derived from BaseControl. The object owns its rendered element, state, lifecycle and public event surface; it is not a descriptor for a virtual DOM node.",
    "Inheritance supplies shared UI contracts. Button inherits the base lifecycle directly, TextInput adds editor and text-field contracts, while Panel adds child ownership and composition.",
    "EventBus and DisposableBag are composed services, not parent classes. Every BaseControl creates an events bus for semantic notifications and a disposable bag for listeners, subscriptions and observers that must be released with the control."
  ],
  sections: [
    {
      title: "Object Hierarchy",
      create() {
        const hierarchy = new TreeList({
          name: "controlHierarchy",
          width: "100%",
          height: 272,
          textField: "title"
        });

        hierarchy.data.parse(hierarchyItems, { origin:"import" });
        hierarchy.expandAll({ silent:true, origin:"system" });
        return hierarchy;
      }
    }
  ],
  methods: [
    { name:"mount(container)", type:"BaseControl", description:"Creates and attaches the control's DOM representation." },
    { name:"refresh()", type:"void", description:"Synchronizes the rendered representation with current object state." },
    { name:"show() / hide()", type:"BaseControl", description:"Changes visibility through cancellable lifecycle events." },
    { name:"enable() / disable()", type:"void", description:"Changes the shared interaction state." },
    { name:"focus() / blur()", type:"boolean", description:"Uses the control's standard focus target." },
    { name:"setSize(width, height)", type:"BaseControl", description:"Changes shared width and height state." },
    { name:"destroy()", type:"void", description:"Releases DOM, events, disposables and owned resources." }
  ],
  tables: [
    {
      title: "Composed Services and State",
      rows: [
        { name:"events", type:"EventBus", description:"Per-control bus for object-based semantic events." },
        { name:"disposables", type:"DisposableBag", description:"Owns cleanup callbacks, native listeners and subscriptions." },
        { name:"state", type:"State API", description:"Exposes semantic flags such as focused, invalid, readonly and dirty." },
        { name:"element", type:"HTMLElement | null", description:"Rendered root owned by the control after mounting." },
        { name:"parent", type:"BaseControl | null", description:"Owning container in the live control graph." }
      ]
    }
  ],
  notes: [
    "Inheritance describes behavior; parent and child ownership describes the live screen composition.",
    "Do not treat EventBus, DataStore or CommandRegistry as visual controls.",
    "Application code should use public control APIs instead of depending on a component's internal DOM structure."
  ]
};
