# Transactions

`transaction.js` defines the atomic boundary for editor mutations. Commands,
input handling, normalization, and history will all observe the same unit.

## Contract

- A transaction runs synchronously and at most once.
- The surface's saved selection is restored before change hooks execute.
- `u2-rte-beforechange` is cancelable on both the surface object and DOM host.
- `touch(node)` records affected nodes and rejects nodes outside the surface.
- Nested operations share the surface's current transaction.
- A successful transaction captures its resulting selection and emits
  `u2-rte-change`; a thrown error emits `u2-rte-error` and is rethrown.
- `selectionBefore` and `selectionAfter` expose read-only snapshots.
- Transactions report state but do not pretend to roll back arbitrary DOM
  mutations. Reversible steps belong to the future history layer.

Synchronous execution is intentional: selection, `beforeinput`, browser undo,
and DOM mutation order become ambiguous across an asynchronous gap.

## TODO

- Reduce touched nodes into minimal dirty scopes for normalization.
- Record reversible DOM operations for deterministic undo and redo.
- Add transaction metadata compatible with Input Events `inputType` values.
- Define composition transaction grouping without delaying DOM ownership.
