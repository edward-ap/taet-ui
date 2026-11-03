import { PropertyGrid } from "../../src/ui/all.js";

export function createPropertyGrid(container, settings) {
  const source = {
    getProperties() {
      return [
        {
          title: "General",
          properties: [
            {
              name: "name",
              label: "Name",
              type: "text",
              value: settings.name,
              set: value => { settings.name = value; }
            },
            {
              name: "enabled",
              label: "Enabled",
              type: "boolean",
              value: settings.enabled,
              set: value => { settings.enabled = value; }
            }
          ]
        }
      ];
    }
  };

  return new PropertyGrid(container, {
    name: "settingsProperties",
    labelWidth: 120,
    source
  });
}
