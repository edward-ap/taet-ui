import { expect, test } from "@playwright/test";
import { capturePageErrors, expectNoPageErrors } from "./smoke-helpers.js";

test("lab20 applies light and dark theme tokens to shared visual primitives", async ({ page }) => {
  const errors = capturePageErrors(page);
  await page.goto("/examples/labs/lab20.html");

  const readTheme = () => page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const action = document.querySelector(".dui-header-action");
    const actionStyle = getComputedStyle(action);
    const actionIconStyle = getComputedStyle(action.querySelector(".dui-icon"));
    const headerStyle = getComputedStyle(action.closest(".dui-window-header"));
    const scrollbar = document.querySelector(".dui-log-panel");
    const webkit = CSS.supports("selector(::-webkit-scrollbar)");
    const scrollbarStyle = webkit ? getComputedStyle(scrollbar, "::-webkit-scrollbar") : null;
    const thumbStyle = webkit ? getComputedStyle(scrollbar, "::-webkit-scrollbar-thumb") : null;
    const standard = getComputedStyle(scrollbar);
    const probe = document.createElement("span");
    probe.style.scrollbarWidth = "thin";
    probe.style.scrollbarColor = "var(--dui-scrollbar-thumb) transparent";
    probe.style.color = "var(--dui-scrollbar-thumb)";
    scrollbar.append(probe);
    const expected = getComputedStyle(probe);
    const result = {
      theme:document.body.dataset.theme,
      bodyBackground:body.backgroundColor,
      actionColor:actionStyle.color,
      headerBackground:headerStyle.backgroundColor,
      actionWidth:actionStyle.width,
      actionHeight:actionStyle.height,
      actionDisplay:actionStyle.display,
      actionAlign:actionStyle.alignItems,
      actionJustify:actionStyle.justifyContent,
      actionIconWidth:actionIconStyle.width,
      actionIconHeight:actionIconStyle.height,
      actionPressed:action.getAttribute("aria-pressed"),
      webkit,
      standardWidthSupported:CSS.supports("scrollbar-width", "thin"),
      standardColorSupported:CSS.supports("scrollbar-color", "red transparent"),
      scrollbarWidth:scrollbarStyle?.width,
      scrollbarHeight:scrollbarStyle?.height,
      scrollbarThumb:thumbStyle?.backgroundColor,
      standardWidth:standard.scrollbarWidth,
      standardColor:standard.scrollbarColor,
      expectedWidth:expected.scrollbarWidth,
      expectedColor:expected.scrollbarColor,
      expectedThumb:expected.color
    };
    probe.remove();
    return result;
  });
  const expectScrollbars = theme => {
    expect(theme.webkit || theme.standardWidthSupported).toBe(true);
    if (theme.webkit) {
      expect(theme.scrollbarWidth).toBe("6px");
      expect(theme.scrollbarHeight).toBe("6px");
      expect(theme.scrollbarThumb).toBe(theme.expectedThumb);
    }
    // macOS Firefox normalizes thin to none even on a native reference element.
    if (theme.standardWidthSupported) expect(theme.standardWidth).toBe(theme.expectedWidth);
    if (theme.standardColorSupported) expect(theme.standardColor).toBe(theme.expectedColor);
  };

  const light = await readTheme();
  expect(light.theme).toBe("light-blue");
  expect(light.actionWidth).toBe("20px");
  expect(light.actionHeight).toBe("20px");
  expect(light.actionDisplay).toBe("flex");
  expect(light.actionAlign).toBe("center");
  expect(light.actionJustify).toBe("center");
  expect(light.actionIconWidth).toBe("16px");
  expect(light.actionIconHeight).toBe("16px");
  expect(light.actionPressed).toBeNull();
  expectScrollbars(light);

  await page.getByRole("button", { name:"Dark Blue" }).click();
  const dark = await readTheme();
  expect(dark.theme).toBe("dark-blue");
  expect(dark.bodyBackground).not.toBe(light.bodyBackground);
  expect(light.actionColor).toBe("rgb(255, 255, 255)");
  expect(dark.actionColor).toBe(light.actionColor);
  expect(dark.headerBackground).not.toBe(light.headerBackground);
  expectScrollbars(dark);
  if (dark.webkit) expect(dark.scrollbarThumb).not.toBe(light.scrollbarThumb);
  if (dark.standardColorSupported) expect(dark.standardColor).not.toBe(light.standardColor);
  expect(dark.actionWidth).toBe(light.actionWidth);
  expect(dark.actionHeight).toBe(light.actionHeight);
  expect(dark.scrollbarWidth).toBe(light.scrollbarWidth);

  await page.getByRole("button", { name:"Light Blue" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-theme", "light-blue");
  await expectNoPageErrors(errors);
});

