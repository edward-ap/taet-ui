import { createGridWorkbench } from "../ai-recipes/09-grid-workbench.js";

// The page is a host for the reusable factory; application state lives in its owner.
window.workbench = createGridWorkbench("#root", undefined, {columnQA:new URLSearchParams(location.search).get("columns") === "1"});
