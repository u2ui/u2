# &lt;u2-table&gt; - element
Enhanced tables (sortable, responsive...)

## Features

- Behavior that you can't cover without css.
- Responsive (breaks of overflows)
- Sets the header-cell text as aria-label on each cell
- Use attribute `data-sortby` to customize the sort order

## Usage

```html
<u2-table break sortable>
    <table>
        <thead>
            <tr><th> Salut  <th> Firstname         <th> Lastname    <th> Age <th> X
        <tbody>
            <tr><td> Herr   <td> Wolfgang Amadeus  <td> Mozart      <td> 46  <td> b
            <tr><td> Frau   <td> Hans              <td> Muster      <td> 1   <td> c
            <tr><td> Mister <td> Fridrich          <td> Langenegger <td> 5   <td> z
    </table>
</u2-table>
```

```css
u2-table {
    white-space:nowrap;
}
u2-table[\:overflows][break] td::before {
    margin-right:auto;
}
```

## Install

```html
<link href="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/table/table.min.css" rel=stylesheet>
<script src="https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/el/table/table.min.js" type=module></script>
```

## Demos

[minimal.html](http://gcdn.li/u2ui/u2@main/el/table/tests/minimal.html)  
[test.html](http://gcdn.li/u2ui/u2@main/el/table/tests/test.html)  

## Todo

Make strategies for responsive tables like the following:
```html
<u2-table overflow-strategy="break hide-optional vertical-headers">
```
If it overflows, the script walks through the strategies in the defined order.
And sets the state attribute `<u2-table :overflows="strategy1 strategy2 ...">`

In the css there are some predefined or custom rules for the overflow-strategy.
```css
u2-table[\:overflows~=hide-optional] :is(td,th).optional {
    display:none;
}
```
If the table still overflows, the next strategy comes into play.

## About

- MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

