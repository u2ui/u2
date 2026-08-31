# Using RTE

RTE is plain ESM with no build step and no dependencies. Choose the prototype
convention client for a minimal editor or `rte.js` for explicit composition.

## Minimal prototype

```js
import './rte.js';
```

```css
[contenteditable] {
    --u2-rte: true;
    --u2-rte-elements: @article;
    --u2-rte-toolbar: undo redo bold italic bullets numbers rule;
}
```

That one side-effect import lazily installs Enter, line break, structural
Backspace, normalization, pending text marks, undo and redo, the standard
inline marks, list and separator commands, and one shared roaming toolbar when
an opted-in rich-text host first receives focus. It does not scan the DOM or
create toolbar markup before then. `contenteditable="plaintext-only"` remains
native.

Ready control names are `undo`, `redo`, `bold`, `italic`, `underline`,
`strike`, `code`, `bullets`, `numbers`, `indent`, `outdent`, and `rule`, plus
`block`, `style`, `unstyle`, `breaks`, `link`, `source`,
`imageOriginal`, and `insertTable` from the optional root modules.
`--u2-rte-toolbar` chooses and orders them; the commands and their shortcuts
work whether or not a control is listed. List and separator controls consult
the content model, so `--u2-rte-elements` disables what a host does not allow.

Undo and redo work from Ctrl/Command+Z, Ctrl/Command+Shift+Z, and Ctrl/Command+Y
whether or not their controls are listed. History records every change of the
host's content, including edits an application makes itself, and groups
continuous typing into steps. See
[`../src/history/README.md`](../src/history/README.md).

## Keyboard shortcuts

A command declares its own key, so it works whether or not a control for it is
listed in `--u2-rte-toolbar`:

