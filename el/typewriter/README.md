# &lt;u2-typewriter&gt; - element
Simple typewriter element

## Usage

```html
<h4>
    <u2-typewriter autoplay loop>Typewriter</u2-typewriter>
</h4>
```

```css
u2-typewriter {
    --u2-typewriter-speed:100;
}
u2-typewriter h2 .-Caret {
    color:hotpink;
}
```

## API

### Attributes

- `autostart`: starts if in viewport, stops if out of viewport  
- `loop`: restarts if at end
- `audio`: plays audio="writer.mp3". If not attribute-value, a default audio is used.

### Javascript

- element.play()
- element.pause()
- element.reset()
- event "u2-typewriter-end"

### CSS

There no default CSS that will affect your styles.

```css
u2-typewriter .-Char { ... } /* the char */
u2-typewriter .-Active .-Char { ... } /* the active char */
u2-typewriter .-Caret { ... } /* the caret (It moves and is in the active char element) */
```

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/typewriter/typewriter.min.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/typewriter/typewriter.min.js" type=module async></script>
```

## Demos

[test.html](http://gcdn.li/u2ui/u2@main/el/typewriter/tests/test.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/el/typewriter/tests/minimal.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

