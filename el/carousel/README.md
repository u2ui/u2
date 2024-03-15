# &lt;u1-carousel&gt; - element
Simple carousel component

## Features

- css only fallback
- no unnecessary css, style it yourself!
- keyboard navigation
- play / stop
- stops playing if focus is inside
- slide on focus (eg. inputs inside)
- 3 Modes (slide, scroll, fade)
- light-weight

## Usage

```html
<u1-carousel autoplay controls>
    <div>Item 1</div>
    <div>Item 2</div>
</u1-carousel>
```

```css
u1-carousel {
    background:var(--color-light);
}
u1-carousel > :not([slot]) {
    padding:3rem;
    text-align:center;
}
```

## Install

```html
<link href="../../../carousel.el@x.x.x/carousel.min.css" rel=stylesheet>
<script src="../../../carousel.el@x.x.x/carousel.min.js" type=module></script>
```

## Demos

[experiments.html](http://gcdn.li/u1ui/carousel.el@main/tests/experiments.html)  
[minimal.html](http://gcdn.li/u1ui/carousel.el@main/tests/minimal.html)  
[nested.html](http://gcdn.li/u1ui/carousel.el@main/tests/nested.html)  
[test.html](http://gcdn.li/u1ui/carousel.el@main/tests/test.html)  

## About

- MIT License, Copyright (c) 2022 <u1> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