| keys | command |
|---|---|
| `Ctrl+B` `Ctrl+I` `Ctrl+U` | bold, italic, underline |
| `Ctrl+Shift+X` `Ctrl+E` | strikethrough, code |
| `Ctrl+K` | link |
| `Ctrl+Shift+8` `Ctrl+Shift+7` | bulleted list, numbered list |
| `Tab` `Shift+Tab` | one list level in, one out |
| `Ctrl+\` | remove formatting |
| `Ctrl+H` | html source |
| `Ctrl+Z` `Ctrl+Y` `Ctrl+Shift+Z` | undo, redo |

`Ctrl` matches Command on Apple keyboards. A key only takes effect where its
command is available, so `Tab` outside a list still moves focus.

Custom commands declare theirs the same way, as one or more chords separated by
spaces:

```js
commands.add('highlight', {shortcut: 'ctrl+shift+h', run: edit => …});
```

A digit is matched by its physical key, so `ctrl+shift+8` is the same chord on
every keyboard layout.

## What a paste may bring in

`--u2-rte-elements` is what a host tolerates in content it already owns.
`--u2-rte-import-elements` is the narrower question of what may *arrive*, and it
defaults to the `@content` preset: headings, text, lists, tables, media, and the
text-level semantics that carry meaning — no layout, no embeds, no forms.

An element that preset does not carry, but whose meaning one of its own does, is
replaced rather than dropped. `<b>` becomes `<strong>` and `<i>` becomes `<em>`,
so the strict list costs no emphasis:

```js
import {importAliases} from './src/input/input-pipeline.js';
new InputPipeline(surface, {aliases: {...importAliases, dfn: 'em'}});
```

Nothing rewrites `<b>` later on its own — the bold mark recognizes it, but only
running a mark command ever makes an element canonical.

## Removing formatting

`unstyle` walks a ladder that never runs out: foreign styles, presentational
attributes and classes, formatting wrappers, then the declared content classes,
the remaining semantic inline elements, and finally the structure itself. It is
unavailable only when the selection is already plain text in default blocks.

With nothing selected it reaches the whole content. Someone who presses with no
selection wants the document cleaned, not nothing to happen; the caret is put
back afterwards rather than the document being left selected.

## Content classes

```js
import './classes.js';
```

```css
[contenteditable] {
    --u2-rte-classes: lead, caption, brandColor;
    --u2-rte-toolbar: style bold;
}
```

The style list offers exactly the declared names, per host. The group is one
mark type and therefore mutually exclusive; an application that needs
independent axes registers a second module with its own adapter.

That one declaration is the single source of truth for those names:

- the control offers them,
- the sanitizer keeps them and drops every other class from external HTML,
- remove-format and paste cleanup leave them alone, including the wrapper that
  carries one, because a declared class is content rather than presentation.

A host that declares none keeps the control hidden and its class handling
unchanged.

## Links

```js
import './link.js';
```

```css
[contenteditable] { --u2-rte-toolbar: bold link; }
```

The form is where the caret is: it appears on its own at a link and goes when the
caret leaves, the way the table and image handles do, so it never takes the focus
by appearing. `link` is therefore left with the one thing that is a decision:
turning a selection into a link — and, at a link, handing the keyboard to the
form. There is no Apply, the link is what the fields say as they are typed, and
removing one is emptying its address. Leaving puts the caret after the link, so
typing continues outside it. Beside the address sits a way to open it, whenever
the address is one a browser can follow. Relative paths, fragments, and application
schemes are accepted — the sanitizer decides which protocols survive, not the
form.

The command behind it is `valueMark(linkHtml)`, an ordinary command any UI can
drive:

```js
commands.run('link', {value: {href: '/docs', target: '_blank'}});
commands.run('link');
```

## Present or available

A control is **absent** when this editor does not offer it: its command is not
registered, `--u2-rte-toolbar` does not list it, or its choices are not
configured — a style select with no `--u2-rte-classes` has nothing to be. A
control that exists but cannot act on the current selection is **disabled**,
never hidden.

That keeps the toolbar's shape following the configuration rather than the
caret, so a control is always found in the same place.

```css
[contenteditable] { --u2-rte-toolbar-unavailable: hide; }
```

trades that away for a toolbar that only ever shows what it can do. Worth it for
a compact toolbar; costly for a wide one, whose controls then move under the
pointer as the caret travels.

## The editor's own chrome

Everything the editor draws — the toolbar, the contextual handles, the link
form, the source dialog — lives in one shadow root of its own, marked
`[data-u2-rte-chrome=editor]`. The page's CSS cannot reach it and its styles
cannot leak out, which is what lets an editor survive being embedded in a
document that styles `button` for its own purposes.

That root is deliberately closed to styling: there is no `::part` surface,
because it would make the chrome's internal structure a public contract. An
application that wants different chrome builds its own on the commands — every
action is a plain command, and `Toolbar` binds markup you supply. Configuration
still crosses the boundary: custom properties inherit into it as usual.

## Images

```js
import './images.js';
```

```css
[contenteditable] { --u2-rte-toolbar: imageOriginal; }
```

Clicking an image selects it and frames it. Three handles sit on its trailing
edges, because the flow holds its top and start edges in place: the bottom-right
corner keeps the proportion, the right edge changes only the width and the
bottom edge only the height. `imageOriginal` clears the size again.

Below it stands its alt text, in one field, appearing and going with the frame
and never taking the focus by appearing. What an image says is part of the image,
and a form nobody opens is a form everybody fills in.

A resize writes `width` and `height` — the attributes the sanitize policy allows
on an image — and does so once, when the drag is released, so it is one undo
step. Changing one measurement alone stretches what the browser was given; an
application that would rather regenerate the file at that size reads the new
attributes from the ordinary `u2-rte-change` event and replaces the source.

`imageTools({selector, minimum})` makes any atomic element sizeable:

```js
editor.add(imageTools({selector: 'img, video, .widget'}));
```

## Tables

```js
import './tables.js';
```

```css
[contenteditable] { --u2-rte-toolbar: insertTable; }
```

Putting the caret in a cell brings up handles on the table: rows down its left
edge, columns along its top, each lined up with that cell — add before, delete,
add after. Inserting a table stays a toolbar control because it applies where no
table is.

Every action is also an ordinary command, so any other UI can drive it:

```js
commands.run('insertTable', {value: {rows: 3, columns: 2}});
```

A new row copies the kinds of cell its neighbour has, so a header row grows into
header cells. Deleting the last row or column takes the table with it. A cell
spanning several rows or columns makes the counted actions unavailable rather
than shifting the wrong cells.

## Editing the HTML directly

```js
import './source.js';
```

```css
[contenteditable] { --u2-rte-toolbar: bold source; }
```

The `source` control opens the surface's HTML in a modal dialog, scrolled and
selected where the caret is. Applying parses the text through the configured
sanitizer — never through `innerHTML` — narrowed by `--u2-rte-elements`, and
lands as one undo step. Formatting only breaks lines where whitespace cannot be
significant, so reading and applying unchanged text is a round trip.

The text area is wrapped in `<u2-code>`, so the source is syntax highlighted
where that element is defined and a plain text area where it is not. This entry
loads it from `u2/el/code` on first use; nothing else in RTE depends on it.

`new Source(surface)` is the same responsibility without any UI: `read()`
returns `{html, start, end}` and `write(html)` replaces the content. The
composable `sourceView(options)` builds the dialog module without a highlighter
unless one is passed as `highlight`. See
[`../src/source/README.md`](../src/source/README.md).

This entry is intentionally a prototype. Unknown toolbar names remain hidden
until a module provides both a command and a control. Final default UI
ownership and complete viewport/writing-mode placement are still being designed
from this working path. See
[`../src/client/README.md`](../src/client/README.md) for its exact boundaries.

An optional command module can extend the imported singleton without scanning
or rebuilding existing editors:

```js
import {editor} from './rte.js';
import {formatModule} from './my-format-module.js';

