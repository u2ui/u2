# [u1-skin] - attribute
Change colors of a widget (beta)

## Usage

```html
<h3>Normal H3</h3>
<div u1-skin="invert" style="padding:1rem">
    <h3>Inverted</h3>
    <button>button</button>
</div>
<br>
<div u1-skin="theme" style="padding:1rem">
    <h3>Theme-color as background</h3>
    <button>button</button>
</div>
```

## Install

```html
<script src="../../../skin.attr@x.x.x/skin.min.js" type=module></script>
```

## Demos

[minimal.html](http://gcdn.li/u1ui/skin.attr@main/tests/minimal.html)  
[test.html](http://gcdn.li/u1ui/skin.attr@main/tests/test.html)  

## Description

[u1-skin=invert] will invert the colors of the widget (switches among other things the background color and the text color)
css variables cannot be switched to the same element, so nested inversions will not work.

[u1-skin=theme] will use the theme color as background color

## Note

This is a beta version. 
I am wondering if I should implement "invert" and "theme-background" with separate attributes or classes.
And also other considerations...

## About

- MIT License, Copyright (c) 2022 <u1> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

