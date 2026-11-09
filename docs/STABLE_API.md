# API maturity

0.6.0-rc.7 preserves the stable root and experimental status of retained APIs.
Tier does not promote maturity: [TIERS](TIERS.md).
Grid/TreeGrid remain experimental. Approved common-contract changes are recorded
in the candidate manifest; maturity and tier boundaries are unchanged.
[Deferred extensions](EXTENSIONS.md).

The new opt-in `Grid.transferRowsTo` and local `DataStore.transferTo` operation
remain experimental with the Grid transfer contract; this does not promote Grid
or reclassify existing stable DataStore methods. See [GRID_TRANSFER](GRID_TRANSFER.md).

The opt-in TreeGrid moveNode/moveNodes subtree operation remains experimental,
within one local tree only. See [TREE_GRID_MOVE](TREE_GRID_MOVE.md).

NumberInput's opt-in `updateMode: 'commit'` keeps the default live contract and
its existing stable classification. Its integration does not promote Grid,
TreeGrid, PropertyGrid or the editor factories from experimental. See
[NumberInput](INPUT_TYPES.md#numberinput) for the draft/commit contract.

<!-- api-inventory:start -->
### Stable v0.x

- `BaseControl`
- `Button`
- `CheckBox`
- `CheckLetter`
- `CodeBlock`
- `CommandRegistry`
- `DataStore`
- `DataView`
- `DisposableBag`
- `EditorControl`
- `EventBus`
- `Form`
- `IconButton`
- `IconRegistry`
- `Layout`
- `LayoutCell`
- `NumberInput`
- `Panel`
- `RadioGroup`
- `RadioLetter`
- `ReadonlyText`
- `SelectInput`
- `SelectionModel`
- `ShortcutManager`
- `TextArea`
- `TextField`
- `TextInput`
- `ToolButton`
- `Toolbar`
- `ToolbarSeparator`
- `ToolbarSpacer`
- `TreeDataView`
- `createIcon`
- `email`
- `icons`
- `renderIcon`
- `required`
- `valueInData`

### Experimental

- `Accordion`
- `CMYKColorPicker`
- `CharacterRangeSelectionModel`
- `Chart`
- `CheckButton`
- `CircularSlider`
- `ColorPicker`
- `ConnectorLayer`
- `ConnectorModel`
- `ContextMenu`
- `ControlCellEditor`
- `DateInput`
- `DateTimeInput`
- `Dialog`
- `DockGroup`
- `DockLayout`
- `DockPanel`
- `DropDownList`
- `EdgeActionLayer`
- `FieldGroup`
- `FilePicker`
- `FileUpload`
- `Gauge`
- `Grid`
- `GridColumnModel`
- `GridColumnReorderController`
- `GridColumnResizer`
- `GridCore`
- `GridDataProvider`
- `GridFilterModel`
- `GridGroupModel`
- `GridKeyboardController`
- `GridPortProvider`
- `GridSearchModel`
- `GridSelectionController`
- `GridVirtualRenderer`
- `HidingSidePanel`
- `LabelText`
- `List`
- `ListPortProvider`
- `LogPanel`
- `MapperWindow`
- `MdiWindow`
- `MdiWorkspace`
- `MemoryResourceProvider`
- `Menu`
- `MessageBox`
- `MultiSelectDropDown`
- `OptionList`
- `OverlayManager`
- `Popup`
- `ProgressBar`
- `PropertyDescription`
- `PropertyGrid`
- `PropertyInspector`
- `RGBColorPicker`
- `RangeSelectionModel`
- `ScrollingLabel`
- `StaticPortProvider`
- `StatusText`
- `StepProgressBar`
- `Switch`
- `TabBar`
- `TextLayout`
- `ThemeApplicator`
- `ThemeDesigner`
- `TimeInput`
- `ToggleIconButton`
- `Tooltip`
- `TrackBar`
- `TreeExplorer`
- `TreeGrid`
- `TreeList`
- `TreeListPortProvider`
- `TreeNodeDragController`
- `compileFormDefinition`
- `compileGridDefinition`
- `compilePropertyGridDefinition`
- `compileTreeDefinition`
- `compileTreeGridDefinition`
- `createDelimitedExporter`
- `createFormFromJSON`
- `createGridEditorFactory`
- `createGridFromJSON`
- `createHeaderAction`
- `createPropertyGridFromJSON`
- `createTreeFromJSON`
- `createTreeGridFromJSON`
- `getPropertyGridValues`
- `gridEditors`
- `gridExporters`
- `headerActionLabel`
- `normalizeHexColor`
- `overlayManager`
- `setHeaderAction`

### Typed core entry point

- `BaseControl`
- `DataStore`
- `DataView`
- `DisposableBag`
- `EventBus`
- `GridColumnModel`
- `GridDataProvider`
- `GridFilterModel`
- `GridGroupModel`
- `GridSearchModel`
- `LifecycleError`
- `RangeSelectionModel`
- `SelectionModel`
- `TreeDataView`
- `isUserOrigin`
- `normalizeMutationOptions`

### Grid editor entry point (experimental)

- `ControlCellEditor`
- `createGridEditorFactory`
- `gridEditors`
- `isGridEditorFactory`

### Typed Grid entry point (experimental)

- `ControlCellEditor`
- `Grid`
- `GridColumnModel`
- `GridColumnReorderController`
- `GridColumnResizer`
- `GridCore`
- `GridDataProvider`
- `GridFilterModel`
- `GridGroupModel`
- `GridKeyboardController`
- `GridSearchModel`
- `GridSelectionController`
- `GridVirtualRenderer`
- `RangeSelectionModel`
- `TreeGrid`
- `compileGridDefinition`
- `compileTreeGridDefinition`
- `createDelimitedExporter`
- `createGridEditorFactory`
- `createGridFromJSON`
- `createTreeGridFromJSON`
- `gridEditors`
- `gridExporters`

### Typed inputs entry point

- `CMYKColorPicker`
- `CheckBox`
- `CheckLetter`
- `CircularSlider`
- `ColorPicker`
- `DateInput`
- `DateTimeInput`
- `DropDownList`
- `EditorControl`
- `FilePicker`
- `MultiSelectDropDown`
- `NumberInput`
- `OptionList`
- `ProgressBar`
- `RGBColorPicker`
- `RadioGroup`
- `RadioLetter`
- `SelectInput`
- `StepProgressBar`
- `Switch`
- `TextArea`
- `TextInput`
- `TimeInput`
- `TrackBar`
- `normalizeHexColor`
<!-- api-inventory:end -->