editor.add(formatModule);
```

The module's command factory runs once for every existing and future rich-text
surface and may use that surface's shared pending-mark state. Optional
`setup()` and `attach()` hooks own editor-wide and per-surface resources; each
returns at most one object with `dispose()`. Removing the extension with
`editor.delete(formatModule)` removes its commands, controls, and resources
everywhere.

### Allowed content

The element policy is shared by cleanup and commands:

```css
.article-editor {
    --u2-rte-elements: @article;
}

.short-answer {
    --u2-rte-elements: p strong em a br;
}
```

Built-in `@basic`, `@article`, and `@document` presets are starting points.
Commands cannot create an element outside the resolved policy. Value controls
such as the block-style select hide individual targets that are not allowed at
the current selection; `--u2-rte-toolbar` still chooses and orders the remaining
controls.

This element list is only the structural half of an input policy. A sanitizer
must additionally decide permitted attributes, URL protocols, and values. For
example, allowing `a` structurally does not by itself make an arbitrary `href`
safe.

### Optional block styles

Add the ready Paragraph/H1/H2/H3 selector with one optional import:

```js
import './rte.js';
import './blocks.js';
```

```css
[contenteditable] {
    --u2-rte: true;
    --u2-rte-toolbar: block bold;
}
```

`blocks.js` imports `rte.js` itself, so the first import may be omitted when
block styles are always present. The separate form makes the base and optional
layers visible.

Applications replace the default module to add class-based or custom block
styles:

```js
import {editor} from './rte.js';
import {blockStyles, blocks, defaultBlockStyles} from './blocks.js';

