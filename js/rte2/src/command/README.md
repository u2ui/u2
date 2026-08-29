# Commands

A command is one named editing action, such as inserting a paragraph, making
text bold, or creating a link. The same command can be triggered by the
keyboard, an Input Event, or a toolbar.

`commands.js` stores the commands available in one editor. `edit.js` gives a
running command the selected content and the tools needed to change it safely.
`enter.js` contains Enter and line break. `mark.js` creates generic commands for
applying, removing, querying, and toggling text formatting; `pending-marks.js`
extends them across the next ordinary text input at a caret.

## Command contract

A command is a plain object. Only `run` is required:

- `run(edit)` performs the change and returns whatever the command reports.
- `enabled(edit)` decides availability without a transaction. The default is
  "the surface owns a range". It must not mutate anything.
- `state(edit)` optionally derives a UI-facing state without a transaction. It
  must not mutate anything.
- `inputTypes` lists the native `beforeinput` types this command replaces.

Commands are policy, not framework: an application may replace `enter` with its
own object under the same name, or register commands the engine never ships.

## Registry

- `add()` indexes `inputTypes`; re-registering a name drops its stale entries.
- `input(inputType)` answers which command replaces a native input type.
- `enabled(name, detail)` never opens a transaction.
- `state(name, detail)` returns a stateful command's state independently of
  `enabled()`; a command returns `null` when no meaningful state exists.
- `run(name, detail)` opens one transaction with `{trigger: 'command', command,
  inputType}`, checks availability again against the state the transaction
  restored, executes, and emits `u2-rte-command` inside that transaction.
- An unknown command is a programming error and throws; an unavailable one
  returns `undefined` without touching the DOM.
- `detail` is passed to the `Edit`; `range` targets a specific range instead of
  the current selection, while `inputType` and `data` retain the native input
  cause and its text payload.

## Edit

- `range` is the `EditRange` to act on: the explicit target range if one was
  given, otherwise the current selection. Foreign ranges resolve to `null`.
- `map` is a fresh `PointMap`. Mutations that go through it keep every tracked
  point, so a command can compute its resulting caret before it exists.
- `select(start, end, backward)` sets the resulting selection; one point
  collapses it.
- `transaction` is `null` while availability is checked and a live transaction
  during `run()`.
- `inputType` is the native operation name and `data` is its string payload or
  `null`. Commands never need to recover inserted text from the DOM.
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

In `block` or `item` mode, Enter in an empty item exits a list nested inside the
surface. A middle item splits the list around the new default block; an edge
item removes only its empty half. The original list node and its `id` stay with
the surviving content, and split ordered lists continue their original
numbering, including `start`, `reversed`, and item `value`. A list that is itself
the editing surface cannot be exited, because commands never create content
outside their surface.

## Range marks

`applyMark(adapter, value)`, `removeMark(adapter, value)`, and
`toggleMark(adapter, value)` change a non-collapsed selection. They split only
its text and mark boundaries, map the selection through each mutation, and
preserve forward or backward direction.

Their state is `true` when all selected editable text has the concrete mark,
`false` when none has it, and `'mixed'` when only part has it. Atomic content and
nested editors do not contribute. Toggle removes only the fully active case;
inactive and mixed selections receive the mark throughout.

At a caret, state is `true` when its actual DOM position is inside a matching
inline wrapper and `false` otherwise. A boundary immediately outside that
wrapper stays outside; an empty matching wrapper still provides active context.
Base mark commands stay disabled at a caret. `PendingMarks.toggle()` adds caret
availability and stores only the difference from that structural state.

Application policy stays in the `MarkAdapter`. When its `reuse` policy accepts
a fully selected phrasing element, applying a class decorates that element
directly. Partially selected or bare text uses the adapter's canonical wrapper.
Blocks, atomic content, the editing host, and nested editable hosts are never
reused or crossed. Removal clears only the requested mark. An attributeless
`span` is unwrapped automatically; an adapter may also request removal of its
semantic wrapper. Unrelated attributes then survive on a neutral `span`.

Applying also joins adjacent canonical wrappers from the same adapter. Thus
`<span class="x">first</span><span class="x">second</span>` becomes one wrapper.
Elements that merely carry the mark in addition to other semantics, such as
`<b class="x">`, or have unrelated attributes are not merged.

```js
const x = new MarkType('x');
const xHtml = new MarkAdapter(x, {
    selector: '.x',
    tag: 'span',
    reuse: true,
    write: element => element.classList.add('x'),
    clear: element => element.classList.remove('x'),
});

commands.add('applyX', applyMark(xHtml));
commands.add('removeX', removeMark(xHtml));
commands.add('toggleX', toggleMark(xHtml));
```

For caret input, bind one lightweight `PendingMarks` instance to the surface.
Its toggle delegates range selections to the normal command and stores a caret
override only when needed. Its `insertText` command replaces native input only
while that override is current:

```js
const pending = new PendingMarks(surface);
commands.add('toggleX', pending.toggle(xHtml));
commands.add('insertText', pending.insertText);
```

Moving the selection invalidates the override through the surface's existing
selection snapshot; no additional listener or observer is installed. After one
explicit insertion the resulting DOM carries the state, so following input is
native again. Plain-text surfaces and atomic content are excluded.

The ready-made bold policy composes these pieces without a special command:

```js
import {boldHtml} from './rte.js';

commands.add('bold', pending.toggle(boldHtml));
```

It accepts existing `<strong>` and `<b>`, creates `<strong>`, removes either
semantic wrapper, and works through the same range and pending-input paths as a
custom mark.

## Invariants

- Commands run inside exactly one transaction and report their dirty nodes.
- A command never crosses its editing host and never splits the host itself.
- The resulting selection is set by the command, not guessed by the caller.
- Cleanup is not a command concern; the input pipeline normalizes on
  `u2-rte-command` when `--u2-rte-clean-on` includes `command`.

## TODO

- Delete a selection first, then split, instead of leaving it native.
- Merge blocks on backward deletion at a block start.
- Create the host's default block when Enter is pressed in content that has not
  been wrapped into one yet.
- Let content policy provide the line separator instead of assuming `<br>`.
- Carry pending marks through composition input without interrupting IME.
- Merge compatible mark wrappers across nested equivalent structures.
- Publish availability and active state as observable state for UI adapters.
