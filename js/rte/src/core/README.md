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
  it without scanning or mutating unrelated editor contents. A selection is not
  a session: once focus has left the editor, only focus starts one again.
  Engines leave a selection inside an editable that nobody focused — clicking
  beside one does that — and a toolbar over a caret the keyboard cannot reach is
  worse than no toolbar. The surface still keeps what it captured.
- At most one surface is active per core; active state may outlive DOM focus so
  a roaming UI can safely receive focus.
- `retain(element)` marks editor-owned UI in the same document. Focus inside it
  keeps the active surface, `retains(node)` identifies its composed subtree,
  and `release(element)` removes the mark. This also distinguishes UI from
  content when a native top-layer boundary requires both to share one host.
- A link or a button around an editing host is answered by the element, not by
  the text: the link is dragged rather than giving the text a caret, and
  followed when the press ends. Both are suppressed for a press that belongs to
  the text, and the link is left undraggable — nobody drags a link wrapped
  around editable content on purpose.
- The right button never moves the selection inside a surface: its menu is about
  what is selected, and aiming the menu somewhere else is what would make it
  useless.
- A press decides which surface a focus belongs to. Engines hand the focus to
  the nearest editable when a press lands beside one, which an inline host in
  running text collects a whole line of; a focus whose press did not land in the
  surface is refused and given back. A press answers for every focus until it is
  released — one drag can hand the focus back more than once — and a key taking
  over ends it too, so a keyboard reaching a surface is never mistaken for it.
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
