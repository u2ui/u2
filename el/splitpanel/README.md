# &lt;u2-splitpanel&gt; - element
A container that can be split horizontally or vertically. Parts are resizable by dragging the dividers.

## Usage

```html
<u2-splitpanel style="height:100%">
    <div>splitpanel</div>
    <u2-splitpanel vertical>
        <div>splitpanel</div>
        <div>splitpanel</div>
    </u2-splitpanel>
</u2-splitpanel>
```

```css
u2-splitpanel > :not(u2-splitpanel) {
    padding:1rem;
    background: #f8f8f8;
}
```

## API

### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `vertical` | boolean | Split vertically (top/bottom) instead of horizontally (left/right) |

### Parts

| Part | Description |
|------|-------------|
| `divider` | The draggable separator between panels. |

### CSS Custom Properties

| Property | Default | Description |
|----------|---------|-------------|
| `--size` | `0.3em` | Width/height of the divider |

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@main/el/splitpanel/splitpanel.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@main/el/splitpanel/splitpanel.js" type=module async></script>
```

## Demos

[tests.html](http://gcdn.li/u2ui/u2@main/el/splitpanel/tests/tests.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/el/splitpanel/tests/minimal.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

