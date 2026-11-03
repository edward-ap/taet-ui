import { email, required } from "../../src/core/validators.js";
import { DateInput, DateTimeInput, TimeInput } from "../../src/ui/DateTimeInput.js?v=21.26";
import { FilePicker } from "../../src/ui/FilePicker.js?v=21.26";
import { StepProgressBar } from "../../src/ui/StepProgressBar.js?v=21.26";
import { TextArea } from "../../src/ui/TextArea.js?v=21.26";
import { TextField } from "../../src/ui/TextField.js?v=21.26";
import {
  Button,
  CheckButton,
  CheckBox,
  DropDownList,
  FieldGroup,
  Form,
  LabelText,
  Layout,
  LogPanel,
  MultiSelectDropDown,
  NumberInput,
  Panel,
  ProgressBar,
  RadioGroup,
  Switch,
  TextInput,
  TrackBar
} from "../../src/ui/all.js";

const themeClasses = ["dui-theme-light", "dui-theme-light-blue", "dui-theme-dark-blue"];

const layout = new Layout("#root", {
  name: "lab21Layout",
  width: "100%",
  height: "100%",
  cols: [
    { name: "side", width: 230, minSize: 190 },
    { name: "main", flex: 1, minSize: 420 }
  ]
});

const sidePanel = new Panel({
  name: "lab21SidePanel",
  className: "dui-lab21-panel",
  bordered: true,
  scroll: "auto"
});

const mainPanel = new Panel({
  name: "lab21MainPanel",
  className: "dui-lab21-panel dui-lab21-main",
  bordered: true,
  scroll: "auto"
});

const log = new LogPanel({
  name: "lab21Log",
  height: 180
});

const lightThemeButton = new Button({
  name: "lightTheme",
  text: "Light Blue",
  onClick() {
    setTheme("dui-theme-light-blue", "light-blue");
  }
});

const darkThemeButton = new Button({
  name: "darkTheme",
  text: "Dark Blue",
  onClick() {
    setTheme("dui-theme-dark-blue", "dark-blue");
  }
});

const validateButton = new Button({
  name: "validate",
  text: "Validate",
  onClick() {
    const result = form.validate();
    log.write(`validate ok=${result.ok} errors=${result.errors.length}`);
  }
});

const setButton = new Button({
  name: "setValue",
  text: "Set Project Values",
  onClick() {
    form.setValue(
      {
        customerName: "Northwind Traders",
        email: "ops@example.test",
        apiKey: "runtime-secret",
        phone: "+1 (555) 234-5678",
        priority: 7,
        status: "active",
        regions: ["west", "central"],
        mode: "manual",
        enabled: true,
        notifications: true,
        reviewed: true,
        quality: 85,
        progress: 72,
        startDate: "2026-07-08",
        reminderTime: "14:30",
        reminder12: "08:45",
        deadline: "2026-07-08T16:30",
        attachment: { name: "preview.csv", size: 1280, type: "text/csv" },
        notes: "Values loaded through form.setValue().\nTab insertion is enabled in this memo field."
      },
      { origin: "import" }
    );
    log.write("project values loaded");
  }
});

const clearButton = new Button({
  name: "clear",
  text: "Clear Values",
  onClick() {
    form.clearValues();
    log.write("form cleared");
  }
});

const resetButton = new Button({
  name: "reset",
  text: "Reset Clean",
  onClick() {
    form.reset();
    log.write(`form reset dirty=${form.isDirty()}`);
  }
});

const readonlyButton = new Button({
  name: "readonly",
  text: "Toggle Readonly",
  onClick() {
    form.setReadOnly(!form.isReadOnly());
    log.write(`readonly=${form.isReadOnly()}`);
  }
});

const stepPreviousButton = new Button({
  name: "stepPrevious",
  text: "Step Previous",
  onClick() {
    stepProgress.selectPrevious({
      origin: "user",
      userAction: true
    });
  }
});

const stepNextButton = new Button({
  name: "stepNext",
  text: "Step Next",
  onClick() {
    stepProgress.selectNext({
      origin: "user",
      userAction: true
    });
  }
});

const stepAllButton = new Button({
  name: "stepAll",
  text: "Step All",
  onClick() {
    stepProgress.selectAll({
      origin: "user",
      userAction: true
    });
  }
});

const stepResetButton = new Button({
  name: "stepReset",
  text: "Step Reset",
  onClick() {
    stepProgress.unselectAll({
      origin: "user",
      userAction: true
    });
  }
});

const actionsPanel = new Panel({
  name: "lab21Actions",
  className: "dui-lab21-actions"
});

