import {createPreview} from '../../src/ui/theme-designer/preview.js';
const preview=createPreview(document.body);
for(const key of ['applyTheme','highlightAnchor','anchorScopes','setScopeLabels'])window[key]=preview[key];
Object.defineProperty(window,'onAnchorHover',{get:()=>preview.onAnchorHover,set:v=>preview.onAnchorHover=v});
window.addEventListener('pagehide',()=>preview.destroy(),{once:true});
