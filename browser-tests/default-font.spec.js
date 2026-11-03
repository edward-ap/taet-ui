import { test, expect } from "@playwright/test";

test("WOFF2 preserves original font pixels and metrics across weights and widths", async ({ page }) => {
  await page.goto("/browser-tests/recipes.html");
  const comparisons = await page.evaluate(async () => {
    const faces = await Promise.all([
      new FontFace("Original", 'url(/examples/labs/fonts/NotoSans-variable.ttf)', {weight: "100 900", stretch: "62.5% 100%"}).load(),
      new FontFace("Compressed", 'url(/src/ui/fonts/NotoSans-variable.woff2)', {weight: "100 900", stretch: "62.5% 100%"}).load()
    ]);
    faces.forEach(face => document.fonts.add(face));
    const canvas = document.createElement("canvas");
    canvas.width = 1000; canvas.height = 100;
    const ctx = canvas.getContext("2d", {willReadFrequently: true});
    const text = "GjøaReader Åéñ office ffi 0123456789 Ελληνικά Кириллица";
    const results = [];
    for (const weight of [100, 400, 600, 900]) {
      for (const stretch of ["condensed", "normal"]) {
        const samples = faces.map(face => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.font = `${weight} 22px ${face.family}`;
          ctx.fontStretch = stretch;
          ctx.fillText(text, 5, 45);
          return {width: ctx.measureText(text).width,
            pixels: ctx.getImageData(0, 0, canvas.width, canvas.height).data};
        });
        results.push({weight, stretch, sameWidth: samples[0].width === samples[1].width,
          samePixels: samples[0].pixels.every((v, i) => v === samples[1].pixels[i]),
          drawn: samples[0].pixels.some(v => v !== 0)});
      }
    }
    faces.forEach(face => document.fonts.delete(face));
    return results;
  });
  expect(comparisons).toHaveLength(8);
  for (const comparison of comparisons) {
    expect(comparison, JSON.stringify(comparison)).toMatchObject({sameWidth: true, samePixels: true, drawn: true});
  }
});

test("default UI uses bundled Noto Sans with compact metrics and supports overrides", async ({ page }) => {
  const fonts = [];
  page.on("response", response => {
    if (response.url().endsWith("NotoSans-variable.woff2")) fonts.push(response.status());
  });
  await page.goto("/browser-tests/recipes.html");
  const result = await page.evaluate(async () => {
    const { TextInput } = await import("/src/ui/inputs.js");
    document.body.classList.add("dui-profile-compact");
    const field = new TextInput("#root", { label: "Name / Имя", value: "Илья / William 101" });
    const loaded = await document.fonts.load('12px "Noto Sans"', "Илья William");
    const input = field.element.querySelector("input");
    const style = getComputedStyle(input);
    const metrics = { family: style.fontFamily, size: style.fontSize, height: input.getBoundingClientRect().height,
      row: getComputedStyle(document.body).getPropertyValue("--dui-row-height").trim(), loaded: loaded.length };
    document.body.style.setProperty("--dui-font-family", "Arial, sans-serif");
    metrics.override = getComputedStyle(input).fontFamily;
    field.destroy();
    return metrics;
  });
  expect(result.family.split(",")[0].replaceAll('"', '').trim()).toBe("Noto Sans");
  expect(result.loaded).toBeGreaterThan(0);
  expect(result.size).toBe("12px");
  expect(result.height).toBe(24);
  expect(result.row).toBe("22px");
  expect(result.override).toBe("Arial, sans-serif");
  expect(fonts).toContain(200);
});
