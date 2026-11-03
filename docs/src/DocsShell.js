import { DockLayout, Layout, Panel, Toolbar, TreeList, TextInput, Button, LabelText } from "../../src/ui/all.js";
import { ComponentPage } from "./ComponentPage.js";

const THEME_CLASSES = ["dui-theme-light-blue", "dui-theme-dark-blue"];

export class DocsShell extends Panel {
  constructor(containerOrOptions = {}, maybeOptions) {
    const hasContainer =
      typeof containerOrOptions === "string" ||
      (typeof HTMLElement !== "undefined" && containerOrOptions instanceof HTMLElement);
    const options = hasContainer ? maybeOptions ?? {} : containerOrOptions ?? {};

    super({ ...options, className:"dui-docs-shell" });

    this.catalog = normalizeCatalog(options.catalog ?? []);
    this.pages = new Map(collectPages(this.catalog).map(page => [page.id, page]));
    this.currentPageId = null;
    this._navigationQuery = null;
    this._navigationExpandedIds = ["getting-started", "core-concepts", "components"];
    this._layout = null;
    this._dockLayout = null;
    this._navigationDockPanel = null;
    this._workspaceDockPanel = null;
    this._toolbar = null;
    this._tree = null;
    this._pageHost = null;
    this._search = null;
    this._themeButton = null;

    if (hasContainer) {
      this.mount(containerOrOptions);
    }
  }

  mount(container) {
    super.mount(container);

    if (!this._layout) {
      this._buildShell();
      this.disposables.addEventListener(window, "hashchange", () => this._navigateFromHash());
      this._navigateFromHash();
    }

    return this;
  }

  navigate(pageId, options = {}) {
    const page = this.pages.get(pageId);
    if (!page) {
      return false;
    }

    if (this.currentPageId !== pageId) {
      this.currentPageId = pageId;
      this._pageHost.clear();
      this._pageHost.add(new ComponentPage({ page }));
    }

    const treeItem = this._tree.data.get(pageId);
    if (treeItem) {
      this._tree.selection.set([treeItem], { origin:"system" });
    }

    if (options.updateHash !== false && location.hash !== `#${pageId}`) {
      history.pushState(null, "", `#${pageId}`);
    }

    document.title = `${page.title} - Tæt UI`;
    return true;
  }

  selectFirst() {
    const first = this.pages.values().next().value;
    return first ? this.navigate(first.id) : false;
  }

  destroy() {
    super.destroy();
    this._layout = null;
    this._dockLayout = null;
    this._navigationDockPanel = null;
    this._workspaceDockPanel = null;
    this._toolbar = null;
    this._tree = null;
    this._pageHost = null;
    this._search = null;
    this._themeButton = null;
  }

