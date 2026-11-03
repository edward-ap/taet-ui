import {test,expect} from '@playwright/test';

const settingsName='\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u0442\u0430\u0431\u043b\u0438\u0446\u044b';
const settings=page=>page.getByRole('button',{name:settingsName,exact:true});
const rows=page=>page.locator('.dui-grid__body .dui-grid__row[data-dui-grid-row-id]');
const row=(page,id)=>page.locator(`.dui-grid__body [data-dui-grid-row-id="number:${id}"]`);
const cell=(page,id,column)=>row(page,id).locator(`[data-dui-grid-column-id="${column}"]`);
const settle=page=>page.evaluate(async()=>{for(let i=0;i<3;i++)await new Promise(requestAnimationFrame)});

async function expectSelectedMarker(page,id){
  const geometry=await row(page,id).evaluate(node=>{
    const indicator=node.querySelector('[data-dui-grid-indicator="row"]');
    const data=node.querySelector('[data-dui-grid-column-id]');
    const style=getComputedStyle(indicator,'::before');
    const gutter=indicator.getBoundingClientRect(),cell=data.getBoundingClientRect();
    const marker={left:gutter.left+parseFloat(style.left),top:gutter.top+parseFloat(style.top),
      width:parseFloat(style.width),height:parseFloat(style.height)};
    const hit=document.elementFromPoint(marker.left+marker.width/2,marker.top+marker.height/2);
    return {content:style.content,display:style.display,visibility:style.visibility,
      opacity:Number(style.opacity),background:style.backgroundColor,marker,
      gutter:{left:gutter.left,right:gutter.right,top:gutter.top,bottom:gutter.bottom},cellLeft:cell.left,
      separate:indicator.parentElement===node&&!indicator.closest('.dui-grid__cell, .dui-grid__editor-host'),
      coveredByEditor:Boolean(hit?.closest('.dui-grid__editor-host')),selected:node.getAttribute('aria-selected')};
  });
  expect(geometry.selected).toBe('true');expect(geometry.separate).toBe(true);
  expect(geometry.content).not.toMatch(/^(none|normal)$/);
  expect(geometry.display).not.toBe('none');expect(geometry.visibility).toBe('visible');
  expect(geometry.opacity).toBeGreaterThan(0);expect(geometry.background).not.toMatch(/^(transparent|rgba\(0, 0, 0, 0\))$/);
  expect(geometry.marker.width).toBeGreaterThan(0);expect(geometry.marker.height).toBeGreaterThan(0);
  expect(geometry.marker.left).toBeGreaterThanOrEqual(geometry.gutter.left);
  expect(geometry.marker.left+geometry.marker.width).toBeLessThanOrEqual(geometry.gutter.right);
  expect(geometry.marker.top).toBeGreaterThanOrEqual(geometry.gutter.top);
  expect(geometry.marker.top+geometry.marker.height).toBeLessThanOrEqual(geometry.gutter.bottom);
  expect(geometry.marker.left+geometry.marker.width).toBeLessThanOrEqual(geometry.cellLeft);
  expect(geometry.coveredByEditor).toBe(false);
}

async function mount(page,kind,options={}){
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async({kind,options})=>{
    const ui=await import('/src/ui/grid-api.js');
    window.grid=new ui[kind]('#root',{width:640,height:280,rowHeight:24,
      columns:[{id:'name',title:'Name',width:220,sortable:true,filterable:true},
        {id:'size',title:'Size',width:100,sortable:true,dataType:'number'},
        {id:'stamp',title:'Date',width:180,sortable:true}],...options});
    grid.data.parse([{id:1,name:'Alpha',size:10,stamp:'Today'},
      {id:2,name:'Beta',size:20,stamp:'Tomorrow'},{id:3,name:'Gamma',size:30,stamp:'Yesterday'}]);
  },{kind,options});
  await settle(page);
}

test.beforeEach(({page})=>{page.on('pageerror',error=>{throw error})});

