# Placer.js
Absolute place elements relative to others

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
import * as module from "https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/js/Placer/Placer.min.js"
```

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

