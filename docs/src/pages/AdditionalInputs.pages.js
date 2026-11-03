import { importsFor } from "./pageHelpers.js";
import { Button, Form } from "../../../src/ui/index.js";
import { Switch, CircularSlider, TrackBar, ProgressBar, StepProgressBar, FilePicker } from "../../../src/ui/experimental.js";
import { inputExample, inputOptions, inputMethods, inputEvents, inputNotes } from "./inputExamples.js";

export const switchPage = {
  id: "switch", title: "Switch", status: "experimental",
  keywords: ["toggle", "boolean", "notify", "on", "off"],
  description: "An on/off editor for boolean settings, with separate field, state and description labels.",
  imports: importsFor(["Form", "Switch"]),
  paragraphs: ["Switch represents a boolean value. Use it for settings such as the Notify field in Lab 21. Click the switch or its description, or focus it and press Space."],
  examples: [inputExample("Notification settings", function createSwitchExample({ log }) {
    const notify = new Switch({
      name: "notify", label: "Notify", text: "Send schedule reminders",
      onText: "On", offText: "Off", value: false,
      onChange: event => log.write("Notify: " + event.newValue)
    });
    const managed = new Switch({ name: "managed", label: "Managed", text: "Enabled by administrator", value: true, readOnly: true });
    return new Form({ name: "notificationSettings", labelWidth: 112 }).row(notify).row(managed);
  }, "Notify is editable; Managed demonstrates a read-only enabled setting. The model contains true or false, independently of the displayed state text.")],
  options: [...inputOptions,
    { name: "value", type: "boolean", description: "Initial state; default false." },
    { name: "text", type: "string", description: "Description beside the switch." },
    { name: "onText / offText", type: "string", description: "Visible state labels; defaults On / Off." },
    { name: "onIcon / offIcon", type: "string", description: "Optional registered icons for the two states." }
  ],
  methods: [...inputMethods("boolean"),
    { name: "setText(text, options)", type: "Switch", description: "Change the description." },
    { name: "setStateText(onText, offText, options)", type: "Switch", description: "Change both state labels." }
  ], events: inputEvents, notes: inputNotes
};

