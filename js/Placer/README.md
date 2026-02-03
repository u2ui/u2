# Placer.js
Positions elements relative to a target, auto-adjusting on move or resize.

## Usage

```js
let placer = new u2_Placer(moverEl, {
    x:'after',
    y:'after',
    margin: 0,
    stayInWindow: true,
    switchSide: true,
});

placer.toElement(target);
```

```html
<div id=moverEl style="position:absolute">move to</div>
<button id=target>
    move to me
</button>
```

## API

### Placer

```js
const options = {
    x: 'after', // 'after', 'before', 'append', 'prepend', 'center'
    y: 'after', // 'after', 'before', 'append', 'prepend', 'center'
    margin: 0, // distance to target in px
    stayInWindow: true, // boolean, force moverEl to stay in viewport
    switchSide: true, // boolean, switch x and y if target is out of window
}
let placer = new Placer(moverEl, options);

placer.toElement(element); // place moverEl relative to element
placer.toClientRect(rect); // place moverEl relative to rect (eg. range.getBoundingClientRect())
placer.followElement(element); // place moverEl relative to element and follow it

```

## Install

```js
import * as module from "https://cdn.jsdelivr.net/gh/u2ui/u2@main/js/Placer/Placer.js"
```

## Demos

[test.html](http://gcdn.li/u2ui/u2@main/js/Placer/tests/test.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/js/Placer/tests/minimal.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

