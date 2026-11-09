// Test-only adapters: control state, owner projection and saved state are deliberately separate.
export const editorCases = [
  { id: 'text', type: 'TextInput', factory: 'text', initial: 'a', next: 'b', replacement: 'c', text: 'b', options: {} },
  { id: 'number-live', type: 'NumberInput', factory: 'number', initial: 1, next: 2, replacement: 3, text: '2', options: {} },
  { id: 'number-commit', type: 'NumberInput', factory: 'number', initial: 1, next: 2, replacement: 3, text: '2', deferred: true, options: { updateMode: 'commit' } },
  { id: 'compact', type: 'TextInput', factory: 'text', initial: '12-34', next: '5', replacement: '67-89', text: '5', options: { mask: '00-00' } },
  { id: 'slots', type: 'TextInput', factory: 'text', initial: '12-34', next: '5_-__', replacement: '67-89', text: '5', options: { mask: '00-00', maskMode: 'slots' } },
  { id: 'time', type: 'TimeInput', factory: 'time', initial: '09:45', next: '02:00', replacement: '18:30', text: '2', display: '2', options: { hourMode: '0-23' } }
];

export async function installInvariantFixture({ ownerKind, descriptor, validationReplacement = false }) {
  const ui = await import('/src/ui/all.js');
  const grid = await import('/src/ui/grid-api.js');
  const { DataStore } = await import('/src/core/DataStore.js');
  const h = window.contract = {
    ownerKind, descriptor, fieldEvents: [], ownerEvents: [], validations: [], writes: [], saves: [], rejections: [],
    store: { value: descriptor.initial }, actionResult: null
  };
  const options = { ...descriptor.options, name: 'value', value: descriptor.initial };
  const customTypes = descriptor.custom ? await createCustomTypes() : null;
  const createField = options => new (descriptor.custom ? customTypes[descriptor.custom] : ui[descriptor.type])(options);
  if (validationReplacement) options.validators = [value => value < 10 || 'Below ten'];
  const attachField = field => {
    h.field = field;
    for (const name of ['beforeChange', 'change', 'afterChange', 'dirtyChange']) field.events.on(name, e =>
      h.fieldEvents.push({ name, old: e.oldValue, value: e.newValue, origin: e.origin, userAction: e.userAction }));
    if (validationReplacement) {
      field.events.on('validate', () => field.value.set(99, { silent: true }));
      const validate = field.validate.bind(field);
      field.validate = context => {
        const result = validate(context);
        h.validations.push({ ok: result.ok, errors: result.errors.map(e => e.message), value: result.value });
        return result;
      };
    }
  };
  if (ownerKind === 'Form' || ownerKind === 'NestedForm' || ownerKind === 'Standalone') {
    attachField(createField(options));
    if (ownerKind === 'Standalone') { h.owner = h.field; h.field.mount('#root'); }
    else {
      h.inner = ownerKind === 'NestedForm' ? new ui.Form({ name: 'group' }).row(h.field) : null;
      h.owner = new ui.Form().row(h.inner ?? h.field).mount('#root');
      for (const name of ['beforeSubmit', 'validate', 'validationFail', 'submit', 'afterSubmit']) h.owner.events.on(name, () => h.ownerEvents.push(name));
      h.owner.events.on('submit', e => { h.saves.push(structuredClone(e.value)); h.store.value = e.value.value; });
    }
  } else {
    const factory = descriptor.custom ? grid.gridEditors.custom(context => createField({ ...options, value: context.value }))
      : grid.gridEditors[descriptor.factory](options);
    const editor = grid.createGridEditorFactory(context => {
      const editor = factory.createCellEditor(context); attachField(editor.control); h.editor = editor; return editor;
    }, { activation: factory.activation, filterType: factory.filterType });
    h.data = new DataStore();
    h.data.parse([{ id: 1, parentId: null, label: 'First', value: descriptor.initial },
      { id: 2, parentId: null, label: 'Second', value: descriptor.replacement }]);
    h.owner = new grid[ownerKind]('#root', { data: h.data, width: 480, height: 220, treeColumnId: 'label',
      columns: [{ id: 'label', readOnly: true }, { id: 'value', editor }] });
    h.data.events.on('change', e => h.writes.push(e.type));
    for (const name of ['beforeCellChange', 'cellChange', 'editCommit', 'editCancel', 'editReject']) h.owner.events.on(name, () => h.ownerEvents.push(name));
    h.owner.events.on('editReject', event => h.rejections.push({ reason: event.reason, errors: (event.validation?.errors ?? []).map(error => ({
      code: error.code, severity: error.severity, path: error.path, field: error.source === h.field
    })) }));
    h.owner.startEdit(1, 'value');
  }
  const actions = {
    save: () => h.ownerKind.includes('Form') ? h.owner.submit({ origin: 'user', userAction: true }) : h.owner.commitEdit({ origin: 'user', userAction: true }),
    validate: () => { const result = h.owner.validate(); return { ok: result.ok, errors: result.errors.map(e => e.message) }; },
    silent: () => h.field.value.set(descriptor.replacement, { silent: true, origin: 'import' }),
    equal: () => h.field.value.set(h.field.value.get()),
    destroy: () => h.owner.destroy(),
    validateDetailed: () => { const result = h.owner.validate(); return { ok: result.ok, errors: result.errors.map(e => ({ code: e.code, severity: e.severity, path: e.path, field: e.control === h.field })) }; },
    fieldValidate: () => { const result = h.field.validate(); return { ok: result.ok, value: result.value }; },
    revisionProbe: () => { const first = h.field.getValidationRevision(), second = h.field.getValidationRevision(); return { type: typeof first, stable: Object.is(first, second) }; }
  };
  const toolbar = document.createElement('div'); toolbar.id = 'contract-actions';
  for (const [name, action] of Object.entries(actions)) {
    const button = document.createElement('button'); button.textContent = name; button.dataset.action = name;
    // Fixture actions intentionally retain focus, so API/owner operations do not add an incidental blur commit.
    button.addEventListener('pointerdown', event => event.preventDefault());
    button.addEventListener('click', () => { h.actionResult = action(); }); toolbar.append(button);
  }
  document.body.append(toolbar);
  h.snapshot = () => ({ value: h.field.value.get(), dom: h.field.destroyed ? null : h.field.element.querySelector('input')?.value,
    pending: h.field.hasPendingInput?.() ?? false, dirty: h.field.isDirty(), fieldEvents: h.fieldEvents,
    ownerEvents: h.ownerEvents, validations: h.validations, writes: h.writes, saves: h.saves, rejections: h.rejections,
    stored: h.data ? h.data.get(1).value : h.store.value,
    projected: h.owner.destroyed ? null : h.data ? h.data.get(1).value : ownerKind === 'Standalone' ? h.field.value.get() : h.owner.value.get(),
    actionResult: h.actionResult, destroyed: h.owner.destroyed });
  h.cleanup = () => { h.owner.destroy(); h.data?.destroy(); toolbar.remove(); };
}