for(const kind of ['Grid','TreeGrid']){
  test(`${kind} first data-column editing preserves the selected marker through validation and traversal`,async({page})=>{
    await page.goto('/browser-tests/recipes.html');
    await page.evaluate(async kind=>{
      const ui=await import('/src/ui/grid-api.js');
      const editor=ui.gridEditors.text({validators:[value=>String(value).trim().length>=3||'Use at least 3 characters']});
      window.grid=new ui[kind]('#root',{width:640,height:240,rowHeight:24,
        columns:[{id:'name',title:'Name',width:220,editor},{id:'code',title:'Code',width:180,editor}]});
      grid.data.parse([{id:1,name:'Alpha',code:'First'},{id:2,name:'Beta',code:'Second'}]);
      grid.setSelectedIds([1]);
    },kind);
    await settle(page);
    const input=page.locator('.dui-grid__editor-host input');
    await cell(page,1,'name').dblclick();
    await expect(cell(page,1,'name').locator('.dui-grid__editor-host input')).toBeFocused();
    await expectSelectedMarker(page,1);
    await input.fill('x');
    for(const key of ['Enter','Tab']){
      await input.press(key);await expect(input).toBeFocused();await expect(input).toHaveValue('x');
      await expect(cell(page,1,'name').locator('.dui-grid__editor-host')).toHaveCount(1);
      expect(await page.evaluate(()=>grid.data.get(1).name)).toBe('Alpha');
      await expectSelectedMarker(page,1);
    }
    await input.fill('Alpha accepted');await input.press('Enter');
    await expect(input).toHaveCount(0);
    expect(await page.evaluate(()=>grid.data.get(1).name)).toBe('Alpha accepted');
    await expectSelectedMarker(page,1);
    await cell(page,1,'name').dblclick();await expect(input).toBeFocused();
    await input.fill('Discard draft');await input.press('Escape');await expect(input).toHaveCount(0);
    expect(await page.evaluate(()=>grid.data.get(1).name)).toBe('Alpha accepted');
    await expectSelectedMarker(page,1);
    await cell(page,1,'name').dblclick();await input.fill('Alpha tab');await input.press('Tab');
    await expect(cell(page,1,'code').locator('.dui-grid__editor-host input')).toBeFocused();
    await expectSelectedMarker(page,1);
    await input.fill('First tab');await input.press('Tab');
    await expect(cell(page,2,'name').locator('.dui-grid__editor-host input')).toBeFocused();
    await expect(row(page,2)).toHaveClass(/dui-active/);await expect(row(page,2)).toHaveAttribute('aria-selected','false');
    expect(await page.evaluate(()=>grid.getSelectedIds())).toEqual([1]);
    expect(await page.evaluate(()=>[grid.data.get(1).name,grid.data.get(1).code])).toEqual(['Alpha tab','First tab']);
    await expectSelectedMarker(page,1);
    expect(await row(page,2).locator('[data-dui-grid-indicator="row"]').evaluate(node=>getComputedStyle(node,'::before').content)).toMatch(/^(none|normal)$/);
    await input.press('Escape');await page.evaluate(()=>grid.destroy());
  });

  test(`${kind} global and column menus have distinct scopes`,async({page})=>{
    await mount(page,kind);
    const header=page.locator('[data-dui-grid-indicator="header"]');
    await expect(header).toHaveAttribute('role','presentation');
    expect(await header.getAttribute('data-dui-grid-column-id')).toBeNull();
    expect(await header.getAttribute('aria-colindex')).toBeNull();
    expect(await header.evaluate(node=>node.draggable)).toBe(false);
    await expect(header.locator('.dui-grid__resize-handle, .dui-grid__column-menu-button')).toHaveCount(0);
    await page.getByRole('button',{name:'Column menu for Name',exact:true}).click();
    for(const label of ['Columns','Best fit all columns','Clear all filters','Reset column layout','Search panel','Status bar','Expand all','Collapse all']){
      for(const role of ['menuitem','menuitemcheckbox'])await expect(page.getByRole(role,{name:label,exact:true})).toHaveCount(0);
    }
    await expect(page.getByRole('menuitemcheckbox',{name:'Sort ascending',exact:true})).toBeVisible();
    await expect(page.getByRole('menuitemcheckbox',{name:'Sort ascending',exact:true})).toHaveAttribute('aria-checked','false');
    await expect(page.getByRole('menuitem',{name:'Best fit',exact:true})).toBeVisible();
    await page.keyboard.press('Escape');
    await settings(page).click();
    for(const label of ['Columns','Best fit all columns','Clear all filters','Clear sorting','Reset column layout']){
      await expect(page.getByRole('menuitem',{name:label,exact:true})).toBeVisible();
    }
    for(const label of ['Sort ascending','Filter values','Filter values...','Condition...','Best fit','Hide column','Summary','Summary scope']){
      for(const role of ['menuitem','menuitemcheckbox'])await expect(page.getByRole(role,{name:label,exact:true})).toHaveCount(0);
    }
    if(kind==='TreeGrid'){
      await expect(page.getByRole('menuitem',{name:'Expand all',exact:true})).toBeVisible();
      await expect(page.getByRole('menuitem',{name:'Collapse all',exact:true})).toBeVisible();
    }else{
      await expect(page.getByRole('menuitem',{name:'Expand all',exact:true})).toHaveCount(0);
    }
    await page.keyboard.press('Escape');
    await page.evaluate(()=>grid.destroy());
  });

  test(`${kind} ten-pixel settings button keeps SVG and focus inside the gutter`,async({page},testInfo)=>{
    await mount(page,kind);
    await page.evaluate(()=>document.fonts.ready);
    for(const theme of ['light','dark']){
      await page.evaluate(theme=>{
        document.body.classList.remove('dui-theme-light-blue','dui-theme-dark-blue');
        document.body.classList.add(`dui-theme-${theme}-blue`);
      },theme);
      await settings(page).focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
      await expect(settings(page)).toBeFocused();
      const geometry=await settings(page).evaluate(button=>{
        const gutter=button.parentElement.getBoundingClientRect(),rect=button.getBoundingClientRect();
        const icon=button.querySelector("svg"),glyph=icon.getBoundingClientRect();
        const style=getComputedStyle(button),data=button.parentElement.nextElementSibling.getBoundingClientRect();
        return {svg:icon.getAttribute("aria-hidden"),dots:icon.querySelectorAll("circle").length,iconWidth:glyph.width,iconHeight:glyph.height,
          width:gutter.width,left:gutter.left,right:gutter.right,buttonLeft:rect.left,buttonRight:rect.right,
          glyphLeft:glyph.left,glyphRight:glyph.right,glyphCenter:(glyph.left+glyph.right)/2,
          center:(rect.left+rect.right)/2,firstDataX:data.left,
          outsideIsButton:document.elementFromPoint(gutter.right+1,rect.top+rect.height/2)?.closest('.dui-grid__grid-menu-button')===button,
          focusVisible:button.matches(':focus-visible'),outline:style.outlineStyle,
          outlineWidth:parseFloat(style.outlineWidth),outlineOffset:parseFloat(style.outlineOffset),padding:style.padding};
      });
      expect(geometry.svg).toBe("true");expect(geometry.dots).toBe(3);
      expect(geometry.iconWidth).toBe(6);expect(geometry.iconHeight).toBe(18);
      expect(geometry.width).toBe(10);expect(geometry.buttonLeft).toBeGreaterThanOrEqual(geometry.left);
      expect(geometry.buttonRight).toBeLessThanOrEqual(geometry.right);
      expect(geometry.glyphLeft).toBeGreaterThanOrEqual(geometry.buttonLeft);
      expect(geometry.glyphRight).toBeLessThanOrEqual(geometry.buttonRight);
      expect(Math.abs(geometry.glyphCenter-geometry.center)).toBeLessThan(0.75);
      expect(geometry.firstDataX).toBe(geometry.right);expect(geometry.outsideIsButton).toBe(false);
      expect(geometry.focusVisible).toBe(true);expect(geometry.outline).toBe('solid');
      expect(geometry.outlineWidth).toBe(1);expect(geometry.outlineOffset).toBeLessThan(0);expect(geometry.padding).toBe('0px');
      await page.screenshot({path:testInfo.outputPath(`${kind}-${theme}-gutter.png`)});
      await settings(page).press('Enter');await expect(page.getByRole('menu').first()).toBeVisible();
      await page.keyboard.press('Escape');await expect(settings(page)).toBeFocused();
    }
    for(const width of [18,20]){
      await page.evaluate(width=>{grid.element.style.setProperty('--dui-grid-indicator-width',`${width}px`);grid.refresh()},width);
      expect(await page.locator('[data-dui-grid-indicator="header"]').evaluate(node=>node.getBoundingClientRect().width)).toBe(width);
    }
    await page.evaluate(()=>{grid.element.style.removeProperty('--dui-grid-indicator-width');grid.refresh()});
    expect(await page.locator('[data-dui-grid-indicator="header"]').evaluate(node=>node.getBoundingClientRect().width)).toBe(10);
    await page.evaluate(()=>grid.destroy());
  });

  test(`${kind} settings keyboard activation restores focus without changing active cell`,async({page})=>{
    await mount(page,kind);
    await cell(page,2,'size').click();
    const active=await page.locator('.dui-grid').getAttribute('aria-activedescendant');
    await expect(settings(page)).toHaveAttribute('title',settingsName);
    await expect(settings(page)).toHaveAttribute('aria-haspopup','menu');
    for(const key of ['Enter','Space','ArrowDown']){
      await settings(page).focus();await settings(page).press(key);
      await expect(page.getByRole('menu').first()).toBeVisible();
      await expect(settings(page)).toHaveAttribute('aria-expanded','true');
      expect(await page.evaluate(()=>document.activeElement?.getAttribute('role'))).toMatch(/^menuitem/);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('menu')).toHaveCount(0);
      await expect(settings(page)).toBeFocused();
      await expect(settings(page)).toHaveAttribute('aria-expanded','false');
      await expect(page.locator('.dui-grid')).toHaveAttribute('aria-activedescendant',active);
      expect(await page.evaluate(()=>grid.getSelectedIds())).toEqual([2]);
      expect(await page.evaluate(()=>grid.getSortModel())).toEqual([]);
    }
    await settings(page).click();
    await page.getByRole('menuitem',{name:'Best fit all columns',exact:true}).click();
    await expect(settings(page)).toBeFocused();
    await page.evaluate(()=>grid.destroy());
  });

  test(`${kind} all-hidden columns keep settings and reset only column layout`,async({page})=>{
    await mount(page,kind);
    const initial=await page.evaluate(()=>grid.columnModel.getState());
    await page.evaluate(()=>{
      grid.columnModel.setWidth('name',360);grid.moveColumn('stamp',0);
      grid.sortBy('size','desc');
      grid.setColumnFilter('name',{kind:'text',operator:'contains',value:'a'});
      for(const column of [...grid.columns])grid.hideColumn(column.id);
    });
    await expect(page.locator('.dui-grid__header-cell')).toHaveCount(0);
    await expect(page.locator('.dui-grid')).toHaveAttribute('aria-colcount','0');
    await expect(settings(page)).toBeVisible();
    await settings(page).click();
    await page.getByRole('menuitem',{name:'Reset column layout',exact:true}).click();
    await expect(page.locator('.dui-grid__header-cell')).toHaveCount(3);
    expect(await page.evaluate(()=>grid.columnModel.getState())).toEqual(initial);
    expect(await page.evaluate(()=>grid.getSortModel())).toEqual([{columnId:'size',direction:'desc'}]);
    expect(await page.evaluate(()=>(grid.view??grid.treeView).all().map(item=>item.id))).toEqual([3,2,1]);
    await page.evaluate(()=>grid.data.parse([...grid.data.all(),{id:4,name:'XYZ',size:40,stamp:'Later'}]));
    expect(await page.evaluate(()=>(grid.view??grid.treeView).all().map(item=>item.id))).toEqual([3,2,1]);
    await expect(settings(page)).toBeFocused();
    await page.evaluate(()=>grid.destroy());
  });

  test(`${kind} selection marker lives in the service area and remains distinct from active row`,async({page})=>{
    await mount(page,kind);
    await page.evaluate(()=>{grid.setSelectedIds([1]);grid.focus()});
    await page.keyboard.press('ArrowDown');
    await expect(row(page,1)).toHaveAttribute('aria-selected','true');
    await expect(row(page,2)).toHaveClass(/dui-active/);
    await expect(row(page,2)).toHaveAttribute('aria-selected','false');
    const states=await page.evaluate(()=>{
      const inspect=id=>{
        const row=grid.element.querySelector(`[data-dui-grid-row-id="number:${id}"]`);
        const indicator=row.querySelector('[data-dui-grid-indicator="row"]');
        const data=row.querySelector('[data-dui-grid-column-id]');
        return {marker:getComputedStyle(indicator,'::before').content,
          firstCellMarker:getComputedStyle(data,'::before').content,
          width:indicator.getBoundingClientRect().width,
          role:indicator.getAttribute('role'),hidden:indicator.getAttribute('aria-hidden'),
          column:indicator.getAttribute('data-dui-grid-column-id'),index:indicator.getAttribute('aria-colindex')};
      };return [inspect(1),inspect(2)];
    });
    expect(states[0].marker).not.toMatch(/^(none|normal)$/);
    expect(states[1].marker).toMatch(/^(none|normal)$/);
    for(const state of states){
      expect(state.firstCellMarker).toMatch(/^(none|normal)$/);
      expect(state.width).toBe(10);
      expect(state.role).toBe('presentation');expect(state.hidden).toBe('true');
      expect(state.column).toBeNull();expect(state.index).toBeNull();
    }
    await page.evaluate(()=>grid.destroy());
  });

  test(`${kind} gutter stays pinned and row-aligned under two-axis virtual scroll`,async({page})=>{
    await page.goto('/browser-tests/recipes.html');
    await page.evaluate(async kind=>{
      const ui=await import('/src/ui/grid-api.js');
      const columns=Array.from({length:60},(_,c)=>({id:`c${c}`,title:`Column ${c}`,width:120,
        frozen:c===0?'left':c===59?'right':null}));
      window.grid=new ui[kind]('#root',{width:720,height:300,rowHeight:24,columns,treeColumnId:'c0',expandedIds:['r0']});
      grid.data.parse(Array.from({length:2000},(_,r)=>({id:`r${r}`,parentId:r?'r0':null,
        ...Object.fromEntries(Array.from({length:60},(_,c)=>[`c${c}`,`R${r} C${c}`]))})));
      if(kind==='TreeGrid')grid.expandAll({silent:true});
    },kind);
    expect(await page.evaluate(()=>(grid.view??grid.treeView).all().length)).toBe(2000);
    for(const [left,top]of [[0,0],[600,23000],[3000,36000],[0,0]]){
      await page.locator('.dui-grid__body').evaluate((body,{left,top})=>{body.scrollLeft=left;body.scrollTop=top},{left,top});
      await settle(page);
      const state=await page.evaluate(()=>{
        const body=grid.element.querySelector('.dui-grid__body'),header=grid.element.querySelector('[data-dui-grid-indicator="header"]');
        const bodyBox=body.getBoundingClientRect();
        const records=[...body.querySelectorAll('.dui-grid__row[data-dui-grid-row-id]')];
        return {scrollTop:body.scrollTop,bodyLeft:bodyBox.left+body.clientLeft,headerX:header.getBoundingClientRect().left,
          rowCount:records.length,cells:body.querySelectorAll('.dui-grid__cell').length,
          rows:records.map(row=>{
            const indicator=row.querySelector('[data-dui-grid-indicator="row"]');
            const frozen=row.querySelector('[data-dui-grid-column-id="c0"]');
            const r=row.getBoundingClientRect(),g=indicator.getBoundingClientRect(),c=frozen.getBoundingClientRect();
            return {x:g.left,right:g.right,top:g.top,rowTop:r.top,height:g.height,rowHeight:r.height,
              firstX:c.left,cellCount:row.querySelectorAll('.dui-grid__cell').length};
          })};
      });
      expect(Math.abs(state.scrollTop-top)).toBeLessThan(2);
      expect(state.rowCount).toBeGreaterThan(0);expect(state.rowCount).toBeLessThan(50);
      expect(state.cells).toBeLessThan(600);
      expect(Math.abs(state.headerX-state.bodyLeft)).toBeLessThan(2);
      for(const r of state.rows){
        expect(Math.abs(r.x-state.bodyLeft)).toBeLessThan(2);
        expect(Math.abs(r.top-r.rowTop)).toBeLessThan(1);
        expect(Math.abs(r.height-r.rowHeight)).toBeLessThanOrEqual(1.5);
        expect(Math.abs(r.firstX-r.right)).toBeLessThan(2);
        expect(r.cellCount).toBeLessThan(15);
      }
      await expect(settings(page)).toBeVisible();
    }
    await page.evaluate(()=>grid.destroy());
  });

  test(`${kind} gutter and global menu opt-outs retain embedded and existing menu options`,async({page})=>{
    await mount(page,kind,{indicatorGutter:false});
    await expect(page.locator('[data-dui-grid-indicator]')).toHaveCount(0);
    await expect(settings(page)).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Column menu for Name',exact:true})).toBeVisible();
    await page.evaluate(()=>grid.destroy());
    await mount(page,kind,{columnMenu:false});
    await expect(page.locator('[data-dui-grid-indicator="header"]')).toBeVisible();
    await expect(settings(page)).toHaveCount(0);
    await expect(page.locator('.dui-grid__column-menu-button')).toHaveCount(0);
    await page.evaluate(()=>grid.destroy());
    await mount(page,kind,{columnMenu:false,gridMenu:true});
    await expect(settings(page)).toBeVisible();
    await expect(page.locator('.dui-grid__column-menu-button')).toHaveCount(0);
    await page.evaluate(()=>grid.destroy());
  });
}

