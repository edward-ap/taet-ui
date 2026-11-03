# Typed core API

This page documents the typed npm package; its package imports are intentional.
For portable JavaScript application setup, use the consolidated bundle as described
in [BUILD](BUILD.md). Standalone bundles do not currently ship flattened declarations.

The declaration-covered `taet-ui/core` entry exports the existing DataStore,
DataView, TreeDataView, SelectionModel, RangeSelectionModel, GridDataProvider,
GridColumnModel, GridFilterModel, GridSearchModel, GridGroupModel,
BaseControl, LifecycleError, EventBus, DisposableBag and mutation helpers. There are no wrappers or runtime
dependencies; constructors retain identity with their original public exports.
RangeSelectionModel and GridDataProvider remain **experimental**, including when
imported from core. See [typed data/projection/selection models](DATA_MODEL_TYPES.md)
for their contracts, paging, cancellation and ownership examples.
See [typed controls](CONTROL_TYPES.md) for lifecycle, state, focus, resizing,
subclass events and resource ownership.
The four [Grid state models](GRID_STATE_TYPES.md) also remain experimental;
their contracts distinguish silent notifications, state normalization and ownership.

Core declarations cover **this entry point**, plus its exported structural types.
The separate [`taet-ui/grid/editors` entry](GRID_EDITOR_TYPES.md) covers editor
factories and the shared editing integration. [`taet-ui/grid`](GRID_TYPES.md)
now declares both table constructors, columns, models, controllers and exporters.
The UI root, `all` and `experimental` now declare their complete public value
exports; see [component types](COMPONENT_TYPES.md). Experimental status is unchanged.

## TypeScript

After installing a local checkout or tarball, use the public package subpath:

```ts
import { DataStore, DisposableBag, type MutationOptions } from 'taet-ui/core';

interface Customer {
  id: number;
  name: string;
  active: boolean;
}

const customers = new DataStore<Customer>();
const subscriptions = new DisposableBag();
subscriptions.add(customers.events.on('change', event => {
  if (event.operation === 'update') {
    console.log(event.id, event.newItem.name);
  }
}));

const imported: MutationOptions = { origin: 'import', silent: true };
customers.parse([{ id: 1, name: 'Ada', active: true }], imported);
customers.update(1, { active: false });
const customer = customers.get(1); // Customer | undefined

subscriptions.dispose();
customers.destroy();
```

IDs default to the type of the record's `id` property when it is a string or
number. For another identity field or a custom getter, specify the ID type:

```ts
const products = new DataStore<{ sku: string; price: number }, string>({ idField: 'sku' });
// Or: { getId: product => product.sku }
```

`parse` copies the input array; `all` returns a new array containing the existing
record references. Neither is a deep clone. `update` takes `Partial<TItem>` and
can change identity; its event then includes `newId`. Missing lookups return
`undefined`, and mutation methods return a boolean. `batch` returns the callback
result and runs synchronously; returned promises are not awaited. Undo/redo
history belongs to accepted batches, not every individual write.
Destruction during beforeChange aborts that pending write; destruction during
invalidate/change stops later event phases. A batch callback may destroy its
store: completion preserves its return value without emitting a batch event.
If that callback throws, the error propagates and disposed records stay cleared;
rollback never resurrects a destroyed store. Same-phase EventBus snapshots still
run their captured listeners.

Pending writes also capture the store revision. If `beforeChange` or identity
evaluation performs another accepted store write (including a silent write), the
older operation returns `false` without applying its prepared data. Nested writes
remain applied; there is no automatic retry. A nested no-op/veto does not by
itself invalidate the outer request. Keep identity callbacks pure and make data
changes through store methods; direct record/property mutation is not tracked.
`beforeChange` recursion beyond eight nested notifications throws an explicit
error. Consumer exceptions propagate, and already accepted writes survive unless
the enclosing outermost batch rolls back.

After a committed write, a newer mutation during `invalidate`/`change` stops the
older operation's later event phases. The committed operation still returns
`true`. EventBus listeners already captured for the same phase still run.
Rollback restores the captured row array and identity map without invoking
`getId` again. Nested batches share the outer transaction, not independent
savepoints. `undo`/`redo` return `false` during an active batch; replay history only
outside its callback. A nested replay invalidates an older pending undo/redo and
cannot consume the same history entry twice.

