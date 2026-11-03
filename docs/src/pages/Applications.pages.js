import { importsFor } from "./pageHelpers.js";
import { Button, CommandRegistry, Form, Layout, Panel, SelectInput, TextArea, TextInput, Toolbar, required } from "../../../src/ui/index.js";
import { ContextMenu, Dialog, DockLayout, LogPanel, Menu, ProgressBar, StatusText, TreeList } from "../../../src/ui/experimental.js";

function applicationExample(title, create, description, styles) {
  return { title, create, description, styles,
    source: `${create.toString()}\n\nconst example = ${create.name}({ container: "#root", log });\n// Replace log.write with your application action.\n// On screen teardown: example.destroy();` };
}
const ownership = ["The example owner destroys its controls and subscriptions. Application-created commands, context menus and dialogs also need an explicit cleanup path."];

export const menuPage = {
  id: "menu", title: "Menu", status: "experimental",
  keywords: ["application", "menubar", "ContextMenu", "submenu", "commands", "right click"],
  description: "Application menus and context menus with nested commands, disabled items and checked state.",
  imports: importsFor(["Button", "CommandRegistry", "Panel", "Toolbar", "Menu", "ContextMenu", "StatusText"]),
  paragraphs: ["Menu is a horizontal menu bar; ContextMenu opens commands at a pointer position. Both accept the same item definitions, including nested items and separators.",
    "Use CommandRegistry when an action is shared across menus and toolbars. Dynamic enabled/checked predicates are reevaluated by refreshState(). Menu keyboard navigation uses arrows, Enter and Escape; shortcut captions alone do not install application shortcuts."],
  examples: [applicationExample("Menu bar with command state", function createApplicationMenu({ container, log }) {
    const owner = new Panel(container, { name: "menuExample" });
    const commands = new CommandRegistry();
    owner.disposables.add(() => commands.destroy());
    let modified = false;
    let propertiesVisible = true;
    const status = new StatusText({ name: "menuStatus", text: "Document saved" });
    commands.register("document.save", { label: "Save", icon: "save", enabled: () => modified, run() {
      modified = false;
      status.setText("Document saved");
      commands.refreshState();
      log.write("Save executed");
    } });
    commands.register("view.properties", { label: "Properties", checked: () => propertiesVisible, run() {
      propertiesVisible = !propertiesVisible;
      commands.refreshState();
      log.write(propertiesVisible ? "Properties shown" : "Properties hidden");
    } });
    const menu = new Menu({ name: "Application menu", width: "100%", commands, items: [
      { text: "File", items: [{ text: "New", icon: "file", onClick: () => log.write("New document requested") }, { command: "document.save" }, "-", { text: "Export", disabled: true }] },
      { text: "View", items: [{ text: "Panels", items: [{ command: "view.properties" }, { text: "Output", onClick: () => log.write("Output requested") }] }] },
      { text: "Help", items: [{ text: "About", onClick: () => log.write("Tæt UI application menu") }] }
    ] });
    owner.add(menu, new Toolbar({ name: "Document actions", commands }).add(
      new Button({ text: "Mark Modified", onClick: () => { modified = true; status.setText("Unsaved changes"); commands.refreshState(); } })
    ).addCommand("document.save").addSpacer().add(status));
    return owner;
  }, "Save starts disabled in both places. Mark Modified enables it; saving disables it again. View → Panels → Properties demonstrates a checked nested command."),
  applicationExample("Context menu", function createContextMenu({ container, log }) {
    const owner = new Panel(container, { name: "contextMenuExample" });
    const target = new Button({ name: "contextTarget", text: "Right-click for actions", onClick: () => log.write("Use the right mouse button to open the context menu.") });
    const menu = new ContextMenu({ name: "Record actions", items: [
      { text: "Open", icon: "file", onClick: () => log.write("Open record") },
      { text: "Copy", items: [{ text: "Copy name", onClick: () => log.write("Name: Customer mapping") }, { text: "Copy id", onClick: () => log.write("ID: mapping-1") }] },
      "-", { text: "Delete", disabled: true }
    ] });
    owner.add(target, menu);
    menu.attach(target.element);
    return owner;
  }, "Right-click the target, choose a nested action, or press Escape to dismiss. The Copy commands report illustrative values in the event output.")],
  options: [{ name: "items", type: "MenuItem[]", description: "text, icon, disabled, checked, onClick, command or nested items. A dash creates a separator." },
    { name: "commands", type: "CommandRegistry", description: "Shared action definitions and state; owned by the application." }],
  methods: [{ name: "setItems(items)", type: "Menu", description: "Replace menu definitions and close open submenus." },
    { name: "close(options)", type: "boolean", description: "Dismiss the open menu stack." },
    { name: "ContextMenu.attach(element)", type: "ContextMenu", description: "Bind a mounted target's contextmenu event." },
    { name: "ContextMenu.openAt(x, y, options)", type: "boolean", description: "Open at viewport coordinates." }],
  events: [{ name: "beforeOpen / beforeClose", type: "MenuEvent", description: "Cancellable opening and closing." },
    { name: "itemClick", type: "MenuItemEvent", description: "Reports the chosen item." }], notes: ownership
};

