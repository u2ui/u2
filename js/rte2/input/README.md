# Input pipeline

`input-pipeline.js` connects one `Surface` to native Input Events without
putting browser behavior in the core. Installation is explicit and reversible:
construct one pipeline for a surface and call `destroy()` during module cleanup.
Surface disconnection also destroys its pipeline automatically.

## Contract

- `beforeinput` captures a live target range before the browser mutates DOM;
  the matching `input` performs postcondition normalization afterward.
- With a command registry, a cancelable `beforeinput` whose `inputType` has a
  registered, available command is prevented and replaced by that command. The
  registry decides availability; the pipeline only decides that native editing
  is not used. Uncancelable events, plain-text hosts, and active composition are
  never routed.
- `u2-rte-command` triggers the same cleanup as native input, so a command
  executed from a toolbar is normalized like one executed from the keyboard.
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
- A collapsed selection maps as one caret point. Two points would drift apart
  when a repair inserts content exactly at the caret boundary.
- The module never reads clipboard or drag payloads. Sanitizing and insertion
  policies will own external data before this postcondition stage.

## TODO

- Keep a native input transaction open from cancellable `beforeinput` through
  the resulting `input` for exact history snapshots.
- Derive multi-block neighborhoods from all `getTargetRanges()` entries.
- Route deletion types once commands can delete a range and merge blocks.
- Feed sanitized paste/drop insertion ranges into the same scope resolver.
- Group composition and consecutive typing transactions for history.
