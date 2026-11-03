import { importsFor } from "./pageHelpers.js";
import { Button, Form, ToolButton, Toolbar, CommandRegistry } from "../../../src/ui/index.js";

const framedStyles = `.dui-button.docs-framed-button {
  --dui-command-button-bg: var(--dui-color-surface-strong);
  --dui-command-button-border: #5fa2d9;
  --dui-command-button-text: var(--dui-color-text);
  --dui-command-button-bg-hover: color-mix(in srgb, #5fa2d9 24%, var(--dui-color-surface-strong));
  --dui-command-button-bg-active: color-mix(in srgb, #5fa2d9 40%, var(--dui-color-surface-strong));
  --dui-command-button-bg-disabled: var(--dui-color-surface-strong);
  --dui-command-button-text-disabled: var(--dui-color-muted);
  border-width: 1px;
  transition: background-color 140ms ease, border-color 140ms ease;
}
.dui-button.docs-framed-button:disabled {
  border-color: color-mix(in srgb, #5fa2d9 40%, var(--dui-color-surface-strong));
}
.dui-button.docs-framed-button:focus-visible {
  outline: 2px solid var(--dui-color-focus-border);
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .dui-button.docs-framed-button { transition: none; }
}`;

const toolStyles = `.dui-tool-button.docs-framed-tool {
  border-color: #5fa2d9;
  background: var(--dui-color-surface-strong);
}
.dui-tool-button.docs-framed-tool:not(:disabled):hover {
  background: color-mix(in srgb, #5fa2d9 24%, var(--dui-color-surface-strong));
}
.dui-tool-button.docs-framed-tool:not(:disabled):active {
  background: color-mix(in srgb, #5fa2d9 40%, var(--dui-color-surface-strong));
}`;

export const framedButtonPage = {
  id: "framed-button",
  title: "Framed Button",
  status: "stable",
  keywords: ["border", "outline", "gray", "blue", "hover", "css"],
  description: "A neutral gray Button with a blue frame on all four sides and a tinted hover state.",
  imports: importsFor(["Button", "Form"]),
  paragraphs: [
    "This is the standard Button with a local CSS class. Its click events, command binding, keyboard activation and lifecycle are identical to Button.",
    "The frame stays visible at rest; hover and press change the fill. A fixed border width prevents movement between states. Neutral colors follow the theme while the blue frame stays consistent.",
    "Use the theme switch to compare Light Blue and Dark Blue. Hover, hold the mouse button, and use Tab to inspect the states; the disabled sample keeps a quieter frame."
  ],
  examples: [{
    title: "Blue frame",
    styles: framedStyles,
    source: `const form = new Form().row(
  new Button({ text: "Apply", css: "docs-framed-button", onClick: () => log.write("Applied") }),
  new Button({ text: "Save changes", icon: "save", css: "docs-framed-button", onClick: () => log.write("Changes saved") }),
  new Button({ text: "Unavailable", css: "docs-framed-button", disabled: true })
);`,
    create({ log }) {
      return new Form().row(
        new Button({ text: "Apply", css: "docs-framed-button", onClick: () => log.write("Applied") }),
        new Button({ text: "Save changes", icon: "save", css: "docs-framed-button", onClick: () => log.write("Changes saved") }),
        new Button({ text: "Unavailable", css: "docs-framed-button", disabled: true })
      );
    }
  }],
  tables: [{ title: "Styling hooks", rows: [
    { name: "css", type: "Button option", description: "Applies the recipe class to this instance." },
    { name: "--dui-command-button-border", type: "CSS color", description: "Frame color at rest, hover and press." },
    { name: "--dui-command-button-bg", type: "CSS color", description: "Normal fill; use bg-hover and bg-active for interaction." },
    { name: ":disabled / :focus-visible", type: "CSS selectors", description: "Keep disabled and keyboard focus distinguishable." }
  ] }],
  notes: ["Copy both the JavaScript and CSS. These recipe classes are not bundled library themes.", "Use Button's API reference for shared options, methods and events.", "A frame can be combined with either icon position. Motion is disabled when the user requests reduced motion."]
};

export const iconButtonPage = {
  id: "icon-button",
  title: "Button with Icon",
  status: "stable",
  keywords: ["left", "right", "iconPosition", "caption", "save"],
  description: "Keep a visible caption and place a registered icon on either side.",
  imports: importsFor(["Button", "Form"]),
  paragraphs: [
    "Use icon for a registered icon name. iconPosition defaults to left; choose right for a trailing action indicator. Both work with the default theme, a custom palette or a frame.",
    "The caption supplies the accessible name. Use IconButton for borderless icon-only actions, or ToolButton for toolbar actions with a hover frame. Always supply an accessible action name."
  ],
  examples: [{
    title: "Leading and trailing icons",
    source: `const form = new Form().row(
  new Button({ text: "Save", icon: "save", onClick: () => log.write("Saved") }),
  new Button({ text: "Continue", icon: "chevron-right", iconPosition: "right", onClick: () => log.write("Next step") })
);`,
    create({ log }) {
      return new Form().row(
        new Button({ text: "Save", icon: "save", onClick: () => log.write("Saved") }),
        new Button({ text: "Continue", icon: "chevron-right", iconPosition: "right", onClick: () => log.write("Next step") })
      );
    }
  }, {
    title: "Change position at runtime",
    description: "Changing position preserves the button instance, its focus and event subscriptions.",
    source: `const button = new Button({ text: "Move icon", icon: "chevron-right", onClick() {
  button.setIconPosition(button.iconPosition === "left" ? "right" : "left");
  log.write("Icon on the " + button.iconPosition);
} });`,
    create({ log }) {
      const button = new Button({ text: "Move icon", icon: "chevron-right", onClick() {
        button.setIconPosition(button.iconPosition === "left" ? "right" : "left");
        log.write("Icon on the " + button.iconPosition);
      } });
      return button;
    }
  }],
  options: [
    { name: "icon", type: "string", description: "Registered name, for example save or chevron-right." },
    { name: "iconPosition", type: '"left" | "right"', description: "Defaults to left; positions are physical sides." }
  ],
  methods: [
    { name: "setIcon(name)", type: "Button", description: "Replace the icon; an empty string removes it." },
    { name: "setIconPosition(side)", type: "Button", description: "Reorder the icon and caption without remounting." }
  ],
  notes: ["Use Button's API reference for the remaining options and events.", "With command binding the registry controls the label and icon; iconPosition remains a local presentation setting."]
};

