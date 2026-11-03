# Icon System

## Purpose

All framework controls use one semantic icon API. A control configuration names an icon; it does not embed a glyph, CSS drawing, SVG string, or third-party icon component.

```js
new Button({ label: "Save", icon: "save" });
new ToolButton({ label: "Close", icon: "window.close" });
```

`icon` and `image` are different concepts:

- `icon` is a registered, theme-aware vector rendered with `currentColor`.
- `image` is application content loaded from a URL or supplied as an image element.
- A component-specific renderer may return an `HTMLElement` for rich application content.

Unknown icon names are errors. Controls must not silently replace them with text, emoji, or the first letter of a label.

## Registry

The stable entry point exports the shared `icons` instance and the `IconRegistry` class.

```js
import { icons } from "./src/ui/index.js";

icons.register("project.deploy", {
  viewBox: "0 0 24 24",
  nodes: [
    ["path", {
      d: "M12 3v12m-5-5 5 5 5-5M5 21h14",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 2
    }]
  ]
});

icons.alias("deploy", "project.deploy");
```

Names are lowercase semantic identifiers such as `save`, `chevron-down`, and `window.close`. Application packs should use a namespace such as `project.*`.

Registration uses structured SVG nodes rather than SVG markup strings. The renderer accepts only its documented SVG tags and attributes, creates elements through DOM APIs, and does not execute or inject markup.

## Rendering

```js
import { createIcon, renderIcon } from "./src/ui/index.js";

host.append(createIcon("warning"));
renderIcon(existingHost, "calendar");
```

Icons are decorative by default and receive `aria-hidden="true"`. Pass `{ label: "Warning" }` only when the icon itself carries information. Icon-only controls must still provide a visible tooltip and an accessible label through the owning control API.

Sizing belongs to the consuming component. The shared SVG uses `currentColor`, so density profiles and themes control size and color without replacing icon definitions.

Use the shared density tokens instead of literal dimensions:

- `--dui-icon-size-xs`: 10px for secondary micro indicators.
- `--dui-icon-size-sm`: 12px for chevrons and compact affordances.
- `--dui-icon-size-compact`: 14px for dense rows and normal buttons.
- `--dui-icon-size-md`: 16px for headers, toolbar buttons, menus, and editors.
- `--dui-icon-size-lg`: 20px for prominent actions.
- `--dui-icon-button-size-compact`, `-md`, and `-lg`: 20px, 24px, and 28px button hosts.

Every icon button must be an inline flex/grid container that centers the SVG on both axes. SVG baseline alignment must not be used for button geometry.

## Built-in Pack

The built-in offline pack covers command actions, chevrons, date/time editors, common status symbols, tree data, and standardized window actions. It has no runtime dependency and performs no network requests.

New framework components must use this system. Local pseudo-element drawings, text glyphs, embedded SVG strings, and component-private icon maps are not allowed unless the visual is intrinsic data rather than an icon.

IconButton accepts optional `pressed: boolean|null` and `setPressed(value)` for
application-controlled selected actions. This publishes aria-pressed; it does not
automatically toggle or own application state. Null removes the toggle semantic.
