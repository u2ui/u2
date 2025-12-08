# &lt;u2-copy&gt; - element
Mirrors an element’s content. `<u2-copy for="id" sync></u2-copy>`

## Usage

```html
original:
<span id=source contenteditable>Hello <b>World</b></span>
<br>
copy:
<u2-copy for=source sync></u2-copy>
```

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/copy/copy.min.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/copy/copy.min.js" type=module async></script>
```

## Demos

[test.html](http://gcdn.li/u2ui/u2@main/el/copy/tests/test.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/el/copy/tests/minimal.html)  

## Attributes

Attribute        | Description                  
---              | ---                          
`for`            | ID of the original-element, has to be present to be useful
`sync`           | bool, if present changes are reflected immediately

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

