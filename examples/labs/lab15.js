import { Button, Form, LabelText, LogPanel, Panel, TabBar } from "../../src/ui/all.js";

const content = new LabelText({
  name: "tabContent",
  className: "dui-tab-content dui-tabbar-lab-content",
  text: ""
});

const tabs = new TabBar({
  name: "documents",
  bordered: true,
  closable: true,
  activeId: "mapping",
  tabs: [
    { id: "mapping", text: "Mapping", title: "Mapping document", closeable: false },
    { id: "preview", text: "Preview", title: "Preview rows" },
    { id: "errors", text: "Errors", title: "Validation errors" },
    { id: "sources", text: "Sources", title: "Project sources" },
    { id: "transforms", text: "Transforms", title: "Mapping transforms" },
    { id: "validation", text: "Validation", title: "Validation results" },
    { id: "output", text: "Output", title: "Generated output" },
    { id: "history", text: "History", title: "Document history" },
    { id: "settings", text: "Settings", title: "Document settings" },
    { id: "readonly", text: "Read Only", disabled: true, closeable: false }
  ]
});

const log = new LogPanel({
  name: "log"
});

let nextDocument = 1;

const addButton = new Button({
  name: "addTab",
  text: "Add Tab",

  onClick() {
    const id = `document${nextDocument++}`;

    tabs.addTab(
      {
        id,
        text: `Document ${nextDocument - 1}`,
        title: `Runtime document ${nextDocument - 1}`
      },
      {
        origin: "api"
      }
    );
    tabs.setActive(id, {
      origin: "api"
    });
  }
});

const disablePreviewButton = new Button({
  name: "disablePreview",
  text: "Disable Preview",

  onClick() {
    tabs.updateTab(
      "preview",
      {
        disabled: true
      },
      {
        origin: "api"
      }
    );
  }
});

const enablePreviewButton = new Button({
  name: "enablePreview",
  text: "Enable Preview",

  onClick() {
    tabs.updateTab(
      "preview",
      {
        disabled: false
      },
      {
        origin: "api"
      }
    );
  }
});

const topButton = new Button({
  name: "tabsTop",
  text: "Top",
  onClick() {
    tabs.setOrientation("top", { origin:"user", userAction:true });
  }
});

const bottomButton = new Button({
  name: "tabsBottom",
  text: "Bottom",
  onClick() {
    tabs.setOrientation("bottom", { origin:"user", userAction:true });
  }
});

const leftButton = new Button({
  name: "tabsLeft",
  text: "Left",
  onClick() {
    tabs.setOrientation("left", { origin:"user", userAction:true });
  }
});

const rightButton = new Button({
  name: "tabsRight",
  text: "Right",
  onClick() {
    tabs.setOrientation("right", { origin:"user", userAction:true });
  }
});

const actions = new Form({
  name: "tabActions",
  width: "min(620px, 100%)"
}).row(
  addButton,
  disablePreviewButton,
  enablePreviewButton,
  topButton,
  bottomButton,
  leftButton,
  rightButton
);

const tabbedFrame = new Panel({
  name: "tabbedFrame",
  width: "min(620px, 100%)",
  height: 180,
  css: "dui-tabbed-frame"
});

const panel = new Panel("#root", {
  name: "tabPanel"
}).add(tabbedFrame);

tabbedFrame.add(tabs, content);
panel.add(actions, log);

tabs.events.on("beforeChange", event => {
  if (event.id === "errors" && event.origin === "user") {
    log.write("beforeChange errors");
  }
});

tabs.events.on("change", event => {
  renderContent();
  log.write(`active ${event.id}, origin=${event.origin}`);
});

tabs.events.on("close", event => {
  renderContent();
  log.write(`close ${event.id}, active=${event.activeId ?? "(none)"}`);
});

tabs.events.on("add", event => {
  log.write(`add ${event.id}`);
});

tabs.events.on("update", event => {
  log.write(`update ${event.id}`);
});

renderContent();
log.write("lab15 ready");

window.lab15 = {
  panel,
  tabbedFrame,
  tabs,
  actions,
  content,
  log
};

function renderContent() {
  const active = tabs.getActive();
  content.setText(active ? `Active tab: ${active.text}` : "No active tab");
}
