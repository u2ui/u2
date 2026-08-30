# Selection snapshots

A selection snapshot remembers the current caret or selected text so the editor
can restore it after focus moves to a toolbar or the DOM changes. It also keeps
the selection direction, which matters when the user selected backward.

`snapshot.js` stores a live cloned browser `Range` plus that direction. Native
ranges follow many DOM mutations automatically, so no temporary marker elements
are inserted into the document.

## Contract

- `SelectionSnapshot.capture(selection, root)` returns `null` unless both
  endpoints belong to the same explicit editable host.
- The snapshot retains collapsed, forward, and backward selections.
- `range()` always returns a clone; callers cannot mutate stored boundaries.
- `equals()` compares exact boundaries, root, and direction without serializing
  DOM paths.
- `restore()` uses `Selection.setBaseAndExtent()` where available so direction
  is not lost.
- `valid()` rejects boundaries moved outside the original editable host.
- Nested `contenteditable` elements are independent selection boundaries.

Live ranges are the first preservation strategy. Editor-owned transformations
that replace endpoints use `map/point-map.js` to map logical points explicitly
rather than inserting temporary DOM markers.

`elementOf(node)` and `isEditingBoundary(element)` are the single definitions of
"the element context of a node" and "this element starts a new editing host".
Every traversal in the engine uses them, so an invalid `contenteditable` value is
a boundary nowhere rather than in some traversals only. `indexOf(node)` names a
child boundary and lives beside `Point`.

## TODO

- Integrate point mapping with canonical normalization transactions.
- Define affinity at ambiguous inline and atomic-element boundaries.
- Cover composed ranges and browser-specific Shadow DOM selection behavior.
- Preserve multi-range selections if browsers expose an interoperable model.
