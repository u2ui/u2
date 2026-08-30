# Commands

A command is one named editing action, such as inserting a paragraph, making
text bold, or creating a link. The same command can be triggered by the
keyboard, an Input Event, or a toolbar.

`commands.js` stores the commands available in one editor. `edit.js` gives a
running command the selected content and the tools needed to change it safely.
`block-boundary.js` defines shared editor-empty and exact block-edge semantics.
`enter.js` contains Enter and line break; `delete.js` owns backward block
merging. `mark.js` creates generic commands for applying, removing, querying,
and toggling text formatting; `pending-marks.js` extends them across the next
ordinary text input at a caret.

## Command contract

A command is a plain object. Only `run` is required:

- `run(edit)` performs the change and returns whatever the command reports.
- `enabled(edit)` decides availability without a transaction. The default is
  "the surface owns a range". It must not mutate anything.
- `state(edit)` optionally derives a UI-facing state without a transaction. It
  must not mutate anything.
- `inputTypes` lists the native `beforeinput` types this command replaces.
- `transaction: false` declares a view-only action. It still uses availability,
  state, and `u2-rte-command`, but receives `edit.transaction === null`, opens
  no editing transaction, emits no content change, and never triggers command
  cleanup. Editing commands omit the flag.

Commands are policy, not framework: an application may replace `enter` with its
own object under the same name, or register commands the engine never ships.

## Registry

- `add()` indexes `inputTypes`; re-registering a name drops its stale entries.
- `input(inputType)` answers which command replaces a native input type.
- `enabled(name, detail)` never opens a transaction.
- `state(name, detail)` returns a stateful command's state independently of
  `enabled()`; a command returns `null` when no meaningful state exists.
- `run(name, detail)` normally opens one transaction with `{trigger: 'command',
  command, inputType}`, checks availability again against the state the
  transaction restored, executes, and emits `u2-rte-command` with that
  transaction. A view command runs synchronously without one and reports a
  `null` transaction in the event.
- An unknown command is a programming error and throws; an unavailable one
  returns `undefined` without touching the DOM.
- `detail` is passed to the `Edit`; `range` targets a specific range instead of
  the current selection, `inputType` and `data` retain the native input cause
  and text payload, and `value` carries the command-specific value. The registry
  deliberately does not constrain that value; its owning command validates it.

## Edit

- `range` is the `EditRange` to act on: the explicit target range if one was
  given, otherwise the current selection. Foreign ranges resolve to `null`.
- `map` is a fresh `PointMap`. Mutations that go through it keep every tracked
  point, so a command can compute its resulting caret before it exists.
- `select(start, end, backward)` sets the resulting selection; one point
  collapses it.
- `transaction` is `null` while availability is checked and a live transaction
  during `run()`.
- `inputType` is the native operation name, `data` is its inserted text payload,
  `value` is an optional command-specific scalar or structure, and `fragment` is a prepared
  `DocumentFragment` or `null`. Commands never need to recover payloads from
  the DOM.
- `config`, `model`, `element`, and `document` expose the host context so
  commands never reach into the surface internals.
- `Commands.model` narrows its base model through the surface's current
  `--u2-rte-elements` policy. Availability and execution therefore make the
  same structural decision as cleanup.

## Enter

`enter` replaces `insertParagraph`, `lineBreak` replaces `insertLineBreak`.
Both act on a collapsed caret only: a selection would have to be deleted first,
and a caret inside atomic content has no structure to split, so those cases keep
their native behavior.

`--u2-rte-enter` names what Enter splits. `break` inserts a line break,
`block` splits the nearest text block declared by the content model, falling
back to the `--u2-rte-block` element for application policies that have not
classified it. `item`, `row`, and `cell` split the nearest `li`, `tr`, or
`td`/`th`. The split runs only where the content model allows a second element
of that kind beside the first; otherwise Enter falls back to a line break. That
keeps one algorithm for every host:

List structure takes precedence over a generic editor's default block: a caret
inside an `li` creates another `li` even when the editing host is a `div` whose
ordinary block is `p`. An explicit `--u2-rte-enter: break` still requests a line
break instead.

