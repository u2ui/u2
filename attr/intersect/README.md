# [u1-intersect] - attribute
declarativ intersection-observer

## Ussage

```html
<div u1-intersect></div>
<div u1-intersect></div>
<div u1-intersect></div>
<div u1-intersect></div>
<div u1-intersect></div>
<div u1-intersect></div>
<div u1-intersect></div>
<div u1-intersect></div>
<div u1-intersect></div>
<div u1-intersect></div>
<div u1-intersect></div>
```

```css
[u1-intersect] {
    --u1-intersect-margin:-10%;
    --u1-intersect-threshold:1;
    background:#fbb;
}
[u1-intersect].u1-intersected { background:#bfb; }
[u1-intersect]::after {
    display:block;
    content:'below';
}
[u1-intersect].u1-intersected::after { content:'intersected'; }
[u1-intersect~="above"]::after { content:'above' }
```

## Install

```html
<script src="../../../intersect.attr@x.x.x/intersect.min.js" type=module>
```

## Demos

[minimal.html](http://gcdn.li/u1ui/intersect.attr@main/tests/minimal.html)  
[test.html](http://gcdn.li/u1ui/intersect.attr@main/tests/test.html)  

## About

- MIT License, Copyright (c) 2022 <u1> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

