# 32. Shared Visual Primitives

## Purpose

Repeated operating-system-like visuals must be defined once. Components may choose whether a surface scrolls or which header actions it exposes, but they must not invent local scrollbar or window-button styling.

## Scrollbar Contract

Every scrollable element inside `.dui-control` inherits the shared scrollbar profile from `styles/scrollbars.css`.

Required tokens:

```css
--dui-scrollbar-size: 6px;
--dui-scrollbar-thumb-min-size: 18px;
--dui-scrollbar-thumb: var(--dui-color-border-strong);
--dui-scrollbar-thumb-hover: var(--dui-color-focus-border);
```

Rules:

- vertical and horizontal scrollbars use the same thickness;
- tracks and corners are transparent;
- thumb colors come from the active theme;
- Grid, List, LogPanel, PropertyGrid, TextArea, Popup and picker surfaces use the same contract;
- component styles must not duplicate `::-webkit-scrollbar` rules;
- native browser or operating-system popup surfaces that cannot be styled are outside this contract.

## Header Contract

Window-like components use these structural classes:

```text
dui-window-header
dui-window-header__title
dui-window-header__actions
dui-header-action
```

Supported standard actions:

```text
close
minimize
collapse
pin
unpin
dock
undock
maximize
restore
```

`createHeaderAction()` creates a semantic button. `setHeaderAction()` changes a stateful action without replacing the element.

Rules:

- actions use CSS icons and contain no textual glyphs;
- every action has a tooltip and `aria-label`;
- stateful actions expose `aria-pressed` where appropriate;
- geometry, hover, active and keyboard-focus presentation are shared;
- component-specific code owns behavior and cancellable lifecycle events;
- DockPanel and Dialog are the first consumers of this contract.

## Acceptance Criteria

- shared header actions remain `18px` in both supported themes;
- shared scrollbars remain `6px` in both supported themes;
- switching themes changes semantic colors without changing geometry;
- modal headers and docking headers expose keyboard-focusable native buttons;
- no component stylesheet contains a private scrollbar implementation.
