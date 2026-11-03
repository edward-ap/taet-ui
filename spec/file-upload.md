# FileUpload (experimental)

Import from `taet-ui/experimental` or `taet-ui/all`; include `taet-ui/taet-ui.css`.
Implementation: `src/ui/FileUpload.js`, internal queue: `src/ui/fileUploadQueue.js`.
Exact types: `src/ui/FileUpload.d.ts`. Live examples: `docs/src/pages/FileUpload.page.js`.

## Intake and ownership

FileUpload is a BaseControl composite, not a Form editor. Mount directly or add
it to an already mounted Panel. It owns its FilePicker, action buttons, progress
controls, queue and scoped drop listeners. Call destroy on screen teardown.

`addFiles(iterable)` works before mount and returns accepted metadata and rejected
records. `getEntries()` returns shallow snapshots; `getFiles()`/`getFile(id)` return
actual browser File handles. No content reads, object URLs, network requests or
native filesystem paths are created. Removing/clearing releases retained handles.
Results supplied by adapters are application-owned opaque values.

Defaults: accept all files, maxFiles 100, maxFileSize/maxTotalSize Infinity bytes,
allowDuplicates false, concurrency 2, autoUpload false. Limits include completed
rows until removed. Extensions match case-insensitively; MIME rules use File.type
and support wildcards. Duplicate identity uses name/size/type/lastModified/path,
not content hashing. beforeAdd can veto with event.cancel. Invalid input yields
reject codes file/type/size/count/totalSize/duplicate/veto; recognized directory
drops yield directory. There is no recursive directory traversal.

## Adapter contract

`upload(file, {signal, entry, onProgress})` may return a promise or synchronous
result, and throws/rejects on failure. Progress is a monotonic fraction 0..1;
completion is only shown when the adapter resolves. There is no built-in endpoint
or credential policy. For local readers, omit upload and subscribe to add:

```js
import { FileUpload } from 'taet-ui/experimental';
const files = new FileUpload({accept: '.djvu,.djv'});
files.events.on('add', ({file}) => openLocalBook(file)); // application function
files.mount('#root');
```

For remote uploads supply an application transport, for example:

```js
function uploadTo(endpoint) {
  return (file, {signal, onProgress}) => new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const finish = (error, result) => {
      signal.removeEventListener('abort', abort);
      xhr.onload = xhr.onerror = xhr.onabort = null;
      xhr.upload.onprogress = null;
      error ? reject(error) : resolve(result);
    };
    xhr.open('POST', endpoint);
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => finish(xhr.status >= 200 && xhr.status < 300
      ? null : new Error(`HTTP ${xhr.status}`), xhr.responseText);
    xhr.onerror = () => finish(new Error('Network error'));
    xhr.onabort = () => finish(new DOMException('Canceled', 'AbortError'));
    signal.addEventListener('abort', abort, {once: true});
    if (signal.aborted) { finish(new DOMException('Canceled', 'AbortError')); return; }
    const body = new FormData(); body.append('file', file);
    try { xhr.send(body); } catch (error) { finish(error); }
  });
}
```

The endpoint, authentication, server validation and response parsing belong to the
application. Rust IPC integration likewise belongs to the reader adapter.

## Scheduling and lifecycle

Statuses: queued, uploading, uploaded, error, canceled. start schedules queued
entries and returns the current run promise; it resolves with snapshots when all
scheduled work settles. Individual failures stay in error rows. retry returns false
unless a failed/canceled row has no outstanding adapter. cancel without an id
cancels all queued/uploading entries; remove and clear also abort active work.

Canceled adapters continue occupying a concurrency slot until they settle, even
when they ignore AbortSignal. This prevents oversubscription. Honor cancellation
promptly. Late progress/results cannot revive canceled/removed entries. Destroy
aborts all work, resolves pending start with [], releases handles/listeners and
ignores later callbacks. Other methods reject calls after destruction.

Disabled blocks intake, start/retry and UI actions; ongoing work continues.
Programmatic cancel/remove/clear remain available. External drop links only
intercept file drags; disabled file drops are consumed to prevent navigation.
`linkDropArea(element)` returns an idempotent disposable and is also cleaned up
by destroy. No global drop interception. Browser/WebView support determines whether
OS file drags reach DOM; keyboard-accessible Add files uses the native picker.

Events use `events.on`: beforeAdd, add, reject, remove, cancel, uploadStart,
uploadSuccess, uploadError, complete. Intake events carry user origin for picker/
drop and api by default for addFiles. Other queue events use api origin. Filenames
and adapter errors render as text. Removing a focused row restores focus to the header Add files button.

## Reference and scope

Behavior was studied in licensed DHTMLX Vault 3.0.0 Enterprise: codebase/vault.d.ts,
the uploader implementation, and samples for drop areas, file limits and disabled
autosend. Its separate uploader/queue, external drop target, progress, cancellation
and manual/automatic send informed this independent implementation. No vendor code,
styles or assets were copied into Tæt UI.

Vault also offers list/grid previews, server-file management, directory traversal
and batch request configuration. These are outside this first Tæt UI version.
Tæt UI instead keeps a small local-file-first component with an explicit adapter,
bounded concurrency and owner-controlled teardown. This is a behavioral comparison,
not a performance benchmark or a claim of full Vault parity.

Regressions: test/file-upload-queue.test.js and browser-tests/file-upload.spec.js.

## Acceptance / handoff (2026-09-08)

Implemented on top of revision 604de42. npm test passed (520 unit tests, syntax,
API inventory and installed TypeScript/JSDoc consumers). The new queue/interaction
suite passed nine cases across Chromium, Firefox and WebKit; the additional live
example test passed in Chromium. The Input Controls snippet harness now includes
26 examples. Package dry run contains 237 files. No native Rust WebView or live
remote upload service was tested. Follow-up scope is application adapter integration;
gallery, directory traversal and server management are intentionally unimplemented.


## Drop-area/table presentation (2026-09-09)

The empty component centers a decorative upload icon, drop hint and Browse files.
After intake, a two-column file table replaces this prompt. Each row shows a file
icon, name, size and localized last-modified date on the left, then progress or a
green uploaded check on the right, alongside cancel/retry/remove actions. Local-only
queued files show Ready, never a false uploaded check. The header + opens the same
multiple-file picker even while the prompt is hidden. The entire component remains
a file drop target, including its populated list.

Default height is 360px; BaseControl height/setSize overrides it. The toolbar stays
visible and the list scrolls vertically within the remaining height. Clear restores
the empty prompt. Entries retain list/listitem semantics (no spreadsheet editing or
cell navigation). File type previews, folders and alternate gallery views remain
outside this component. Docs demonstrate a 320px height with generic files.

Presentation acceptance: npm test passed (520 unit tests plus syntax, API and installed types); 15 FileUpload cases passed across Chromium/Firefox/WebKit, then 8 focused FileUpload/Input Controls documentation cases passed after final styling. Screenshots reviewed for the populated table. Native WebView drag delivery remains a host integration check.
