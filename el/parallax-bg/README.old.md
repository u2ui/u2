# parallax-bg
Highly fantastic Parallax backgrounds

## Features
- fast!
- easy, declarative API
- works for dynamic added elements
- reduced background-container to the reachable area!
- css only fallback
- light weight

## Demos
https://raw.githack.com/u2ui/parallax-bg.el/main/tests/demo.html  
https://raw.githack.com/u2ui/parallax-bg.el/main/tests/minimal.html  
https://raw.githack.com/u2ui/parallax-bg.el/main/tests/test.html  
https://raw.githack.com/u2ui/parallax-bg.el/main/tests/visible.html  

## Ussage

Create a element "u2-parallax-bg". It will be the parallax background of the closest element with the class `u2-parallax-bg-stage` or the closest positioned element (offsetParent).

```js
import '../../../parallax-bg.el@x.x.x/parallax-bg.min.js';
```

```html
<link rel=stylesheet href="../../../parallax-bg.el@x.x.x/parallax-bg.min.css">

<div class=u2-parallax-bg-stage>

    <h1> Content </h1>

    <u2-parallax-bg style="--parallax-bg-speed:.7">
        <img src="myCat.jpg" style="position:absolute; inset:0">
    </u2-parallax-bg>
    
</div>
```

The stylesheet and the class `parallax-bg-stage` on the parent element are optional, but are highly recommended to add the styles before the script is loaded or when Javascript is disabled or the browser is not supported (IE11).


# Also interesting
Parallax scrolling Elements (not Backgrounds)
https://github.com/u2ui/parallax.attr
