# [u2-selectable] - attribute
Makes a container with selectable items. <div u2-selectable=".selector">

## Usage

```html
<div u2-selectable=".task" aria-multiselectable="true">
    <div class="task">task 1</div>
    <div class="task">task 2</div>
    <div class="task">task 3</div>
</div>
<style>
    .task {
        padding: 1rem;
        border: 1px solid #ccc;
        margin: 1rem 0;
    }
    .task[aria-selected="true"] {
        background-color: var(--color);
        color: white;
    }
</style>
```

```css
.task {
    padding: 1rem;
    border: 1px solid #ccc;
    margin: 1rem 0;
}
.task[aria-selected="true"] {
    background-color: var(--color);
    color: white;
}
```

## Install

```html
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/attr/selectable/selectable.min.js" type=module async></script>
```

## Demos

[test.html](http://gcdn.li/u2ui/u2@main/attr/selectable/tests/test.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/attr/selectable/tests/minimal.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

