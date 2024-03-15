# PointerObserver.js
Observe mouse and touches

## Usage

```js
import {PointerObserver} from "../PointerObserver.js";
new PointerObserver(el).onmove = function(e){
    console.log(this.pos);
}
```

```html
<div id=el style="position:absolute;">
    StartObserving
</div>
```

## Demos

[minimal.html](http://gcdn.li/u2ui/u2@main/js/PointerObserver/tests/minimal.html)  
[test.html](http://gcdn.li/u2ui/u2@main/js/PointerObserver/tests/test.html)  

## Ussage

```js
import {PointerObserver} from "../PointerObserver.js";
new PointerObserver(el).onmove = function(e){
    console.log(this.pos);
}
```

```html
<div id=el style="position:absolute;">
    StartObserving
</div>
```

[doc](https://doc.deno.land/../../../PointerObserver.js@x/PointerObserver.js)

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

