import { Button, CodeBlock, Panel, ReadonlyText, Toolbar } from "../../../src/ui/index.js";
import { LabelText, TextLayout } from "../../../src/ui/experimental.js";
import { apiRows, importsFor, liveExample } from "./pageHelpers.js";

export const labelTextPage = {
  id: "label-text", title: "LabelText", status: "experimental",
  description: "A lightweight plain-text caption that can be updated directly or recomputed from a function.",
  imports: importsFor(["Button", "Panel"], ["LabelText"]),
  paragraphs: ["LabelText displays text safely without interpreting HTML. For a field caption, prefer the editor's label option so the label and input remain associated. LabelText is useful for independent captions and counters.", "A function passed as text is evaluated at creation and refresh(); it is not a reactive subscription. Use setText(string) for direct updates. For announcements use ariaRole: status (polite) or alert (assertive), with optional ariaLive/ariaAtomic overrides. Existing role: status/alert is also recognized; label/text remain internal metadata."],
  examples: [liveExample("Dynamic caption", function createLabelTextExample({ container, log }) {
    let count = 0;
    const label = new LabelText({ name: "itemCaption", text: () => `Selected items: ${count}` });
    return new Panel(container, { name: "labelTextExample", css: "dui-docs-inline-display" }).add(label,
      new Button({ text: "Select another", onClick: () => { count++; label.refresh(); log.write(label.getText()); } }));
  }, "The button updates application state, then calls refresh() to recompute the caption.",
  ".dui-docs-inline-display { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }")],
  options: apiRows([["text", "string | () => string", "Caption or function evaluated during refresh."], ["css", "string", "Local presentation class."]]),
  methods: apiRows([["setText(text, options) / getText()", "LabelText / string", "Replace or read the caption."], ["refresh()", "void", "Reevaluate a function-backed text source."]]),
  events: apiRows([["textChange", "{ oldValue, newValue, origin }", "Emitted by setText unless silent; refresh does not emit textChange."]])
};

export const readonlyTextPage = {
  id: "readonly-text", title: "ReadonlyText", status: "stable",
  description: "Plain display text for results and summaries that users do not edit.",
  imports: importsFor(["Button", "Panel", "ReadonlyText"]),
  paragraphs: ["ReadonlyText inherits LabelText's text API and adds display styling. It is not an EditorControl and has no value model, validators or Form value key. Use TextInput with readOnly: true when a noneditable field must remain part of form.value.get()."],
  examples: [liveExample("Result summary", function createReadonlyTextExample({ container, log }) {
    const result = new ReadonlyText({ name: "resultSummary", text: "Export has not run.", ariaRole: "status" });
    return new Panel(container, { name: "readonlyTextExample", css: "dui-docs-inline-display" }).add(result,
      new Button({ text: "Show result", onClick: () => { result.setText("Export complete: 24 records."); log.write(result.getText()); } }));
  }, "Update displayed output with setText(). No editable field or hidden form value is created.",
  ".dui-docs-inline-display { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }")],
  options: apiRows([["text", "string | function", "Displayed text or a refreshable text source."]]),
  methods: apiRows([["setText(text, options) / getText()", "ReadonlyText / string", "Write or read displayed text."], ["refresh()", "void", "Recompute function-backed text."]]),
  events: apiRows([["textChange", "ChangeEvent", "Reports setText changes unless silent."]])
};

