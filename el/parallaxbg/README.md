# &lt;u2-parallaxbg&gt; - element
Scroll-driven parallax background-layer with dynamic container sizing for full content visibility

## Features

- fast!
- easy, declarative API
- works for dynamically added elements
- reduced background-container to the reachable area!
- css only fallback
- light weight

## Usage

```html
<div class=u2-parallaxbg-stage style="height:100%">
    <u2-parallaxbg>
        <img src="https://raw.githubusercontent.com/u2ui/u2/main/el/parallaxbg/tests/bg.jpg" alt="parallaxbg demo">
    </u2-parallaxbg>
</div>
```

```css
u2-parallaxbg {
    --parallaxbg-speed:.7
}
u2-parallaxbg div {
    display:grid;
    place-items: center;
}
```

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@main/el/parallaxbg/parallaxbg.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@main/el/parallaxbg/parallaxbg.js" type=module async></script>
```

## Demos

[test.html](http://gcdn.li/u2ui/u2@main/el/parallaxbg/tests/test.html)  
[visible.html](http://gcdn.li/u2ui/u2@main/el/parallaxbg/tests/visible.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/el/parallaxbg/tests/minimal.html)  
[demo.html](http://gcdn.li/u2ui/u2@main/el/parallaxbg/tests/demo.html)  

## Also interesting

Parallax scrolling Elements (not Backgrounds)
https://github.com/u2ui/parallax.attr

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

