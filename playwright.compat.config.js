import { defineConfig } from '@playwright/test';
import base from './playwright.config.js';

// Portable browser contracts. This does not certify a native WebView host.
export default defineConfig({
  ...base,
  testMatch: ['branding-compat.spec.js', 'grid-row-reorder.spec.js', 'tree-grid-date-sort.spec.js', 'integration-recipes.spec.js', 'foundation-regressions.spec.js', 'ownership-reentry.spec.js', 'review-api-contracts.spec.js', 'mapper-lists.spec.js', 'theme-applicator.spec.js', 'theme-designer.spec.js', 'circular-slider.spec.js', 'hiding-side-panel.spec.js', 'progress-foreground.spec.js', 'reader-shell-contracts.spec.js', 'theme-editor.spec.js', 'theme-editor-toolbar.spec.js', 'scrolling-label.spec.js', 'trackbar-presentation.spec.js', 'channel-color-picker.spec.js', 'file-upload.spec.js', 'edge-action-layer.spec.js', 'tree-explorer.spec.js', 'release-hardening.spec.js', 'callback-reentry.spec.js', 'tree-callback-reentry.spec.js', 'tree-grid-move.spec.js', 'projection-callbacks.spec.js', 'data-store-reentry.spec.js', 'grid-render-lifetime.spec.js', 'grid-edit-policy.spec.js', 'grid-selection-lifecycle.spec.js', 'grid-common-contract.spec.js', 'grid-gutter.spec.js', 'grid-column-menu.spec.js', 'grid-best-fit.spec.js', 'grid-workbench.spec.js', 'grid-editor-matrix.spec.js', 'grid-editor-demo.spec.js', 'grid-editor-presentation.spec.js', 'grid-transfer-human.spec.js', 'grid-transfer-gutter.spec.js', 'grid-transfer.spec.js', 'grid-column-layout.spec.js', 'grid-multi-marker.spec.js', 'grid-checkbox-presentation.spec.js', 'grid-radio-presentation.spec.js', 'keyboard-acceptance.spec.js', 'icon-button.spec.js', 'lab24-overlay.spec.js', 'modal-tab-containment.spec.js', 'select-icons.spec.js'],
  outputDir: 'test-results/compat',
  projects: ['chromium', 'firefox', 'webkit'].map(browserName => ({ name: browserName, workers: process.platform === 'win32' && browserName === 'webkit' ? 1 : undefined, use: { browserName } }))
});
