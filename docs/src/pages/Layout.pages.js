import { importsFor } from "./pageHelpers.js";
import { Form, Layout, Panel, ReadonlyText, TextArea, TextInput } from "../../../src/ui/index.js";
import { Accordion, DockGroup, DockPanel } from "../../../src/ui/experimental.js";

// Containers mount before attaching their live children. ExampleHost supplies the host.
function layoutExample(title, create, description, styles) {
  return { title, create, description, styles,
    source: `${create.toString()}\n\nconst example = ${create.name}({ container: "#root", log });\n// Replace log.write with your application action.\n// On screen teardown: example.destroy();` };
}

const ownershipNotes = [
  "Mount Panel, Layout or Accordion before attaching children. Form rows and Toolbar items support composition before mounting. The returned top-level control owns and destroys the complete example.",
  "Attach each live control to one owner. LayoutCell.add(control) and attach(control) replace and destroy previous content by default. Use attach(control, {replace: false}) to append, or compose several controls inside one mounted Form or Panel."
];

export const simpleLayoutPage = {
  id: "simple-layout", title: "Simple Layout", status: "stable",
  keywords: ["Panel", "container", "Form", "header", "title", "frame", "border"],
  description: "Containers for fields, forms and other controls, with independent header and frame options.",
  imports: importsFor(["Form", "Layout", "Panel", "TextInput"]),
  paragraphs: [
    "Use Panel as a general content owner and Form to arrange named fields. For a container with a title bar, use Layout with a single content cell.",
    "Layout title and header control the heading; bordered controls the outer frame independently. A title normally makes the header visible, while header: false hides it. These are configurations of the existing stable controls."
  ],
  examples: [layoutExample("Headers and frames", function createSimpleLayouts({ container }) {
    const owner = new Panel(container, { name: "simpleLayouts", className: "dui-docs-simple-layouts" });
    const variants = [
      { name: "plain", title: "Plain", header: false, bordered: false },
      { name: "framed", title: "Frame only", header: false, bordered: true },
      { name: "titled", title: "Title only", header: true, bordered: false },
      { name: "titledFramed", title: "Title and frame", header: true, bordered: true }
    ];
    for (const variant of variants) {
      const layout = new Layout({ ...variant, height: 106, resizable: false, cols: [{ name: variant.name + "Content" }] });
      owner.add(layout);
      const form = new Form({ name: variant.name + "Form", labelWidth: 80 }).row(
        new TextInput({ name: variant.name + "Name", label: "Name", value: variant.title })
      );
      const content = new Panel({ name: variant.name + "Padding", padding: 12 });
      layout.cell(variant.name + "Content").attach(content);
      content.add(form);
    }
    return owner;
  }, "The four containers have identical field content. Compare no decoration, frame only, title only and title with frame.",
  ".dui-docs-simple-layouts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }\n@media (max-width: 800px) { .dui-docs-simple-layouts { grid-template-columns: minmax(0, 1fr); } }"),
  layoutExample("Plain Panel with a Form", function createPanelForm({ container }) {
    const panel = new Panel(container, { name: "plainPanel", bordered: false, padding: 12 });
    const form = new Form({ name: "profile", labelWidth: 80 })
      .row(new TextInput({ name: "displayName", label: "Name", value: "Ada" }))
      .row(new TextInput({ name: "team", label: "Team", value: "Tools" }));
    panel.add(form);
    return panel;
  }, "Panel supplies ownership and padding; Form supplies field geometry. Set bordered: true when the panel needs a frame.")],
  options: [
    { name: "bordered", type: "boolean", description: "Panel and Layout outer frame; default false." },
    { name: "title / header", type: "string / boolean", description: "Layout title bar text and explicit visibility." },
    { name: "padding / scroll", type: "number | string / string", description: "Panel content padding and overflow: visible, hidden, auto, x or y." },
    { name: "width / height", type: "number | string", description: "Container dimensions; numbers are pixels." }
  ], methods: [
    { name: "add(...controls) / attach(control)", type: "Panel / Control", description: "Compose live children after mounting." },
    { name: "setBordered(boolean)", type: "Panel | Layout", description: "Toggle the frame." },
    { name: "setTitle(text) / setHeaderVisible(boolean)", type: "Layout", description: "Update Layout header text or visibility independently." },
    { name: "getItem(name) / getItems()", type: "Control | null / Control[]", description: "Read owned children." }
  ], notes: ownershipNotes
};

