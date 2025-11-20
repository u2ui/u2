# <u2-calendar> - element  (BETA)
Calendar / month view component, use `<u2-calendaritem>` as children

> Status: BETA — experimental. API and markup may change.

## Features

- month view
- lightweight layout and styling
- supports `u2-calendaritem` children with `start` and `end` attributes
- events rendered as colored bars spanning multiple days
- performat and responsive using css grid

## Usage

```js
u2Calendaritem2.addEventListener('click',()=>{
  alert('Demo 2 clicked')
})
```

```html
<u2-calendar date="2025-10-01">
    <u2-calendaritem start="2025-10-09">Demo</u2-calendaritem>
    <u2-calendaritem start="2025-10-19" end="2025-10-23" id="u2Calendaritem2">Demo 2</u2-calendaritem>
</u2-calendar>
  
```

```css
u2-calendar {
  font-size:10px;
}
u2-calendaritem {
  background-color:var(--color, orange);
  &:hover {
    background-color:var(--color-dark, red);
  }
}
```

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/calendar/calendar.min.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/calendar/calendar.min.js" type=module async></script>
```

## Demos

[minimal.html](http://gcdn.li/u2ui/u2@main/el/calendar/tests/minimal.html)  
[test.html](http://gcdn.li/u2ui/u2@main/el/calendar/tests/test.html)  

## Todo

- expose public API for navigating months (prev/next)
- accessibility improvements
- add more examples and docs

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

