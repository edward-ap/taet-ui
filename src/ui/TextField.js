import { EditorControl } from "./EditorControl.js";

export class TextField extends EditorControl {
  constructor(containerOrOptions = {}, maybeOptions) {
    const hasContainer =
      typeof containerOrOptions === "string" ||
      (typeof HTMLElement !== "undefined" && containerOrOptions instanceof HTMLElement);

    const options = hasContainer ? maybeOptions ?? {} : containerOrOptions ?? {};

    super(options);

    this.inputType = options.inputType ?? options.type ?? "text";
    this.isPassword =
      options.isPassword === true || options.password === true || this.inputType === "password";
    this.showRevealButton = this.isPassword && options.showRevealButton !== false;
    this.mask = typeof options.mask === "string" && options.mask !== "" ? options.mask : null;
    this.unmaskValue = options.unmaskValue === true;
    this.placeholderChar = options.placeholderChar ?? "_";
    if (options.maskMode != null && !["compact", "slots"].includes(options.maskMode)) {
      throw new TypeError('maskMode must be either "compact" or "slots".');
    }
    this.maskMode = options.maskMode ?? "compact";
    this._slotMask = null;
    this._slotFocused = false;
    this._slotRequiredError = null;
    if (this.maskMode === "slots") {
      if (this.createElement !== TextField.prototype.createElement) {
        throw new TypeError('maskMode "slots" requires the standard TextField/TextInput editor.');
      }
      if (!["text", "search", "tel", "url", "password"].includes(this.isPassword ? "password" : this.inputType)) {
        throw new TypeError('maskMode "slots" requires a selection-capable text input type.');
      }
      this._slotMask = compileSlotMask(this.mask, this.placeholderChar);
    }
    this.placeholder = options.placeholder ?? this._slotMask?.template ?? this.mask ?? "";
    this.maxLength = normalizeOptionalPositiveInteger(options.maxLength ?? options.maxlength);
    this.spellcheck = options.spellcheck;
    this.autocomplete = options.autocomplete ?? null;
    this._passwordVisible = false;
    this._labelElement = null;
    this._inputWrapper = null;
    this._revealButton = null;
    this._maskUndo = [];
    this._maskRedo = [];
    this._maskRevision = 0;
    this._maskBeforeInput = null;
    this._maskComposition = null;
    this._maskComposing = false;

    if (this.mask) {
      this._emptyValue = this._normalizeValue(
        Object.prototype.hasOwnProperty.call(options, "emptyValue") ? options.emptyValue : ""
      );
      this._value = this._normalizeValue(
        Object.prototype.hasOwnProperty.call(options, "value") ? options.value : this._emptyValue
      );
      this._cleanValue = this._cloneValue(this._getValue());
    }

    if (hasContainer) {
      this.mount(containerOrOptions);
    }
  }

