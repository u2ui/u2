# .u2-width - class
The main width of your layout

This class has a max-width of `var(--width)`.

## Features

- Horizontal centered
- Default paddings left and right of `1rem`
- Padding adds spacing of save area `env(safe-area-inset-left)`
- Nested elements using `.u2-width` have no padding.
- Box-sizing is explicit **content-box** to define the width without its padding.

## Usage

```html
<div class=u2-width>
    content
    <div class=u2-width>nested (no padding)</div>
</div>
```

```css
html {
    --width:20rem;
}
.u2-width {
    outline:1px solid;
    background-color:yellow;
}
```

## Demos

[minimal.html](http://gcdn.li/u2ui/u2@main/css/width/tests/minimal.html)  
[test.html](http://gcdn.li/u2ui/u2@main/css/width/tests/test.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

