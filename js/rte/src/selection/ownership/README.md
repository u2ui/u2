# Selection ownership

When editable elements are nested, every node, selection, and input event must
belong to exactly one editor. The inner editor is independent; its work must not
leak into the outer editor.

`ownership.js` finds that owning editable element and recognizes the explicit
`contenteditable` boundaries between editors.

## Contract

- `editingHost(node)` returns the nearest explicit `[contenteditable]` ancestor.
- `isEditableHost(element)` accepts the standard editable values: an empty
  value, `true`, and `plaintext-only`.
- `isEditingBoundary(element)` additionally recognizes `false` as an explicit
  isolation boundary.
- `isPlainTextHost(element)` reports `plaintext-only`, where structural editing
  commands must not replace the browser's plain-text behavior.
- `belongsTo(node, host)` requires DOM containment and that exact nearest host.
- A nested editable therefore never leaks selection or mutations to its parent.
- `selectionOf(host)` uses the host's tree selection when available and falls
  back to its owner document for current browser interoperability.

The functions use valid explicit attribute values rather than
`isContentEditable`; inherited or invalid values belong to the nearest real
boundary and do not create a new surface.

## TODO

- Verify `ShadowRoot.getSelection()` behavior in every target browser.
- Define ownership for future non-`contenteditable` editing hosts, if needed.
- Add composed-range ownership once interoperable browser support exists.
