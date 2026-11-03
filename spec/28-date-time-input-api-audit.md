# 28. Date / Time Input API Audit

This document compares our first `DateInput`, `TimeInput`, and `DateTimeInput` pass with DHTMLX Form date/time inputs and DevExpress WinForms `DateEdit` / `TimeEdit`.

## Baselines

DHTMLX Form has separate `dateInput` and `timeInput` elements. Both follow the standard form item contract:

```ts
setValue(value: string | Date): void;
getValue(): string;
clear(): void;
validate(): boolean;
clearValidate(): void;
```

DevExpress `DateEdit` is a drop-down date editor that lets users type a date/time value or select a date from a calendar. Useful ideas:

- edit value can be used for data binding
- typed value and picker value are synchronized
- clear/today options
- min/max date
- optional time editing in the calendar dropdown

DevExpress `TimeEdit` is useful conceptually as a formatted time editor with editor value semantics, but the large picker UI is not a good fit for our dense WebView target.

## Decision

We expose three controls:

```ts
class DateInput extends EditorControl<string> {}
class TimeInput extends EditorControl<string> {}
class DateTimeInput extends EditorControl<string> {}
```

Value formats:

- `DateInput`: `YYYY-MM-DD`
- `TimeInput`: `HH:mm`
- `DateTimeInput`: `YYYY-MM-DDTHH:mm`

Rules:

- empty value is `""`
- `Date` objects can be passed to `value.set()`, but `value.get()` returns a stable string
- strings are the project model format
- controls inherit `beforeChange/change/afterChange`, validation, readonly, required, dirty-state, and form aggregation from `EditorControl`

## UI

Current first pass:

- `DateInput`: custom text input plus compact calendar dropdown
- `TimeInput`: text input plus compact time button and `+` / `-` steppers
- `DateTimeInput`: custom text input plus calendar dropdown and time wheels

`TimeInput` supports constructor-level initial display mode:

```ts
new TimeInput({ hour12: true, stepMinutes: 30 });
new TimeInput({ hour12: false, stepMinutes: 15 });
new TimeInput({ hourMode: "1-24", stepMinutes: 30 });
```

The display may be 12-hour, but stored value remains `HH:mm`.

The picker is a compact dropdown:

- hour wheel
- minute wheel
- right-side mode column with `AM`, `PM`, and `24`

When `24` is active, the hour wheel displays `1..24` instead of `1..12`. `24:mm` parses back to stored `00:mm`. This keeps the project model stable while allowing a 24-hour wheel mode.

## Why Not Copy DevExpress Time Picker

The large square/row picker is too visually heavy for our dense desktop-like WebView controls. A small input with step buttons is easier to scan, easier to place in grids/property editors, and consistent with our current compact form density.

## Later

1. Keep the implemented custom calendars consistent across supported WebViews.
2. Add `showToday` / `showClear` options.
3. Add `min` / `max` validation, not only native input attributes.
4. Add disabled date provider only when real business rules need it.
5. Add keyboard handling for time segments if the simple stepper is not enough.

## Acceptance Checklist

- all three controls implement `EditorControl`.
- form aggregation sees date/time fields exactly like other fields.
- values are project-model friendly strings.
- `TimeInput` supports 12-hour display without storing AM/PM strings.
- `TimeInput` supports `0..23`, `1..24`, and `AM/PM` hour modes without changing stored value format.
- readonly blocks user edits and steppers.
- theme tokens style the controls without per-control CSS.

## Standalone declaration and lifecycle contract

taet-ui/inputs declares the original three experimental constructors from
DateTimeInput.js. Their value API accepts string | Date | null | undefined writes
and returns strings; value events and validators also use strings. Date objects
convert through local calendar fields. Empty is fixed to ''. Clean baselines are
already normalized strings because setCleanValue does not normalize its argument.

Date/time presentation options share declarations with Grid factories and reuse
the borrowed InputOverlayService protocol. The 0-23/1-24/12 display modes do not
change canonical model formats. DateTime text always uses a space separator and
24-hour time, while hour-mode settings configure its picker. Partial strings can
remain in the model; min/max native attributes do not enforce date ranges.

Date day/Clear actions commit immediately. Time and DateTime wheels stage a draft
until OK; veto restores the committed text. Cancel restores the latest committed
value, including an API write made after opening. Escape/outside dismissal also
discard the draft. Time step buttons commit immediately; presentation mode changes
persist across Cancel. There is no public openPopup/spinUp or picker event API.

Destroying the field inside a value callback stops later picker work. The owner
removes its picker and clears DOM references without destroying an injected overlay
manager. General service callback reentry is outside this focused guarantee.
