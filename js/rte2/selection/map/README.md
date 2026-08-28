# Explicit point mapping

`point-map.js` maps logical `Point` instances through editor-owned DOM
operations. Native live ranges remain useful for external mutations, but their
boundary relocation cannot express whether an ambiguous caret belongs to the
content before or after an insertion. `PointMap` applies that decision from the
point's affinity without marker nodes.

## Contract

- A map snapshots each point when it is added and returns a fresh mapped point
  through `get()`; it never mutates the caller's point.
- `backward` affinity follows preceding content and `forward` affinity follows
  following content at insertion, split, wrap, and move boundaries.
- Operations mutate the DOM and its mapped boundaries as one synchronous step.
- `insert`, `splitText`, `wrap`, `unwrap`, `replace`, `replaceWrapper`, `move`,
  `mergeText`, and `remove` reject ambiguous or structurally invalid inputs.
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

- Add multi-node and `DocumentFragment` insertion once fragment commands need
  it.
- Map ranges directly without introducing a dependency from this layer to
  `EditRange`.
- Define adoption behavior for nodes originating in another document.
- Generate operation sequences and compare mapped points with a marker-based
  oracle in every target browser.
