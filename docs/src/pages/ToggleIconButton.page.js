import { importsFor } from "./pageHelpers.js";
import { ToggleIconButton } from "../../../src/ui/experimental.js";

function createPlaybackButton() {
  return new ToggleIconButton({
    name: "playing", value: false,
    uncheckedIcon: "play", checkedIcon: "stop",
    uncheckedText: "Play", checkedText: "Stop"
  });
}

export const toggleIconButtonPage = {
  id: "toggle-icon-button", title: "ToggleIconButton", status: "experimental",
  description: "A borderless two-state icon button, such as Play / Stop.",
  keywords: ["player", "play", "stop", "checked", "boolean", "borderless"],
  imports: importsFor(["ToggleIconButton"]),
  paragraphs: [
    "ToggleIconButton specializes CheckButton, retaining its boolean value, veto, silent writes, dirty/reset, validation, readonly and lifecycle contracts. It remains experimental like CheckButton.",
    "uncheckedIcon/checkedIcon choose the images; uncheckedText/checkedText supply hidden accessible action names and tooltips. The active value is exposed through aria-pressed. With one shared icon, use text or label as a meaningful stable name.",
    "For playback, false displays Play; activating it writes true and displays Stop. Activating Stop writes false. Listen to change and connect event.newValue to your player; update value from the application when playback finishes. This example changes UI state only, it does not play media.",
    "Use IconButton for command-bound one-shot actions. ToggleIconButton follows EditorControl value/change behavior and does not accept Button command/onClick options."
  ],
  examples: [{ title: "Play / Stop", source: `${createPlaybackButton.toString()}\nconst button = createPlaybackButton();`, create: createPlaybackButton }],
  options: [
    { name: "value / checked", type: "boolean", description: "Initial state; explicit value takes precedence." },
    { name: "uncheckedIcon / checkedIcon", type: "string", description: "Registered icon for each state; falls back to icon." },
    { name: "uncheckedText / checkedText", type: "string", description: "Action names and tooltips; falls back to text, then label." },
    { name: "onChange", type: "callback", description: "Observe accepted state changes; newValue is boolean." },
    { name: "readOnly / disabled", type: "boolean", description: "Prevent user activation." }
  ],
  methods: [{ name: "value.get/set/clear, toggle, setChecked, isChecked", type: "CheckButton API", description: "Read/change state. silent writes update the icon and accessible state without change events." }],
  events: [{ name: "beforeChange / change / afterChange", description: "Inherited EditorControl events; beforeChange can veto. There is no separate click event contract." }],
  notes: ["The owning container destroys this control. Supply both state names when the icon changes the action.", "Validation messages take precedence over the action tooltip; clearing validation restores the current action name.", "No permanent frame or resting fill is added in either state; hover, press and keyboard focus remain visible."]
};
