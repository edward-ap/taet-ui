import { Button, Form, Panel, TextArea, TextInput, Toolbar } from "../../../src/ui/index.js";
import { LogPanel, MdiWindow, MdiWorkspace, Popup, Tooltip } from "../../../src/ui/experimental.js";
import { apiRows, importsFor, liveExample } from "./pageHelpers.js";

export const tooltipPage = {
  id: "tooltip", title: "Tooltip", status: "experimental",
  description: "Contextual help shown on pointer hover or keyboard focus without moving focus away from the target.",
  imports: importsFor(["Button", "Panel"], ["Tooltip"]),
  paragraphs: ["Mount the target, then call tooltip.attach(). Tooltip resolves a live control's focus target and links the visible tip through aria-describedby. Escape dismisses it. Keep tooltip content short; use Popup for interactive content.", "A tooltip is an overlay, not a layout child. The screen must destroy it to remove listeners, pending timers and any open overlay."],
  examples: [liveExample("Hover or focus for help", function createTooltipExample({ container, log }) {
    const target = new Button({ name: "helpTarget", text: "Export help", onClick: () => log.write("Help describes the export action.") });
    const owner = new Panel(container, { name: "tooltipExample" }).add(target);
    const tooltip = new Tooltip({ name: "exportHelp", anchor: target, content: "Exports the current filtered rows as a CSV file.", placement: "top-start", showDelay: 200, hideDelay: 100 });
    owner.disposables.add(() => tooltip.destroy());
    tooltip.attach();
    return owner;
  }, "Hover over Export help or reach it with Tab. The tip appears after 200 ms; Escape closes it and focus remains on the button.")],
  options: apiRows([["anchor / content", "Control | Element / string", "Mounted help target and plain text content."], ["placement / offset", "string / number", "Preferred position and distance from the target."], ["showDelay / hideDelay", "number", "Milliseconds before showing or hiding."], ["openOnHover / openOnFocus", "boolean", "Enable pointer and keyboard triggers; both default true."]]),
  methods: apiRows([["attach(anchor) / detach()", "Tooltip", "Install or remove target listeners."], ["open() / close(options)", "boolean", "Explicitly show or dismiss help."], ["destroy()", "void", "Cancel timers and release the overlay."]]),
  events: apiRows([["beforeOpen / beforeClose", "PopupEvent", "Cancellable lifecycle."], ["open / close", "PopupEvent", "Opened or closed with a reason."]])
};

export const popupPage = {
  id: "popup", title: "Popup", status: "experimental",
  description: "An anchored overlay for compact interactive content, with outside-click dismissal and Escape handling.",
  imports: importsFor(["Button", "Form", "Panel", "TextInput"], ["Popup"]),
  paragraphs: ["Popup positions itself relative to a mounted control or element. It is nonmodal by default; use Dialog for a titled modal workflow. Opening focuses the popup; closing can restore focus to the anchor.", "Popup.close() preserves the content for reopening. Decide who owns live content: destroyContent: true destroys content that the popup has mounted. This example's screen explicitly owns both popup and form, including the case where the popup was never opened."],
  examples: [liveExample("Quick filter popup", function createPopupExample({ container, log }) {
    const query = new TextInput({ name: "quickQuery", label: "Contains", placeholder: "Customer name" });
    const content = new Form({ name: "quickFilterForm", width: 300, labelPosition: "top", padding: 8 }).row(query);
    let popup;
    content.row(new Button({ text: "Apply filter", onClick: () => { log.write(`Filter: ${query.value.get() || "all records"}`); popup.close({ origin: "user", userAction: true }); } }));
    const anchor = new Button({ name: "filterAnchor", text: "Quick filter", onClick: () => popup.isOpen() ? popup.close() : popup.open() });
    const owner = new Panel(container, { name: "popupExample" }).add(anchor);
    popup = new Popup({ name: "quickFilterPopup", anchor, content, placement: "bottom-start", destroyContent: false });
    owner.disposables.add(() => { popup.destroy(); content.destroy(); });
    return owner;
  }, "Open the filter, enter text and apply. Reopen it to see the retained value. Clicking outside or pressing Escape closes the popup; leaving this page destroys its form.")],
  options: apiRows([["anchor / content", "Control | Element / Control | string", "Anchor and overlay content."], ["placement / matchAnchorWidth", "string / boolean", "Preferred alignment and optional anchor-width matching."], ["closeOnOutsideClick / closeOnEscape", "boolean", "Dismissal triggers; both default true."], ["restoreFocus / destroyContent", "boolean", "Return focus on close; optionally destroy mounted content on teardown."]]),
  methods: apiRows([["open(anchor, options) / close(options)", "boolean", "Open or close the overlay."], ["isOpen() / reposition()", "boolean", "Read state or recalculate position."], ["destroy()", "void", "Close and remove overlay resources."]]),
  events: apiRows([["beforeOpen / beforeClose", "PopupEvent", "Cancellable transitions."], ["open / close", "PopupEvent", "Lifecycle and dismissal reason."]])
};