test('Grid local sort clearing preserves other rules while global clearing removes the comparator',async({page})=>{
  await mount(page,'Grid');
  await page.evaluate(()=>grid.setSortModel([{columnId:'name',direction:'asc'},{columnId:'size',direction:'desc'}]));
  await page.getByRole('button',{name:'Column menu for Name',exact:true}).click();
  await page.getByRole('menuitem',{name:'Clear sorting',exact:true}).click();
  expect(await page.evaluate(()=>grid.getSortModel())).toEqual([{columnId:'size',direction:'desc'}]);
  await settings(page).click();await page.getByRole('menuitem',{name:'Clear sorting',exact:true}).click();
  expect(await page.evaluate(()=>({sort:grid.getSortModel(),comparator:grid.view.getSort()}))).toEqual({sort:[],comparator:null});
  await page.evaluate(()=>grid.destroy());
});

test('Grid ranges, clipboard, exports and ARIA column coordinates exclude the gutter',async({page})=>{
  await mount(page,'Grid');
  const state=await page.evaluate(()=>{
    grid.setCellRanges({from:{rowId:1,columnId:'name'},to:{rowId:2,columnId:'size'}},{silent:true});
    return {columns:grid.columns.map(c=>c.id),clipboard:grid.getClipboardText(),
      exported:grid.exportData({export:({columns,rows,getValue})=>({
        ids:columns.map(c=>c.id),values:rows.map(row=>columns.map(c=>getValue(row,c)))})}),
      selected:[...grid.element.querySelectorAll('.dui-grid__cell--range-selected')].map(c=>c.dataset.duiGridColumnId),
      indices:[...grid.element.querySelector('.dui-grid__row').querySelectorAll('.dui-grid__cell')].map(c=>c.getAttribute('aria-colindex')),
      gutterSelected:grid.element.querySelectorAll('[data-dui-grid-indicator].dui-grid__cell--range-selected').length};
  });
  expect(state.columns).toEqual(['name','size','stamp']);
  expect(state.exported).toEqual({ids:['name','size','stamp'],values:[['Alpha',10,'Today'],['Beta',20,'Tomorrow'],['Gamma',30,'Yesterday']]});
  expect(state.clipboard).toBe('Alpha\t10\r\nBeta\t20');
  expect(state.selected).toEqual(['name','size','name','size']);
  expect(state.indices).toEqual(['1','2','3']);expect(state.gutterSelected).toBe(0);
  await expect(page.locator('.dui-grid')).toHaveAttribute('aria-colcount','3');
  await page.evaluate(()=>grid.destroy());
});

