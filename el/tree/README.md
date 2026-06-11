# &lt;u2-tree&gt; - element
Treeview component `<u2-tree>Folder <u2-tree>File</u2-tree> </u2-tree>`

## Features

- Keyboard navigation
- Focus on the next item that starts with the pressed key
- Expand/collapse events
- Lazy loading of children
- Drag and drop (opt-in, loaded on demand via the `draggable` attribute)

## Usage

```html
<u2-tree aria-expanded=true>root
    <u2-tree>Folder 1
        <u2-tree>File 1.1</u2-tree>
    </u2-tree>
    <u2-tree aria-expanded="true">Folder 3
        <u2-tree>File 3.1</u2-tree>
        <u2-tree>File 3.2</u2-tree>
    </u2-tree>
</u2-tree>
```

```css
u2-tree::part(row):hover {
    background:#00000004;
}
u2-tree[aria-selected=true]::part(row) {
    background:#00000008;
}
u2-tree::part(row):focus {
    outline:1px dotted;
}
```

## API

### Javascript

```js
el.select(); // selects the element
el.toggleExpand(true/false/undefined); // undefined toggles
el.path(); // returns path to element
el.root(); // returns root element of the tree-item
el.next(); // next sibling treeitem (skips slotted icon/label)
el.prev(); // previous sibling treeitem
```

### Keyboard

Expand/collapse is on the arrow keys (WAI-ARIA tree pattern): `ArrowRight` expands,
`ArrowLeft` collapses. `Enter` and `Space` just select the focused node.

### Attributes

#### aria-expanded
This will initialy expand the tree:
```<u2-tree aria-expanded="true">...</u2-tree>```

This is either not expandable or like aria-expanded="false" if it has children.
`<u2-tree></u2-tree>

#### aria-live
`<u2-tree aria-live></u2-tree>`
This indicates, that the node has to be loaded.  
The `u2-tree-collapse` event will get a property `event.load(asyncFn)` to load their children.

### Events

#### expand / collapse
```js
treeElement.addEventListener('u2-tree-expand', (e) => {
    e.load && e.load(promise);
});
treeElement.addEventListener('u2-tree-collapse', (e) => {...});
```

#### select
```js
treeElement.addEventListener('u2-tree-select', (e) => { ... });
```

#### drag and drop
Set `draggable` on the nodes you want movable — this loads the DnD extension on demand.
Two cancelable events fire with `detail = { source, parent, next, region }` (`region`: `before` | `after` | `into`):
```js
// decide where dropping is allowed; preventDefault() forbids it (hides the marker)
treeElement.addEventListener('u2-tree-dragover', (e) => {
    if (notAllowed(e.detail)) e.preventDefault();
});
// commit on release; preventDefault() to move it yourself (e.g. server-first)
treeElement.addEventListener('u2-tree-drop', (e) => {
    e.preventDefault();
    save(e.detail).then(() => e.detail.parent.insertBefore(e.detail.source, e.detail.next));
});
```

### CSS

| Selector | Description |
|:----|:-----|
| u2-tree::part(row) | The row of the tree-item |
| u2-tree[aria-selected=true] | Item when selected |
| u2-tree:focus | Item has focus |

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@main/el/tree/tree.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@main/el/tree/tree.js" type=module async></script>
```

## Demos

[dnd-shadow.html](http://gcdn.li/u2ui/u2@main/el/tree/tests/dnd-shadow.html)  
[custom.html](http://gcdn.li/u2ui/u2@main/el/tree/tests/custom.html)  
[test.html](http://gcdn.li/u2ui/u2@main/el/tree/tests/test.html)  
[animated.html](http://gcdn.li/u2ui/u2@main/el/tree/tests/animated.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/el/tree/tests/minimal.html)  
[dnd.html](http://gcdn.li/u2ui/u2@main/el/tree/tests/dnd.html)  

## Todo

Ask me if you need it!
- Add support for multiple selection

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

