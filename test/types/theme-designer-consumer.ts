import {ThemeDesigner} from 'taet-ui/experimental';
import type {ThemeDesignerHost,ThemePreset} from 'taet-ui/experimental';
export function checkThemeDesigner(host:HTMLElement){
 const applied:ThemePreset[]=[];
 const adapter:ThemeDesignerHost={applyPreset:({preset,signal})=>{if(!signal.aborted)applied.push(preset);}};
 const first=new ThemeDesigner(host,{preview:true,width:1100,height:650,host:adapter});
 const second=new ThemeDesigner(host,{maxColors:2});
 const subscription=second.events.on('change',event=>{const tokens:Record<string,string>=event.theme.tokens;void tokens;});subscription.off();
 const preset=first.getPreset();preset.name='Installed consumer';first.setPreset(preset);
 if(second.getPreset().name!=='Light Blue')throw Error('Shared preset state');
 if(!first.getTheme().tokens['--dui-color-bg'])throw Error('Missing generated theme');
 const snapshot=first.getPreset();snapshot.name='Mutated copy';
 if(first.getPreset().name!=='Installed consumer')throw Error('Live getter');
 const disconnect=first.connectHost(adapter);disconnect();
 first.destroy();second.destroy();
 if(host.querySelector('.dui-theme-designer'))throw Error('Designer DOM leaked');
}

export async function checkThemeApplication(host: HTMLElement) {
 const {ThemeApplicator} = await import('taet-ui/experimental');
 const designer = new ThemeDesigner(host);
 const app = new ThemeApplicator(host,{scopes:[{selector:'.toolbar',role:'primary',parts:['surface']}]});
 app.apply(designer.getTheme()).clear();
 app.destroy();designer.destroy();
}
