# RGBColorPicker and CMYKColorPicker

Experimental exports from taet-ui/experimental, taet-ui/all and taet-ui/inputs.
Both inherit ColorPicker/EditorControl: use live controls in Form, `.value` for the
canonical empty string or lowercase #rrggbb, validators and beforeChange veto.
See src/ui/RGBColorPicker.d.ts and src/ui/CMYKColorPicker.d.ts; implementation
shares src/ui/channelColorPicker.js and the existing TrackBar/Button/Popup controls.

RGB has three vertical 0–255 integer channels. CMYK has four 0–100 percent channels.
Circle caption buttons focus their corresponding sliders. A square preview and
editable HEX field sit on the left. Theme surface/text tokens style the panel;
channel colors are independent accents. Use Enter anywhere in the popup to accept
and close, restoring field focus. Invalid HEX or a beforeChange veto keeps it open.
Escape/outside click/closePopup discard draft edits. Programmatic .value changes
replace the draft. Clear drafts an empty color when allowEmpty is true.

Generic ColorPicker retains its existing live-update behavior; Enter also accepts
the focused HEX value and closes, while Escape closes without rolling back live
edits. IME composing Enter does not accept. Disabled/readOnly close the popup and
prevent editing. Owners destroy nested controls and subscriptions.

All modes save RGB hex for compatibility with CSS and existing Forms. getRgb and
setRgb are inherited. CMYK adds getCmyk() and setCmyk(c,m,y,k,options). Conversion:
RGB channel = round(255 * (1 - ink/100) * (1 - black/100)). Inverse uses the maximum
RGB channel to derive black, handles full black without division by zero, and
normalizes CMY. This is approximate screen mixing without ICC profiles, print
proofing or preservation of an original CMYK separation. Reopening derives channel
values from saved RGB; only the current open draft retains its ink decomposition.

Examples: docs/src/pages/ChannelColorPicker.pages.js and
examples/labs/color-pickers.html. Checks: test/channel-color-picker.test.js,
browser-tests/channel-color-picker.spec.js and installed type consumer.

Acceptance (2026-09-12): npm test passed with 522 unit cases, syntax/API checks and
installed TypeScript/JSDoc consumers. Fifteen color-field cases passed across
Chromium, Firefox and WebKit; nine focused Chromium/documentation cases passed
after final styling, including teardown during acceptance. RGB/CMYK screenshots
were reviewed in the dark theme. Package dry run succeeded. Docs and the dedicated
color-fields Lab are available through the standard 5174/5173 dev servers.
