# Scoped normalization

`normalizer.js` combines pure repair planning with mapped execution for one
editor root. It processes the requested scope bottom-up, batches adjacent
wrappable nodes, and repeats only until no operation remains.

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

## TODO

- Reduce executor touches into minimal stable ancestor scopes.
- Expand a local scope only when lift or split crosses its current boundary.
- Add canonical sibling merging and empty metadata cleanup.
- Restore mapped `EditRange` snapshots through a Surface integration module.
- Add generated convergence and idempotence cases for custom policies.
