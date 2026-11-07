import { EventBus } from "./EventBus.js";

export class OverlayManager {
  constructor(options = {}) {
    this.baseZIndex = Number(options.baseZIndex ?? 1000);
    this.events = new EventBus();
    this._entries = [];
    this._root = null;
    this._listening = false;
    this._stackRevision = 0;
    this._pointerDown = event => this._handlePointerDown(event);
    this._keyDown = event => this._handleKeyDown(event);
    this._tabKeyDown = event => this._handleTabKeyDown(event);
    this._tabChecks = new Set();
  }

  getRoot() {
    if (!this._root) {
      this._root = document.createElement("div");
      this._root.className = "dui-overlay-root";
      this._root.dataset.duiOverlayRoot = "true";
      document.body.appendChild(this._root);
    }
    return this._root;
  }

  all() { return this._entries.map(entry => entry.overlay); }
  top() { return this._entries.at(-1)?.overlay ?? null; }
  has(overlay) { return this._entries.some(entry => entry.overlay === overlay); }

  open(overlay, options = {}) {
    const element = options.element ?? overlay?.element;
    if (!element) throw new TypeError("OverlayManager requires an overlay element.");
    this.close(overlay, { silent:true, restoreFocus:false });
    const entry = {
      overlay,
      element,
      anchor:options.anchor ?? null,
      modal:options.modal === true,
      closeOnOutsideClick:options.closeOnOutsideClick !== false,
      closeOnEscape:options.closeOnEscape !== false,
      restoreFocus:options.restoreFocus !== false,
      previousFocus:document.activeElement instanceof HTMLElement ? document.activeElement : null,
      requestClose:options.requestClose,
      containsTarget:typeof options.containsTarget === "function" ? options.containsTarget : null
    };
    if (entry.modal) {
      entry.backdrop = document.createElement("div");
      entry.backdrop.className = "dui-overlay-backdrop";
      this.getRoot().insertBefore(entry.backdrop, entry.element);
    }
    this._entries.push(entry);
    ++this._stackRevision;
    this._syncStack();
    this._startListening();
    if (!options.silent) this.events.emit("open", { source:this, overlay, modal:entry.modal });
    return entry;
  }

  close(overlay, options = {}) {
    const index = this._entries.findIndex(entry => entry.overlay === overlay);
    if (index < 0) return false;
    const [entry] = this._entries.splice(index, 1);
    const revision = ++this._stackRevision;
    entry.backdrop?.remove();
    this._syncStack();
    if (!this._entries.length) this._stopListening();
    if (options.restoreFocus !== false && entry.restoreFocus && entry.previousFocus?.isConnected) {
      queueMicrotask(() => {
        const modalIndex = this._entries.findLastIndex(item => item.modal);
        const permitted = modalIndex < 0 || this._entries.slice(modalIndex).some(item => item.element.contains(entry.previousFocus));
        if (revision === this._stackRevision && entry.previousFocus?.isConnected &&
            permitted && !entry.previousFocus.closest('[hidden], [inert]')) entry.previousFocus.focus({ preventScroll:true });
      });
    }
    if (!options.silent) this.events.emit("close", { source:this, overlay, modal:entry.modal });
    return true;
  }

  destroy() {
    ++this._stackRevision;
    for (const entry of [...this._entries]) this.close(entry.overlay, { silent:true, restoreFocus:false });
    this._stopListening();
    this._root?.remove();
    this._root = null;
    this.events.destroy();
  }

  _requestClose(entry, reason, nativeEvent) {
    if (typeof entry.requestClose === "function") {
      entry.requestClose({ reason, nativeEvent });
    } else {
      entry.overlay.close?.({ origin:"user", userAction:true, reason });
    }
  }

  _handlePointerDown(event) {
    const entry = this._entries.at(-1);
    if (!entry || entry.element.contains(event.target) || entry.anchor?.contains?.(event.target) || entry.containsTarget?.(event.target)) return;
    if (entry.closeOnOutsideClick) this._requestClose(entry, "outside-click", event);
  }

  _handleKeyDown(event) {
    const entry = this._entries.at(-1);
    if (!entry) return;
    if (event.key === "Tab" && !event.isComposing && event.keyCode !== 229) this._scheduleTabContainment(event.shiftKey);
    if (event.key === "Escape" && !event.isComposing && !event.defaultPrevented && entry.closeOnEscape) {
      event.preventDefault();
      this._requestClose(entry, "escape", event);
      return;
    }
  }

