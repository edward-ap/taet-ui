# AI Recipes

These modules are short, canonical Tæt UI construction patterns. Each exports one factory, performs no work during import, and returns the top-level owner or an object with `destroy()`.

The recipes are included in `npm run test:syntax`. `test/ai-recipes.test.js` also imports every module and checks the application-code guardrails from `docs/AI_CONTEXT.md`.

Start with [AI_CONTEXT](../../docs/AI_CONTEXT.md); use [AI_MAP](../../docs/AI_MAP.md)
for exact types/contracts and targeted tests. Except for the widget-port recipe below, factories take a mounted DOM host
or selector as `container`; read the module for its returned owner/result shape.
Use callbacks and data supplied by the application, not the illustrative values
from the browser test fixture.

| Recipe | Exported factory / additional argument |
| --- | --- |
| [Basic form](01-basic-form.js) | `createBasicForm(container, saveCustomer)` |
| [Validation](02-validation-form.js) | `createValidationForm(container, saveCustomer)` |
| [Country choices](03-select-input.js) | `createCountrySelector(container)` |
| [Commands](04-toolbar-commands.js) | `createCommandToolbar(container, project)`; project provides events/isDirty/save |
| [Read-only Grid](05-grid-readonly.js) | `createReadonlyGrid(container, rows)` |
| [Properties](06-property-grid.js) | `createPropertyGrid(container, settings)` |
| [Docking](07-dock-layout.js) | `createDockWorkbench(container)` |
| [Master/detail](08-master-detail.js) | `createMasterDetail(container, customers)` |
| [Grid workbench](09-grid-workbench.js) | `createGridWorkbench(container, records?)`; returns screen owner/actions and borrowed table models |
| [Color](10-color-picker.js) | `createColorPicker(container, value?)` |
| [Grid editor matrix](11-grid-editor-matrix.js) | `createGridEditorMatrix(container, records?)`; nine existing factories, raw values/types and live drafts |
| [Custom EditorControl widget](13-custom-editor.js) | `createWidgetField(widget, options?)`; owns the scalar text widget and subscription, keeps inherited value authoritative |
| [Integration contracts](12-integration-contracts.js) | `createIntegrationRecipes(container, options?)`; guarded DTO/dialog, async draft/context and UI-state recipes |

Specialized reader/raster factories are deferred; see docs/EXTENSIONS.md.

The custom widget recipe is compiled unchanged and exercised by installed TypeScript
and checked-JavaScript consumers in `npm run test:types`. Its widget port requires
render-only `writeDisplay`, immediate `onInput`, `mount`, and `destroy`; it is an
application example, not a universal adapter.

Browser checks mount and destroy the retained factories. The [desktop workbench](../grid-workbench/README.md)
exercises TreeGrid + Grid + PropertyGrid over one store and separate views, including
validation during context changes, background silent writes and screen teardown.

[Run the integration acceptance screen](integration-contracts.html); read the
[checked application integration guide](../../docs/INTEGRATION_RECIPES.md) for exact
close-result, async, ownership, selection, persistence and native-host boundaries.
