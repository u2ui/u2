# Convention editor client

This is the deliberately small batteries-included layer above the RTE engine.
It proves the desired one-import setup without making its provisional module and
default-UI decisions part of the core.

The public root `rte.js` creates one `Editor` for the default document core:

```js
import './rte.js';
```

```css
[contenteditable] {
    --u2-rte: true;
    --u2-rte-toolbar: bold;
}
```

No surface is discovered by observation. The core registers an opted-in host
when focus reaches it; the client then installs its standard command registry
and input pipeline. A default roaming toolbar is allocated only when the first
rich-text surface becomes active. `plaintext-only` hosts stay completely native.

The optional `blocks.js` entry adds the block-style control. A host may name its
own with `--u2-rte-blocks: Absatz(p), Lead(p.lead), Notiz(p[data-note])`:
`declaredStyles()` turns each selector into a style whose tag is created and
whose conditions are written and cleared with it, so a block class needs no code.
Recognition takes the most specific match, which is why a plain tag and its
variants can be declared side by side.

The optional `classes.js` entry adds a content-class control. Its choices come
from the host's `--u2-rte-classes`, so its toolbar select is filled per surface
rather than at registration: a module control may declare `options` as a
function of the surface, and the client refills that select before the toolbar
is shown. The same declaration is what the sanitizer keeps and what
presentation cleanup leaves alone.

One set of classes is one mark and therefore one either-or choice. A field that
combines axes — a colour *and* an alignment — names them in
`--u2-rte-class-groups: color(Red Green), align(Left Center Right)`, and each set
becomes a section of the same menu: exclusive in itself, free of the others.

The control is a menu rather than a select for that reason: a select carries one
value, and the whole point is carrying one from each set. It is also why the
sections can come from CSS at all — a toolbar builds its controls once, when a
module is registered, so how many *controls* there are cannot depend on a host,
while what one control *contains* is read per surface like every other choice.

The names still have to be in `--u2-rte-classes`: what may exist and what is
offered are separate questions, and a class foreign content may carry needs no
control at all.

The optional `images.js` entry frames a selected image, with handles on its
trailing edges and its alt text in a field below it. Both come and go with the
selection and neither takes the focus by appearing, so naming an image is one
click away and nothing has to be opened. The name is written as it is typed, so
Enter has nothing to confirm: it hands the caret back to the text, after the
image.

The optional `link.js` entry adds a contextual link editor. Its `link` command
is an ordinary `valueMark`, so any other UI can drive the same create, change,
and remove path; the module supplies one form.

That form is where the caret is: it appears on its own when the caret enters a
link, anchored on the link rather than on the selection, and goes when the caret
leaves — the same rule the table and image handles follow. Appearing therefore
never takes the focus, because someone is typing. What is left for the toolbar
control is the one thing that is a decision: turning a selection into a link, and
at an existing link handing it the keyboard.

The form has no Apply and no Remove: what its fields say is what the link is, as
it is typed, and an emptied address says there is no link — the form stays on the
text, so the same words can be linked again.
Each edit runs the command marked as ongoing input, so history keeps a whole
address as one step rather than one per keystroke. Marking the link moves the
document selection into it and an engine follows that with focus, so the field
being typed into gets focus back with its caret intact — otherwise the second
character would land in the editor. What it edits is one link, decided when it
appeared — not wherever the caret has moved on to, or a pending edit would land
somewhere else the moment the caret did. Enter and Escape hand the caret back to
the text — after the link, not inside it, because whoever just made one wants to
keep writing without it. Neither dismisses the form: it goes because the caret
has left the link, and with every edit already applied one key has nothing left
to confirm and the other nothing to undo.

Beside the address sits a way to open it in a new tab, shown only while the
address is one the browser can follow: an application scheme — a page id, a
record reference — is a link the editor understands and the browser does not. The address is a plain text field on
purpose: native url validation rejects relative paths, fragments, and
application schemes and would silently block the form, while which protocols are
acceptable is the sanitizer's decision.

What an address means is the application's decision, and `linkEditor()` takes
two hooks for it. `normalize(value, surface)` receives the finished value
once, when the form is done, and may complete a bare domain, map an address into
a scheme of its own, or derive `rel` and `target` from it; what it returns is
what gets written and shown. Not per keystroke, which would rewrite a half-typed
address under the caret — and not when the field is left either: marking the link
takes the focus away and hands it back on every keystroke, so leaving a field is
not an event this form can wait for. `suggest(text, surface)` is asked, possibly
asynchronously, what a *new* link should point at, given the text it is being put
on; its answer is used only while the form is still open on the same link and
the address is still empty. It is offered rather than applied — it stands in the
field, selected so one keystroke replaces it, and becomes the link when the form
is done. Applying it at once would mark the link, and marking moves the selection
into it and the focus after that, throwing whoever asked for a link back into the
text before they had seen the answer.