// Minimal external widget and two real Control adapters, used only by this matrix.
export const customEditorCases = [
  { id: 'widget-bridge', custom: 'WidgetBridge', factory: 'custom', initial: 'a', next: 'b', replacement: 'c', text: 'b', options: {} },
  { id: 'independent-widget', custom: 'IndependentWidget', factory: 'custom', initial: 'a', next: 'b', replacement: 'c', text: 'b', options: { tokenMode: 'number' } }
];

async function createCustomTypes() {
  const { EditorControl } = await import('/src/ui/EditorControl.js');
  const { BaseControl } = await import('/src/core/BaseControl.js');
  class TinyTextWidget {
    constructor(value, onEdit) {
      this.input = document.createElement('input'); this.input.type = 'text';
      this.input.setAttribute('aria-label', 'External widget'); this.input.value = value;
      this.onInput = () => onEdit(this.input.value);
      this.input.addEventListener('input', this.onInput); this.destroyed = false;
    }
    setValue(value) { this.input.value = value; }
    destroy() { this.input.removeEventListener('input', this.onInput); this.input.remove(); this.destroyed = true; }
  }
  class WidgetBridge extends EditorControl {
    constructor(options) {
      super(options);
      if (options.constantPublicToken) this.getValidationRevision = () => 0;
    }
    createElement() {
      const root = document.createElement('div');
      this.widget = new TinyTextWidget(this.value.get(), text => this.value.set(text, { origin: 'user', userAction: true }));
      this._input = this.widget.input; root.append(this.widget.input); return root;
    }
    getFocusElement() { return this.widget?.input ?? null; }
    _normalizeValue(value) { return String(value ?? ''); }
    _syncInput(value) { this.widget?.setValue(value); }
    destroy() { const widget = this.widget; super.destroy(); widget?.destroy(); }
  }
  class IndependentWidget extends BaseControl {
    constructor(options) {
      super(options);
      this._accepted = String(options.value ?? ''); this._clean = this._accepted; this._draft = null;
      this.deferred = !!options.deferred; this.tokenMode = options.tokenMode ?? 'number';
      this._revision = this.tokenMode === 'bigint' ? 0n : this.tokenMode === 'symbol' ? Symbol('initial') : 0;
      this.commitCalls = 0; this.validationCalls = 0; this.checked = []; this.validators = options.validators ?? [];
      this.guardValidation = !!options.guardValidation;
      this.value = Object.freeze({ get: () => this._accepted, set: (value, mutation) => this._setValue(value, mutation),
        clear: mutation => this._setValue('', mutation), reset: mutation => this._setValue(this._clean, mutation) });
      this.draft = Object.freeze({ set: text => this._setDraft(text) });
      if (this.tokenMode === 'missing') this.getValidationRevision = undefined;
      if (this.tokenMode === 'noncallable') this.getValidationRevision = 1;
    }
    createElement() {
      const root = document.createElement('div');
      this.widget = new TinyTextWidget(this._accepted, text => this.deferred ? this._setDraft(text)
        : this.value.set(text, { origin: 'user', userAction: true }));
      root.append(this.widget.input); return root;
    }
    getFocusElement() { return this.widget?.input ?? null; }
    getValidationRevision() {
      if (this.tokenMode === 'throw') throw new Error('External revision reader failed');
      if (this.tokenMode === 'unstable') return Symbol('unstable read');
      if (this.tokenMode === 'invalid-type') return 'revision';
      if (this.tokenMode === 'invalid-number') return NaN;
      if (this.tokenMode === 'invalid-bigint') return -1n;
      return this._revision;
    }
    _bump() { this._revision = this.tokenMode === 'symbol' ? Symbol('write') : this._revision + (typeof this._revision === 'bigint' ? 1n : 1); }
    _setDraft(text) {
      this._assertMutable('draft.set'); text = String(text);
      if (this._draft === text) return false;
      this._draft = text; this._bump(); this.widget?.setValue(text); return true;
    }
    _setValue(value, mutation = {}) {
      this._assertMutable('value.set'); value = String(value ?? '');
      const oldValue = this._accepted;
      if (Object.is(oldValue, value)) {
        if (this._draft !== null) { this._draft = null; this._bump(); }
        this.widget?.setValue(value); return false;
      }
      const event = { source: this, oldValue, newValue: value, origin: mutation.origin ?? 'api', userAction: !!mutation.userAction };
      const before = { ...event, cancel: false };
      if (!mutation.silent) this.events.emit('beforeChange', before);
      if (this.destroyed || before.cancel) return false;
      const wasDirty = this.isDirty();
      this._accepted = value; this._draft = null; this._bump(); this.widget?.setValue(value);
      if (!mutation.silent) {
        this.events.emit('change', event); if (this.destroyed) return true;
        this.events.emit('afterChange', { ...event }); if (this.destroyed) return true;
        if (wasDirty !== this.isDirty()) this.events.emit('dirtyChange', { ...event, oldValue: wasDirty, newValue: this.isDirty() });
      }
      return true;
    }
    isDirty() { return this._accepted !== this._clean; }
    hasPendingInput() { return this._draft !== null; }
    setValidators(validators) { this.validators = validators; return this; }
    commitInput(mutation) {
      ++this.commitCalls;
      if (!this.hasPendingInput()) return { ok: true, changed: false };
      const changed = this.value.set(this._draft, mutation);
      return { ok: !this.destroyed && !this.hasPendingInput(), changed };
    }
    validate() {
      this._assertMutable('validate'); ++this.validationCalls;
      const revision = this.guardValidation ? this.getValidationRevision() : null;
      const value = this._draft ?? this._accepted; this.checked.push(value);
      const errors = this.validators.map(check => check(value)).filter(result => result === false || typeof result === 'string')
        .map(message => ({ control: this, path: this.name, severity: 'error', message: String(message) }));
      const result = { source: this, ok: !errors.length, errors, value };
      this.events.emit('validate', result);
      return this.guardValidation && (this.destroyed || !Object.is(revision, this.getValidationRevision())) ? { ...result, ok: false } : result;
    }
    destroy() { const widget = this.widget; super.destroy(); widget?.destroy(); }
  }
  return { WidgetBridge, IndependentWidget };
}



