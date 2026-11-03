# Standalone WebView delivery example

Run `npm run distribution` from the repository. The generated versioned ZIPs in
distribution/ include these examples alongside one complete built profile.
index.html uses the classic IIFE global TaetUI; example-esm.html uses ESM.
Use one profile and one JS format in each document, with its CSS/fonts/licenses.
Serve from a WebView origin or HTTP; local-file policy is host-specific.
Foundation shows a data-model host; full/components show live Form controls.
