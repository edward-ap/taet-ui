import { importsFor } from "./pageHelpers.js";
import { Button, Form, TextInput } from "../../../src/ui/index.js";

const lifecycleSource = `const field = new TextInput({
  name: "temporaryField",
  label: "Owned field",
  value: "I belong to the form"
});

let removed = false;
const remove = new Button({
  name: "removeField",
  text: "Destroy owned field",
  onClick() {
    if (removed) {
      return;
    }

    form.remove(field, {
      origin: "user",
      userAction: true
    });
    removed = true;
    log.write(\`field.destroyed = \${field.destroyed}\`);
  }
});

const form = new Form({
  name: "ownershipExample",
  labelWidth: 92
})
  .row(field)
  .row(remove);`;

export const lifecycleOwnershipPage = {
  id: "lifecycle-ownership",
  title: "Lifecycle and Ownership",
  status: "stable",
  keywords: ["mount", "destroy", "parent", "child", "cleanup", "ownership"],
  description: "Build, mount and release a control graph through explicit ownership and one predictable lifecycle.",
  imports: importsFor(["Button", "Form", "Panel", "TextInput"]),
  paragraphs: [
    "The normal lifecycle is construct, compose, mount, interact and destroy. Controls can be configured before mounting, but a live instance can be mounted into only one host.",
    "Containers establish ownership when they attach controls. Panel, Form, Layout and docking containers destroy their owned descendants, so an application normally destroys only the top-level screen.",
    "Destroying a control releases its DOM, EventBus, DisposableBag, native listeners and observers. A destroyed instance is terminal and must not be mounted or mutated again."
  ],
  examples: [
    {
      title: "Owned child cleanup",
      source: lifecycleSource,
      create({ log }) {
        const field = new TextInput({
          name: "temporaryField",
          label: "Owned field",
          value: "I belong to the form"
        });

        let removed = false;
        const remove = new Button({
          name: "removeField",
          text: "Destroy owned field",
          onClick() {
            if (removed) {
              return;
            }

            form.remove(field, {
              origin: "user",
              userAction: true
            });
            removed = true;
            log.write(`field.destroyed = ${field.destroyed}`);
          }
        });

        const form = new Form({
          name: "ownershipExample",
          labelWidth: 92
        })
          .row(field)
          .row(remove);

        return form;
      }
    }
  ],
  methods: [
    { name:"mount(container)", type:"BaseControl", description:"Attaches an unmounted control to one DOM host." },
    { name:"add() / attach()", type:"Panel", description:"Mounts a child and records container ownership." },
    { name:"remove(control)", type:"Panel", description:"Detaches and destroys an owned child." },
    { name:"clear()", type:"Panel", description:"Destroys all children owned by the container." },
    { name:"destroy()", type:"BaseControl", description:"Performs terminal cleanup; repeated calls are harmless." }
  ],
  events: [
    { name:"beforeChildAdd", type:"{ control, cancel }", description:"Allows a container to reject ownership before attachment." },
    { name:"childAdd", type:"{ control, controlId, index }", description:"Reports a successfully attached child." },
    { name:"beforeChildRemove", type:"{ control, cancel }", description:"Allows removal to be cancelled." },
    { name:"childRemove", type:"{ control, controlId, index }", description:"Reports removal after the child has been destroyed." }
  ],
  notes: [
    "Never reuse one live control instance in two parents.",
    "Destroy the top-level owner when a screen, dialog or dynamic workspace leaves the application.",
    "Destroy non-control services created by the screen, such as CommandRegistry and ShortcutManager, alongside the owning screen."
  ]
};
