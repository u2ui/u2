# Using RTE2

RTE2 is plain ESM with no build step and no dependencies. Import from
[`../rte.js`](../rte.js) and everything else follows from three objects: a
**core** per document, a **surface** per editable element, and the modules you
install on a surface.

Nothing installs itself. The core registers editable elements and tracks the
selection; input handling and commands are modules you add, because an
application that only wants selection state should not pay for editing
behavior. This page shows the wiring that turns that into a working editor.

## A working editor

```css
.editor { --u2-rte: true; }
```

```js
import {Commands, InputPipeline, Rte, enter, lineBreak} from './rte.js';

const core = new Rte(document);

core.addEventListener('u2-rte-add', ({detail}) => {
    const commands = new Commands(detail.surface, {commands: {enter, lineBreak}});
    new InputPipeline(detail.surface, {commands});
});
```

```html
<article class="editor" contenteditable>Hello world</article>
```

That is the whole setup. Focusing an element that opted in through `--u2-rte`
registers a surface, `u2-rte-add` installs the modules on it, and from then on:

- typing repairs the affected block (loose text becomes a paragraph, invalid
  nesting is fixed) without touching the rest of the document;
- Enter and Shift+Enter are handled by the `enter` and `lineBreak` commands
  instead of the browser;
- the caret keeps its logical position through every repair;
- disconnecting the surface tears the pipeline down again.

`rte.js` also exports a ready-made `rte` core for the current document if you do
not want to create one:

```js
import {rte} from './rte.js';
```

## Registering surfaces explicitly

`--u2-rte` only drives lazy registration on focus. Register an element yourself
when it exists before it is focused, when you do not want a CSS opt-in, or when
you build the editor programmatically:

```js
const core = new Rte(document, {auto: false});
const surface = core.add(element);   // idempotent, returns the same surface
```

`add()` requires an explicit `contenteditable` element that belongs to the
core's root. One core can coordinate any number of surfaces; use a second core
only for a different document, an iframe, or a shadow root:

```js
const shadow = new Rte(host.shadowRoot);
```

## Configuration

Behavior is configured through inherited CSS custom properties, so one
stylesheet can configure a family of editors while a single element overrides
what differs. `auto` means "use the semantic default for this tag".

| Property | Values | Default |
| --- | --- | --- |
| `--u2-rte` | any truthy token | disabled |
| `--u2-rte-block` | tag name, `none`, `auto` | `p`, `li` in lists, none in inline hosts |
| `--u2-rte-enter` | `break`, `block`, `item`, `row`, `cell`, `auto` | derived from the host |
| `--u2-rte-cleanup` | `none`, `minimal`, `structural`, `canonical` | `structural` |
| `--u2-rte-clean-on` | any of `input paste drop command` | all four |
| `--u2-rte-ui` | `none`, `roaming`, `static` | `roaming`, reserved for UI modules |

The host element decides the defaults: a `<ul contenteditable>` creates list
items, a `<p contenteditable>` stays inline and Enter inserts a line break, a
`<div contenteditable>` uses paragraphs. Values are read on demand, so a class
change or a media query can change editing behavior without re-registering.

```css
.notes { --u2-rte: true; --u2-rte-block: div; --u2-rte-clean-on: input command; }
.title { --u2-rte: true; --u2-rte-block: none; }
```

See [`../src/config/README.md`](../src/config/README.md) for the exact resolution
rules.

## Commands

A registry belongs to one surface. Commands are looked up by name, expose
availability without running, and execute in one transaction:

```js
if (commands.enabled('enter')) commands.run('enter');
```

`enabled()` is what a toolbar button binds to; the default answer is "the
surface owns a range". `run()` returns whatever the command reports, or
`undefined` if it was unavailable or the transaction was canceled. Running a
command the registry does not know is a programming error and throws.

Commands work from a toolbar even though clicking a button moves focus out of
the editor: the transaction restores the surface's saved selection when the live
one no longer belongs to it.

A command is a plain object, so an application can add its own or replace a
shipped one under the same name:

```js
import {Point} from './rte.js';

const horizontalRule = {
    enabled: edit => !!edit.range?.collapsed,
    run(edit) {
        const {node, offset} = edit.range.start;
        const index = edit.map.split(edit.element, node, offset);
        const rule = edit.document.createElement('hr');
        edit.map.insert(edit.element, index, rule);
        edit.transaction.touch(edit.element);
        edit.select(Point.after(rule));
        return rule;
    },
};

commands.add('horizontalRule', horizontalRule);
```

The `edit` argument carries the range to act on, a point map, and the resulting
selection. Every mutation that goes through `edit.map` keeps tracked points
alive, which is why the command can select a position that only exists after the
change. Adding `inputTypes: ['insertHorizontalRule']` would also let the input
pipeline replace that native input type with this command.
[`../src/command/README.md`](../src/command/README.md) documents the full
contract.

