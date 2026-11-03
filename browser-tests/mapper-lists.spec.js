import { expect, test } from "@playwright/test";
import { capturePageErrors, expectNoPageErrors } from "./smoke-helpers.js";

const connection = (page, id) => page.locator(`[data-dui-connector-id="${id}"]`);
const port = (page, owner, id) => page.locator(`[data-dui-port-control-id="${owner}"][data-dui-port-item-id="${id}"]`);

test.beforeEach(async ({ page }) => {
  await page.goto("/examples/labs/mapper-lists.html");
  await expect(connection(page, "customer-name")).toHaveCount(1);
});

test("focused connections highlight their stroke without a rectangular browser outline", async ({ page }) => {
  const path = connection(page, "customer-name");
  await expect(async () => {
    const point = await path.evaluate(element => {
      const middle = element.getPointAtLength(element.getTotalLength() / 2);
      return new DOMPoint(middle.x, middle.y).matrixTransform(element.getScreenCTM()).toJSON();
    });
    // Firefox's path sampling can return 219.99998 for pixel 220; pointer
    // injection truncates it and misses a 1.6px stroke by a whole pixel.
    await page.mouse.click(Math.round(point.x), Math.round(point.y));
    await expect(path).toBeFocused({ timeout:500 });
  }).toPass();
  await expect(path).toHaveClass(/dui-selected/);
  await expect(path).toHaveCSS("outline-style", "none");
  await page.evaluate(() => window.mapperLists.layer.selection.clear());
  await page.mouse.move(1200, 700);
  await page.keyboard.press("Tab");
  await path.focus();
  await expect(path).toHaveCSS("outline-style", "none");
  await expect(path).toHaveCSS("stroke-width", "3px");
  await path.press("Delete");
  await expect(path).toHaveCount(0);
});

test("tree proxies, silent geometry, scrolling, filtering and deletion retain logical endpoints", async ({ page }, testInfo) => {
  const errors = capturePageErrors(page);
  await page.screenshot({ path:testInfo.outputPath("mapper-lists.png") });
  await expect(page.locator(".mapper-field").first()).toContainText("object");
  const initial = await connection(page, "customer-name").getAttribute("d");
  await page.evaluate(() => {
    const { sourceWindow } = window.mapperLists;
    window.geometryEvents = 0;
    sourceWindow.events.on("geometryChange", () => ++window.geometryEvents);
    sourceWindow.moveTo(130, 70, { silent:true });
  });
  await expect.poll(() => connection(page, "customer-name").getAttribute("d")).not.toBe(initial);
  expect(await page.evaluate(() => window.geometryEvents)).toBe(0);
  await page.evaluate(() => window.mapperLists.source.collapse("customer", { silent:true }));
  await expect(connection(page, "customer-name")).toHaveAttribute("data-dui-source-status", "collapsed");
  expect(await page.evaluate(() => {
    const { source, model, sourceWindow } = window.mapperLists;
    return [source.getItemGeometry("name").anchorId, model.get("customer-name").source.itemId,
      sourceWindow.portProvider.getPortPosition(model.get("customer-name").source).proxyItemId];
  })).toEqual(["customer", "name", "customer"]);
  await expect(port(page, "source", "customer")).toHaveClass(/dui-connected/);
  await page.evaluate(() => window.mapperLists.source.expandAll({ silent:true }));
  await expect(connection(page, "customer-name")).toHaveAttribute("data-dui-source-status", "visible");
  await page.evaluate(() => { window.mapperLists.source.element.scrollTop = 400; });
  await expect(connection(page, "customer-name")).toHaveAttribute("data-dui-source-status", "above");
  await page.evaluate(() => window.mapperLists.source.treeView.setFilter(item => item.id !== "name", { silent:true }));
  await expect(connection(page, "customer-name")).toHaveCount(0);
  expect(await page.evaluate(() => window.mapperLists.source.getItemGeometry("name").status)).toBe("filtered");
  await page.evaluate(() => window.mapperLists.source.treeView.setFilter(null, { silent:true }));
  await expect(connection(page, "customer-name")).toHaveCount(1);
  await page.evaluate(() => window.mapperLists.source.data.remove("name", { silent:true }));
  await expect(connection(page, "customer-name")).toHaveCount(0);
  expect(await page.evaluate(() => [window.mapperLists.source.getItemGeometry("name").status, !!window.mapperLists.model.get("customer-name")])).toEqual(["missing", true]);
  await expectNoPageErrors(errors);
});

test("custom row resize updates geometry without a data or selection event", async ({ page }) => {
  const initial = await connection(page, "customer-name").getAttribute("d");
  await page.locator('.dui-tree-list [data-dui-list-item-id="string:orderId"]').evaluate(row => { row.style.height = "65px"; });
  await expect.poll(() => connection(page, "customer-name").getAttribute("d")).not.toBe(initial);
  const rect = await page.locator('.dui-tree-list [data-dui-list-item-id="string:name"]').boundingBox();
  const p = await port(page, "source", "name").boundingBox();
  expect(Math.abs(p.y + p.height / 2 - rect.y - rect.height / 2)).toBeLessThan(1);
});