test('Grid group and detail gutters remain pinned with normal header and footer during horizontal scroll',async({page})=>{
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async()=>{
    const {Grid}=await import('/src/ui/grid-api.js');
    window.grid=new Grid('#root',{width:600,height:360,rowHeight:24,
      columns:Array.from({length:20},(_,index)=>({id:`c${index}`,width:100,...(index===0?{summary:'count'}:{})})),
      rowDetail:item=>`Details for ${item.id}: ${'Long wrapping detail content keeps the viewport measurement stable. '.repeat(14)}`});
    grid.data.parse(Array.from({length:1000},(_,index)=>({id:index,...Object.fromEntries(
      Array.from({length:20},(_,column)=>[`c${column}`,column===0?'Group':`Row ${index} column ${column}`]))})));
    grid.setGroups(['c0']);grid.expandDetail(0);
  });
  await settle(page);
  let initialWidth,initialDetailHeight;
  for(const left of [0,300,800,1400]){
    await page.locator('.dui-grid__body').evaluate((node,left)=>{node.scrollLeft=left},left);await settle(page);
    const geometry=await page.evaluate(()=>{
      const body=grid.element.querySelector('.dui-grid__body');
      const selectors=['.dui-grid__indicator-header','.dui-grid__row .dui-grid__indicator-body',
        '.dui-grid__group-row [data-dui-grid-indicator]', '.dui-grid__detail-row [data-dui-grid-indicator]',
        '.dui-grid__indicator-footer'];
      const detail=body.querySelector('.dui-grid__detail-row');
      return {bodyLeft:body.getBoundingClientRect().left,bodyWidth:body.clientWidth,
        detailHeight:detail.getBoundingClientRect().height,
        detailContentWidth:detail.querySelector('.dui-grid__detail-content').getBoundingClientRect().width,
        scrollLeft:body.scrollLeft,scrollWidth:body.scrollWidth,
        gutters:selectors.map(selector=>{const node=grid.element.querySelector(selector),rect=node?.getBoundingClientRect();
          return rect?{selector,x:rect.left,width:rect.width}:null}),
        cells:body.querySelectorAll('.dui-grid__cell').length,rows:body.querySelectorAll('.dui-grid__row').length,
        widths:[...body.querySelectorAll('.dui-grid__group-row,.dui-grid__detail-row,.dui-grid__row')].map(node=>node.getBoundingClientRect().width)};
    });
    expect(geometry.scrollLeft).toBe(left);
    if(initialWidth===undefined){initialWidth=geometry.scrollWidth;initialDetailHeight=geometry.detailHeight}
    expect(geometry.scrollWidth).toBe(initialWidth);
    expect(geometry.detailHeight).toBe(initialDetailHeight);
    expect(geometry.detailHeight).toBeGreaterThan(24);
    expect(geometry.detailContentWidth).toBe(geometry.bodyWidth-10);
    expect(geometry.gutters).not.toContain(null);
    for(const gutter of geometry.gutters){expect(Math.abs(gutter.x-geometry.bodyLeft),gutter.selector).toBeLessThan(2);expect(gutter.width).toBe(10)}
    expect(geometry.widths.every(width=>width>=2000)).toBe(true);
    expect(geometry.rows).toBeLessThan(35);expect(geometry.cells).toBeLessThan(400);
  }
  await page.evaluate(()=>grid.destroy());
});

