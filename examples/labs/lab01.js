import { TextField } from "../../src/ui/TextField.js";

const log = document.querySelector("#log");

function writeLog(message) {
  const row = document.createElement("div");
  row.textContent = message;
  log.prepend(row);
}

function button(id, handler) {
  document.querySelector(`#${id}`).addEventListener("click", handler);
}

const field = new TextField("#app", {
  label: "Source Name",
  value: "SAP Customers",
  placeholder: "Enter source name"
});

window.lab01 = { field };

field.events.on("beforeChange", event => {
  writeLog(
    `beforeChange: "${event.oldValue}" -> "${event.newValue}", origin=${event.origin}, userAction=${event.userAction}`
  );

  if (event.newValue.toLowerCase() === "cancel") {
    event.cancel = true;
    writeLog("beforeChange cancelled value \"cancel\"");
  }
});

field.events.on("change", event => {
  writeLog(
    `change: "${event.oldValue}" -> "${event.newValue}", origin=${event.origin}, userAction=${event.userAction}`
  );
});

field.events.on("afterChange", event => {
  writeLog(
    `afterChange: "${event.oldValue}" -> "${event.newValue}", origin=${event.origin}, userAction=${event.userAction}`
  );
});

button("set-api", () => {
  const changed = field.value.set("API Value", {
    origin: "api",
    userAction: false
  });

  writeLog(`Set API returned ${changed}`);
});

button("set-silent", () => {
  const changed = field.value.set("Silent Import Value", {
    origin: "import",
    silent: true
  });

  writeLog(`Silent import returned ${changed}; no value events should appear`);
});

button("clear", () => {
  const changed = field.value.clear({
    origin: "api"
  });

  writeLog(`Clear returned ${changed}`);
});

button("disable", () => {
  field.disable();
  writeLog("field disabled");
});

button("enable", () => {
  field.enable();
  writeLog("field enabled");
});

button("focus", () => {
  writeLog(`focus returned ${field.focus()}`);
});

button("destroy", () => {
  field.destroy();
  writeLog("field destroyed");

  try {
    field.value.set("Should fail");
  } catch (error) {
    writeLog(`${error.name}: ${error.message}`);
  }
});

writeLog("lab01 ready");
