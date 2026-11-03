# ThemeApplicator (experimental)

An application-owned color adapter for ThemeDesigner.getTheme(). Import from the
portable bundle or taet-ui/experimental. It is a service, not a visible control.
It does not choose a foundation, save presets, inspect DOM depth or run a host bridge.

```js
import {ThemeApplicator, ThemeDesigner} from './taet-ui.min.js';
const colors = new ThemeApplicator(applicationRoot, {scopes: [
  {selector: '.app-toolbar', parts: ['surface']},
  {selector: '.library-panel', role: 'secondary', parts: ['sidePanel']},
  {selector: '.library-content', parts: ['surface']},
  {selector: '.details-group', role: 'tertiary', parts: ['fieldGroup']},
  {selector: '.app-dialog', parts: ['dialog']}
]});
const designer = new ThemeDesigner(designerHost, {
  toolbar: false, maxColors: 3,
  onChange: event => colors.apply(event.theme)
});
colors.apply(designer.getTheme());
// Cancel: apply the previously saved ThemeColors snapshot, or clear().
// Return to a built-in theme:
colors.clear();
// Close the application owner:
colors.destroy();
```

The root is an HTMLElement or mounted Control. A Control owns automatic teardown;
for an HTMLElement register destroy() with the screen's disposable owner. One
adapter per root; overlapping roots are rejected. Independent sibling applications
are isolated. Place body-mounted dialogs under the chosen root (body is suitable
for a single-app WebView); portals outside it are intentionally unaffected.

apply accepts `{tokens, families?: {primary:{tokens}, secondary:{tokens}, ...}}`.
GeneratedTheme satisfies this type; definition/diagnostics are ignored. Store the
snapshot in the host's settings if needed. Existing host-specific flat family maps
must be wrapped as `{tokens}` before passing them. No silent data migration.
Token names must start with --dui- (case-sensitive names, including onColor), and
values must be six-digit HEX. Unsafe/malformed values reject the whole application
before changing the live stylesheet. Scope selectors are trusted application code,
never user input. Invalid role/part/selector configurations fail at construction.

The root receives all tokens plus the primary family. Descendant role bindings
apply family tokens; omitted role inherits. Declare nested bindings after their
parents. Dynamic dialog/group descendants match automatically: no observer or
DOM rewrite. Roles follow the generated palette/distribution, not DOM nesting.

Parts opt into visible presentation:
- surface: soft focus background and contextual border (toolbar/panel).
- fieldGroup: contextual border and strong title background/foreground pair.
- sidePanel: soft drawer/tab surfaces and contextual border/focus tokens.
- dialog: soft footer; the native Tæt UI header already consumes header tokens.
- progress: themed Tæt UI ProgressBar track/fill inside the selected container.

Leave reading canvas/paper and custom drawing surfaces unbound. Native HTML widgets
or application-specific presentation remain host CSS; this is not a universal skin.
Only the owned stylesheet/marker are changed. clear() removes color/presentation
rules; destroy() also removes ownership and the stylesheet, is idempotent, and
rejects later apply/clear. Existing inline styles/classes are never overwritten.
Keep light/dark foundation and color-scheme changes in the host so Cancel can restore
them together with the saved palette. Clearing does not change those classes.

Regression: browser-tests/theme-applicator.spec.js; real consumer: GjøaReader.
