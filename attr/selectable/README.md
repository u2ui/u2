# [u2-selectable] - attribute
Makes a container with selectable items. <div u2-selectable=".selector">

## Usage

```html
<div u2-selectable aria-multiselectable=true>
    <div>item 1</div>
    <div>item 2</div>
    <div>item 3</div>
</div>
```

```css
[u2-selectable] > * {
    padding: .5rem;
    margin-block: 1rem;
    background-color: var(--color-lighter);
}
[u2-selectable] > [aria-selected="true"] {
    background-color: var(--color);
    color: white;
}
```

## Install

```html
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/attr/selectable/selectable.js" type=module async></script>
```

## Demos

[test.html](http://gcdn.li/u2ui/u2@main/attr/selectable/tests/test.html)  
[SelectionManager.html](http://gcdn.li/u2ui/u2@main/attr/selectable/tests/SelectionManager.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/attr/selectable/tests/minimal.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