editor.delete(blocks);
editor.add(blockStyles([...defaultBlockStyles, {
    name: 'lead',
    label: 'Lead',
    selector: 'p.lead',
    tag: 'p',
    write: element => element.classList.add('lead'),
    clear: element => element.classList.remove('lead'),
}]));
```

Unrelated block attributes survive conversion. A selection spanning different
styles shows a mixed/empty value; choosing one applies it to every styleable
text block. Lists, layout containers, table structure, and nested editors are
not mistaken for paragraphs.

### Optional visible line breaks

`breaks.js` makes otherwise invisible `<br>` elements inspectable without
putting marker nodes into editable HTML:

```js
import './breaks.js';
```

```css
[contenteditable] {
    --u2-rte: true;
    --u2-rte-show-breaks: true;
    --u2-rte-toolbar: bold breaks;
}
```

Remove `breaks` from `--u2-rte-toolbar` when line breaks should remain visible
without a toggle. Remove or set `--u2-rte-show-breaks: false` to start hidden.
The marker overlay belongs to the extension, uses the root's top layer where
Popover is available, and disappears completely when no surface displays it.
Toggling is view state: it emits no `u2-rte-change` and cannot enter history.

### Optional Unstyle

Add the staged remove-format action with one import:

```js
import './unstyle.js';
```

```css
[contenteditable] {
    --u2-rte: true;
    --u2-rte-toolbar: bold unstyle;
}
```

It acts only on a non-collapsed selection. Repeated clicks remove the first
remaining configured level: classes, inline styles, presentation attributes,
then ordinary formatting wrappers. A partially selected inline wrapper is
split so surrounding content retains its formatting; a partially selected
block is left alone.

Native paste and drop reuse the same policy automatically. By default they
remove classes and inline styles only from elements added by that input, then
run structural normalization. Existing content around the insertion is not
unstyled. Set `--u2-rte-import-unstyle:none` to retain native presentation.

The policy is also reusable for foreign HTML after security sanitizing:

```js
import {NativeSanitizer, defaultUnstyle} from './rte.js';

const fragment = new NativeSanitizer().sanitize(externalHtml);
defaultUnstyle.clean(fragment, {through: 'styles'});
```

The explicit rich paste/drop adapter composes these same stages:

```js
import {
    Commands, ExternalInput, NativeSanitizer, defaultUnstyle, insertFragment,
} from './rte.js';

const commands = new Commands(surface, {commands: {insertFragment}});
const external = new ExternalInput(surface, {
    commands,
    sanitizer: new NativeSanitizer(),
    unstyle: defaultUnstyle,
    through: ({inputType}) => inputType === 'insertFromPaste' ? 'styles' : 'classes',
});
```

It takes over only rich `text/html`; plain-text and quotation insertion remain
native. Keep `external` for as long as the surface is used and call
`external.dispose()` during manual teardown. Surface disconnection also
disposes it.

## Explicit engine setup

Import from [`../rte.js`](../rte.js) when the application owns module wiring.
The API follows three objects: a **core** per document, a **surface** per
editable element, and the modules installed on a surface. The core alone does
not install input handling, commands, or UI, so applications pay only for the
behavior they construct.

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

Focusing an element that opted in through `--u2-rte`
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
| `--u2-rte-block` | tag name, `none`, `auto` | `p`; structural children in lists/tables; none in inline, item, and cell hosts |
| `--u2-rte-enter` | `break`, `block`, `item`, `row`, `cell`, `auto` | derived from the host |
| `--u2-rte-cleanup` | `none`, `minimal`, `structural`, `canonical` | `structural` |
| `--u2-rte-clean-on` | any of `input paste drop command` | all four |
| `--u2-rte-elements` | tag list, `@basic`, `@article`, `@document`, `all` | `all` |
| `--u2-rte-ui` | `none`, `roaming`, `static` | `roaming` |
| `--u2-rte-ui-size` | length; set on the page, not the field | `14px` |
| `--u2-rte-inline-ui` | any of `table image link`, `none` | every one the loaded modules bring |
| `--u2-rte-classes` | content class names separated by spaces or commas | none |
| `--u2-rte-import-elements` | element names, `@basic`, `@content`, `@article`, `@document`, `all` | `@content` |
| `--u2-rte-import-sanitize` | `policy`, `none` | `policy` |
| `--u2-rte-toolbar` | control names separated by spaces or commas | every represented control |
| `--u2-rte-toolbar-unavailable` | `disable`, `hide` | `disable` |
| `--u2-rte-toolbar-when` | `always`, `selection` | `always` |
| `--u2-rte-show-breaks` | truthy or false-like token | hidden |
| `--u2-rte-import-unstyle` | `none` or an installed Unstyle level | `styles` |

The host element decides the defaults: a `<ul contenteditable>` creates list
items, while a directly editable `li`, `caption`, `th`, or `td` keeps its text
unwrapped and Enter inserts a line break. A `<p contenteditable>` behaves the
same way, while a `<div contenteditable>` uses paragraphs. Values are read on
demand, so a class change or a media query can change editing behavior without
re-registering.

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
import {MarkAdapter, MarkType, PendingMarks, applyMark, removeMark, setMarks} from './rte.js';

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
const pending = new PendingMarks(surface);
commands.add('toggleX', pending.toggle(xHtml));
commands.add('insertText', pending.insertText);
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
the mark. Toggling there changes the next ordinary text input or completed IME
composition, then returns to native input. Composition itself is never
prevented or rewritten. Moving the selection cancels that pending override
without an additional selection listener.

When an operation owns a complete formatting state, register one closed
adapter universe and pass its target marks as the command value:

```js
commands.add('marks', setMarks([boldHtml, colorHtml]));
commands.run('marks', {value: [bold.create(), color.create('blue')]});
```

This removes configured marks absent from the target, resolves exclusions, and
applies the canonical set atomically. Exact canonical wrappers are ordered by
mark rank, redundant nesting is removed, and equivalent nested runs merge to a
fixed point. Additional attributes, atomic content, nested editors, and
unlisted adapters remain untouched. `commands.state('marks')` returns the
current mark array, `'mixed'`, or `null`.

### Standard HTML marks

Bold, italic, underline, strike, code, and link ship as ordinary mark types with
replaceable default HTML adapters:

```js
import {
    boldHtml, codeHtml, italicHtml, linkHtml, strikeHtml, underlineHtml,
} from './rte.js';

