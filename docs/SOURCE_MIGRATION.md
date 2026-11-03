# Source lineage

This repository selects the reusable framework from the earlier local project.
The previous tree is an archive, not a runtime dependency or a second active source.
Continue development in this repository; do not maintain parallel copies of fixes.

provenance/source-snapshot.json preserves the immutable imported dirty/untracked
snapshot. Its original historical HEAD alone does not identify all imported bytes.
provenance/grid-candidate.json separately pins approved table changes. Never rewrite
the immutable import to make a changed candidate appear unchanged.

Foundation/components/advanced are public aliases over retained implementations,
not wrappers. Existing source paths and constructor identity are retained.
The ordinary controls and generic Chart/Gauge remain; specialized extensions listed
in EXTENSIONS.md are absent. No private application source/data is required.

Build/tests, lockfile, declarations, relevant examples and local font/notices are
included. Prior Git history, generated bundles, node_modules, local reports,
application profiles and caches are not source-release inputs.