export const textLayoutPage = {
  id: "text-layout", title: "TextLayout", status: "experimental",
  description: "Style application text with headings, bold paragraphs, readable typography, callouts and glossaries.",
  keywords: ["text styles", "typography", "bold", "italic", "heading", "font size", "CSS", "explanation"],
  imports: importsFor(["Button", "Panel", "Toolbar"], ["TextLayout"]),
  paragraphs: ["TextLayout combines structured content with presentation. Define heading, paragraph, list, keyValue or definitionList blocks in JavaScript, then pass a local class through css and style it in your application stylesheet. These are display blocks, not editable Form fields.",
    "A heading block accepts level: 2, 3 or 4, producing h2, h3 or h4. The built-in compact theme deliberately gives headings the same font size; use scoped CSS to make heading levels visually larger. The title option is a separate component caption, not a semantic heading.",
    "Style .dui-text-layout__content for shared font size and line height, .dui-text-layout__heading for headings, and .dui-text-layout__paragraph for paragraph weight, color or italics. Always prefix these selectors with your own class so other TextLayout instances keep their styles. Copy both JavaScript and the corresponding CSS example; load the CSS after taet-ui.css.",
    "Tone supplies semantic colors and a default icon. background, bordered, spacing and icon can be configured independently. Theme color variables keep custom text readable in light and dark themes. Use one definitionList block for an aligned glossary.",
    "Formatting applies to whole blocks or TextLayout instances. Individual content blocks do not accept arbitrary css/style properties, and text is rendered literally: **bold** and <strong>bold</strong> are not parsed. For differently styled paragraphs, compose separate TextLayout controls as shown below. Inline rich-text formatting within one paragraph is not currently supported.",
    "ExamSoft also offers a 75–200% reading-size preference implemented with an application CSS variable. It is not a built-in TextLayout fontScale option. The adjustable-size example below packages that pattern in a small application-defined subclass, keeping style updates inside the control implementation and leaving toolbars at their normal size."],
  examples: [liveExample("Headings and readable application text", function createStyledTextExample({ container }) {
    const article = new TextLayout({ name: "readingGuide", css: "dui-docs-reading-guide", width: "100%", spacing: "comfortable", bordered: true, icon: false,
      content: [
        { type: "heading", level: 2, text: "Understanding the result" },
        { type: "paragraph", text: "Use a clear heading and comfortable line spacing for explanations, help articles and onboarding instructions." },
        { type: "heading", level: 3, text: "Why this approach works" },
        { type: "paragraph", text: "The content describes the document structure. A local CSS class controls font sizes, bold headings and spacing without changing other text blocks in the application." },
        { type: "list", items: ["Keep one idea in each paragraph.", "Use lists for a sequence of actions or related points."] },
        { type: "heading", level: 4, text: "Next step" },
        { type: "keyValue", label: "Action", value: "Review the details before continuing." }
      ] });
    return new Panel(container, { name: "styledTextExample", width: "100%" }).add(article);
  }, "A help article or answer explanation with 24 px, 18 px and 15 px bold headings, 15 px body text and a labeled action. level defines heading semantics; the CSS defines their visible sizes. The class affects only this TextLayout.",
  ".dui-docs-reading-guide .dui-text-layout__content { font-size: 15px; line-height: 1.65; gap: 10px; }\n.dui-docs-reading-guide .dui-text-layout__heading { font-weight: 700; line-height: 1.25; }\n.dui-docs-reading-guide h2.dui-text-layout__heading { font-size: 24px; }\n.dui-docs-reading-guide h3.dui-text-layout__heading { font-size: 18px; }\n.dui-docs-reading-guide h4.dui-text-layout__heading { font-size: 15px; }\n.dui-docs-reading-guide .dui-text-layout__key { color: var(--dui-color-info-border); font-weight: 700; }"),
  liveExample("Bold text, italic notes and color accents", function createTextEmphasisExample({ container }) {
    const important = new TextLayout({ name: "importantText", css: "dui-docs-bold-message", width: "100%", icon: false,
      text: "Save your changes before closing this document." });
    const note = new TextLayout({ name: "supportingNote", css: "dui-docs-italic-note", width: "100%", icon: false,
      text: "You can return to these settings later from the application menu." });
    const accent = new TextLayout({ name: "accentMessage", css: "dui-docs-accent-message", title: "Useful tip", width: "100%", tone: "info", background: true, bordered: true,
      text: "Use a local class for your text styles and semantic theme colors for emphasis." });
    return new Panel(container, { name: "textEmphasisExample", width: "100%" }).add(important, note, accent);
  }, "Three independent TextLayout instances: a large bold message, a muted italic note, and a colored callout with an uppercase caption. The class is set on each instance; no content or DOM mutation is required. Only the caption is transformed to uppercase, so the stored text remains unchanged.",
  ".dui-docs-bold-message .dui-text-layout__paragraph { font-size: 18px; font-weight: 700; line-height: 1.4; }\n.dui-docs-italic-note .dui-text-layout__paragraph { color: var(--dui-color-muted); font-style: italic; line-height: 1.6; }\n.dui-docs-accent-message .dui-text-layout__title { color: var(--dui-color-text); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }\n.dui-docs-accent-message .dui-text-layout__paragraph { line-height: 1.6; }"),
  liveExample("Adjustable reading size · 75–200%", function createReadingSizeExample({ container, log }) {
    // Application-defined adapter; ScaledTextLayout is not a Tæt UI export.
    class ScaledTextLayout extends TextLayout {
      constructor(options) {
        super(options);
        this.textScale = 100;
      }

      createElement() {
        const root = super.createElement();
        root.style.setProperty("--dui-example-text-scale", String(this.textScale / 100));
        return root;
      }

      setTextScale(percent) {
        this._assertMutable("setTextScale");
        if (!Number.isFinite(percent)) throw new TypeError("Text scale must be a finite number.");
        this.textScale = Math.min(200, Math.max(75, percent));
        this.element?.style.setProperty("--dui-example-text-scale", String(this.textScale / 100));
        return this;
      }
    }

    const text = new ScaledTextLayout({ name: "adjustableReadingText", css: "dui-docs-scaled-text", width: "100%", bordered: true, icon: false,
      content: [
        { type: "heading", level: 2, text: "Choose a comfortable reading size" },
        { type: "paragraph", text: "Increase the text size for longer explanations or help articles. The heading and body grow together, and line spacing follows the font size." },
        { type: "list", items: ["Text wraps naturally inside the available width.", "The toolbar keeps its normal size."] }
      ] });
    const update = percent => {
      text.setTextScale(percent);
      log.write(`Text size: ${text.textScale}%`);
    };
    const owner = new Panel(container, { name: "readingSizeExample", width: "100%" });
    owner.add(new Toolbar({ name: "Reading size" }).add(
      new Button({ text: "A− Smaller", onClick: () => update(text.textScale - 25) }),
      new Button({ text: "Reset 100%", onClick: () => update(100) }),
      new Button({ text: "A+ Larger", onClick: () => update(text.textScale + 25) })
    ), text);
    update(100);
    return owner;
  }, "Like the ExamSoft reading-size setting, a local CSS variable scales the content from 75% to 200%. Body text starts at 15 px; the heading uses 1.5em and line-height is unitless, so both follow the scale. Buttons adjust in 25% steps. The small ScaledTextLayout class belongs to this example; setTextScale() is its method, not a built-in TextLayout API. Store the percentage in application preferences if it should persist between visits.",
  ".dui-docs-scaled-text .dui-text-layout__content { font-size: calc(15px * var(--dui-example-text-scale, 1)); line-height: 1.6; }\n.dui-docs-scaled-text .dui-text-layout__heading { font-size: 1.5em; font-weight: 700; line-height: 1.25; }\n.dui-docs-scaled-text .dui-text-layout__paragraph { overflow-wrap: anywhere; }"),
  liveExample("Callout and glossary", function createTextLayoutExample({ container, log }) {
    const callout = new TextLayout({ name: "importCallout", title: "Before importing", tone: "info", bordered: true, width: "100%",
      content: [{ type: "paragraph", text: "Review the source format before running the import." },
        { type: "list", items: ["Confirm the delimiter or record width.", "Validate a small sample first."] }] });
    const glossary = new TextLayout({ name: "importGlossary", title: "Terms", width: "100%", content: [
      { type: "definitionList", items: [{ term: "Definition", definition: "Field names, types and locations." }, { term: "Preview", definition: "Sample records used to inspect the layout." }] }
    ] });
    return new Panel(container, { name: "textLayoutExample", width: "100%" }).add(callout, glossary,
      new Button({ text: "Mark ready", onClick: () => { callout.setTone("success").setTitle("Ready to import").setText("The sample passed validation."); log.write("Callout updated"); } }));
  }, "The callout demonstrates a title, semantic icon, background and border. The glossary aligns terms with definitions. Mark ready updates content and appearance in place.")],
  tables: [{ title: "Scoped CSS reference", rows: apiRows([
    [".your-class .dui-text-layout__content", "font-size / line-height / gap", "Typography and spacing shared by content blocks."],
    [".your-class h2.dui-text-layout__heading", "font-size / font-weight", "Style a particular semantic heading level; h3 and h4 work the same way."],
    [".your-class .dui-text-layout__paragraph", "font-weight / font-style / color", "Style complete paragraphs in this instance."],
    [".your-class .dui-text-layout__title", "text-transform / letter-spacing", "Style the separate component caption."],
    [".your-class .dui-text-layout__list", "line-height / padding-left", "List spacing and indentation."],
    [".your-class .dui-text-layout__definition-term", "font-weight / color", "Emphasize glossary terms while keeping definitions aligned."]
  ]) }],
  options: apiRows([["content", "string | TextBlock[]", "Plain text or supported structured blocks; heading.level accepts 2–4."], ["css", "string", "Local root class used to scope application styles."], ["tone", "neutral | info | success | warning | danger", "Semantic colors and default icon."], ["title / icon", "string", "Component caption and registered icon name; icon: false hides the icon."], ["background / bordered / spacing", "boolean / boolean / string", "Fill, outline and compact/normal/comfortable spacing."]]),
  methods: apiRows([["getContent() / setContent(blocks, options)", "TextBlock[] / TextLayout", "Read a copy or replace structured content."], ["setText(text) / setTitle(title) / setTone(tone)", "TextLayout", "Update body or appearance."], ["setBackground(flag) / setBordered(flag)", "TextLayout", "Toggle fill and frame."]]),
  events: apiRows([["contentChange / appearanceChange", "ChangeEvent", "Content or appearance updates with mutation metadata."]]),
  notes: ["Keep the content as plain strings and structured blocks. Use CSS for presentation; HTML and Markdown are not interpreted.",
    "Use heading levels according to document structure, then choose their visible sizes with CSS. The title option alone does not create a heading element.",
    "Prefer semantic theme colors to hard-coded black or white. Check custom typography in both themes.",
    "Scoped CSS uses the current experimental component's class names; review selectors when upgrading Tæt UI."]
};