const customerName = new TextInput({
  name: "customerName",
  label: "Customer",
  validators: [required()]
});

const emailField = new TextInput({
  name: "email",
  label: "Email",
  validators: [required(), email()]
});

const apiKey = new TextField({
  name: "apiKey",
  label: "Secret",
  isPassword: true,
  showRevealButton: true,
  autocomplete: "new-password"
});

const phone = new TextField({
  name: "phone",
  label: "Phone",
  mask: "+0 (000) 000-0000",
  placeholder: "+1 (555) 000-0000"
});

const priority = new NumberInput({
  name: "priority",
  label: "Priority",
  min: 0,
  max: 10,
  step: 1,
  isInteger: true
});

const status = new DropDownList({
  name: "status",
  label: "Status",
  placeholder: "Select",
  searchable: true,
  searchPlaceholder: "Find status",
  descriptionField: "description",
  imageField: "image",
  itemHeight: 38,
  popupHeight: 170
});

status.data.parse(
  [
    {
      id: "draft",
      text: "Draft",
      description: "Editable project",
      image: statusImage("#9aa6b2", "D")
    },
    {
      id: "active",
      text: "Active",
      description: "Visible in runtime",
      image: statusImage("#2f80ed", "A")
    },
    {
      id: "archived",
      text: "Archived",
      description: "Read-only history",
      image: statusImage("#6f7a86", "R")
    }
  ],
  { origin: "import" }
);

const regions = new MultiSelectDropDown({
  name: "regions",
  label: "Regions",
  placeholder: "Select regions",
  searchable: true,
  searchPlaceholder: "Find region"
});

regions.data.parse(
  [
    { id: "north", text: "North" },
    { id: "south", text: "South" },
    { id: "east", text: "East" },
    { id: "west", text: "West" },
    { id: "central", text: "Central" }
  ],
  { origin: "import" }
);

const mode = new RadioGroup({
  name: "mode",
  label: "Mode",
  layout: "flow",
  value: "auto",
  items: [
    { value: "auto", description: "Auto" },
    { value: "manual", description: "Manual" },
    { value: "locked", description: "Locked", disabled: true }
  ]
});

const enabled = new CheckBox({
  name: "enabled",
  label: "Enabled",
  text: "Project is enabled"
});

const notifications = new Switch({
  name: "notifications",
  label: "Notify",
  text: "Send schedule reminders",
  onText: "On",
  offText: "Off"
});

const reviewed = new CheckButton({
  name: "reviewed",
  label: "Review",
  text: "Review",
  checkedText: "Reviewed",
  uncheckedText: "Review",
  checkedIcon: "check",
  checkedIconColor: "#20a464"
});

const quality = new TrackBar({
  name: "quality",
  label: "Quality",
  min: 0,
  max: 100,
  step: 5,
  smallChange: 5,
  largeChange: 20,
  scale: "range",
  showValue: true,
  value: 60
});

const progress = new ProgressBar({
  name: "progress",
  label: "Progress",
  min: 0,
  max: 100,
  value: 35,
  showText: true
});

const stepProgress = new StepProgressBar({
  name: "workflowProgress",
  className: "dui-lab21-step-progress",
  layoutMode: "fullSize",
  selectedItemIndex: 1,
  allowUserInteraction: true,
  items: [
    {
      caption: "Source",
      description: "Loaded",
      contentBlock2: "Import"
    },
    {
      caption: "Mapping",
      description: "Rules",
      progress: 55,
      contentBlock2: "Edit"
    },
    {
      caption: "Validate",
      description: "Checks",
      contentBlock2: "Review"
    },
    {
      caption: "Export",
      description: "Package",
      contentBlock2: "Done"
    }
  ]
});

const startDate = new DateInput({
  name: "startDate",
  label: "Start Date",
  min: "2020-01-01",
  max: "2030-12-31",
  validators: [required()]
});

const reminderTime = new TimeInput({
  name: "reminderTime",
  label: "Time 0-23",
  stepMinutes: 15
});

const reminder12 = new TimeInput({
  name: "reminder12",
  label: "Time Picker",
  hour12: true,
  stepMinutes: 30
});

const deadline = new DateTimeInput({
  name: "deadline",
  label: "Deadline",
  hour12: true,
  step: 900
});

const attachment = new FilePicker({
  name: "attachment",
  label: "File",
  accept: ".json,.csv,.txt",
  placeholder: "No file selected"
});

const notes = new TextArea({
  name: "notes",
  label: "Notes",
  rows: 4,
  minRows: 4,
  maxRows: 7,
  resize: "vertical",
  scrollBars: "vertical",
  wordWrap: true,
  acceptsTab: true,
  autoHeight: true,
  spellcheck: true
});