  createElement() {
    const root = document.createElement("div");
    root.className = [
      "dui-control",
      "dui-text-field",
      this.showRevealButton ? "dui-text-field--with-button" : "",
      this.mask ? "dui-text-field--masked" : "",
      this.css
    ]
      .filter(Boolean)
      .join(" ");
    root.dataset.duiControlId = this.id;

    const label = document.createElement("label");
    label.className = "dui-text-field__label";
    label.textContent = this.label;

    const input = document.createElement("input");
    input.className = "dui-text-field__input";
    input.type = this._getInputType();
    input.placeholder = this.placeholder;
    input.value = this._getDisplayValue(this._value);
    input.disabled = this.disabled;
    input.readOnly = this.isReadOnly();
    input.required = this.isRequired();
    input.dataset.duiFocusTarget = "true";

    if (this.maxLength != null && !this.mask) {
      input.maxLength = this.maxLength;
    }

    if (this.spellcheck != null) {
      input.spellcheck = this.spellcheck === true;
    }

    if (this.autocomplete != null) {
      input.autocomplete = this.autocomplete;
    }

    const message = document.createElement("div");
    message.className = "dui-text-field__message";
    message.setAttribute("role", "tooltip");
    message.hidden = true;

    if (this.showRevealButton) {
      const wrapper = document.createElement("span");
      wrapper.className = "dui-text-field__group";

      const button = document.createElement("button");
      button.className = "dui-text-field__reveal";
      button.type = "button";
      button.tabIndex = -1;
      button.setAttribute("aria-label", "Show password");
      button.title = "Show password";

      wrapper.append(input, button);
      root.append(label, wrapper, message);
      this._inputWrapper = wrapper;
      this._revealButton = button;
      this._renderRevealButton();
    } else {
      root.append(label, input, message);
    }

    this._labelElement = label;
    this._input = input;
    this._message = message;

    this.disposables.addEventListener(input, "input", event => this._handleInput(event));
    if (this._hasMaskEditor()) {
      this.disposables.addEventListener(input, "beforeinput", event => this._beforeMaskInput(event));
      this.disposables.addEventListener(input, "keydown", event => this._maskKeyDown(event));
      this.disposables.addEventListener(input, "compositionstart", () => {
        this._maskComposition = this._maskSnapshot();
        this._maskComposing = true;
        this._maskBeforeInput = null;
      });
      this.disposables.addEventListener(input, "compositionend", () => this._endMaskComposition());
      this.disposables.addEventListener(input, "blur", () => {
        this._endMaskComposition();
        if (this._slotMask && !this.destroyed) {
          this._slotFocused = false;
          this._syncInput(this._value);
        }
      });
      if (this._slotMask) this.disposables.addEventListener(input, "focus", () => {
        this._slotFocused = true;
        this._syncInput(this._value);
        if (this._value === "") {
          const first = this._slotMask.slots[0].position;
          input.setSelectionRange(first, first);
        }
      });
    }


    if (this._revealButton) {
      this.disposables.addEventListener(this._revealButton, "click", event => {
        event.preventDefault();
        this.togglePasswordVisible(undefined, {
          origin: "user",
          userAction: true
        });
      });
    }

    return root;
  }

  _handleInput(event = {}) {
    if (this.destroyed || this._destroying || !this._input) return;
    if (!this._hasMaskEditor()) {
      this._setValue(this._getValueFromInput(this._input.value), {
        origin: "user", userAction: true
      });
      return;
    }
    if (event.inputType === "historyUndo" || event.inputType === "historyRedo") {
      this._syncInput(this._value);
      this._maskBeforeInput = null;
      this._moveMaskHistory(event.inputType === "historyRedo");
      return;
    }
    if (this._maskComposing || event.isComposing) {
      if (!this._maskComposition) {
        // Some input producers omit compositionstart. The DOM already contains
        // the edit; recover the baseline from the accepted model, and infer its
        // changed range rather than treating the new DOM as the old value.
        const display = this._getNativeDisplayValue(this._value);
        const difference = maskedDifference(display, this._input.value);
        this._maskComposition = { ...this._maskSnapshot(), display,
          start: difference?.start ?? Math.min(this._input.selectionStart, display.length),
          end: difference?.end ?? Math.min(this._input.selectionEnd, display.length),
          direction: "none" };
      }
      this._maskComposing = true;
      // Keep the existing live value/events contract without disturbing the IME.
      const before = this._maskComposition;
      const difference = this._maskDifference(before, this._input.value);
      const edit = difference && this._editMaskedValue(before.display,
        difference.start, difference.end, difference.text, "", false);
      const revision = this._maskRevision;
      super._setValue(edit ? this._getValueFromInput(edit.display) : before.value, {
        origin: "user", userAction: true
      });
      if (!this.destroyed && !this._destroying && revision !== this._maskRevision) {
        this._syncInput(this._value);
      }
      return;
    }
    const before = this._maskBeforeInput ?? {
      ...this._maskSnapshot(), display: this._getNativeDisplayValue(this._value), explicitSelection: false
    };
    this._maskBeforeInput = null;
    const edit = this._maskDifference(before, this._input.value);
    if (!edit) return;
    if (!before.explicitSelection) {
      before.start = edit.start;
      before.end = edit.end;
    }
    const deletion = (event.inputType ?? "").startsWith("delete");
    this._applyMaskEdit(before,
      before.explicitSelection && deletion ? before.start : edit.start,
      before.explicitSelection && deletion ? before.end : edit.end, edit.text,
      event.inputType ?? "", before.explicitSelection && deletion);
  }