export const codeBlockPage = {
  id: "code-block", title: "CodeBlock", status: "stable",
  description: "Read-only source text with preserved whitespace, a language caption and an optional Copy button.",
  imports: importsFor(["Button", "CodeBlock", "Panel"]),
  paragraphs: ["CodeBlock is the component used for source snippets throughout this documentation. language sets the caption and CSS class; the control does not include a syntax-highlighting engine or code editor. Code is rendered as text.", "Copy uses the browser clipboard when available and reports copy or copyError. value.get() returns the source string; value.set() updates it without rebuilding the control."],
  examples: [liveExample("JSON preview", function createCodeBlockExample({ container, log }) {
    const code = new CodeBlock({ name: "jsonPreview", language: "json", code: JSON.stringify({ name: "Customer import", enabled: true }, null, 2), copyButton: true });
    code.events.on("copy", () => log.write("Source copied"));
    code.events.on("copyError", () => log.write("Clipboard unavailable in this browser context"));
    return new Panel(container, { name: "codeBlockExample", width: "100%" }).add(code,
      new Button({ text: "Update JSON", onClick: () => code.value.set(JSON.stringify({ name: "Customer import", enabled: true, rows: 24 }, null, 2), { origin: "user", userAction: true }) }));
  }, "Update JSON changes the displayed source. Copy copies only the source text, without the caption or button.")],
  options: apiRows([["code / language", "string", "Source text and language caption."], ["copyButton", "boolean", "Show the Copy action; default true."]]),
  methods: apiRows([["value.get() / value.set(code, options)", "string / boolean", "Read or replace source text."], ["copy(options)", "Promise<boolean>", "Copy source and report success or failure."]]),
  events: apiRows([["change", "ChangeEvent", "Source string changed."], ["copy / copyError", "ControlEvent", "Clipboard completion or failure."]])
};
