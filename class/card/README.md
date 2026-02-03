# .u2-card - class
All children except img/video/hr have padding. Child with class="-body" fills space, last element is pushed down. 

- By default it has a box-shadow and a border-radius
- Children have paddings but not images
- Last child is sticky to the bottom
- If a child has class "-body", it will grow to fill the space.
- First and last child inherit the border-radius

## Usage

```html
<article class=u2-card>
    <img src="https://picsum.photos/800/200" width=800 height=200 alt="image">
    <div class=-body>
        <h4>Card</h4>
        Lorem ipsum dolor sit amet consectetur adipisicing elit.
    </div>
    <div>
        <button>button 1</button>
        <button>button 2</button>
    </div>
</article>
```

```css
.u2-card {
    --gap:.7rem;
    max-width:30rem;
    border-radius: 1.2rem;
}
```

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@main/class/card/card.css" rel=stylesheet>
```

## Demos

[table.html](http://gcdn.li/u2ui/u2@main/class/card/tests/table.html)  
[test.html](http://gcdn.li/u2ui/u2@main/class/card/tests/test.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/class/card/tests/minimal.html)  
[play.html](http://gcdn.li/u2ui/u2@main/class/card/tests/play.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

