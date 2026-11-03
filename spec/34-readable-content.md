# Readable Content

Status: experimental implementation contract.

## TextLayout

`TextLayout` renders long, read-only content without accepting HTML. It is the
standard surface for explanations, notices, theory notes, and callouts.

Supported content is either a plain string or an array of blocks:

- `{ type: "heading", text, level?: 2 | 3 | 4 }`
- `{ type: "paragraph", text }`
- `{ type: "list", items, ordered?: boolean }`
- `{ type: "keyValue", key, value }`

All values are written through `textContent`. Rich HTML and Markdown execution
are deliberately outside this component.

Appearance options are `tone`, `background`, `bordered`, `spacing`, and `icon`.
The public mutation events are `contentChange` and `appearanceChange`.

