# [u2-disableif] - attribute
Disable form-elements (like inputs, buttons, fieldsets) based on a condition

## Usage

```html
<form>
    <label>
        <input type=checkbox name="isClient"> Already Client?
    </label>
    <input u2-disableif="!isClient" placeholder="Client number" >
</form>
```

```css
[u2-disableif][disabled] {
    opacity: .3;
    xbackground: #ccc;
}
```

## Conditions

| condition | disabled while |
|---|---|
| `name` | a value of `name` is not empty |
| `!name` | no value of `name` is not empty |
| `name=v` | a value equals `v` |
| `name!=v` | no value equals `v` |
| `name>n`, `name<n` | a value is a number greater / less than `n` |

A field's values are what the form would send under its name (`FormData`): none for an unchecked
checkbox or a disabled field, several for same-named fields or a `select multiple`, a file by its name.
So a field disabled by its own condition counts as empty for the conditions that depend on it, and
chains settle in one go. Each check builds the `FormData`, which fires the form's `formdata` event.

## Install

```html
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@main/attr/disableif/disableif.js" type=module async></script>
```

## Demos

[test.html](http://gcdn.li/u2ui/u2@main/attr/disableif/tests/test.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/attr/disableif/tests/minimal.html)  
[disableif.test.html](http://gcdn.li/u2ui/u2@main/attr/disableif/tests/disableif.test.html) (tests)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