test('TreeGrid hierarchy depth remains inside the first data column and global expansion keeps it aligned',async({page})=>{
  await mount(page,'TreeGrid');
  await page.evaluate(()=>{
    grid.data.parse([{id:1,name:'Root'},{id:2,parentId:1,name:'Child'},{id:3,parentId:2,name:'Grandchild'},{id:4,name:'Other'}]);
    grid.expandAll();
  });
  await expect(rows(page)).toHaveCount(4);
  const inspect=()=>page.evaluate(()=>[1,2,3].map(id=>{
    const row=grid.element.querySelector(`[data-dui-grid-row-id="number:${id}"]`);
    const indicator=row.querySelector('[data-dui-grid-indicator="row"]'),content=row.querySelector('.dui-tree-grid__content');
    return {level:getComputedStyle(content).getPropertyValue('--dui-tree-level').trim(),
      gutterX:indicator.getBoundingClientRect().left,contentX:content.getBoundingClientRect().left,toggleX:content.querySelector('.dui-tree-grid__toggle').getBoundingClientRect().left,
      dataColumn:content.closest('[data-dui-grid-column-id]').dataset.duiGridColumnId,
      gutterToggle:Boolean(indicator.querySelector('[data-dui-tree-toggle]'))};
  }));
  const before=await inspect();expect(before.map(r=>r.level)).toEqual(['0','1','2']);
  expect(before.every(r=>r.dataColumn==='name'&&!r.gutterToggle)).toBe(true);
  expect(new Set(before.map(r=>r.gutterX)).size).toBe(1);
  const indent=before[1].toggleX-before[0].toggleX;
  expect(indent).toBeGreaterThan(8);
  expect(Math.abs((before[2].toggleX-before[1].toggleX)-indent)).toBeLessThan(1);
  await settings(page).click();await page.getByRole('menuitem',{name:'Collapse all',exact:true}).click();
  await expect(rows(page)).toHaveCount(2);
  await settings(page).click();await page.getByRole('menuitem',{name:'Expand all',exact:true}).click();
  await expect(rows(page)).toHaveCount(4);expect(await inspect()).toEqual(before);
  await settings(page).click();await page.getByRole('menuitem',{name:'Reset column layout',exact:true}).click();
  await expect(rows(page)).toHaveCount(4);expect(await inspect()).toEqual(before);
  await page.evaluate(()=>grid.destroy());
});

