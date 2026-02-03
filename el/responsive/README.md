# &lt;u2-rating&gt; - element
A Container, where you can define strategies, that are applied through CSS states. `<u2-responsive strategies="hideOptional">`

## Usage

```html
<u2-responsive strategies="noSmall">
    This is great<small>- this optional</small>
</u2-responsive>
```

```css
u2-responsive {
    white-space:nowrap;
    resize:both;
    padding:1rem;

    &:state(noSmall) {
        small {
            display:none;
        }
    }
}
```

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/responsive/responsive.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/responsive/responsive.js" type=module async></script>
```

## Demos

[test.html](http://gcdn.li/u2ui/u2@main/el/responsive/tests/test.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/el/responsive/tests/minimal.html)  
[grid.html](http://gcdn.li/u2ui/u2@main/el/responsive/tests/grid.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

