import { importsFor } from "./pageHelpers.js";
import { Button } from "../../../src/ui/index.js";

const quickStartSource = `import { Button } from "./taet-ui.min.js";

const button = new Button("#app", {
  name: "save",
  text: "Save",
  onClick() {
    console.log("Save clicked");
  }
});

// Every control owns its DOM and listeners.
// Call button.destroy() when its host actually closes.`;

export const introductionPage = {
  id: "introduction",
  title: "Introduction",
  status: "stable",
  keywords: ["overview", "desktop", "webview", "object first"],
  description: "Tæt UI is an object-first, compact desktop UI toolkit for WebView applications.",
  paragraphs: [
    "Controls are JavaScript objects with explicit lifecycle, events and state. Applications compose controls through containers instead of describing an HTML tree or a virtual DOM.",
    "The toolkit targets dense operational interfaces: forms, grids, inspectors, menus, layouts, docking workspaces and visual mapping tools. Shared contracts keep these components predictable across a large application.",
    "This documentation application is built with Tæt UI itself. Its navigation, layout, buttons, inputs, code samples and API tables exercise the same public controls used by an application."
  ],
  methods: [
    { name:"mount(container)", type:"HTMLElement | string", description:"Creates and attaches the control DOM to a host." },
    { name:"refresh()", type:"void", description:"Synchronizes rendered state without replacing the control instance." },
    { name:"enable() / disable()", type:"void", description:"Changes interaction state through the shared lifecycle contract." },
    { name:"focus()", type:"boolean", description:"Moves focus to the control's standard focus target when possible." },
    { name:"destroy()", type:"void", description:"Releases owned controls, DOM, listeners and subscriptions." }
  ],
  notes: [
    "Call destroy() when a dynamic panel or view leaves the application.",
    "Use events and commands for behavior; avoid anonymous DOM listeners outside controls.",
    "Keep project data separate from serialized layout and transient runtime state."
  ]
};

export const quickStartPage = {
  id: "quick-start",
  title: "Quick Start",
  status: "stable",
  keywords: ["install", "first control", "mount", "destroy"],
  description: "Create, mount and destroy a control without JSX, templates or a virtual DOM.",
  imports: importsFor(["Button"]),
  paragraphs: [
    'Run npm run build in Tæt UI, then copy the full dist delivery beside app.js: taet-ui.min.js, taet-ui.min.css, fonts/, LICENSE and THIRD_PARTY_NOTICES.md.',
    'Add <link rel="stylesheet" href="./taet-ui.min.css"> and <script type="module" src="./app.js"></script> to HTML. The imports below are relative to app.js; adjust the path if you store the library in a vendor folder. Serve through HTTP or a WebView origin, not file://.',
    'These examples use the full bundle from dist/. The components and foundation subsets are in dist/components/ and dist/foundation/. Do not mix a bundle with source modules or another bundle in the same document. Experimental APIs remain experimental; typed npm package imports are an alternative documented in BUILD.md.',
    "Pass a container as the first constructor argument for immediate mounting, or construct the object first and call mount(container) later.",
    "Constructor options establish initial state. Runtime methods and the events bus provide explicit changes after mounting."
  ],
  examples: [
    {
      title: "First control",
      source: quickStartSource,
      create({ log }) {
        return new Button({
          name: "save",
          text: "Save",
          onClick() {
            log.write("Save clicked");
          }
        });
      }
    }
  ],
  notes: [
    "A constructor container is optional; ownership is established when a parent container attaches the control.",
    "Do not mount one control instance into multiple containers."
  ]
};
