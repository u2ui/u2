# &lt;u2-breadcrumb&gt; - element
Breadcrumb element from a list of links

## Usage

```html
<u2-breadcrumb>
    <a href="../"><u2-ico icon="house" inline>home</u2-ico></a>
    <a href="./">Page</a>
    <a href="./kacheln.html">Subpage</a>
</u2-breadcrumb>
```

```css
u2-breadcrumb {
    --u2-breadcrumb-separator:'/';
    --u2-breadcrumb-separator-margin-inline:.4rem;
    &::part(separator) {
        font-weight:bold;
        font-size: .7rem;
    }
}
```

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/breadcrumb/breadcrumb.min.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/breadcrumb/breadcrumb.min.js" type=module async></script>
```

## Demos

[minimal.html](http://gcdn.li/u2ui/u2@main/el/breadcrumb/tests/minimal.html)  
[test.html](http://gcdn.li/u2ui/u2@main/el/breadcrumb/tests/test.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

