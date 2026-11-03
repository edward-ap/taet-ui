import {ReadonlyText} from 'taet-ui';
import {DockLayout} from 'taet-ui/experimental';

// DockLayout owns the content shorthand; a bare DockPanel does not consume it.
export function createDock(host:HTMLElement) {
  const dock=new DockLayout(host,{panels:[{id:'main',area:'center',content:new ReadonlyText({text:'Main'})}]});
  dock.addPanel({id:'properties',area:'right',content:new ReadonlyText({text:'Properties'})});
  dock.restoreState(dock.serializeState(),{silent:true});
  return dock;
}
