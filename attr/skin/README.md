# [u2-skin] - attribute
Change the skin of a widget

- Recalculates css color-variables
- Sets the background and the text color

## Usage

```html
<div u2-skin="invert" style="padding:1rem">
    <h4>Inverted</h4>
    <button>button</button>
</div>
<div u2-skin="theme" style="padding:1rem">
    <h4>Theme-color as background</h4>
    <button>button</button>
</div>
```

```css
[u2-skin=pink] {
    --hsl-h: 330;
    --hsl-s: 90%;
    --hsl-l: 70%;        
}
```

## Install

```html
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/attr/skin/skin.js" type=module async></script>
```

## Demos

[test.html](http://gcdn.li/u2ui/u2@main/attr/skin/tests/test.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/attr/skin/tests/minimal.html)  

## Description

`[u2-skin=invert]` will invert the colors of the widget (switches among other things the background color and the text color).

`[u2-skin=theme]` will use the theme color (`--color`) as background color

Custom skins can easily be added.
Just change `--hsl-h` for example:
    
```css
[u2-skin=pink] {
    --hsl-h: 330;
}
```

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

