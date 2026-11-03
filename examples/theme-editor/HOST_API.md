# Theme Designer host API

The standalone example works with localStorage presets. The reusable ThemeDesigner
control uses instance-local memory unless a storage adapter is explicitly supplied;
see ../../spec/theme-designer.md. No parent application is
assumed. Open, Copy and Apply call a deliberately unconnected host stub and display
an error until an adapter is supplied. They never report simulated success.

After the editor is ready, the embedding app calls the editor window API:

```js
const disconnect = editorWindow.denseThemeEditor.connectHost({
  async getPresetDirectory({ signal }) {
    // Return an opaque directory identifier/handle, or null to cancel.
    return await app.getThemeFolder({ signal });
  },
  async openPresetExplorer({ directory, purpose, signal }) {
    // purpose: "open" | "copy". The host displays its Explorer.
    // Return null on cancel, or { name, definition } for the selected source.
    return await app.chooseTheme({ directory, purpose, signal });
  },
  async applyPreset({ preset, theme, signal }) {
    // preset = { name, definition }; theme is the complete generateTheme result,
    // including root tokens, contextual families and contrast diagnostics.
    // Resolve only after the host has actually applied the theme; reject on failure.
    await app.applyTheme({ preset, theme, signal });
  }
});
// On host teardown:
disconnect();
```

The adapter runs in the editor realm or is connected through a same-origin iframe.
A cross-origin parent or native WebView must supply its own RPC adapter; the editor
does not accept wildcard postMessage commands or infer filesystem paths. Pending
requests receive an AbortSignal when the editor closes. A null Explorer result is
cancellation; errors are displayed in the editor status area. Returned definitions
are normalized and validated, never treated as executable content.

New asks for a unique name and creates a locally stored working preset from the
current definition. Save confirms before replacing that local record. Delete
confirms and removes the local record; deleting a bundled editable preset stores
a local tombstone. Clear, Light Blue and Dark Blue remain immutable recovery bases.
Their Save/Delete buttons are disabled and mutations are also guarded in callbacks.
Open loads a host-selected source into the local working collection; Copy asks for
a new name. Neither operation writes to the host directory. Remote persistence is
intentionally not part of this first adapter: Save/Delete operate on localStorage.

Import and Export use a portable UTF-8 JSON envelope:

```json
{
  "format": "taet-ui-theme",
  "version": 1,
  "name": "Ocean",
  "definition": { "version": 2, "...": "normalized ThemeDefinition" }
}
```

The example definition is schematic; actual exported files contain all fields.
Import also accepts legacy bare ThemeDefinition JSON. Files are bounded to 24 KB;
the nested definition retains its 20 KB validation limit. Import asks for a unique
local name. Export includes source parameters and distribution, not local paths or
host identifiers; another Tæt UI application can regenerate its derived tokens.
Apply passes the current draft, including unsaved edits, as a cloned payload.

Implementation: preset-toolbar.js (presentation/dialogs/files), host-api.js (stub
and adapter), editor.js (local preset collection). No new core package API.


The Base Preset dropdown and Preset config group are removed. Open is the preset
selection entry point; the standalone stub still requires an adapter. The current
name appears centered between Delete and Apply in the toolbar. A Light/Dark Switch
lives at the right of the lower configuration row under Theme; it edits foundation
without replacing the base color or distribution.

`editorWindow.denseThemeEditor.getPresets()` returns a detached snapshot of the
available built-in and locally saved records, including `id`, `name`, `definition`
and recovery `readOnly` flags. The host Explorer may include these alongside files.
Opening a protected name selects its immutable canonical definition; it never
replaces that definition with host data. This preserves the recovery bases after
removing the dropdown.
