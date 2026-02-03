# &lt;u2-masonry&gt; - element
Masonry layout with CSS grid fallback

- default gap
- grid fallback
- grid masonry fallback if supported
- reorder is animatable

## Usage

```html
<u2-masonry style="max-width:19rem; margin:auto; gap:.5rem; --u2-Items-width:4rem;">
    <div contenteditable>Masonry layout</div>
    <div contenteditable>item2</div>
    <div contenteditable>item3</div>
    <div contenteditable>item4</div>
    <div contenteditable>item5</div>
    <div contenteditable>item6</div>
    <div contenteditable>item7</div>
</u2-masonry>
```

```css
u2-masonry {
    gap:1rem;
    column-gap:2rem;
    --u2-Items-width:8rem;
}
u2-masonry > * {
    border:1px solid black;
    padding:.5em;
}
```

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@main/el/masonry/masonry.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@main/el/masonry/masonry.js" type=module async></script>
```

## Demos

[test.html](http://gcdn.li/u2ui/u2@main/el/masonry/tests/test.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/el/masonry/tests/minimal.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