  _buildShell() {
    this._layout = new Layout({
      name: "docsLayout",
      direction: "rows",
      width: "100%",
      height: "100%",
      resizable: false,
      rows: [
        { name:"toolbar", height:36, resizable:false },
        { name:"content", flex:1, minSize:220, resizable:false }
      ]
    });

    this._dockLayout = new DockLayout({
      name: "docsDockLayout",
      css: "dui-docs-content-dock",
      width: "100%",
      height: "100%",
      areaSizes: {
        left: 248
      }
    });

    this._toolbar = new Toolbar({ name:"documentation", css:"dui-docs-toolbar" });
    this._search = new TextInput({
      name: "docsSearch",
      label: "",
      placeholder: "Find component",
      css: "dui-docs-search"
    });
    this._themeButton = new Button({
      name: "theme",
      text: "Dark",
      onClick: () => this._toggleTheme()
    });

    this._toolbar.add(
      new LabelText({ text:"Tæt UI", className:"dui-docs-brand" }),
      new LabelText({ text:"Object-first desktop UI toolkit", className:"dui-docs-subtitle" }),
      this._search,
      this._themeButton
    );

    this._pageHost = new Panel({
      name: "pageHost",
      className: "dui-docs-page-host",
      scroll: "auto"
    });
    this._tree = new TreeList({
      name: "docsNavigation",
      width: "100%",
      height: "100%",
      textField: "title",
      expandAll: false,
      className: "dui-docs-tree"
    });

    this.add(this._layout);
    this._layout.cell("toolbar").attach(this._toolbar);
    this._layout.cell("content").attach(this._dockLayout);

    const compactNavigation = globalThis.matchMedia?.("(max-width: 600px)").matches === true;
    this._navigationDockPanel = this._dockLayout.addPanel({
      name: "docsNavigationPanel",
      title: "Contents",
      area: "left",
      css: "dui-docs-navigation-panel",
      closeable: false,
      collapsible: true,
      pinnable: false,
      movable: false,
      collapsed: compactNavigation,
      autoHide: compactNavigation,
      content: this._tree
    });
    this._workspaceDockPanel = this._dockLayout.addPanel({
      name: "docsWorkspacePanel",
      title: "Documentation",
      area: "center",
      css: "dui-docs-workspace-panel",
      closeable: false,
      collapsible: false,
      pinnable: false,
      movable: false,
      content: this._pageHost
    });

    this._renderNavigation("");
    this._tree.events.on("selectionChange", event => {
      const selected = event.items[0];
      if (selected?.pageId) {
        this.navigate(selected.pageId);
      }
    });
    this._search.events.on("change", event => this._renderNavigation(event.newValue));
  }

  _renderNavigation(query) {
    const normalized = String(query ?? "").trim().toLowerCase();
    if (this._navigationQuery === "") {
      this._navigationExpandedIds = this._tree.treeView.getExpandedIds();
    }
    const items = navigationItems(this.catalog, normalized);

    this._tree.data.parse(items, { origin:"system" });
    this._tree.collapseAll({ silent:true, origin:"system" });
    if (normalized) {
      this._tree.expandAll({ silent:true, origin:"system" });
    } else {
      for (const id of this._navigationExpandedIds) {
        if (this._tree.data.get(id)) this._tree.expand(id, { silent:true, origin:"system" });
      }
    }
    this._navigationQuery = normalized;
    this._tree.refresh();

    const selected = this._tree.data.get(this.currentPageId);
    this._tree.selection.set(selected ? [selected] : [], { origin:"system" });
  }

  _navigateFromHash() {
    const requested = decodeURIComponent(location.hash.slice(1));
    if (requested && this.navigate(requested, { updateHash:false })) {
      return;
    }
    this.selectFirst();
  }

  _toggleTheme() {
    const body = document.body;
    const dark = !body.classList.contains("dui-theme-dark-blue");
    body.classList.remove(...THEME_CLASSES);
    body.classList.add(dark ? "dui-theme-dark-blue" : "dui-theme-light-blue");
    this._themeButton.setText(dark ? "Light Blue" : "Dark");
  }
}

function normalizeCatalog(catalog) {
  return catalog.map(group => ({
    id: String(group.id),
    title: String(group.title),
    groups: normalizeCatalog(group.groups ?? []),
    pages: (group.pages ?? []).map(page => ({ ...page, id:String(page.id), title:String(page.title) }))
  }));
}

function collectPages(groups) {
  return groups.flatMap(group => [...collectPages(group.groups), ...group.pages]);
}

function navigationItems(groups, query, parentId = null) {
  return groups.flatMap(group => {
    // Matching a group includes its whole subtree; matching a page retains its ancestors.
    const childQuery = group.title.toLowerCase().includes(query) ? "" : query;
    const children = [
      ...navigationItems(group.groups, childQuery, group.id),
      ...group.pages
        .filter(page => !childQuery || pageSearchText(page).includes(childQuery))
        .map(page => ({ id:page.id, parentId:group.id, pageId:page.id, title:page.title }))
    ];
    return children.length ? [{ id:group.id, parentId, title:group.title }, ...children] : [];
  });
}

function pageSearchText(page) {
  return [page.title, page.description, ...(page.keywords ?? [])].join(" ").toLowerCase();
}
