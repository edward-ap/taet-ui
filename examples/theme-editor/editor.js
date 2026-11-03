import {createEditor} from '../../src/ui/theme-designer/editor.js';
const editor=createEditor(document.body,{storage:localStorage});
window.denseThemeEditor=window.taetThemeEditor=editor;
window.addEventListener('pagehide',()=>editor.destroy(),{once:true});
