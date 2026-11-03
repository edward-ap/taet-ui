import { importsFor } from "./pageHelpers.js";
import { Button, Form, TextInput } from "../../../src/ui/index.js";

const eventsSource = `const field = new TextInput({
  name: "eventValue",
  label: "Value",
  value: "Ada"
});

field.events.on("beforeChange", event => {
  if (event.newValue === "blocked") {
    event.cancel = true;
    log.write("Change cancelled");
  }
});

field.events.on("change", event => {
  log.write(
    \`\${event.oldValue} → \${event.newValue}; \` +
    \`origin=\${event.origin}; userAction=\${event.userAction}\`
  );
});

const apply = new Button({
  name: "applyValue",
  text: "Apply command value",
  onClick() {
    field.value.set("Grace", {
      origin: "command",
      userAction: true
    });
  }
});

const form = new Form({ name: "eventsExample", labelWidth: 56 })
  .row(field)
  .row(apply);`;

export const eventsMutationsPage = {
  id: "events-mutations",
  title: "Events and Mutations",
  status: "stable",
  keywords: ["eventbus", "events", "origin", "useraction", "silent", "cancel"],
  description: "Handle object-based events and preserve the origin of every meaningful state change.",
  imports: importsFor(["Button", "Form", "TextInput"]),
  paragraphs: [
    "Constructor callbacks are the concise choice for a local action. The per-control events bus supports multiple observers, dynamic subscriptions and the same event contract across all components.",
    "Event payloads are objects and expose source, type, origin and userAction where applicable. Native browser events are included as nativeEvent only when the semantic event originates from direct interaction.",
    "Mutations carry provenance. Use origin to distinguish user input, API calls, imports, commands, restores and internal synchronization; use silent only when public semantic notification is intentionally suppressed."
  ],
  examples: [
    {
      title: "Event payload and mutation origin",
      source: eventsSource,
      create({ log }) {
        const field = new TextInput({
          name: "eventValue",
          label: "Value",
          value: "Ada"
        });

        field.events.on("beforeChange", event => {
          if (event.newValue === "blocked") {
            event.cancel = true;
            log.write("Change cancelled");
          }
        });

        field.events.on("change", event => {
          log.write(
            `${event.oldValue} → ${event.newValue}; ` +
            `origin=${event.origin}; userAction=${event.userAction}`
          );
        });

        const apply = new Button({
          name: "applyValue",
          text: "Apply command value",
          onClick() {
            field.value.set("Grace", {
              origin: "command",
              userAction: true
            });
          }
        });

        return new Form({ name: "eventsExample", labelWidth: 56 })
          .row(field)
          .row(apply);
      }
    }
  ],
  tables: [
    {
      title: "Mutation Options",
      rows: [
        { name:"origin: user", type:"userAction: true", description:"Direct pointer, keyboard or text input from a user." },
        { name:"origin: api", type:"userAction: false", description:"Default programmatic mutation." },
        { name:"origin: import", type:"userAction: false", description:"Project or external model loading." },
        { name:"origin: command", type:"boolean", description:"Mutation performed by a registered application command." },
        { name:"origin: restore", type:"userAction: false", description:"Restoration of serialized UI or document state." },
        { name:"silent", type:"boolean", description:"Suppresses public semantic events without changing provenance." }
      ]
    }
  ],
  methods: [
    { name:"events.on(name, handler)", type:"Subscription", description:"Subscribes until the returned handle is disposed." },
    { name:"events.once(name, handler)", type:"Subscription", description:"Subscribes for the next matching event only." },
    { name:"subscription.dispose()", type:"void", description:"Removes a dynamic subscription." },
    { name:"value.set(value, options)", type:"boolean", description:"Performs a value mutation with explicit metadata." }
  ],
  events: [
    { name:"beforeChange", type:"{ source, oldValue, newValue, cancel }", description:"Cancellable notification before a value is committed." },
    { name:"change", type:"{ source, oldValue, newValue, origin, userAction }", description:"Reports a successful semantic value change." },
    { name:"afterChange", type:"ChangeEvent", description:"Runs after normal change processing." },
    { name:"focus / blur", type:"ControlFocusEvent", description:"Shared focus transitions from BaseControl." },
    { name:"keyDown / keyUp", type:"ControlKeyEvent", description:"Shared keyboard events; keyDown can be cancelled." }
  ],
  notes: [
    "Set event.cancel to true only in a documented cancellable before-event.",
    "Do not add native DOM listeners when a constructor callback or semantic control event exists.",
    "Use CommandRegistry when one action is shared by buttons, menus, toolbars or shortcuts."
  ]
};
