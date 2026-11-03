# Tæt UI Documentation Workbench

The application at `docs/index.html` is the public documentation browser. It is built with Tæt UI controls and serves as an executable example and regression surface. Its contents tree is a collapsible left DockPanel; the article is the permanent center workspace.

Run it from the project root:

```powershell
npm run docs
```

Open `http://127.0.0.1:5174/docs/index.html`.

## Structure

- `src/docsCatalog.js` defines navigation groups.
- `src/pages/*.page.js` keeps structured documentation next to live example factories.
- `src/DocsShell.js` owns navigation, search, themes, URL state and page lifetime.
- `src/ComponentPage.js` renders description, examples, API tables, events and notes.
- `src/ExampleHost.js` isolates a live control, output and its source code.

## Add a page

Export a page object from `src/pages` and add it to `docsCatalog`. A component page should provide:

```js
export const controlPage = {
  id: "control",
  title: "Control",
  status: "stable",
  description: "Short purpose statement.",
  imports: [`import { Control } from "./taet-ui.min.js";`],
  examples: [
    {
      title: "Basic usage",
      source: `const control = new Control({ ... });`,
      create({ log }) {
        return new Control({ ... });
      }
    }
  ],
  sections: [
    {
      title: "Structured Content",
      create() {
        return new Control({ ... });
      }
    }
  ],
  tables: [
    {
      title: "Related Contracts",
      rows: []
    }
  ],
  options: [],
  methods: [],
  events: [],
  notes: []
};
```

Use `importsFor([...names])` from `pages/pageHelpers.js` for copyable imports.
Public snippets target the full portable `taet-ui.min.js` and a CSS link in HTML.
The workbench's own implementation imports source modules for development; these
are not application setup instructions. Never load a bundle into that same page.

Keep `source` and `create()` together and behaviorally equivalent. The factory must return a Tæt UI control; `ExampleHost` owns and destroys it when navigation changes. Factories receive `{ log, container }`; mount container examples in the supplied host before attaching their children.

Examples may include a `description` and a `styles` CSS string. The same CSS is applied to the live example and displayed in a copyable CSS block. Use narrowly scoped class selectors; the style element is removed with the example. Dispose example-owned services through the returned control's disposable bag.

## Find component documentation

For AI onboarding use [AI_CONTEXT](AI_CONTEXT.md) and [AI_MAP](AI_MAP.md).
The catalog in [docsCatalog.js](src/docsCatalog.js) is authoritative for the
current groups/pages; do not maintain separate manual page/example counts.
Components are sorted alphabetically; Getting Started and Core Concepts stay first.

| Group | Page sources / scope |
| --- | --- |
| Buttons | [Button](src/pages/Button.page.js), [variants](src/pages/ButtonVariants.pages.js), [toggle](src/pages/ToggleButton.page.js) |
| Input Controls | [text](src/pages/TextInput.page.js), [Select](src/pages/SelectInput.page.js), [form inputs](src/pages/InputControls.pages.js), [additional](src/pages/AdditionalInputs.pages.js), [remaining](src/pages/RemainingInputs.pages.js) |
| Layout | [Panel/Form, titled/framed layouts, resizable IDE split, tabs and Accordion](src/pages/Layout.pages.js) |
| Applications | [menu/toolbar/docking/status/dialog](src/pages/Applications.pages.js), [Form](src/pages/Form.page.js), [popup/tooltip/log/MDI](src/pages/ApplicationExtras.pages.js) |
| List | [basic/tree/directory/check lists](src/pages/List.pages.js) |
| Grid | [table examples](src/pages/Grid.page.js), [lazy loading](src/pages/LazyLoading.page.js), [PropertyGrid/Inspector](src/pages/PropertyGrid.page.js) |
| Text & Display | [labels, readonly, styled text and code](src/pages/TextDisplay.pages.js) |
| Advanced | [Charts](src/pages/Charts.pages.js), [ThemeDesigner](src/pages/ThemeDesigner.page.js); [specialized extensions are deferred](EXTENSIONS.md) |

Framed Button, Button with Icon, Password/Masked TextInput, TreeTableList and StatusBar are
recipes using existing exports. They are not additional component classes.
IconButton is a separate stable borderless icon-only variant; see its
[page-navigation example](src/pages/IconButton.page.js).
ToggleIconButton is the experimental boolean variant with a
[Play/Stop example](src/pages/ToggleIconButton.page.js).
RadioLetter/CheckLetter are generic core controls; their examples do not import
Training Questionary. SelectInput imageField/iconField also decorate the selected
value and choose the custom popup; searchable enables filtering.

Large Data activates its asynchronous chunked 10,000-record allocation with the
page and shows loading state while it prepares. Lazy Loading is separate and
holds one 50-row batch via GridDataProvider. PropertyInspector wraps PropertyGrid;
Form documents columns, shared rows, label orientation, groups and validation.
Check the relevant browser tests through [AI_MAP](AI_MAP.md) after changing a page.
