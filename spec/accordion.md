# Accordion (experimental)

Accordion is a Panel-derived owner of collapsible live content. It is exported from `taet-ui/experimental`, with styles included by `taet-ui/taet-ui.css`.

## Construction and content

```js
const accordion = new Accordion("#root", { name: "settings", multiple: false, bordered: true });
const form = new Form({ name: "profile" }).row(new TextInput({ name: "displayName" }));
accordion.addSection({ name: "general", title: "General", expanded: true }, form);
```

- Mount before `addSection(options, content)`; content must be a live unowned, unmounted control.
- A section requires a unique nonempty string `name`. `title` defaults to name. `expanded` and `disabled` default to false.
- The owner mounts content once. Collapsing only hides the region: it preserves model values, validation state, listeners and ownership.
- Adding an expanded section closes existing sections unless `multiple: true`. Disabled sections cannot initially expand.
- `addSection` returns content, or null when `beforeChildAdd` is cancelled. Cancelled additions leave content unmounted and unowned.
- `getSection(name)` returns content or null. `removeSection(name)` destroys content; the inherited removal event may veto it. Terminal owner destruction releases every child even if normal removal is vetoed.
- `bordered` defaults to true. Disabling the Accordion disables headings; it does not disable editors inside already open sections.

## Expansion

`expand(name, options)`, `collapse(name, options)`, `toggle(name, options)` and `setExpanded(name, expanded, options)` return a boolean indicating a committed change. Unknown names and unchanged state return false. `getExpanded()` returns a fresh name array in section order; `isExpanded(name)` returns a boolean. All sections may be collapsed in either mode.

Non-silent transitions emit cancellable `beforeChange`, then synchronize UI and emit `change`. Both carry `source`, `name`, `expanded`, `oldValue`, `newValue`, `origin` and `userAction`. Before-change arrays are copies; `cancel: true` leaves state and UI unchanged. `silent: true` suppresses both events but updates the UI. Calls after destruction reject mutation. Initial section registration and section removal use container child events rather than expansion events.

## Keyboard and accessibility

Every heading contains a native button with `aria-expanded` and `aria-controls`, linked to a named region. Hidden regions are excluded from focus navigation. Collapsing a region containing focus returns focus to its header.

- Enter and Space toggle the focused heading.
- ArrowUp/ArrowDown cycle enabled headings.
- Home/End focus the first/last enabled heading.
- Disabled headings are skipped and cannot be toggled by the user.

The container creates native DOM internally. Application examples compose only Tæt UI controls; no framework or runtime dependency is introduced.
