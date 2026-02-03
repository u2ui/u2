# &lt;u2-code&gt; - element
Code-blocks. <u2-code editable trim><style|textarea|script>...

## Usage

```js
// Code-Element
if (de) {
    alert('Hallo, Welt!');
} else {
    alert('Hello, World!');
}
```

```html
<u2-code trim editable>
    <script>
        // Code-Element
        if (de) {
            alert('Hallo, Welt!');
        } else {
            alert('Hello, World!');
        }
    </script>
</u2-code>
```

```css
u2-code {
    font-size:15px;
    max-block-size:11rem;
}
```

## API

Attributes:
- `trim`: This will trim empty first and last lines, and most importantly, indentation.
- `editable`: This will make the code editable.
- `language`: Define the code-language (auto-detect if not set)
- `element`: ID of the element its innerHTML should be used as code.

Slots:
- `tools`: Elements that will be placed in the top-right corner of the code-block.

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/code/code.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/code/code.js" type=module async></script>
```

## Demos

[test.html](http://gcdn.li/u2ui/u2@main/el/code/tests/test.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/el/code/tests/minimal.html)  

## Attributes

`trim`: This will trim empty first and last lines, and most importantly, indentation.  
`editable`: This will make the code editable.  
`language`: Define the code-language (auto-detect if not set)

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

