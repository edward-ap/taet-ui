const query=new URLSearchParams(location.search);
const name=query.get('profile')??'full';
const profile=name==='full'?'':name+'/';
const suffix=query.get('min')==='0'?'':'.min';
const base=new URL('../dist/'+profile,import.meta.url);
const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('taet-ui'+suffix+'.css',base);
const ready=new Promise((resolve,reject)=>{css.onload=resolve;css.onerror=()=>reject(Error('CSS failed'));});document.head.append(css);
const assert=(ok,message)=>{if(!ok)throw Error(message);};
try{
 await ready;const ui=await import(new URL('taet-ui'+suffix+'.js',base));window.ui=ui;
 window.runBundleSmoke=async()=>{
  const host=document.querySelector('#root');const owned=[];
  try{
   await document.fonts.load('14px "Noto Sans"');assert(document.fonts.check('14px "Noto Sans"'),'Local font');
   const store=new ui.DataStore();owned.push(store);let changes=0;store.events.on('change',()=>changes++);
   store.parse([{id:1,name:'Ada'}],{silent:true});assert(changes===0&&store.get(1).name==='Ada','Foundation silent data');
   const commands=new ui.CommandRegistry();owned.push(commands);let runs=0;commands.register('run',{run(){runs++;}});commands.execute('run');assert(runs===1,'Command');
   for(const excluded of ['RenderViewport','Painter','StockChart','SpectrumAnalyzer','FlatFileDesigner','PivotGrid'])assert(!(excluded in ui),'Deferred '+excluded);
   if(ui.Panel){
    const field=new ui.TextInput({name:'name',label:'Name',value:'Ada'});
    const form=new ui.Form().row(field);const panel=new ui.Panel(host,{width:800,height:500}).add(form);owned.push(panel);
    form.value.set({name:'Ed'},{silent:true});assert(field.getFocusElement().value==='Ed','Form input');
    form.remove(field);assert(!('name' in form.value.get()),'Removed field');
    const tree=new ui.TreeExplorer({height:150,items:[{id:'root',parentId:null,kind:'folder',name:'Root'}]});panel.add(tree);assert(tree.getResources().length===1,'Tree');
    const dialog=new ui.Dialog({title:'Bundle dialog',buttons:[{text:'OK',result:'ok'}]});owned.push(dialog);
    const result=dialog.showModal();dialog.close('ok');assert(await result==='ok','Dialog');
    const app=new ui.ThemeApplicator(panel);app.apply({tokens:{'--dui-color-bg':'#112233'}});app.destroy();
    if(ui.Chart){
     const chart=new ui.Chart({series:[{id:'amount',valueField:'amount'}],height:150});panel.add(chart);chart.data.parse([{id:1,label:'One',amount:12}]);chart.refresh();assert(chart.element.querySelector('.dui-chart__mark'),'Advanced chart');
     const designer=new ui.ThemeDesigner({maxColors:2});panel.add(designer);assert(designer.getTheme().tokens['--dui-color-bg'],'Theme designer');
    }
   }else assert(name==='foundation','Missing components');
   return {profile:name,minified:Boolean(suffix),exports:Object.keys(ui).length,font:document.fonts.check('14px "Noto Sans"')};
  }finally{for(const item of owned.reverse())item.destroy();assert(!host.children.length,'Owned DOM leaked');}
 };window.bundleReady=true;
 if(query.has('autorun'))window.bundleResult=await window.runBundleSmoke();
}catch(error){window.bundleError=String(error.stack??error);}
