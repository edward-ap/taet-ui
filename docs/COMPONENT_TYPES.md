# Exact component contracts

All public JS entries have checked declarations and installed TS/JSDoc consumers.

| Family | Declarations |
| --- | --- |
| Shared API | [BaseControl](../src/core/BaseControl.d.ts), [foundation](../src/foundation/index.d.ts) |
| Panels/Form/Layout | [containers](../src/ui/container-contracts.d.ts) |
| Values/inputs | [inputs](../src/ui/inputs.d.ts), [editor](../src/ui/EditorControl.d.ts) |
| Buttons/text/toolbar | [display](../src/ui/display-contracts.d.ts) |
| Lists/trees/properties | [collections](../src/ui/collection-contracts.d.ts) |
| Grid/TreeGrid | [grid entry](../src/ui/grid-api.d.ts), [guide](GRID_TYPES.md) |
| Menus/dialogs/tabs/docking/MDI | [application contracts](../src/ui/application-contracts.d.ts) |
| Mapper | [advanced contracts](../src/ui/advanced-contracts.d.ts) |
| JSON factories | [Form](../src/ui/FormDefinition.d.ts), [Grid](../src/ui/GridDefinition.d.ts) |
| Themes | [applicator](../src/ui/ThemeApplicator.d.ts), [designer](../src/ui/ThemeDesigner.d.ts) |

Form owns composition before mount; Panel requires mount before add. Removing or
directly destroying a Form child forgets its values/slot. Lifecycle is terminal;
callbacks can close owners and stop subsequent phases. [Mutations](MUTATIONS.md).
