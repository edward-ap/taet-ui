import { validationRevision } from "../core/validationRevision.js";
import { TextField } from "./TextField.js";
import { normalizeValidationResult } from "./EditorControl.js";
import { normalizeMutationOptions } from "../core/mutationOptions.js";

export class NumberInput extends TextField {
  constructor(containerOrOptions = {}, maybeOptions) {
    const hasContainer =
      typeof containerOrOptions === "string" ||
      (typeof HTMLElement !== "undefined" && containerOrOptions instanceof HTMLElement);

    const options = hasContainer ? maybeOptions ?? {} : containerOrOptions ?? {};

    super({
      ...options,
      inputType: options.inputType ?? options.type ?? "number",
      value: formatNumberValue(options.value),
      emptyValue: ""
    });

    if (options.updateMode != null && options.updateMode !== "live" && options.updateMode !== "commit") {
      throw new TypeError('updateMode must be either "live" or "commit".');
    }
    this.updateMode = options.updateMode ?? "live";
    this._inputRevision = 0;
    this._pendingInput = null;
    this.min = options.min ?? null;
    this.max = options.max ?? null;
    this.step = options.step ?? options.increment ?? null;
    this.increment = this.step === "any" ? (options.increment ?? 1) : (this.step ?? 1);
    this.precision = normalizeOptionalInteger(options.precision ?? options.decimalPlaces);
    this.isInteger = options.isInteger === true || options.float === false || options.isFloatValue === false;
    this.clamp = options.clamp !== false && options.clampToRange !== false;
    this.allowSpinOnMouseWheel = options.allowSpinOnMouseWheel === true || options.allowWheel === true;
    this._value = formatNumberValue(
      this._normalizeNumber(Object.prototype.hasOwnProperty.call(options, "value") ? options.value : "")
    );
    this._cleanValue = this._cloneValue(this._getValue());
    if (hasContainer) this.mount(containerOrOptions);
  }

  createElement() {
    const root = super.createElement();
    root.classList.add("dui-number-input");

    if (this._input) {
      this._input.type = "number";
      this._input.classList.add("dui-number-input__input");

      if (this.min != null) {
        this._input.min = String(this.min);
      }

      if (this.max != null) {
        this._input.max = String(this.max);
      }

      if (this.step != null) {
        this._input.step = String(this.step);
      }

      this.disposables.addEventListener(this._input, "keydown", event => {
        if (event.defaultPrevented || event.isComposing || event.keyCode === 229) return;
        if (this.updateMode === "commit" && ["Enter", "Escape"].includes(event.key)) {
          if (event.key === "Escape") {
            if (this.hasPendingInput()) {
              event.preventDefault();
              this.cancelInput({ origin: "user", userAction: true });
            }
          } else {
            this.commitInput({ origin: "user", userAction: true });
            event.preventDefault();
          }
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          this.spinUp({
            origin: "user",
            userAction: true
          });
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          this.spinDown({
            origin: "user",
            userAction: true
          });
        }
      });

      this.disposables.addEventListener(this._input, "blur", () => {
        if (this.updateMode === "commit") {
          this.commitInput({ origin: "user", userAction: true });
          return;
        }
        this._setValue(this._value, {
          silent: true,
          origin: "system"
        });
      });

      this.disposables.addEventListener(this._input, "wheel", event => {
        if (!this.allowSpinOnMouseWheel) {
          return;
        }

        event.preventDefault();

        if (event.deltaY < 0) {
          this.spinUp({
            origin: "user",
            userAction: true
          });
        } else if (event.deltaY > 0) {
          this.spinDown({
            origin: "user",
            userAction: true
          });
        }
      });
    }

    return root;
  }

  _handleInput(event) {
    if (this.updateMode !== "commit") return super._handleInput(event);
    if (this.destroyed || this._destroying) return;
    if (this.disabled || this.isReadOnly()) return;
    const text = this._input.value;
    const previous = this._pendingInput;
    this._pendingInput = {
      text,
      invalid: this._input.validity?.badInput === true ||
        (text.trim() !== "" && parseNumberValue(text) == null)
    };
    ++this._inputRevision;
    this._notifyDraftChange(previous, { origin: "user", userAction: true });
  }

  hasPendingInput() {
    return this._pendingInput != null;
  }

  cancelInput(options = {}) {
    if (this.destroyed || this._destroying) return false;
    const mutation = normalizeMutationOptions(options);
    const previous = this._pendingInput;
    const pending = this.hasPendingInput();
    ++this._inputRevision;
    this._pendingInput = null;
    this._syncInput(this._value);
    if (pending) this.clearValidation({ silent: true });
    this._notifyDraftChange(previous, mutation);
    return pending;
  }