| Host | Caret in | Result |
| --- | --- | --- |
| `div` | `<p>one\|two</p>` | two paragraphs |
| `div` | `<h1>one\|two</h1>` | two headings |
| `div` | `<h1>title\|</h1>` | the heading followed by the default paragraph |
| `div` | `<div class=layout><p>one\|two</p></div>` | two paragraphs inside the wrapper |
| `ul` | `<li><p>one\|two</p></li>` | two list items |
| `div` | `<ul><li>one\|two</li></ul>` | two list items inside the list |
| `div` | `<td>one\|two</td>` | a break inside the cell |
| `p` | `one\|two` | a break |

Splitting keeps the inline context on both sides, never duplicates an `id`, and
leaves a `<br>` in a block the split emptied — an empty block has no caret
position of its own. A break at the end of its block gets the same treatment for
the same reason. At the exact end of a non-default text block, the trailing
empty half becomes a fresh `--u2-rte-block` element instead. With the defaults,
Enter therefore continues a heading in its middle but leaves it for a new `p`
at its end. The replacement is used only when the content model accepts both it
beside the original block and every cloned inline-context child inside it.

In `block` or `item` mode, Enter in an empty item exits a list nested inside the
surface. A middle item splits the list around the new default block; an edge
item removes only its empty half. The original list node and its `id` stay with
the surviving content, and split ordered lists continue their original
numbering, including `start`, `reversed`, and item `value`. A list that is itself
the editing surface cannot be exited, because commands never create content
outside their surface.

## Collapsed deletion

`deleteBackward` replaces `deleteContentBackward` only at the leading boundary
of a content-model `mergeable` block. `deleteForward` symmetrically replaces
`deleteContentForward` at its trailing boundary. Ordinary character deletion,
non-collapsed selections, atomic content, and an outer edge remain native.
Both commands keep the left wrapper and move the right block's children into
it. Nested mergeable blocks naturally choose the nearest valid boundary; at
the start of the first paragraph in a list item, for example, the paragraph has
no preceding sibling so the surrounding item may merge instead.

Every DOM position inside an otherwise empty block represents its one visual
caret. A filler `<br>` is therefore not a special case: positions before and
after it produce the same merge. Before becoming available, either command
checks that both blocks are mergeable and the left block's content rule permits
every moved child. The default HTML policy marks text blocks and list items as
mergeable; applications can opt any custom block in or out through their model.
Whitespace and comments between two otherwise adjacent blocks are neutral and
removed as part of the same mapped merge; meaningful text is never skipped.

An atomic block on the other side of the boundary is not merged: it holds
nothing to join, so it is removed and the caret stays where it already was. A
horizontal rule between two paragraphs therefore disappears on the first press
and the paragraphs merge on the second, which is what makes an inserted rule
removable at all — the browser's own deletion leaves it in place.

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

The same mapped cleanup removes redundant nested copies and reaches a fixed
point after a merge exposes new siblings. A complete mark set additionally
orders exact canonical single-child wrappers by mark rank before merging them.
It never rotates an augmented wrapper, crosses atomic or nested editable
content, or creates a relationship rejected by the content model.

Applying a different value of an excluding type first removes that mark from
the selected part. A partial red span therefore becomes red/blue/red instead of
nesting conflicting wrappers.

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

For one exact multi-mark operation, `setMarks(adapters)` creates a value-bearing
command:

```js
const marks = setMarks([boldHtml, colorHtml, linkHtml]);
commands.add('marks', marks);
commands.run('marks', {value: [bold.create(), color.create('blue')]});
```

The adapter list is the closed universe for that command. It requires one
removable adapter per type, removes configured marks absent from the target,
resolves target conflicts through `markSet()`, and applies the canonical result
in one mapped transaction. Equivalent nested runs settle into the same wrapper
order and merge where their canonical structure permits it. Formatting from
unlisted adapters is preserved.
`state()` returns the current canonical array, `'mixed'`, or `null`; at a caret
it reports structural context while the command remains disabled.

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
selection snapshot; no selection listener or observer is installed. Ordinary
text is inserted explicitly once, after which the resulting DOM carries the
state and native input resumes. IME composition always stays native: a live
start point follows its mutations, and the final composed range receives the
pending overrides only after `compositionend`. Canceled composition retains the
override. Plain-text surfaces, atomic content, and nested editors are excluded.

