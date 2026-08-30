# Input pipeline

The input pipeline turns browser editing events—typing, Enter, paste, drop, and
composition—into editor work. It decides whether the browser may perform an
action itself or whether an RTE2 command replaces it, then repairs the small
part of the document that changed.

`input-pipeline.js` installs post-native behavior for one `Surface`.
`external-input.js` is the optional pre-native boundary for rich HTML from
paste and drop. Both are explicit and reversible: construct them for a surface
and call `dispose()` during module cleanup. `[Symbol.dispose]()` exposes each
to `using`. Disconnecting the surface also disposes them automatically.

## Contract

- `beforeinput` captures a live target range before the browser mutates DOM;
  the matching `input` performs postcondition normalization afterward.
- With a command registry, a cancelable `beforeinput` whose `inputType` has a
  registered, available command is prevented and replaced by that command. The
  registry decides availability; the pipeline only decides that native editing
  is not used. The command receives the event's `inputType`, text `data`, and
  target range unchanged. Uncancelable or already prevented events, plain-text
  hosts, and active composition are never routed. This also prevents two
  deliberately independent cores from executing the same bubbling event twice.
- Plain unmodified Backspace and Delete are checked at `keydown` because
  engines do not reliably expose a usable `beforeinput` at every filler
  boundary. A key is prevented only when its registered structural command is
  available; character deletion, selections, modified keys, and other
  unavailable cases remain native.
- `u2-rte-command` with a transaction triggers the same cleanup as native
  input, so an editing command executed from a toolbar is normalized like one
  executed from the keyboard. View-only commands report a null transaction and
  are ignored because they changed no editable DOM.
- `insertFromPaste` and `insertFromDrop` are separate `paste` and `drop`
  triggers. Other input types use `input`; explicit editor commands use
  `command`.
- Native paste/drop payloads remain browser-owned. Between their matching
  `beforeinput` and `input`, the pipeline records only newly added element roots,
  applies the configured `Unstyle` level to those roots with point mapping, and
  then structurally normalizes the affected neighborhood. Elements present
  before the input retain their presentation even when the browser moves them
  below a newly inserted wrapper. The default level is `styles`; `none` disables
  presentation cleanup.
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
- The pipeline never reads clipboard or drag payloads. `inputRange(event,
  surface)` is its public, shared conversion from a native `StaticRange` to an
  owned live `Range`; missing target ranges fall back to the owned selection.

## Rich external input

The native path above needs no HTML parser or sanitizer adapter because RTE2
never reads the payload or reinserts its string. `ExternalInput` is a separate,
optional pre-native path for applications that deliberately want to process a
rich HTML string themselves.

`ExternalInput` composes one selected sanitizer, an optional `Unstyle` policy,
and a registered mapped insertion command:

```js
const commands = new Commands(surface, {commands: {insertFragment}});
const external = new ExternalInput(surface, {
    commands,
    sanitizer: new NativeSanitizer(),
    unstyle: defaultUnstyle,
    through: 'styles',
});
```

For `insertFromPaste` and `insertFromDrop`, the contenteditable Input Events
contract supplies rich and plain data in `dataTransfer` plus the DOM range that
would be replaced. The adapter takes over only when `text/html` is present. It
prevents native insertion first, sanitizes into a detached `DocumentFragment`,
optionally cleans presentation cumulatively through the selected level, and
passes the result and exact target range to the registered command. Drop thus
does not accidentally use a selection left elsewhere.

`through` may be a level name, `null`, `none`, or a function receiving
`{surface, inputType}`. This leaves serializable per-surface policy resolvers to
the client layer without coupling security code to CSS. An empty sanitized
fragment changes nothing and does not delete an existing selection.

Plain text, quotation paste, uncancelable or already handled events, active
composition, plain-text hosts, and nested editing hosts stay native. Quotation
and plain-text line structure need their own contextual transformer rather than
being guessed by this HTML adapter.

`insert(html, {range, inputType})` exposes the same synchronous composition to
an HTML source dialog or another trusted event adapter. It still always calls
the configured sanitizer. A direct failure is thrown. A native event failure
remains fail-closed—the browser insertion stays prevented—and emits
`u2-rte-error` with `transaction: null` and `phase: 'external-input'`.

## TODO

- Keep a native input transaction open from cancellable `beforeinput` through
  the resulting `input` for exact history snapshots.
- Derive multi-block neighborhoods from all `getTargetRanges()` entries.
- Route selected-range deletion once its command can preserve structural
  boundaries and selection direction.
- Add contextual plain-text and quotation import without folding their line and
  block semantics into HTML sanitizing.
- Verify trusted clipboard and drag interactions in all target engines in
  addition to the deterministic event-contract suite.
- Group composition and consecutive typing transactions for history.
