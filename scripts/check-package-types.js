import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import * as runtime from '../src/core/index.js';
import * as editorRuntime from '../src/ui/GridEditors.js';
import * as gridRuntime from '../src/ui/grid-api.js';
import * as inputRuntime from '../src/ui/inputs.js';
import * as stableRuntime from '../src/ui/index.js';
import * as experimentalRuntime from '../src/ui/experimental.js';
import * as allRuntime from '../src/ui/all.js';
import * as foundationRuntime from '../src/foundation/index.js';
import * as componentRuntime from '../src/components/index.js';
import * as advancedRuntime from '../src/advanced/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this check through npm run test:types.');
const tsc = path.join(root, 'node_modules/typescript/lib/tsc.js');
function command(file, args, cwd) {
  try { return execFileSync(process.execPath, [file, ...args], { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 4 * 1024 * 1024 }); }
  catch (error) { throw new Error(`${path.basename(file)} failed:\n${error.stdout ?? ''}${error.stderr ?? ''}`); }
}

// Check the declared value exports against real exports and public prototype names.
// No declaration may paper over missing coverage with an explicit any.
const entries = [
  { file: 'src/core/index.d.ts', runtime },
  { file: 'src/foundation/index.d.ts', runtime: foundationRuntime },
  { file: 'src/components/index.d.ts', runtime: componentRuntime },
  { file: 'src/advanced/index.d.ts', runtime: advancedRuntime },
  { file: 'src/ui/GridEditors.d.ts', runtime: editorRuntime },
  { file: 'src/ui/grid-api.d.ts', runtime: gridRuntime },
  { file: 'src/ui/inputs.d.ts', runtime: inputRuntime },
  { file: 'src/ui/index.d.ts', runtime: stableRuntime },
  { file: 'src/ui/experimental.d.ts', runtime: experimentalRuntime },
  { file: 'src/ui/all.d.ts', runtime: allRuntime }
];
const program = ts.createProgram(entries.map(entry => path.join(root, entry.file)), { strict: true, noEmit: true, module: ts.ModuleKind.NodeNext, target: ts.ScriptTarget.ES2022 });
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCanonicalFileName: f => f, getCurrentDirectory: () => root, getNewLine: () => '\n'
}));
const checker = program.getTypeChecker();
let valueCount = 0;
for (const entry of entries) {
  const source = program.getSourceFile(path.join(root, entry.file));
  const symbols = checker.getExportsOfModule(checker.getSymbolAtLocation(source));
  const values = symbols.filter(s => (s.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(s) : s).flags & ts.SymbolFlags.Value);
  valueCount += values.length;
  assert.deepEqual(values.map(s => s.name).sort(), Object.keys(entry.runtime).sort(), `Declaration/runtime exports differ: ${entry.file}`);
  for (const symbol of values) {
    const value = entry.runtime[symbol.name];
    if (symbol.name === 'gridEditors' || symbol.name === 'gridExporters') {
      const declared = checker.getTypeOfSymbolAtLocation(symbol, source);
      assert.deepEqual(declared.getProperties().map(s => s.name).sort(), Object.keys(value).sort(), `${symbol.name} factory names differ`);
    }
    if (typeof value !== 'function' || !value.prototype) continue;
    const resolved = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
    const declared = checker.getDeclaredTypeOfSymbol(resolved);
    for (const name of Object.getOwnPropertyNames(value.prototype).filter(n => n !== 'constructor' && !n.startsWith('_'))) {
      assert.ok(checker.getPropertyOfType(declared, name), `${symbol.name}.${name} missing from declarations`);
    }
    const staticType = checker.getTypeOfSymbolAtLocation(symbol, source);
    for (const name of Object.getOwnPropertyNames(value).filter(n => !['prototype', 'length', 'name', 'arguments', 'caller'].includes(n) && !n.startsWith('_'))) {
      assert.ok(checker.getPropertyOfType(staticType, name), `${symbol.name}.${name} static member missing from declarations`);
    }
    const runtimeFile = ['ui', 'core'].map(dir => path.join(root, 'src', dir, `${value.name}.js`)).find(existsSync);
    if (runtimeFile) {
      const implementation = ts.createSourceFile(runtimeFile, readFileSync(runtimeFile, 'utf8'), ts.ScriptTarget.Latest, true);
      const classNode = implementation.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === value.name);
      const eventSymbol = checker.getPropertyOfType(declared, 'events');
      const eventMap = eventSymbol && checker.getTypeArguments(checker.getTypeOfSymbolAtLocation(eventSymbol, source))[0];
      function inspectEvents(node) {
        if (eventMap && ts.isCallExpression(node) && node.expression.getText(implementation) === 'this.events.emit' && ts.isStringLiteral(node.arguments[0])) {
          assert.ok(checker.getPropertyOfType(eventMap, node.arguments[0].text), `${symbol.name} missing emitted event ${node.arguments[0].text}`);
        }
        ts.forEachChild(node, inspectEvents);
      }
      // GridCore takes an open event-map type parameter; its events are checked
      // through the concrete Grid and TreeGrid maps below.
      if (classNode && symbol.name !== 'GridCore') inspectEvents(classNode);
    }
    // Concrete tables instantiate their event maps; GridCore leaves an extension parameter open.
    if (['Grid', 'TreeGrid'].includes(symbol.name)) {
      const bus = checker.getTypeOfSymbolAtLocation(checker.getPropertyOfType(declared, 'events'), source);
      const [eventMap] = checker.getTypeArguments(bus);
      const sources = [symbol.name, 'GridCore', 'GridColumnResizer', 'GridColumnReorderController'];
      for (const name of new Set(sources)) {
        const file = ts.createSourceFile(name, readFileSync(path.join(root, 'src/ui', name + '.js'), 'utf8'), ts.ScriptTarget.Latest, true);
        function inspect(node) {
          if (ts.isCallExpression(node) && node.expression.getText(file).endsWith('events.emit')) {
            const event = node.arguments[0];
            const names = ts.isStringLiteral(event) ? [event.text] : ts.isConditionalExpression(event)
              ? [event.whenTrue, event.whenFalse].filter(ts.isStringLiteral).map(part => part.text) : [];
            for (const eventName of names) assert.ok(checker.getPropertyOfType(eventMap, eventName), `${symbol.name} missing emitted event ${eventName}`);
          }
          ts.forEachChild(node, inspect);
        }
        inspect(file);
      }
    }
  }
}
for (const file of program.getSourceFiles().filter(f => path.resolve(f.fileName).startsWith(path.join(root, 'src') + path.sep))) {
  function visit(node) { assert.notEqual(node.kind, ts.SyntaxKind.AnyKeyword, `Unbounded any in ${file.fileName}`); ts.forEachChild(node, visit); }
  visit(file);
}