`complete(text, surface)` is asked what addresses go with what is being typed and
answers with entries `{value, label}` — or `{value, html}` for a row with markup,
which the form writes through `setHTML()`, so the platform sanitizes it; where an
engine does not ship that yet, the entry shows its address instead. The form
renders its own list rather than a native datalist, which cannot show markup: the
arrow keys move through it, Enter takes the current entry, Escape closes the list
before it closes the form, and a pointer does the same. One question is in flight
at a time, and a late answer to a word that has since changed is dropped.

Contextual UI goes with the editing session and comes back with it, and it draws
only while there is one. A selection is not a session: engines leave a selection
inside an editable nobody focused — clicking beside one does that — and the core
captures it before deciding that no session follows. Drawing on that capture
would put a link form or a set of handles on a caret the keyboard cannot reach,
which is what the toolbar already refuses. `follows()` owns that lifecycle for
every module that draws one: selection, content, and the
session's return, because coming back to the selection a module was already
showing for is no selection change and would otherwise leave its handles or its
form behind. A module that has more of its own to hear ends it with the same
signal, the way the table handles listen for typing.

Everything this client draws goes into one `Chrome`: its toolbar, the contextual
handles, the link form, the source dialog. A module receives it as `chrome` in
its setup context and puts its UI in `chrome.root`, so no module owns a layer, a
top-layer element, or a place in the application's DOM. The chrome is made on
first use, so an editor that never shows anything adds nothing to the document,
and disposing the client takes all of it away at once.
When the active surface sits in a modal dialog, open popover, or fullscreen
element, the same chrome follows it into that native top-layer boundary and
returns afterward. The client registers the chrome as retained core UI, so its
controls keep activation and direct top-layer hosts keep it out of Source and
History content.

The optional `images.js` entry frames a selected image with three handles on its
trailing edges: the bottom-right corner keeps the proportion, the right edge
changes only the width and the bottom edge only the height. An image sits in a
text flow with its top and start edges held in place, so dragging the other side
is the only direction that grows it where the eye expects — a handle on a
leading edge would move the picture rather than resize it. A drag moves the
frame only and the size is written once when it is released, so a resize is one
undo step rather than a trail of them. Selecting the image that was clicked is
not its job: the input pipeline selects any atomic element a click lands on.
What is resizable is a selector, so any atomic element can be made sizeable.

The optional `tables.js` entry puts its actions on the table itself. Row handles
run down the table's left edge and column handles along its top, each lined up
with the cell the caret is in: add before, delete, add after. A handle whose
command cannot run is disabled rather than hidden, so the row of three keeps its
shape. Only `insertTable` is a toolbar control, because it applies where no
table is.

The layer is one per editor, lives in the browser top layer, and is repositioned
from selection, change, input, scroll, and resize — never from a timer.

The optional `source.js` entry adds a modal HTML source view. Its dialog wraps
its text area in `<u2-code>`: where that element is defined it takes the area
over and highlights it, and where it is not the area renders on its own.
Highlighting is therefore an enhancement, never a dependency — `sourceView()`
alone imports nothing, and the root entry passes a `highlight` loader that pulls
`u2/el/code` before the first open. Closing without applying restores the caret
the view was opened on.

## Prototype contract

`new Editor(core)` currently installs these defaults per rich-text surface:

- `enter` and `lineBreak` structural commands;
- `deleteBackward` and `deleteForward` for content-model-approved block joins
  while ordinary character deletion stays native;
- one `PendingMarks` instance;
- `insertText` routing and post-composition formatting while a pending mark exists;
- one `History` instance with `undo` and `redo`, including Ctrl/Command+Z,
  Ctrl/Command+Shift+Z, and Ctrl/Command+Y;
- the ready-made inline marks `bold`, `italic`, `underline`, `strike`, and
  `code`, with Ctrl/Command+B, +I, and +U;
- the block structure commands `bullets`, `numbers`, `indent`, `outdent`, and
  `rule`;
- one `InputPipeline` using the normal host configuration.

`commands(surface)` and `history(surface)` expose the per-surface registry and
history to an application; `controls` lists what the registered modules offer by
name, so a host can build its own list of what `--u2-rte-toolbar` may choose
from without guessing.

Those defaults arrive as three ordinary modules — `history`, `marks`, and
`structure`, one file each — registered before any surface exists. They use exactly the module
contract below and can be removed with `editor.delete('structure')`, so nothing
about them is privileged. Every control they contribute is gated by
`--u2-rte-toolbar`, so a host that lists only `bold` shows only Bold while the
commands and their keyboard shortcuts stay available. The list is also the order
they appear in: what a toolbar looks like is the host's to say, and without a
declaration the controls keep the order their modules were registered in.

