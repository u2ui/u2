# .u2-flex - class
Most wanted flexbox case

## Features

- Wrap by default
- Gaps by default (1rem)

## Usage

```html
<div class=u2-flex>
    <div>Flexbox layout</div>
    <div>Item 2</div>
    <div>Item 3</div>
    <div>Item 4</div>
    <div>Item 5</div>
</div>
```

```css
.u2-flex {
    --u2-Gap:1rem;
    --u2-Row-gap:2rem;
}
.u2-flex > * {
    border:1px solid;
    padding:2rem;
}
```

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/class/flex/flex.min.css" rel=stylesheet>
```

## Demos

[test.html](http://gcdn.li/u2ui/u2@main/class/flex/tests/test.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/class/flex/tests/minimal.html)  

## Note

Uses margin and negative margin needed because of safari.  
Top, bottom and right margins are not allowed / overwritten.
Add a wrapper element if you like to add margin to the container

```html
<div style="margin:2rem">
  <ul class=u2-flex>
    <li> first
    <li> second  
  </ul>
<div>
```

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