test("keyboard connects, cancels, reconnects both ends and removes without losing metadata", async ({ page }) => {
  const source = port(page, "source", "customerId");
  await source.focus();
  await source.press("Enter");
  await expect(page.locator(".dui-connector-layer__draft")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator(".dui-connector-layer__draft")).toHaveCount(0);
  await source.press("Enter");
  await port(page, "target", "customer").press("Enter");
  const id = await page.evaluate(() => window.mapperLists.model.all().at(-1).id);
  await expect(connection(page, id)).toHaveCount(1);
  await page.evaluate(id => window.mapperLists.model.update(id, { data:{ test:42 }, label:"Retained" }), id);
  await connection(page, id).press("r");
  await port(page, "target", "total").press("Enter");
  expect(await page.evaluate(id => [window.mapperLists.model.get(id).target.itemId, window.mapperLists.model.get(id).data.test], id)).toEqual(["total", 42]);
  await connection(page, id).press("Shift+R");
  await port(page, "source", "amount").press("Enter");
  expect(await page.evaluate(id => window.mapperLists.model.get(id).source.itemId, id)).toBe("amount");
  await connection(page, id).press("Delete");
  await expect(connection(page, id)).toHaveCount(0);
});

test("pointer connections preserve numeric zero and string zero as different identities", async ({ page }) => {
  await page.evaluate(() => {
    const { target } = window.mapperLists;
    target.data.parse([{ id:0, text:"Number zero", type:"number" }, { id:"0", text:"String zero", type:"string" }]);
  });
  const targets = port(page, "target", "0");
  await expect(targets).toHaveCount(2);
  for (let index = 0; index < 2; index++) {
    // WebKit may finish a queued SVG replacement between resolving a locator
    // and measuring its old node. Wait for the current port's layout.
    let from, to;
    await expect.poll(async () => {
      from = await port(page, "source", "name").boundingBox();
      to = await targets.nth(index).boundingBox();
      return !!from && !!to;
    }).toBe(true);
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps:4 });
    await page.mouse.up();
  }
  expect(await page.evaluate(() => window.mapperLists.model.all().slice(-2).map(item => [typeof item.target.itemId, item.target.itemId]))).toEqual([["number", 0], ["string", "0"]]);
});

test("validation, veto and callback teardown cannot commit an invalid connection", async ({ page }) => {
  const errors = capturePageErrors(page);
  const result = await page.evaluate(() => {
    const { layer, model, sourceWindow } = window.mapperLists;
    const source = { controlId:"source", itemId:"name", side:"right" };
    const target = { controlId:"target", itemId:"customer", side:"left" };
    const rejected = layer.connect(target, source) === null;
    const veto = layer.events.on("beforeConnectionChange", event => { event.cancel = true; });
    const cancelled = layer.connect(source, target) === null;
    veto.dispose();
    const removeVeto = layer.events.on("beforeConnectionRemove", event => { event.cancel = true; });
    const retained = !layer.removeConnection("identity");
    removeVeto.dispose();
    layer.canConnect = () => { sourceWindow.destroy(); return true; };
    const destroyed = layer.connect(source, target) === null;
    layer.render();
    return { rejected, cancelled, retained, destroyed, count:model.all().length, providers:layer.providers.size };
  });
  expect(result).toEqual({ rejected:true, cancelled:true, retained:true, destroyed:true, count:3, providers:1 });
  await expectNoPageErrors(errors);
});

test("close unregisters providers, cancels draft and allows reattaching the same logical source", async ({ page }) => {
  const errors = capturePageErrors(page);
  await port(page, "source", "name").press("Enter");
  const result = await page.evaluate(async () => {
    const { workspace, sourceWindow, layer, model } = window.mapperLists;
    const old = sourceWindow.portProvider;
    sourceWindow.close();
    const after = [layer.providers.size, old.getPorts().length, old.getPortPosition(model.get("identity").source)];
    const { List, MapperWindow } = await import("/src/ui/all.js");
    const list = new List();
    list.data.parse([{ id:"orderId", text:"Restored ID" }]);
    const replacement = workspace.addWindow(new MapperWindow({ name:"source", title:"Restored", content:list, x:60, y:60, width:300, height:200 }));
    replacement.connect(layer);
    return after;
  });
  expect(result).toEqual([1, 0, null]);
  await expect(page.locator(".dui-connector-layer__draft")).toHaveCount(0);
  await expect(connection(page, "identity")).toHaveCount(1);
  await expectNoPageErrors(errors);
});

