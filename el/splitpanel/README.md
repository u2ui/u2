# &lt;u2-splitpanel&gt; - element
A splitpanel is a container that can be split horizontally or vertically. It is a simple container that can be used to split the screen into two or more parts.

## Usage

```html
<u2-splitpanel style="height:10rem">
    <div>splitpanel</div>
    <u2-splitpanel vertical>
        <div>splitpanel</div>
        <div>splitpanel</div>
    </u2-splitpanel>
</u2-splitpanel>
```

```css
u2-splitpanel > :not(u2-splitpanel) {
    padding:1rem;
    background: #f8f8f8;
}
```

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/splitpanel/splitpanel.min.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/splitpanel/splitpanel.min.js" type=module async></script>
```

## Demos

[minimal.html](http://gcdn.li/u2ui/u2@main/el/splitpanel/tests/minimal.html)  
[tests.html](http://gcdn.li/u2ui/u2@main/el/splitpanel/tests/tests.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

