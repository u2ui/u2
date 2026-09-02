# Core

The core is the shared coordinator for all editable elements in one document or
ShadowRoot. It listens for focus and selection changes once, knows which editor
is active, and routes work to that editor. It does not decide formatting,
document structure, or UI behavior.

`core.js` implements this coordinator and registers each editable element as a
`Surface`.

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
- `retain(element)` marks editor-owned UI in the same document. Focus inside it
  keeps the active surface, `retains(node)` identifies its composed subtree,
  and `release(element)` removes the mark. This also distinguishes UI from
  content when a native top-layer boundary requires both to share one host.
- Focus that lands anywhere else — not a surface, not retained UI — ends the
  session, so everything drawn for it goes at once. So does focus that lands
  nowhere: clicking a plain paragraph focuses nothing, and no focus event
  follows to say so, which is what `focusout` is listened to for. Retaining is
  therefore how a UI that takes focus stays alive; `Toolbar` retains its element
  itself.
- `dispose()` removes listeners and disconnects every surface. It is
  idempotent; `[Symbol.dispose]()` exposes the same teardown to `using`.

Separate cores are supported for iframes, ShadowRoots, tests, and intentionally
isolated environments. The public entry point creates one default document core.

## TODO

- Observe removed auto-registered hosts without watching their contents.
- Complete cross-browser ShadowRoot selection routing.
- Add module lifecycle registration at the core boundary.
