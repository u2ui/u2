# Logical DOM points

A point names one exact place in the DOM: either a character offset inside text
or a gap between child nodes. It can represent a caret or one edge of a
selection. Its affinity says which side it belongs to when content is inserted
at that exact place.

`point.js` stores the place as a collapsed native `Range`, allowing the browser
to follow text splits, removals, and many other DOM mutations without marker
elements.

## Contract

- A point is always a valid node/offset boundary when constructed.
- `start`, `end`, `before`, `after`, and `fromRange` make boundary intent clear.
- `node` and `offset` are live: they reflect native range relocation after DOM
  mutations.
- `backward` affinity associates an ambiguous boundary with preceding content;
  `forward` affinity associates it with following content. DOM operation
  mappings will honor this when the native mutation rule is ambiguous.
- `compare()` orders points in the same DOM tree and rejects unrelated trees.
- `range()` and `clone()` never expose mutable internal state.
- `within(root)` checks the current relocated boundary against an editing root.

The class deliberately does not serialize a child-index path. Paths become
stale under unrelated sibling changes; live ranges plus explicit operation
mapping provide stronger local semantics.

## TODO

- Extend affinity rules to content-model-defined atomic boundaries.
- Add stable logical offsets for fully replaced subtrees.
- Define atomic-node inside/before/after coercion through content policy.
- Test browser differences in live-range relocation with generated mutations.