`add(module)` installs an optional extension into already registered and future
rich-text surfaces. A module has one client-wide name and may provide a command
factory, lifecycle hooks, and declarative toolbar controls:

```js
const highlight = {
    name: 'highlight',
    commands({pending}) {
        return {highlight: pending.toggle(highlightHtml)};
    },
    toolbar: [{
        command: 'highlight',
        label: 'Highlight',
        text: 'H',
        state: true,
    }],
};

editor.add(highlight);
```

The factory returns a plain object whose keys are command names and whose values
follow the normal `Commands` contract. `surface` is the target surface,
`pending` is its shared `PendingMarks` instance, so formatting modules compose
with the one `insertText` route rather than installing competing pipelines, and
`history` is its `History`.
`toolbar` is optional; its controls require non-empty `command`, `label`, and
`text`, with optional `state` and `shortcut`.

A module may instead contribute a value-bound select. Its `name` is the CSS
toolbar token, `command` is one normal command, and every option maps a label to
an `edit.value`:

```js
toolbar: [{
    type: 'select',
    name: 'block',
    command: 'blockStyle',
    label: 'Block style',
    options: [
        {value: 'paragraph', label: 'Paragraph'},
        {value: 'h1', label: 'Heading 1'},
    ],
}]
```

The optional root `blocks.js` entry uses this contract for Paragraph, H1, H2,
and H3. `blockStyles(styles, options)` creates a replacement module from custom
definitions, including class-based styles such as `p.lead`. Importing
`blocks.js` also imports the convention editor and registers the default module.

Module names, command names, and routed `inputType` ownership are exclusive.
Adding the same module object twice is idempotent; a different module with the
same name or a command/input route already owned by the client throws. The
declaration and controls are snapshotted at registration, so later caller
mutation cannot change future surfaces. Installation into existing surfaces is
atomic. `delete()` accepts the registered module object or its name, removes its
commands and controls everywhere, and returns whether it existed. Changing
module topology clears transient pending caret marks so a removed formatter
cannot affect later input. A disposed client rejects new modules.

`setup({editor, core, root})` runs once when an extension is added.
`attach({editor, surface, pending, commands})` runs once for every current and
future rich-text surface, after that extension's commands are registered. Each
hook may return nothing or one object with `dispose()`. Surface disposal,
`delete()`, failed atomic installation, and editor disposal release those
objects in the reverse scope. There is deliberately no second `destroy()` or
cleanup-function convention.

This remains a narrow extension contract rather than a general plugin
framework: setup and attachment are synchronous, command/input ownership stays
exclusive, and an extension cannot reach private client state.
`commands(surface)` exposes that surface's registry or `null` for direct
inspection. `refresh()` re-reads the active surface's CSS and toolbar state.

The first active roaming surface creates one application-owned default toolbar
element and one small style element in the core root. `--u2-rte-toolbar` filters
its available controls through the normal `Toolbar` contract. Only `bold` is
shipped here yet; an unknown name such as `code` remains invisible rather than
pretending that its command exists. `--u2-rte-ui: none` prevents allocation
until another roaming surface becomes active. Leaving both the active surface
and toolbar hides it. Default placement uses the isolated `rangeRect()` browser
policy, so an empty native caret rectangle is derived from adjacent rendered
content without inserting a marker into the editor.
`--u2-rte-toolbar-when: selection` additionally keeps the toolbar hidden at a
caret and opens it only for a non-collapsed saved selection.
When Popover is available, the convention toolbar is a manual popover in the
browser top layer; its fixed range placement and focus-preserving behavior stay
the same inside a Document or ShadowRoot.

### Visible line breaks

The optional root `breaks.js` entry is the first lifecycle extension:

```js
import './breaks.js';
```

```css
[contenteditable] {
    --u2-rte-show-breaks: true;
    --u2-rte-toolbar: bold breaks;
}
```

The CSS property chooses the initial view state when a surface connects.
Leaving `breaks` out of the toolbar list gives an always-on display with no
toggle. The `showBreaks` command runs outside an editing transaction, so it
emits a command event but no content-change event and never enters history.

The extension does not insert markers beside `<br>` nodes. One extension-owned
top-layer overlay contains presentation-only marks and is allocated only while
at least one surface shows them. A single root scroll listener, resize listener,
and `ResizeObserver` schedule all visible surfaces together; input and editor
changes schedule their own surface. Removing the extension restores its host
attributes, overlay, styles, observers, and listeners. Document and ShadowRoot
cores keep all of those resources in their own root. Nested editable surfaces
own their own `<br>` markers, so an outer surface never duplicates them.

### Optional Unstyle

The optional root `unstyle.js` entry adds a selection-only `unstyle` action:

```js
import './unstyle.js';
```

```css
[contenteditable] { --u2-rte-toolbar: bold unstyle; }
```

