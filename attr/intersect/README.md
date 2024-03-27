# [u2-intersect] - attribute
declarativ intersection-observer

## Usage

```html
<div u2-intersect></div>
<div u2-intersect></div>
<div u2-intersect></div>
<div u2-intersect></div>
<div u2-intersect></div>
<div u2-intersect></div>
<div u2-intersect></div>
<div u2-intersect></div>
<div u2-intersect></div>
<div u2-intersect></div>
<div u2-intersect></div>
```

```css
[u2-intersect] {
    --u2-intersect-margin:-10%;
    --u2-intersect-threshold:1;
    background:#fbb;
}
[u2-intersect].u2-intersected { background:#bfb; }
[u2-intersect]::after {
    display:block;
    content:'below';
}
[u2-intersect].u2-intersected::after { content:'intersected'; }
[u2-intersect~="above"]::after { content:'above' }
```

## Install

```html
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/attr/intersect/intersect.min.js" type=module></script>
```

## Demos

[minimal.html](http://gcdn.li/u2ui/u2@main/attr/intersect/tests/minimal.html)  
[test.html](http://gcdn.li/u2ui/u2@main/attr/intersect/tests/test.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

