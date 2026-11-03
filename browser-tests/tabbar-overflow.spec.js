import { expect, test } from "@playwright/test";
import { capturePageErrors, expectNoPageErrors } from "./smoke-helpers.js";

test("lab15 TabBar shows overflow navigation and keeps the active tab visible", async ({ page }) => {
  const errors = capturePageErrors(page);
  await page.goto("/examples/labs/lab15.html");

  const tabbar = page.locator(".dui-tabbar");
  const content = page.locator(".dui-tab-content");
  const viewport = tabbar.locator(".dui-tabbar__viewport");
  const previous = tabbar.getByRole("button", { name:"Scroll tabs left" });
  const next = tabbar.getByRole("button", { name:"Scroll tabs right" });

  await expect(previous).toBeVisible();
  await expect(previous).toBeDisabled();
  await expect(next).toBeVisible();
  await expect(next).toBeEnabled();

  const borderedGeometry = await tabbar.evaluate((element) => {
    const contentElement = element.nextElementSibling;
    const tabRect = element.getBoundingClientRect();
    const contentRect = contentElement.getBoundingClientRect();
    return {
      bordered:element.classList.contains("dui-tabbar--bordered"),
      borderColor:getComputedStyle(element).borderLeftColor,
      windowBorder:getComputedStyle(element).getPropertyValue("--dui-window-border").trim(),
      verticalGap:contentRect.top - tabRect.bottom,
      leftDifference:Math.abs(contentRect.left - tabRect.left),
      rightDifference:Math.abs(contentRect.right - tabRect.right)
    };
  });
  expect(borderedGeometry.bordered).toBe(true);
  expect(borderedGeometry.verticalGap).toBe(-1);
  expect(borderedGeometry.leftDifference).toBe(0);
  expect(borderedGeometry.rightDifference).toBe(0);
  await expect(content).toHaveCSS("border-left-style", "solid");

  await next.click();
  await expect.poll(() => viewport.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
  await expect(previous).toBeEnabled();

  await page.evaluate(() => window.lab15.tabs.setActive("settings"));
  await expect.poll(() => tabbar.evaluate(element => {
    const viewportElement = element.querySelector(".dui-tabbar__viewport");
    const active = element.querySelector('[data-dui-tab-id="settings"]');
    const viewportRect = viewportElement.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    return activeRect.left >= viewportRect.left - 1 && activeRect.right <= viewportRect.right + 1;
  })).toBe(true);

  await page.evaluate(() => window.lab15.tabs.setBordered(false));
  await expect(tabbar).toHaveClass(/dui-tabbar--borderless/);
  await expect(content).toHaveCSS("border-left-style", "none");

  await page.evaluate(() => {
    window.lab15.tabs.setActive("mapping");
    window.lab15.tabs.setBordered(true);
    window.lab15.tabs.setOrientation("left");
  });
  await expect(tabbar).toHaveClass(/dui-tabbar--left/);
  await expect(tabbar.locator(".dui-tabbar__track")).toHaveAttribute("aria-orientation", "vertical");

  const up = tabbar.getByRole("button", { name:"Scroll tabs up" });
  const down = tabbar.getByRole("button", { name:"Scroll tabs down" });
  await expect(up).toBeVisible();
  await expect(up).toBeDisabled();
  await expect(down).toBeVisible();
  await expect(down).toBeEnabled();

  const leftGeometry = await tabbar.evaluate(element => {
    const contentElement = element.nextElementSibling;
    const tabRect = element.getBoundingClientRect();
    const contentRect = contentElement.getBoundingClientRect();
    const firstTab = element.querySelector(".dui-tabbar__tab");
    const firstTabRect = firstTab.getBoundingClientRect();
    return {
      horizontalJoin:contentRect.left - tabRect.right,
      topDifference:Math.abs(contentRect.top - tabRect.top),
      bottomDifference:Math.abs(contentRect.bottom - tabRect.bottom),
      stripWidth:tabRect.width,
      tabWidth:firstTabRect.width,
      tabHeight:firstTabRect.height,
      writingMode:getComputedStyle(firstTab).writingMode
    };
  });
  expect(leftGeometry.horizontalJoin).toBe(-1);
  expect(leftGeometry.topDifference).toBe(0);
  expect(leftGeometry.bottomDifference).toBe(0);
  expect(leftGeometry.stripWidth).toBeLessThanOrEqual(26);
  expect(leftGeometry.tabWidth).toBeLessThanOrEqual(26);
  expect(leftGeometry.tabHeight).toBeGreaterThan(leftGeometry.tabWidth);
  expect(leftGeometry.writingMode).toBe("vertical-rl");

  await down.click();
  await expect.poll(() => viewport.evaluate(element => element.scrollTop)).toBeGreaterThan(0);

  await page.evaluate(() => window.lab15.tabs.setOrientation("bottom"));
  await expect(tabbar).toHaveClass(/dui-tabbar--bottom/);
  await expect(tabbar.locator(".dui-tabbar__track")).toHaveAttribute("aria-orientation", "horizontal");
  const bottomJoin = await tabbar.evaluate(element => {
    const contentElement = element.nextElementSibling;
    return element.getBoundingClientRect().top - contentElement.getBoundingClientRect().bottom;
  });
  expect(bottomJoin).toBe(-1);

  await expectNoPageErrors(errors);
});


test('non-overflow tabs do not paint hidden navigation behind the first tab',async({page})=>{
 await page.goto('/browser-tests/recipes.html');
 await page.evaluate(async()=>{const {TabBar}=await import('/src/ui/all.js');window.compactTabs=new TabBar('#root',{width:400,tabs:[{id:'form',text:'Form'},{id:'table',text:'Table'}]});});
 const bar=page.locator('.dui-tabbar');
 for(const orientation of ['top','left','bottom','right']){
  await page.evaluate(o=>{const t=window.compactTabs;t.setOrientation(o);t.element.style.height='400px';},orientation);
  await expect(bar.locator('.dui-tabbar__scroll[hidden]')).toHaveCount(2);
  for(const button of await bar.locator('.dui-tabbar__scroll').all())await expect(button).toHaveCSS('display','none');
  await expect(bar.getByRole('tab',{name:'Form',exact:true})).toBeVisible();
  expect(await bar.locator('.dui-tabbar__viewport').evaluate(e=>e.getBoundingClientRect().width)).toBeGreaterThan(0);
 }
 await page.goto('/examples/theme-editor/');
 const preview=page.frameLocator('#preview');await expect(preview.getByRole('tab',{name:'Form',exact:true})).toBeVisible();
 for(const button of await preview.locator('.dui-tabbar__scroll').all())await expect(button).toHaveCSS('display','none');
 await page.screenshot({path:'test-results/theme-tabs-clean.png',fullPage:true});
});