export const borderLayoutPage = {
  id: "border-layout", title: "Border Layout", status: "stable",
  keywords: ["split", "splitter", "resize", "IDE", "workspace", "rows", "cols"],
  description: "An IDE-style workspace with two upper panes and a bottom pane spanning the full width.",
  imports: importsFor(["Form", "Layout", "Panel", "ReadonlyText", "TextArea", "TextInput"]),
  paragraphs: [
    "Border Layout is a recipe using nested Layout instances. The outer layout divides the workspace into rows; the upper row contains a second layout divided into columns. This keeps the bottom panel as wide as the entire workspace.",
    "Drag the vertical or horizontal separator to resize adjacent regions. minSize prevents a pane from becoming too small. Layout handles fixed rows and columns; DockLayout is the separate option for movable docking windows."
  ],
  examples: [layoutExample("IDE workspace", function createIdeWorkspace({ container, log }) {
    const workspace = new Layout(container, {
      name: "ideWorkspace", height: 380, bordered: true,
      rows: [{ name: "upper", flex: 1, minSize: 160 }, { name: "bottom", height: 110, minSize: 72 }]
    });
    const upper = new Layout({ name: "upperSplit", height: "100%",
      cols: [{ name: "explorer", width: 240, minSize: 150 }, { name: "editor", flex: 1, minSize: 200 }]
    });
    workspace.cell("upper").attach(upper);
    const explorer = new Layout({ name: "explorerPane", title: "Explorer", height: "100%", cols: [{ name: "explorerBody" }] });
    const editor = new Layout({ name: "editorPane", title: "Editor", height: "100%", cols: [{ name: "editorBody" }] });
    const output = new Layout({ name: "outputPane", title: "Output", height: "100%", cols: [{ name: "outputBody" }] });
    upper.cell("explorer").attach(explorer);
    upper.cell("editor").attach(editor);
    workspace.cell("bottom").attach(output);
    const explorerContent = new Panel({ name: "explorerContent", padding: 12 });
    explorer.cell("explorerBody").attach(explorerContent);
    explorerContent.add(new Form({ name: "projectFields", labelWidth: 56 }).row(
      new TextInput({ name: "projectName", label: "Project", value: "Tæt UI", width: "100%" })
    ));
    const editorContent = new Panel({ name: "editorContent", padding: 12, height: "100%", scroll: "auto" });
    editor.cell("editorBody").attach(editorContent);
    editorContent.add(new TextArea({ name: "editorText", label: "Notes", labelPosition: "top", width: "100%", rows: 6,
      value: "Edit these notes.\nResize Explorer using the vertical separator.\nResize Output using the horizontal separator." }));
    const outputContent = new Panel({ name: "outputContent", padding: 12, scroll: "auto" });
    output.cell("outputBody").attach(outputContent);
    outputContent.add(new ReadonlyText({ name: "buildOutput", text: "Ready. Workspace loaded; no build is running." }));
    workspace.events.on("resizeEnd", () => log.write("Output pane resized"));
    upper.events.on("resizeEnd", () => log.write("Explorer and Editor resized"));
    return workspace;
  }, "The bottom Output pane always spans both upper panes. Field values stay intact while either splitter moves.")],
  options: [
    { name: "rows / cols", type: "CellConfig[]", description: "Choose one direction per Layout; nest another Layout for a second direction." },
    { name: "name", type: "string", description: "Unique cell key used by layout.cell(name)." },
    { name: "width / height / flex", type: "number / number / number", description: "Initial pixel size or proportional share of available space." },
    { name: "minSize / maxSize", type: "number", description: "Cell size limits while resizing." },
    { name: "resizable", type: "boolean", description: "Enable drag separators; default true." }
  ], methods: [
    { name: "cell(name).attach(control)", type: "Control", description: "Place a container or editor inside a cell." },
    { name: "setCellSize(name, size, options)", type: "Layout", description: "Resize a cell programmatically within its limits." },
    { name: "setResizable(boolean)", type: "Layout", description: "Enable or disable splitter dragging." }
  ], events: [{ name: "resizeStart / resize / resizeEnd", type: "LayoutEvent", description: "Observe drag resizing of neighboring cells." }], notes: ownershipNotes
};

