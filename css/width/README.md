# .u1-width - class
The main width of your layout

This class has a max-width of `var(--width)`.

## Features

- Horizontal centered
- Default paddings left and right of `1rem`
- Padding adds spacing of save area `env(safe-area-inset-left)`
- Nested elements using `.u1-width` have no padding.
- Box-sizing is explicit **content-box** to define the width without its padding.

## Ussage

```html
<div class=u1-width>
    content
    <div class=u1-width>nested (no padding)</div>
</div>
```

```css
html {
    --width:20rem;
}
.u1-width {
    outline:1px solid;
    background-color:yellow;
}
```

## Install

```html
<link href="../../../width.class@x.x.x/width.min.css" rel=stylesheet>
```

## Demos

[minimal.html](http://gcdn.li/u1ui/width.class@main/tests/minimal.html)  
[test.html](http://gcdn.li/u1ui/width.class@main/tests/test.html)  

## About

- MIT License, Copyright (c) 2022 <u1> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

