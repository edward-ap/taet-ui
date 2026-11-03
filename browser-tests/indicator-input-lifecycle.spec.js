import { test, expect } from '@playwright/test';

test('ProgressBar keeps visual and accessible text synchronized on silent custom updates', async ({ page }) => {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async () => {
    const { ProgressBar } = await import('/src/ui/inputs.js');
    window.progress = new ProgressBar('#root', { value: 50, textMode: 'custom', text: 'Starting' });
    window.events = []; progress.events.on('textChange', event => events.push(event.newValue));
    progress.setText('Working', { silent: true });
  });
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuetext', 'Working');
  await expect(page.locator('.dui-progress-bar__text')).toHaveText(['Working', 'Working']);
  expect(await page.evaluate(() => events)).toEqual([]);
  await page.evaluate(() => progress.setText('Done'));
  expect(await page.evaluate(() => events)).toEqual(['Done']);
  await page.evaluate(() => progress.destroy());
});

test('StepProgressBar stops a click after teardown or stage replacement and ignores disabled captions', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/browser-tests/recipes.html');
  for (const action of ['destroy', 'replace', 'disabled']) {
    await page.evaluate(async action => {
      const { StepProgressBar } = await import('/src/ui/inputs.js');
      window.steps = new StepProgressBar('#root', { items: ['Source', 'Export'], interactive: true });
      window.clicks = 0;
      steps.events.on('itemClick', () => { clicks++; if (action === 'destroy') steps.destroy(); else steps.setItems(['Replacement']); });
      if (action === 'disabled') steps.disable();
    }, action);
    await page.locator('.dui-step-progress__caption').filter({ hasText: 'Source' }).click();
    expect(await page.evaluate(() => clicks)).toBe(action === 'disabled' ? 0 : 1);
    expect(await page.evaluate(() => steps.getSelectedItemIndex())).toBe(-1);
    await page.evaluate(() => { if (!steps.destroyed) steps.destroy(); });
  }
  expect(errors).toEqual([]);
});

test('List and OptionList consume silent data changes while preserving borrowed models', async ({ page }) => {
  await page.goto('/browser-tests/recipes.html');
  for (const kind of ['List', 'OptionList']) {
    await page.evaluate(async kind => {
      const { DataStore, SelectionModel } = await import('/src/core/index.js');
      const controls = await import('/src/ui/experimental.js');
      window.data = new DataStore(); window.selection = new SelectionModel({ multiple: true });
      window.list = new controls[kind]('#root', { data, selection, multiple: true, multiSelect: true, value: ['a'] });
      window.events = []; for (const event of ['change', 'selectionChange', 'dataChange']) list.events.on(event, () => events.push(event));
      data.parse([{ id: 'a', text: 'Alpha' }, { id: 'b', text: 'Beta' }], { silent: true });
      if (kind === 'List') { selection.set([data.get('a')], { silent: true }); list.refresh(); }
    }, kind);
    await expect(page.getByRole('option', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true');
    await page.evaluate(() => data.update('a', { text: 'Updated' }, { silent: true }));
    await expect(page.getByRole('option', { name: 'Updated' })).toHaveAttribute('aria-selected', 'true');
    await page.evaluate(() => data.remove('a', { silent: true }));
    await expect(page.getByRole('option')).toHaveCount(1);
    expect(await page.evaluate(() => [events.length, selection.get().length])).toEqual([0, 0]);
    await page.evaluate(() => list.destroy());
    expect(await page.evaluate(() => [data.destroyed, selection.destroyed])).toEqual([false, false]);
    await page.evaluate(() => { data.destroy(); selection.destroy(); });
  }
});

test('OptionList native selection survives teardown during selection and value notifications', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/browser-tests/recipes.html');
  for (const phase of ['beforeChange', 'selectionChange', 'change', 'afterChange']) {
    await page.evaluate(async phase => {
      const { OptionList } = await import('/src/ui/inputs.js');
      window.list = new OptionList('#root'); list.data.parse([{ id: 'a', text: 'Alpha' }]);
      const bus = phase === 'beforeChange' ? list.selection.events : list.events;
      bus.on(phase, () => list.destroy());
    }, phase);
    await page.getByRole('option', { name: 'Alpha' }).click();
    await expect(page.locator('#root .dui-control')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});
