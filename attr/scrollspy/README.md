# [u2-scrollspy] - attribute
Make a navigation that changes the `active` class based on the scroll position.

## Usage

```html
<nav u2-scrollspy style="position:absolute; top:0; display:grid">
    <a href="#article1">article 1</a> 
    <a href="#article2">article 2</a> 
    <a href="#article3">article 3</a> 
</nav>
```

```css
a.active {
    color:var(--color, pink);
}
section {
    height:5rem;
    border:1px solid;
}
section {
    min-height:5rem;
    border:1px solid;
}
```

## Install

```html
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/attr/scrollspy/scrollspy.min.js" type=module async></script>
```

## Demos

[minimal.html](http://gcdn.li/u2ui/u2@main/attr/scrollspy/tests/minimal.html)  
[test.html](http://gcdn.li/u2ui/u2@main/attr/scrollspy/tests/test.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

