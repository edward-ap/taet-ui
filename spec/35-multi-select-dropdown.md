# MultiSelectDropDown

`MultiSelectDropDown` is the array-valued counterpart of `DropDownList`. It reuses the same `DataStore`, searchable overlay, filtering, item renderer, image/icon fields, lifecycle, validation, and dirty-state contracts.

```js
const regions = new MultiSelectDropDown({
  name: "regions",
  label: "Regions",
  value: ["north", "east"],
  searchable: true,
  placeholder: "Select regions"
});

regions.data.parse([
  { id: "north", text: "North" },
  { id: "south", text: "South" },
  { id: "east", text: "East" }
]);
```

## Value Contract

```js
regions.value.get();                 // ["north", "east"]
regions.value.set(["south"]);
regions.value.clear();               // []
regions.addValue("north");
regions.removeValue("south");
regions.getSelectedItems();
```

Values are unique ids in display order. `value.get()` returns a copy so callers cannot mutate control state without `value.set()`. Change events contain `oldValue`, `newValue`, `oldItems`, and `newItems`.

Selecting an item toggles it and keeps the popup open. Set `closeOnSelect: true` for compact one-at-a-time workflows. Each selected item is represented by a removable token. Backspace or Delete on the focused display removes the last token.

The popup uses `role="listbox"` with `aria-multiselectable="true"`; selected rows expose `aria-selected`. Token removal uses named icon buttons.

## Declared contract and teardown

The experimental taet-ui/inputs binding types the choice schema independently
from unknown[] values, which may contain unmatched IDs. getSelectedItems copies
the result array while retaining record references. Empty is fixed to []; values
deduplicate by Object.is and dirty tracking compares ordered elements. Use
setCleanValue() with current normalized values. Before-change payloads support
veto rather than draft rewriting and contain plural oldItems/newItems.

Destruction in beforeChange aborts the write; destruction in change/afterChange
preserves the applied result and skips later phases and popup work. addValue and
removeValue reject after teardown even for no-op inputs. Token removal preserves
numeric versus string identity. Shared data and overlay services remain borrowed.
