# contextmenu.js
context menus, simple and highly customisable

## Features

- [x] Simple API
- [x] Add context menu to any element by CSS selector
- [x] Add keyboard shortcuts
- [x] Style not corrupted by the website do to the use of shadow dom
- [x] Add custom HTML to the menu
- [x] Submenus, Icons

## Usage

```js
import * as contextmenue from '../contextmenu.js';
window.u2_contextmenue = contextmenue;
```

```html
<button>context 1</button>
<button>context 2</button>
```

## API

### contextMenu.add(items)
Adds a context menu to the page. `items` is an array of menu items. Each item is an object with the following properties:

- `label`: The text of the menu item.
- `action`: A function to call when the menu item is clicked. The function is passed an `event` 
object.
    - `event.target`: The element that matched the selector.
    - `event.originalEvent`: The original event that triggered the menu.
    - `event.preventHide`: (boolean) If set to true, the contextmenue will not disappear after the action is called.
    - `this`: The menu item object.
- `onparse`: A function to call when the menu item prepaired for the current context. The function is passed an `event` object.
    - `event.target`: The element that matched the selector.
    - `event.originalEvent`: The original event that triggered the menu.
    - `this`: The menu item object.
- `shortcut`: A keyboard shortcut to trigger the menu item (whitout the open context menu). Example: `'Ctrl + I + O'`.
- `selector`: A CSS selector for the type of element the menu item should appear for. If no selector is provided, the menu item will appear everywhere.
- `icon`: SVG-string or name of a [material icon](https://fonts.google.com/icons?icon.style=Rounded).
- `html`: Custom HTML to display in the menu item. If this is provided, `action`, `label` and `icon` are ignored.
- `children`: An array of sub-menu items. Each sub-menu item has the same properties as a top-level menu item.


### contextMenu.addItem(label, action, options)
Adds a single menu item to the context menu. `item` is an object with the same properties as the items in `contextMenu.add()`.

- return value: The menu item object.

## Install

```js
import * as module from "https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/js/contextmenu/contextmenu.min.js"
```

## Demos

[test.html](http://gcdn.li/u2ui/u2@main/js/contextmenu/tests/test.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/js/contextmenu/tests/minimal.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