for(const kind of ['Grid','TreeGrid']){
  test(`${kind} global clear removes all conditions and local sort clear ignores another column`,async({page})=>{
    await mount(page,kind);
    await page.evaluate(()=>{
      grid.sortBy('size','desc');grid.setFilter(item=>item.id!==1);
      grid.setColumnFilter('name',{kind:'text',operator:'contains',value:'Beta'});
      if(grid.search){grid.search.setMode('filter');grid.search.set('Beta')}else grid.setSearchQuery('Beta');
    });
    await expect(rows(page)).toHaveCount(1);
    await page.getByRole('button',{name:'Column menu for Name',exact:true}).click();
    await expect(page.getByRole('menuitem',{name:'Clear sorting',exact:true})).toBeDisabled();
    await page.keyboard.press('Escape');
    await settings(page).click();
    await page.getByRole('menuitem',{name:'Clear all filters',exact:true}).click();
    await expect(rows(page)).toHaveCount(3);
    expect(await page.evaluate(()=>(grid.view??grid.treeView).all().map(item=>item.id))).toEqual([3,2,1]);
    await settings(page).click();await page.getByRole('menuitem',{name:'Clear sorting',exact:true}).click();
    expect(await page.evaluate(()=>(grid.view??grid.treeView).all().map(item=>item.id))).toEqual([1,2,3]);
    await page.evaluate(()=>grid.destroy());
  });
}

for(const kind of ['Grid','TreeGrid'])test(`${kind} global autosize stops when layout callback closes the owner`,async({page})=>{
  await mount(page,kind);
  await page.evaluate(()=>{grid.columnModel.setWidth('name',500);grid.columnModel.events.once('invalidate',()=>grid.destroy())});
  await settings(page).click();await page.getByRole('menuitem',{name:'Best fit all columns',exact:true}).click();
  await expect(page.locator('.dui-grid')).toHaveCount(0);
  await expect(page.getByRole('menu')).toHaveCount(0);
  expect(await page.evaluate(()=>grid.destroyed)).toBe(true);
});
