# &lt;u1-typewriter&gt; - element
Simple typewriter element

## Ussage

```html
<u1-typewriter autoplay loop audio>
    <h2>Lorem ipsum</h2>
    <i>dolor</i> sit amet, <b>consectetur</b> adipiscing elit.
</u1-typewriter>
```

```css
u1-typewriter {
    --u1-typewriter-speed:100;
}
u1-typewriter h2 .-Caret {
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
- event "u1-typewriter-end"

### CSS

There no default CSS that will affect your styles.

```css
u1-typewriter .-Char { ... } /* the char */
u1-typewriter .-Active .-Char { ... } /* the active char */
u1-typewriter .-Caret { ... } /* the caret (It moves and is in the active char element) */
```

## Install

```html
<link href="../../../typewriter.el@x.x.x/typewriter.min.css" rel=stylesheet>
<script src="../../../typewriter.el@x.x.x/typewriter.min.js" type=module>
```

## Demos

[minimal.html](http://gcdn.li/u1ui/typewriter.el@main/tests/minimal.html)  
[test.html](http://gcdn.li/u1ui/typewriter.el@main/tests/test.html)  

## ussage

```html
<u1-typewriter autostart loop audio>
    Even <i>HTML</i> <u>content</u>
</u1-typewriter>
```

## About

- MIT License, Copyright (c) 2022 <u1> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

