import { expect, test } from "@playwright/test";

const frames = page => page.evaluate(async () => { for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame); });
const cell = (page, row, column) => page.locator(`.dui-grid__body [data-dui-grid-row-id="string:r${row}"] [data-dui-grid-column-id="c${column}"]`);

test("reconciliation removes departed nodes without moving focused content and supports reorder/clear", async ({ page }) => {
  await page.goto("/browser-tests/recipes.html");
  const result = await page.evaluate(async () => {
    const { reconcileChildren } = await import("/src/ui/gridWindowGeometry.js");
    const host = document.querySelector("#root");
    const a = document.createElement("span"), b = document.createElement("div"), c = document.createTextNode("C"), d = document.createComment("D");
    const input = document.createElement("input"); b.append(input);
    host.append(a, b, c); input.value = "Draft"; input.focus(); input.setSelectionRange(1, 3);
    reconcileChildren(host, [b, c, d]);
    const focus = document.activeElement === input && input.value === "Draft" && input.selectionStart === 1 && input.selectionEnd === 3;
    const forward = [...host.childNodes].every((node, i) => node === [b, c, d][i]);
    reconcileChildren(host, [d, b, c]);
    const reorder = [...host.childNodes].every((node, i) => node === [d, b, c][i]);
    reconcileChildren(host, [a, d, b, c]);
    const back = [...host.childNodes].every((node, i) => node === [a, d, b, c][i]);
    reconcileChildren(host, []);
    return { focus, forward, reorder, back, empty: host.childNodes.length === 0 };
  });
  expect(result).toEqual({ focus: true, forward: true, reorder: true, back: true, empty: true });
});

async function setup(page, tree) {
  await page.goto("/browser-tests/recipes.html");
  await page.evaluate(async tree => {
    const { Grid, TreeGrid, gridEditors } = await import("/src/ui/grid-api.js");
    window.renderCalls = 0;
    window.suffix = "";
    window.grid = new (tree ? TreeGrid : Grid)({ width: 800, height: 400, rowHeight: 24,
      columnMenu: false, columnReorder: false, treeColumnId: "c0",
      expandedIds: Array.from({ length: 10 }, (_, i) => `r${i * 100}`),
      columns: Array.from({ length: 100 }, (_, c) => ({ id: `c${c}`, width: 120,
        summary: !tree && c === 0 ? "count" : null,
        frozen: c === 0 ? "left" : c === 99 ? "right" : null, editor: gridEditors.text(),
        render: value => { renderCalls++; const span = document.createElement("span"); span.textContent = value + suffix; return span; }
      }))
    }).mount(document.querySelector("#root"));
    grid.data.parse(Array.from({ length: 1000 }, (_, r) => Object.fromEntries([
      ["id", `r${r}`], ["parentId", r % 100 ? `r${r - r % 100}` : null],
      ...Array.from({ length: 100 }, (_, c) => [`c${c}`, `R${r} C${c}`])
    ])));
  }, tree);
  await frames(page);
  await page.evaluate(() => { grid._body.scrollTop = 2401; grid._body.scrollLeft = 6001; });
  await frames(page);
  await expect(cell(page, 100, 50)).toHaveText("R100 C50");
}

