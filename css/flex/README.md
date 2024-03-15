# .u1-flex - class
Most wanted flexbox case

## Features

- Wrap by default
- Gaps by default (1rem)

## Usage

```html
<div class=u1-flex>
    <div>Item 1</div>
    <div>Item 2</div>
    <div>Item 3</div>
    <div>Item 4</div>
</div>
```

```css
.u1-flex {
    --u1-Gap:1rem;
    --u1-Row-gap:2rem;
}
.u1-flex > * {
    border:1px solid;
    padding:2rem;
}
```

## Install

```html
<link href="../../../flex.class@x.x.x/flex.min.css" rel=stylesheet>
```

## Demos

[minimal.html](http://gcdn.li/u1ui/flex.class@main/tests/minimal.html)  
[test.html](http://gcdn.li/u1ui/flex.class@main/tests/test.html)  

## Note

Uses margin and negative margin needed because of safari.  
Top, bottom and right margins are not allowed / overwritten.
Add a wrapper element if you like to add margin to the container

```html
<div style="margin:2rem">
  <ul class=u1-flex>
    <li> first
    <li> second  
  </u1>
<div>
```

## About

- MIT License, Copyright (c) 2022 <u1> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