Store events are discriminated by `operation`. Narrow it before reading `patch`,
`oldItem`, `newItem` or batch `changes`. `beforeChange` describes individual,
cancellable operations, not a before-batch event. `invalidate` is the dependency
notification that also occurs for silent mutations. Do not assume `event.type`
equals the subscription name: the current EventBus preserves an existing type.

## Events and cleanup

```ts
import { EventBus, DisposableBag } from 'taet-ui/core';

const events = new EventBus<{
  saved: { id: number };
  idle: {};
}>();
const owner = new DisposableBag();
owner.add(events.on('saved', event => console.log(event.id)));
events.emit('saved', { id: 42 });
events.emit('idle');
owner.dispose();
events.destroy();
```

A standalone EventBus adds `type`; it does **not** invent `source`. Include
`source` in an application event payload when needed. Controls and stores
supply their own sources. A typed bus checks event names and payloads, and its
subscriptions provide both `off()` and `dispose()`.

DisposableBag accepts cleanup functions and objects with `dispose()` or `off()`.
It does not invoke a control's `destroy()` automatically: register
`() => control.destroy()` where the bag owns that cleanup. Its DOM-listener
overloads use standard DOM types; consumers should include `DOM` in their
TypeScript `lib` configuration even if a particular Node application only uses
the data/event primitives. Importing the runtime entry does not need a DOM;
mounting a BaseControl does.

## JavaScript and shared value types

JavaScript applications can use the same declarations through JSDoc:

```js
// @ts-check
import { DataStore } from 'taet-ui/core';
/** @type {import('taet-ui/core').DataStore<{ id: number, name: string }>} */
const customers = new DataStore();
customers.parse([{ id: 1, name: 'Ada' }]);
```

`ValueApi<T>`, `MutationOptions`, `ChangeOrigin`, `ItemId`, `Subscription`, and
the store event types are type-only exports. `ValueApi<T>` describes
`get(): T`, `set(T, options?): boolean`, and `clear(options?): boolean`. It is
not a constructor or a promise that every control implements an editor value API.
Declarations are the authoritative type definitions for this slice; do not
maintain parallel copies in JSDoc. Use JSDoc imports of these types where useful.

## Verification

`npm run test:types` is included in `npm test` and therefore in CI. It:

1. Checks declarations under strict TypeScript, rejects explicit `any`, and
   compares their value exports/public prototype names with the runtime.
2. Packs the package and installs that tarball in a temporary consumer outside
   the repository, without symlinks, path aliases, registry downloads or package
   lifecycle scripts.
3. Compiles TS and checked JS consumers using NodeNext and Bundler resolution,
   with `skipLibCheck: false`, exact optional properties and unchecked-index
   checking. Intentional errors must remain rejected, including wrong IDs,
   record fields, missing lookup results and event payloads.
4. Executes the compiled consumers against the installed package and checks
   mutation cancellation, silent updates, batch history, typed IDs, ownership,
   value protocol and constructor identity.

The compiler baseline is pinned to TypeScript 5.9.3 as a development dependency.
The library remains JavaScript. The check requires Node 22+, as does the project;
it retains its temporary consumer on failure and removes only its own verified
temporary directory on success.

`npm run test:types:browser` also exercises a compiled shared editor against
Grid and TreeGrid from that installed tarball, then mounts all nine built-in
editor controls. It also checks typed data models inside both grids and a typed
BaseControl subclass inside Panel, including focus, keyboard, resize and cleanup.
It is included in `test:all` and CI, requires Playwright's Chromium, and checks
event differences, validation, cancellation and ownership.

The package resolves declarations through a `types` condition on `./core`,
following the [TypeScript module-resolution reference](https://www.typescriptlang.org/docs/handbook/modules/reference).
Declarations are included with the source package, as described in the
[publishing guidance](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html).
There is deliberately no root `types` entry pretending the whole UI is covered.
