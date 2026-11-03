import { importsFor } from "./pageHelpers.js";
import { Button, Form } from "../../../src/ui/index.js";

const orangeStyles = `.dui-button.docs-orange-button {
  --dui-command-button-bg: #b45309;
  --dui-command-button-border: #b45309;
  --dui-command-button-text: #fff;
  --dui-command-button-bg-hover: #92400e;
  --dui-command-button-bg-active: #78350f;
  --dui-command-button-bg-disabled: #ead5c5;
  --dui-command-button-text-disabled: #70513c;
}
.dui-button.docs-orange-button:focus-visible {
  outline: 2px solid var(--dui-color-focus-border);
  outline-offset: 2px;
}`;

const basicButtonSource = `const button = new Button({
  name: "review",
  text: "Review",
  onClick() {
    log.write("Review requested");
  }
});`;

export const buttonPage = {
  id: "button",
  title: "Button",
  status: "stable",
  keywords: ["action", "click", "command"],
  description: "Compact command or local action button with shared icon, lifecycle and command-state support.",
  imports: importsFor(["Button", "Form"]),
  paragraphs: [
    "Use onClick for a local action. Bind a CommandRegistry command when the same action is exposed from a toolbar, menu, context menu or keyboard shortcut.",
    "A command-bound button derives its label, icon, enabled, visible and checked states from the command registry. Do not combine command and onClick.",
    "Use Button for visible captions, ToolButton for compact toolbar actions with a hover frame, or IconButton for borderless icon-only actions. Framed Button and Button with Icon are Button configurations.",
    "The examples return unmounted controls; the documentation mounts and owns them. In your application use form.row(button), toolbar.add(button), or button.mount(container), and destroy the owning control when finished. log.write represents your application action."
  ],
  examples: [
    {
      title: "Local action",
      source: basicButtonSource,
      create({ log }) {
        return new Button({
          name: "review",
          text: "Review",
          onClick() {
            log.write("Review requested");
          }
        });
      }
    },
    {
      title: "Custom orange color",
      description: "The first button follows the active theme. The orange buttons keep their own palette in both themes. Put the CSS below in your application stylesheet; css adds a class only to these controls.",
      styles: orangeStyles,
      source: `const form = new Form().row(
  new Button({ text: "Theme color", onClick: () => log.write("Theme action") }),
  new Button({ text: "Publish", css: "docs-orange-button", onClick: () => log.write("Publish requested") }),
  new Button({ text: "Unavailable", css: "docs-orange-button", disabled: true })
);`,
      create({ log }) {
        return new Form().row(
          new Button({ text: "Theme color", onClick: () => log.write("Theme action") }),
          new Button({ text: "Publish", css: "docs-orange-button", onClick: () => log.write("Publish requested") }),
          new Button({ text: "Unavailable", css: "docs-orange-button", disabled: true })
        );
      }
    },
    {
      title: "Enable and disable",
      description: "Disabled buttons cannot be activated by mouse or keyboard. For command-bound buttons change the command state instead of overriding it locally.",
      source: `const save = new Button({ text: "Save", disabled: true, onClick: () => log.write("Saved") });
const toggle = new Button({ text: "Enable Save", onClick() {
  if (save.disabled) save.enable(); else save.disable();
  toggle.setText(save.disabled ? "Enable Save" : "Disable Save");
  log.write(save.disabled ? "Save disabled" : "Save enabled");
} });
const form = new Form().row(save, toggle);`,
      create({ log }) {
        const save = new Button({ text: "Save", disabled: true, onClick: () => log.write("Saved") });
        const toggle = new Button({ text: "Enable Save", onClick() {
          if (save.disabled) save.enable(); else save.disable();
          toggle.setText(save.disabled ? "Enable Save" : "Disable Save");
          log.write(save.disabled ? "Save disabled" : "Save enabled");
        } });
        return new Form().row(save, toggle);
      }
    }
  ],
  options: [
    { name:"name", type:"string", description:"Stable application-facing control name." },
    { name:"text / label", type:"string", description:"Visible button caption." },
    { name:"icon", type:"string", description:"Registered icon name; empty means no icon." },
    { name:"iconPosition", type:'"left" | "right"', description:'Icon side; defaults to "left".' },
    { name:"css", type:"string", description:"CSS class names for a local palette or frame." },
    { name:"onClick", type:"(event) => void", description:"Local click action; cannot be combined with command." },
    { name:"command", type:"string", description:"CommandRegistry id used as the action and state source." },
    { name:"commands", type:"CommandRegistry", description:"Registry containing the command id." },
    { name:"disabled", type:"boolean", description:"Initial disabled state." }
  ],
  methods: [
    { name:"setText(text)", type:"void", description:"Changes the visible caption." },
    { name:"setIcon(icon)", type:"Button", description:"Changes the registered icon." },
    { name:"setIconPosition(side)", type:"Button", description:"Moves the icon; anything except right selects left." },
    { name:"bindCommand(registry, id)", type:"Button", description:"Connects the button to centralized command state." },
    { name:"enable() / disable()", type:"void", description:"Changes whether the button accepts user actions." }
  ],
  events: [
    { name:"click", type:"{ source, origin, userAction, nativeEvent }", description:"Emitted for a local user action." },
    { name:"focus / blur", type:"ControlFocusEvent", description:"Shared interactive-control focus events." }
  ],
  notes: [
    "Prefer commands when an action appears in more than one UI surface.",
    "Do not attach a second native click listener to the rendered button element."
  ]
};