  _scheduleTabContainment(shiftKey) {
    const modal = this._entries.findLast(item => item.modal);
    if (!modal) return;
    // Editors may stop propagation and move focus outside the modal, or blur
    // to BODY. Check after dispatch/default actions, not in a microtask that
    // could run before the target's native event handlers.
    const timer = setTimeout(() => {
      this._tabChecks.delete(timer);
      // A child popup may close during commit. Keep checking the same modal,
      // but never steal focus after replacement, nesting, or close/reopen.
      if (this._entries.findLast(item => item.modal) !== modal || !modal.element.isConnected ||
          modal.element.closest('[hidden], [inert]')) return;
      const index = this._entries.indexOf(modal);
      if (index < 0) return;
      const roots = this._entries.slice(index).map(item => item.element);
      if (roots.some(root => root.contains(document.activeElement))) return;
      this._trapFocus({ shiftKey, preventDefault() {} }, modal.element, roots.slice(1));
    }, 0);
    this._tabChecks.add(timer);
  }

  _handleTabKeyDown(event) {
    // Window bubbling lets even document-level popup editors consume Tab first.
    if (event.key !== "Tab" || event.defaultPrevented || event.isComposing || event.keyCode === 229) return;
    const index = this._entries.findLastIndex(item => item.modal);
    if (index >= 0) this._trapFocus(event, this._entries[index].element, this._entries.slice(index + 1).map(item => item.element));
  }

  _trapFocus(event, element, additional = []) {
    const candidates = [...new Set([element, ...additional].flatMap(root => [...root.querySelectorAll(
      'a[href], area[href], button, input, select, textarea, iframe, object, embed, summary, audio[controls], video[controls], [tabindex], [contenteditable]'
    )]))].filter(item => (item.tabIndex >= 0 ||
      // Editable hosts are native Tab stops despite a default tabIndex of -1.
      // Nested editors inherit editability, but need an explicit tabindex.
      (!item.hasAttribute('tabindex') && item.isContentEditable && !item.parentElement?.isContentEditable)) &&
      !item.matches(':disabled') &&
      !item.closest('[hidden], [inert]') && item.getClientRects().length &&
      getComputedStyle(item).visibility !== 'hidden');
    // Positive tabindex precedes zero; equal priorities follow document order.
    candidates.sort((a, b) => {
      const priority = (a.tabIndex > 0 ? a.tabIndex : Infinity) - (b.tabIndex > 0 ? b.tabIndex : Infinity);
      if (priority) return priority;
      const position = a.compareDocumentPosition(b);
      return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1
        : position & Node.DOCUMENT_POSITION_PRECEDING ? 1 : 0;
    });
    const focusable = candidates.filter(item => {
      if (!item.matches('input[type="radio"]') || !item.name) return true;
      const group = candidates.filter(other => other.matches('input[type="radio"]') &&
        other.name === item.name && other.form === item.form && other.getRootNode() === item.getRootNode());
      // A radio group is one Tab stop. Preserve a directly focused member,
      // otherwise enter its checked member (or the directional endpoint).
      const representative = group.find(other => other === document.activeElement) ||
        group.find(other => other.checked) || (event.shiftKey ? group.at(-1) : group[0]);
      return item === representative;
    });
    if (!focusable.length) { event.preventDefault(); element.focus({ preventScroll:true }); return; }
    // Native Tab can skip buttons on macOS WebKit, even from an interior
    // control. Own every unconsumed step, not only the apparent boundaries.
    const current = focusable.indexOf(document.activeElement);
    const next = current < 0 ? (event.shiftKey ? focusable.length - 1 : 0)
      : (current + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
    event.preventDefault();
    focusable[next].focus();
  }

  _syncStack() {
    this._entries.forEach((entry, index) => {
      const zIndex = this.baseZIndex + index * 2;
      if (entry.backdrop) entry.backdrop.style.zIndex = String(zIndex);
      entry.element.style.zIndex = String(zIndex + 1);
    });
  }

  _startListening() {
    if (this._listening) return;
    document.addEventListener("pointerdown", this._pointerDown, true);
    document.addEventListener("keydown", this._keyDown, true);
    window.addEventListener("keydown", this._tabKeyDown);
    this._listening = true;
  }

  _stopListening() {
    for (const timer of this._tabChecks) clearTimeout(timer);
    this._tabChecks.clear();
    if (!this._listening || typeof document === "undefined") return;
    document.removeEventListener("pointerdown", this._pointerDown, true);
    document.removeEventListener("keydown", this._keyDown, true);
    window.removeEventListener("keydown", this._tabKeyDown);
    this._listening = false;
  }
}

export const overlayManager = new OverlayManager();