export const dockingPage = {
  id: "docking", title: "Docking", status: "experimental",
  keywords: ["DockLayout", "DockPanel", "workspace", "IDE", "panels", "pin", "auto hide", "tabs"],
  description: "A workspace of dockable panels with tabs, resize boundaries, collapsed strips and saved layout state.",
  imports: importsFor(["Button", "Form", "Panel", "TextArea", "TextInput", "Toolbar", "DockLayout", "LogPanel", "TreeList"]),
  paragraphs: ["Layout → Border Layout covers fixed resizable regions. DockLayout adds panel movement, grouped tabs, collapse and pin/auto-hide behavior around a permanent center workspace.",
    "Drag a panel title toward a docking target or use the toolbar commands. Side-panel pin buttons switch to auto-hide; collapsed panels remain available in the edge strips. Save Layout records arrangement only, while the controls retain their own values."],
  examples: [applicationExample("Small application workspace", function createDockingWorkspace({ container, log }) {
    const owner = new Panel(container, { name: "dockingExample" });
    const dock = new DockLayout({ name: "applicationDock", width: "100%", height: 370, areaSizes: { left: 180, right: 215, bottom: 100 } });
    let saved;
    const action = { origin: "user", userAction: true };
    owner.add(new Toolbar({ name: "Docking actions" }).add(
      new Button({ text: "Collapse Explorer", onClick: () => dock.collapsePanel("appExplorer", action) }),
      new Button({ text: "Show Explorer", onClick: () => dock.expandPanel("appExplorer", action) }),
      new Button({ text: "Output to Right", onClick: () => dock.movePanel("appOutput", "right", action) }),
      new Button({ text: "Save Layout", onClick: () => { saved = dock.serializeState(); log.write("Layout saved in memory"); } }),
      new Button({ text: "Restore Layout", onClick: () => { dock.restoreState(saved, action); log.write("Layout restored"); } })
    ), dock);
    const files = new TreeList({ name: "dockFiles", label: "Project files", height: "100%", nodeReorder: false });
    files.data.parse([{ id: "project", text: "Project", parentId: null, icon: "folder" },
      { id: "customers", text: "Customers.csv", parentId: "project", icon: "file" },
      { id: "mapping", text: "Mapping.json", parentId: "project", icon: "file" }]);
    files.expandAll({ silent: true });
    dock.addPanel({ name: "appExplorer", title: "Explorer", area: "left", closeable: false, content: files });
    const editor = new Panel({ name: "dockEditorContent", padding: 12 });
    dock.addPanel({ name: "appEditor", title: "Editor", area: "center", closeable: false, collapsible: false, movable: false, content: editor });
    editor.add(new Form({ name: "dockEditorForm", labelWidth: 72 }).row(new TextInput({ name: "projectName", label: "Project", value: "Customer migration" }))
      .row(new TextArea({ name: "notes", label: "Notes", rows: 3, value: "Edit these values, then move or collapse panels.\nThe controls keep their state." })));
    const properties = new Panel({ name: "dockPropertiesContent", padding: 12 });
    dock.addPanel({ name: "appProperties", title: "Properties", area: "right", closeable: false, content: properties });
    properties.add(new Form({ labelWidth: 60 }).row(new TextInput({ name: "owner", label: "Owner", value: "Alice" })));
    const output = new LogPanel({ name: "dockOutputLog", width: "100%", height: "100%" });
    dock.addPanel({ name: "appOutput", title: "Output", area: "bottom", closeable: false, content: output });
    output.write("Workspace ready.");
    output.write("No background task is running.");
    saved = dock.serializeState();
    for (const event of ["panelCollapse", "panelExpand", "panelMove", "panelPin", "panelUnpin"]) {
      dock.events.on(event, detail => log.write(`${event}: ${detail.panelId}`));
    }
    return owner;
  }, "Resize the boundaries, collapse Explorer, unpin a side panel, or move Output to the right to join Properties as tabs. Restore Layout returns to the last saved arrangement; initially that is the starting layout.")],
  options: [{ name: "areaSizes", type: "object", description: "Initial left, right and bottom sizes in pixels." },
    { name: "panel.area", type: "string", description: "Initial left, center, right or bottom dock area." },
    { name: "panel.collapsible / pinnable / movable / closeable", type: "boolean", description: "Panel actions. The center Editor in this example stays in place." }],
  methods: [{ name: "addPanel({ name, title, area, content })", type: "DockPanel | null", description: "Attach live content after mounting DockLayout. Before mount, the panel is queued." },
    { name: "collapsePanel(id) / expandPanel(id)", type: "boolean", description: "Hide in an edge strip or restore the panel." },
    { name: "movePanel(id, area)", type: "boolean", description: "Move a panel into another dock group." },
    { name: "serializeState() / restoreState(state)", type: "object / DockLayout", description: "Persist sizes, groups and panel arrangement separately from document data." }],
  events: [{ name: "panelCollapse / panelExpand / panelMove", type: "DockPanelEvent", description: "Panel visibility and position changes." },
    { name: "panelPin / panelUnpin", type: "DockPanelEvent", description: "Pinned versus auto-hide state." }], notes: ownership
};

