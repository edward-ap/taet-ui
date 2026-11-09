# Architecture tiers and maturity

Tiers are import surfaces over original live implementations, not wrappers.
Paths stay stable to avoid a Grid refactor. Aliases preserve constructor identity.

| Tier | Responsibility |
| --- | --- |
| taet-ui/foundation | Lifecycle, events/disposables, commands, models, validators, icon/resource services, ThemeApplicator |
| taet-ui/components | Existing layout/forms/inputs/lists/tables/properties/buttons/indicators, overlays, concrete JSON factories |
| taet-ui/advanced | Existing MDI/docking/mapping, generic Chart/Gauge and ThemeDesigner |

Maturity is independent: root remains stable; retained experimental APIs remain
experimental in all tiers. Grid/TreeGrid hashes are checked against the approved candidate; imported hashes remain recorded separately.
ThemeApplicator is the existing theme service; ThemeDesigner is its advanced editor.
Shared JSON formats/data contracts belong to foundation concerns; existing
component-specific compilers/factories stay with their concrete controls.
No general JSON engine is introduced. Legacy aliases remain for retained APIs.
[Deferred APIs and Reader transition](EXTENSIONS.md).

NumberInput draft/commit behavior stays in the existing input component, and
owner preparation stays in Form and the existing table/property editors. It adds
no foundation transaction engine, new tier, or maturity promotion. See
[typed input behavior](INPUT_TYPES.md#numberinput).

<!-- tier-inventory:start -->

## Foundation symbols

- BaseControl
- CommandRegistry
- DataStore
- DataView
- DisposableBag
- EventBus
- GridColumnModel
- GridDataProvider
- GridFilterModel
- GridGroupModel
- GridSearchModel
- IconRegistry
- LifecycleError
- MemoryResourceProvider
- OverlayManager
- RangeSelectionModel
- SelectionModel
- ShortcutManager
- ThemeApplicator
- TreeDataView
- createIcon
- email
- icons
- isUserOrigin
- normalizeMutationOptions
- overlayManager
- renderIcon
- required
- valueInData

## Components symbols

- Accordion
- Button
- CMYKColorPicker
- CheckBox
- CheckButton
- CheckLetter
- CircularSlider
- CodeBlock
- ColorPicker
- ContextMenu
- ControlCellEditor
- DateInput
- DateTimeInput
- Dialog
- DropDownList
- EdgeActionLayer
- EditorControl
- FieldGroup
- FilePicker
- FileUpload
- Form
- Grid
- GridColumnModel
- GridColumnReorderController
- GridColumnResizer
- GridCore
- GridDataProvider
- GridFilterModel
- GridGroupModel
- GridKeyboardController
- GridSearchModel
- GridSelectionController
- GridVirtualRenderer
- HidingSidePanel
- IconButton
- LabelText
- Layout
- LayoutCell
- List
- LogPanel
- MemoryResourceProvider
- Menu
- MessageBox
- MultiSelectDropDown
- NumberInput
- OptionList
- Panel
- Popup
- ProgressBar
- PropertyDescription
- PropertyGrid
- PropertyInspector
- RGBColorPicker
- RadioGroup
- RadioLetter
- RangeSelectionModel
- ReadonlyText
- ScrollingLabel
- SelectInput
- StatusText
- StepProgressBar
- Switch
- TabBar
- TextArea
- TextField
- TextInput
- TextLayout
- TimeInput
- ToggleIconButton
- ToolButton
- Toolbar
- ToolbarSeparator
- ToolbarSpacer
- Tooltip
- TrackBar
- TreeExplorer
- TreeGrid
- TreeList
- TreeNodeDragController
- compileFormDefinition
- compileGridDefinition
- compilePropertyGridDefinition
- compileTreeDefinition
- compileTreeGridDefinition
- createDelimitedExporter
- createFormFromJSON
- createGridEditorFactory
- createGridFromJSON
- createHeaderAction
- createPropertyGridFromJSON
- createTreeFromJSON
- createTreeGridFromJSON
- getPropertyGridValues
- gridEditors
- gridExporters
- headerActionLabel
- normalizeHexColor
- setHeaderAction

## Advanced symbols

- Chart
- ConnectorLayer
- ConnectorModel
- DockGroup
- DockLayout
- DockPanel
- Gauge
- GridPortProvider
- ListPortProvider
- MapperWindow
- MdiWindow
- MdiWorkspace
- StaticPortProvider
- ThemeDesigner
- TreeListPortProvider
<!-- tier-inventory:end -->
