# &lt;u2-tree1&gt; - element
Treeview component

## Features

- Keyboard navigation
- Focus on the next item that starts with the pressed key
- Expand/collapse events
- Lazy loading of children

## Usage

```html
<u2-tree1 aria-expanded=true>root
    <u2-tree1>Folder 1
        <u2-tree1>File 1.1</u2-tree1>
    </u2-tree1>
    <u2-tree1>Folder 3
        <u2-tree1>File 3.1</u2-tree1>
        <u2-tree1>File 3.2</u2-tree1>
    </u2-tree1>
</u2-tree1>
```

```css
u2-tree1::part(row):hover {
    background:#00000004;
}
u2-tree1[aria-selected=true]::part(row) {
    background:#00000008;
}
u2-tree1::part(row):focus {
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
```

### Attributes

#### aria-expanded
This will initialy expand the tree:
```<u2-tree1 aria-expanded="true">...</u2-tree1>```

This is either not expandable or like aria-expanded="false" if it has children.
`<u2-tree1></u2-tree1>

#### aria-live
`<u2-tree1 aria-live></u2-tree1>`
This indicates, that the node has to be loaded.  
The `u2-tree1-collapse` event will get a property `event.load(promise)` to load their children.

### Events

#### expand / collapse
```js
treeElement.addEventListener('u2-tree1-expand', (e) => {
    e.load && e.load(promise);
});
treeElement.addEventListener('u2-tree1-collapse', (e) => {...});
```

#### select
```js
treeElement.addEventListener('u2-tree1-select', (e) => { ... });
```

### CSS

| Selector | Description |
|:----|:-----|
| u2-tree1::part(row) | The row of the tree-item |
| u2-tree1[aria-selected=true] | Item when selected |
| u2-tree1:focus | Item has focus |

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/tree1/tree1.min.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/tree1/tree1.min.js" type=module></script>
```

## Demos

[custom.html](http://gcdn.li/u2ui/u2@main/el/tree1/tests/custom.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/el/tree1/tests/minimal.html)  
[test.html](http://gcdn.li/u2ui/u2@main/el/tree1/tests/test.html)  

## Todo

Ask me if you need it!
- Add support for multiple selection
- Drag and drop

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