  commitInput(options = {}) {
    if (this._committingInput) return this._inputResult("superseded");
    this._committingInput = true;
    try {
      if (this.destroyed || this._destroying) return this._inputResult("destroyed");
      if (!this.hasPendingInput()) return this._inputResult("unchanged");
      if (this.disabled) return this._inputResult("disabled");
      if (this.isReadOnly()) return this._inputResult("readonly");
      if (this._pendingInput.invalid) {
        const revision = this._inputRevision;
        this.validate();
        return this._inputResult(this._inputInterruption(revision) ?? "invalid");
      }
      return this._writeCommittedNumber(this._pendingInput.text, options, ++this._inputRevision);
    } finally {
      this._committingInput = false;
    }
  }

  validate(context = {}) {
    if (this.updateMode !== "commit") return super.validate(context);
    if (this._validatingInput) return { source: this, ok: false, errors: [], value: this._getValidationValue() };
    this._validatingInput = true;
    try {
      this._assertMutable("validate");
      const revision = this._inputRevision;
      const value = this._getValidationValue();
      const errors = [];
      if (this._pendingInput?.invalid) {
        errors.push({ control: this, path: this.name ?? this.id, severity: "error",
          message: "Enter a valid number", code: "numberInput" });
      } else {
        for (const validator of this.validators) {
          if (typeof validator !== "function") throw new TypeError("Validator must be a function.");
          const validation = validator(value, { ...context, control: this, value });
          if (this._inputInterruption(revision)) return { source: this, ok: false, errors, value };
          const error = normalizeValidationResult(validation, this);
          if (error) errors.push(error);
        }
      }
      this._validationErrors = errors;
      this._applyValidationState(errors);
      this._renderValidationMessage();
      const result = { source: this, ok: !errors.some(error => error.severity === "error"), errors, value };
      this.events.emit("validate", result);
      if (this._inputInterruption(revision)) return { ...result, ok: false };
      return result;
    } finally {
      this._validatingInput = false;
    }
  }

  destroy() {
    ++this._inputRevision;
    this._pendingInput = null;
    super.destroy();
  }

  _notifyDraftChange(previous, options = {}) {
    const pending = this._pendingInput;
    if (!previous && !pending) return;
    if (previous && pending && previous.text === pending.text && previous.invalid === pending.invalid) return;
    const mutation = normalizeMutationOptions(options);
    if (mutation.silent || this.destroyed || this._destroying) return;
    this.events.emit("draftChange", { source: this, text: pending?.text ?? this._value,
      badInput: pending?.invalid === true, pending: pending != null,
      origin: mutation.origin, userAction: mutation.userAction });
  }

  _inputResult(status, changed = false) {
    return { ok: status === "committed" || status === "unchanged", changed, status, value: this._getValue() };
  }

  _inputInterruption(revision) {
    if (this.destroyed || this._destroying) return "destroyed";
    if (revision !== this._inputRevision) return "superseded";
    return null;
  }

  // Commit-mode-only pipeline: nested API writes must supersede a pending edit.
  // The existing EditorControl/live mutation semantics remain unchanged.
  _writeCommittedNumber(value, options, revision) {
    const mutation = normalizeMutationOptions(options);
    const previous = this._pendingInput;
    const oldValue = this._value;
    const newValue = formatNumberValue(this._normalizeNumber(value));
    if (mutation.userAction && (this.disabled || this.isReadOnly())) {
      return this._inputResult(this.disabled ? "disabled" : "readonly");
    }
    if (Object.is(oldValue, newValue)) {
      this._pendingInput = null;
      this._syncInput(newValue);
      this.clearValidation({ silent: true });
      this._notifyDraftChange(previous, mutation);
      return this._inputResult(this._inputInterruption(revision) ?? "unchanged");
    }
    const wasDirty = this.isDirty();
    const before = { source: this, oldValue: this._valueToEventValue(oldValue),
      newValue: this._valueToEventValue(newValue), origin: mutation.origin,
      userAction: mutation.userAction, cancel: false };
    if (!mutation.silent) this.events.emit("beforeChange", before);
    let interrupted = this._inputInterruption(revision);
    if (interrupted) return this._inputResult(interrupted);
    if (before.cancel) return this._inputResult("vetoed");
    if (this.disabled || this.isReadOnly()) {
      // API hydration is permitted in a readonly/disabled control, just as in live mode.
      if (mutation.userAction || this.hasPendingInput()) {
        return this._inputResult(this.disabled ? "disabled" : "readonly");
      }
    }
    this._value = newValue;
    ++this._valueRevision;
    this._pendingInput = null;
    this._syncInput(newValue);
    this.clearValidation({ silent: true });
    const isDirty = this.isDirty();
    this._applyDirtyState();
    if (!mutation.silent) {
      const event = { source: this, oldValue: this._valueToEventValue(oldValue),
        newValue: this._valueToEventValue(newValue),
        origin: mutation.origin, userAction: mutation.userAction };
      this.events.emit("change", event);
      interrupted = this._inputInterruption(revision);
      if (interrupted) return this._inputResult(interrupted, true);
      const after = { ...event };
      delete after.type;
      this.events.emit("afterChange", after);
      interrupted = this._inputInterruption(revision);
      if (interrupted) return this._inputResult(interrupted, true);
      if (wasDirty !== isDirty) this.events.emit("dirtyChange", {
        source: this, oldValue: wasDirty, newValue: isDirty,
        origin: mutation.origin, userAction: mutation.userAction
      });
      interrupted = this._inputInterruption(revision);
      if (interrupted) return this._inputResult(interrupted, true);
    }
    this._notifyDraftChange(previous, mutation);
    return this._inputResult(this._inputInterruption(revision) ?? "committed", true);
  }

