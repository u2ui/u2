# Selection snapshots

`snapshot.js` preserves a browser selection as a live cloned `Range` plus its
direction. Native ranges track many DOM mutations automatically, which gives
transactions stable boundary movement without injecting marker elements.

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

## TODO

- Integrate point mapping with canonical normalization transactions.
- Define affinity at ambiguous inline and atomic-element boundaries.
- Cover composed ranges and browser-specific Shadow DOM selection behavior.
- Preserve multi-range selections if browsers expose an interoperable model.
