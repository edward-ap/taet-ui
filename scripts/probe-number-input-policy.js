/**
 * Observe NumberInput editing policy beside a bare native number input.
 * Usage: node scripts/probe-number-input-policy.js
 * Optional environment: TAET_UI_PORT (default 5213, loopback only).
 * Output: test-results/input-second-policy/number-input-policy.json
 *
 * Engines and pages run sequentially. This is a diagnostic observation matrix,
 * not a shipping gate that asserts a particular range or locale UX.
 * Playwright key events do not certify the OS keyboard layout, physical numpad,
 * native IME, macOS, or a production WebView. Native value setters and synthetic
 * input events are explicitly separate from keyboard gestures in the report.
 * Runtime source is read and hashed, never patched. Infrastructure/page errors
 * or changed source cause a nonzero exit; observed browser policy does not.
 */
import { chromium, firefox, webkit } from '@playwright/test';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { createTestServer } from './test-server.js';
const root = path.resolve(import.meta.dirname, '..');
const out = path.resolve(root, 'test-results/input-second-policy');
const port = Number(process.env.TAET_UI_PORT || 5213);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('TAET_UI_PORT must be an integer from 1 through 65535.');
}
// Output is deliberately fixed beneath the checkout, never supplied by a URL or argument.
const outputRelative = path.relative(root, out);
if (outputRelative.startsWith('..') || path.isAbsolute(outputRelative)) {
  throw new Error('Probe output must stay within the checkout.');
}
async function hashes(dir) {
  const result = {};
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory())
      Object.assign(result, await hashes(p));
    else
      result[path.relative(root, p)] = createHash('sha256').update(await readFile(p)).digest('hex');
  }
  return result;
}
const before = await hashes(path.join(root, 'src'));
await mkdir(out, { recursive: true });
const server = createTestServer(root);
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(port, '127.0.0.1', resolve);
});
const report = {
  started: new Date().toISOString(),
  platform: process.platform,
  scope: 'Headless Playwright keyboard events; locale emulation is not OS keyboard layout or native host certification.',
  clampInput: 'Not a declared or implemented option. Probe uses clamp and clampToRange.',
  engines: [],
  cases: [],
  errors: []
};
const constraints = [
  ['min10-type12', { min: 10 }, '12'],
  ['min10-type12-unclamped', { min: 10, clamp: false }, '12'],
  ['min10-alias-unclamped', { min: 10, clampToRange: false }, '12'],
  ['max10-type12', { max: 10 }, '12'],
  ['max10-type12-unclamped', { max: 10, clamp: false }, '12'],
  ['max-negative', { max: -10 }, '-12'],
  ['min0-negative', { min: 0 }, '-12'],
  ['negative', {}, '-0.05'],
  ['minus-only', {}, '-'],
  ['decimal-default', {}, '1.0'],
  ['decimal-unclamped', { clamp: false }, '1.0'],
  ['decimal-any', { step: 'any' }, '1.05'],
  ['decimal-default-step', {}, '1.05']
];
try {
  for (const [engine, type] of Object.entries({
    chromium, firefox, webkit
  })) {
    const browser = await type.launch();
    report.engines.push({ engine, version: browser.version() });
    try {
      for (const locale of ['en-US', 'ru-RU', 'de-DE']) {
        const context = await browser.newContext({ locale });
        const page = await context.newPage();
        page.on('pageerror', e => report.errors.push({
          engine, locale, message: e.message
        }));
        for (const lang of ['en-US', 'ru-RU', 'de-DE']) {
          const jobs = [['comma', {}, '1,05'],
  ['dot', {}, '1.05'],
  ['assignment', {}, null]];
          if (locale === 'en-US' && lang === 'en-US')
            jobs.push(...constraints);
          for (const [name, options, text] of jobs)
            for (const kind of ['native', 'taet']) {
              await page.goto(`http://127.0.0.1:${port}/browser-tests/recipes.html`);
              await page.evaluate(async ({ kind, options, lang }) => {
                document.documentElement.lang = lang;
                window.events = [];
                window.steps = [];
                window.control = null;
                const host = document.querySelector('#root');
                if (kind === 'taet') {
                  const { NumberInput } = await import('/src/ui/inputs.js');
                  window.control = new NumberInput(host, options);
                }
                else {
                  const input = document.createElement('input');
                  input.type = 'number';
                  for (const attr of ['min', 'max', 'step'])
                    if (options[attr] != null)
                      input[attr] = String(options[attr]);
                  host.append(input);
                }
                const input = host.querySelector('input');
                input.id = 'probe';
                input.lang = lang;
                const button = document.createElement('button');
                button.id = 'outside';
                button.textContent = 'Outside';
                host.append(button);
                window.snapshot = () => ({
                  value: input.value,
                  valueAsNumber: Number.isNaN(input.valueAsNumber) ? 'NaN' : input.valueAsNumber,
                  model: control ? control.value.get() : null,
                  validity: Object.fromEntries(['valid', 'badInput', 'rangeUnderflow', 'rangeOverflow', 'stepMismatch', 'valueMissing'].map(k => [k, input.validity[k]])),
                  display: control?.getDisplayValue(),
                  raw: control?.getRawValue()
                });
                for (const phase of ['capture', 'bubble'])
                  for (const event of ['keydown', 'beforeinput', 'input', 'change', 'blur'])
                    document.addEventListener(event, e => {
                      if (e.target === input)
                        events.push({
                          phase,
                          event,
                          key: e.key,
                          data: e.data,
                          inputType: e.inputType,
                          trusted: e.isTrusted,
                          ...snapshot()
                        });
                    }, phase === 'capture');
                if (control)
                  for (const event of ['beforeChange', 'change', 'afterChange'])
                    control.events.on(event, e => events.push({
                      phase: 'semantic',
                      event,
                      oldValue: e.oldValue,
                      newValue: e.newValue,
                      origin: e.origin,
                      userAction: e.userAction,
                      ...snapshot()
                    }));
              }, {
                kind, options, lang
              });
              const steps = [];
              const snap = async (action) => steps.push({ action, ...await page.evaluate(() => snapshot()) });
              await snap('initial');
              const input = page.locator('#probe');
              await input.focus();
              if (text !== null) {
                for (const key of text) {
                  await input.press(key);
                  await snap(`key:${key}`);
                }
                await page.locator('#outside').click();
                await snap('blur');
                await input.focus();
                await input.press('ControlOrMeta+A');
                await input.press('Backspace');
                await snap('clear-keyboard');
              }
              else {
                for (const value of [1.05, 12, null]) {
                  await page.evaluate(({ kind, value }) => {
                    if (kind === 'taet')
                      control.value.set(value);
                    else if (value === null)
                      document.querySelector('#probe').value = '';
                    else
                      document.querySelector('#probe').valueAsNumber = value;
                  }, { kind, value });
                  await snap(`numeric-api:${value}`);
                }
                for (const value of ['1.05', '1,05', '1.0', '-', '']) {
                  await page.evaluate(value => {
                    const i = document.querySelector('#probe');
                    i.value = value;
                    i.dispatchEvent(new Event('input', { bubbles: true }));
                  }, value);
                  await snap(`native-value-string-plus-synthetic-input:${value}`);
                }
              }
              report.cases.push({
                engine,
                locale,
                lang,
                name,
                kind,
                options,
                steps,
                ...await page.evaluate(() => ({
                  navigatorLanguage: navigator.language,
                  intlLocale: Intl.NumberFormat().resolvedOptions().locale,
                  events
                }))
              });
              await page.evaluate(() => control?.destroy());
            }
        }
        await context.close();
      }
    }
    finally {
      await browser.close();
    }
    console.log(`${engine}: observations complete`);
  }
}
catch (error) {
  report.errors.push({ fatal: String(error.stack || error) });
  process.exitCode = 1;
}
finally {
  await new Promise(resolve => server.close(resolve));
  report.sourceUnchanged = JSON.stringify(before) === JSON.stringify(await hashes(path.join(root, 'src')));
  report.finished = new Date().toISOString();
  await writeFile(path.join(out, 'number-input-policy.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    cases: report.cases.length,
    errors: report.errors,
    sourceUnchanged: report.sourceUnchanged,
    output: path.join(out, 'number-input-policy.json')
  }));
  if (!report.sourceUnchanged || report.errors.length > 0)
    process.exitCode = 1;
}
