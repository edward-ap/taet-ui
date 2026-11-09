import { validationRevision } from "../core/validationRevision.js";

// Private adapter link: tables must not import the optional control catalog.
export const gridValidationSource = Symbol("taet.gridValidationSource");

// One attempt only. Preparation precedes this snapshot; the trusted
// beforeCellChange override follows it. No value reads, retries or rollback.
export function captureGridValidation(editor, isCurrent) {
  const errors = [], entries = [];
  let source = editor, target, getValue;
  const alive = () => isCurrent() && editor.destroyed !== true && !editor._destroying &&
    source?.destroyed !== true && !source?._destroying;
  const fail = (control, message) => {
    if (alive() && !errors.some(error => error.source === control)) {
      errors.push({ source: control, severity: "error", code: "validationRevision", message });
    }
  };
  const readInternal = entry => {
    try {
      const reader = entry.control[validationRevision];
      if (!alive()) return {};
      const value = reader?.call(entry.control);
      if (!alive()) return {};
      return { reader, token: Array.isArray(value) ? [...value] : value };
    } catch {
      fail(entry.control, "The built-in validation revision could not be read.");
      return {};
    }
  };
  const readPublic = entry => {
    try {
      const reader = entry.control.getValidationRevision;
      if (!alive()) return {};
      if (reader === undefined && (!entry.required || entry.internalToken !== undefined)) return { reader };
      if (typeof reader !== "function") {
        fail(entry.control, "Custom grid editors must implement getValidationRevision().");
        return {};
      }
      const token = reader.call(entry.control);
      if (!alive()) return {};
      if (!isToken(token)) {
        fail(entry.control, "getValidationRevision() must return a nonnegative safe integer, a nonnegative bigint, or a symbol.");
        return {};
      }
      const repeated = reader.call(entry.control);
      if (!alive()) return {};
      if (!isToken(repeated) || !Object.is(token, repeated)) {
        fail(entry.control, "getValidationRevision() must return the same valid token between writes.");
      }
      if (typeof token === typeof entry.publicToken &&
          (typeof token === "number" || typeof token === "bigint") && token < entry.publicToken) {
        fail(entry.control, "getValidationRevision() must not decrease.");
      }
      return { reader, token };
    } catch {
      fail(entry.control, "getValidationRevision() must not throw.");
      return {};
    }
  };
  const unchanged = () => {
    if (!alive()) return false;
    const nextTarget = editor[gridValidationSource];
    if (!alive() || nextTarget !== target) return false;
    const nextGetValue = editor.getValue;
    if (!alive() || nextGetValue !== getValue) return false;
    for (const entry of entries) {
      const valueApi = entry.control.value;
      if (!alive() || valueApi !== entry.valueApi) return false;
      const getter = valueApi?.get;
      if (!alive() || getter !== entry.getter) return false;
      const { reader, token } = readInternal(entry);
      if (!alive() || reader !== entry.internalReader || !sameStamp(token, entry.internalToken)) return false;
    }
    return true;
  };
  try {
    if (alive()) target = editor[gridValidationSource];
    if (alive()) source = target ?? editor;
    if (alive()) getValue = editor.getValue;
    if (alive()) entries.push({ control: editor, required: source === editor });
    if (alive() && source !== editor) entries.push({ control: source, required: true });
    // Capture all library stamps before any application revision reader runs.
    for (const entry of entries) {
      if (!alive()) break;
      entry.valueApi = entry.control.value;
      if (!alive()) break;
      entry.getter = entry.valueApi?.get;
      if (!alive()) break;
      const { reader, token } = readInternal(entry);
      entry.internalReader = reader;
      entry.internalToken = token;
    }
    for (const entry of entries) {
      if (!alive() || errors.length) break;
      const { reader, token } = readPublic(entry);
      entry.publicReader = reader;
      entry.publicToken = token;
    }
  } catch {
    fail(source, "The grid editor validation source could not be read.");
  }
  return {
    alive,
    current() {
      try {
        if (errors.length || !unchanged()) return false;
        let current = true;
        for (const entry of entries) {
          if (!alive()) return false;
          const { reader, token } = readPublic(entry);
          if (reader !== entry.publicReader || !Object.is(token, entry.publicToken)) current = false;
        }
        return !errors.length && unchanged() && current;
      } catch {
        fail(source, "The grid editor validation source could not be read.");
        return false;
      }
    },
    rejection() {
      return { reason: errors.length ? "validation-revision" : "validation-stale",
        validation: { source: editor, ok: false, errors: [...errors] } };
    }
  };
}

function isToken(value) {
  return typeof value === "symbol" || (typeof value === "bigint" && value >= 0n) ||
    (typeof value === "number" && Number.isSafeInteger(value) && value >= 0);
}
function sameStamp(left, right) {
  return Array.isArray(left) && Array.isArray(right)
    ? left.length === right.length && left.every((value, index) => Object.is(value, right[index]))
    : Object.is(left, right);
}
