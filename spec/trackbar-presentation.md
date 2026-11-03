# TrackBar presentation

TrackBar retains its numeric EditorControl `.value`, range, snapping, keyboard and
pointer behavior. Options `showValue` (default false), `valuePosition` (default
right) and `thumbShape` (default circle) control only presentation.

`valuePosition`: left/right/top/bottom are physical sides in either orientation.
Left/right values align to the track midpoint; top/bottom align with its axis.
Hidden values consume no layout slot. `valueFormatter` still formats the number.
The field label and endpoint/tick labels are separate from the current value.

`thumbShape`: circle is filled, ring is an outlined circle with a theme-background
interior, grip is a rectangular handle with three ridges, line is a perpendicular
bar. Rectangular/line geometry rotates for vertical tracks. Native range input
interaction and focus indication remain available for every shape. Theme tokens
control the surface, border and accent colors.

Use `setValuePosition(position)`, `setThumbShape(shape)`, `setShowValue(boolean)` to
change an existing control. Methods return the control, retain the native input,
do not emit numeric change events, work before mount and reject after destroy.
Invalid position/shape names throw TypeError without changing current state.

```js
import { TrackBar } from 'taet-ui/inputs';
const slider = new TrackBar({orientation:'vertical', value:40, showValue:true,
  valuePosition:'top', thumbShape:'grip'});
slider.mount('#root');
slider.setThumbShape('ring').setValuePosition('left');
```

RGBColorPicker and CMYKColorPicker use the shared TrackBar top-value option;
there is no color-picker-specific positioning override. Exact declarations:
src/ui/TrackBar.d.ts. Live samples: docs/src/pages/AdditionalInputs.pages.js.
Regression: browser-tests/trackbar-presentation.spec.js exercises both orientations,
all value positions, native pointer/keyboard input and the CMYK popup alignment.

Acceptance (2026-09-12): npm test passed (523 unit tests plus syntax/API and
installed type checks). Six presentation cases passed across Chromium, Firefox
and WebKit, covering 16 alignment combinations per engine and all thumb variants.
Six color-picker regressions passed; all three Input Controls documentation checks
passed after updating the example count, stable field names and output locator.
Reviewed rendered documentation and CMYK value alignment. Changes remain in the
working tree alongside pre-existing work; unrelated changes were preserved.