`PendingMarks.dispose()` removes its composition listeners and clears transient
state. Surface disconnection does this automatically.

The standard HTML policies compose these pieces without special commands:

```js
import {boldHtml, italicHtml, linkHtml} from './rte.js';

commands.add('bold', pending.toggle(boldHtml));
commands.add('italic', pending.toggle(italicHtml));
commands.add('link', pending.toggle(linkHtml, {href: '/docs'}));
```

Bold, italic, underline, strike, code, and link use the same range and pending
input paths as custom marks. Their adapters recognize semantic aliases and emit
one canonical tag. Link values use `{href, target?, rel?, title?}`; URL policy
belongs to the application supplying that command value.

## Value marks

`valueMark(adapter)` is one command for a mark whose value is content rather
than a fixed choice. `edit.value` carries it, and a null value removes whatever
mark of that type is there, so a single control creates, changes, and removes a
link without a command per URL:

```js
commands.add('link', valueMark(linkHtml));
commands.run('link', {value: {href: '/docs', target: '_blank'}});
commands.run('link', {value: {href: '/other'}});
commands.run('link');
```

`state(edit)` returns the mark's value, `'mixed'` when the range carries several
values or is only partly marked, and null when it carries none.

A caret carries no range to mark, but it does sit on one: at a caret inside a
mark the command acts on that whole mark. That is what makes editing an existing
link's value possible without selecting its text first, and it applies to any
value mark, not just links.

## Block styles

`BlockStyles` defines one closed group of mutually exclusive text-block
representations. Its commands replace only matching wrappers and preserve their
children, unrelated attributes, mapped selection boundaries, and forward or
backward direction:

```js
const styles = new BlockStyles([
    {name: 'paragraph', label: 'Paragraph', selector: 'p', tag: 'p'},
    {name: 'h1', label: 'Heading 1', selector: 'h1', tag: 'h1'},
    {
        name: 'lead',
        label: 'Lead',
        selector: 'p.lead',
        tag: 'p',
        write: element => element.classList.add('lead'),
        clear: element => element.classList.remove('lead'),
    },
]);

commands.add('blockStyle', styles.command());
commands.run('blockStyle', {value: 'h1'});
```

The group is deliberately closed: only an element matching one of its
selectors is a styleable text block. A surrounding `div`, list item, table cell,
or layout section is not converted merely because the content model classifies
it as a block. Later matching definitions refine earlier ones, so `p.lead`
wins over the base `p` definition. Switching styles calls every definition's
optional `clear()` on a detached replacement and then the target's `write()`;
unrelated classes and attributes survive.

A command is enabled only where the target wrapper is allowed by the active
content model and can contain all existing children. Known HTML headings work
with the default model. A custom element needs an application content-model
rule if the fallback cannot prove its block content valid. State is the active
style name, `'mixed'`, or `null` when the selection contains no styleable block.
One value-bearing command avoids traversing the same selected blocks once for
every represented style.

## Lists

`Lists` defines one closed group of list container elements. Item elements are
never named: they come from the model's `defaultChild`, so the same commands
serve any configured list-like structure.

```js
const lists = new Lists(['ul', 'ol']);

commands.add('bullets', lists.toggle('ul'));
commands.add('numbers', lists.toggle('ol'));
commands.add('indent', lists.indent);
commands.add('outdent', lists.outdent);
```

`toggle(tag)` has one boolean state and three behaviors, decided by what the
selection already is:

- Plain blocks become items of a new list. The host's configured default block
  becomes the item itself, so a paragraph turns into `<li>text</li>`; every
  other block keeps its own element inside one, so a heading turns into
  `<li><h2>…</h2></li>`.
- Items of another kind convert their container, preserving its attributes.
- Items of the same kind are lifted back out. An item contributes its own
  blocks when the target accepts all of them, and otherwise becomes the host's
  configured text block.

