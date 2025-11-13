# [u2-draghandle] - attribute
Defines a handle element to drag a draggable item.

## Usage

```html
<article draggable="false">
    <u2-ico u2-draghandle>
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2s.9-2 2-2s2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2s-2 .9-2 2s.9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2z"></path></svg>
    </u2-ico>
    <p>
        This is draggable, by the drag handle.
    </p>
</article>
```

```css
[draggable="false"] {
    border: .5rem solid #eee;
}
[draggable="true"] {
    border: .5rem solid var(--color, #4caf50);
}
```

## Install

```html
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/attr/draghandle/draghandle.min.js" type=module async></script>
```

## Demos

[minimal.html](http://gcdn.li/u2ui/u2@main/attr/draghandle/tests/minimal.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