  spinUp(options = {}) {
    return this.spin(1, options);
  }

  spinDown(options = {}) {
    return this.spin(-1, options);
  }

  spin(direction = 1, options = {}) {
    this._assertMutable("spin");

    if (this.disabled || this.isReadOnly()) {
      return false;
    }

    const delta = (Number(direction) >= 0 ? 1 : -1) * Number(this.increment || 1);
    if (this.updateMode === "commit" && this._pendingInput?.invalid) return false;
    const current = parseNumberValue(this._pendingInput?.text ?? this._value) ?? this._getSpinStartValue(delta);
    if (this.updateMode === "commit") {
      const revision = ++this._inputRevision;
      return this._writeCommittedNumber(current + delta, options, revision).changed;
    }
    return this._setValue(current + delta, options);
  }

  _getValue() {
    return parseNumberValue(this._value);
  }

  [validationRevision]() {
    // A pending candidate can change without a committed numeric write.
    return this.updateMode === "commit"
      ? [super[validationRevision](), this._inputRevision]
      : super[validationRevision]();
  }

  _getValidationValue() {
    if (this.updateMode === "commit" && this._pendingInput && !this._pendingInput.invalid) {
      return parseNumberValue(this._normalizeNumber(this._pendingInput.text));
    }
    return this._getValue();
  }

  _setValue(nextValue, options = {}) {
    if (this.updateMode === "commit") {
      this._assertMutable("value.set");
      const mutation = normalizeMutationOptions(options);
      this._normalizeNumber(nextValue); // Configuration errors must not discard the current draft.
      const revision = ++this._inputRevision;
      const previous = this._pendingInput;
      this._pendingInput = null;
      this._syncInput(this._value);
      const result = this._writeCommittedNumber(nextValue, mutation, revision);
      if (!this._inputInterruption(revision)) this._notifyDraftChange(previous, mutation);
      return result.changed;
    }
    const preserveInputText = this._preserveInputText;
    this._preserveInputText = options.origin === "user" && options.userAction === true &&
      !this.disabled && !this.isReadOnly();
    try {
      return super._setValue(formatNumberValue(this._normalizeNumber(nextValue)), options);
    } finally {
      this._preserveInputText = preserveInputText;
    }
  }

  _syncInput(value) {
    if (this.updateMode === "commit") {
      if (this._pendingInput) return;
      // Native number exposes invalid partial input as empty text. Assign even
      // equal empty text to actually discard the browser's hidden badInput.
      if (this._input?.validity?.badInput) this._input.value = this._getDisplayValue(value);
    }
    // Keep intermediate decimal text ("1.", "1.0") during user input only.
    // API writes, blur and normalization that changes the number still synchronize.
    if (this._preserveInputText && this._input && this._input.value !== "" &&
        parseNumberValue(this._input.value) === parseNumberValue(value)) return;
    super._syncInput(value);
  }

  _valueToEventValue(value) {
    return parseNumberValue(value);
  }

  _syncStateToInput() {
    super._syncStateToInput();

    if (!this._input) {
      return;
    }

    if (this.min != null) {
      this._input.min = String(this.min);
    }

    if (this.max != null) {
      this._input.max = String(this.max);
    }

    if (this.step != null) {
      this._input.step = String(this.step);
    }
  }

  _normalizeNumber(value) {
    let parsed = parseNumberValue(value);

    if (parsed == null) {
      return "";
    }

    if (this.isInteger) {
      parsed = Math.trunc(parsed);
    }

    if (this.clamp) {
      parsed = clampNumber(parsed, this.min, this.max);
    }

    if (this.precision != null) {
      parsed = Number(parsed.toFixed(this.precision));
    }

    return parsed;
  }

  _getSpinStartValue(delta) {
    if (delta > 0 && this.min != null) {
      return Number(this.min) - delta;
    }

    if (delta < 0 && this.max != null) {
      return Number(this.max) - delta;
    }

    return 0;
  }
}

function formatNumberValue(value) {
  if (value == null || value === "") {
    return "";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }

  return String(value);
}

function parseNumberValue(value) {
  if (value == null || String(value).trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampNumber(value, min, max) {
  let nextValue = value;
  const minValue = min == null ? null : Number(min);
  const maxValue = max == null ? null : Number(max);

  if (Number.isFinite(minValue)) {
    nextValue = Math.max(minValue, nextValue);
  }

  if (Number.isFinite(maxValue)) {
    nextValue = Math.min(maxValue, nextValue);
  }

  return nextValue;
}

function normalizeOptionalInteger(value) {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}
