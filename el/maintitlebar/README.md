# &lt;u2-maintitlebar&gt; - element
Replaces the native browser toolbar in Desktop PWAs.

## Usage

```html
<u2-maintitlebar>
    <div class=-title>&lt;u2-maintitlebar&gt; Demo</div>
    <label>Search <input type=search></label>
    <button u2-behavior=share style="border:0;background:none;border-radius:0">
        ➤
        <u2-tooltip>Share</u2-tooltip>
    </button>
</u2-maintitlebar>
This element replaces the Native Browser Toolbar if installed as Desktop-PWA.
```

```css
u2-maintitlebar[hidden] { /* hidden is set by the element itself if not installed as Desktop-PWA */
    display:flex; /* show it anyway */
}
```

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/maintitlebar/maintitlebar.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/maintitlebar/maintitlebar.js" type=module async></script>
```

## Demos

[minimal.html](http://gcdn.li/u2ui/u2@main/el/maintitlebar/tests/minimal.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

