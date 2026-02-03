# &lt;u2-accordion&gt; - element
Turns HTML structures with headings into an accordion, using the content between headings as each panel’s content.

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
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@main/el/accordion/accordion.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@main/el/accordion/accordion.js" type=module async></script>
```

## Demos

[test.html](http://gcdn.li/u2ui/u2@main/el/accordion/tests/test.html)  
[styled.html](http://gcdn.li/u2ui/u2@main/el/accordion/tests/styled.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/el/accordion/tests/minimal.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

