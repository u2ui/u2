# .u1-grid - class
Most wanted grid case

handy util-class to make a auto-column grid

- default gap (--u1-Gap)
- default item-width (--u1-Items-width)
- dynamic column-count
- respecting available-space if item-(min)-width > available

## Usage

```html
<div class=u1-grid>
    <div>item1<br>heigter</div>
    <div>item2</div>
    <div>item3</div>
    <div>item4</div>
    <div>item5</div>
    <div>item6</div>
    <div>item7</div>
</div>
```

```css
.u1-grid {
    --u1-Gap:2rem;
    --u1-Col-gap:1rem;
    --u1-Items-width:8rem;
}
.u1-grid > * {
    border:1px solid black;
    padding:.5em;
}
```

## Install

```html
<link href="../../../grid.class@x.x.x/grid.min.css" rel=stylesheet>
```

## Demos

[minimal.html](http://gcdn.li/u1ui/grid.class@main/tests/minimal.html)  
[test.html](http://gcdn.li/u1ui/grid.class@main/tests/test.html)  

## About

- MIT License, Copyright (c) 2022 <u1> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