export const trackBarPage = {
  id: "track-bar", title: "TrackBar", status: "experimental",
  keywords: ["slider", "range", "scroll", "quality", "quantity", "scale", "ticks", "vertical", "orientation"],
  description: "A numeric slider with range limits, step increments and optional scale labels.",
  imports: importsFor(["Form", "TrackBar", "CircularSlider"]),
  paragraphs: ["TrackBar is the Quality slider in Lab 21. Values are clamped to min/max and snapped to step increments. Drag the thumb, use the mouse wheel, or adjust the focused slider with the keyboard."],
  examples: [inputExample("Circular slider", function createCircularSliderExample({ log }) {
    return new CircularSlider({name:"surface",label:"Surface",value:50,
      onChange:event=>log.write("Surface: " + event.newValue)});
  }, "Import CircularSlider from the full taet-ui.min.js bundle. Fill runs clockwise from six o'clock, with the percentage in the center. Drag around the ring; Arrow keys, Home/End and Page Up/Down also work. Values stop at 0 and 100 rather than wrapping. The value API, min/max, step, readOnly and disabled behavior match TrackBar. No animation runs while idle."), inputExample("Range labels and ticks", function createTrackBarExample({ log }) {
    const quality = new TrackBar({
      name: "quality", label: "Quality", min: 0, max: 100, step: 5,
      smallChange: 5, largeChange: 20, scale: "range", showValue: true, value: 60,
      onChange: event => log.write("Quality: " + event.newValue)
    });
    const volume = new TrackBar({
      name: "volume", label: "Volume", min: 0, max: 10, step: 1, value: 4,
      scale: "ticks", tickFrequency: 2, showTickLabels: true, showValue: true,
      onChange: event => log.write("Volume: " + event.newValue)
    });
    return new Form({ name: "sliderSettings", labelWidth: 112 }).row(quality).row(volume);
  }, "Arrow keys use smallChange; PageUp/PageDown use largeChange. Home and End jump to the range limits. Quality shows the endpoints; Volume shows labeled ticks."),
  inputExample("Vertical slider", function createVerticalTrackBarExample({ log }) {
    return new TrackBar({
      name: "level", label: "Level", labelPosition: "top", width: 160,
      orientation: "vertical", min: 0, max: 100, step: 5, value: 40,
      smallChange: 5, largeChange: 20, scale: "range", showValue: true,
      onChange: event => log.write("Level: " + event.newValue)
    });
  }, "Set orientation: 'vertical' to place the maximum at the top and the minimum at the bottom. Drag upward or press ArrowUp to increase the value; ArrowDown decreases it. The same value API and range options apply."),
  inputExample("Value positions and thumb shapes", function createTrackBarStyles({ log }) {
    const form = new Form({labelWidth:100});
    const shapes = ['circle','ring','grip','line'];
    const positions = ['left','right','top','bottom'];
    for (const [index, shape] of shapes.entries()) {
      form.row(new TrackBar({name:shape, label:shape, value:40, showValue:true, valuePosition:positions[index], thumbShape:shape,
        onChange:event=>log.write(shape + ': ' + event.newValue)}));
    }
    form.row(...shapes.map((shape,index)=>new TrackBar({name:'vertical-'+shape,label:shape,labelPosition:'top',orientation:'vertical',
      value:40,showValue:true,valuePosition:positions[index],thumbShape:shape})));
    return form;
  }, "Both orientations support all four value positions and thumb shapes. showValue: false hides only the number. Use the setValuePosition, setThumbShape and setShowValue methods to change presentation later.")],

  options: [...inputOptions,
    { name: "valuePosition", type: '"left" | "right" | "top" | "bottom"', description: "Current-value placement relative to the track; default right. Top/bottom center on the track axis; left/right center on its midpoint." },
    { name: "thumbShape", type: '"circle" | "ring" | "grip" | "line"', description: "Filled circle (default), outlined circle, rectangular grip or perpendicular line." },
    { name: "value / min / max", type: "number", description: "Initial value and range; default range 0–100." },
    { name: "step", type: "number", description: "Value snapping increment; default 1." },
    { name: "smallChange / largeChange", type: "number", description: "Arrow/wheel and page-key increments." },
    { name: "scale", type: '"none" | "range" | "ticks"', description: "Hide the scale, show endpoints or draw ticks." },
    { name: "tickFrequency / showTickLabels", type: "number / boolean", description: "Tick spacing and optional numeric labels." },
    { name: "showValue / valueFormatter", type: "boolean / function", description: "Show the current value and customize displayed numbers." },
    { name: "orientation / invert", type: '"horizontal" | "vertical" / boolean', description: "Slider direction and reversed layout." }
  ],
  methods: [...inputMethods("number"),
    { name: "setValuePosition(position) / setThumbShape(shape) / setShowValue(show)", type: "TrackBar", description: "Update presentation at runtime without changing the value or rebuilding the input." },
    { name: "setRange(min, max, options)", type: "boolean", description: "Update limits and reconcile the value; reports a value change." },
    { name: "moveBegin(options) / moveEnd(options)", type: "boolean", description: "Move to the minimum or maximum." }
  ], events: inputEvents, notes: inputNotes
};

