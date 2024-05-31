# [u2-disableif] - attribute
Disable elements based on a condition


## Usage

```html
<form>
    <label>
        AGBs ok for you? <input type=checkbox name="agb">
    </label>
    <br>
    <button u2-disableif="!agb">
        Submit<br>
        <small>u2-disableif="!agb"</small>
    </button>
</form>
```

```css
[u2-disableif][disabled] {
    opacity: .2;
    background: #ccc;
}
```

## Install

```html
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/attr/disableif/disableif.min.js" type=module async></script>
```

## Demos

[minimal.html](http://gcdn.li/u2ui/u2@main/attr/disableif/tests/minimal.html)  
[test.html](http://gcdn.li/u2ui/u2@main/attr/disableif/tests/test.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

