# Security

This pre-1.0 project does not currently offer a supported-version security policy. The development HTTP server is for trusted local development, not production hosting.

After GitHub publication, use the repository's private vulnerability reporting channel when enabled. Do not post credentials, personal data or exploit details in public issues. The publication checklist requires enabling that channel before advertising it as available.

Reports should identify the affected revision, component, reproducible trigger and impact. Use synthetic or anonymized datasets.

## Data and application-code boundaries

Built-in TextLayout, CodeBlock, list captions and default Grid cells display text
as text, not HTML. Imported JSON definitions are data; field identifiers including
`__proto__` remain own data properties. Regression cases cover these boundaries.
Custom renderers returning DOM Nodes, factories, validators, icon registrations
and service callbacks are trusted application code: Tæt UI does not sandbox them.
Do not construct such callbacks from imported strings or untrusted code.

Select/TreeGrid image URLs are assigned to image elements. They can cause network
requests; applications must decide which origins and image sources are acceptable.
Text escaping does not provide network isolation. Deploy an appropriate host origin,
navigation and content policy; the local development server is not that policy.

## Files and exported data

Specialized file parsers and preview pipelines are deferred extensions and are not included in this candidate.

CSV/TSV exporters preserve raw values by default. For spreadsheet-oriented output,
use `gridExporters.csv({ escapeFormulas: true })` (also available for TSV and the
generic delimited exporter). It prefixes formula-like string values and headers
with an apostrophe, including leading whitespace/control-character cases, while
preserving numeric values. This changes exported text and is deliberately opt-in.
It is not a guarantee for every spreadsheet application or subsequent re-export;
review the receiving application's import policy. Workbook descriptors retain raw
values and require the downstream writer to choose cell types safely.

The current hardening review is a scoped internal audit, not a security certification
or an exhaustive review of every renderer, host integration and input format.