export const tabsLayoutPage = {
  id: "tabs-layout", title: "Tabs", status: "experimental",
  keywords: ["TabBar", "DockGroup", "DockPanel", "pages", "tabbed", "container"],
  description: "Share one content area between several persistent panels.",
  imports: importsFor(["Form", "Panel", "TextInput", "TextArea", "DockGroup", "DockPanel"]),
  paragraphs: [
    "TabBar renders the tab strip and handles selection, keyboard focus and overflow. DockGroup combines that strip with owned DockPanel content and synchronizes the active panel.",
    "The example uses an ordinary tabbed group without a docking workspace. Switching tabs hides inactive panels and preserves their controls and values."
  ],
  examples: [layoutExample("Tabs with persistent content", function createTabbedLayout({ container, log }) {
    const group = new DockGroup(container, { name: "settingsTabs", height: 230 });
    const general = new DockPanel({ name: "generalTab", title: "General", css: "dui-docs-tab-page", closeable: false, collapsible: false, pinnable: false, movable: false });
    const notes = new DockPanel({ name: "notesTab", title: "Notes", css: "dui-docs-tab-page", closeable: false, collapsible: false, pinnable: false, movable: false });
    group.addPanel(general);
    group.addPanel(notes);
    const generalContent = new Panel({ name: "generalTabContent", padding: 12, scroll: "auto" });
    const notesContent = new Panel({ name: "notesTabContent", padding: 12, scroll: "auto" });
    general.add(generalContent);
    notes.add(notesContent);
    generalContent.add(new Form({ name: "tabProfile", labelWidth: 80 })
      .row(new TextInput({ name: "tabName", label: "Name", value: "Ada" }))
      .row(new TextInput({ name: "tabTeam", label: "Team", value: "Tools" })));
    notesContent.add(new TextArea({ name: "tabNotes", label: "Notes", value: "Draft notes stay here when you change tabs.", width: "100%" }));
    group.events.on("activePanelChange", event => log.write("Active tab: " + event.panel.title));
    return group;
  }, "Edit Name, switch to Notes, then return to General. The edited value survives the tab change. Tab focuses the strip; arrow keys move between tab headers and Enter selects. The CSS below hides redundant panel headers, keeping each title in its tab only.",
  ".dui-dock-panel.dui-docs-tab-page { grid-template-rows: minmax(0, 1fr); }\n.dui-docs-tab-page > .dui-dock-panel__header { display: none; }")],
  options: [
    { name: "DockPanel title", type: "string", description: "Caption shown in the tab strip." },
    { name: "DockPanel closeable / collapsible / pinnable / movable", type: "boolean", description: "Disable these actions for simple fixed tab pages." },
    { name: "TabBar orientation", type: '"top" | "bottom" | "left" | "right"', description: "Available strip positions when composing TabBar directly." }
  ], methods: [
    { name: "group.addPanel(panel)", type: "DockPanel", description: "Attach a page and register its tab." },
    { name: "group.setActivePanel(id, options)", type: "boolean", description: "Select the visible page by its control id." },
    { name: "group.getPanel(id)", type: "DockPanel | null", description: "Access a page and its owned controls." },
    { name: "group.tabs", type: "TabBar", description: "The owned strip; DockGroup synchronizes it with the panels." }
  ], events: [{ name: "activePanelChange", type: "{ oldPanelId, panelId, panel, origin, userAction }", description: "Reports a newly selected page." }], notes: ownershipNotes
};

