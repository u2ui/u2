# Core

`core.js` owns one document or ShadowRoot editing context. It centralizes event
listeners, surface registration, active-surface routing, and native selection
access. It contains no formatting, normalization, or UI behavior.

## Contract

- One core may coordinate any number of explicit editable surfaces.
- `add()` is idempotent and rejects non-editable or foreign-root elements.
- With `auto` enabled, focusing an element opted in through `--u2-rte` registers
  it lazily. Explicit registration does not require that CSS property.
- Capture-phase `focus` and `focusin` share one idempotent route to tolerate
  browser and document-lifecycle differences without duplicate activation.
- The nearest explicit nested `contenteditable` is an isolation boundary.
- `sync()` resolves the current selection to one registered surface and captures
  it without scanning or mutating unrelated editor contents.
- At most one surface is active per core; active state may outlive DOM focus so
  a roaming UI can safely receive focus.
- `destroy()` removes listeners and disconnects every surface.

Separate cores are supported for iframes, ShadowRoots, tests, and intentionally
isolated environments. The public entry point creates one default document core.

## TODO

- Define explicit UI focus-retention tokens and deactivation policy.
- Observe removed auto-registered hosts without watching their contents.
- Complete cross-browser ShadowRoot selection routing.
- Add module lifecycle registration at the core boundary.
