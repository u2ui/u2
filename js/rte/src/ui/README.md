# Toolbar UI

`toolbar.js` binds an application's toolbar markup to the command registry of
the currently active surface. It provides the roaming behavior; it does not
create buttons, inject styles, choose icons, or define editor commands.

The useful interaction model comes from the original `../rte0` toolbar: one
shared toolbar follows the active editor, its items reflect the current
selection, pointer interaction keeps the editor selection, and keyboard
shortcuts invoke the same actions. RTE replaces the old global item registry,
`execCommand()`, delayed focus repair, and automatic style injection with the
existing core, surface, and command contracts.

## Contract

```js
const toolbar = new Toolbar(core, element, {
    commands: surface => commandsBySurface.get(surface),
    place: (element, surface) => placeNearSelection(element, surface.selection),
});
```

- `core` supplies the active surface and owns the single root-level lifecycle.
- `element` is application-owned markup. Descendants with `data-command` are
  action/toggle items; `select[data-command-value]` binds one value-bearing
  command. No icon system or CSS is required. If the element has
  `popover="manual"`, visibility also opens and closes it in the browser top
  layer without changing focus.
- `commands(surface)` resolves the registry belonging to that surface. Returning
  `null` hides the toolbar, which permits lazy surface setup without coupling a
  registry to `Surface`.
- `place(element, surface)` is optional presentation policy called after every
  visible refresh. Positioning remains replaceable and outside command logic.
- `refresh()` reads command availability and state immediately and returns
  whether the toolbar is visible.
- `dispose()` removes all core, surface, DOM, and shortcut listeners. Core
  disposal also disposes the toolbar.

The toolbar listens only to active-surface changes, selection changes, committed
changes, disconnect, and root focus transitions. Switching surfaces aborts the
old surface listeners. It does not observe DOM or poll state.

## Items

```html
<div class="toolbar" aria-label="Text formatting">
    <button type="button" data-command="bold" data-state data-shortcut="b">Bold</button>
    <button type="button" data-command="italic" data-state data-shortcut="i">Italic</button>
</div>
```

An item is visible only when the active registry contains its command. Its
`disabled`/`aria-disabled` state follows `commands.enabled()`. On a `data-state`
item, boolean and `'mixed'` command states become `aria-pressed`, so toggle
buttons need no separate adapter. Action buttons omit `data-state` and never
pretend to be toggles merely because their command can report state.
`data-control` may give a button a CSS-facing name different from its command,
just as it does for a value control. This lets `--u2-rte-toolbar: breaks` expose
a button whose command is `showBreaks`.

`data-shortcut="b"` means Ctrl+B or Command+B while keyboard input belongs to
the active surface. Shortcuts with Shift or Alt are deliberately not inferred;
future keymap policy can generalize that syntax without changing commands.

An editor may select the shared toolbar's available items with an inherited CSS
property:

```css
.compact-editor { --u2-rte-toolbar: bold italic; }
```

An absent or empty property exposes every registered item represented in the
markup. `--u2-rte-ui: none` hides this roaming toolbar. A future static binding
can consume the same item contract without changing the core or registry.

By default the toolbar is useful at both a caret and a selected range. An
editor that wants contextual formatting controls only while text is visibly
selected can opt in without constructing a different toolbar:

```css
.selection-toolbar { --u2-rte-toolbar-when: selection; }
```

`selection` means a valid, non-collapsed saved selection. A missing selection
or caret hides the toolbar. `always`, an absent value, and unknown future values
retain the default behavior.

### Command values

A select can represent a mutually exclusive group of commands:

```html
<select data-command-value="blockStyle" data-control="block" aria-label="Block style">
    <option value="">Block style</option>
    <option value="paragraph">Paragraph</option>
    <option value="h1">Heading 1</option>
</select>
```

`data-command-value` names one command, while `data-control` is the name exposed
to `--u2-rte-toolbar`. Option values become `edit.value`. The command's string
state selects the matching option; mixed, null, unknown, or conflicting state
selects the empty placeholder. A change restores the saved editor selection and
runs the command through the same transaction path as a button. Availability
is queried with each option's value, so unsupported values are hidden and
disabled; state is queried once per refresh. The adapter attaches no listener
per option or surface.

## Invariants

- UI focus never deactivates the current surface or becomes editor selection.
- Focus moving between the active surface and its toolbar keeps the toolbar
  open. Leaving both hides it; later selection/change notifications do not
  reopen it until focus returns.
- Every action runs through `Commands`; UI code never mutates editable DOM.
- One toolbar can serve arbitrarily many surfaces and resolve different command
  sets for each one.
- Markup, labels, localization, icons, layout, and placement are application
  policy and add no engine-side resources when no toolbar is constructed.

## Chrome