test("silent sorting, window collapse and destruction keep adapters synchronized", async ({ page }) => {
  const errors = capturePageErrors(page);
  const initial = await connection(page, "identity").getAttribute("d");
  await page.evaluate(() => window.mapperLists.source.treeView.setSort((a, b) => String(a.id).localeCompare(String(b.id)), { silent:true }));
  await expect.poll(() => connection(page, "identity").getAttribute("d")).not.toBe(initial);
  await page.evaluate(() => {
    window.collapseEvents = 0;
    window.mapperLists.sourceWindow.events.on("collapse", () => ++window.collapseEvents);
    window.mapperLists.sourceWindow.events.on("geometryChange", () => ++window.collapseEvents);
    window.mapperLists.sourceWindow.collapse({ silent:true });
  });
  await expect(connection(page, "identity")).toHaveAttribute("data-dui-source-status", "collapsed");
  expect(await page.evaluate(() => window.collapseEvents)).toBe(0);
  await page.evaluate(() => window.mapperLists.sourceWindow.expand({ silent:true }));
  expect(await page.evaluate(() => {
    const { workspace, layer, model } = window.mapperLists;
    workspace.destroy();
    return [layer.providers.size, layer.destroyed, model.destroyed];
  })).toEqual([0, true, false]);
  await expectNoPageErrors(errors);
});

test("filter-expanded parents do not proxy excluded children and pointercancel releases drag", async ({ page }) => {
  let from;
  await expect.poll(async () => {
    from = await port(page, "source", "name").boundingBox();
    return Boolean(from && from.width > 0 && from.height > 0);
  }, { message: "Source port must be painted before pointer coordinates are read" }).toBe(true);
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(530, 300);
  await expect(page.locator(".dui-connector-layer__draft")).toHaveCount(1);
  await page.evaluate(() => window.dispatchEvent(new PointerEvent("pointercancel")));
  await page.mouse.up();
  await expect(page.locator(".dui-connector-layer__draft")).toHaveCount(0);
  await page.evaluate(() => {
    const { source } = window.mapperLists;
    source.collapse("customer", { silent:true });
    source.treeView.setFilter(item => item.id === "customerId", { silent:true });
  });
  await expect(connection(page, "customer-name")).toHaveCount(0);
  expect(await page.evaluate(() => window.mapperLists.source.getItemGeometry("name").status)).toBe("filtered");
});

test("TreeList custom renderers retain toggles and tolerate teardown during rendering", async ({ page }) => {
  const errors = capturePageErrors(page);
  await page.locator('[data-dui-list-item-id="string:customer"] [data-dui-tree-toggle]').click();
  await expect(connection(page, "customer-name")).toHaveAttribute("data-dui-source-status", "collapsed");
  await page.locator('[data-dui-list-item-id="string:customer"] [data-dui-tree-toggle]').click();
  await expect(connection(page, "customer-name")).toHaveAttribute("data-dui-source-status", "visible");
  expect(await page.evaluate(() => {
    const { source, layer } = window.mapperLists;
    source.renderItem = () => { source.destroy(); return "Late row"; };
    source.refresh();
    layer.render();
    return [source.destroyed, layer.providers.size, source.getVisibleItemGeometries().length];
  })).toEqual([true, 1, 0]);
  await expectNoPageErrors(errors);
});

test("static provider follows silent movement and window visibility", async ({ page }) => {
  await page.goto("/examples/labs/lab27.html");
  const staticPort = port(page, "transformerWindow", "input-1");
  await expect(staticPort).toHaveCount(1);
  const before = await staticPort.getAttribute("cx");
  await page.evaluate(() => window.lab27.transformerWindow.moveTo(970, 470, { silent:true }));
  await expect.poll(() => staticPort.getAttribute("cx")).not.toBe(before);
  await page.evaluate(() => window.lab27.transformerWindow.hide());
  await expect(staticPort).toHaveCount(0);
  await page.evaluate(() => window.lab27.transformerWindow.show());
  await expect(staticPort).toHaveCount(1);
});

test("Grid ports enumerate mounted rows and reuse their identity index; TreeGrid proxies collapsed ancestors", async ({ page }) => {
  await page.goto("/examples/labs/lab27.html");
  await expect(port(page, "customersWindow", "customer_id")).toHaveCount(2);
  const result = await page.evaluate(async () => {
    const { customers, customersPorts, projectTree, projectPorts } = window.lab27;
    customers.data.parse(Array.from({ length:10000 }, (_, id) => ({ id, name:`Field ${id}`, type:"string" })), { silent:true });
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const original = customers.view.idOf.bind(customers.view);
    let calls = 0;
    customers.view.idOf = (...args) => { calls++; return original(...args); };
    const ports = customersPorts.getPorts();
    const enumerationCalls = calls;
    const endpoint = { controlId:"customersWindow", itemId:9999, side:"right" };
    const offscreen = customersPorts.getPortPosition(endpoint);
    calls = 0;
    customersPorts.getPortPosition(endpoint);
    const cachedCalls = calls;
    customers.view.idOf = original;
    projectTree.collapse("inputs", { silent:true });
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const proxy = projectPorts.getPortPosition({ controlId:"projectWindow", itemId:"crm", side:"right" });
    return { count:ports.length, enumerationCalls, cachedCalls, offscreen:offscreen.status, proxy:proxy.status, anchor:proxy.proxyItemId };
  });
  expect(result.count).toBeGreaterThan(0);
  expect(result.count).toBeLessThan(100);
  expect(result).toMatchObject({ enumerationCalls:0, cachedCalls:0, offscreen:"below", proxy:"collapsed", anchor:"inputs" });
});
