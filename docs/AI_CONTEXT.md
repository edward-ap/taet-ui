# Tæt UI: start here

0.6.0-rc.4 is a dependency-free desktop/WebView preview.

1. Read [LLM_GUIDE](LLM_GUIDE.md), then one [AI_MAP](AI_MAP.md) row.
2. Read its exact public .d.ts and one recipe before guessing a method.
3. [TIERS](TIERS.md) is architecture; [STABLE_API](STABLE_API.md) is maturity.
4. To change existing UI read [MUTATIONS](MUTATIONS.md).

Use live controls. Form owns composed rows/columns before mount; general Panel
must be mounted before add/attach. One child has one owner. Form.remove and owned
child.destroy forget fields/values/slots. Duplicate keys fail before ownership/mount.
Fields use .value; collections mutate through DataStore. Silent still synchronizes
UI/models without semantic events. Options are not reactive property assignments.
Destroy the owner; release borrowed application services separately. Register
external cleanup as () => service.destroy(), not the Control object itself.

Portable apps use one JS profile with matching CSS/fonts/licenses. Never mix
source, bundles or separately built profiles in one document. Grid changes require explicit approval and candidate hash updates;
run regressions after table/shared changes. [Common table contract](GRID_COMMON_CONTRACT.md). Specialized extensions are absent:
[EXTENSIONS](EXTENSIONS.md). HostBridge/general JSON engine are not supplied.
Concrete existing JSON factories remain with components. Reports/proposals are not
shipped implementations. Current work: [ROADMAP](../ROADMAP.md), [checks](VERIFICATION.md).