export const logPanelPage = {
  id: "log-panel", title: "LogPanel", status: "experimental",
  description: "A compact plain-text activity log with newest messages displayed first.",
  imports: importsFor(["Button", "Panel", "Toolbar"], ["LogPanel"]),
  paragraphs: ["Mount LogPanel before write(); messages written before mount are not buffered. write() prepends safely rendered text, and clear() removes all rows. aria-live: polite announces updates.", "LogPanel has no built-in timestamps, levels, persistence or retention limit. Format messages in your application and bound long-running logs rather than accumulating unlimited rows."],
  examples: [liveExample("Application activity", function createLogPanelExample({ container, log }) {
    const output = new LogPanel({ name: "activityLog", width: "100%", height: 140 });
    let sequence = 0;
    const owner = new Panel(container, { name: "logPanelExample", width: "100%" });
    owner.add(new Toolbar({ name: "Log actions" }).add(
      new Button({ text: "Append message", onClick: () => { output.write(`INFO ${++sequence}: Sample batch processed`); log.write(`Added message ${sequence}`); } }),
      new Button({ text: "Clear log", onClick: () => { output.clear(); log.write("Log cleared"); } })
    ), output);
    output.write("Ready to process records");
    return owner;
  }, "Append several messages to see newest-first ordering. Clear log removes rows without recreating the control.")],
  options: apiRows([["width / height", "number | string", "Visible log dimensions."], ["css", "string", "Optional local presentation class."]]),
  methods: apiRows([["write(message)", "void", "Prepend a plain-text message after mount."], ["clear()", "void", "Remove all messages."]]),
  notes: ["LogPanel does not expose a separate log data model or write event. Keep durable logging in the application."]
};

export const mdiPage = {
  id: "mdi-workspace", title: "MDI Workspace", status: "experimental",
  description: "Multiple movable, resizable document windows inside one bounded application workspace.",
  keywords: ["MdiWindow", "MdiWorkspace", "windows", "cascade", "lab27"],
  imports: importsFor(["Button", "Form", "Panel", "TextArea", "TextInput", "Toolbar"], ["MdiWindow", "MdiWorkspace"]),
  paragraphs: ["MdiWorkspace owns floating MdiWindow instances. Windows support activation, movement, resizing, collapse and closing. DockLayout arranges dock regions; MDI windows can overlap.", "Mount the workspace before addWindow(). Window content stays alive while moving or collapsing; closing removes and destroys the window by default. arrange('cascade') is currently the only built-in arrangement. serializeState() reports geometry; there is no workspace restoreState() API."],
  examples: [liveExample("Two document windows", function createMdiExample({ container, log }) {
    const owner = new Panel(container, { name: "mdiExample", width: "100%" });
    const workspace = new MdiWorkspace({ name: "documentWorkspace", width: "100%", height: 340 });
    let sequence = 0;
    const addDocument = () => {
      const number = ++sequence;
      const content = new Form({ name: `documentForm${number}`, labelPosition: "top", padding: 8, width: "100%" })
        .row(new TextInput({ name: `documentTitle${number}`, label: "Title", value: `Document ${number}` }))
        .row(new TextArea({ name: `documentNotes${number}`, label: "Notes", rows: 3, value: "Edit me, then move or collapse this window." }));
      workspace.addWindow(new MdiWindow({ name: `documentWindow${number}`, title: `Document ${number}`, x: 16 + ((number - 1) % 3) * 240, y: 18 + ((number - 1) % 3) * 25, width: 300, height: 230, content }));
      log.write(`Open windows: ${workspace.windows().length}`);
    };
    owner.add(new Toolbar({ name: "Window actions" }).add(
      new Button({ text: "New document", onClick: addDocument }),
      new Button({ text: "Cascade", onClick: () => { workspace.arrange("cascade"); log.write("Windows cascaded"); } }),
      new Button({ text: "Read window state", onClick: () => log.write(JSON.stringify(workspace.serializeState())) })
    ), workspace);
    addDocument();
    addDocument();
    return owner;
  }, "Drag window headers, resize from the lower-right corner, or collapse a window. Cascade repositions open windows. New document creates another owned form; Read window state reports geometry, not field values.")],
  options: apiRows([["MdiWorkspace.constrainWindows", "boolean", "Constrain windows to the workspace; default true."], ["MdiWindow.title / content", "string / Control", "Window caption and owned content."], ["x / y / width / height", "number", "Window bounds in workspace coordinates."], ["movable / resizable / collapsible / closeable", "boolean", "Enable individual window interactions."]]),
  methods: apiRows([["addWindow(window) / windows()", "MdiWindow / MdiWindow[]", "Attach a live window or list open windows."], ["activateWindow(window) / arrange('cascade')", "boolean / MdiWorkspace", "Activate or reposition windows."], ["window.setBounds(bounds) / getBounds()", "boolean / object", "Update or read window geometry."], ["window.collapse() / expand() / close()", "boolean", "Change window visibility or remove it."], ["serializeState()", "object", "Snapshot active window id and individual window states."]]),
  events: apiRows([["windowAdd / windowRemove / activeWindowChange", "WorkspaceEvent", "Workspace membership and activation."], ["windowGeometryChange", "GeometryEvent", "A child window moved or resized."], ["window.beforeClose", "WindowEvent", "Set cancel to veto closing a document."]])
};
