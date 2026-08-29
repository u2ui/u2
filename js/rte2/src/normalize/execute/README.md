# Repair execution

A repair action describes one concrete structural change, such as wrapping
loose text in a paragraph, unwrapping an invalid element, or moving a child to
a valid parent. The repair executor performs exactly that change while keeping
tracked caret and selection positions meaningful.

`repair-executor.js` contains only this mechanical DOM work. `RepairPlanner`
decides which action is appropriate; `PointMap` keeps positions aligned.

## Contract

- Passive `keep`, `boundary`, and `reject` actions never mutate DOM.
- `wrap` supports a contiguous node group, allowing the normalizer to create
  one paragraph around an inline run rather than one paragraph per node.
- `convert`, `unwrap`, `remove`, and `lift` use mapped operations so registered
  points retain their logical positions.
- Unwrapping a block into phrasing content inserts `<br>` only where adjacent
  visible content would otherwise lose a block boundary.
- Lifting splits each containing wrapper after the lifted node, preserving the
  document order of content before and after it. Cloned wrappers retain
  meaningful attributes except duplicate-prone `id`.
- An optional transaction receives only connected changed nodes through
  `touch()`.
- Unknown actions and invalid roots, child relations, maps, or lift targets fail
  explicitly before unrelated content is changed.

## TODO

- Preserve element-specific state that `cloneNode(false)` cannot copy.
- Let content policy provide the line-separator node instead of assuming `<br>`.
- Record reversible operation descriptions for history.
- Add namespace-aware replacement and wrapper creation.