export const statusBarPage = {
  id: "status-bar", title: "StatusBar", status: "experimental",
  keywords: ["application", "status", "footer", "Toolbar", "StatusText", "ProgressBar"],
  description: "A bottom status strip with message text, progress and right-aligned document metadata.",
  imports: importsFor(["Button", "Layout", "Panel", "Toolbar", "StatusText", "ProgressBar"]),
  paragraphs: ["StatusBar is a composition recipe, built from Toolbar, StatusText and ProgressBar. There is no separate StatusBar export. Put the strip in a fixed-height bottom Layout row and let the workspace take the remaining space.",
    "Update StatusText with setText() and progress through value.set(). The buttons below simulate task milestones without starting timers or background work."],
  examples: [applicationExample("Application status strip", function createStatusBar({ container, log }) {
    const owner = new Layout(container, { name: "statusBarExample", height: 210, width: "100%", bordered: true, resizable: false,
      rows: [{ name: "workspace", flex: 1 }, { name: "status", height: 32, minSize: 32 }]
    });
    const workspace = new Panel({ name: "statusWorkspace", padding: 12 });
    owner.cell("workspace").attach(workspace);
    const message = new StatusText({ name: "taskStatus", text: "Ready" });
    const count = new StatusText({ name: "statusCount", text: "0 / 100 rows" });
    const progress = new ProgressBar({ name: "taskProgress", label: "", width: 140, min: 0, max: 100, value: 0, showText: true });
    const bar = new Toolbar({ name: "Application status", css: "dui-docs-status-bar" }).add(message).addSeparator().add(progress).addSpacer().add(count).addSeparator().add(new StatusText({ text: "UTF-8" }));
    owner.cell("status").attach(bar);
    const apply = (text, value) => { message.setText(text); progress.value.set(value); count.setText(`${value} / 100 rows`); log.write(text); };
    workspace.add(new Toolbar({ name: "Simulate task progress" }).add(
      new Button({ text: "Start", onClick: () => apply("Importing…", 0) }),
      new Button({ text: "Advance 25%", onClick: () => { const value = Math.min(100, progress.value.get() + 25); apply(value === 100 ? "Completed" : "Importing…", value); } }),
      new Button({ text: "Complete", onClick: () => apply("Completed", 100) }),
      new Button({ text: "Reset", onClick: () => apply("Ready", 0) })
    ));
    return owner;
  }, "The status strip remains at the bottom. Progress and row count update together; the metadata stays aligned to the right.",
  ".dui-docs-status-bar { height: 100%; box-sizing: border-box; border-top: 1px solid var(--dui-color-border-strong); }\n.dui-docs-status-bar .dui-status-text { border: 0; background: transparent; }\n.dui-docs-status-bar .dui-progress-bar { --dui-label-width: 0px; }")],
  options: [{ name: "Toolbar.addSpacer()", type: "composition", description: "Flexible space pushes trailing status fields to the right." },
    { name: "Layout.rows", type: "LayoutCell[]", description: "Flexible workspace plus a fixed status row." }],
  methods: [{ name: "StatusText.setText(text, options)", type: "StatusText", description: "Update the displayed message." },
    { name: "ProgressBar.value.set(value, options)", type: "boolean", description: "Update the numeric progress state." }], notes: ownership
};

