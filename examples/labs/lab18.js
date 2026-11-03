import { Button, Form, LabelText, Layout, LogPanel, Panel } from "../../src/ui/all.js";

const layout = new Layout({
  name: "dockSeedLayout",
  title: "Workbench Layout",
  bordered: true,
  width: "min(760px, 100%)",
  height: 280,
  cols: [
    { name: "left", width: 170, minSize: 110, collapsible: true },
    { name: "workspace", flex: 1, minSize: 260 }
  ]
});

const workspaceLayout = new Layout({
  name: "workspaceLayout",
  direction: "rows",
  height: "100%",
  rows: [
    { name: "mainArea", flex: 1, minSize: 120 },
    { name: "logs", height: 96, minSize: 56, collapsible: true }
  ]
});

const mainLayout = new Layout({
  name: "mainLayout",
  height: "100%",
  cols: [
    { name: "center", flex: 1, minSize: 180 },
    { name: "right", width: 190, minSize: 120, collapsible: true }
  ]
});

const leftPanel = new Panel({
  name: "leftPanel",
  className: "dui-layout-lab-pane"
});

const centerPanel = new Panel({
  name: "centerPanel",
  className: "dui-layout-lab-pane dui-layout-lab-pane--center"
});

const rightPanel = new Panel({
  name: "rightPanel",
  className: "dui-layout-lab-pane"
});

const log = new LogPanel({
  name: "log",
  css: "dui-layout-lab-log"
});

let savedState = null;

const collapseLeftButton = new Button({
  name: "collapseLeft",
  text: "Toggle Left",

  onClick() {
    layout.toggleCell("left", {
      origin: "api"
    });
  }
});

const collapseRightButton = new Button({
  name: "collapseRight",
  text: "Toggle Right",

  onClick() {
    mainLayout.toggleCell("right", {
      origin: "api"
    });
  }
});

const collapseLogsButton = new Button({
  name: "collapseLogs",
  text: "Toggle Logs",

  onClick() {
    workspaceLayout.toggleCell("logs", {
      origin: "api"
    });
  }
});

const saveStateButton = new Button({
  name: "saveState",
  text: "Save State",

  onClick() {
    savedState = serializeWorkbenchState();
    log.write(`state saved ${JSON.stringify(savedState)}`);
  }
});

const restoreStateButton = new Button({
  name: "restoreState",
  text: "Restore State",

  onClick() {
    if (!savedState) {
      log.write("no saved state");
      return;
    }

    restoreWorkbenchState(savedState);
  }
});

const toggleHeaderButton = new Button({
  name: "toggleHeader",
  text: "Toggle Header",
  onClick() {
    layout.setHeaderVisible(!layout.isHeaderVisible(), { origin:"user", userAction:true });
  }
});

const toggleBorderButton = new Button({
  name: "toggleBorder",
  text: "Toggle Border",
  onClick() {
    layout.setBordered(!layout.isBordered(), { origin:"user", userAction:true });
  }
});

const actions = new Form({
  name: "layoutActions",
  width: "min(760px, 100%)"
}).row(
  collapseLeftButton,
  collapseRightButton,
  collapseLogsButton,
  saveStateButton,
  restoreStateButton,
  toggleHeaderButton,
  toggleBorderButton
);

const panel = new Panel("#root", {
  name: "layoutV2Panel"
}).add(layout, actions);

layout.cell("left").attach(leftPanel);
layout.cell("workspace").attach(workspaceLayout);
workspaceLayout.cell("mainArea").attach(mainLayout);
workspaceLayout.cell("logs").attach(log);
mainLayout.cell("center").attach(centerPanel);
mainLayout.cell("right").attach(rightPanel);

leftPanel.add(
  new LabelText({
    text: "Project"
  })
);

centerPanel.add(
  new LabelText({
    text: "Main workspace"
  })
);

rightPanel.add(
  new LabelText({
    text: "Inspector"
  })
);

for (const currentLayout of [layout, workspaceLayout, mainLayout]) {
  currentLayout.events.on("resizeEnd", event => {
    log.write(
      `${currentLayout.name} resize ${event.beforeCell.name}:${event.beforeSize}, ${event.afterCell.name}:${event.afterSize}`
    );
  });

  currentLayout.events.on("cellCollapse", event => {
    log.write(`${currentLayout.name} collapse ${event.cell.name}`);
  });

  currentLayout.events.on("cellExpand", event => {
    log.write(`${currentLayout.name} expand ${event.cell.name}`);
  });

  currentLayout.events.on("stateRestore", () => {
    log.write(`${currentLayout.name} state restored`);
  });
}

log.write("lab18 ready");

window.lab18 = {
  panel,
  layout,
  workspaceLayout,
  mainLayout,
  actions,
  log,
  get savedState() {
    return savedState;
  }
};

function serializeWorkbenchState() {
  return {
    layout: layout.serializeState(),
    workspace: workspaceLayout.serializeState(),
    main: mainLayout.serializeState()
  };
}

function restoreWorkbenchState(state) {
  layout.restoreState(state.layout, {
    origin: "restore"
  });
  workspaceLayout.restoreState(state.workspace, {
    origin: "restore"
  });
  mainLayout.restoreState(state.main, {
    origin: "restore"
  });
}