export const progressBarPage = {
  id: "progress-bar", title: "ProgressBar", status: "experimental",
  keywords: ["progress", "percentage", "indicator", "completion", "StepProgressBar", "steps", "workflow", "source", "mapping", "validate", "export"],
  description: "Numeric progress and a step-by-step workflow indicator.",
  imports: importsFor(["Button", "Form", "ProgressBar", "StepProgressBar"]),
  paragraphs: [
    "ProgressBar keeps its caption on one background: centered where possible, shifted within fill or track when it crosses their boundary. Long captions are clipped/ellipsized within that region; aria-valuetext retains the complete text. Generated themes provide --dui-on-progress and --dui-on-progress-track; legacy themes fall back to their existing text tokens.",
    "ProgressBar displays application state. Users do not edit it directly; update value from your task's progress events. It uses the same named value contract as form editors. Both progress controls have declarations in taet-ui/inputs and remain experimental.",
    "StepProgressBar is the Source / Mapping / Validate / Export workflow at the top of Lab 21. It displays named stages, highlights progress through the sequence and optionally allows navigation. This separate experimental control uses items and a selected index instead of the editor value API."
  ],
  examples: [inputExample("Update progress", function createProgressExample({ log }) {
    const progress = new ProgressBar({ name: "progress", label: "Progress", min: 0, max: 100, value: 35, showText: true });
    progress.events.on("change", event => log.write("Progress: " + event.newValue + "%"));
    return new Form({ name: "taskProgress", labelWidth: 112 }).row(progress)
      .row(new Button({ name: "advanceProgress", text: "Advance +15", onClick: () => progress.value.set(progress.value.get() + 15) }))
      .row(new Button({ name: "resetProgress", text: "Reset progress", onClick: () => progress.value.set(0) }));
  }, "The buttons simulate progress updates. Values above 100 are clamped to the maximum. The demo has no background timer or network task."),
  inputExample("StepProgressBar: workflow stages", function createWorkflowProgressExample({ log }) {
    return new StepProgressBar({
      name: "workflowProgress", width: "100%", layoutMode: "fullSize",
      selectedItemIndex: 1, allowUserInteraction: true,
      items: [
        { caption: "Source", description: "Loaded", contentBlock2: "Import" },
        { caption: "Mapping", description: "Rules", contentBlock2: "Edit" },
        { caption: "Validate", description: "Checks", contentBlock2: "Review" },
        { caption: "Export", description: "Package", contentBlock2: "Done" }
      ],
      onSelectedItemChanged: event => log.write("Stage: " + event.selectedItem.caption + " (index " + event.newValue + ")")
    });
  }, "Click a stage to select it. Arrow keys move focus between stages; Enter or Space selects the focused stage. Mapping starts selected; connectors leading to the current stage are highlighted. This demo changes the indicator only; the application decides which workflow actions to run.")],
  tables: [{ title: "StepProgressBar options", rows: [
    { name: "items", type: "object[]", description: "Stages with caption, description, contentBlock2 and optional icon, enabled or state: 'error'." },
    { name: "selectedItemIndex", type: "number", description: "Zero-based current stage; -1 means none. Earlier stages are highlighted along with the current one." },
    { name: "allowUserInteraction", type: "boolean", description: "Enable click and keyboard selection; default false." },
    { name: "layoutMode", type: '"compact" | "fixed" | "fullSize"', description: "Compact spacing, fixed item spacing or distribution across the available size." },
    { name: "orientation", type: '"horizontal" | "vertical"', description: "Direction of the stage sequence." },
    { name: "drawConnectors / showIndex", type: "boolean", description: "Show connector lines and stage numbers; both default true." }
  ] }, { title: "StepProgressBar methods and events", rows: [
    { name: "getItems() / setItems(items, options)", type: "object[] / StepProgressBar", description: "Read or replace stage definitions." },
    { name: "getSelectedItemIndex()", type: "number", description: "Read the current stage index." },
    { name: "setSelectedItemIndex(index, options)", type: "boolean", description: "Select a stage; returns whether selection changed." },
    { name: "selectNext(options) / selectPrevious(options)", type: "boolean", description: "Move through selectable stages." },
    { name: "selectedItemChanged", type: "{ oldValue, newValue, selectedItem, origin, userAction }", description: "Selection notification; constructor callback: onSelectedItemChanged." },
    { name: "itemClick", type: "{ item, index, cancel, handled }", description: "Intercept a user selection; cancel or handled prevents the default transition." }
  ] }],
  options: [
    { name: "name / label", type: "string", description: "Form model key and visible field label." },
    { name: "value / min / max", type: "number", description: "Current amount and range; default range 0–100." },
    { name: "showText", type: "boolean", description: "Show progress text; default true." },
    { name: "textMode", type: '"percent" | "value" | "custom"', description: "Show percentage, numeric value or the text option." },
    { name: "text / valueFormatter", type: "string / function", description: "Custom text, or formatter(value, { source, percent, min, max })." },
    { name: "orientation", type: '"horizontal" | "vertical"', description: "Fill direction; default horizontal." }
  ],
  methods: [
    { name: "value.get()", type: "number", description: "Read the current amount." },
    { name: "value.set(value, options)", type: "boolean", description: "Clamp the amount and update the fill and text." },
    { name: "setRange(min, max, options)", type: "boolean", description: "Change limits and reconcile the amount; reports a value change." }
  ], events: inputEvents,
  notes: ["A percentage is calculated relative to min/max. For completed-item counts, use textMode: 'value' or a valueFormatter.", "The track exposes role=progressbar and its current amount and range to assistive technology."]
};