export const dialogBoxPage = {
  id: "dialog-box", title: "DialogBox", status: "experimental",
  keywords: ["Dialog", "MessageBox", "modal", "confirm", "alert", "form", "validation"],
  description: "Modal dialogs for editing a small form, confirming an action or displaying a message.",
  imports: importsFor(["Button", "Form", "Panel", "TextInput", "Toolbar", "required", "Dialog", "MessageBox"]),
  paragraphs: ["DialogBox is the documentation category name; the component is Dialog. showModal() returns a promise containing the chosen button result. Escape and the close button return cancel by default, and focus returns to the opener.",
    "Use Dialog with live Form content when you need validation and explicit screen ownership. MessageBox.alert(message) and MessageBox.confirm(message) are shorter convenience helpers for application-level messages; they create and destroy their own dialog.",
    "The live example uses explicit Dialog instances so leaving the documentation page can also destroy an open dialog. destroyContent: true makes each dialog release its Form and fields. The preview confirms actions only; it does not delete or save files."],
  examples: [applicationExample("Form, confirmation and message", function createDialogs({ container, log }) {
    const owner = new Panel(container, { name: "dialogExample" });
    let active = null;
    owner.disposables.add(() => active?.destroy());
    const show = async (dialog, readResult) => {
      if (active) { dialog.destroy(); return; }
      active = dialog;
      try {
        const result = await dialog.showModal({ origin: "user", userAction: true });
        if (!owner.destroyed) log.write(readResult ? readResult(result) : `Dialog result: ${result}`);
      } finally {
        dialog.destroy();
        if (active === dialog) active = null;
      }
    };
    const edit = () => {
      const field = new TextInput({ name: "dialogProjectName", label: "Project", value: "Customer migration", validators: [required("Enter a project name")] });
      const form = new Form({ name: "dialogProjectForm", labelWidth: 70 }).row(field);
      const dialog = new Dialog({ name: "settingsDialog", title: "Project settings", content: form, destroyContent: true,
        buttons: [{ text: "Apply", result: "apply", primary: true }, { text: "Cancel", result: "cancel" }]
      });
      dialog.events.on("beforeClose", event => {
        if (event.result === "apply" && !form.validate().ok) event.cancel = true;
      });
      return show(dialog, result => result === "apply" ? "Project: " + field.value.get() : "Edit cancelled");
    };
    owner.add(new Toolbar({ name: "Open dialogs" }).add(
      new Button({ text: "Edit Settings", onClick: edit }),
      new Button({ text: "Confirm Action", onClick: () => show(new Dialog({ title: "Remove draft?", content: "Remove the selected draft from this demonstration?",
        buttons: [{ text: "Remove", result: "remove", primary: true }, { text: "Cancel", result: "cancel" }] })) }),
      new Button({ text: "Show Message", onClick: () => show(new Dialog({ title: "Export complete", content: "100 rows were prepared in this demonstration.",
        buttons: [{ text: "OK", result: "ok", primary: true }] })) })
    ));
    return owner;
  }, "Edit Settings opens a validated form. Clear the project name and Apply to see validation; Cancel or Escape leaves without applying it. Dialog titles can be dragged.")],
  options: [{ name: "title / content", type: "string / Control | string", description: "Dialog heading and live content or safe plain text." },
    { name: "buttons", type: "DialogButton[]", description: "text, result, primary and disabled definitions. Unhandled Enter in a single-line field invokes the enabled primary action." },
    { name: "destroyContent", type: "boolean", description: "Destroy mounted live content with the dialog; set true for dialog-owned forms." },
    { name: "draggable / closeable / cancelResult", type: "boolean / boolean / unknown", description: "Title drag, close action and the result returned on cancellation." }],
  methods: [{ name: "showModal(options)", type: "Promise<unknown>", description: "Open a modal dialog and await a result." },
    { name: "close(resultOrOptions, options)", type: "boolean", description: "Scalars are results; plain objects are options. Return a DTO with close({ result: dto }), not close(dto)." },
    { name: "MessageBox.alert(message, options)", type: "Promise<string>", description: "Application-level one-button message; its helper destroys the dialog." },
    { name: "MessageBox.confirm(message, options)", type: "Promise<string>", description: "Application-level OK / Cancel confirmation." }],
  events: [{ name: "beforeClose", type: "{ result, cancel, reason }", description: "Validate and set cancel = true to keep the dialog open." },
    { name: "open / close", type: "PopupEvent", description: "Modal lifecycle events." }], notes: [...ownership, "For DTO results use close({ result: dto }). beforeClose veto keeps the promise pending; Cancel/Escape can return null. Destroy the dialog after its showModal promise settles.", "Delayed content needs explicit reposition(); a user-dragged position is preserved. Checked integration screen: examples/ai-recipes/integration-contracts.html; detailed recipe: docs/INTEGRATION_RECIPES.md."]
};

