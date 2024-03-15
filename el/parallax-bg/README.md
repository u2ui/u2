# &lt;u2-parallax-bg&gt; - element
Parallax backgrounds

## Features

- fast!
- easy, declarative API
- works for dynamic added elements
- reduced background-container to the reachable area!
- css only fallback
- light weight

## Usage

```html
<div class=u2-parallax-bg-stage style="height:10rem">
    <u2-parallax-bg>
        <div style="background: linear-gradient(#ffa, #aff)">TEST</div>
        <div style="background: linear-gradient(#afa, #aaa)">TEST</div>
    </u2-parallax-bg>
</div>
```

```css
u2-parallax-bg {
    --parallax-bg-speed:.7
}
u2-parallax-bg div {
    display:grid;
    place-items: center;
}
```

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/parallax-bg/parallax-bg.min.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/parallax-bg/parallax-bg.min.js" type=module></script>
```

## Demos

[demo.html](http://gcdn.li/u2ui/u2@main/el/parallax-bg/tests/demo.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/el/parallax-bg/tests/minimal.html)  
[test.html](http://gcdn.li/u2ui/u2@main/el/parallax-bg/tests/test.html)  
[visible.html](http://gcdn.li/u2ui/u2@main/el/parallax-bg/tests/visible.html)  

## Ussage

```html
<div class=u2-parallax-bg-stage style="height:10rem">
    <u2-parallax-bg>
        <div style="background: linear-gradient(#ffa, #aff)">TEST</div>
        <div style="background: linear-gradient(#afa, #aaa)">TEST</div>
    </u2-parallax-bg>
</div>
```

```css
u2-parallax-bg {
    --parallax-bg-speed:.7
}
u2-parallax-bg div {
    display:grid;
    place-items: center;
}
```

## Also interesting

Parallax scrolling Elements (not Backgrounds)
https://github.com/u2ui/parallax.attr

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

