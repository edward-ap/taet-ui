import { Panel, CodeBlock, Grid } from "../../src/ui/all.js";
import { ExampleHost } from "./ExampleHost.js";

export class ComponentPage extends Panel {
  constructor(options = {}) {
    super({ ...options, className:"dui-component-page" });
    this.page = options.page;
  }

  createElement() {
    const article = document.createElement("article");
    article.className = "dui-control dui-component-page";
    article.dataset.duiControlId = this.id;
    return article;
  }

  mount(container) {
    super.mount(container);
    if (this.element.childElementCount === 0) {
      this._renderPage();
    }
    return this;
  }

  _renderPage() {
    const page = this.page;
    const heading = document.createElement("header");
    heading.className = "dui-component-page__heading";

    const titleLine = document.createElement("div");
    titleLine.className = "dui-component-page__title-line";
    const title = document.createElement("h1");
    title.textContent = page.title;
    titleLine.append(title);

    if (page.status) {
      const status = document.createElement("span");
      status.className = `dui-doc-status dui-doc-status--${page.status}`;
      status.textContent = page.status;
      titleLine.append(status);
    }

    const description = document.createElement("p");
    description.textContent = page.description;
    heading.append(titleLine, description);
    this.element.append(heading);

    if (page.imports?.length) {
      const host = this._createSection("Import");
      this.attach(new CodeBlock({
        language: "js",
        code: page.imports.join("\n"),
        copyButton: true
      }), { container:host });
    }

    if (page.paragraphs?.length) {
      const host = this._createSection(page.overviewTitle ?? "Overview");
      for (const text of page.paragraphs) {
        const paragraph = document.createElement("p");
        paragraph.textContent = text;
        host.append(paragraph);
      }
    }

    for (const section of page.sections ?? []) {
      const host = this._createSection(section.title);
      const control = section.create?.();

      if (control) {
        this.attach(control, { container:host });
      }
    }

    if (page.examples?.length) {
      for (const example of page.examples) {
        const suffix = page.examples.length > 1 ? `: ${example.title}` : "";
        const liveHost = this._createSection(`Live Example${suffix}`);
        if (example.description) {
          const description = document.createElement("p");
          description.textContent = example.description;
          liveHost.append(description);
        }
        this.attach(new ExampleHost({ example }), { container:liveHost });

        const codeHost = this._createSection(`Code Example${suffix}`);
        this.attach(new CodeBlock({
          language: example.language ?? "js",
          code: example.source ?? "",
          copyButton: true
        }), { container:codeHost });
        if (example.styles) {
          const stylesHost = this._createSection(`CSS${suffix}`);
          this.attach(new CodeBlock({
            language: "css",
            code: example.styles,
            copyButton: true
          }), { container:stylesHost });
        }
      }
    }

    for (const table of page.tables ?? []) {
      this._renderApiTable(table.title, table.rows);
    }

    this._renderApiTable("Options", page.options);
    this._renderApiTable("Methods", page.methods);
    this._renderApiTable("Events", page.events);

    if (page.notes?.length) {
      const host = this._createSection("Notes and Best Practices");
      const list = document.createElement("ul");
      for (const note of page.notes) {
        const item = document.createElement("li");
        item.textContent = note;
        list.append(item);
      }
      host.append(list);
    }
  }

  _renderApiTable(title, rows) {
    if (!rows?.length) {
      return;
    }

    const host = this._createSection(title);
    const grid = new Grid({
      name: `${this.page.id}-${title.toLowerCase()}`,
      className: "dui-docs-api-grid",
      width: "100%",
      height: 26 + rows.length * 24,
      rowHeight: 24,
      virtualRows: false,
      columnMenu: false,
      columnReorder: false,
      rangeSelection: false,
      clipboard: false,
      columns: [
        { id:"name", title:"Name", width:190, minWidth:120 },
        { id:"type", title:"Type / Payload", width:230, minWidth:150 },
        { id:"description", title:"Description", width:"minmax(260px, 1fr)", minWidth:260 }
      ]
    });
    grid.data.parse(rows.map((row, index) => ({ id:`${title}-${index}`, ...row })), {
      silent: true,
      origin: "import"
    });
    this.attach(grid, { container:host });
  }

  _createSection(title) {
    const section = document.createElement("section");
    section.className = "dui-component-page__section";
    const heading = document.createElement("h2");
    heading.textContent = title;
    const content = document.createElement("div");
    content.className = "dui-component-page__section-content";
    section.append(heading, content);
    this.element.append(section);
    return content;
  }
}
