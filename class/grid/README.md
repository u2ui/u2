# .u2-grid - class
Most wanted grid case

handy util-class to make a auto-column grid

- default gap (--u2-Gap)
- default item-width (--u2-Items-width)
- dynamic column-count
- respecting available-space if item-(min)-width > available

## Usage

```html
<div class=u2-grid style="--u2-Items-width:3rem">
    <div>Grid layout</div>
    <div>item2</div>
    <div>item3</div>
    <div>item4</div>
    <div>item5</div>
    <div>item6</div>
    <div>item7</div>
</div>
```

```css
.u2-grid {
    --u2-Gap:2rem;
    --u2-Col-gap:1rem;
    --u2-Items-width:8rem;
}
.u2-grid > * {
    border:1px solid black;
    padding:.5em;
}
```

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/class/grid/grid.min.css" rel=stylesheet>
```

## Demos

[minimal.html](http://gcdn.li/u2ui/u2@main/class/grid/tests/minimal.html)  
[test.html](http://gcdn.li/u2ui/u2@main/class/grid/tests/test.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

