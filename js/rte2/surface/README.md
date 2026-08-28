# Editable surfaces

`surface.js` represents one explicit `contenteditable` host registered with a
core. It owns host-specific configuration, saved selection, active state, and
the current transaction while the core owns document-level routing.

## Contract

- CSS configuration is resolved dynamically through `surface.config`.
- `capture()` accepts only selections belonging to this editable host.
- Identical captures reuse the current snapshot and do not emit duplicate
  selection events.
- `restore()` restores the last valid selection, including its direction.
- `transact()` creates one atomic transaction; nested calls reuse it.
- Lifecycle, selection, and change events reach both the `Surface` EventTarget
  and the DOM host as bubbling, composed `u2-rte-*` events. The DOM host is
  notified first, so a listener there observes an event before the modules that
  react to it, and `u2-rte-change` still arrives last as the completed change.
- `destroy()` unregisters through the owning core; `disconnect()` is idempotent.
- No mutable state is stored globally or shared accidentally between surfaces.

The surface will later own its schema, normalization policy, history, pending
collapsed marks, and composition state through modules rather than new globals.

## TODO

- Add typed module state slots without central registration boilerplate.
- Define pending mark state for collapsed selections.
- Coordinate IME composition and native input with transaction grouping.
- Decide how disabled/read-only transitions affect saved selections and UIs.