### Applying a CSS class

Marks separate formatting meaning from its HTML representation. This adapter
uses a `span` for bare text but may reuse any fully selected inline element:

```js
import {MarkAdapter, MarkType, applyMark, removeMark, toggleMark} from './rte.js';

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

Applying `x` to selected bare text creates `<span class="x">`. A completely
selected `<b>` or `<a>` receives the class directly; partially selected content
gets the canonical `span`. Removing `x` preserves semantic elements and other
attributes. Only a `span` left without attributes is unwrapped. Applying also
joins adjacent canonical `<span class="x">` wrappers.

`commands.state('toggleX')` returns `true` when all selected editable text has
the mark, `false` when none has it, and `'mixed'` when only part has it. Toggle
removes an active mark and applies it to inactive or mixed selections. At a
caret, state reports whether the caret's DOM position is structurally inside
the mark; the command remains disabled there until pending marks are available.

## Events

Surface events are dispatched on the DOM element as bubbling, composed events
and on the `Surface` object. The element is notified first, so a listener there
observes an event before the modules reacting to it.

| Event | Target | Meaning |
| --- | --- | --- |
| `u2-rte-add`, `u2-rte-delete` | core | a surface was registered or removed |
| `u2-rte-activechange` | core | the active surface changed |
| `u2-rte-activate`, `u2-rte-deactivate` | surface | this surface became active |
| `u2-rte-selectionchange` | surface | a new selection snapshot was captured |
| `u2-rte-beforechange` | surface | cancelable, before a transaction runs |
| `u2-rte-command` | surface | a command executed, inside its transaction |
| `u2-rte-normalize` | surface | cleanup ran, with its actions and unresolved issues |
| `u2-rte-change` | surface | the transaction committed |
| `u2-rte-error` | surface | the transaction failed; the error is rethrown |
| `u2-rte-disconnect`, `u2-rte-dispose` | surface, core | teardown |

**Listen to `u2-rte-change` for "the content changed".** It arrives once per
transaction, after every command and cleanup step inside it. `u2-rte-command`
and `u2-rte-normalize` report steps within a transaction and are meant for
diagnostics and modules.

```js
element.addEventListener('u2-rte-change', event => {
    save(element.innerHTML, event.detail.transaction.dirty);
});
```

Canceling `u2-rte-beforechange` prevents the change:

```js
element.addEventListener('u2-rte-beforechange', event => {
    if (readOnly) event.preventDefault();
});
```

## Content in and out

There is no serializer and no setter yet. Read `element.innerHTML` and write it
the same way, then normalize what you inserted:

```js
element.innerHTML = trustedMarkup;
pipeline.normalize('command');
```

`normalize()` returns the executed actions, the repairs it could not resolve,
and the point map it used; it does nothing when `--u2-rte-clean-on` excludes the
trigger.

**RTE2 has no sanitizing stage.** Structural normalization enforces a content
model, not a security policy: it never inspects attributes, so event handlers
and URLs pass through untouched. Sanitize untrusted HTML yourself before it
reaches the editor, and treat pasted content as untrusted as well — the pipeline
does not read clipboard payloads yet.

## Teardown

```js
core.delete(surface);   // or surface.dispose()
core.dispose();         // removes listeners and disconnects every surface
```

`Rte`, `Surface`, and `InputPipeline` also implement `[Symbol.dispose]()` for
`using`. Disconnecting a surface disposes its input pipeline; a registry needs
no cleanup. After teardown the element is inert and keeps its content.

## Nested editors

An explicit nested `contenteditable` is a hard boundary. Events, selections,
traversal, normalization, and commands never cross it, and the inner element
becomes a surface of its own only if you register it:

```html
<div contenteditable>
    outer text
    <figcaption contenteditable>independent editor</figcaption>
</div>
```

## What is not implemented yet

Being explicit is cheaper than surprising you:

- **No undo/redo.** Editor mutations do not go through the browser's editing
  commands, so the native undo stack no longer matches the document after the
  first repair. A history module owns this and does not exist yet.
- **No ready-made formatting command set yet.** Generic range commands can
  apply, remove, query, and toggle one configured mark. Bold, italic, links,
  remove-format, and pending marks at a caret are not yet shipped.
- **No deletion or list commands.** Backspace, Delete, and Enter in an empty
  list item keep their native behavior and are repaired afterwards.
- **No sanitizing and no serializer**, as described above.
- **No UI.** `--u2-rte-ui` is reserved; toolbars are yours to build on
  `enabled()`, `state()`, `run()`, and the events above.
- **The current 227-test runner is verified in Chromium 152.** WebKitGTK through
  GNOME Web confirmed the 225-test revision and Firefox 154 the 224-test
  revision; native text-data routing and mapped text insertion still need both
  engines, while Firefox also needs the caret-state case.

[`../PLAN.md`](../PLAN.md) tracks what lands next.
