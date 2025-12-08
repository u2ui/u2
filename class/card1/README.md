# .u2-card1 - class
card-class (beta)

- By default it has a box-shadow and a border-radius
- Children have paddings but not images
- Last child is sticky to the bottom
- If child has class "-body" it will grow to fill the space
- First and last child inherit the border-radius

We named it with the prefix "1" to prevent compatibility-issues if we like to change behavior

## Usage

```html
<article class=u2-card1>
    <img src="https://picsum.photos/800/400" width=800 height=400 style="padding:0" alt="image">
    <h1>Card 1</h1>
    <div class=-body>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Eos porro pariatur ducimus aut?
        Saepe vitae sequi doloribus perspiciatis quae?
    </div>
    <div style="background:#f8f8f8">
        <div class=u2-flex style="justify-content:flex-end; row-gap:.5rem">
            <button>button 1</button>
            <button>button 2</button>
        </div>
    </div>
</article>
```

```css
.u2-card1 {
}
```

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/class/card1/card1.min.css" rel=stylesheet>
```

## Demos

[test.html](http://gcdn.li/u2ui/u2@main/class/card1/tests/test.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/class/card1/tests/minimal.html)  
[play.html](http://gcdn.li/u2ui/u2@main/class/card1/tests/play.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

