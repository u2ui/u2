# &lt;u2-input&gt; - element
input elements (very beta)

## Usage

```html
<label>
    Normal Input: <input type=text>
</label>

<label>
    u2-input textarea:
    <u2-input type=textarea>inhalt</u2-input>
</label>

<label>
    u2-input text:
    <u2-input type=text>inhalt</u2-input>
</label>

<label>
    u2-input checkbox:
    <u2-input type=checkbox on=on off=off>on</u2-input>
</label>

<label>
    u2-input select:
    <u2-input type=select></u2-input>
</label>

<label>
    u2-input text:
    <u2-input><input type=text></u2-input>
</label>

<label>
    <u2-input>
        <input type=checkbox value="yes" checked>
    </u2-input>
</label>

<label>
    <u2-input>
        <select>
            <option value="1">One
            <option value="2" selected>Two
            <option value="3">Three
        </select>
    </u2-input>
</label>

<label>
        <u2-input>
        <textarea name="test">
            diest ist
            der Inhalt
        </textarea>
    </u2-input>
</label>

<label>
    <u2-input>
        <input type=date>
    </u2-input>
</label>


<label>
    <u2-input>
        <input type=datetime-local>
    </u2-input>
</label>
```

```css
u2-input:focus-within {
    border-color: green;
}
```

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/input/input.min.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/input/input.min.js" type=module async></script>
```

## Demos

[minimal.html](http://gcdn.li/u2ui/u2@main/el/input/tests/minimal.html)  

## Ussage

```html
<input type=text>

<u2-input type=textarea>inhalt</u2-input>

<u2-input type=text>inhalt</u2-input>

<u2-input type=checkbox on="on" off="off">on</u2-input>

<u2-input type=select>
</u2-input>

<u2-input>
    <input type=text>
</u2-input>

<u2-input>
    <input type=checkbox value="yes" checked>
</u2-input>

<u2-input>
    <select>
        <option value="1">One
        <option value="2" selected>Two
        <option value="3">Three
    </select>
</u2-input>

<u2-input>
    <textarea name="test">
        diest ist
        der Inhalt
    </textarea>
</u2-input>

<u2-input>
    <input type=date>
</u2-input>

<u2-input>
    <input type=datetime-local>
</u2-input>
```

```css

```

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

