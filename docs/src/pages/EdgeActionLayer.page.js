import { importsFor } from "./pageHelpers.js";
import { Panel, Button, CommandRegistry } from "../../../src/ui/index.js";
import { EdgeActionLayer, LabelText } from "../../../src/ui/experimental.js";

function createEdgeDemo({ container }) {
  const owner = new Panel(container);
  const surface = new Panel({ name: "surface", height: 260, bordered: true, css: "dui-docs-edge-surface" });
  const status = new LabelText({ name: "status", text: "Last action: none" });
  owner.add(surface, status);
  surface.add(new Button({ text: "Center remains interactive", onClick: () => status.setText("Last action: center") }));
  const commands = new CommandRegistry();
  commands.register("demo.right", { run: () => status.setText("Last action: right (command)") });
  owner.disposables.add(() => commands.destroy());
  new EdgeActionLayer({ parent: surface, name: "edges", commands,
    left: { size: .2, indicator: "L", action: () => status.setText("Last action: left") },
    right: { size: .2, indicator: "R", command: "demo.right" },
    top: { size: "48px", indicator: "T", action: () => status.setText("Last action: top") },
    bottom: { size: "20%", indicator: "B", action: () => status.setText("Last action: bottom") }
  });
  return owner;
}
export const edgeActionLayerPage = {
  id: "edge-action-layer", title: "EdgeActionLayer", status: "experimental",
  description: "Invisible, parent-relative pointer action zones with optional hover indicators.",
  keywords: ["overlay", "edges", "pointer", "hit area", "hover", "command"],
  imports: importsFor(["Panel", "Button", "CommandRegistry", "EdgeActionLayer", "LabelText"]),
  paragraphs: [
    "Attach the layer to a mounted Panel/Layout content area or an HTMLElement. It occupies no normal layout space. Unconfigured and disabled edges leave underlying content interactive; the center is never a hit target.",
    "Hover near each edge to reveal L / R / T / B, then click to update the status. The right edge uses CommandRegistry; other edges use callbacks. Click the central button to verify pass-through. The indicators are supplied by this example, not built into the layer.",
    "Left and right own corners. Top and bottom occupy the gap between them. Oversized opposing edges are clipped deterministically: left before right, top before bottom. Disabled edges reserve no space.",
    "A primary pointer press and release in the same zone activates it. Moving more than dragThreshold CSS pixels, pointercancel, blur, parent scroll or reconfiguration cancels the gesture. Normal touch scrolling is not replaced."
  ],
  examples: [{ title: "Four edges and an untouched center", create: createEdgeDemo,
    source: `${createEdgeDemo.toString()}\nconst example = createEdgeDemo({ container: "#root" });`,
    styles: ".dui-docs-edge-surface { display:grid; place-items:center; margin-bottom:8px; }" }],
  options: [
    { name: "parent", type: "Panel | HTMLElement | string", description: "Mounted container or selector. Alternatively use new EdgeActionLayer(parent, options) or mount(parent). Panel ownership is registered without replacing existing content." },
    { name: "left / right / top / bottom", type: "EdgeActionConfig", description: "Optional independent edges; omitted edges create no nodes." },
    { name: "size", type: "number | string", description: "Fraction 0..1 (default .25), nonnegative px, or 0..100%. Left/right use width; top/bottom use height." },
    { name: "action / command / commands", type: "callback / id / CommandRegistry", description: "Each edge accepts action OR command. Register commands before constructing the layer; registry is borrowed." },
    { name: "indicator", type: "string | HTMLElement | BaseControl", description: "Optional decorative hover content. Text is escaped; custom content must be detached/unmounted. Controls are owned and destroyed. Indicators cannot receive keyboard focus." },
    { name: "enabled / dragThreshold", type: "boolean / number", description: "Per-edge enabled defaults true. Layer disable()/enable() applies to all. Movement threshold defaults to 5 CSS pixels." }
  ],
  methods: [
    { name: "setEdgeEnabled(edge, boolean) / setEdgeSize(edge, size)", description: "Update an existing edge without rebuilding the layer; cancels a pending gesture." },
    { name: "isEdgeEnabled(edge) / refresh()", description: "Read effective availability or resynchronize command state. commands.refreshState() updates subscribed zones automatically." },
    { name: "destroy()", description: "Remove zones, listeners and owned indicators; preserve the parent and its existing children. HTMLElement hosts require explicit layer teardown." }
  ],
  events: [
    { name: "activate / enter / leave", description: "source, edge, nativeEvent, origin: user, userAction: true. activate is emitted before dispatch; destroying/disabling/reconfiguring in that handler prevents the action." },
    { name: "actionError", description: "Reports thrown/rejected callback errors while the activation is current. Commands retain CommandRegistry result/error handling." }
  ],
  notes: [
    "This is an auxiliary pointer mechanism, hidden from assistive technology with no added tab stops. Provide explicit accessible controls/shortcuts for essential actions elsewhere.",
    "Zones receive pointer hits; gestures are not forwarded to sibling content underneath them. The center and inactive edges retain ordinary hit testing. No pan, zoom, scrolling, navigation or content semantics are supplied.",
    "CSS follows parent resize. Scrolling the host itself only translates the overlay to its client origin; child scrolling/scaling is not observed. Use a non-scrolling workspace shell around independently scrolling content where practical.",
    "Static parents temporarily receive position: relative. Existing positioned parents are preserved; the last layer restores the original inline position if it was not externally changed. See spec/edge-action-layer.md for geometry and lifetime details."
  ]
};
