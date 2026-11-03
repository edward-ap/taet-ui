import { CommandRegistry, Panel, Toolbar } from "../../src/ui/all.js";

export function createCommandToolbar(container, project) {
  const commands = new CommandRegistry({
    contextProvider: {
      getContext: () => ({ project }),
      events: project.events
    }
  });

  commands.register("project.save", {
    label: "Save",
    shortcut: "Ctrl+S",
    enabled: context => context.project.isDirty(),
    run: context => context.project.save()
  });

  const toolbar = new Toolbar({ name: "projectToolbar", commands })
    .addCommand("project.save");
  const screen = new Panel(container, { name: "projectScreen" }).add(toolbar);

  return {
    commands,
    screen,
    destroy() {
      screen.destroy();
      commands.destroy();
    }
  };
}
