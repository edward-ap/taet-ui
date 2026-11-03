import test from 'node:test';
import assert from 'node:assert/strict';
import {Grid} from '../src/ui/Grid.js';
import {gridExporters} from '../src/ui/GridExporters.js';
const records=[{id:'a',name:'Alpha',team:'X',amount:10},{id:'b',name:'Beta',team:'Y',amount:20},{id:'c',name:'Gamma',team:'X',amount:30},{id:'d',name:'Delta',team:'Y',amount:40}];
test('numeric summaries omit missing values but retain zero and numeric strings',()=>{
 const g=new Grid({columns:[{id:'amount',dataType:'number'}]});try{
 g.data.parse([null,undefined,'',' ',10,'20',0,'invalid',Infinity].map((amount,id)=>({id,amount})));
 for(const [kind,value] of [['average','Avg 10'],['min','Min 0'],['max','Max 20'],['total','Total 30']]){
  g.setColumnSummary('amount',kind);assert.equal(g.getColumnSummaryValue('amount'),value);
 }
 g.data.parse([{id:1,amount:null},{id:2,amount:''}]);
 for(const kind of ['average','min','max']){g.setColumnSummary('amount',kind);assert.equal(g.getColumnSummaryValue('amount'),'');}
 g.setColumnSummary('amount','total');assert.equal(g.getColumnSummaryValue('amount'),'Total 0');
 }finally{g.destroy();}
});
function create(){const g=new Grid({multiSelect:true,columns:[{id:'name',sortable:true},{id:'team',sortable:true},{id:'amount',dataType:'number',sortable:true}],statusBar:{pagination:{pageSize:2}}});g.data.parse(JSON.parse(JSON.stringify(records)));return g;}
test('Grid composes multi-sort, filters, paging and all summary scopes',()=>{
 const g=create();try{
 g.setSortModel([{columnId:'team',direction:'asc'},{columnId:'amount',direction:'desc'}]);
 assert.deepEqual(g.view.projectedAll().map(r=>r.id),['c','a','d','b']);
 g.setColumnFilter('amount',{kind:'number',operator:'greater',value:10});
 assert.deepEqual(g.view.projectedAll().map(r=>r.id),['c','d','b']);
 g.setColumnSummary('amount',{kind:'total',scope:'page'});assert.equal(g.getColumnSummaryValue('amount'),'Total 70');
 g.nextPage();assert.equal(g.getColumnSummaryValue('amount'),'Total 20');
 for(const [scope,total] of [['filtered',90],['all',100]]){g.setColumnSummary('amount',{kind:'total',scope});assert.equal(g.getColumnSummaryValue('amount'),'Total '+total);}
 g.firstPage();g.setSelectedIds(['c','d']);g.setColumnSummary('amount',{kind:'total',scope:'selection'});assert.equal(g.getColumnSummaryValue('amount'),'Total 70');
 for(const [kind,value] of [['count','Count 4'],['min','Min 10'],['max','Max 40'],['average','Avg 25']]){g.setColumnSummary('amount',{kind,scope:'all'});assert.equal(g.getColumnSummaryValue('amount'),value);}
 g.setColumnSummary('amount',{kind:'custom',scope:'all',value:rows=>rows.length+' records'});assert.equal(g.getColumnSummaryValue('amount'),'4 records');
 g.data.update('a',{amount:15});g.clearAllFilters();g.clearSort();assert.equal(g.data.get('a').amount,15);
 }finally{g.destroy();}
});
test('JSON record and layout round trips preserve raw types independently of displayed/exported columns',()=>{
 const g=create();const copy=create();try{
 g.hideColumn('team');g.freezeColumn('name','left');g.freezeColumn('amount','right');g.moveColumn('amount',0);
 g.setSortModel([{columnId:'amount',direction:'desc'}]);
 const layout=JSON.parse(JSON.stringify(g.getLayoutState()));copy.restoreLayoutState(layout);
 assert.deepEqual(copy.getLayoutState(),layout);
 const json=JSON.stringify(g.data.all());copy.data.parse(JSON.parse(json));assert.deepEqual(copy.data.all(),records);
 assert.equal(typeof copy.data.get('a').amount,'number');
 g.setColumnFilter('amount',{kind:'number',operator:'greater',value:20});
 const raw=JSON.parse(JSON.stringify(g.data.all()));assert.equal(raw.length,4);
 const projected=g.exportData({export:({rows})=>JSON.stringify(rows)});assert.deepEqual(JSON.parse(projected).map(r=>r.id),['d','c']);
 assert.equal(g.exportData(gridExporters.workbook()).sheets[0].columns.some(c=>c.id==='team'),false);
 assert.equal(g.exportData(gridExporters.workbook(),{includeHidden:true}).sheets[0].columns.some(c=>c.id==='team'),true);
 }finally{g.destroy();copy.destroy();}
});