Each click applies the first remaining presentation level. The button disables
when the selection has nothing covered by the policy. `unstyles(levels,
options)` creates a replacement module with application levels, command/control
names, label, and text. The underlying policy also cleans safely parsed
external fragments; the toolbar contains no paste-specific logic.

### Optional rich external input

`externalInputs(options)` adapts the low-level `ExternalInput` boundary to the
convention client's normal extension lifecycle. It is needed only when an
application chooses to read and replace rich HTML before native insertion. A
sanitizer is mandatory and is never selected implicitly:

```js
import {editor, externalInputs, NativeSanitizer} from '../../rte.js';

editor.add(externalInputs({sanitizer: new NativeSanitizer()}));
```

The module registers mapped `insertFragment` and attaches one input boundary to
every current and future rich surface. Removing it disposes the listeners and
command everywhere. It contributes no toolbar control.

With the default Unstyle policy, an inherited CSS property chooses cumulative
presentation cleanup for each import:

```css
[contenteditable] { --u2-rte-import-unstyle: styles; }
```

The value may be `none`, `classes`, `styles`, `attributes`, or `formatting`.
Custom `Unstyle` policies may use their own level names. Pass `unstyle: null`
to disable this stage, or pass `through` as a fixed name or resolver function
to replace CSS resolution. The security sanitizer still always runs.

`rte.js` exports the factory but does not install it by default. Its ordinary
input pipeline leaves paste/drop insertion to the browser, removes classes and
inline styles from only the added elements, and then normalizes their structure.
That path needs no HTML parser. Applications importing arbitrary HTML strings
may still provide any safe adapter through the same `sanitize()` contract.

`dispose()` removes every installed input pipeline, listener, toolbar node, and
style node without disposing the supplied core. It is idempotent and is also
available through `[Symbol.dispose]()`; core disposal disposes the client. One
core accepts only one convention client at a time, preventing duplicate input
pipelines. Disposal releases that ownership so a new client can take over.

### Optional assistant

`aiView(options)` adds a prompt over the whole field, shown beside the original
with the answer in an editable pane. Applying writes it back through the source
path, so a model's output is external input like any other and meets the
sanitizer. Which model answers is application policy, so `request` is mandatory
and has no default:

```js
import {editor} from '../../rte.js';
import {aiView} from '../../ai.js';

editor.add(aiView({
    request: ({prompt, html}) => ask(prompt, html),   // returns html
    prompts: ['Shorten', 'Continue', 'Fix spelling'], // optional suggestions
    diff: (original, edited) => mark(original, edited), // optional third pane
}));
```

`request({prompt, html})` receives the field's serialized content and returns
its replacement, as a promise or directly. `surface` comes along rather than a
digest of it: `surface.config` says what the field allows — with `null` where
nothing is restricted — because an answer using anything else is cleaned away on
the way back in, and `surface.element` is where an application reads whatever
else its own fields carry; a rejection is shown in the answer
pane and leaves the field untouched. `prompts` fills a datalist beside the
input. Without `diff` the dialog shows two panes — comparing two HTML strings is
a library question, not an editor one, so none is pulled in. Answers that arrive
after the next prompt, or after the dialog closed, are dropped.

`rte.js` does not install it, and `ai.js` exports only the factory: an assistant
without a configured request would be a button that cannot work.

## Invariants

- Importing the convention client adds only core listeners. It scans no DOM,
  installs no observer, and creates no UI before a qualifying surface is active.
- Every mutable registry and pipeline belongs to one `Editor` instance and one
  surface; different cores cannot share state.
- A module is installed once per rich surface, owns all command names and
  controls it contributes, and is removed from all of them as one operation.
- Module installation either succeeds for every existing surface or leaves
  every registry and input route unchanged.
- All editing still runs through public commands, transactions, point mapping,
  normalization, and `Toolbar`. The client contains no second editor algorithm.
- The engine entry `rte.js` remains usable without importing this layer.

## Browser considerations

Lazy registration uses the core's existing capture-phase focus route. The UI
uses a manual top-layer popover with fixed positioning around the saved range,
with non-mutating
collapsed-range geometry fallback, and intentionally does not claim final
viewport, zoom, touch, writing-mode, or virtual-keyboard policy.
The real-browser suite covers lazy focus setup, Enter routing, toolbar commands,
late module installation, future surfaces, rollback, removal, plain-text
exclusion, rich external-input composition, and complete teardown.

## TODO exposed by the prototype

- Exercise lifecycle failure and coexistence further before adding dependency,
  ordering, or asynchronous setup concepts.
- Decide whether the default UI becomes application DOM, a custom element, or
  an optional UI module before stabilizing its styling hooks.
- Generalize placement for viewport edges, writing modes, zoom, touch handles,
  and virtual keyboards.
- Decide separately whether `code` means inline `<code>` formatting or the old
  editor's HTML-source UI; block styles now provide the first substantial
  optional capability.
