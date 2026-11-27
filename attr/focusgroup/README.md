# [u2-focusgroup] - attribute
Enables arrow-key navigation between focusable elements in a container.

## Features

It allows you to focus elements with arrow keys inside a container.  

- Works inside shadow dom.
- Use focusgroup="wrap" to focus the first element when the last element is focused and vice versa.
- The last focused element (by arrow key, click or script) is the group's only tab stop: coming back by tab focuses it. Use focusgroup="nomemory" to turn it off.
- Text-Inputs only works for up and down arrow keys.
- Arrow keys a field needs itself stay with it: textarea, select (up/down), number, range and date inputs. Leave them by tab.
- A nested group is a group of its own: an element belongs to its closest group only.


See also:  
https://open-ui.org/components/scoped-focusgroup.explainer/  
https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/Focusgroup/explainer.md

## Usage

```html
<div u2-focusgroup=wrap>
    <button>focusgroup</button>
    <button>focus and</button>
    <button>then use arrow-keys</button>
</div>
```

```css
[u2-focusgroup] [tabindex="0"] {
    background: lightblue;
}
```

## Install

```html
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@main/attr/focusgroup/focusgroup.js" type=module async></script>
```

## Demos

[test.html](http://gcdn.li/u2ui/u2@main/attr/focusgroup/tests/test.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/attr/focusgroup/tests/minimal.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

