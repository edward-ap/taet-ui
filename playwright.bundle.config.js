import {defineConfig} from '@playwright/test';
import base from './playwright.config.js';
export default defineConfig({...base,testMatch:['bundle.spec.js', 'default-font.spec.js', 'global-bundle.spec.js'],outputDir:'test-results/bundle',
 projects:['chromium','firefox','webkit'].map(browserName=>({name:browserName,workers:process.platform==='win32'&&browserName==='webkit'?1:undefined,use:{browserName}}))});