export const accordionPage = {
  id: "accordion", title: "Accordion", status: "experimental",
  keywords: ["collapse", "expand", "sections", "disclosure", "Accordeon"],
  description: "Collapsible titled sections containing live forms, panels or other controls.",
  imports: importsFor(["Form", "TextInput", "ReadonlyText", "Accordion"]),
  paragraphs: [
    "Accordion groups content under expandable headings. By default opening a section closes the previous one; multiple: true allows several sections to remain open. All sections may be collapsed.",
    "Sections own live controls. Collapsing content hides it without destroying or resetting its fields. Header buttons expose expanded state and their associated regions; ArrowUp/ArrowDown, Home and End move between headers, while Enter and Space toggle them."
  ],
  examples: [layoutExample("One open section", function createSingleAccordion({ container, log }) {
    const accordion = new Accordion(container, { name: "settingsAccordion",
      onChange: event => log.write("Open sections: " + JSON.stringify(event.newValue)) });
    accordion.addSection({ name: "general", title: "General", expanded: true },
      new Form({ name: "accordionGeneral", labelWidth: 80 }).row(new TextInput({ name: "accordionName", label: "Name", value: "Ada" })));
    accordion.addSection({ name: "connection", title: "Connection" },
      new Form({ name: "accordionConnection", labelWidth: 80 }).row(new TextInput({ name: "server", label: "Server", value: "localhost" })));
    accordion.addSection({ name: "advanced", title: "Advanced" },
      new ReadonlyText({ name: "advancedDetails", text: "Additional settings can contain any Tæt UI control." }));
    return accordion;
  }, "Edit Name, open Connection, then return to General. The value is preserved while only one section stays open."),
  layoutExample("Several open sections", function createMultipleAccordion({ container, log }) {
    const accordion = new Accordion(container, { name: "detailsAccordion", multiple: true, bordered: false,
      onChange: event => log.write("Open sections: " + JSON.stringify(event.newValue)) });
    accordion.addSection({ name: "source", title: "Source", expanded: true },
      new Form({ name: "sourceDetails", labelWidth: 80 }).row(new TextInput({ name: "sourceFile", label: "File", value: "input.csv" })));
    accordion.addSection({ name: "destination", title: "Destination", expanded: true },
      new Form({ name: "destinationDetails", labelWidth: 80 }).row(new TextInput({ name: "destinationFile", label: "File", value: "output.json" })));
    accordion.addSection({ name: "managed", title: "Managed settings", disabled: true },
      new ReadonlyText({ name: "managedDetails", text: "This section is unavailable." }));
    return accordion;
  }, "Both sections start open. Toggle either independently. This example also removes the outer frame and includes a disabled heading.")],
  options: [
    { name: "multiple", type: "boolean", description: "Allow several expanded sections; default false." },
    { name: "bordered", type: "boolean", description: "Draw the outer frame; default true." },
    { name: "addSection options", type: "{ name, title, expanded?, disabled? }", description: "Unique section key, heading and initial state. Content is passed as a separate live Control." }
  ], methods: [
    { name: "addSection(options, content)", type: "Control | null", description: "Mount and own unmounted content; null if child addition is cancelled." },
    { name: "getSection(name)", type: "Control | null", description: "Access section content." },
    { name: "getExpanded() / isExpanded(name)", type: "string[] / boolean", description: "Read expanded section names or one section's state." },
    { name: "expand(name) / collapse(name) / toggle(name)", type: "boolean", description: "Change expansion; each accepts mutation options as its second argument." },
    { name: "setExpanded(name, expanded, options)", type: "boolean", description: "Set expansion with origin, userAction and silent metadata." },
    { name: "removeSection(name)", type: "Control | null", description: "Remove the section and destroy its owned content." }
  ], events: [
    { name: "beforeChange", type: "{ name, expanded, oldValue, newValue, cancel, origin, userAction }", description: "Cancellable expansion transition; values are arrays of section names." },
    { name: "change", type: "ExpansionEvent", description: "Committed expansion. silent: true synchronizes the UI without either public event." }
  ], notes: [...ownershipNotes, "Disabling Accordion disables its headers. Disable individual content controls separately when the fields themselves should be unavailable."]
};
