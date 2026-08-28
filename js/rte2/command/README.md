# Commands

`commands.js` registers named editor commands for one surface, `edit.js` gives
one execution its range, point map, and resulting selection, and `enter.js`
ships the first commands that replace native editing.

## Command contract

A command is a plain object. Only `run` is required:

- `run(edit)` performs the change and returns whatever the command reports.
- `enabled(edit)` decides availability without a transaction. The default is
  "the surface owns a range". It must not mutate anything.
- `inputTypes` lists the native `beforeinput` types this command replaces.

Commands are policy, not framework: an application may replace `enter` with its
own object under the same name, or register commands the engine never ships.

## Registry

- `add()` indexes `inputTypes`; re-registering a name drops its stale entries.
- `input(inputType)` answers which command replaces a native input type.
- `enabled(name, detail)` never opens a transaction.
- `run(name, detail)` opens one transaction with `{trigger: 'command', command,
  inputType}`, checks availability again against the state the transaction
  restored, executes, and emits `u2-rte-command` inside that transaction.
- An unknown command is a programming error and throws; an unavailable one
  returns `undefined` without touching the DOM.
- `detail` is passed to the `Edit`; `range` targets a specific range instead of
  the current selection, `inputType` records the native cause.

## Edit

- `range` is the `EditRange` to act on: the explicit target range if one was
  given, otherwise the current selection. Foreign ranges resolve to `null`.
- `map` is a fresh `PointMap`. Mutations that go through it keep every tracked
  point, so a command can compute its resulting caret before it exists.
- `select(start, end, backward)` sets the resulting selection; one point
  collapses it.
- `transaction` is `null` while availability is checked and a live transaction
  during `run()`.
- `config`, `model`, `element`, and `document` expose the host context so
  commands never reach into the surface internals.

## Enter

`enter` replaces `insertParagraph`, `lineBreak` replaces `insertLineBreak`.
Both act on a collapsed caret only: a selection would have to be deleted first,
and a caret inside atomic content has no structure to split, so those cases keep
their native behavior.

`--u2-rte-enter` names what Enter splits. `break` inserts a line break,
`block` splits the nearest `--u2-rte-block` element, and `item`, `row`, and
`cell` split the nearest `li`, `tr`, or `td`/`th`. The split runs only where the
content model allows a second element of that kind beside the first; otherwise
Enter falls back to a line break. That keeps one algorithm for every host:

| Host | Caret in | Result |
| --- | --- | --- |
| `div` | `<p>one\|two</p>` | two paragraphs |
| `div` | `<div class=layout><p>one\|two</p></div>` | two paragraphs inside the wrapper |
| `ul` | `<li><p>one\|two</p></li>` | two list items |
| `div` | `<td>one\|two</td>` | a break inside the cell |
| `p` | `one\|two` | a break |

Splitting keeps the inline context on both sides, never duplicates an `id`, and
leaves a `<br>` in a block the split emptied — an empty block has no caret
position of its own. A break at the end of its block gets the same treatment for
the same reason.

## Invariants

- Commands run inside exactly one transaction and report their dirty nodes.
- A command never crosses its editing host and never splits the host itself.
- The resulting selection is set by the command, not guessed by the caller.
- Cleanup is not a command concern; the input pipeline normalizes on
  `u2-rte-command` when `--u2-rte-clean-on` includes `command`.

## TODO

- Delete a selection first, then split, instead of leaving it native.
- Exit a list when Enter is pressed in an empty item, and merge blocks on
  backward deletion at a block start.
- Create the host's default block when Enter is pressed in content that has not
  been wrapped into one yet.
- Let content policy provide the line separator instead of assuming `<br>`.
- Add the mark algebra and its inline commands as the next command family.
- Publish availability and active state as observable state for UI adapters.
