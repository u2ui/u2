# &lt;u1-table&gt; - element
Enhanced tables (sortable, responsive...)

## Features

- Behavior that you can't cover without css.
- Responsive (breaks of overflows)
- Sets the header-cell text as aria-label on each cell
- Use attribute `data-sortby` to customize the sort order

## Usage

```html
<u1-table break sortable>
    <table>
        <thead>
            <tr><th> Salut  <th> Firstname         <th> Lastname    <th> Age <th> X
        <tbody>
            <tr><td> Herr   <td> Wolfgang Amadeus  <td> Mozart      <td> 46  <td> b
            <tr><td> Frau   <td> Hans              <td> Muster      <td> 1   <td> c
            <tr><td> Mister <td> Fridrich          <td> Langenegger <td> 5   <td> z
    </table>
</u1-table>
```

```css
u1-table {
    white-space:nowrap;
}
u1-table[\:overflows][break] td::before {
    margin-right:auto;
}
```

## Install

```html
<link href="../../../table.el@x.x.x/table.min.css" rel=stylesheet>
<script src="../../../table.el@x.x.x/table.min.js" type=module></script>
```

## Demos

[minimal.html](http://gcdn.li/u1ui/table.el@main/tests/minimal.html)  
[test.html](http://gcdn.li/u1ui/table.el@main/tests/test.html)  

## Todo

Make strategies for responsive tables like the following:
```html
<u1-table overflow-strategy="break hide-optional vertical-headers">
```
If it overflows, the script walks through the strategies in the defined order.
And sets the state attribute `<u1-table :overflows="strategy1 strategy2 ...">`

In the css there are some predefined or custom rules for the overflow-strategy.
```css
u1-table[\:overflows~=hide-optional] :is(td,th).optional {
    display:none;
}
```
If the table still overflows, the next strategy comes into play.

## About

- MIT License, Copyright (c) 2022 <u1> (like all repositories in this organization) <br>
- Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥

