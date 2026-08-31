# Explicit point mapping

A point is a place where a caret or one edge of a selection can sit. When an
editor command splits text, wraps nodes, or moves content, that place must move
with the intended content. Point mapping performs the DOM change and calculates
the new place together.

`point-map.js` tracks `Point` objects through these editor-owned operations. At
an ambiguous boundary it uses the point's affinity to decide whether the point
follows the content before or after the change. It needs no marker nodes.

## Contract

- A map snapshots each point when it is added and returns a fresh mapped point
  through `get()`; it never mutates the caller's point.
- `backward` affinity follows preceding content and `forward` affinity follows
  following content at insertion, split, wrap, and move boundaries.
- Operations mutate the DOM and its mapped boundaries as one synchronous step.
- `insert`, `insertFragment`, `insertText`, `splitText`, `wrap`, `unwrap`,
  `split`, `replace`, `replaceWrapper`, `move`, `mergeText`, and `remove`
  reject ambiguous or structurally invalid inputs.
- `insertFragment` consumes a detached fragment as one multi-node insertion.
  Parent boundaries shift by the inserted child count; boundaries expressed on
  the fragment become equivalent parent boundaries among the inserted nodes.
  Native insertion adopts nodes from a template or another document while
  preserving their identity and mapped descendant points.
- `insertText` uses DOM UTF-16 offsets and affinity at the insertion point:
  backward stays before the inserted text, forward follows it.
- `split` raises one boundary to a child boundary of an ancestor container by
  splitting every element between them, and returns the resulting child offset.
  Both halves together replace one element: no point ends up between them, and
  every point from the boundary onward moves into the trailing half. Trailing
  clones keep their attributes except duplicate-prone `id`. Whether the
  container may be split at all is the caller's policy, not the map's.
- `replace` discards a subtree and collapses its points around the replacement.
  `replaceWrapper` changes only an element's wrapper and preserves children
  and points inside them.
- `move` preserves affinity-bound positions adjacent to the moved node, even
  across parents.
- Wrapping accepts only a non-empty, contiguous, ordered sibling sequence and
  an empty detached wrapper.

The class deliberately performs only mechanical DOM operations. HTML validity,
editable boundaries, atomic elements, cleanup policy, and dirty-scope selection
belong to the content model and transaction layers.

## TODO

- Map ranges directly without introducing a dependency from this layer to
  `EditRange`.
- Extend the generated cases to `remove`, `replace`, and `move`, whose result
  cannot be checked against the surrounding text.
- Compare longer operation sequences with a marker-based oracle.
