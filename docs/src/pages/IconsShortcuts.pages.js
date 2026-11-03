import { Button, CommandRegistry, Form, Panel, ShortcutManager, TextInput, icons } from "../../../src/ui/index.js";
import { apiRows, importsFor, liveExample } from "./pageHelpers.js";

export const iconsPage = {
  id: "icons", title: "Icons", status: "stable",
  description: "Browse the built-in icon names and register application icons for buttons, menus, lists and other controls.",
  imports: importsFor(["Button", "Panel", "icons"]),
  paragraphs: ["icons is the shared IconRegistry used by standard controls. Pass an icon name to a control rather than constructing SVG elements in application UI. icons.list() returns registered names; has(name) checks availability.",
    "Register reusable SVG definitions with icons.register(name, { viewBox, nodes }). Each node is a tag/attribute pair, not an HTML string. Use an application prefix to avoid collisions. IconRegistry can also create isolated registries for custom rendering; standard controls use the shared icons instance.",
    "Decorative icons do not replace accessible captions. Give icon-only ToolButtons text or label, and preserve visible captions where the action would otherwise be ambiguous."],
  examples: [liveExample("Built-in icon catalog", function createIconCatalog({ container, log }) {
    const owner = new Panel(container, { name: "iconCatalog", width: "100%", css: "dui-docs-icon-catalog" });
    for (const name of icons.list()) owner.add(new Button({ name: `catalog-${name}`, text: name, icon: name, onClick: () => log.write(`icon: "${name}"`) }));
    return owner;
  }, "Every button shows a registered name and its icon. Click a button to read the name to use in your control options.",
  ".dui-docs-icon-catalog { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 6px; }"),
  liveExample("Register an application icon", function createCustomIconExample({ container, log }) {
    const iconName = "docs-example-mark";
    const registeredHere = !icons.has(iconName);
    if (registeredHere) icons.register(iconName, { viewBox: "0 0 24 24", nodes: [
      ["path", { d: "M12 3 21 12 12 21 3 12Z", fill: "none", stroke: "currentColor", "stroke-width": 2 }],
      ["circle", { cx: 12, cy: 12, r: 3, fill: "currentColor" }]
    ] });
    const owner = new Panel(container, { name: "customIconExample" }).add(
      new Button({ text: "Application marker", icon: iconName, onClick: () => log.write(`Registered icon: ${iconName}`) })
    );
    if (registeredHere) owner.disposables.add(() => icons.unregister(iconName));
    return owner;
  }, "The example registers a diamond marker and releases only its own registration when leaving the page. In an application, register shared icons once during startup and keep them for the application's lifetime.")],
  methods: apiRows([["icons.list() / icons.has(name)", "string[] / boolean", "Browse or check registered names."], ["icons.register(name, definition, options)", "IconRegistry", "Register a definition; replacing requires replace: true."], ["icons.alias(name, target)", "IconRegistry", "Add an alternate name for an existing icon."], ["icons.unregister(name)", "boolean", "Remove a registration and dependent aliases."], ["createIcon(name, options) / renderIcon(host, name, options)", "SVGElement / Element", "Low-level helpers for control implementations; options.registry accepts an isolated IconRegistry."]]),
  notes: ["The catalog uses live Button instances and the same icon renderer as application controls."]
};

export const shortcutsPage = {
  id: "keyboard-shortcuts", title: "Keyboard Shortcuts", status: "stable",
  description: "Execute CommandRegistry actions from keyboard bindings with explicit focus scope and text-input handling.",
  imports: importsFor(["Button", "CommandRegistry", "Form", "Panel", "ShortcutManager", "TextInput"]),
  paragraphs: ["A command's shortcut caption alone does not install keyboard handling. Create ShortcutManager and call bindCommands(commands), or bind a specific command id and shortcut manually.",
    "target controls where keydown events are listened to. This example listens only inside its owner, so a shortcut does not affect the documentation search field. Text-input bindings are disabled by default; allowInTextInput: true enables a deliberate editor shortcut. Command enabled state is checked before execution.",
    "Use combinations appropriate to the host application and platform. This example uses Ctrl+Enter; add a separate Meta+Enter binding when desired for macOS. Destroy the manager and registry with the screen."],
  examples: [liveExample("Run a command from a field", function createShortcutExample({ container, log }) {
    const owner = new Panel(container, { name: "shortcutExample", width: "100%" });
    const commands = new CommandRegistry();
    const query = new TextInput({ name: "shortcutQuery", label: "Query", value: "Active customers" });
    let enabled = true;
    commands.register("docs.run-query", { label: "Run query", icon: "validate", enabled: () => enabled,
      run: () => log.write(`Executed: ${query.value.get()}`) });
    const shortcuts = new ShortcutManager({ commands, target: owner.element });
    shortcuts.bind("docs.run-query", "Ctrl+Enter", { allowInTextInput: true });
    shortcuts.bind("docs.run-query", "Meta+Enter", { allowInTextInput: true });
    owner.disposables.add(() => { shortcuts.destroy(); commands.destroy(); });
    owner.add(new Form({ name: "shortcutForm", width: "100%", labelWidth: 64 }).row(query).row(
      new Button({ command: "docs.run-query", commands }),
      new Button({ text: "Toggle command", onClick: () => { enabled = !enabled; commands.refreshState(); log.write(`Command enabled: ${enabled}`); } })
    ));
    return owner;
  }, "Focus Query and press Ctrl+Enter (or Meta+Enter). Run query executes the same command by mouse. Toggle command disables both entry points. A shortcut typed in the documentation search field does not run this example.")],
  options: apiRows([["commands", "CommandRegistry", "Registry to execute matching actions."], ["target", "EventTarget", "Listener target; defaults to document."], ["autoListen", "boolean", "Listen immediately unless false."]]),
  methods: apiRows([["bind(commandId, shortcut, options)", "Disposable", "Register a shortcut; options include when and allowInTextInput."], ["bindCommands(commands)", "Disposable", "Bind command shortcut metadata and follow registration changes."], ["unbind(commandId)", "void", "Remove all bindings for a command."], ["destroy()", "void", "Remove key listeners, bindings and subscriptions."]]),
  events: apiRows([["conflict", "ShortcutConflictEvent", "An existing combination targets a different command; conflicts throw unless cancelled."]])
};
