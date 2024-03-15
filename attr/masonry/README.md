# [u1-masonry] - attribute
null

handy util-attribute to make a masonry layout

- default gap (from classless.css variables)
- grid fallback
- grid masonry fallback if supported

## Usage

```html
<div u1-masonry>
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
[u1-masonry] {
    --u1-Gap:2rem;
    --u1-Col-gap:1rem;
    --u1-Items-width:8rem;
}
[u1-masonry] > * {
    border:1px solid black;
    padding:.5em;
}
```

## Install

```html
<script src="../../../masonry.attr@x.x.x/masonry.min.js" type=module></script>
```

## Demos

[minimal.html](http://gcdn.li/u1ui/masonry.attr@main/tests/minimal.html)  
[test.html](http://gcdn.li/u1ui/masonry.attr@main/tests/test.html)  

## About

- MIT License, Copyright (c) 2022 <u1> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

