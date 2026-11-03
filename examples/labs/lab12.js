import { Button, Form, LogPanel, OptionList, Panel } from "../../src/ui/all.js";

const modeList = new OptionList({
  name: "modeList",
  width: "min(280px, 100%)",
  height: 98,
  value: "inline",
  textField: "text"
});

const flagsList = new OptionList({
  name: "flagsList",
  width: "min(280px, 100%)",
  height: 146,
  multiple: true,
  value: ["close", "resize"],
  textField: "text"
});

const log = new LogPanel({
  name: "log"
});

modeList.data.parse(
  [
    { id: "block", text: "Block" },
    { id: "inline", text: "Inline" },
    { id: "inlineBlock", text: "Inline Block" },
    { id: "none", text: "None" }
  ],
  {
    origin: "import"
  }
);

flagsList.data.parse(
  [
    { id: "close", text: "Close" },
    { id: "minimize", text: "Minimize" },
    { id: "maximize", text: "Maximize" },
    { id: "resize", text: "Resize" },
    { id: "hScroll", text: "Horizontal Scroll" },
    { id: "vScroll", text: "Vertical Scroll" }
  ],
  {
    origin: "import"
  }
);

const setModeButton = new Button({
  name: "setMode",
  text: "Set Mode",

  onClick() {
    modeList.value.set("inlineBlock", {
      origin: "api"
    });
  }
});

const clearModeButton = new Button({
  name: "clearMode",
  text: "Clear Mode",

  onClick() {
    modeList.value.clear({
      origin: "api"
    });
  }
});

const setFlagsButton = new Button({
  name: "setFlags",
  text: "Set Flags",

  onClick() {
    flagsList.value.set(["minimize", "maximize", "resize"], {
      origin: "api"
    });
  }
});

const clearFlagsButton = new Button({
  name: "clearFlags",
  text: "Clear Flags",

  onClick() {
    flagsList.value.clear({
      origin: "api"
    });
  }
});

const modeActions = new Form({
  name: "modeActions",
  width: "min(280px, 100%)"
}).row(setModeButton, clearModeButton);

const flagsActions = new Form({
  name: "flagsActions",
  width: "min(280px, 100%)"
}).row(setFlagsButton, clearFlagsButton);

const panel = new Panel("#root", {
  name: "optionListPanel"
}).add(modeList, modeActions, flagsList, flagsActions, log);

modeList.events.on("change", event => {
  log.write(`mode ${formatValue(event.oldValue)} -> ${formatValue(event.newValue)}, origin=${event.origin}`);
});

flagsList.events.on("change", event => {
  log.write(`flags ${formatValue(event.oldValue)} -> ${formatValue(event.newValue)}, origin=${event.origin}`);
});

log.write("lab12 ready");

window.lab12 = {
  panel,
  modeList,
  flagsList,
  log
};

function formatValue(value) {
  if (Array.isArray(value)) {
    return value.length ? value.join(",") : "(empty)";
  }

  return value == null || value === "" ? "(empty)" : String(value);
}
