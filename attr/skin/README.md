# [u2-skin] - attribute
Change the skin of a widget (beta)

- Recalculates css color-variables
- Sets the background and the text color

## Description

`[u2-skin=invert]` will invert the colors of the widget (switches among other things the background color and the text color).

`[u2-skin=theme]` will use the theme color (`--color`) as background color

Custom skins can easily be added.
Just change `--hsl-h` for example:
    
```css
[skin=pink] {
    --hsl-h: 330;
}
```

## Usage

```html
<h3>Normal H3</h3>
<div u2-skin="invert" style="padding:1rem">
    <h3>Inverted</h3>
    <button>button</button>
</div>
<br>
<div u2-skin="theme" style="padding:1rem">
    <h3>Theme-color as background</h3>
    <button>button</button>
</div>
```

## Install

```html
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/attr/skin/skin.min.js" type=module async></script>
```

## Demos

[minimal.html](http://gcdn.li/u2ui/u2@main/attr/skin/tests/minimal.html)  
[test.html](http://gcdn.li/u2ui/u2@main/attr/skin/tests/test.html)  


## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

