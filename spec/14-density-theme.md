# 14. CSS Density / Theme Tokens

## Problem

A desktop-like WebView UI must be dense, predictable, and scannable. If each control chooses its own spacing and heights, the result becomes a web page, not a workbench.

Density and semantic color tokens are part of the primitive layer.

## Default typography

`taet-ui.css` loads bundled Noto Sans (upright variable weights 100–900) locally,
with Segoe UI / Arial / sans-serif fallbacks. No external font service is used.
Keep `src/ui/fonts/` alongside the styles when serving or copying the library;
a CSS bundler must preserve/rewrite the relative font URL. The font's OFL license
is included in the package. Desktop metrics remain 12px / 18px line height,
24px controls and 22px rows. Code/monospace faces remain separate.

To override the default, place this after Tæt UI CSS (the compact profile
also defines the token, so override it on the application root):

```css
body.dui-page { --dui-font-family: "Segoe UI", Arial, sans-serif; }
```

Loading uses `font-display: swap`; an initial fallback can appear on a cold load.
For application-owned text measurements, await
`document.fonts.load('12px "Noto Sans"')` before measuring.

## Required Tokens

```css
:root {
  --dui-font-size: 12px;
  --dui-line-height: 18px;

  --dui-control-height: 24px;
  --dui-row-height: 22px;
  --dui-toolbar-height: 28px;
  --dui-statusbar-height: 22px;
  --dui-panel-header-height: 24px;
  --dui-property-row-height: 24px;

  --dui-gap-xs: 2px;
  --dui-gap-sm: 4px;
  --dui-gap-md: 8px;
  --dui-gap-lg: 12px;

  --dui-border-width: 1px;
  --dui-radius-sm: 2px;
  --dui-radius-md: 4px;

  --dui-scrollbar-size: 6px;
  --dui-scrollbar-thumb-min-size: 18px;
  --dui-header-action-size: 18px;
  --dui-dialog-header-height: 32px;
  --dui-dialog-footer-height: 38px;
}
```

## Theme And Profile Selection

Themes and profiles are chosen once near the application root.

```html
<body class="dui-page dui-theme-light-blue dui-profile-compact">
  <div id="root" class="dui-app-root"></div>
</body>
```

Rules:

- Components inherit theme/profile tokens from the root.
- App code should not pass per-control CSS classes to get normal colors, spacing, validation visuals, or disabled/focus styling.
- `css` / `className` options are for exceptional layout integration only, not the standard styling path.
- A theme controls color scheme.
- A profile controls density, geometry, and standard component presentation.
- Only a small number of supported themes/profiles should exist.
- `dui-theme-light` is the neutral light theme; `dui-theme-light-blue` is the branded blue-window theme.

Current themes:

- `dui-theme-light-blue`
- `dui-theme-dark-blue`

Planned themes:

- `dui-theme-contrast-light`
- `dui-theme-contrast-dark`

## Semantic Color Tokens

Controls must not hardcode common colors locally.

```css
:root {
  --dui-color-bg: #ffffff;
  --dui-color-surface: #f7f7f7;
  --dui-color-surface-strong: #eef3f8;
  --dui-color-surface-raised: #ffffff;
  --dui-color-border: #c8c8c8;
  --dui-color-border-strong: #b8b8b8;
  --dui-color-row-border: #eeeeee;
  --dui-color-text: #202020;
  --dui-color-muted: #666666;

  --dui-color-focus-border: #2d6fb7;
  --dui-color-focus-bg: #e8eef7;
  --dui-color-selection-bg: #d8e8ff;
  --dui-color-selection-text: #202020;

  --dui-color-invalid-border: #c43b3b;
  --dui-color-invalid-bg: #fff7f7;
  --dui-color-warning-border: #b78b00;
  --dui-color-warning-bg: #fff9e6;

  --dui-window-header-bg: var(--dui-color-surface);
  --dui-window-header-text: var(--dui-color-text);
  --dui-window-border: var(--dui-color-border-strong);
  --dui-window-content-bg: var(--dui-color-bg);
  --dui-window-footer-bg: var(--dui-color-surface);

  --dui-button-bg: #ffffff;
  --dui-button-bg-hover: #f0f0f0;
  --dui-button-bg-active: #e6e6e6;
  --dui-button-bg-disabled: #f3f3f3;
  --dui-button-border: var(--dui-color-border-strong);
  --dui-button-text: var(--dui-color-text);
  --dui-button-text-disabled: var(--dui-color-muted);

  --dui-command-button-bg: var(--dui-button-bg);
  --dui-command-button-bg-hover: var(--dui-button-bg-hover);
  --dui-command-button-bg-active: var(--dui-button-bg-active);
  --dui-command-button-bg-disabled: var(--dui-button-bg-disabled);
  --dui-grid-frozen-bg: var(--dui-color-bg);
  --dui-grid-frozen-hover-bg: var(--dui-color-surface);

  --dui-shadow-popup: 0 2px 5px rgb(0 0 0 / 18%);
  --dui-shadow-floating: 0 2px 10px rgb(0 0 0 / 22%);
}
```

`dui-theme-light-blue` overrides the window and button tokens as one visual profile:

- blue header and matching outer border;
- white window content;
- neutral gray command footer;
- blue command buttons with white text;
- pale-blue disabled buttons with muted white text.

Command-button tokens are separate from neutral internal button surfaces. Grid filter modes, editor chrome, frozen cells, and similar component internals must not inherit the branded command-button background.

Dialog, MDI window, and DockPanel consume the same window tokens. Component CSS must not recreate these colors locally.

## Compact Profile Tokens

```css
.dui-profile-compact {
  --dui-font-size: 12px;
  --dui-line-height: 18px;
  --dui-control-height: 24px;
  --dui-label-width: 110px;
  --dui-root-width: min(760px, 100%);
  --dui-form-width: min(420px, 100%);
  --dui-log-width: min(520px, 100%);
  --dui-log-height: 120px;
}
```

## Rules

- Controls use tokens, not hardcoded local heights.
- Controls use semantic color tokens, not repeated local hex colors.
- Components inherit profile geometry from root classes.
- Desktop controls default to compact density.
- A future theme may override tokens, but control contracts should not change.
- `dui-theme-light-blue` and `dui-theme-dark-blue` are the first concrete theme classes.
- `dui-theme-light` remains the neutral light alternative.
- Do not build a theme editor before the primitive token layer is stable.
- Spacing must optimize repeated work, not marketing layout.
- Property grids, trees, grids, toolbars, splitters, and status bars must align to the same density scale.
- Scrollbars and window-header actions use the shared visual primitive contract rather than component-local rules.

## Acceptance Criteria

On a 1080px-high viewport:

- toolbar height is `<= 30px`
- statusbar height is `<= 24px`
- grid row height is `<= 24px`
- tree row height is `<= 22px`
- property row height is `<= 24px`
- panel header height is `<= 26px`

## Acceptance Checklist

- Every visual control consumes density tokens.
- Density is themeable from one place.
- Common color usage is themeable from one place.
- Invalid, warning, readonly, focus, and disabled states use semantic tokens.
- Compact layout is the default.
- Row/header/control heights are stable and do not shift on hover/focus.