export const filePickerPage = {
  id: "file-picker", title: "FilePicker", status: "experimental",
  keywords: ["file", "upload", "browse", "attachment", "multiple", "directory"],
  description: "Choose local files and expose their metadata and File objects to the application.",
  imports: importsFor(["Form", "FilePicker"]),
  paragraphs: [
    "FilePicker is the File field in Lab 21. It opens the browser's file chooser and displays the selected names. The control itself does not upload files; your application can send getFiles() results using its own upload service.",
    "value.get() contains metadata: name, size, type, lastModified and relativePath. A single-file field returns one record or null; multiple: true returns an array. getFiles() returns the actual selected browser File objects."
  ],
  examples: [inputExample("One file or several files", function createFilePickerExample({ log }) {
    const attachment = new FilePicker({
      name: "attachment", label: "File", accept: ".json,.csv,.txt", placeholder: "No file selected",
      onChange: event => log.write(JSON.stringify(event.newValue))
    });
    const attachments = new FilePicker({
      name: "attachments", label: "Files", multiple: true, accept: ".json,.csv,.txt", placeholder: "No files selected",
      onChange: () => log.write(JSON.stringify(attachments.getFiles().map(file => ({ name: file.name, size: file.size }))))
    });
    return new Form({ name: "localAttachments", labelWidth: 112 }).row(attachment).row(attachments);
  }, "Browse for text, CSV or JSON files. The output shows only metadata; this demo neither reads file contents nor uploads them. Use the field's clear button to remove a selection.")],
  options: [...inputOptions,
    { name: "multiple", type: "boolean", description: "Allow several files; default false." },
    { name: "accept", type: "string", description: "Browser chooser filter using extensions or MIME types." },
    { name: "directory", type: "boolean", description: "Request directory selection where supported by the browser." },
    { name: "buttonText / placeholder", type: "string", description: "Browse button text and empty display hint." },
    { name: "clearable", type: "boolean", description: "Show the clear button; default true." },
    { name: "displayMode", type: '"name" | "count"', description: "Show filenames or a count when several files are selected." }
  ],
  methods: [
    { name: "value.get()", type: "object | object[] | null", description: "Read file metadata for the form model." },
    { name: "getFiles()", type: "File[]", description: "Read the actual files from the most recent browser selection." },
    { name: "openPicker()", type: "boolean", description: "Open the chooser from a user action when mounted and editable." },
    { name: "clearFiles(options)", type: "boolean", description: "Clear file handles, the native selection and metadata; reports a value change." }
  ], events: inputEvents,
  notes: ["Use clearFiles() to clear both metadata and selected File objects. Setting or clearing value alone updates metadata; it cannot recreate or select local files.", "accept is a chooser hint. The application remains responsible for validating selected files and handling upload progress or errors."]
};
