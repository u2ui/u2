# Convention editor client

`editor.js` is the deliberately small batteries-included layer above the RTE2
engine. It proves the desired one-import setup without making its provisional
module and default-UI decisions part of the core.

The public root `editor.js` creates one `Editor` for the default document core:

```js
import './editor.js';
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

The optional `link.js` entry adds a contextual link editor. Its `link` command
is an ordinary `valueMark`, so any other UI can drive the same create, change,
and remove path; the module supplies one form, anchored at the selection, plus
an `unlink` control that needs no form. Escape leaves the form without acting
and puts the caret back where it was opened. The address is a plain text field on
purpose: native url validation rejects relative paths, fragments, and
application schemes and would silently block the form, while which protocols are
acceptable is the sanitizer's decision.

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
history to an application.

Those defaults arrive as three ordinary modules — `history`, `marks`, and
`structure` — registered before any surface exists. They use exactly the module
contract below and can be removed with `editor.delete('structure')`, so nothing
about them is privileged. Every control they contribute is gated by
`--u2-rte-toolbar`, so a host that lists only `bold` shows only Bold while the
commands and their keyboard shortcuts stay available.

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
import {editor, externalInputs} from '../../editor.js';
import {NativeSanitizer} from '../../rte.js';

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

`editor.js` exports the factory but does not install it by default. Its ordinary
input pipeline leaves paste/drop insertion to the browser, removes classes and
inline styles from only the added elements, and then normalizes their structure.
That path needs no HTML parser. Applications importing arbitrary HTML strings
may still provide any safe adapter through the same `sanitize()` contract.

`dispose()` removes every installed input pipeline, listener, toolbar node, and
style node without disposing the supplied core. It is idempotent and is also
available through `[Symbol.dispose]()`; core disposal disposes the client. One
core accepts only one convention client at a time, preventing duplicate input
pipelines. Disposal releases that ownership so a new client can take over.

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
