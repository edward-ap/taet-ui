import {defineConfig} from '@playwright/test';
import base from './playwright.compat.config.js';
export default defineConfig({...base,testMatch:['review-api-contracts.spec.js','lab24-overlay.spec.js','grid-edit-commit-lifecycle.spec.js','grid-render-lifetime.spec.js'],use:{...base.use,baseURL:'http://127.0.0.1:5185'},webServer:{command:'python scripts/dev-server.py --port 5185 --bind 127.0.0.1',url:'http://127.0.0.1:5185/browser-tests/recipes.html',reuseExistingServer:false,timeout:15000}});
