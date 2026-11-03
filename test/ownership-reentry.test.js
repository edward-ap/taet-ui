import test from 'node:test';
import assert from 'node:assert/strict';
import {BaseControl} from '../src/core/BaseControl.js';
import {Panel} from '../src/ui/Panel.js';
import {Form} from '../src/ui/Form.js';
import {TextInput} from '../src/ui/TextInput.js';

// A small DOM host for ownership bookkeeping; real browser cases cover rendering.
class Element {
 constructor(){this.children=[];this.dataset={};this.parentElement=null;this.style={setProperty(){},removeProperty(){}};this.classList={add(){},remove(){},toggle(){},contains(){return false;}};}
 appendChild(child){child.remove();child.parentElement=this;this.children.push(child);return child;}
 append(...children){children.forEach(c=>this.appendChild(c));}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this);this.parentElement=null;}
 addEventListener(){} removeEventListener(){} hasAttribute(){return false;} querySelectorAll(){return [];} setAttribute(){} removeAttribute(){}
}
globalThis.HTMLElement=Element;
globalThis.document={createElement(){return new Element();}};
class Field extends BaseControl {
 constructor(options={}){super(options);let v=options.value??'';this.value={get:()=>v,set:value=>{this._assertMutable('value.set');v=value;},clear:()=>{this._assertMutable('value.clear');v='';}};}
}

test('Form attach stops registration when childAdd closes the owner',()=>{
 const form=new Form(),field=new Field({name:'a'}),host=new Element();
 form.events.on('childAdd',()=>form.destroy());
 assert.equal(form.attach(field,{container:host}),null);
 assert.ok(form.destroyed&&field.destroyed);assert.equal(host.children.length,0);assert.equal(form._fieldSubscriptions.size,0);
});
for(const phase of ['beforeChildAdd','childAdd'])for(const layout of ['row','columns'])test('Form '+layout+' mount stops after '+phase+' teardown',()=>{
 const form=new Form(),a=new Field({name:'a'}),b=new Field({name:'b'}),host=new Element();
 if(layout==='row')form.row(a,b);else form.columns([a],[b]);
 let calls=0;form.events.on(phase,()=>{calls++;form.destroy();});
 assert.doesNotThrow(()=>form.mount(host));assert.equal(calls,1);assert.ok(form.destroyed&&a.destroyed&&b.destroyed);assert.equal(host.children.length,0);
});
test('Panel add stops after callback closes owner without taking the next child',()=>{
 const p=new Panel(new Element()),a=new BaseControl(),b=new BaseControl();p.events.on('childAdd',()=>p.destroy());
 assert.doesNotThrow(()=>p.add(a,b));assert.ok(p.destroyed&&a.destroyed);assert.equal(b.parent,null);assert.equal(b.mounted,false);b.destroy();
});
test('Panel clear stops when childRemove closes its owner',()=>{
 const p=new Panel(),a=new BaseControl(),b=new BaseControl();p.addControl(a);p.addControl(b);p.events.on('childRemove',()=>p.destroy());
 assert.doesNotThrow(()=>p.clear());assert.ok(p.destroyed&&a.destroyed&&b.destroyed);
});
test('failed reentrant attach discards only newly mounted unowned control',()=>{
 const p=new Panel(new Element());let accepted;
 class ClaimKey extends BaseControl{mount(host){super.mount(host);accepted=new BaseControl({name:'same'});p.add(accepted);return this;}}
 const rejected=new ClaimKey({name:'same'});assert.throws(()=>p.attach(rejected),/Duplicate/);
 assert.equal(rejected.destroyed,true);assert.equal(rejected.parent,null);assert.deepEqual(p.getItems(),[accepted]);assert.deepEqual(p.element.children,[accepted.element]);assert.equal(p.getItem('same'),accepted);p.destroy();
});
test('attach rejection preserves a control mounted before the attempted adoption',()=>{
 const p=new Panel(new Element()),borrowed=new BaseControl({name:'same'});borrowed.mount(p.element);
 p.events.on('beforeChildAdd',()=>p.addControl(new BaseControl({name:'same'})));
 assert.throws(()=>p.attach(borrowed),/Duplicate/);assert.equal(borrowed.destroyed,false);assert.equal(borrowed.mounted,true);assert.equal(borrowed.parent,null);assert.ok(p.element.children.includes(borrowed.element));borrowed.destroy();p.destroy();
});
test('attach rollback preserves a child accepted by another owner during mount',()=>{
 const p=new Panel(new Element()),foreign=new Panel();
 class Transfer extends BaseControl{mount(host){super.mount(host);foreign.addControl(this);return this;}}
 const child=new Transfer();assert.throws(()=>p.attach(child),/another parent/);assert.equal(child.parent,foreign);assert.equal(child.destroyed,false);assert.equal(foreign.getItem(child.id),child);assert.deepEqual(p.getItems(),[]);foreign.destroy();p.destroy();
});
for(const operation of ['set','clear','validate'])test('Form '+operation+' skips a field removed by an earlier callback',()=>{
 let form;let validated=0;
 const a=new TextInput({name:'a',value:'old',onChange(){form.remove('b');},validators:[()=>{form.remove('b');return true;}]}),b=new TextInput({name:'b',value:'old',validators:[()=>{validated++;return true;}]});
 form=new Form().row(a,b);
 assert.doesNotThrow(()=>operation==='set'?form.value.set({a:'one',b:'two'}):operation==='clear'?form.value.clear():form.validate());
 assert.equal(b.destroyed,true);assert.ok(!Object.hasOwn(form.value.get(),'b'));assert.equal(validated,0);form.destroy();
});
test('repeated Form field removal does not retain disposed subscriptions',()=>{
 const form=new Form(),baseline=form.disposables._items.size;
 for(let i=0;i<1000;i++){const field=new TextInput({name:'temporary'});form.row(field);form.remove(field);}
 assert.equal(form.getItems().length,0);assert.equal(form.getFields().length,0);assert.equal(form._fieldSubscriptions.size,0);assert.ok(form.disposables._items.size<=baseline+1,'Cleanup storage grows with removed fields');form.destroy();
});

test('Form readonly callback can close the owner without a late readOnlyChange',()=>{
 const a=new TextInput({name:'a'}),b=new TextInput({name:'b'}),form=new Form().row(a,b);let late=0;
 a.events.on('stateChange',()=>form.destroy());form.events.on('readOnlyChange',()=>late++);
 assert.doesNotThrow(()=>form.setReadOnly(true));assert.ok(form.destroyed&&a.destroyed&&b.destroyed);assert.equal(late,0);
});
for(const action of ['close','remove'])test('Panel parentResize skips descendants after '+action+' callback',()=>{
 const p=new Panel(),a=new BaseControl(),b=new BaseControl();p.addControl(a);p.addControl(b);let later=0;
 a.events.on('parentResize',()=>action==='close'?p.destroy():p.remove(b));b.events.on('parentResize',()=>later++);
 assert.doesNotThrow(()=>p.setSize(100,100));assert.equal(later,0);assert.equal(b.destroyed,true);p.destroy();
});
