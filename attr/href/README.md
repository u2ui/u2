# [u2-href] - attribute
Makes any element act as a link. `u2-href="url"`

## Usage

```html
<div u2-href="http://schwups.ch" u2-href-target=_blank>
    Pseudo link
</div>
```

## Install

```html
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@main/attr/href/href.js" type=module async></script>
```

## Demos

[test.html](http://gcdn.li/u2ui/u2@main/attr/href/tests/test.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/attr/href/tests/minimal.html)  

## Description

This attribute allows you to turn any element into a link by simply adding the `u2-href` attribute to it.
`Ctrl + click` will open the link in a new tab.
Clicks on interactive elements inside the pseudo-link element prevent the link from being opened.
XSS attacks are prevented by disallowing the `javascript:` protocol.

## Note

Always offer an A-Tag with the same link. Screen readers do not recognize that this is a link!

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

