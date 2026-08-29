# Transactions

A transaction groups one complete editor change, from the selection before it
starts to the selection and affected nodes after it finishes. For example, an
Enter command and the structural cleanup it triggers should be observed as one
change rather than unrelated DOM mutations.

`transaction.js` provides this synchronous boundary for commands, input
handling, normalization, events, and future history.

## Contract

- A transaction runs synchronously and at most once.
- A live selection inside the surface is captured before change hooks execute;
  only a selection the surface does not own is replaced by its saved snapshot.
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
