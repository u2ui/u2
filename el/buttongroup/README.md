# &lt;u2-buttongroup&gt; - element
buttongroup elements (very beta)

## Usage

```html
<u2-buttongroup>
    <button type=button>Button</button>
    <button type=button>Group</button>
    <button type=button>Component</button>
</u2-buttongroup>
```

```css
u2-buttongroup:focus-within {
    border-color: green;
}
```

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/buttongroup/buttongroup.min.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/buttongroup/buttongroup.min.js" type=module async></script>
```

## Demos

[minimal.html](http://gcdn.li/u2ui/u2@main/el/buttongroup/tests/minimal.html)  
[test.html](http://gcdn.li/u2ui/u2@main/el/buttongroup/tests/test.html)  

## Ussage

```html
<buttongroup type=text>

<u2-buttongroup type=textarea>inhalt</u2-buttongroup>

<u2-buttongroup type=text>inhalt</u2-buttongroup>

<u2-buttongroup type=checkbox on="on" off="off">on</u2-buttongroup>

<u2-buttongroup type=select>
</u2-buttongroup>

<u2-buttongroup>
    <buttongroup type=text>
</u2-buttongroup>

<u2-buttongroup>
    <buttongroup type=checkbox value="yes" checked>
</u2-buttongroup>

<u2-buttongroup>
    <select>
        <option value="1">One
        <option value="2" selected>Two
        <option value="3">Three
    </select>
</u2-buttongroup>

<u2-buttongroup>
    <textarea name="test">
        diest ist
        der Inhalt
    </textarea>
</u2-buttongroup>

<u2-buttongroup>
    <buttongroup type=date>
</u2-buttongroup>

<u2-buttongroup>
    <buttongroup type=datetime-local>
</u2-buttongroup>
```

```css

```

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

