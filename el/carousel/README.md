# &lt;u2-carousel&gt; - element
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
<u2-carousel autoplay controls>
    <div>Carousel<br>Demo<br>Item 1</div>
    <div>Item 2</div>
</u2-carousel>
```

```css
u2-carousel {
    background:var(--color-light);
}
u2-carousel > :not([slot]) {
    padding:3rem;
    text-align:center;
}
```

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/carousel/carousel.min.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/carousel/carousel.min.js" type=module async></script>
```

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