test("Form applies shared label geometry, field overrides, indent, and disabled styling", async ({ page }) => {
  const errors = capturePageErrors(page);
  await page.goto("/examples/labs/lab20.html");

  const result = await page.evaluate(async () => {
    const { Form, TextInput } = await import("/src/ui/all.js");
    const host = document.createElement("div");
    host.style.width = "600px";
    document.body.appendChild(host);

    const inheritedTop = new TextInput({ label: "First name", value: "Ada", disabled: true });
    const explicitLeft = new TextInput({
      label: "Last name",
      value: "Lovelace",
      labelPosition: "left",
      labelWidth: 90,
      indent: 5
    });
    const form = new Form({ labelPosition: "top", fieldIndent: 12 })
      .columns(Form.column(inheritedTop), Form.column(explicitLeft));
    form.mount(host);

    const topLabel = inheritedTop.element.querySelector(".dui-text-field__label").getBoundingClientRect();
    const topInput = inheritedTop.element.querySelector("input");
    const topInputRect = topInput.getBoundingClientRect();
    const leftLabel = explicitLeft.element.querySelector(".dui-text-field__label").getBoundingClientRect();
    const leftInputRect = explicitLeft.element.querySelector("input").getBoundingClientRect();
    const disabledStyle = getComputedStyle(topInput);
    const disabledProbe = document.createElement("div");
    disabledProbe.style.background = "var(--dui-button-bg-disabled)";
    document.body.appendChild(disabledProbe);

    const values = {
      labIndent: getComputedStyle(document.querySelector(".dui-form")).paddingInlineStart,
      labPaddingTop: getComputedStyle(document.querySelector(".dui-form")).paddingTop,
      labPaddingBottom: getComputedStyle(document.querySelector(".dui-form")).paddingBottom,
      formIndent: getComputedStyle(form.element).paddingInlineStart,
      fieldIndent: getComputedStyle(explicitLeft.element).paddingInlineStart,
      inheritedIsTop: topLabel.bottom <= topInputRect.top,
      overrideIsLeft: leftLabel.right <= leftInputRect.left,
      disabled: topInput.disabled,
      disabledBackground: disabledStyle.backgroundColor,
      expectedDisabledBackground: getComputedStyle(disabledProbe).backgroundColor,
      disabledLabelColor: getComputedStyle(inheritedTop.element.querySelector(".dui-text-field__label")).color,
      normalLabelColor: getComputedStyle(explicitLeft.element.querySelector(".dui-text-field__label")).color
    };

    form.destroy();
    host.remove();
    disabledProbe.remove();
    window.lab20.form.disable();
    const labNativeEditors = [...document.querySelectorAll(".dui-form input, .dui-form select, .dui-form textarea")];
    values.labEditorsDisabled = labNativeEditors.every(editor => editor.disabled);
    values.labDisabledSurfaces = [...document.querySelectorAll(".dui-form .dui-text-field__input")]
      .every(editor => getComputedStyle(editor).backgroundColor === values.expectedDisabledBackground);
    return values;
  });

  expect(result.labIndent).toBe("8px");
  expect(result.labPaddingTop).toBe("8px");
  expect(result.labPaddingBottom).toBe("8px");
  expect(result.formIndent).toBe("12px");
  expect(result.fieldIndent).toBe("5px");
  expect(result.inheritedIsTop).toBe(true);
  expect(result.overrideIsLeft).toBe(true);
  expect(result.disabled).toBe(true);
  expect(result.disabledBackground).toBe(result.expectedDisabledBackground);
  expect(result.disabledLabelColor).not.toBe(result.normalLabelColor);
  expect(result.labEditorsDisabled).toBe(true);
  expect(result.labDisabledSurfaces).toBe(true);
  await expectNoPageErrors(errors);
});