export const toolbarPage = {
  id: "toolbar", title: "Toolbar", status: "stable",
  keywords: ["application", "ToolBar", "tools", "commands", "icons", "separator", "spacer", "alignment"],
  description: "A compact application command strip with icon buttons, separators, flexible spacing and embedded controls.",
  imports: importsFor(["CommandRegistry", "Form", "Panel", "SelectInput", "TextInput", "Toolbar", "StatusText"]),
  paragraphs: ["Toolbar is a standard stable component. It owns live buttons and other controls; addCommand creates a ToolButton backed by CommandRegistry. Menu and Toolbar can share the same command definitions and state.",
    "Use addSeparator() to divide related actions and addSpacer() to push later controls to the right. Tool buttons retain accessible action names even when their captions are hidden. This example embeds a zoom selector; its selected value is available through the usual value model."],
  examples: [applicationExample("Document toolbar", function createDocumentToolbar({ container, log }) {
    const owner = new Panel(container, { name: "toolbarExample" });
    const commands = new CommandRegistry();
    owner.disposables.add(() => commands.destroy());
    let modified = false;
    const status = new StatusText({ name: "toolbarStatus", text: "Saved" });
    const title = new TextInput({ name: "toolbarDocumentName", label: "Document", value: "Customer mapping", onChange: () => {
      modified = true;
      status.setText("Modified");
      commands.refreshState();
    } });
    commands.register("toolbar.new", { label: "New document", icon: "file", run: () => log.write("New document requested") });
    commands.register("toolbar.save", { label: "Save document", icon: "save", enabled: () => modified, run() {
      modified = false;
      status.setText("Saved");
      commands.refreshState();
      log.write("Saved: " + title.value.get());
    } });
    commands.register("toolbar.validate", { label: "Validate document", icon: "validate", run: () => log.write("Validation requested") });
    const zoom = new SelectInput({ name: "toolbarZoom", label: "Zoom", labelWidth: 40, width: 130, valueField: "value", value: "100%", onChange: event => log.write("Zoom: " + event.newValue) });
    zoom.data.parse([{ value: "75%", text: "75%" }, { value: "100%", text: "100%" }, { value: "125%", text: "125%" }]);
    const toolbar = new Toolbar({ name: "Document toolbar", commands, width: "100%" })
      .addCommand("toolbar.new").addCommand("toolbar.save").addSeparator().addCommand("toolbar.validate")
      .addSpacer().add(status).addSeparator().add(zoom);
    owner.add(toolbar, new Form({ name: "toolbarDocumentForm", labelWidth: 80 }).row(title));
    return owner;
  }, "Change the document name to enable Save. Icons are grouped on the left; status and zoom stay on the right. Hover over an icon for its command title; each button also has an accessible name.")],
  options: [{ name: "commands", type: "CommandRegistry", description: "Shared registry required by addCommand()." },
    { name: "name / width", type: "string / number | string", description: "Accessible toolbar name and optional full-width layout." }],
  methods: [{ name: "add(...controls)", type: "Toolbar", description: "Add live controls, before or after mount." },
    { name: "addCommand(id, options)", type: "Toolbar", description: "Add a ToolButton linked to a registered command." },
    { name: "addButton(options) / addToolButton(options)", type: "Toolbar", description: "Create a caption button or compact icon button." },
    { name: "addSeparator() / addSpacer()", type: "Toolbar", description: "Group actions or separate left and right aligned controls." }],
  notes: ["Toolbar is stable; this example also uses experimental StatusText for its status caption.", ...ownership]
};
