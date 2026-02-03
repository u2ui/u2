# &lt;u2-counter&gt; - element
Animated Number Counter

## Features

- The counter starts when the element comes into the viewport
- Attribute `once` to count only once
- It counts using a easeOutCubic timing function
- Attribute `value="12.30"` defines target value 
- ...and decimal places to be displayed!
- Optional attribute `from="-10"` defines start value. Without it, it will start at 0
- You can set the property `element.value` to start counting.
- Counter elements get a css variable `--js-final-inline-size` which is set to their `min-width` by default.
- Use the inner HTML as fallback.

## Usage

```html
Counter:
<u2-counter from=-11.0 value=200.0>
    200.0
</u2-counter>
```

```css
u2-counter {
    font-size:3rem;
    text-align:right;
    padding:.3em;
    background:#eee;
}
```

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@main/el/counter/counter.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@main/el/counter/counter.js" type=module async></script>
```

## Demos

[test.html](http://gcdn.li/u2ui/u2@main/el/counter/tests/test.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/el/counter/tests/minimal.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

