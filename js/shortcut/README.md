# shortcut.js
Easy keyboard shortcuts

## Usage

```js
import {listen} from '../shortcut.js';

listen('a+b+c', () => {
    alert('a+b+c pressed');
}, {target: testEl});
```

```html
<textarea id=testEl>write "abc" while holding the keys</textarea>
```

## Install

```js
import * as module from "https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/js/shortcut/shortcut.min.js"
```

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

