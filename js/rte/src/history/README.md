# History

Undo and redo for one surface.

RTE deliberately leaves ordinary typing and deletion to the browser, so history
cannot be an operation log: it would only ever see the edits the engine itself
performs. `history.js` therefore records *states*. A `MutationObserver` reports
every change regardless of its origin — native input, a command, paste, drop, or
an unrelated application script — and an entry stores the resulting content as a
cloned `DocumentFragment` with a path-addressed selection.

Because entries are complete states, undo never has to reverse a mutation it did
not understand. That is what makes a mixed native/engine editing model undoable
at all.

## Contract

- `new History(surface, {limit = 100, coalesce = 400})` starts with the current
  content as its baseline entry and observes the surface from that moment.
- `record()` commits the current content as one entry and reports whether it
  added one. Unchanged content adds nothing, so any boundary may flush safely.
- `undo()` and `redo()` move one entry and report whether they moved. Both
  commit uncommitted input first, so undo leaves the state the user sees.
- `canUndo` and `canRedo` account for uncommitted input: pending input is
  undoable, and it invalidates a redo branch before it is recorded.
- `commands` is the frozen `{undo, redo}` pair for a `Commands` registry. They
  claim the `historyUndo` and `historyRedo` input types and run without a
  transaction, because an entry replaces the content and restores the selection
  itself. Like every other command they require the surface to own the edit's
  range, so a shortcut never reaches an editor the user has left; a toolbar
  that still holds a saved selection passes it and keeps working.
- The methods are unconditional: `undo()` and `redo()` are the programmatic API
  and do not consult the selection.
- `clear()` discards every entry and restarts from the current content.
- Recording a new state drops the redo branch. Exceeding `limit` drops the
  oldest entry.
- `u2-rte-history` reports every entry and every move on the surface.
- `dispose()` stops observing and releases every entry. A disconnected surface
  disposes its history.
- Core-retained UI mutations are not edits. Snapshots omit those subtrees and
  undo/redo preserves them, including when shared chrome is temporarily mounted
  directly in a top-layer editing host.

## Grouping

Transactions supply the boundaries, so grouping needs no separate timer policy:

- A transaction with the `input` trigger is ordinary typing and coalesces.
- Every other transaction — `command`, `paste`, `drop` — records one entry
  before and one after itself, so a command is always its own undo step.
- Native input that never reaches a transaction coalesces through the observer.
- Deactivating the surface flushes.

Coalescing keeps one open interval instead of restarting it on every keystroke,
so continuous typing still becomes several undo steps rather than one.

## Selection

`SelectionSnapshot` holds live nodes and cannot survive replaced content. An
entry therefore stores each boundary as a child-index path from the surface
element plus an offset, and rebuilds a `SelectionSnapshot` on restore so
backward selections keep their direction. An entry captured before the surface
had a selection adopts the first one it sees, so undoing back to the baseline
restores a caret too.

## Browser considerations

- Ctrl/Command+Z and +Y are routed from `keydown` by the input pipeline, not
  from `beforeinput`. A browser stops reporting `historyUndo` once its own undo
  stack no longer matches content the engine replaced. The `inputTypes` claim
  remains so that a menu- or gesture-triggered undo is captured as well.
- Restoring content takes the observer's own records so an applied entry can
  never record itself.

## TODO

- Expose the coalescing interval and an off switch as `--u2-rte-history`.
- Store diffs instead of whole fragments once the transaction layer records
  reversible operations, and keep this state model as the fallback for
  mutations the engine does not own.
- Group composition deliberately instead of relying on its mutations alone.
- Verify entry cost on large documents and decide whether `limit` should be
  measured in bytes rather than entries.