const lowGain = new TrackBar({
  name: "lowGain",
  label: "Low",
  min: -12,
  max: 12,
  step: 1,
  tickFrequency: 6,
  orientation: "vertical",
  scale: "ticks",
  showValue: true,
  value: -2
});

const midGain = new TrackBar({
  name: "midGain",
  label: "Mid",
  min: -12,
  max: 12,
  step: 1,
  tickFrequency: 6,
  orientation: "vertical",
  scale: "ticks",
  showValue: true,
  value: 4
});

const highGain = new TrackBar({
  name: "highGain",
  label: "High",
  min: -12,
  max: 12,
  step: 1,
  tickFrequency: 6,
  orientation: "vertical",
  scale: "ticks",
  showValue: true,
  value: 8
});

const identityGroup = new FieldGroup({
  name: "identityGroup",
  title: "Identity",
  labelWidth: 88
})
  .row(customerName)
  .row(emailField)
  .row(apiKey)
  .row(phone)
  .row(priority)
  .row(status)
  .row(regions)
  .row(mode)
  .row(enabled)
  .row(notifications)
  .row(reviewed)
  .row(quality)
  .row(progress);

const scheduleGroup = new FieldGroup({
  name: "scheduleGroup",
  title: "Schedule",
  labelWidth: 88
}).row(startDate).row(reminderTime).row(reminder12).row(deadline).row(attachment).row(notes);

const form = new Form({
  name: "lab21Form",
  width: "min(900px, 100%)",
  labelWidth: 92,
  initialValue: {
    customerName: "Acme Mapping",
    email: "owner@example.test",
    apiKey: "secret-123",
    phone: "+1 (555) 123-4567",
    priority: 3,
    status: "draft",
    regions: ["north", "east"],
    mode: "auto",
    enabled: true,
    notifications: false,
    reviewed: false,
    quality: 60,
    progress: 35,
    startDate: "2026-07-08",
    reminderTime: "09:15",
    reminder12: "13:30",
    deadline: "2026-07-08T17:00",
    attachment: { name: "mapping.json", size: 2048, type: "application/json" },
    notes: "Initial values are also the clean baseline.\nUse Tab here to insert a tab character."
  }
}).columns(Form.column(identityGroup), Form.column(scheduleGroup));

const equalizerPanel = new Panel({
  name: "lab21Equalizer",
  className: "dui-lab21-eq",
  bordered: true
});

layout.cell("side").attach(sidePanel);
layout.cell("main").attach(mainPanel);
sidePanel.add(
  new LabelText({ text: "Lab 21" }),
  new LabelText({ text: "Layout -> Panel -> Form" }),
  actionsPanel,
  equalizerPanel,
  log
);
mainPanel.add(stepProgress, form);
equalizerPanel.add(lowGain, midGain, highGain);
actionsPanel.add(
  lightThemeButton,
  darkThemeButton,
  validateButton,
  setButton,
  clearButton,
  resetButton,
  readonlyButton,
  stepPreviousButton,
  stepNextButton,
  stepAllButton,
  stepResetButton
);

for (const field of form.getFields()) {
  field.events.on("change", event => {
    log.write(`${field.name}=${JSON.stringify(event.newValue)} dirty=${field.isDirty()}`);
  });
}

form.events.on("change", event => {
  log.write(`form change changes=${event.changes.length} dirty=${form.isDirty()}`);
});

form.events.on("validationFail", event => {
  log.write(`validation failed ${event.errors.map(error => error.path).join(", ")}`);
});

stepProgress.events.on("selectedItemChanged", event => {
  log.write(`step selected=${event.newValue}`);
});

stepProgress.events.on("itemClick", event => {
  log.write(`step click ${event.index}`);
});

log.write("lab21 ready");

window.lab21 = {
  layout,
  sidePanel,
  mainPanel,
  form,
  stepProgress,
  log,
  fields: {
    customerName,
    email: emailField,
    apiKey,
    phone,
    priority,
    status,
    regions,
    mode,
    enabled,
    notifications,
    quality,
    progress,
    startDate,
    reminderTime,
    reminder12,
    deadline,
    attachment,
    notes,
    lowGain,
    midGain,
    highGain
  },
  setTheme
};

function setTheme(themeClass, themeName) {
  document.body.classList.remove(...themeClasses);
  document.body.classList.add(themeClass);
  document.body.dataset.theme = themeName;
  log.write(`theme ${themeName}`);
}

function statusImage(color, text) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="${color}"/><text x="8" y="11" text-anchor="middle" font-family="Arial" font-size="9" font-weight="700" fill="white">${text}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
