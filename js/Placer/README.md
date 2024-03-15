# Placer.js
Absolute place elements relative to others

## Usage

```js
let placer = new Placer(moverEl, {
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

[doc](https://doc.deno.land/../../../Placer.js@x/Placer.js)

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
import * as module from "../../../Placer.js@x.x.x/Placer.min.js"
```

## Demos

[minimal.html](http://gcdn.li/u1ui/Placer.js@main/tests/minimal.html)  
[test.html](http://gcdn.li/u1ui/Placer.js@main/tests/test.html)  

## About

- MIT License, Copyright (c) 2022 <u1> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