`Chrome` is one shadow root per editor for everything the editor draws: its
toolbar, its contextual handles, its forms and dialogs. It carries the top
layer, and each piece registers its own stylesheet in it through
`style(key, css)`, once.

`follow(element)` keeps that one chrome inside the closest currently active
native top-layer boundary: a modal dialog, open popover, or fullscreen element.
This is a DOM relationship rather than a `z-index` trick, because modal
inertness and fullscreen rendering admit only descendants. Dialog `open`
mutations, popover `toggle`, and `fullscreenchange` update the mount; closing a
boundary returns the chrome to its original `Document` or `ShadowRoot`.
The host is an explicit `contenteditable=false` boundary. A convention client
also retains it in the core so UI focus and temporary direct-host mounting do
not become editor state or content.

An editor is chrome inside someone else's document and has to survive their
`button {}` rule. One encapsulated root means the page's CSS reaches none of it,
none of its styles leak out, and the application sees a single element rather
than one per piece of UI. Its host is `all: initial`, so the page's typography
does not shift it either; custom properties are excluded from `all` and still
inherit, so configuration is unaffected.

There is deliberately no `::part` surface. Exposing parts would make the
internal structure of the chrome a public contract, and it is not needed:
an application that wants different chrome builds its own on the commands, which
is the supported path and always was. `Toolbar` already binds application-owned
markup for exactly that reason.

## Handles

`Handles` is a set of buttons placed around something, with an optional frame
drawn behind them. It owns no editor concept: a caller says where each handle
goes and what pressing one means, so anything with a rectangle can use it —
inside this engine or outside it.

```js
const handles = new Handles(chrome.root, {
    name: 'tables',
    handles: [{name: 'rowAfter', label: 'Row below', text: '+'}],
    action: name => …,
    press: name => …,
});
handles.show().place('rowAfter', x, y).disable('rowAfter', false);
```

Given a shadow root it places itself inside it and registers its stylesheet
there. Given a document it makes an encapsulated root of its own, so it works
just as well outside an editor.

Both its listeners are on the containing root rather than the host: an event
that is not composed never leaves the shadow tree it happened in. Pressing a
handle prevents its default, because pointing at editor chrome must never move
the selection it acts on.

The glyph inside a handle is centred with `text-box: trim-both cap alphabetic`,
which trims the font's leading so a bare `+` or `×` sits on its optical centre
rather than its metric one. Where that is unsupported the flex centring alone
still applies.

## Present or available

Two different questions, answered two different ways:

- **Presence** says what this editor offers at all. A control is absent when its
  command is not registered on the surface, when `--u2-rte-toolbar` does not
  list it, or when its choices are not configured — a style select with no
  `--u2-rte-classes` has nothing to be.
- **Availability** says what the current selection allows. A control that exists
  but cannot act is disabled, never hidden.

Keeping the two apart is what makes a toolbar usable: its shape follows the
configuration and stays put while the caret moves, so a control is always found
in the same place. A toolbar whose buttons appeared and vanished with every
selection change would move its targets out from under the pointer.

`--u2-rte-toolbar-unavailable: hide` trades that away deliberately, for a
toolbar that only ever shows what it can do. It is the host's call, not the
default: a compact toolbar of two or three controls loses little by moving,
while a wide one loses a great deal.

## Focus across the boundary

A `focusout` listener outside the toolbar's shadow tree sees its related target
retargeted to that tree's host. Focus moving from the surface into a control of
the toolbar's own therefore looks like focus leaving the editor, and dismissing
on it would take the toolbar away in the middle of the click that opened a
select. Ownership is decided against the tree's host as well as its contents.

## Placement

`place(element, surface, {align, prefer, gap})` is the one placement policy for every
contextual UI. It anchors on the surface's saved selection through `rangeRect`,
keeps the element inside the viewport, and falls to the other side when the
preferred one does not fit. The roaming toolbar centres above the selection; the
link form aligns to its start and prefers below.

A select with no usable choice hides like a button whose command is unavailable:
a control that cannot be used is not shown.

Pointing anywhere at the toolbar never moves the editor's selection, including
at a control that currently has nothing to run — otherwise clicking a disabled
button would blur the surface and dismiss the toolbar. Fields keep their own
pointer behaviour so they can be opened and typed in.

Keys are not the toolbar's concern: a command declares its own shortcut and the
input pipeline resolves it, so a key works whether or not a control for it is on
screen. `data-shortcut` remains as the hint shown in a control's title.

## TODO

- Add a static-surface binding using the same item state rules.
- Define richer shortcut descriptors and conflict resolution with application
  keymaps.
- Bind menus and application-owned custom controls; command-valued selects are
  implemented.
- Verify top-layer Popover focus, caret, viewport, writing-mode, and ShadowRoot
  behavior in all target browsers; use Dialog only for modal extension UI.
