# dialog.js
alert, prompt, confirm but async

## Features

- alert(), prompt() and confirm() are API-compatible but async.
- Uses native Dialog-Element (polyfill here: https://github.com/nuxodin/dialog-polyfill)
- Unstyled, style it yourself!
- Lightweight

## Usage

```html
<button onclick="u2_dialog.prompt('Just a test').then((res)=>this.innerHTML = 'value: '+res)">run</button>
```

```css
dialog:modal {
    box-shadow: 0 0 1rem #0008;
    border: 0;
    border-radius: .3rem;
}
```

## Install

```js
import * as module from "https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/js/dialog/dialog.min.js"
```

## Demos

[test.html](http://gcdn.li/u2ui/u2@main/js/dialog/tests/test.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/js/dialog/tests/minimal.html)  

## Pro-Tip

To get sure your lib works even if the script does not load, you can fallback to the native confirm/alert/prompt function.

```js
const {confirm} = await import('../fails/dialog.js').catch(e=>window);
await confirm('test');
```

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

