# Tæt UI generation guide

Start with [AI_CONTEXT](AI_CONTEXT.md), [AI_MAP](AI_MAP.md), exact declarations
and one checked recipe. Tier does not imply maturity.

1. Name the screen owner and domain actions.
2. Construct named live controls; name is the model field key.
3. Compose Form.row/columns before/after mount; mount Panel before add.
4. Load .value for fields and .data.parse for collections with stable record IDs.
5. Use events.on or declared callbacks. Button uses onClick OR command, not both.
6. Return owner/cleanup; release external services.

EditorControl captions use setLabel; Button captions use setText; readonly uses
setReadOnly; silent loading uses form.value.set(model,{silent:true,origin:'import'}).
Do not assign options/private DOM to force updates. Form.value.clear clears values;
Form.clear removes children. Partial import does not become a new clean baseline.
Read [MUTATIONS](MUTATIONS.md) for edits to a live screen.

ShortcutManager uses semantic event.key, not physical code. Ctrl/Cmd is portable;
exact Meta wins. Prevented/composing events are ignored. Editor dispatch requires
allowInTextInput or command allowShortcutInTextInput, even for modified keys.
Scope is metadata; target/context/when provide routing.

Silent is supported only where declared. Before events can veto. After a callback
destroys an owner, stop using descendants. Standard UI uses Tæt UI composition;
native DOM belongs in implementations or explicit host/render/test infrastructure.
Custom Nodes, factories and callbacks are trusted application code.

Concrete JSON compile/create factories live with components. No new general engine,
framework wrapper or deferred extension API should be invented. Checked factories:
[AI recipes](../examples/ai-recipes/README.md).
