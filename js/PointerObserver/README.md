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

## Install

```js
import * as module from "https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/js/PointerObserver/PointerObserver.min.js"
```

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

