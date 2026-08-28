# Edit ranges

`edit-range.js` wraps an ordered native `Range` with explicit editor operations.
It replaces the old generic Proxy approach: native behavior remains visible,
while each added operation has a narrow contract and dedicated tests.

## Contract

- Both boundaries must belong to one explicit editable root.
- Nested editable hosts are hard boundaries for construction and traversal.
- `fromSelection()` returns `null` for absent or foreign selections.
- `fromPoints()` rejects reversed points instead of silently collapsing.
- Returned native ranges and cloned edit ranges cannot mutate the original.
- `select()` restores forward or backward browser selections.
- `splitTextBoundaries()` exposes exactly selected text without changing its
  content or expanding the selection.
- `textNodes()` returns intersecting non-empty text nodes in document order.
- `blocks(predicate)` returns the nearest policy-defined block for each
  selected leaf, including empty blocks, in document order. A collapsed range
  resolves only its nearest block.
- `roots()` returns maximal fully covered live nodes; partially selected
  ancestors are traversed, never guessed as selected.
- `intersects()` and `contains()` respect editable ownership.

The class does not yet perform formatting. Commands will compose these
primitives inside transactions and explicitly mark resulting dirty scopes.

## TODO

- Connect block predicates to the surface content model.
- Add atomic-node coercion from content policy.
- Add contextual fragment insertion without unsafe HTML sinks.
- Add caret geometry as an isolated, browser-policy-backed responsibility.
