# [u2-href] - attribute
Every element can be a link

## Usage

```html
<div u2-href="http://schwups.ch" u2-href-target=_blank>
    Pseudo link
</div>
```

## Install

```html
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/attr/href/href.min.js" type=module></script>
```

## Demos

[minimal.html](http://gcdn.li/u2ui/u2@main/attr/href/tests/minimal.html)  
[test.html](http://gcdn.li/u2ui/u2@main/attr/href/tests/test.html)  

## Ussage

```html
<div u2-href="http://schwups.ch" u2-href-target=_blank>
    Pseudo link
</div>
```

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