Selecting part of a list splits it, so only the selected run changes. A
resulting list that meets a list of its own kind becomes one list, so applying
to a paragraph below an existing list extends that list instead of starting a
second one.

`indent` moves a run of items into a nested list inside the previous item,
reusing one that is already there. `outdent` raises a run into the list that
owns its parent item, splitting that item so content after the nested list
stays behind, and lifts the run out of the list entirely at the top level.
Both claim the `formatIndent` and `formatOutdent` input types.

Every step is checked against the content model first, so a host that does not
allow the container, the item, or the text block keeps its control disabled
instead of producing invalid structure.

## Inserted elements

`insertNode(create, inputTypes)` inserts one prepared element at the caret. The
content model decides where it belongs: the caret's block is split only as far
as the nearest container that accepts the element, so a block-level rule
separates paragraphs while an inline element stays inside its text. An empty
half left by the split receives a filler break so it keeps a caret position.

```js
commands.add('rule', insertNode(document => document.createElement('hr'),
    ['insertHorizontalRule']));
```

A non-collapsed selection is not deleted first, so the browser keeps its native
behavior there until deletion is an ordinary mapped command.

## Unstyle

`unstyleCommand(policy)` adapts the presentation policy in
[`../unstyle/`](../unstyle/README.md) to a non-collapsed editor selection. It
reports the first level that can change the selection and applies exactly that
level. Therefore repeated clicks become deliberately stronger only after the
previous level is already a no-op: classes, then inline styles, selected
presentation attributes, then configured formatting wrappers.

Inline boundaries are split only where needed, every mutation uses the point
map, and forward/backward selection intent survives. A block attribute changes
only when the entire block content is selected; a partial text selection never
restyles unselected text through its shared block. Nested editables remain hard
boundaries. The command owns native `formatRemove` when installed.

This explicit action is not automatic normalization. Command-triggered
normalization may repair the result afterwards, but it does not choose the
Unstyle strength.

## Prepared fragments

`insertFragment` replaces the current selection with an already prepared
`DocumentFragment` and collapses the caret after it. It never accepts or parses
an HTML string. The caller owns the ordered external-input stages: security
sanitizing, optional Unstyle cleanup, then this command.

Text boundaries are split through the point map and selected roots are removed
as mapped operations. An empty fragment therefore acts as explicit selected
range deletion. For insertion, the command asks the content model whether all
fragment children fit at the caret. If not, it lifts the boundary, splitting
only a non-edge ancestor, until it finds a valid context. One algorithm handles
an inline mark inside a paragraph, a paragraph pasted into a paragraph, an `li`
inside a list, and a link beside an existing link. Exact edge insertion does
not create an empty wrapper. Nested editable hosts are never removed.

Fragments from a template or another document are accepted because native DOM
insertion safely adopts their nodes without changing identity. This command
does not prove that a fragment is safe; passing unsanitized DOM is a caller
error.

## Invariants

- Commands run inside exactly one transaction and report their dirty nodes.
- A command never crosses its editing host and never splits the host itself.
- The resulting selection is set by the command, not guessed by the caller.
- Cleanup is not a command concern; the input pipeline normalizes on
  `u2-rte-command` when `--u2-rte-clean-on` includes `command`.

## TODO

- Delete a selection first, then split, instead of leaving it native.
- Delete non-collapsed ranges explicitly where native DOM results are not
  interoperable.
- Create the host's default block when Enter is pressed in content that has not
  been wrapped into one yet.
- Let content policy provide the line separator instead of assuming `<br>`.
- Merge compatible mark wrappers across nested equivalent structures.
- Decide whether changing a value mark should keep the attributes its adapter
  does not name, instead of writing the given value exactly.
- Publish availability and active state as observable state for UI adapters.
- Decide whether block styles should support an application-defined fallback
  for loose text before normalization has created a text block.
- Preserve `start` and `value` numbering when a split or lift divides an
  ordered list, the way Enter's list exit already does.
- Decide whether lifting an item should keep a nested list at its own level or
  raise it with its parent.