export const toolButtonPage = {
  id: "tool-button",
  title: "ToolButton",
  status: "stable",
  keywords: ["square", "rounded", "toolbar", "icon-only", "shape", "command"],
  description: "An icon-only toolbar action with square or rounded corners and an accessible label.",
  imports: importsFor(["ToolButton", "Toolbar", "CommandRegistry"]),
  paragraphs: [
    "ToolButton extends Button. It hides the caption by default and uses text or label as its accessible name and fallback tooltip. Always supply an action name, even when only the icon is visible.",
    "shape: square is the default; rounded adds 4px corners. Width and height use the toolbar height token. showText: true adds a visible caption and lets the button grow horizontally.",
    "Toolbar owns its buttons. Compose it before mounting, then mount the toolbar or attach it to your layout. A standalone ToolButton can also be mounted directly."
  ],
  examples: [{
    title: "Square and rounded",
    description: "The first pair uses the standard hover frame. The second pair keeps a blue frame visible at rest. Tab focuses each enabled action; Enter and Space activate it.",
    styles: toolStyles,
    source: `const toolbar = new Toolbar({ name: "Editing tools" }).add(
  new ToolButton({ text: "Add item", icon: "add", onClick: () => log.write("Add item") }),
  new ToolButton({ text: "Edit item", icon: "edit", shape: "rounded", onClick: () => log.write("Edit item") }),
  new ToolButton({ text: "Save item", icon: "save", css: "docs-framed-tool", onClick: () => log.write("Save item") }),
  new ToolButton({ text: "Settings", icon: "settings", shape: "rounded", css: "docs-framed-tool", onClick: () => log.write("Settings") }),
  new ToolButton({ text: "Remove item", icon: "remove", disabled: true })
);`,
    create({ log }) {
      return new Toolbar({ name: "Editing tools" }).add(
        new ToolButton({ text: "Add item", icon: "add", onClick: () => log.write("Add item") }),
        new ToolButton({ text: "Edit item", icon: "edit", shape: "rounded", onClick: () => log.write("Edit item") }),
        new ToolButton({ text: "Save item", icon: "save", css: "docs-framed-tool", onClick: () => log.write("Save item") }),
        new ToolButton({ text: "Settings", icon: "settings", shape: "rounded", css: "docs-framed-tool", onClick: () => log.write("Settings") }),
        new ToolButton({ text: "Remove item", icon: "remove", disabled: true })
      );
    }
  }, {
    title: "Command and visible caption",
    description: "Two presentations share one command. The registry supplies both captions and icons. The example owns its registry; an application-wide registry should instead be destroyed by its application owner.",
    source: `const commands = new CommandRegistry();
commands.register("save", { label: "Save document", icon: "save", run: () => log.write("Document saved") });
const toolbar = new Toolbar({ name: "Document actions", commands });
toolbar.addCommand("save", { name: "saveIcon", shape: "rounded" });
toolbar.addCommand("save", { name: "saveCaption", showText: true, iconPosition: "right" });
toolbar.disposables.add(() => commands.destroy());`,
    create({ log }) {
      const commands = new CommandRegistry();
      commands.register("save", { label: "Save document", icon: "save", run: () => log.write("Document saved") });
      const toolbar = new Toolbar({ name: "Document actions", commands });
      toolbar.addCommand("save", { name: "saveIcon", shape: "rounded" });
      toolbar.addCommand("save", { name: "saveCaption", showText: true, iconPosition: "right" });
      toolbar.disposables.add(() => commands.destroy());
      return toolbar;
    }
  }],
  options: [
    { name: "text / label", type: "string", description: "Accessible action name, even with a hidden caption." },
    { name: "icon", type: "string", description: "Registered icon name." },
    { name: "shape", type: '"square" | "rounded"', description: "Default square; rounded uses 4px corners." },
    { name: "showText", type: "boolean", description: "Default false; true adds the visible caption." },
    { name: "iconPosition", type: '"left" | "right"', description: "Caption-relative position when showText is true." },
    { name: "tooltip / title", type: "string", description: "Local tooltip; defaults to the action name." },
    { name: "css", type: "string", description: "Extra classes, for example a persistent frame." },
    { name: "command / commands", type: "string / CommandRegistry", description: "Shared action and state, inherited from Button." },
    { name: "onClick / disabled", type: "function / boolean", description: "Local action and initial disabled state." }
  ],
  methods: [
    { name: "setShape(shape)", type: "ToolButton", description: "Switch corners; anything except rounded selects square." },
    { name: "setText(text) / setIcon(icon)", type: "void / ToolButton", description: "Change the accessible name or icon." },
    { name: "setIconPosition(side)", type: "ToolButton", description: "Move the icon relative to a visible caption." },
    { name: "enable() / disable()", type: "void", description: "Change whether the action can be activated." }
  ],
  notes: ["Button's events and lifecycle also apply to ToolButton.", "Command binding owns the tooltip and accessible name through the command label. Do not combine command with onClick.", "A tooltip helps sighted users identify an icon; the text or label option supplies its screen-reader name."]
};
