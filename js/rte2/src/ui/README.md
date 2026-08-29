# Toolbar UI

`toolbar.js` binds an application's toolbar markup to the command registry of
the currently active surface. It provides the roaming behavior; it does not
create buttons, inject styles, choose icons, or define editor commands.

The useful interaction model comes from the original `../rte` toolbar: one
shared toolbar follows the active editor, its items reflect the current
selection, pointer interaction keeps the editor selection, and keyboard
shortcuts invoke the same actions. RTE2 replaces the old global item registry,
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
  toolbar items; no particular tag, icon system, or CSS is required.
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
changes, and disconnect. Switching surfaces aborts the old surface listeners.
It does not observe DOM or poll state.

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

## Invariants

- UI focus never deactivates the current surface or becomes editor selection.
- Every action runs through `Commands`; UI code never mutates editable DOM.
- One toolbar can serve arbitrarily many surfaces and resolve different command
  sets for each one.
- Markup, labels, localization, icons, layout, and placement are application
  policy and add no engine-side resources when no toolbar is constructed.

## TODO

- Add a static-surface binding using the same item state rules.
- Define richer shortcut descriptors and conflict resolution with application
  keymaps.
- Bind non-boolean command values to selects, menus, and custom controls.
- Add an optional reusable placement policy after caret, viewport, writing-mode,
  and popover behavior are verified in all target browsers.
