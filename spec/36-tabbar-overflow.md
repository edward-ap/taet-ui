# 36. TabBar Overflow Navigation

`TabBar` keeps tabs at their natural compact width. When they no longer fit, it shows square previous/next icon buttons around a clipped viewport.

```js
const tabs = new TabBar({
  bordered: true,
  orientation: "top",
  overflowNavigation: true,
  scrollStep: 160,
  tabs: documents
});
```

Rules:

- navigation buttons are hidden while all tabs fit.
- previous/next is disabled at the corresponding scroll boundary.
- selecting or keyboard-focusing a hidden tab scrolls it into view.
- adding, removing, renaming, or resizing tabs recalculates overflow.
- `overflowNavigation: false` preserves native horizontal scrolling.
- buttons use the global icon registry and theme sizing tokens.

## Border Modes

- `bordered: true` draws the TabBar frame with `--dui-window-border`.
- the default `bordered: false` keeps only the structural bottom separator.
- `isBordered()` reads the current mode.
- `setBordered(boolean)` switches it at runtime and emits `appearanceChange`.

To join a TabBar and its content without a layout gap, put both controls into a `Panel` with `dui-tabbed-frame`; mark the immediate content control with `dui-tab-content`. The content border follows the TabBar mode.

## Orientation

`orientation` accepts `"top"`, `"bottom"`, `"left"`, or `"right"`. The default is `"top"`.

```js
tabs.getOrientation();
tabs.setOrientation("left");
```

- top/bottom tabs use horizontal previous/next navigation.
- left/right rotate the complete compact tab header by 90 degrees instead of laying labels out in a wide column.
- left/right tabs use vertical up/down navigation; left labels read bottom-to-top and right labels read top-to-bottom.
- `aria-orientation` and arrow-key behavior follow the visual axis.
- a surrounding `dui-tabbed-frame` moves its `dui-tab-content` automatically.
- runtime changes emit `appearanceChange` with `name: "orientation"`.

## Event lifecycle

Tab change/close methods stop subsequent phases when an application callback
destroys the control. Before callbacks may change the collection: closing
rechecks the target identity and current index, and activation respects a
replacement target or a selection already made by the handler. Native tab
clicks also stop after callback teardown, disable or target replacement.
