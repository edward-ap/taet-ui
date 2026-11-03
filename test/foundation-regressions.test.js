import test from 'node:test';
import assert from 'node:assert/strict';
import {BaseControl} from '../src/core/BaseControl.js';
import {CommandRegistry} from '../src/core/CommandRegistry.js';
import {ShortcutManager} from '../src/core/ShortcutManager.js';
import {Panel} from '../src/ui/Panel.js';
import {Form} from '../src/ui/Form.js';
import {TextInput} from '../src/ui/TextInput.js';

test('Form removal forgets pending rows/columns, values and subscriptions before mount',()=>{
 const first=new TextInput({name:'first',value:'Ada'}),email=new TextInput({name:'email',value:'old'});
 const form=new Form().columns(Form.column(first),Form.column(email));
 assert.equal(email.parent,form);
 assert.equal(form.remove(email),email);assert.equal(email.destroyed,true);
 assert.deepEqual(form.value.get(),{first:'Ada'});assert.deepEqual(form.getFields(),[first]);
 assert.doesNotThrow(()=>form.value.set({first:'Ed',email:'ignored'}));
 assert.equal(form.validate().ok,true);assert.doesNotThrow(()=>form.reset());
 const replacement=new TextInput({name:'email',value:'new'});form.row(replacement);
 assert.equal(form.getItem('email'),replacement);assert.equal(form.value.get().email,'new');
 replacement.destroy();assert.equal(form.getItem('email'),null);assert.ok(!('email' in form.value.get()));
 form.destroy();assert.equal(first.destroyed,true);
});

for(const name of ['__proto__','constructor','prototype','toString'])test('Form preserves own field '+name,()=>{
 const field=new TextInput({name,value:'safe'}),form=new Form().row(field);
 const value=form.value.get();assert.equal(Object.getPrototypeOf(value),Object.prototype);
 assert.equal(Object.hasOwn(value,name),true);assert.equal(value[name],'safe');
 form.remove(name);assert.deepEqual(form.value.get(),{});form.destroy();
});

test('Form validates all composition slots before claiming duplicate controls or keys',()=>{
 const owner=new Form(),a=new TextInput({name:'same'}),b=new TextInput({name:'same'});
 assert.throws(()=>owner.row(a,b),/Duplicate/);
 assert.equal(a.parent,null);assert.equal(b.parent,null);assert.deepEqual(owner.getItems(),[]);
 owner.row(a);assert.throws(()=>owner.row(a),/only one composition slot/);
 owner.destroy();b.destroy();
});

for(const [phase,method]of [['beforeSubmit','submit'],['submit','submit'],['beforeValueSet','set'],['valueSet','set'],['beforeClear','clear'],['clear','clear'],['beforeReset','reset'],['reset','reset']]){
 test('Form '+phase+' may close its owning screen',()=>{
  const field=new TextInput({name:'name',value:'Ada'}),form=new Form().row(field);
  let after=0;form.events.on(phase,()=>form.destroy());
  form.events.on('afterSubmit',()=>after++);form.events.on('afterClear',()=>after++);form.events.on('afterReset',()=>after++);
  assert.doesNotThrow(()=>method==='submit'?form.submit():method==='set'?form.value.set({name:'Ed'}):method==='clear'?form.value.clear():form.reset());
  assert.equal(form.destroyed,true);assert.equal(field.destroyed,true);assert.equal(after,0);
 });
}

test('destroying Form during one field write stops later writes and late snapshot listeners',()=>{
 let form;const a=new TextInput({name:'a',onChange(){form.destroy();}}),b=new TextInput({name:'b'});
 form=new Form().row(a,b);assert.equal(form.value.set({a:'first',b:'second'}),false);
 assert.equal(b.value.get(),'');assert.equal(a.destroyed,true);assert.equal(b.destroyed,true);
});

test('validator teardown cannot resume submit on a destroyed Form',()=>{
 let form;const field=new TextInput({name:'name',validators:[()=>{form.destroy();return true;}]});
 form=new Form().row(field);assert.equal(form.submit(),false);assert.equal(form.destroyed,true);
});

test('terminal ownership rejects a new child before touching its state',()=>{
 const owner=new Panel(),child=new BaseControl(),late=new BaseControl();
 owner.addControl(child);child.disposables.add(()=>assert.throws(()=>owner.addControl(late),/destroyed control/));
 owner.destroy();assert.equal(owner.destroyed,true);assert.equal(child.destroyed,true);
 assert.equal(late.parent,null);assert.equal(late.mounted,false);assert.deepEqual(owner.getItems(),[]);
 late.destroy();
});

for(const phase of ['beforeShow','show','beforeHide','hide'])test('BaseControl '+phase+' stops after teardown',()=>{
 const c=new BaseControl({visible:phase.toLowerCase().includes('hide')});
 let after=0;c.events.on(phase,()=>c.destroy());c.events.on('afterShow',()=>after++);c.events.on('afterHide',()=>after++);
 assert.doesNotThrow(()=>phase.toLowerCase().includes('show')?c.show():c.hide());
 assert.equal(c.destroyed,true);assert.equal(after,0);
});

function keyboard(options={}){return {key:'s',ctrlKey:false,metaKey:false,altKey:false,shiftKey:false,target:{tagName:'BODY'},defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...options};}
test('ShortcutManager respects native editor keys, prevented events and IME; opt-in is explicit',()=>{
 let runs=0;const commands=new CommandRegistry();commands.register('save',{run(){runs++;}});
 const keys=new ShortcutManager({commands,autoListen:false});keys.bind('save','Ctrl+S');
 for(const event of [keyboard({ctrlKey:true,target:{tagName:'INPUT'}}),keyboard({ctrlKey:true,defaultPrevented:true}),keyboard({ctrlKey:true,isComposing:true}),keyboard({ctrlKey:true,keyCode:229})])assert.equal(keys.handleKeyboardEvent(event),false);
 assert.equal(runs,0);keys.bind('save','Ctrl+S',{allowInTextInput:true});
 assert.equal(keys.handleKeyboardEvent(keyboard({ctrlKey:true,target:{tagName:'INPUT'}})),true);assert.equal(runs,1);
 keys.destroy();commands.destroy();
});

test('Meta exact binding wins over portable Ctrl/Cmd fallback; keys remain semantic',()=>{
 const runs=[];const commands=new CommandRegistry();commands.register('portable',{run(){runs.push('portable');}});commands.register('meta',{run(){runs.push('meta');}});
 const keys=new ShortcutManager({commands,autoListen:false});keys.bind('portable','Cmd+S');
 keys.handleKeyboardEvent(keyboard({metaKey:true}));keys.bind('meta','Meta+S');keys.handleKeyboardEvent(keyboard({metaKey:true}));
 keys.handleKeyboardEvent(keyboard({ctrlKey:true}));
 assert.equal(keys.handleKeyboardEvent(keyboard({ctrlKey:true,key:'ы',code:'KeyS'})),false);
 assert.deepEqual(runs,['portable','meta','portable']);keys.destroy();commands.destroy();
});

test('a command may dispose its ShortcutManager while executing',()=>{
 const commands=new CommandRegistry();let keys;
 commands.register('close',{run(){keys.destroy();}});keys=new ShortcutManager({commands,autoListen:false});keys.bind('close','Ctrl+W');
 assert.equal(keys.handleKeyboardEvent(keyboard({key:'w',ctrlKey:true})),true);commands.destroy();
});
