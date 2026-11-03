# Task, contract and source map

Read one row, exact types and one recipe before changing behavior.

| Task | Contract / types | Source / regression |
| --- | --- | --- |
| Lifecycle / focus | [control contract](CONTROL_TYPES.md), [BaseControl](../src/core/BaseControl.d.ts) | [BaseControl source](../src/core/BaseControl.js), [regressions](../test/foundation-regressions.test.js) |
| Form / ownership / live edits | [containers](../src/ui/container-contracts.d.ts), [mutations](MUTATIONS.md) | [Panel](../src/ui/Panel.js), [Form](../src/ui/Form.js), [browser](../browser-tests/foundation-regressions.spec.js), [recipe](../examples/ai-recipes/01-basic-form.js) |
| Events / values / validation | [inputs](INPUT_TYPES.md), [EditorControl types](../src/ui/EditorControl.d.ts) | [EventBus](../src/core/EventBus.js), [EditorControl](../src/ui/EditorControl.js), [recipe](../examples/ai-recipes/02-validation-form.js) |
| Data / projections / selection | [model contracts](DATA_MODEL_TYPES.md), [core types](../src/core/index.d.ts) | [DataStore](../src/core/DataStore.js), [DataView](../src/core/DataView.js), [TreeDataView](../src/core/TreeDataView.js) |
| Commands / shortcuts | [command types](../src/core/CommandRegistry.d.ts), [keyboard](../spec/15-shortcut-manager.md) | [ShortcutManager](../src/core/ShortcutManager.js), [recipe](../examples/ai-recipes/04-toolbar-commands.js) |
| Theme service / editor | [applicator](../src/ui/ThemeApplicator.d.ts), [designer](../src/ui/ThemeDesigner.d.ts) | [applicator source](../src/ui/ThemeApplicator.js), [browser](../browser-tests/theme-applicator.spec.js) |
| Existing JSON factories | [Form](FORM_JSON.md), [Grid](GRID_JSON.md), [collections](COLLECTION_JSON.md) | FormDefinition/GridDefinition/TreeDefinition and their existing regressions |
| Grid / TreeGrid | [guide](GRID_TYPES.md), [menu/gutter](GRID_MENUS.md), [layout/selection](GRID_COLUMN_LAYOUT.md), [row transfer](GRID_TRANSFER.md), [subtree move](TREE_GRID_MOVE.md), [editors](GRID_EDITOR_MATRIX.md), [exact entry](../src/ui/grid-api.d.ts) | [Grid](../src/ui/Grid.js), [TreeGrid](../src/ui/TreeGrid.js), [candidate-hash guard](../scripts/check-package-boundaries.js), [recipe](../examples/ai-recipes/05-grid-readonly.js) |
| Lists / properties / inputs | [collections](../src/ui/collection-contracts.d.ts), [inputs](../src/ui/inputs.d.ts) | [PropertyGrid](../src/ui/PropertyGrid.js), [List](../src/ui/List.js), [recipe](../examples/ai-recipes/06-property-grid.js) |
| Existing Advanced | [entry](../src/advanced/index.d.ts), [Chart](CHARTS.md) | MDI/docking/mapping, Chart/Gauge, ThemeDesigner; no new advanced features here |

Current [tiers](TIERS.md), [maturity](STABLE_API.md), [build](BUILD.md),
[release gates](RELEASE.md), [verification](VERIFICATION.md), [extensions](EXTENSIONS.md).
