import { Button, Dialog, LabelText, LogPanel, MessageBox, Panel, Popup, Tooltip } from "../../src/ui/all.js";

const log = new LogPanel({ className:"dui-lab24-log" });
const firstAnchor = new Button({ text:"Open first popup" });
const secondAnchor = new Button({ text:"Open second popup" });
const dialogButton = new Button({ text:"Open dialog" });
const confirmButton = new Button({ text:"Confirm delete" });
const tooltipButton = new Button({ text:"Hover for help" });

const firstPopup = new Popup({
  anchor:firstAnchor,
  content:new LabelText({ text:"First anchored popup" }),
  placement:"bottom-start"
});

const secondPopup = new Popup({
  anchor:secondAnchor,
  content:new LabelText({ text:"Second popup aligned to the end" }),
  placement:"bottom-end"
});

const tooltip = new Tooltip({
  anchor:tooltipButton,
  content:"Opens contextual help without moving focus.",
  showDelay:150
});

firstAnchor.events.on("click", () => firstPopup.isOpen() ? firstPopup.close({ origin:"user", userAction:true }) : firstPopup.open());
secondAnchor.events.on("click", () => secondPopup.isOpen() ? secondPopup.close({ origin:"user", userAction:true }) : secondPopup.open());

dialogButton.events.on("click", async () => {
  const dialog = new Dialog({
    title:"Edit mapping",
    content:new LabelText({ text:"Apply changes to Customer Mapping?" }),
    buttons:[
      { text:"Apply", result:"apply", primary:true },
      { text:"Unavailable", result:"unavailable", disabled:true },
      { text:"Cancel", result:"cancel" }
    ]
  });
  const result = await dialog.showModal({ origin:"user", userAction:true });
  log.write(`dialog result=${result}`);
  dialog.destroy();
});

confirmButton.events.on("click", async () => {
  const result = await MessageBox.confirm("Delete selected mapping?", { title:"Confirm Delete" });
  log.write(`confirm result=${result}`);
});

for (const [name, popup] of [["first", firstPopup], ["second", secondPopup]]) {
  popup.events.on("open", () => log.write(`${name} open`));
  popup.events.on("close", event => log.write(`${name} close reason=${event.reason}`));
}

const panel = new Panel("#root", { className:"dui-lab24-panel" });
panel.add(firstAnchor, secondAnchor, dialogButton, confirmButton, tooltipButton, log);
tooltip.attach();
log.write("lab24 ready");

window.lab24 = { panel, firstAnchor, secondAnchor, dialogButton, confirmButton, tooltipButton, firstPopup, secondPopup, tooltip, log };