commands.add('bold', pending.toggle(boldHtml));
commands.add('italic', pending.toggle(italicHtml));
commands.add('code', pending.toggle(codeHtml));
commands.add('link', pending.toggle(linkHtml, {href: '/docs'}));
```

Use the same `PendingMarks` instance and register its `insertText` command only
once. Boolean adapters recognize `strong`/`b`, `em`/`i`, `u`, `s`/`strike`, and
`code`, then emit `strong`, `em`, `u`, `s`, and `code`. Links recognize
`a[href]` and use `{href, target?, rel?, title?}`. The adapter validates this
shape but deliberately leaves URL schemes to the application; pasted HTML goes
through the separate sanitizer policy. Removing a bare semantic element unwraps
it, while unrelated attributes survive on a neutral `span`.

## Roaming toolbar

`Toolbar` binds application-owned markup to the command registry of the active
surface. It creates no buttons, icons, styles, or editor commands:

```html
<div id="toolbar" aria-label="Formatting">
    <button type="button" data-command="bold" data-state data-shortcut="b">Bold</button>
    <button type="button" data-command="toggleX" data-state data-shortcut="x">Highlight</button>
    <button type="button" data-command="removeX">Remove</button>
</div>
```

```js
import {Toolbar, rangeRect} from './rte.js';

const commandsBySurface = new WeakMap();
core.addEventListener('u2-rte-add', ({detail}) => {
    const commands = createCommands(detail.surface);
    commandsBySurface.set(detail.surface, commands);
    new InputPipeline(detail.surface, {commands});
});

