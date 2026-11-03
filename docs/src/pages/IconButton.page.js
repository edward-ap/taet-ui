import { importsFor } from "./pageHelpers.js";
import { Form, IconButton, NumberInput, ReadonlyText } from "../../../src/ui/index.js";

function createPageNavigator() {
  const total = 180;
  const page = new NumberInput({ name: "page", label: "Page", css: "docs-page-number", value: 1, min: 1, max: total, step: 1, width: 64 });
  const previous = new IconButton({ text: "Previous page", icon: "chevron-left", onClick: () => change(-1) });
  const next = new IconButton({ text: "Next page", icon: "chevron-right", onClick: () => change(1) });
  function change(delta) { page.value.set(Math.max(1, Math.min(total, (page.value.get() ?? 1) + delta))); }
  function sync() {
    const value = page.value.get();
    if (value == null || value <= 1) previous.disable(); else previous.enable();
    if (value == null || value >= total) next.disable(); else next.enable();
  }
  const form = new Form({ css: "docs-page-nav" }).row(previous, page, new ReadonlyText({ text: "/ 180", css: "docs-page-count" }), next);
  form.disposables.add(page.events.on("change", sync));
  sync();
  return form;
}

export const borderlessIconButtonPage = {
  id: "borderless-icon-button", title: "IconButton", status: "stable",
  description: "A borderless icon action for page navigation and compact inline controls.",
  keywords: ["borderless", "reader", "page", "previous", "next", "arrow", "icon-only"],
  imports: importsFor(["IconButton", "Form", "NumberInput", "ReadonlyText"]),
  paragraphs: [
    "IconButton extends ToolButton and Button. Only the icon is visible; text or label supplies its accessible name and fallback tooltip. Supply a meaningful action name, or bind a labeled command.",
    "The normal background is transparent. Hover and press add a theme-colored fill without a frame; keyboard focus remains visible. The clickable area uses the toolbar-height token, independent of the icon size.",
    "Button with Icon combines a visible caption and icon. ToolButton can show text and paints a hover frame. IconButton is the borderless, icon-only variant."
  ],
  examples: [{ title: "Page navigation", source: `${createPageNavigator.toString()}\nconst form = createPageNavigator();`, create: createPageNavigator,
    styles: `.dui-form.docs-page-nav .docs-page-number { flex: 0 0 64px; grid-template-columns: minmax(0, 1fr); column-gap: 0; }
.docs-page-number > .dui-text-field__label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
.dui-form.docs-page-nav .docs-page-count { flex: 0 0 auto; width: auto; min-width: 0; background: transparent; align-self: center; }
.docs-page-nav .dui-form__cols { align-items: center; }`
  }],
  options: [
    { name: "icon", type: "string", description: "Registered Tæt UI icon, e.g. chevron-left or chevron-right." },
    { name: "text / label", type: "string", description: "Accessible action name; caption stays hidden." },
    { name: "tooltip / title", type: "string", description: "Optional tooltip; defaults to the action name." },
    { name: "shape", type: '"square" | "rounded"', description: "Shape of the hit area and hover fill." },
    { name: "command / commands", type: "Button command binding", description: "Use a command instead of onClick." }
  ],
  methods: [{ name: "setIcon / setText / setShape / bindCommand", type: "inherited", description: "Update presentation or binding on the existing instance; enable/disable and lifecycle follow Button." }],
  events: [{ name: "click", description: "Native mouse, Enter or Space activation; source is the IconButton. Command-bound buttons execute the command instead." }],
  notes: ["The navigation example is application composition, not a pager or DjVu decoder built into the button.", "IconButton does not expose a showText constructor option. Use Button or ToolButton when a visible caption is needed."]
};