// A real tarball installation outside the repo: no paths aliases, ancestor node_modules,
// symlinks, registry downloads or package lifecycle scripts in the consumer.
const tempRoot = await realpath(tmpdir()), consumer = await mkdtemp(path.join(tempRoot, 'taet-ui-consumer-'));
let passed = false;
try {
  const artifacts = path.join(consumer, 'artifacts'); await mkdir(artifacts);
  const packed = JSON.parse(command(npmCli, ['pack', '--json', '--ignore-scripts', '--pack-destination', artifacts], root))[0];
  const files = new Set(packed.files.map(f => f.path));
  for (const file of program.getSourceFiles().filter(f => f.isDeclarationFile && path.resolve(f.fileName).startsWith(path.join(root, 'src') + path.sep))) {
    const relative = path.relative(root, file.fileName).split(path.sep).join('/');
    assert.ok(files.has(relative), `Tarball missing ${relative}`);
  }
  for (const name of ['index', 'contracts', 'DataStore', 'EventBus', 'DisposableBag', 'mutationOptions',
    'DataView', 'TreeDataView', 'SelectionModel', 'RangeSelectionModel', 'GridDataProvider', 'BaseControl', 'LifecycleError',
    'GridColumnModel', 'GridFilterModel', 'GridSearchModel', 'GridGroupModel']) {
    assert.ok(files.has(`src/core/${name}.d.ts`), `Tarball missing ${name}.d.ts`);
  }
  for (const name of ['GridEditors', 'grid-editor-contracts', 'grid-editor-options', 'Grid', 'TreeGrid', 'GridCore',
    'GridExporters', 'grid-api', 'grid-columns', 'grid-options', 'grid-events', 'grid-controllers', 'inputs', 'EditorControl', 'TextInput',
    'NumberInput', 'CheckBox', 'Switch', 'SelectInput', 'RadioGroup', 'input-choice-contracts', 'DateTimeInput',
    'TextArea', 'CheckLetter', 'RadioLetter', 'DropDownList', 'MultiSelectDropDown', 'FilePicker', 'CircularSlider', 'TrackBar', 'ColorPicker', 'RGBColorPicker', 'CMYKColorPicker', 'ProgressBar', 'StepProgressBar', 'List', 'OptionList']) {
    assert.ok(files.has(`src/ui/${name}.d.ts`), `Tarball missing ${name}.d.ts`);
  }
  await writeFile(path.join(consumer, 'package.json'), JSON.stringify({ name: 'taet-ui-type-consumer', private: true, type: 'module' }));
  command(npmCli, ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', path.join(artifacts, packed.filename)], consumer);
  const installed = await realpath(path.join(consumer, 'node_modules/taet-ui'));
  assert.ok(installed.startsWith(consumer + path.sep), 'Consumer must use the installed copy');
  await cp(path.join(root, 'test/types'), path.join(consumer, 'input'), { recursive: true });
  await writeFile(path.join(consumer, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
    target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true,
    skipLibCheck: false, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true, verbatimModuleSyntax: true,
    allowJs: true, checkJs: true, types: [], lib: ['ES2022', 'DOM'], outDir: 'output'
  }, include: ['input/**/*'] }));
  command(tsc, ['--project', 'tsconfig.json'], consumer);
  command(tsc, ['--project', 'tsconfig.json', '--module', 'ESNext', '--moduleResolution', 'Bundler', '--noEmit'], consumer);
  process.stdout.write(command(path.join(consumer, 'output/consumer.js'), [], consumer));
  process.stdout.write(command(path.join(consumer, 'output/javascript-consumer.js'), [], consumer));
  process.stdout.write(command(path.join(consumer, 'output/grid-editor-consumer.js'), [], consumer));
  process.stdout.write(command(path.join(consumer, 'output/grid-editor-javascript.js'), [], consumer));
  process.stdout.write(command(path.join(consumer, 'output/grid-editor-services-consumer.js'), [], consumer));
  process.stdout.write(command(path.join(consumer, 'output/input-consumer.js'), [], consumer));
  process.stdout.write(command(path.join(consumer, 'output/number-boolean-consumer.js'), [], consumer));
  process.stdout.write(command(path.join(consumer, 'output/choice-input-consumer.js'), [], consumer));
  process.stdout.write(command(path.join(consumer, 'output/date-time-consumer.js'), [], consumer));
  process.stdout.write(command(path.join(consumer, 'output/date-time-javascript.js'), [], consumer));
  process.stdout.write(command(path.join(consumer, 'output/remaining-input-consumer.js'), [], consumer));
  process.stdout.write(command(path.join(consumer, 'output/remaining-input-javascript.js'), [], consumer));
  process.stdout.write(command(path.join(consumer, 'output/specialized-input-consumer.js'), [], consumer));
  process.stdout.write(command(path.join(consumer, 'output/specialized-input-javascript.js'), [], consumer));
  process.stdout.write(command(path.join(consumer, 'output/indicator-input-consumer.js'), [], consumer));
  process.stdout.write(command(path.join(consumer, 'output/indicator-input-javascript.js'), [], consumer));

  process.stdout.write(command(path.join(consumer, 'output/input-javascript.js'), [], consumer));
  process.stdout.write(command(path.join(consumer, 'output/data-model-consumer.js'), [], consumer));
  process.stdout.write(command(path.join(consumer, 'output/data-model-javascript.js'), [], consumer));
  process.stdout.write(command(path.join(consumer, 'output/base-control-consumer.js'), [], consumer));
  process.stdout.write(command(path.join(consumer, 'output/base-control-javascript.js'), [], consumer));
  process.stdout.write(command(path.join(consumer, 'output/grid-state-consumer.js'), [], consumer));
  process.stdout.write(command(path.join(consumer, 'output/grid-state-javascript.js'), [], consumer));
  process.stdout.write(command(path.join(consumer, 'output/grid-constructor-consumer.js'), [], consumer));
  process.stdout.write(command(path.join(consumer, 'output/grid-constructor-javascript.js'), [], consumer));
  process.stdout.write(command(path.join(consumer, 'output/grid-common-consumer.js'), [], consumer));
  process.stdout.write(command(path.join(consumer, 'output/grid-transfer-consumer.js'), [], consumer));
  process.stdout.write(command(path.join(consumer, 'output/chart-consumer.js'), [], consumer));
  process.stdout.write(command(path.join(consumer, 'output/tier-consumer.js'), [], consumer));

  await writeFile(path.join(consumer, 'identity.mjs'), `import { DataStore as coreStore, DisposableBag as coreBag } from 'taet-ui/core';\nimport { DataStore, DisposableBag } from 'taet-ui';\nif (coreStore !== DataStore || coreBag !== DisposableBag) throw new Error('Core introduced wrappers');\n`);
  command(path.join(consumer, 'identity.mjs'), [], consumer);
  await writeFile(path.join(consumer, 'model-identity.mjs'), `import * as core from 'taet-ui/core';
import * as stable from 'taet-ui';
import * as grid from 'taet-ui/grid';
import * as inputs from 'taet-ui/inputs';
import * as experimental from 'taet-ui/experimental';
import * as all from 'taet-ui/all';
for (const entry of [stable, experimental, grid]) {
  for (const name of Object.keys(entry)) if (all[name] !== entry[name]) throw new Error(name + ' all entry introduced wrappers');
}
for (const name of Object.keys(inputs)) {
  if (inputs[name] !== (['Switch', 'DateInput', 'TimeInput', 'DateTimeInput', 'DropDownList', 'MultiSelectDropDown', 'FilePicker', 'CircularSlider', 'TrackBar', 'ColorPicker', 'RGBColorPicker', 'CMYKColorPicker', 'normalizeHexColor', 'ProgressBar', 'StepProgressBar', 'OptionList'].includes(name) ? experimental[name] : stable[name])) throw new Error(name + ' input constructor changed');
}
for (const name of ['DataView', 'TreeDataView', 'SelectionModel', 'BaseControl']) {
  if (core[name] !== stable[name]) throw new Error(name + ' constructor changed');
}
for (const name of ['RangeSelectionModel', 'GridDataProvider', 'GridColumnModel', 'GridFilterModel', 'GridSearchModel', 'GridGroupModel']) {
  if (core[name] !== grid[name]) throw new Error(name + ' constructor changed');
}
`);
  command(path.join(consumer, 'model-identity.mjs'), [], consumer);
  if (process.argv.includes('--browser')) {
    const { checkGridEditorBrowserConsumer } = await import('./check-grid-editor-consumer.js');
    await checkGridEditorBrowserConsumer(consumer);
  }
  console.log(`Package types OK: TypeScript ${ts.version}; NodeNext + Bundler; installed TS + JS consumers; ${valueCount} runtime exports`);
  passed = true;
} finally {
  if (passed) {
    const resolved = await realpath(consumer);
    if (path.dirname(resolved) !== tempRoot || !path.basename(resolved).startsWith('taet-ui-consumer-')) throw new Error('Unsafe temporary cleanup path');
    await rm(resolved, { recursive: true });
  } else console.error(`Consumer artifacts retained for diagnosis: ${consumer}`);
}
