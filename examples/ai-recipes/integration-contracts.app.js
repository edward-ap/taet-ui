import { createIntegrationRecipes } from './12-integration-contracts.js';
window.integrationRecipes = createIntegrationRecipes('#integration-root');
window.addEventListener('pagehide', () => window.integrationRecipes.destroy(), { once: true });
