# &lt;u2-pagination&gt; - element
Page number navigation with customizable URL patterns

## Features

- Shows as many pages as fit its width; all items are equally wide
- `{page}` in `href` may be URL-encoded (`%7Bpage%7D`), as URL APIs leave it
- Its content is the fallback until it runs (or without JavaScript), then replaced:
  ```html
  <u2-pagination total="22" current="4" href="/{page}">
      <a href="/3" rel=prev>Back</a>
      <a href="/5" rel=next>Next</a>
  </u2-pagination>
  ```
- At either end an arrow is disabled, not removed. To hide it, keep its place:
  `u2-pagination a[aria-disabled] { visibility: hidden }`
- Labels in 21 languages, following the closest `lang` attribute, else the browser's language

## Usage

```html
<u2-pagination total="3" current="2" href="/page/{page}" onclick="event.preventDefault()"></u2-pagination>
```

```css
u2-pagination {
    margin: 2rem;
}
```

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@main/el/pagination/pagination.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@main/el/pagination/pagination.js" type=module async></script>
```

## Demos

[test.html](http://gcdn.li/u2ui/u2@main/el/pagination/tests/test.html)  
[minimal.html](http://gcdn.li/u2ui/u2@main/el/pagination/tests/minimal.html)  

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