// PropertyGrid has two real DOM paths: live inline controls and staged custom cells.
export async function installPropertyInvariantFixture({ mode, descriptor }) {
  const { PropertyGrid } = await import('/src/ui/PropertyGrid.js');
  const ui = await import('/src/ui/all.js');
  const grid = await import('/src/ui/grid-api.js');
  const customTypes = descriptor.custom ? await createCustomTypes() : null;
  const h = window.contract = { mode, fieldEvents: [], ownerEvents: [], writes: [], rejections: [], checked: [], store: { value: 'a' } };
  const factory = descriptor.custom ? grid.gridEditors.custom(context => new customTypes[descriptor.custom]({ ...descriptor.options, name: 'value', value: context.value }))
    : grid.gridEditors.text({ name: 'value' });
  const editor = grid.createGridEditorFactory(context => {
    h.editor = factory.createCellEditor(context); h.field = h.editor.control;
    for (const name of ['beforeChange', 'change', 'afterChange', 'dirtyChange']) h.field.events.on(name, event =>
      h.fieldEvents.push({ name, value: event.newValue, origin: event.origin }));
    return h.editor;
  }, { activation: factory.activation, filterType: factory.filterType });
  const source = value => [{ name: 'contract', title: 'Contract', properties: [{ name: 'value', title: 'Value',
    type: mode === 'inline' ? 'text' : 'custom', value, editor,
    set: next => { h.writes.push(next); h.store.value = next; } }] }];
  h.owner = new PropertyGrid({ source: source('a') }).mount('#root');
  h.owner.startEdit('value');
  h.property = h.owner.getPropertyControl('value').property;
  for (const name of ['beforePropertyChange', 'propertyChange', 'afterPropertyChange', 'editCancel', 'editReject']) {
    h.owner.events.on(name, () => h.ownerEvents.push(name));
  }
  h.owner.events.on('editReject', event => h.rejections.push({ reason: event.reason, oldValue: event.oldValue,
    newValue: event.newValue, name: event.name, property: event.property === h.property,
    errors: (event.validation?.errors ?? []).map(error => ({ code: error.code, severity: error.severity, path: error.path, field: error.source === h.field })) }));
  h.replaceOwnerRow = () => { h.oldField = h.field; h.oldProperty = h.property; h.owner.bind(source('r')); h.owner.startEdit('value'); h.property = h.owner.getPropertyControl('value').property; };
  h.snapshot = () => ({ value: h.field.value.get(), dom: h.field.destroyed ? null : h.field.element.querySelector('input')?.value,
    pending: h.field.hasPendingInput?.() ?? false, stored: h.store.value, propertyValue: h.property.value,
    fieldEvents: h.fieldEvents, ownerEvents: h.ownerEvents, writes: h.writes, rejections: h.rejections,
    checked: h.checked, destroyed: h.owner.destroyed });
  h.cleanup = () => h.owner.destroy();
}