  _maskDifference(before, after) {
    if (this._slotMask && before.explicitSelection && before.display !== after) {
      const prefix = before.display.slice(0, before.start);
      const suffix = before.display.slice(before.end);
      if (after.length >= prefix.length + suffix.length && after.startsWith(prefix) && after.endsWith(suffix)) {
        return { start: before.start, end: before.end,
          text: after.slice(prefix.length, after.length - suffix.length) };
      }
    }
    return maskedDifference(before.display, after);
  }

  _hasMaskEditor() {
    return !!this.mask && !!this._input &&
      typeof this._input.selectionStart === "number";
  }

  _maskSnapshot() {
    const input = this._input;
    return { value: this._value, display: input.value,
      start: input.selectionStart, end: input.selectionEnd,
      direction: input.selectionDirection ?? "none", explicitSelection: true };
  }

  _restoreMaskSelection(snapshot) {
    if (!this.destroyed && this._hasMaskEditor()) {
      this._input.setSelectionRange(snapshot.start, snapshot.end, snapshot.direction);
    }
  }

  _beforeMaskInput(event) {
    if (event.defaultPrevented || !this._hasMaskEditor() || this.destroyed) return;
    if (this._maskComposing || event.isComposing) return;
    const before = this._maskSnapshot();
    this._maskBeforeInput = before;
    const type = event.inputType ?? "";
    if (type === "historyUndo" || type === "historyRedo") {
      if (event.cancelable) {
        event.preventDefault();
        this._maskBeforeInput = null;
        this._moveMaskHistory(type === "historyRedo");
      }
      return;
    }
    const deletion = type.startsWith("delete");
    const text = event.data ?? event.dataTransfer?.getData("text/plain");
    if (!event.cancelable || (!deletion && (!type.startsWith("insert") || text == null))) return;
    event.preventDefault();
    this._maskBeforeInput = null;
    this._applyMaskEdit(before, before.start, before.end, deletion ? "" : text, type, true);
  }

  _maskKeyDown(event) {
    if (event.defaultPrevented || event.isComposing || event.keyCode === 229 ||
        this._maskComposing || !this._hasMaskEditor() || event.altKey) return;
    const key = event.key.toLowerCase();
    if (!(event.ctrlKey || event.metaKey) || !["z", "y"].includes(key)) return;
    event.preventDefault();
    this._moveMaskHistory(key === "y" || event.shiftKey);
  }

  _applyMaskEdit(before, start, end, text, type, directional) {
    if (this.disabled || this.isReadOnly()) {
      this._syncInput(this._value);
      this._restoreMaskSelection(before);
      return;
    }
    const edit = this._editMaskedValue(before.display, start, end, text, type, directional);
    if (!edit) {
      this._syncInput(this._value);
      this._restoreMaskSelection(before);
      return;
    }
    this._commitMaskEdit(before, this._getValueFromInput(edit.display),
      { start: edit.caret, end: edit.caret, direction: "none" });
  }

  _editMaskedValue(display, start, end, text, type, directional) {
    return this._slotMask
      ? editSlotMask(display, this._slotMask, start, end, text, type, directional)
      : editMaskedValue(display, this.mask, start, end, text, type, directional);
  }

  _commitMaskEdit(before, value, selection, record = true) {
    const revision = this._maskRevision;
    const changed = super._setValue(value, { origin: "user", userAction: true });
    if (this.destroyed || this._destroying) return false;
    if (revision !== this._maskRevision) {
      // A nested API write owns history/selection. A veto may have restored the
      // old DOM snapshot in EditorControl; keep it coherent with the live model.
      this._syncInput(this._value);
      return false;
    }
    const accepted = Object.is(this._value, this._normalizeValue(value));
    this._syncInput(this._value);
    this._restoreMaskSelection(accepted ? selection : before);
    if (accepted && record && !Object.is(before.value, this._value)) {
      this._maskUndo.push({ before, after: this._maskSnapshot() });
      if (this._maskUndo.length > 100) this._maskUndo.shift();
      this._maskRedo.length = 0;
    }
    return accepted && (changed || Object.is(before.value, value));
  }

  _moveMaskHistory(redo) {
    if (this.disabled || this.isReadOnly() || !this._hasMaskEditor()) return;
    const source = redo ? this._maskRedo : this._maskUndo;
    const target = redo ? this._maskUndo : this._maskRedo;
    const transaction = source[source.length - 1];
    if (!transaction) return;
    const snapshot = redo ? transaction.after : transaction.before;
    const revision = this._maskRevision;
    if (this._commitMaskEdit(this._maskSnapshot(), snapshot.value, snapshot, false) &&
        revision === this._maskRevision) {
      source.pop();
      target.push(transaction);
    }
  }

