# [u1-focusgroup] - attribute
Focus movement by arrow keys

## Features

It allows you to focus elements with arrow keys inside a container.  

- Works inside shadow dom.
- Use focusgroup="wrap" to focus the first element when the last element is focused and vice versa.
- Use focusgroup="remember" to focus the last focused element when group is focused again.
- Text-Inputs only works for up and down arrow keys.


See also:  
https://open-ui.org/components/focusgroup.explainer/  
https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/Focusgroup/explainer.md

## Usage

```html
<div u1-focusgroup="wrap remember">
    <button>press left</button>
    <button>or right</button>
    <button>to focus the next button</button>
</div>
```

## Install

```html
<script src="../../../focusgroup.attr@x.x.x/focusgroup.min.js" type=module></script>
```

## Demos

[minimal.html](http://gcdn.li/u1ui/focusgroup.attr@main/tests/minimal.html)  
[test.html](http://gcdn.li/u1ui/focusgroup.attr@main/tests/test.html)  

## About

- MIT License, Copyright (c) 2022 <u1> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

