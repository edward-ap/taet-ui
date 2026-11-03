import { Panel } from "../../src/ui/all.js";

export class ExampleHost extends Panel {
  constructor(options = {}) {
    super({ ...options, className:"dui-example-host" });
    this.example = options.example ?? {};
    this._liveElement = null;
    this._outputElement = null;
  }

  createElement() {
    const root = document.createElement("section");
    root.className = "dui-control dui-example-host";
    root.dataset.duiControlId = this.id;

    const title = document.createElement("h3");
    title.className = "dui-example-host__title";
    title.textContent = this.example.title ?? "Example";

    const live = document.createElement("div");
    live.className = "dui-example-host__live";

    const output = document.createElement("div");
    output.className = "dui-example-host__output";
    output.setAttribute("aria-live", "polite");
    output.textContent = this.example.initialLog ?? "Ready";

    root.append(title, live, output);
    if (this.example.styles) {
      const styles = document.createElement("style");
      styles.textContent = this.example.styles;
      root.append(styles);
    }

    this._liveElement = live;
    this._outputElement = output;
    return root;
  }

  mount(container) {
    super.mount(container);

    if (this.items.length === 0) {
      const log = {
        write: value => {
          if (this._outputElement) {
            this._outputElement.textContent = String(value);
          }
        },
        clear: () => {
          if (this._outputElement) {
            this._outputElement.textContent = "";
          }
        }
      };

      const control = this.example.create?.({ log, container: this._liveElement });
      if (control) {
        this.attach(control, { container:this._liveElement });
      }

    }

    return this;
  }
}