  _endMaskComposition() {
    if (!this._maskComposing || this.destroyed || !this._input) return;
    const before = this._maskComposition;
    const input = this._input;
    const caret = formatMaskedValue(input.value.slice(0, input.selectionStart), this.mask).length;
    const difference = this._maskDifference(before, input.value);
    const edit = difference && this._editMaskedValue(before.display,
      difference.start, difference.end, difference.text, "", false);
    const value = edit ? this._getValueFromInput(edit.display) : before.value;
    this._maskComposing = false;
    this._maskComposition = null;
    this._maskBeforeInput = null;
    this._commitMaskEdit(before, value,
      edit ? { start: this._slotMask ? edit.caret : caret,
        end: this._slotMask ? edit.caret : caret, direction: "none" } : before);
  }

  _setValue(value, options = {}) {
    if (!this.mask) return super._setValue(value, options);
    const changed = super._setValue(value, options);
    if (!this.destroyed && (changed || Object.is(this._value, this._normalizeValue(value))) &&
        !((this.disabled || this.isReadOnly()) && options.userAction)) {
      // Explicit loads, even silent/same-value loads, start a new editing session.
      this._maskRevision = (this._maskRevision ?? 0) + 1;
      this._maskUndo = [];
      this._maskRedo = [];
      this._maskBeforeInput = null;
      this._maskComposing = false;
      this._maskComposition = null;
      this._syncInput(this._value);
    }
    return changed;
  }

  destroy() {
    super.destroy();
    this._maskUndo = [];
    this._maskRedo = [];
    this._maskBeforeInput = null;
    this._maskComposition = null;
    this._maskComposing = false;
    this._slotFocused = false;
    this._slotRequiredError = null;
    this._labelElement = null;
    this._inputWrapper = null;
    this._revealButton = null;
  }

  enable() {
    super.enable();
    this._syncStateToInput();
    return this;
  }

  disable() {
    super.disable();
    this._syncStateToInput();
    return this;
  }

  setPasswordVisible(visible, options = {}) {
    this._assertMutable("setPasswordVisible");

    if (!this.isPassword) {
      return false;
    }

    const nextValue = visible === true;

    if (this._passwordVisible === nextValue) {
      return false;
    }

    const oldValue = this._passwordVisible;
    this._passwordVisible = nextValue;

    if (this._input) {
      this._input.type = this._getInputType();
    }

    this._renderRevealButton();

    if (!options.silent) {
      this.events.emit("passwordVisibilityChange", {
        source: this,
        oldValue,
        newValue: this._passwordVisible,
        origin: options.origin ?? "api",
        userAction: options.userAction === true
      });
    }

    return true;
  }

  togglePasswordVisible(visible, options = {}) {
    const nextValue = visible == null ? !this._passwordVisible : visible === true;
    return this.setPasswordVisible(nextValue, options);
  }

  getDisplayValue() {
    return this._getDisplayValue(this._value);
  }

  getRawValue() {
    if (this._slotMask) return serializeSlotMask(readSlotMask(this._value, this._slotMask), this._slotMask, true);
    return this.mask ? unmaskValue(this._getDisplayValue(this._value)) : this._value;
  }

  _normalizeValue(value) {
    const text = value == null ? "" : String(value);

    if (!this.mask) {
      return text;
    }

    if (this._slotMask) {
      return serializeSlotMask(readSlotMask(text, this._slotMask), this._slotMask, this.unmaskValue);
    }
    const formatted = formatMaskedValue(text, this.mask);
    return this.unmaskValue ? unmaskValue(formatted) : formatted;
  }

  _getNativeDisplayValue(value) {
    const display = this._getDisplayValue(value);
    return display || (this._slotMask && this._slotFocused ? this._slotMask.template : "");
  }

  _syncInput(value) {
    if (this._maskComposing && this._hasMaskEditor()) {
      this._syncSlotValidity();
      return;
    }
    const displayValue = this._getNativeDisplayValue(value);

    if (this._input && this._input.value !== displayValue) {
      this._input.value = displayValue;
    }
    this._syncSlotValidity();
  }