const toolbar = new Toolbar(core, document.querySelector('#toolbar'), {
    commands: surface => commandsBySurface.get(surface),
    place: (element, surface) => placeNear(element,
        rangeRect(surface.selection.range(), {root: surface.element})),
});
```

The optional `place` callback owns geometry, keeping anchor positioning
replaceable. An application toolbar with `popover="manual"` is opened and
closed in the browser top layer by the binder; an ordinary element remains an
ordinary element. Toggle items opt into `aria-pressed` reflection with
`data-state`; action buttons omit it. `data-shortcut="x"` binds Ctrl+X or
Command+X while keyboard input belongs to the active surface. An inherited
`--u2-rte-toolbar: toggleX removeX` property selects the items for one editor.
`--u2-rte-inline-ui` decides which contextual UIs a field draws at its content —
the table handles, the image frame, the link form. It is a property of the field,
not of the module set: the same editor then serves a body of text with everything
and a bare teaser field with `none`, without a second instance. The commands stay
either way; only the chrome goes.

`--u2-rte-ui-size` scales everything the editor draws. It is the one exception to
the table above in that it is read where the chrome hangs — the page — rather
than on the field, and it is deliberately the only way in: every size inside the
chrome is `em` against it, so nothing the site does to its own root font moves
the editor's furniture.

`--u2-rte-ui: none` hides the roaming toolbar. Moving focus between the surface
and toolbar keeps it open; leaving both hides it. `rangeRect()` preserves a
usable native range rectangle and derives an empty collapsed one from adjacent
rendered content without mutating DOM or selection.
Set `--u2-rte-toolbar-when: selection` to show it only while the saved editor
selection is non-collapsed; the default also shows it at a caret.

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
| `u2-rte-command` | surface | a command executed; `transaction` is null for a view action |
| `u2-rte-normalize` | surface | cleanup ran, with its actions and unresolved issues |
| `u2-rte-change` | surface | the transaction committed |
| `u2-rte-error` | surface | a transaction or fail-closed external input failed; direct calls rethrow |
| `u2-rte-disconnect`, `u2-rte-dispose` | surface, core | teardown |

**Listen to `u2-rte-change` for "the content changed".** It arrives once per
transaction, after every command and cleanup step inside it. `u2-rte-command`
and `u2-rte-normalize` report steps within a transaction and are meant for
diagnostics and modules. View commands such as visible line breaks emit only
`u2-rte-command` because they do not change content.

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

RTE now has an immutable security policy and a native `Element.setHTML()`
adapter, but the input pipeline does not consume clipboard or drag payloads
yet. Structural normalization still is not sanitizing: external HTML must pass
through a supported security adapter before insertion. Firefox/WebKit need the
planned non-native adapter rather than an unsafe parsing fallback.

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
- **No ready-made link-entry UI yet.** The standard mark types and HTML adapters
  are available, but the convention client intentionally exposes only Bold.
  Applications decide how URLs are entered and validated before registering a
  link command or control.
- **No complete deletion or general list commands.** Backspace and Delete at a
  mergeable block boundary are explicit; ordinary character deletion stays
  native. Selected-range deletion, list creation, indent, and outdent remain open.
  Enter can split an item and exit an empty list item.
- **No contextual plain-text/quotation importer and no serializer.** Rich
  paste/drop remains browser-native across engines and receives mapped
  presentation plus structural cleanup afterwards. The optional pre-native
  HTML-string path still requires an explicitly supplied safe sanitizer.
- **The convention toolbar is only a prototype.** `rte.js` provides one
  styled Bold control plus optional block-style and visible-break extensions;
  the standalone roaming binder still leaves markup, theme, placement, and
  command sets to the application. Static bindings and menu state are open.
- **The verified 379-test baseline covers Chromium 152, Firefox 154, and
  WebKitGTK 2.52.5.** It adds
  later list,
  mark, toolbar, normalization, convention-client, optional-module, block-style,
  heading Enter, structural deletion, range geometry, element policy, extension
  lifecycle, top-layer toolbar, visible-break, sanitizing-policy, selection-only
  toolbar, Unstyle, mapped fragment replacement, post-native import cleanup,
  and composition-aware pending marks.
  Standard HTML mark coverage raises the current runner to 381 tests;
  cross-browser verification of that revision is pending.

[`../PLAN.md`](../PLAN.md) tracks what lands next.
