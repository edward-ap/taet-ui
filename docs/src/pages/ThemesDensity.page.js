import { importsFor } from "./pageHelpers.js";
import { Button, Form, TextInput } from "../../../src/ui/index.js";

const themesSource = `const field = new TextInput({
  name: "themeValue",
  label: "Preview",
  value: "Semantic tokens"
});

let dark = false;
const toggle = new Button({
  name: "togglePreviewTheme",
  text: "Use Dark Blue",
  onClick() {
    dark = !dark;
    form.element.classList.remove(
      "dui-theme-light-blue",
      "dui-theme-dark-blue"
    );
    form.element.classList.add(
      dark ? "dui-theme-dark-blue" : "dui-theme-light-blue"
    );
    toggle.setText(dark ? "Use Light Blue" : "Use Dark Blue");
    log.write(dark ? "Dark Blue" : "Light Blue");
  }
});

const form = new Form({
  name: "themePreview",
  labelWidth: 72,
  css: "dui-docs-theme-preview dui-profile-compact dui-theme-light-blue"
})
  .row(field)
  .row(toggle);`;

export const themesDensityPage = {
  id: "themes-density",
  title: "Themes and Density",
  status: "stable",
  keywords: ["font", "Noto Sans", "css", "theme", "tokens", "density", "compact", "dark", "colors"],
  description: "Apply coherent colors, spacing and control geometry through inherited semantic CSS tokens.",
  imports: importsFor(["Button", "Form", "TextInput"]),
  paragraphs: [
    "Noto Sans is the default UI font, bundled locally with taet-ui.css under the SIL Open Font License. No Google Fonts requests are needed. Compact metrics stay at 12px text, 18px line height, 24px controls and 22px rows. Preserve the CSS-relative font assets when deploying.",
    "Tæt UI themes are CSS variable scopes. Apply a theme class and density profile to the application root; descendant controls consume semantic tokens for backgrounds, text, borders, focus, validation, spacing and geometry.",
    "A theme changes presentation without changing control contracts. The compact profile keeps toolbars, editors, grids, trees and status bands aligned to the same density scale.",
    "Per-control inline styling and selectors that depend on internal DOM break theme switching, state consistency and future component refactoring. Prefer public appearance options, semantic tokens and an application-level modifier class."
  ],
  examples: [
    {
      title: "Scoped theme tokens",
      source: themesSource,
      create({ log }) {
        const field = new TextInput({
          name: "themeValue",
          label: "Preview",
          value: "Semantic tokens"
        });

        let dark = false;
        const toggle = new Button({
          name: "togglePreviewTheme",
          text: "Use Dark Blue",
          onClick() {
            dark = !dark;
            form.element.classList.remove(
              "dui-theme-light-blue",
              "dui-theme-dark-blue"
            );
            form.element.classList.add(
              dark ? "dui-theme-dark-blue" : "dui-theme-light-blue"
            );
            toggle.setText(dark ? "Use Light Blue" : "Use Dark Blue");
            log.write(dark ? "Dark Blue" : "Light Blue");
          }
        });

        const form = new Form({
          name: "themePreview",
          labelWidth: 72,
          css: "dui-docs-theme-preview dui-profile-compact dui-theme-light-blue"
        })
          .row(field)
          .row(toggle);

        return form;
      }
    }
  ],
  tables: [
    {
      title: "Theme Classes and Tokens",
      rows: [
        { name:"dui-theme-light", type:"theme class", description:"Neutral light semantic color palette." },
        { name:"dui-theme-light-blue", type:"theme class", description:"Light desktop palette with branded blue surfaces." },
        { name:"dui-theme-dark-blue", type:"theme class", description:"Dark desktop palette using the same semantic tokens." },
        { name:"dui-profile-compact", type:"density class", description:"Shared compact control, row, toolbar and spacing geometry." },
        { name:"--dui-font-family", type:"typography token", description:"Defaults to Noto Sans, then Segoe UI / Arial / sans-serif. Override on the application/profile root; code fonts remain separate." },
        { name:"--dui-color-*", type:"color tokens", description:"Semantic backgrounds, text, borders, focus and state colors." },
        { name:"--dui-control-height", type:"density token", description:"Standard compact editor and button height." },
        { name:"--dui-gap-*", type:"spacing tokens", description:"Shared spacing scale for component and layout alignment." }
      ]
    }
  ],
  notes: [
    "Prototype Theme Editor: open /examples/theme-editor/ on the Labs or docs server. It generates scoped color tokens from OKLCH harmonies; geometry and typography are unchanged. See THEME_EDITOR_REPORT.md for the prototype contract and limitations.",
    "Import taet-ui.css once and apply the chosen theme and profile at an application root.",
    "Override semantic tokens on a container when one application area needs a scoped visual profile.",
    "To select another font, add body.dui-page { --dui-font-family: Arial, sans-serif; } after taet-ui.css. Font loading uses swap; wait for document.fonts.load when measuring text at startup.",
    "Use documented component options before adding CSS.",
    "Avoid inline styles, repeated hex colors, hardcoded control heights and selectors that target component internals."
  ]
};