for (const tree of [false, true]) {
  const label = tree ? "TreeGrid" : "Grid";

  for (const [direction, dx, dy] of [["horizontal", 120, 0], ["vertical", 0, 24], ["diagonal", 120, 24]]) {
    test(`${label}: ${direction} boundary renders only entering cells in both directions`, async ({ page }) => {
      await setup(page, tree);
      const results = await page.evaluate(async ({ dx, dy }) => {
        const results = [];
        let moves = 0;
        const insert = Node.prototype.insertBefore;
        Node.prototype.insertBefore = function(node, cursor) {
          if (node.parentNode === this && grid.element.contains(this)) moves++;
          return insert.call(this, node, cursor);
        };
        try {
          for (const sign of [1, -1]) {
            const before = new Map([...grid._body.querySelectorAll(".dui-grid__cell")].map(cell => [cell.id, { cell, content: cell.firstChild }]));
            renderCalls = 0;
            moves = 0;
            grid._body.scrollLeft += sign * dx; grid._body.scrollTop += sign * dy;
            for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame);
            const cells = [...grid._body.querySelectorAll(".dui-grid__cell")];
            const retained = cells.filter(cell => before.has(cell.id));
            results.push({ entering: cells.length - retained.length, calls: renderCalls, moves, retained: retained.length,
              identity: retained.every(cell => cell === before.get(cell.id).cell && cell.firstChild === before.get(cell.id).content),
              values: cells.every(cell => {
                const r = Number(cell.parentElement.dataset.duiGridRowId.slice("string:r".length));
                const c = Number(cell.dataset.duiGridColumnId.slice(1));
                return cell.textContent === `R${r} C${c}` && cell.getAttribute("aria-colindex") === String(c + 1) &&
                  cell.parentElement.getAttribute("aria-rowindex") === String(r + 2);
              }),
              bounded: cells.length < 400 && grid._windowRenderer.rows.size < 35
            });
          }
          return results;
        } finally { Node.prototype.insertBefore = insert; }
      }, { dx, dy });
      for (const result of results) {
        expect(result.entering).toBeGreaterThan(0);
        expect(result.retained).toBeGreaterThan(result.entering);
        expect(result.calls).toBe(result.entering);
        expect(result.moves).toBe(0);
        expect(result.identity && result.values && result.bounded).toBe(true);
      }
    });
  }

  test(`${label}: an entering renderer can invalidate retained cells`, async ({ page }, testInfo) => {
    await setup(page, tree);
    await page.evaluate(() => {
      const visible = [...grid._body.querySelector(".dui-grid__row").querySelectorAll(".dui-grid__cell")]
        .map(cell => Number(cell.dataset.duiGridColumnId.slice(1))).filter(c => c !== 99);
      const column = grid.getColumn(`c${Math.max(...visible) + 1}`), original = column.render;
      window.enteringProbe = { columnId: column.id, calls: 0, beforeScroll: grid._body.scrollLeft, beforeColumns: visible };
      let pending = true;
      column.render = value => {
        enteringProbe.calls++;
        if (pending) { pending = false; grid.data.update("r100", { c50: "Updated by entering renderer" }, { silent: true }); }
        return original(value);
      };
      grid._body.scrollLeft += 120;
    });
    try {
      // Separate a missed entering paint/callback from stale retained content.
      await expect.poll(() => page.evaluate(() => enteringProbe.calls), { message: "entering renderer must execute after native scroll" }).toBeGreaterThan(0);
      expect(await page.evaluate(() => grid.data.get("r100").c50)).toBe("Updated by entering renderer");
      await expect(cell(page, 100, 50)).toHaveText("Updated by entering renderer");
    } finally {
      await testInfo.attach("entering-renderer-stages", { contentType: "application/json", body: JSON.stringify(await page.evaluate(() => ({
        ...enteringProbe, scrollLeft: grid._body.scrollLeft, model: grid.data.get("r100").c50,
        frameQueued: grid._windowRenderer.frame !== null, revision: grid._windowRenderer.revision,
        columns: [...grid._body.querySelector(".dui-grid__row").querySelectorAll(".dui-grid__cell")].map(cell => cell.dataset.duiGridColumnId)
      }))) });
    }
  });

  test(`${label}: same-window scroll preserves content and selection without body writes`, async ({ page }) => {
    await setup(page, tree);
    await cell(page, 101, 50).click();
    await frames(page);
    const result = await page.evaluate(async () => {
      const target = grid._body.querySelector('[data-dui-grid-row-id="string:r101"] [data-dui-grid-column-id="c50"]');
      const content = target.firstChild, active = grid.element.getAttribute("aria-activedescendant");
      const selected = target.parentElement.getAttribute("aria-selected");
      const range = target.classList.contains("dui-grid__cell--range-selected");
      let writes = 0;
      const observer = new MutationObserver(records => { writes += records.length; });
      observer.observe(grid._body, { subtree: true, attributes: true, childList: true, characterData: true });
      renderCalls = 0;
      grid._body.scrollLeft += 3; grid._body.scrollTop += 3;
      for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame);
      observer.disconnect();
      return { writes, renderCalls, sameContent: content === target.firstChild,
        active: active === grid.element.getAttribute("aria-activedescendant"),
        selected: selected === target.parentElement.getAttribute("aria-selected"),
        range: range === target.classList.contains("dui-grid__cell--range-selected"),
        aligned: grid._header.scrollLeft === grid._body.scrollLeft && (!grid._footer || grid._footer.scrollLeft === grid._body.scrollLeft) };
    });
    expect(result).toEqual({ writes: 0, renderCalls: 0, sameContent: true, active: true, selected: true, range: true, aligned: true });
    await expect(cell(page, 101, 0)).toBeVisible();
    await expect(cell(page, 101, 99)).toBeVisible();
    await page.evaluate(() => { grid._body.scrollLeft += 240; grid._body.scrollTop += 480; });
    await expect(cell(page, 120, 52)).toHaveText("R120 C52");
    expect(await page.evaluate(() => renderCalls)).toBeGreaterThan(0);
  });

  for (const distance of [3, 120]) for (const scrollFirst of [true, false]) test(`${label}: silent update wins over ${distance}px scroll (${scrollFirst ? "scroll first" : "update first"})`, async ({ page }) => {
    await setup(page, tree);
    await page.evaluate(({ scrollFirst, distance }) => {
      const scroll = () => { grid._body.scrollLeft += distance; grid._body.dispatchEvent(new Event("scroll")); };
      const update = () => grid.data.update("r100", { c50: "Updated" }, { silent: true });
      if (scrollFirst) { scroll(); update(); } else { update(); scroll(); }
    }, { scrollFirst, distance });
    await expect(cell(page, 100, 50)).toHaveText("Updated");
  });

  test(`${label}: explicit refresh reevaluates renderers and reentrant updates get their own paint`, async ({ page }) => {
    await setup(page, tree);
    await page.evaluate(() => { suffix = "!"; grid._body.scrollLeft += 3; });
    await frames(page);
    await expect(cell(page, 100, 50)).toHaveText("R100 C50");
    await page.evaluate(() => grid.refresh());
    await expect(cell(page, 100, 50)).toHaveText("R100 C50!");
    await page.evaluate(() => {
      const column = grid.getColumn("c50"), render = column.render;
      let pending = true;
      column.render = (value, item) => {
        if (pending && item.id === "r100") { pending = false; grid.data.update("r99", { c50: "Reentrant" }, { silent: true }); }
        return render(value);
      };
      grid.refresh();
    });
    await expect(cell(page, 99, 50)).toHaveText("Reentrant!");
  });

  for (const distance of [3, 24]) test(`${label}: a ${distance}px user scroll cancels the editor and restores cell content`, async ({ page }) => {
    await setup(page, tree);
    await page.evaluate(() => {
      window.cancellations = [];
      grid.events.on("editCancel", event => cancellations.push(event.reason));
      grid.startEdit("r100", "c50");
    });
    await frames(page);
    const input = cell(page, 100, 50).locator("input");
    await input.fill("Uncommitted");
    await page.evaluate(distance => { grid._body.scrollTop += distance; }, distance);
    await expect(input).toHaveCount(0);
    await expect(cell(page, 100, 50)).toHaveText("R100 C50");
    expect(await page.evaluate(() => cancellations)).toEqual(["scroll"]);
  });

  test(`${label}: geometry and column changes invalidate the remembered window`, async ({ page }) => {
    await setup(page, tree);
    await page.evaluate(() => { grid.setSize(950, 460); grid._body.scrollLeft += 3; });
    await frames(page);
    const indices = await cell(page, 100, 50).getAttribute("aria-colindex");
    expect(indices).toBe("51");
    await page.evaluate(() => { grid.hideColumn("c49"); grid._body.scrollLeft += 3; });
    await expect(cell(page, 100, 50)).toHaveAttribute("aria-colindex", "50");
    await page.evaluate(() => { grid.moveColumn("c50", 52); grid._body.scrollLeft += 3; });
    await expect(cell(page, 100, 50)).toHaveAttribute("aria-colindex", "52");
    await expect(cell(page, 100, 50)).toHaveText("R100 C50");
  });
}
