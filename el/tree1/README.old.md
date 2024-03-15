# tree.el
treeview component (beta)

## Usage
```html
<u2-tree1>
    <u2-tree1>
        Folder 1
        <u2-tree1>
            <span slot=icon>📄</span>
            File 1.1
        </u2-tree1>
    </u2-tree1>
    <u2-tree1>
        <span slot=icon>📄</span>
        File 3
    </u2-tree1>
</u2-tree1>
```	

## Settings

### aria-expanded
This will initialy expand the tree:
```<u2-tree1 aria-expanded="true">...</u2-tree1>```

This is either not expandable or like aria-expanded="false" if it has children.
`<u2-tree1></u2-tree1>

### aria-live
`<u2-tree1 aria-live></u2-tree1>`
This indicates, that the node has to be loaded.  
The `u2-tree1-collapse` event will get a property `event.load(promise)` to load their children.


## Events

### expand / collapse
```js
treeElement.addEventListener('u2-tree1-expand', (e) => {
    e.load && e.load(promise);
});
treeElement.addEventListener('u2-tree1-collapse', (e) => {...});
```

### select
```js
treeElement.addEventListener('u2-tree1-select', (e) => { ... });
```

## API
```js
el.select();
el.toggleExpand(true/false);
```



## Demos
https://raw.githack.com/u2ui/tree1.el/main/tests/custom.html  
https://raw.githack.com/u2ui/tree1.el/main/tests/minimal.html  
https://raw.githack.com/u2ui/tree1.el/main/tests/test.html  

