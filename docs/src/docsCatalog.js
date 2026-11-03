


import {formJSONPage} from './pages/FormJSON.page.js';

import {financialChartsPage} from './pages/FinancialCharts.page.js';
import {lineChartPage,columnChartPage,barChartPage,gaugePage} from './pages/Charts.pages.js';
import {treeJSONPage,treeGridJSONPage,propertyGridJSONPage} from './pages/CollectionJSON.pages.js';
import { gridJSONPage } from './pages/GridJSON.page.js';
import {themeDesignerPage} from './pages/ThemeDesigner.page.js';
import { scrollingLabelPage } from './pages/ScrollingLabel.page.js';
import { rgbColorPickerPage, cmykColorPickerPage } from './pages/ChannelColorPicker.pages.js';
import { fileUploadPage } from './pages/FileUpload.page.js';
import { edgeActionLayerPage } from "./pages/EdgeActionLayer.page.js";
import { treeExplorerPage } from "./pages/TreeExplorer.page.js";
import { introductionPage, quickStartPage } from "./pages/getting-started.pages.js";
import { objectModelPage } from "./pages/ObjectModel.page.js";
import { lifecycleOwnershipPage } from "./pages/LifecycleOwnership.page.js";
import { eventsMutationsPage } from "./pages/EventsMutations.page.js";
import { compositionPage } from "./pages/Composition.page.js";
import { themesDensityPage } from "./pages/ThemesDensity.page.js";
import { buttonPage } from "./pages/Button.page.js";
import { framedButtonPage, iconButtonPage, toolButtonPage } from "./pages/ButtonVariants.pages.js";
import { toggleButtonPage } from "./pages/ToggleButton.page.js";
import { borderlessIconButtonPage } from "./pages/IconButton.page.js";
import { toggleIconButtonPage } from "./pages/ToggleIconButton.page.js";
import { textInputPage } from "./pages/TextInput.page.js";
import { selectInputPage } from "./pages/SelectInput.page.js";
import { numberInputPage, passwordInputPage, maskedInputPage, dateInputPage, timeInputPage, radioInputPage, checkBoxPage } from "./pages/InputControls.pages.js";
import { gridPage, editableGridPage, filteringGridPage, selectionGridPage, largeGridPage } from "./pages/Grid.page.js";
import { propertyGridPage } from "./pages/PropertyGrid.page.js";
import { lazyLoadingGridPage } from "./pages/LazyLoading.page.js";
import { switchPage, trackBarPage, progressBarPage, filePickerPage } from "./pages/AdditionalInputs.pages.js";
import { simpleLayoutPage, borderLayoutPage, tabsLayoutPage, accordionPage } from "./pages/Layout.pages.js";
import { basicListPage, treeListPage, treeTableListPage, checkListPage } from "./pages/List.pages.js";
import { menuPage, toolbarPage, dockingPage, statusBarPage, dialogBoxPage } from "./pages/Applications.pages.js";
import { formPage } from "./pages/Form.page.js";
import { textAreaPage, colorPickerPage } from "./pages/RemainingInputs.pages.js";
import { labelTextPage, readonlyTextPage, textLayoutPage, codeBlockPage } from "./pages/TextDisplay.pages.js";
import { tooltipPage, popupPage, logPanelPage, mdiPage } from "./pages/ApplicationExtras.pages.js";


import { iconsPage, shortcutsPage } from "./pages/IconsShortcuts.pages.js";

export const docsCatalog = [
  {
    id: "getting-started",
    title: "Getting Started",
    pages: [introductionPage, quickStartPage]
  },
  {
    id: "core-concepts",
    title: "Core Concepts",
    pages: [
      objectModelPage,
      lifecycleOwnershipPage,
      eventsMutationsPage,
      compositionPage,
      themesDensityPage,
      iconsPage,
      shortcutsPage
    ]
  },
  {
    id: "components",
    title: "Components",
    groups: [{
      id: "charts",
      title: "Charts",
      pages: [lineChartPage, columnChartPage, barChartPage, gaugePage, financialChartsPage, ]
    }, {
      id: "buttons",
      title: "Buttons",
      pages: [buttonPage, framedButtonPage, iconButtonPage, borderlessIconButtonPage, toolButtonPage, toggleButtonPage, toggleIconButtonPage]
    }, {
      id: "input-controls",
      title: "Input Controls",
      pages: [textInputPage, numberInputPage, passwordInputPage, maskedInputPage, dateInputPage, timeInputPage, selectInputPage, radioInputPage, checkBoxPage, switchPage, trackBarPage, progressBarPage, filePickerPage, fileUploadPage, textAreaPage, colorPickerPage, rgbColorPickerPage, cmykColorPickerPage]
    }, {
      id: "layout-components",
      title: "Layout",
      pages: [edgeActionLayerPage, simpleLayoutPage, borderLayoutPage, tabsLayoutPage, accordionPage]
    }, {
      id: "list-components",
      title: "List",
      pages: [basicListPage, treeListPage, treeJSONPage, treeTableListPage, treeGridJSONPage, checkListPage]
    }, {
      id: "grid-components",
      title: "Grid",
      pages: [gridPage, editableGridPage, filteringGridPage, selectionGridPage, gridJSONPage, largeGridPage, lazyLoadingGridPage, propertyGridPage, propertyGridJSONPage]
    }, {
      id: "application-components",
      title: "Applications",
      pages: [treeExplorerPage, menuPage, toolbarPage, dockingPage, formPage, formJSONPage, statusBarPage, dialogBoxPage, tooltipPage, popupPage, logPanelPage, mdiPage]
    }, {
      id: "text-display-components",
      title: "Text & Display",
      pages: [labelTextPage, readonlyTextPage, textLayoutPage, codeBlockPage, scrollingLabelPage]
    }, {
      id: "advanced-components",
      title: "Advanced",
      pages: [themeDesignerPage]
    }]
  }
].map(group => group.id === "components" ? sortComponentGroup(group) : group);

function sortComponentGroup(group) {
  const byTitle = (left, right) => left.title.localeCompare(right.title, "en", { sensitivity: "base", numeric: true });
  return {
    ...group,
    groups: (group.groups ?? []).map(sortComponentGroup).sort(byTitle),
    pages: [...(group.pages ?? [])].sort(byTitle)
  };
}
