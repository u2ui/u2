# Scoped normalization

Normalization brings editable DOM into the valid, predictable shape required by
the content model. For example, it can turn loose text in a block editor into a
paragraph or place stray list content inside an `li`.

`normalizer.js` asks the planner what is wrong and the executor to fix it. It
works only in the requested part of one editor, preserves tracked positions,
and repeats until that part needs no further repair.

## Contract

- `normalize()` accepts an element scope, logical points, and an optional
  transaction. The default scope is the complete root.
- `step()` executes at most the next single operation through the identical
  traversal, grouping, mapping, and scope logic used by `normalize()`.
- Descendant atomic elements and explicit nested editing boundaries are never
  traversed. A nested editing host cannot itself be selected as a foreign scope.
- Adjacent text and inline nodes with the same wrapper plan become one block.
- Every executed action is returned in order. Unresolved `reject` plans are
  reported separately and never hidden or treated as success.
- `stable` states whether the requested scope has reached a fixed point; a
  successful `step()` remains deliberately unstable until checked again.
- The returned `PointMap` maps all supplied points after normalization; callers
  decide whether and how to restore a browser selection.
- Normalization repeats to a fixed point, making a second run a no-op. A hard
  operation limit exposes non-converging custom policies instead of looping.
- An optional transaction receives executor dirty nodes. The normalizer does
  not create an implicit transaction because fragments and playgrounds also use
  it independently.

## Cost

An unchanged document is the common case and must be close to free. Two guards
used to make it linear in tree depth per node instead: the executor re-validated
the parent against the root for every child, including the ones needing nothing,
and the pass loop did the same for every element the walk had just collected.
Both are now paid only where they can matter — a passive plan never reaches the
executor, and a collected parent is re-checked only after a repair in that same
pass could have detached it.

## TODO

- Reduce executor touches into minimal stable ancestor scopes.
- Expand a local scope only when lift or split crosses its current boundary.
- Add canonical sibling merging and empty metadata cleanup.
- Restore mapped `EditRange` snapshots through a Surface integration module.
- Add generated convergence and idempotence cases for custom policies.
