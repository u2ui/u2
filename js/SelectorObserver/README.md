# SelectorObserver.js
Watches elements matching a selector

## Usage

```js
import {SelectorObserver} from '../SelectorObserver.js';
new SelectorObserver({
    on: el => el.innerHTML = 'found!' ,
    off: el => el.innerHTML = 'lost!' ,
}).observe('#SOTargets div');
```

```html
<div class=container id=SOTargets contenteditable>
    Find all bold divs (press enter)
</div>
```

## Install

```js
import * as module from "https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/js/SelectorObserver/SelectorObserver.min.js"
```

## Demos

[minimal.html](http://gcdn.li/u2ui/u2@main/js/SelectorObserver/tests/minimal.html)  
[test.html](http://gcdn.li/u2ui/u2@main/js/SelectorObserver/tests/test.html)  
[tests.html](http://gcdn.li/u2ui/u2@main/js/SelectorObserver/tests/tests.html)  

## Options - "checkAnimation" (beta)

```javascript
o.observer('.el', {checkAnimation: true});
    
```

Like this, you can event watch selectors like `.el:has(img:hover) > tr:nth-child(2)`  
Trigger only `on` and not `off` right now.
-->

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

