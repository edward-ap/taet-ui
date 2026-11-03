# 16. Host Bridge

## Status: application architecture proposal

Tæt UI does not ship or export a HostBridge implementation or a Rust/native
WebView adapter. The interface below describes an application-owned boundary,
not an importable library API. Choose and implement transport in the host project.
For raster applications start with the
[RenderViewport integration guide](../docs/EXTENSIONS.md).

## Problem

The UI runtime runs inside a WebView, but real desktop applications often depend on a host language: .NET, Java, Rust, Python, Electron, or another runtime.

Controls must not call host APIs directly.

## Required Primitive

```ts
interface HostBridge {
  invoke<TRequest, TResponse>(
    method: string,
    request: TRequest
  ): Promise<TResponse>;

  readonly events: EventBus;
}
```

## Rules

- UI controls do not call host directly.
- Commands and services call HostBridge.
- Host-originated changes use `origin: "host"`.
- Host handles, subscriptions, and callbacks must be disposable.
- Host errors are reported through command results or centralized error handling.
- Host method names are stable API, not UI labels.

## Example

```ts
commands.register("project.save", {
  label: "Save",
  enabled: ctx => ctx.documentState?.isDirty() === true,
  run: async ctx => {
    await host.invoke("project.save", ctx.project);
    ctx.documentState?.markClean();
  }
});
```

## Acceptance Checklist

- Host access is centralized.
- Controls stay host-agnostic.
- Host-originated mutations preserve `origin`.
- Host resources are disposable.
- Commands/services are the boundary between UI and host.