  _syncSlotValidity() {
    const input = this._input;
    if (!this._slotMask || typeof input?.setCustomValidity !== "function") return;
    // A focused scaffold is presentation, not required data. Browser valueMissing
    // sees its literal text, so customError preserves checkValidity's result.
    // Never replace an application's custom error; disabled/readonly inputs hide
    // validationMessage, so defer ownership checks until the message is readable.
    if (input.willValidate === false) return;
    if (this._slotRequiredError && input.validationMessage !== this._slotRequiredError) this._slotRequiredError = null;
    const needsError = this.isRequired() && this._value === "" && input.value !== "";
    if (needsError && !input.validity.customError) {
      this._slotRequiredError = "Please fill out this field.";
      input.setCustomValidity(this._slotRequiredError);
    } else if (!needsError && this._slotRequiredError) {
      input.setCustomValidity("");
      this._slotRequiredError = null;
    }
  }

  _syncStateToInput() {
    if (!this._input) {
      return;
    }

    this._input.readOnly = this.isReadOnly();
    this._input.required = this.isRequired();
    this._syncSlotValidity();

    if (this._input.tagName === "INPUT") {
      this._input.type = this._getInputType();
    }

    if (this._revealButton) {
      this._revealButton.disabled = this.disabled || this.isReadOnly();
    }
  }

  _applyEditorLayout() {
    super._applyEditorLayout();
    this._syncAccessibleLabel();
  }

  _syncAccessibleLabel() {
    if (!this._labelElement || !this._input) return;
    this._labelElement.id = `${this._accessibilityId}-label`;
    this._input.id ||= `${this._accessibilityId}-input`;
    this._labelElement.htmlFor = this._input.id;
    this._applyAccessibleName(this._input, {
      labelledBy: String(this.label).trim() ? this._labelElement.id : ""
    });
  }

  _renderLabel() {
    this._syncAccessibleLabel();
    if (this._labelElement) {
      this._labelElement.textContent = this.label;
    }
  }

  _getInputType() {
    if (this.isPassword) {
      return this._passwordVisible ? "text" : "password";
    }

    return this.inputType;
  }

  _getValueFromInput(displayValue) {
    if (this._slotMask) return this._normalizeValue(displayValue);
    if (!this.mask) {
      return displayValue;
    }

    const formatted = formatMaskedValue(displayValue, this.mask);
    return this.unmaskValue ? unmaskValue(formatted) : formatted;
  }

  _getDisplayValue(value) {
    if (this._slotMask) return serializeSlotMask(readSlotMask(value, this._slotMask), this._slotMask);
    if (!this.mask) {
      return value == null ? "" : String(value);
    }

    return formatMaskedValue(value, this.mask);
  }

  _renderRevealButton() {
    if (!this._revealButton) {
      return;
    }

    this._revealButton.classList.toggle("dui-text-field__reveal--active", this._passwordVisible);
    this._revealButton.setAttribute("aria-pressed", this._passwordVisible ? "true" : "false");
    this._revealButton.setAttribute("aria-label", this._passwordVisible ? "Hide password" : "Show password");
    this._revealButton.title = this._passwordVisible ? "Hide password" : "Show password";
  }
}

function normalizeOptionalPositiveInteger(value) {
  if (value == null || value === "") {
    return null;
  }

  const normalized = Number(value);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : null;
}

function formatMaskedValue(value, mask) {
  const input = String(value ?? "");
  let inputIndex = 0;
  let result = "";
  let acceptedTokens = 0;

  for (const maskChar of mask) {
    const token = maskTokens[maskChar];

    if (!token) {
      if (inputIndex < input.length || result !== "") {
        if (input[inputIndex] === maskChar) {
          inputIndex += 1;
        }

        result += maskChar;
      }

      continue;
    }

    let accepted = false;

    while (inputIndex < input.length) {
      const nextChar = input[inputIndex];
      inputIndex += 1;

      if (token.test(nextChar)) {
        result += nextChar;
        acceptedTokens++;
        accepted = true;
        break;
      }
    }

    if (!accepted) {
      break;
    }
  }

  return acceptedTokens ? result : "";
}

function unmaskValue(value) {
  return String(value ?? "").replace(/[^A-Za-z0-9]/g, "");
}

