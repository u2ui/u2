# [u2-store] - attribute
Persistent form and input state using localStorage/sessionStorage

## Features

Automatically saves and restores form and input values using the browser's storage.  

- Works with any form or individual input elements
- Persists values across page reloads
- Handles both form-scoped and global input storage
- Works with custom-elements that support `value` and `name` properties
- Lightweight

Warnings:
- forms need an `id` attribute!
- inputs need a `name` attribute **and** no `value` attribute!
- sessionStorage is used by default, localStorage needs a privacy-policy cookie "u2-cookiebanner" with a value like `{functional:true}`

## Usage

```html
<input name=username u2-store>
<p>Enter text and refresh the page to see it persist.</p>
```

## Install

```html
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/attr/store/store.min.js" type=module async></script>
```

## Demos

[minimal.html](http://gcdn.li/u2ui/u2@main/attr/store/tests/minimal.html)  
[test.html](http://gcdn.li/u2ui/u2@main/attr/store/tests/test.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

