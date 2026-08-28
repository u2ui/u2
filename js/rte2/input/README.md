# Input pipeline

`input-pipeline.js` connects one `Surface` to native Input Events without
putting browser behavior in the core. Installation is explicit and reversible:
construct one pipeline for a surface and call `destroy()` during module cleanup.
Surface disconnection also destroys its pipeline automatically.

## Contract

- `beforeinput` captures a live target range before the browser mutates DOM;
  the matching `input` performs postcondition normalization afterward.
- `insertFromPaste` and `insertFromDrop` are separate `paste` and `drop`
  triggers. Other input types use `input`; explicit editor commands use
  `command`.
- `--u2-rte-clean-on` decides which triggers run. Cleanup level and semantic
  default block are resolved from the surface CSS configuration for every run.
- Scope starts at the affected block. If that block has an invalid relationship
  to its parent, the parent becomes the scope so the relationship can be
  repaired without cleaning unrelated sibling subtrees.
- Native IME mutations are never interrupted. Input during composition is
  deferred until the final input or the microtask after `compositionend`.
- Nested editable hosts are ownership boundaries; their events are ignored.
- Normalization runs in a surface transaction, maps the current forward or
  backward selection, reports dirty nodes, and emits `u2-rte-normalize`.
- The module never reads clipboard or drag payloads. Sanitizing and insertion
  policies will own external data before this postcondition stage.

## TODO

- Keep a native input transaction open from cancellable `beforeinput` through
  the resulting `input` for exact history snapshots.
- Derive multi-block neighborhoods from all `getTargetRanges()` entries.
- Add explicit policies for native versus prevented Enter and deletion types.
- Feed sanitized paste/drop insertion ranges into the same scope resolver.
- Group composition and consecutive typing transactions for history.
