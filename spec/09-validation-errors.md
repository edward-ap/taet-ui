# 09. Validation / Errors

## Problem

Validation cannot be an afterthought hidden inside individual controls.

Desktop-like applications need validation at several levels:

- single field value
- property grid property
- form section
- grid row
- mapping link
- transform step
- full project

If validation is local DOM text or ad hoc exceptions, the app cannot reliably drive command state, dirty-state, import/export, property panels, or project-wide diagnostics.

## Required Primitive

```ts
interface ValidatableControl extends Control {
  readonly validation: ValidationModel;
}

interface ValidationModel {
  validate(options?: ValidationOptions): ValidationResult;
  clear(options?: ValidationOptions): void;
  getErrors(): readonly ValidationError[];
  hasErrors(): boolean;

  readonly events: EventBus;
}

type ValidationOptions = MutationOptions & {
  scope?: "control" | "children" | "project";
  display?: "none" | "summary" | "inline";
};
```

## Implementation Scope

Validation is staged. The first implementation slice is field-level and form-level validation only.

Minimum v0 shape:

```ts
type Validator<TValue = unknown> = (
  value: TValue,
  context: ValidationContext
) => ValidationResult | string | true | null | undefined;

type ValidationResult =
  | true
  | null
  | undefined
  | string
  | {
      ok: boolean;
      severity?: "error" | "warning";
      message?: string;
      code?: string;
    };

interface MinimalValidatableControl {
  validate(context?: ValidationContext): FormValidationResult;
  isValid(): boolean;
  clearValidation(): void;
  readonly validation: {
    getErrors(): readonly ValidationError[];
    clear(): void;
  };
}

interface Form {
  validate(context?: ValidationContext): FormValidationResult;
}

type FormValidationResult = {
  ok: boolean;
  errors: ValidationError[];
};

interface MinimalValidationModel {
  getErrors(): readonly ValidationError[];
  hasErrors(): boolean;
}
```

Rules:

- Field-level validation is allowed as a small vertical slice.
- Mapper/workbench validation is often domain-level: graph errors, mapping errors, missing schema links, invalid transforms.
- The first field controls may accept `validators: Validator[]`.
- `Form.validate()` calls `validate()` on child controls that support it.
- Full async/project validation belongs later.

## Validation Result

```ts
type ValidationSeverity = "info" | "warning" | "error";

type ValidationResult = {
  ok: boolean;
  errors: ValidationError[];
};

type ValidationError = {
  code: string;
  message: string;
  severity: ValidationSeverity;
  source?: unknown;
  path?: string;
  property?: string;
};
```

Rules:

- Errors are structured objects, not plain strings in DOM.
- `code` is stable and machine-readable.
- `message` is user-facing.
- `path` points into project/value/property model when possible.
- `severity` allows warnings without blocking commands.

## Events

```ts
interface ValidationEvent extends UIEventObject<ValidationModel> {
  result: ValidationResult;
  userAction: boolean;
}
```

Recommended events:

```ts
beforeValidate
afterValidate
errorsChange
clear
```

Rules:

- `beforeValidate` is cancellable.
- `afterValidate` includes the complete result.
- `errorsChange` fires only when error set changes.
- `silent: true` suppresses public validation events.
- `display` controls whether visible validation UI is updated or shown.
- Internal validation state may still update silently.
- Command state may still refresh from validation state through explicit app context updates.

Display policy:

```ts
type ValidationDisplay = "none" | "summary" | "inline";
```

Rules:

- `display: "none"` recomputes without showing inline errors.
- `display: "summary"` updates diagnostics summaries.
- `display: "inline"` may update field/property-level UI, but dense desktop profiles should avoid layout-shifting inline text by default.
- Project hydration should usually use `{ origin: "import", silent: true, display: "none" }`.

## Field State Integration

Validation updates control state:

```ts
field.state.set("invalid", { message: "Email is required" });
field.state.clear("invalid");
field.state.set("warning", { message: "Unusual value" });
field.state.set("readonly", true);
field.state.set("required", true);
```

Rules:

- `invalid` maps to non-layout error visuals: usually border/background plus a hover/focus hint.
- `warning` maps to warning visuals without making the form invalid.
- `readonly` maps to native readonly where the control has an editable input.
- `required` maps to a visual required marker and may be enforced by validators.
- State is a control primitive; validation is one producer of state.

Dense profile rules:

- Validation messages must not expand field height by default.
- A form with many invalid fields must keep its geometry stable.
- Message text should be available through a tooltip/hint or diagnostics summary.
- A future global tooltip manager may replace native/browser hints, but it must still avoid layout shifts.

## Value Integration

Value controls may validate after value changes.

Recommended defaults:

- user changes validate according to control policy
- programmatic changes may validate silently
- project hydration does not show validation messages
- explicit project validation can validate everything

Example:

```ts
field.value.set("abc", { userAction: true });
field.validation.validate({ userAction: true });
```

## Command Integration

Commands should use validation state.

```ts
commands.register("project.save", {
  label: "Save",
  enabled: ctx => ctx.projectValidation?.hasErrors() !== true,
  run: ctx => saveProject(ctx.project)
});
```

## Property Integration

Property definitions may carry validation metadata later:

```ts
type PropertyValidationMetadata = {
  validation?: ValidationRule[];
  error?: ValidationError;
};
```

The property grid should display validation from the model, not invent domain rules.

## Runtime Error Policy

Validation errors are expected domain diagnostics. Runtime/app errors are different.

```ts
type AppErrorSeverity = "info" | "warning" | "error" | "fatal";

type AppError = {
  code: string;
  message: string;
  severity: AppErrorSeverity;
  source?: unknown;
  cause?: unknown;
};
```

Rules:

- `ValidationError` describes invalid user/project data.
- `AppError` describes command failures, import failures, host bridge failures, rendering failures, and unexpected exceptions.
- Expected command failures should return `CommandResult`.
- Unexpected exceptions should be reported through centralized error handling.
- A diagnostics UI may display both `ValidationError` and `AppError`, but the models remain separate.

## Acceptance Checklist

- Validation produces structured errors.
- Errors have code, message, severity.
- Validation can be run explicitly.
- Errors can be cleared.
- Field validation can update `invalid` / `warning` state.
- `Form.validate()` aggregates child control errors.
- Validation events use event objects.
- Silent validation is possible.
- Validation integrates with value changes and command enabled-state.
- Project-level validation is possible without DOM.
- Runtime errors are not confused with validation errors.