const maskTokens = {
  "0": /[0-9]/,
  "9": /[0-9]/,
  A: /[A-Za-z]/,
  a: /[A-Za-z]/,
  "*": /[A-Za-z0-9]/
};

// The public mask value is a compact prefix, not a sparse slot array. Reject
// edits that would lose an untouched suffix when token kinds cannot compact.
function editMaskedValue(display, mask, start, end, text, type, directional) {
  const slots = [];
  for (let position = 0; position < mask.length; position++) {
    if (maskTokens[mask[position]]) slots.push({ position, token: maskTokens[mask[position]] });
  }
  const chars = slots.filter(slot => slot.position < display.length)
    .map(slot => display[slot.position]);
  let from = slots.filter(slot => slot.position < start).length;
  let to = slots.filter(slot => slot.position < end).length;
  from = Math.min(from, chars.length);
  to = Math.min(to, chars.length);
  if (directional && start === end && type.startsWith("delete")) {
    if (type.includes("Backward")) from = Math.max(0, from - 1);
    else to = Math.min(chars.length, to + 1);
    if (type === "deleteWordBackward" || type === "deleteSoftLineBackward" ||
        type === "deleteHardLineBackward") from = 0;
    if (type === "deleteWordForward" || type === "deleteSoftLineForward" ||
        type === "deleteHardLineForward") to = chars.length;
  }
  const inserted = [];
  let inputIndex = 0;
  let position = from === 0 ? 0 : slots[from - 1].position + 1;
  while (position < mask.length && inputIndex < text.length) {
    const token = maskTokens[mask[position]];
    if (!token) {
      if (text[inputIndex] === mask[position]) inputIndex++;
    } else {
      while (inputIndex < text.length) {
        const char = text[inputIndex++];
        if (token.test(char)) {
          inserted.push(char);
          break;
        }
      }
    }
    position++;
  }
  if (text !== "" && inserted.length === 0) return null;
  const prefix = chars.slice(0, from);
  const suffix = chars.slice(to);
  const combined = [...prefix, ...inserted, ...suffix];
  // Neither capacity overflow nor an incompatible token transition may
  // silently discard an untouched suffix. Extra supplied text may still be
  // truncated when replacing the whole remaining value (as in API formatting).
  if (suffix.length && combined.length > slots.length) return null;
  for (let i = 0; i < Math.min(combined.length, slots.length); i++) {
    if (!slots[i].token.test(combined[i])) return null;
  }
  const kept = combined.slice(0, slots.length);
  let result = "";
  let index = 0;
  if (kept.length) {
    for (const char of mask) {
      if (maskTokens[char]) {
        if (index === kept.length) break;
        result += kept[index++];
      } else result += char;
    }
  }
  const next = Math.min(from + inserted.length, kept.length);
  let caret = next === 0 ? (kept.length ? slots[0].position : 0) :
    Math.min(slots[next]?.position ?? result.length, result.length);
  if (text === "") caret = Math.min(start, caret);
  return { display: result, caret };
}

function maskedDifference(before, after) {
  if (before === after) return null;
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let oldEnd = before.length, newEnd = after.length;
  while (oldEnd > start && newEnd > start && before[oldEnd - 1] === after[newEnd - 1]) {
    oldEnd--; newEnd--;
  }
  return { start, end: oldEnd, text: after.slice(start, newEnd) };
}


// Slot mode has a lossless string representation. Keep its parser and editor
// separate from the default compact formatter, including the compact suffix guard.
function compileSlotMask(mask, placeholder) {
  if (!mask) throw new TypeError('maskMode "slots" requires a nonempty mask.');
  if (typeof placeholder !== "string" || !/^[!-~]$/.test(placeholder) || /[A-Za-z0-9]/.test(placeholder)) {
    throw new TypeError("placeholderChar must be one printable ASCII punctuation character in slot mode.");
  }
  const parts = [], slots = [];
  let position = 0, rawPosition = 0;
  for (const char of mask) {
    const token = maskTokens[char];
    if (!token && char === placeholder) throw new TypeError("placeholderChar must not occur in mask literals.");
    if (/[\r\n]/.test(char)) throw new TypeError("A slot mask cannot contain input line breaks.");
    const part = { char, token, position, rawPosition, index: token ? slots.length : -1 };
    parts.push(part);
    if (token) slots.push(part);
    position += char.length;
    if (token || /[A-Za-z0-9]/.test(char)) rawPosition += char.length;
  }
  if (!slots.length) throw new TypeError("A slot mask requires at least one editable token.");
  return { mask, placeholder, parts, slots, length: position, rawLength: rawPosition,
    template: parts.map(part => part.token ? placeholder : part.char).join("") };
}

