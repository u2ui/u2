# &lt;u1-tooltip&gt; - element
Tooltips

## Features

- [x] hover or focus
- [x] if it has `tabindex="-1"`, it will not disappear when hovered
- [x] position: top, right, bottom, left
- [x] will stay inside the viewport
- [x] event "u1-tooltip-show" when shown

## Usage

```html
<button>
    hover or focus
    <u1-tooltip>now you see me</u1-tooltip>
</button>
```

```css
u1-tooltip {
    pointer-events:auto;
    font-size:max(12px, .7rem);
    --line-height: 1.4em;
    background:#666;
    color:#fff;
    border-radius:.2rem;
}
```

## Install

```html
<link href="../../../tooltip.el@x.x.x/tooltip.min.css" rel=stylesheet>
<script src="../../../tooltip.el@x.x.x/tooltip.min.js" type=module></script>
```

## Demos

[minimal.html](http://gcdn.li/u1ui/tooltip.el@main/tests/minimal.html)  
[test.html](http://gcdn.li/u1ui/tooltip.el@main/tests/test.html)  

## Todo

- popover when supported by browsers.

## About

- MIT License, Copyright (c) 2022 <u1> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

