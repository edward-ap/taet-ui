# 38. ColorPicker

## Status

`ColorPicker` is an experimental Tæt UI editor control. It has no runtime
dependency outside Tæt UI and composes with `Form` through the standard
`EditorControl.value` API.

## Value contract

The persisted value is deliberately small:

```js
const picker = new ColorPicker({
  name: "fieldColor",
  label: "Field color",
  value: "#2196f3",
  allowEmpty: true
});

picker.value.get(); // "#2196f3"
picker.setRgb(33, 150, 243);
picker.getRgb(); // { red: 33, green: 150, blue: 243 }
```

Values are normalized to lowercase `#rrggbb`. Three-digit hex and
`rgb(r, g, b)` input are accepted. An empty string represents no color.
`allowEmpty` controls the Clear action; use a validator to reject empty values.
HSV exists only as transient popup interaction state
and is never serialized.

## Interaction

The collapsed editor shows a swatch and hex value. Activating it opens a Tæt UI
UI `Popup` containing:

- a two-dimensional saturation/value plane;
- a hue slider;
- current-color preview;
- numeric red, green, and blue channels;
- editable hex value;
- optional Clear action;
- browser `EyeDropper` integration when that API is available.

Arrow keys move the saturation/value marker. `Shift` increases the movement
step. Escape closes the popup through the shared overlay manager.

## Lifecycle

The popup is created lazily. Disabling, making the control read-only, or
destroying the control closes and releases the popup. Popup state is UI-only;
only the canonical color value participates in Form state and change events.

Pending EyeDropper completion is ignored after destruction. This does not cancel
requests when a live popup closes. Queued popup focus checks the current opening
and lifecycle before focusing, including destruction from an open listener.

## Declarations

`taet-ui/inputs` declares the existing ColorPicker and normalizeHexColor exports,
including canonical string reads/events, nullable writes, RGB helpers, popup methods
and open/close callbacks. Experimental status is unchanged. See
[typed input controls](../docs/INPUT_TYPES.md#colorpicker) for examples and limits.
