# &lt;u2-accordion&gt; - element
rendering accordion

## Features

- Minimal
- Use markup as usual
- Navigateable through keys
- Content is searchable (using `hidden=until-found`)

## Usage

```html
<u2-accordion single>
    <h4>Accordion</h4>
    <article>
        Content 1, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna.
    </article>
    <h4>Component</h4>
    <article>
        Content 2, lorem ipsum dolor sit amet, consectetur adipisicing elit sed do eiusmod tempor incididunt.
    </article>
</u2-accordion>
```

```css
u2-accordion {
    &::part(trigger) {
        background-color: #f0f0f0;
    }
    &::part(title) {
        font-size: 1.2em;
    }
    &::part(icon) {
        color: #f00;
    }
    &::part(content) {
        background-color: #f8f8f8;
    }
}
```

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/accordion/accordion.min.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/accordion/accordion.min.js" type=module async></script>
```

## Demos

[minimal.html](http://gcdn.li/u2ui/u2@main/el/accordion/tests/minimal.html)  
[test.html](http://gcdn.li/u2ui/u2@main/el/accordion/tests/test.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

