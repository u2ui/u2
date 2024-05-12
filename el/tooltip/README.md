# &lt;u2-tooltip&gt; - element
Tooltips

## Features

- [x] hover or focus
- [x] if it has `tabindex="-1"`, it will not disappear when hovered
- [x] position: top, right, bottom, left
- [x] will stay inside the viewport
- [x] event "u2-tooltip-show" when shown

## Usage

```html
<button>
    Tooltip
    <u2-tooltip>now you see me</u2-tooltip>
</button>
```

```css
u2-tooltip {
    pointer-events:auto;
    background:#a09;
}
```

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/tooltip/tooltip.min.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/tooltip/tooltip.min.js" type=module async></script>
```

## Demos

[minimal.html](http://gcdn.li/u2ui/u2@main/el/tooltip/tests/minimal.html)  
[test.html](http://gcdn.li/u2ui/u2@main/el/tooltip/tests/test.html)  

## Todo

- popover when supported by browsers.

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