function parseSlotMask(text, definition, raw) {
  if (text.length !== (raw ? definition.rawLength : definition.length)) return null;
  const values = [];
  for (const part of definition.parts) {
    const offset = raw ? part.rawPosition : part.position;
    if (part.token) {
      const char = text[offset];
      if (char === definition.placeholder) values.push(null);
      else if (part.token.test(char)) values.push(char);
      else return null;
    } else if ((!raw || /[A-Za-z0-9]/.test(part.char)) && text.slice(offset, offset + part.char.length) !== part.char) return null;
  }
  return values;
}

function readSlotMask(value, definition) {
  const text = String(value ?? "");
  if (!text) return definition.slots.map(() => null);
  const positional = parseSlotMask(text, definition, false) ?? parseSlotMask(text, definition, true);
  if (positional) return positional;
  // A supplied hole is positional data, never punctuation to silently strip.
  if (text.includes(definition.placeholder)) throw new TypeError("Invalid positional slot mask value.");
  const compact = formatMaskedValue(text, definition.mask);
  return definition.slots.map(slot => slot.position < compact.length ? compact[slot.position] : null);
}

function serializeSlotMask(values, definition, raw = false) {
  if (!values.some(value => value != null)) return "";
  return definition.parts.map(part => part.token ? values[part.index] ?? definition.placeholder
    : !raw || /[A-Za-z0-9]/.test(part.char) ? part.char : "").join("");
}

function editSlotMask(display, definition, start, end, text, type, directional) {
  const { slots, placeholder } = definition;
  const values = readSlotMask(display, definition);
  let from = slots.filter(slot => slot.position < start).length;
  let to = slots.filter(slot => slot.position < end).length;
  if (directional && start === end && type.startsWith("delete")) {
    if (type.includes("Backward")) from = Math.max(0, from - 1);
    else to = Math.min(slots.length, to + 1);
    if (["deleteWordBackward", "deleteSoftLineBackward", "deleteHardLineBackward"].includes(type)) from = 0;
    if (["deleteWordForward", "deleteSoftLineForward", "deleteHardLineForward"].includes(type)) to = slots.length;
  }
  const limit = to > from ? to : slots.length;
  const inserted = [];
  let inputIndex = 0;
  // Whole canonical formatted/raw paste preserves alphanumeric literals too.
  const positional = from === 0 && text !== "" ?
    parseSlotMask(text, definition, false) ?? parseSlotMask(text, definition, true) : null;
  if (positional) {
    if (positional.length > limit) return null;
    inserted.push(...positional);
    inputIndex = text.length;
  } else if (text !== "") {
    const prefix = definition.mask.slice(0, slots[from]?.position ?? definition.length);
    if (from === 0 && prefix && text.startsWith(prefix)) inputIndex = prefix.length;
    let partIndex = definition.parts.indexOf(slots[from]);
    while (partIndex >= 0 && partIndex < definition.parts.length && inputIndex < text.length) {
      const part = definition.parts[partIndex++];
      if (!part.token) {
        if (text.slice(inputIndex, inputIndex + part.char.length) === part.char) inputIndex += part.char.length;
        continue;
      }
      if (part.index >= limit) break;
      while (inputIndex < text.length) {
        const char = text[inputIndex++];
        if (char === placeholder || part.token.test(char)) {
          inserted.push(char === placeholder ? null : char);
          break;
        }
      }
    }
    // Overflow is not an implicit destructive truncation in slot mode.
    if ([...text.slice(inputIndex)].some(char => /[A-Za-z0-9]/.test(char) || char === placeholder)) return null;
    if (!inserted.length) return null;
  }
  for (let index = from; index < to; index++) values[index] = null;
  for (let index = 0; index < inserted.length; index++) values[from + index] = inserted[index];
  const result = serializeSlotMask(values, definition);
  const next = from + inserted.length;
  let caret = slots[next]?.position ?? definition.length;
  if (text === "") caret = Math.min(start, slots[from]?.position ?? definition.length);
  return { display: result, caret };
}
