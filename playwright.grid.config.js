import {defineConfig} from '@playwright/test';
import base from './playwright.config.js';
export default defineConfig({...base,
 testMatch:['grid-*.spec.js','tree-grid-window.spec.js','tree-grid-move.spec.js','lab22-grid.spec.js','lab23-tree-grid.spec.js','keyboard-acceptance.spec.js'],
 outputDir:'test-results/grid-acceptance',
 projects:['chromium','firefox','webkit'].map(browserName=>({name:browserName,use:{browserName}}))
});
