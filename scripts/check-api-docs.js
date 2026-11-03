import { readFileSync, writeFileSync } from "node:fs";
import * as stable from "../src/ui/index.js";
import * as experimental from "../src/ui/experimental.js";
import * as core from "../src/core/index.js";
import * as editors from "../src/ui/GridEditors.js";
import * as grid from "../src/ui/grid-api.js";
import * as inputs from "../src/ui/inputs.js";

const url = new URL("../docs/STABLE_API.md", import.meta.url);
const before = readFileSync(url, "utf8");
const inventory = [
  "<!-- api-inventory:start -->",
  "### Stable v0.x", "",
  ...Object.keys(stable).sort().map(name => `- \`${name}\``),
  "", "### Experimental", "",
  ...Object.keys(experimental).sort().map(name => `- \`${name}\``),
  "", "### Typed core entry point", "",
  ...Object.keys(core).sort().map(name => `- \`${name}\``),
  "", "### Grid editor entry point (experimental)", "",
  ...Object.keys(editors).sort().map(name => `- \`${name}\``),
  "", "### Typed Grid entry point (experimental)", "",
  ...Object.keys(grid).sort().map(name => `- \`${name}\``),
  "", "### Typed inputs entry point", "",
  ...Object.keys(inputs).sort().map(name => `- \`${name}\``),
  "<!-- api-inventory:end -->"
].join("\n");
const marker = /<!-- api-inventory:start -->[\s\S]*?<!-- api-inventory:end -->/;
if (!marker.test(before)) throw new Error("API inventory markers are missing.");
const after = before.replace(marker, inventory);
if (process.argv.includes("--write")) {
  writeFileSync(url, after);
} else if (before !== after) {
  throw new Error("API inventory is stale. Run npm run docs:api and review the changes.");
}
console.log(`API inventory OK: ${Object.keys(stable).length} stable, ${Object.keys(experimental).length} experimental, ${Object.keys(core).length} typed core, ${Object.keys(editors).length} grid editor, ${Object.keys(grid).length} typed grid, ${Object.keys(inputs).length} typed input exports`);

const tierEntries=[['Foundation',await import('../src/foundation/index.js')],['Components',await import('../src/components/index.js')],['Advanced',await import('../src/advanced/index.js')]];
const tierUrl=new URL('../docs/TIERS.md',import.meta.url),tierBefore=readFileSync(tierUrl,'utf8');
const tierInventory=['<!-- tier-inventory:start -->',...tierEntries.flatMap(([name,api])=>['','## '+name+' symbols','',...Object.keys(api).sort().map(key=>'- '+key)]),'<!-- tier-inventory:end -->'].join('\n');
const tierAfter=tierBefore.replace(/<!-- tier-inventory:start -->[\s\S]*?<!-- tier-inventory:end -->/,tierInventory);
if(process.argv.includes('--write'))writeFileSync(tierUrl,tierAfter);
else if(tierBefore!==tierAfter)throw Error('Tier inventory stale: run docs:api');
