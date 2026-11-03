import {test, expect} from '@playwright/test';

test('palette binds visible dynamic scopes, isolates hosts and restores existing styles', async ({page}) => {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async () => {
    const {ThemeApplicator, ThemeDesigner} = await import('/src/ui/all.js');
    window.Applicator = ThemeApplicator;
    const designer = new ThemeDesigner('#root', {maxColors:3,toolbar:false});
    window.colors = designer.getTheme(); designer.destroy();
    for (const id of ['one','two']) {
      const root=document.createElement('section');root.id=id;root.className='dui-theme-light';
      root.innerHTML='<div class="surface" style="border-width:2px;border-style:solid"><fieldset><legend class="dui-field-group__title">Title</legend></fieldset></div>';
      document.body.append(root);
    }
    window.app = new ThemeApplicator(document.querySelector('#one'),{scopes:[
      {selector:'.surface',role:'secondary',parts:['surface']},
      {selector:'fieldset',role:'tertiary',parts:['fieldGroup']}
    ]});
    window.other = new ThemeApplicator(document.querySelector('#two'));
    window.before = document.querySelector('#one').getAttribute('style');
    app.apply(colors);
  });
  await expect(page.locator('#one .surface')).not.toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  await expect(page.locator('#two .surface')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  const color=await page.locator('#one legend').evaluate(el=>getComputedStyle(el).backgroundColor);
  await page.evaluate(()=>document.querySelector('#one').insertAdjacentHTML('beforeend','<fieldset><legend class="dui-field-group__title">Later</legend></fieldset>'));
  await expect(page.locator('#one legend').last()).toHaveCSS('background-color',color);
  await page.evaluate(()=>{
    const old=document.head.lastElementChild.previousElementSibling.textContent;
    try {app.apply({tokens:{'--dui-color-bg':'url(https://example.test)'}});throw Error('accepted unsafe token');} catch(e) {if(!(e instanceof TypeError))throw e;}
    if(document.head.lastElementChild.previousElementSibling.textContent!==old)throw Error('non-atomic failure');
    try {new Applicator(document.querySelector('#one fieldset'));throw Error('accepted overlapping root');}catch(e){if(e.message==='accepted overlapping root')throw e;}
    app.clear();
  });
  await expect(page.locator('#one .surface')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  await expect(page.locator('#one .surface')).toHaveCSS('border-width','2px');
  await page.evaluate(()=>{
    app.apply(colors);app.destroy();app.destroy();other.destroy();
    if(document.querySelector('[data-dui-theme-owner]'))throw Error('leaked owner');
    if(document.querySelector('#one').getAttribute('style')!==before)throw Error('mutated host inline style');
  });
});

test('mounted control owns applicator teardown and validation precedes side effects',async({page})=>{
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async()=>{
    const {Panel,ThemeApplicator}=await import('/src/ui/all.js');
    const root=new Panel('#root');const count=document.head.querySelectorAll('style').length;
    for(const options of [{scopes:[{selector:'div',role:'bogus'}]},{scopes:[{selector:'div',parts:['bad']}]},{scopes:[{selector:'}body{color:red'}]}]){
      try{new ThemeApplicator(root,options);throw Error('accepted bad config');}catch(e){if(!(e instanceof TypeError))throw e;}
    }
    const app=new ThemeApplicator(root);app.apply({tokens:{'--dui-palette-primary-onColor':'#ffffff'}});
    root.destroy();if(!app.destroyed||document.head.querySelectorAll('style').length!==count)throw Error('leaked sheet');
  });
});
