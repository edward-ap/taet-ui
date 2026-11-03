# Font comparison assets

These original variable upright TTF files are used by the optional font
comparison Lab. They are not imported by taet-ui.css and do not change Tæt UI's
runtime dependencies. Noto Sans is also bundled as the default font under src/ui/fonts. No external requests are made by the Lab.

- Noto Sans: Google Fonts ofl/notosans, normal variable weight/width, OFL 1.1.
- Roboto: Google Fonts ofl/roboto, normal variable weight/width, OFL 1.1.
- Segoe UI: referenced by local() only; no Microsoft font is redistributed.

Exact download URLs, retrieval date and SHA-256 hashes are in sources.json.
Original copyright/license notices accompany each font in *-OFL.txt. No glyphs or
font metadata were modified. Normal width is used; weights 400, 600, 700 are loaded
before controls are constructed. Italics and synthetic weights are not part of
this comparison. On systems without Segoe UI, the column explicitly reports a
fallback and should not be treated as a Segoe sample.

Open ../font-comparison.html through the Labs server (port 5173). All columns use
12px text, 18px line-height, 24px fields and 22px Grid rows. Theme toggling changes
all three columns together. This is visual comparison, not a performance benchmark.
